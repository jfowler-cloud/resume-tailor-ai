"""
Analyze Resume Fit Lambda Function
Compares resume against job requirements and provides fit analysis
"""
import json
import os
import boto3
from extract_json import extract_json_from_text
from typing import Dict, Any

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Analyze how well resume matches job requirements
    
    Input:
        - jobId: Job identifier
        - parsedJob: Structured job requirements from parse_job
        - resumeS3Key: S3 key for resume file
        
    Output:
        - fitScore: Overall fit percentage (0-100)
        - matchedSkills: Skills that match
        - missingSkills: Required skills not in resume
        - strengths: Key strengths for this role
        - gaps: Areas where candidate falls short
        - recommendations: Suggestions for improvement
    """
    try:
        bucket_name = os.environ['BUCKET_NAME']
        resume_keys = event.get('resumeS3Keys', [event.get('resumeS3Key', '')])
        if isinstance(resume_keys, str):
            resume_keys = [resume_keys]
        
        parsed_job = event.get('parsedJob', {})
        
        # Download all resumes from S3
        resumes = []
        for key in resume_keys:
            if key:
                response = s3.get_object(Bucket=bucket_name, Key=key)
                content = response['Body'].read().decode('utf-8')
                resumes.append(content)
        
        resume_content = '\n\n---RESUME VERSION---\n\n'.join(resumes)
        
        # Prepare analysis prompt
        prompt = f"""You are an expert resume analyst. Analyze this resume against the job requirements.

Job Requirements:
{json.dumps(parsed_job, indent=2)}

Resume:
{resume_content}

Provide a detailed analysis in JSON format:
{{
  "fitScore": <0-100 percentage>,
  "matchedSkills": [<array of skills that match>],
  "missingSkills": [<array of required skills not found>],
  "strengths": [<array of key strengths for this role>],
  "gaps": [<array of areas where candidate falls short>],
  "recommendations": [<array of specific suggestions>],
  "summary": "<brief 2-3 sentence summary of fit>"
}}

Be honest and thorough. Return ONLY valid JSON."""

        # Call Claude 4.5 Opus for detailed analysis
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-opus-4-5-20251101-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8192,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.2
            })
        )
        
        response_body = json.loads(response['body'].read())
        analysis_content = response_body['content'][0]['text']
        
        # Parse analysis
        analysis = extract_json_from_text(analysis_content)
        
        return {
            'statusCode': 200,
            'jobId': event.get('jobId'),
            'resumeS3Keys': resume_keys,
            'analysis': analysis,
            'fitScore': analysis.get('fitScore', 0),
            'matchedSkills': analysis.get('matchedSkills', []),
            'missingSkills': analysis.get('missingSkills', []),
            'strengths': analysis.get('strengths', []),
            'gaps': analysis.get('gaps', []),
            'recommendations': analysis.get('recommendations', []),
            'summary': analysis.get('summary', '')
        }
        
    except Exception as e:
        print(f"Error analyzing resume: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to analyze resume fit'
        }
