#!/usr/bin/env python3
"""Test Claude Sonnet 4.5 inference endpoint"""

import boto3
import json

def test_claude_45():
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    model_id = 'anthropic.claude-sonnet-4-5-20250929-v1:0'
    
    prompt = """Analyze this job description and extract key requirements:

Job: Senior Cloud Engineer at Acme Corp
- 5+ years AWS experience
- Python and TypeScript proficiency
- Serverless architecture expertise
- CI/CD pipeline development
- Strong communication skills

Provide a brief summary of the top 3 requirements."""

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    print(f"Testing model: {model_id}")
    print(f"Prompt: {prompt[:100]}...")
    print("\nCalling Bedrock API...")
    
    try:
        response = bedrock.invoke_model(
            modelId=model_id,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        
        print("\n✅ SUCCESS!")
        print(f"\nModel: {model_id}")
        print(f"Stop Reason: {response_body.get('stop_reason')}")
        print(f"Input Tokens: {response_body.get('usage', {}).get('input_tokens')}")
        print(f"Output Tokens: {response_body.get('usage', {}).get('output_tokens')}")
        print(f"\nResponse:\n{response_body['content'][0]['text']}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    test_claude_45()
