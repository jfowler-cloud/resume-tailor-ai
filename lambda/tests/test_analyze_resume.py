"""
Unit tests for analyze_resume Lambda function
"""
import json
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from analyze_resume import handler

@pytest.fixture(autouse=True)
def mock_env():
    with patch.dict(os.environ, {'BUCKET_NAME': 'test-bucket', 'MODEL_ID': 'test-model'}):
        yield

@pytest.fixture
def mock_s3():
    with patch('analyze_resume.s3') as mock:
        mock.get_object.return_value = {
            'Body': Mock(read=lambda: b'# Test Resume\nPython Developer with 5 years experience')
        }
        yield mock

@pytest.fixture
def mock_bedrock():
    with patch('analyze_resume.bedrock') as mock:
        mock_response = {
            'body': Mock(read=lambda: json.dumps({
                'content': [{
                    'text': json.dumps({
                        'fitScore': 85,
                        'matchedSkills': ['Python'],
                        'missingSkills': ['AWS'],
                        'strengths': ['Strong Python experience'],
                        'gaps': ['No cloud experience']
                    })
                }]
            }).encode())
        }
        mock.invoke_model.return_value = mock_response
        yield mock

def test_analyze_resume_success(mock_s3, mock_bedrock):
    """Test successful resume analysis"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'resumeS3Keys': ['uploads/user-1/resume.md'],
        'parsedJob': {'requiredSkills': ['Python', 'AWS']}
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert result['fitScore'] == 85
    assert 'Python' in result['matchedSkills']

def test_analyze_resume_multiple_resumes(mock_s3, mock_bedrock):
    """Test analysis with multiple resumes"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'resumeS3Keys': ['resume1.md', 'resume2.md'],
        'parsedJob': {'requiredSkills': ['Python']}
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert mock_s3.get_object.call_count == 2

def test_analyze_resume_s3_error(mock_bedrock):
    """Test handling of S3 error"""
    with patch('analyze_resume.s3') as mock_s3:
        mock_s3.get_object.side_effect = Exception('S3 Error')

        event = {
            'jobId': 'test-123',
            'resumeS3Keys': ['resume.md'],
            'parsedJob': {}
        }

        result = handler(event, None)

        assert result['statusCode'] == 500

def test_analyze_resume_single_string_key(mock_s3, mock_bedrock):
    """Test analysis with single string resumeS3Key (not array)"""
    event = {
        'jobId': 'test-456',
        'userId': 'user-1',
        'resumeS3Key': 'uploads/user-1/resume.md',  # String instead of array
        'parsedJob': {'requiredSkills': ['Python']}
    }

    result = handler(event, None)

    assert result['statusCode'] == 200
    assert mock_s3.get_object.called
