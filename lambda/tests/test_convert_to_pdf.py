"""
Unit tests for convert_to_pdf Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from convert_to_pdf import handler


class TestConvertToPdfHandler:
    """Tests for PDF conversion handler"""

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_successful_pdf_conversion(self):
        """Test successful markdown to PDF conversion"""
        event = {
            'resumeS3Key': 'tailored/job-123/resume.md',
            'jobId': 'job-123'
        }

        markdown_content = '# John Doe\n## Experience\n- Software Engineer'

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: markdown_content.encode('utf-8'))
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['jobId'] == 'job-123'
            assert result['pdfS3Key'] == 'tailored/job-123/resume.pdf'
            assert 'placeholder' in result['message'].lower()

            # Verify S3 get was called
            mock_s3.get_object.assert_called_once_with(
                Bucket='test-bucket',
                Key='tailored/job-123/resume.md'
            )

            # Verify S3 put was called with PDF key
            mock_s3.put_object.assert_called_once()
            put_kwargs = mock_s3.put_object.call_args.kwargs
            assert put_kwargs['Bucket'] == 'test-bucket'
            assert put_kwargs['Key'] == 'tailored/job-123/resume.pdf'
            assert put_kwargs['ContentType'] == 'application/pdf'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_pdf_key_extension_replacement(self):
        """Test that .md extension is correctly replaced with .pdf"""
        event = {
            'resumeS3Key': 'uploads/user-456/my_resume.md',
            'jobId': 'job-456'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }

            result = handler(event, None)

            assert result['pdfS3Key'] == 'uploads/user-456/my_resume.pdf'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_conversion_preserves_content(self):
        """Test that content is preserved in output (placeholder implementation)"""
        event = {
            'resumeS3Key': 'path/to/resume.md',
            'jobId': 'test-job'
        }

        original_content = '# Full Resume\n## Education\n- PhD Computer Science\n## Experience\n- 10 years'

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: original_content.encode('utf-8'))
            }

            handler(event, None)

            # In placeholder implementation, content is preserved
            put_kwargs = mock_s3.put_object.call_args.kwargs
            assert put_kwargs['Body'] == original_content.encode('utf-8')

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_s3_get_error(self):
        """Test handling of S3 get error"""
        event = {
            'resumeS3Key': 'nonexistent/resume.md',
            'jobId': 'job-err'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.side_effect = Exception('NoSuchKey: The specified key does not exist')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'NoSuchKey' in result['error']

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_s3_put_error(self):
        """Test handling of S3 put error"""
        event = {
            'resumeS3Key': 'path/resume.md',
            'jobId': 'job-put-err'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }
            mock_s3.put_object.side_effect = Exception('AccessDenied: Access Denied')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'AccessDenied' in result['error']

    def test_missing_bucket_env(self):
        """Test handling when BUCKET_NAME env var is missing"""
        event = {
            'resumeS3Key': 'path/resume.md',
            'jobId': 'job-no-bucket'
        }

        with patch.dict('os.environ', {}, clear=True):
            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_empty_resume_key(self):
        """Test handling of empty resume key"""
        event = {
            'resumeS3Key': '',
            'jobId': 'job-empty'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.side_effect = Exception('InvalidKey')

            result = handler(event, None)

            assert result['statusCode'] == 500

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_default_job_id(self):
        """Test that missing jobId defaults to 'unknown'"""
        event = {
            'resumeS3Key': 'path/resume.md'
            # No jobId provided
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['jobId'] == 'unknown'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_unicode_content(self):
        """Test handling of Unicode content in markdown"""
        event = {
            'resumeS3Key': 'path/resume.md',
            'jobId': 'job-unicode'
        }

        unicode_content = '# Resume\n## Experience\n- Worked at Cafe in Paris'

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: unicode_content.encode('utf-8'))
            }

            result = handler(event, None)

            assert result['statusCode'] == 200

    @patch.dict('os.environ', {'BUCKET_NAME': 'my-resume-bucket'})
    def test_uses_correct_bucket(self):
        """Test that correct bucket from env is used"""
        event = {
            'resumeS3Key': 'resumes/file.md',
            'jobId': 'job-bucket'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }

            handler(event, None)

            # Verify get used correct bucket
            mock_s3.get_object.assert_called_with(
                Bucket='my-resume-bucket',
                Key='resumes/file.md'
            )

            # Verify put used correct bucket
            put_kwargs = mock_s3.put_object.call_args.kwargs
            assert put_kwargs['Bucket'] == 'my-resume-bucket'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_nested_path_handling(self):
        """Test handling of deeply nested S3 paths"""
        event = {
            'resumeS3Key': 'users/abc123/jobs/def456/versions/v1/resume.md',
            'jobId': 'job-nested'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['pdfS3Key'] == 'users/abc123/jobs/def456/versions/v1/resume.pdf'

    @patch.dict('os.environ', {'BUCKET_NAME': 'test-bucket'})
    def test_key_without_md_extension(self):
        """Test handling of key that doesn't have .md extension"""
        event = {
            'resumeS3Key': 'path/resume.txt',
            'jobId': 'job-txt'
        }

        with patch('convert_to_pdf.s3') as mock_s3:
            mock_s3.get_object.return_value = {
                'Body': Mock(read=lambda: b'# Resume')
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            # Should still replace .txt with .pdf due to string replace
            assert result['pdfS3Key'] == 'path/resume.txt'  # No .md to replace
