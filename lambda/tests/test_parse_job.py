"""
Unit tests for parse_job Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch
from parse_job import handler

def test_parse_job_success():
    """Test successful job parsing"""
    event = {
        'jobId': 'test-123',
        'jobDescription': 'Senior Python Developer with 5+ years experience in AWS and Docker. ' * 5  # Ensure >= 50 chars
    }
    
    with patch('parse_job.bedrock') as mock_bedrock:
        mock_response = {
            'body': Mock(read=lambda: json.dumps({
                'content': [{
                    'text': json.dumps({
                        'requiredSkills': ['Python', 'AWS', 'Docker'],
                        'experienceLevel': '5+ years',
                        'keywords': ['Python', 'AWS', 'Docker', 'Senior']
                    })
                }]
            }).encode())
        }
        mock_bedrock.invoke_model.return_value = mock_response
        
        result = handler(event, None)
        
        assert result['statusCode'] == 200
        assert 'parsedJob' in result
        assert 'Python' in result['parsedJob']['requiredSkills']

def test_parse_job_missing_description():
    """Test handling of missing job description"""
    event = {'jobId': 'test-123'}

    result = handler(event, None)

    assert result['statusCode'] == 400
    assert 'error' in result

def test_parse_job_description_too_short():
    """Test handling of too-short job description"""
    event = {'jobId': 'test-123', 'jobDescription': 'Short'}

    result = handler(event, None)

    assert result['statusCode'] == 400
    assert 'too short' in result['error']

def test_parse_job_bedrock_error():
    """Test handling of Bedrock API error"""
    event = {
        'jobId': 'test-123',
        'jobDescription': 'A' * 100  # Valid length
    }

    with patch('parse_job.bedrock') as mock_bedrock:
        mock_bedrock.invoke_model.side_effect = Exception('API Error')

        result = handler(event, None)

        assert result['statusCode'] == 500
        assert 'error' in result
