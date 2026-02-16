"""
Unit tests for critical_review Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch
from critical_review import handler


class TestCriticalReviewHandler:
    """Tests for critical review handler"""

    def test_successful_critical_review(self):
        """Test successful critical review of resume"""
        event = {
            'tailoredResumeMarkdown': '# John Doe\n## Experience\n- Software Engineer at Tech Corp',
            'atsOptimizedResume': '# John Doe\n## Professional Experience\n- Software Engineer at Tech Corp (2020-Present)'
        }

        mock_response_content = {
            'overallRating': 8,
            'strengths': ['Clear structure', 'Quantified achievements'],
            'weaknesses': ['Missing soft skills', 'No certifications listed'],
            'actionableSteps': ['Add leadership examples', 'Include certifications'],
            'competitiveAnalysis': 'Above average compared to typical candidates',
            'redFlags': ['Employment gap in 2019'],
            'standoutElements': ['Strong technical background'],
            'summary': 'Solid resume with room for improvement in soft skills presentation.'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 8
            assert 'Clear structure' in result['strengths']
            assert 'Missing soft skills' in result['weaknesses']
            assert result['competitiveAnalysis'] == 'Above average compared to typical candidates'
            assert 'Employment gap in 2019' in result['redFlags']

    def test_critical_review_uses_tailored_as_fallback(self):
        """Test that tailored resume is used as fallback when ATS version missing"""
        event = {
            'tailoredResumeMarkdown': '# Resume content only'
            # No atsOptimizedResume provided
        }

        mock_response_content = {
            'overallRating': 7,
            'strengths': [],
            'weaknesses': [],
            'actionableSteps': [],
            'competitiveAnalysis': '',
            'redFlags': [],
            'standoutElements': [],
            'summary': 'Review of single version'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            # Verify bedrock was called (meaning fallback worked)
            mock_bedrock.invoke_model.assert_called_once()

    def test_critical_review_with_low_rating(self):
        """Test critical review with low rating"""
        event = {
            'tailoredResumeMarkdown': '# Basic Resume\n- Some experience',
            'atsOptimizedResume': '# Basic Resume\n- Some experience'
        }

        mock_response_content = {
            'overallRating': 3,
            'strengths': ['Concise'],
            'weaknesses': ['Lacks detail', 'No achievements', 'Poor formatting', 'Missing contact info'],
            'actionableSteps': ['Add more detail', 'Include achievements', 'Fix formatting'],
            'competitiveAnalysis': 'Below average - needs significant work',
            'redFlags': ['Too vague', 'No dates provided'],
            'standoutElements': [],
            'summary': 'This resume needs substantial improvement before submission.'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 3
            assert len(result['weaknesses']) == 4
            assert len(result['redFlags']) == 2

    def test_critical_review_json_in_code_block(self):
        """Test handling JSON response wrapped in code block"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'atsOptimizedResume': '# Resume'
        }

        response_text = '''Here's my critical analysis:
```json
{
    "overallRating": 6,
    "strengths": ["Good layout"],
    "weaknesses": ["Generic content"],
    "actionableSteps": ["Personalize content"],
    "competitiveAnalysis": "Average",
    "redFlags": [],
    "standoutElements": ["Clean design"],
    "summary": "Acceptable but could be better."
}
```'''

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': response_text}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 6
            assert 'Clean design' in result['standoutElements']

    def test_critical_review_perfect_score(self):
        """Test critical review with perfect score"""
        event = {
            'tailoredResumeMarkdown': '# Excellent Resume',
            'atsOptimizedResume': '# Excellent Resume - ATS'
        }

        mock_response_content = {
            'overallRating': 10,
            'strengths': ['Perfect ATS formatting', 'Strong achievements', 'Excellent keywords'],
            'weaknesses': [],
            'actionableSteps': [],
            'competitiveAnalysis': 'Top 1% of candidates',
            'redFlags': [],
            'standoutElements': ['Executive presence', 'Industry expertise', 'Quantified impact'],
            'summary': 'Exceptional resume ready for senior positions.'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 10
            assert len(result['weaknesses']) == 0
            assert len(result['standoutElements']) == 3

    def test_critical_review_bedrock_error(self):
        """Test handling of Bedrock API error"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'atsOptimizedResume': '# Resume'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_bedrock.invoke_model.side_effect = Exception('Bedrock service error')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'Bedrock service error' in result['error']

    def test_critical_review_json_extraction_error(self):
        """Test handling when JSON extraction fails"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'atsOptimizedResume': '# Resume'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': 'This response has no valid JSON anywhere'}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result

    def test_critical_review_partial_response(self):
        """Test handling when response is missing some fields"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'atsOptimizedResume': '# Resume'
        }

        # Response with only some fields
        mock_response_content = {
            'overallRating': 5,
            'summary': 'Brief summary'
            # Missing other fields
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 5
            assert result['strengths'] == []  # Default
            assert result['weaknesses'] == []  # Default
            assert result['actionableSteps'] == []  # Default
            assert result['competitiveAnalysis'] == ''  # Default
            assert result['redFlags'] == []  # Default
            assert result['standoutElements'] == []  # Default

    def test_critical_review_empty_resumes(self):
        """Test critical review with empty resume content"""
        event = {
            'tailoredResumeMarkdown': '',
            'atsOptimizedResume': ''
        }

        mock_response_content = {
            'overallRating': 0,
            'strengths': [],
            'weaknesses': ['No content provided'],
            'actionableSteps': ['Provide actual resume content'],
            'competitiveAnalysis': 'Cannot analyze empty resume',
            'redFlags': ['Empty resume'],
            'standoutElements': [],
            'summary': 'Cannot review an empty resume.'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['overallRating'] == 0

    def test_critical_review_returns_full_review_object(self):
        """Test that criticalReview field contains the full review"""
        event = {
            'tailoredResumeMarkdown': '# Resume',
            'atsOptimizedResume': '# Resume ATS'
        }

        mock_response_content = {
            'overallRating': 7,
            'strengths': ['Good'],
            'weaknesses': ['Could improve'],
            'actionableSteps': ['Do this'],
            'competitiveAnalysis': 'Average',
            'redFlags': [],
            'standoutElements': ['Nice'],
            'summary': 'Decent resume.'
        }

        with patch('critical_review.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            # criticalReview should contain the full object
            assert result['criticalReview'] == mock_response_content
            assert result['criticalReview']['overallRating'] == 7
