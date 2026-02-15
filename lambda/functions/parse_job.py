"""
Parse Job Description Lambda Function
Extracts key requirements, skills, and qualifications from job posting
"""
import json
import logging
import os
import boto3
from extract_json import extract_json_from_text
from validation import validate_job_description
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Parse job description and extract structured information

    Input:
        - jobDescription: Raw job posting text
        - jobId: Unique identifier for this job

    Output:
        - parsedJob: Structured job requirements
        - requiredSkills: List of required skills
        - preferredSkills: List of preferred skills
        - keyResponsibilities: List of key responsibilities
    """
    try:
        job_description = validate_job_description(event.get('jobDescription', ''))
        job_id = event.get('jobId', '')

        logger.info("Parsing job description for job_id=%s, length=%d", job_id, len(job_description))
        
        # Prepare prompt for Claude
        prompt = f"""Analyze this job description and extract structured information.

Job Description:
{job_description}

Please provide a JSON response with:
1. requiredSkills: Array of required technical skills
2. preferredSkills: Array of preferred/desired skills
3. keyResponsibilities: Array of main job responsibilities
4. experienceLevel: Required years of experience
5. educationRequirements: Required education/degrees
6. certifications: Any mentioned certifications
7. keywords: Important keywords for ATS optimization

Return ONLY valid JSON, no other text."""

        # Call Claude 4.5 Sonnet via Bedrock
        response = bedrock.invoke_model(
            modelId=os.environ.get('MODEL_ID', 'us.anthropic.claude-opus-4-5-20251101-v1:0'),
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3
            })
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        parsed_content = response_body['content'][0]['text']
        
        # Extract JSON from response
        parsed_job = extract_json_from_text(parsed_content)
        
        return {
            'statusCode': 200,
            'jobId': job_id,
            'jobDescription': job_description,
            'parsedJob': parsed_job,
            'requiredSkills': parsed_job.get('requiredSkills', []),
            'preferredSkills': parsed_job.get('preferredSkills', []),
            'keyResponsibilities': parsed_job.get('keyResponsibilities', []),
            'keywords': parsed_job.get('keywords', [])
        }
        
    except ValueError as e:
        logger.warning("Validation error parsing job: %s", str(e))
        return {
            'statusCode': 400,
            'error': str(e),
            'jobId': event.get('jobId', ''),
            'message': 'Invalid input'
        }
    except Exception as e:
        logger.error("Error parsing job description: %s", str(e), exc_info=True)
        return {
            'statusCode': 500,
            'error': str(e),
            'jobId': event.get('jobId', ''),
            'message': 'Failed to parse job description'
        }
