"""
Unit tests for ats_optimize Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch
from ats_optimize import handler


class TestATSOptimizeHandler:
    """Tests for ATS optimization handler"""

    def test_successful_ats_optimization(self):
        """Test successful ATS optimization"""
        event = {
            'tailoredResumeMarkdown': '# John Doe\n## Experience\n- Software Engineer',
            'parsedJob': {
                'requiredSkills': ['Python', 'AWS'],
                'keywords': ['Python', 'AWS', 'Docker', 'Kubernetes']
            }
        }

        mock_response_content = {
            'atsOptimizedResume': '# John Doe\n## Professional Experience\n- Software Engineer with Python and AWS',
            'atsScore': 92,
            'optimizations': ['Added keywords', 'Standardized headers'],
            'keywordCoverage': {
                'included': ['Python', 'AWS', 'Docker'],
                'missing': ['Kubernetes']
            }
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['atsScore'] == 92
            assert result['atsOptimizedResume'] == mock_response_content['atsOptimizedResume']
            assert 'Added keywords' in result['optimizations']
            assert result['keywordCoverage']['included'] == ['Python', 'AWS', 'Docker']

    def test_ats_optimization_with_empty_keywords(self):
        """Test ATS optimization when no keywords provided"""
        event = {
            'tailoredResumeMarkdown': '# Resume\n## Skills\n- Python',
            'parsedJob': {}
        }

        mock_response_content = {
            'atsOptimizedResume': '# Resume\n## Skills\n- Python',
            'atsScore': 75,
            'optimizations': ['Basic formatting'],
            'keywordCoverage': {'included': [], 'missing': []}
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['atsScore'] == 75

    def test_ats_optimization_with_json_in_code_block(self):
        """Test handling when Bedrock returns JSON in code block"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'parsedJob': {'keywords': ['Python']}
        }

        # Bedrock sometimes returns JSON in markdown code blocks
        response_text = '''```json
{
    "atsOptimizedResume": "# Optimized Resume",
    "atsScore": 88,
    "optimizations": ["keyword optimization"],
    "keywordCoverage": {"included": ["Python"], "missing": []}
}
```'''

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': response_text}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['atsScore'] == 88

    def test_ats_optimization_missing_resume(self):
        """Test ATS optimization with missing resume content"""
        event = {
            'parsedJob': {'keywords': ['Python']}
        }

        mock_response_content = {
            'atsOptimizedResume': '',
            'atsScore': 0,
            'optimizations': [],
            'keywordCoverage': {'included': [], 'missing': ['Python']}
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['atsOptimizedResume'] == ''

    def test_ats_optimization_bedrock_error(self):
        """Test handling of Bedrock API error"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'parsedJob': {'keywords': ['Python']}
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_bedrock.invoke_model.side_effect = Exception('Bedrock API Error')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'Bedrock API Error' in result['error']

    def test_ats_optimization_json_extraction_error(self):
        """Test handling when JSON extraction fails"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'parsedJob': {'keywords': ['Python']}
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': 'This is not valid JSON at all'}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result

    def test_ats_optimization_partial_response(self):
        """Test handling when Bedrock returns partial JSON fields"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'parsedJob': {'keywords': ['Python']}
        }

        # Response missing some fields
        mock_response_content = {
            'atsOptimizedResume': '# Optimized',
            'atsScore': 80
            # Missing optimizations and keywordCoverage
        }

        with patch('ats_optimize.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['atsScore'] == 80
            assert result['optimizations'] == []  # Default empty list
            assert result['keywordCoverage'] == {}  # Default empty dict

    def test_ats_optimization_uses_correct_model(self):
        """Test that ATS optimization uses the correct model from env"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'parsedJob': {'keywords': []}
        }

        mock_response_content = {
            'atsOptimizedResume': '# Resume',
            'atsScore': 70,
            'optimizations': [],
            'keywordCoverage': {}
        }

        with patch('ats_optimize.bedrock') as mock_bedrock, \
             patch.dict('os.environ', {'MODEL_ID': 'custom-model-id'}):
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            handler(event, None)

            # Verify invoke_model was called
            mock_bedrock.invoke_model.assert_called_once()
            call_args = mock_bedrock.invoke_model.call_args
            assert call_args.kwargs.get('modelId') == 'custom-model-id' or \
                   (call_args.args and 'custom-model-id' in str(call_args))
