"""
Unit tests for cover_letter Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from cover_letter import handler


class TestCoverLetterHandler:
    """Tests for cover letter generation handler"""

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_successful_cover_letter_generation(self):
        """Test successful cover letter generation"""
        event = {
            'jobDescription': 'Senior Python Developer needed for cloud team',
            'tailoredResumeMarkdown': '# John Doe\n## Experience\n- Python Developer',
            'analysis': {
                'strengths': ['Strong Python skills', '5 years AWS experience']
            },
            'companyName': 'Tech Corp',
            'jobId': 'job-123'
        }

        mock_response_content = {
            'coverLetter': 'Dear Hiring Manager,\n\nI am excited to apply...',
            'tone': 'professional',
            'keyPoints': ['Python expertise', 'AWS experience', 'Team leadership']
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['coverLetter'] == mock_response_content['coverLetter']
            assert result['tone'] == 'professional'
            assert len(result['keyPoints']) == 3

            # Verify S3 put was called
            mock_s3.put_object.assert_called_once()
            call_kwargs = mock_s3.put_object.call_args.kwargs
            assert call_kwargs['Bucket'] == 'test-bucket'
            assert 'cover_letter.txt' in call_kwargs['Key']

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_default_company_name(self):
        """Test cover letter generation with default company name"""
        event = {
            'jobDescription': 'Looking for a developer',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-456'
            # No companyName provided
        }

        mock_response_content = {
            'coverLetter': 'Dear [Company Name] Hiring Manager...',
            'tone': 'enthusiastic',
            'keyPoints': []
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            # Verify the prompt included default company name
            mock_bedrock.invoke_model.assert_called_once()

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_with_empty_strengths(self):
        """Test cover letter generation with no strengths"""
        event = {
            'jobDescription': 'Developer role',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},  # No strengths
            'companyName': 'StartupCo',
            'jobId': 'job-789'
        }

        mock_response_content = {
            'coverLetter': 'Dear StartupCo team...',
            'tone': 'confident',
            'keyPoints': ['Adaptability']
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['tone'] == 'confident'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_json_in_code_block(self):
        """Test handling JSON response in markdown code block"""
        event = {
            'jobDescription': 'Job posting',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {'strengths': ['skill1']},
            'jobId': 'job-abc'
        }

        response_text = '''Here's your cover letter:
```json
{
    "coverLetter": "Dear Team,\\n\\nI am writing...",
    "tone": "professional",
    "keyPoints": ["skill1", "enthusiasm"]
}
```'''

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': response_text}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert 'I am writing' in result['coverLetter']

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_s3_key_format(self):
        """Test that cover letter is saved with correct S3 key format"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'unique-job-id-123'
        }

        mock_response_content = {
            'coverLetter': 'Cover letter content',
            'tone': 'professional',
            'keyPoints': []
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['coverLetterS3Key'] == 'tailored/unique-job-id-123/cover_letter.txt'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_bedrock_error(self):
        """Test handling of Bedrock API error"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-err'
        }

        with patch('cover_letter.bedrock') as mock_bedrock:
            mock_bedrock.invoke_model.side_effect = Exception('Bedrock unavailable')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'Bedrock unavailable' in result['error']

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_s3_error(self):
        """Test handling of S3 error when saving cover letter"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-s3err'
        }

        mock_response_content = {
            'coverLetter': 'Letter content',
            'tone': 'professional',
            'keyPoints': []
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response
            mock_s3.put_object.side_effect = Exception('S3 access denied')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_missing_fields_in_response(self):
        """Test handling when response is missing some fields"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-partial'
        }

        # Response missing tone and keyPoints
        mock_response_content = {
            'coverLetter': 'Just the letter content'
        }

        with patch('cover_letter.bedrock') as mock_bedrock, \
             patch('cover_letter.s3') as mock_s3:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': json.dumps(mock_response_content)}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['coverLetter'] == 'Just the letter content'
            assert result['tone'] == 'professional'  # Default
            assert result['keyPoints'] == []  # Default

    def test_cover_letter_missing_bucket_env(self):
        """Test handling when BUCKET_NAME env var is missing"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-nobucket'
        }

        # Clear the environment variable
        with patch.dict('os.environ', {}, clear=True):
            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_cover_letter_json_extraction_failure(self):
        """Test handling when JSON extraction fails"""
        event = {
            'jobDescription': 'Job',
            'tailoredResumeMarkdown': '# Resume',
            'analysis': {},
            'jobId': 'job-badjson'
        }

        with patch('cover_letter.bedrock') as mock_bedrock:
            mock_response = {
                'body': Mock(read=lambda: json.dumps({
                    'content': [{'text': 'This is not JSON and has no JSON in it'}]
                }).encode())
            }
            mock_bedrock.invoke_model.return_value = mock_response

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
