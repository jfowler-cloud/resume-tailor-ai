"""
Shared utilities for Resume Tailor Lambda functions
"""
import json
import boto3
import os
from typing import Dict, Any, Optional

# Initialize AWS clients
bedrock_runtime = None
s3_client = None
dynamodb = None

def get_bedrock_client():
    """Get or create Bedrock runtime client"""
    global bedrock_runtime
    if bedrock_runtime is None:
        region = os.environ.get('BEDROCK_REGION', 'us-east-1')
        bedrock_runtime = boto3.client('bedrock-runtime', region_name=region)
    return bedrock_runtime

def get_s3_client():
    """Get or create S3 client"""
    global s3_client
    if s3_client is None:
        s3_client = boto3.client('s3')
    return s3_client

def get_dynamodb_resource():
    """Get or create DynamoDB resource"""
    global dynamodb
    if dynamodb is None:
        dynamodb = boto3.resource('dynamodb')
    return dynamodb

def invoke_claude(prompt: str, model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0", 
                  max_tokens: int = 4096, temperature: float = 0.7) -> str:
    """
    Invoke Claude model via Bedrock
    
    Args:
        prompt: The prompt to send to Claude
        model_id: The Bedrock model ID
        max_tokens: Maximum tokens in response
        temperature: Temperature for response generation
        
    Returns:
        The model's response text
    """
    client = get_bedrock_client()
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })
    
    response = client.invoke_model(
        modelId=model_id,
        body=body
    )
    
    response_body = json.loads(response['body'].read())
    return response_body['content'][0]['text']

def read_from_s3(bucket: str, key: str) -> str:
    """Read text content from S3"""
    s3 = get_s3_client()
    response = s3.get_object(Bucket=bucket, Key=key)
    return response['Body'].read().decode('utf-8')

def write_to_s3(bucket: str, key: str, content: str, content_type: str = 'text/plain') -> None:
    """Write text content to S3"""
    s3 = get_s3_client()
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=content.encode('utf-8'),
        ContentType=content_type
    )

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create a standardized Lambda response"""
    return {
        'statusCode': status_code,
        'body': json.dumps(body),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    }

def extract_job_requirements(job_description: str) -> Dict[str, Any]:
    """Extract structured requirements from job description"""
    # This is a placeholder - actual implementation would use Claude
    return {
        'required_skills': [],
        'preferred_skills': [],
        'experience_level': '',
        'education': '',
        'key_responsibilities': []
    }
