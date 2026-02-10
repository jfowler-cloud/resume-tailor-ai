"""
Unit tests for generate_resume Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch
from generate_resume import handler

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
