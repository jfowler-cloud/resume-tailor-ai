"""
Unit tests for save_results Lambda function
"""
import os
import pytest
from unittest.mock import Mock, patch
from save_results import handler

@pytest.fixture(autouse=True)
def mock_env():
    with patch.dict(os.environ, {'TABLE_NAME': 'test-table'}):
        yield

@pytest.fixture
def mock_dynamodb():
    with patch('save_results.dynamodb') as mock:
        mock_table = Mock()
        mock.Table.return_value = mock_table
        yield mock_table

def test_save_results_success(mock_dynamodb):
    """Test successful save to DynamoDB"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'jobDescription': 'Test job',
        'parsedJob': {'requiredSkills': ['Python']},
        'analysis': {'fitScore': 85},
        'tailoredResume': {'tailoredResumeS3Key': 'tailored/test-123/resume.md'}
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert result['saved'] == True
    assert mock_dynamodb.put_item.called

def test_save_results_with_parallel_results(mock_dynamodb):
    """Test save with parallel processing results"""
    event = {
        'jobId': 'test-123',
        'userId': 'user-1',
        'parallelResults': [
            {'statusCode': 200, 'atsScore': 95},
            {'statusCode': 200, 'coverLetterS3Key': 'cover.txt'},
            {'statusCode': 200, 'overallRating': 8}
        ]
    }
    
    result = handler(event, None)
    
    assert result['statusCode'] == 200
    assert mock_dynamodb.put_item.called

def test_save_results_dynamodb_error(mock_dynamodb):
    """Test handling of DynamoDB error"""
    mock_dynamodb.put_item.side_effect = Exception('DynamoDB Error')
    
    event = {'jobId': 'test-123', 'userId': 'user-1'}
    
    result = handler(event, None)
    
    assert result['statusCode'] == 500
    assert 'error' in result
