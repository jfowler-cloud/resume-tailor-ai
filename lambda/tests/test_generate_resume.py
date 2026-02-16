"""
Unit tests for generate_resume Lambda function
"""
import json
import os
import pytest
from unittest.mock import Mock, patch
from generate_resume import handler

@pytest.fixture(autouse=True)
def mock_env():
    with patch.dict(os.environ, {'BUCKET_NAME': 'test-bucket', 'MODEL_ID': 'test-model'}):
        yield

@pytest.fixture
def mock_s3():
    with patch('generate_resume.s3') as mock:
        mock.get_object.return_value = {
            'Body': Mock(read=lambda: b'# Original Resume\nPython Developer')
        }
        yield mock

@pytest.fixture
def mock_bedrock_stream():
    with patch('generate_resume.bedrock') as mock:
        # Mock streaming response
        chunks = [
            {'chunk': {'bytes': json.dumps({
                'type': 'content_block_delta',
                'delta': {'text': '{"tailoredResume": "# Tailored Resume\\nSenior Python Developer", '}
            }).encode()}},
            {'chunk': {'bytes': json.dumps({
                'type': 'content_block_delta',
                'delta': {'text': '"changesApplied": ["Added senior title"]}'}
            }).encode()}}
        ]
        mock.invoke_model_with_response_stream.return_value = {
            'body': iter(chunks)
        }
        yield mock

def test_generate_resume_success(mock_s3, mock_bedrock_stream):
    """Test successful resume generation"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'resumeS3Keys': ['resume.md'],
        'parsedJob': {'requiredSkills': ['Python']},
        'analysis': {'fitScore': 85}
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert 'tailoredResumeS3Key' in result
    assert mock_s3.put_object.called

def test_generate_resume_multiple_sources(mock_s3, mock_bedrock_stream):
    """Test generation with multiple source resumes"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'resumeS3Keys': ['resume1.md', 'resume2.md'],
        'parsedJob': {},
        'analysis': {}
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert mock_s3.get_object.call_count == 2

def test_generate_resume_saves_reusable_copy(mock_s3, mock_bedrock_stream):
    """Test that tailored resume is saved to uploads folder"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'resumeS3Keys': ['resume.md'],
        'parsedJob': {},
        'analysis': {}
    }

    result = handler(event, None)

    # Should save twice: once to tailored/, once to uploads/
    assert mock_s3.put_object.call_count == 2

def test_generate_resume_single_string_key(mock_s3, mock_bedrock_stream):
    """Test generation with single string resumeS3Key (not array)"""
    event = {
        'jobId': 'test-456',
        'userId': 'user-1',
        'resumeS3Key': 'resume.md',  # String instead of array
        'parsedJob': {},
        'analysis': {}
    }

    result = handler(event, None)

    assert result['statusCode'] == 200
    assert mock_s3.get_object.called

def test_generate_resume_empty_response(mock_s3):
    """Test handling when no tailored resume is extracted"""
    with patch('generate_resume.bedrock') as mock_bedrock:
        # Return response with empty tailoredResume
        chunks = [
            {'chunk': {'bytes': json.dumps({
                'type': 'content_block_delta',
                'delta': {'text': '{"tailoredResume": "", "changesApplied": []}'}
            }).encode()}}
        ]
        mock_bedrock.invoke_model_with_response_stream.return_value = {
            'body': iter(chunks)
        }

        event = {
            'jobId': 'test-789',
            'userId': 'user-1',
            'resumeS3Keys': ['resume.md'],
            'parsedJob': {},
            'analysis': {}
        }

        result = handler(event, None)

        # Should still succeed but with empty resume
        assert result['statusCode'] == 200
        assert result['tailoredResumeMarkdown'] == ''

def test_generate_resume_validation_error(mock_s3, mock_bedrock_stream):
    """Test handling of validation error (ValueError)"""
    with patch('generate_resume.validate_s3_key') as mock_validate:
        mock_validate.side_effect = ValueError('Invalid S3 key format')

        event = {
            'jobId': 'test-err',
            'userId': 'user-1',
            'resumeS3Keys': ['../../../etc/passwd'],  # Invalid key
            'parsedJob': {},
            'analysis': {}
        }

        result = handler(event, None)

        assert result['statusCode'] == 400
        assert 'error' in result

def test_generate_resume_bedrock_error(mock_s3):
    """Test handling of Bedrock API error"""
    with patch('generate_resume.bedrock') as mock_bedrock:
        mock_bedrock.invoke_model_with_response_stream.side_effect = Exception('Bedrock error')

        event = {
            'jobId': 'test-500',
            'userId': 'user-1',
            'resumeS3Keys': ['resume.md'],
            'parsedJob': {},
            'analysis': {}
        }

        result = handler(event, None)

        assert result['statusCode'] == 500
        assert 'error' in result
