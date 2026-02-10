"""
ATS Optimization Lambda Function
Ensures resume is 100% compatible with Applicant Tracking Systems
"""
import json
import os
import boto3
from typing import Dict, Any

bedrock = boto3.client('bedrock-runtime', region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'))

ATS_OPTIMIZATION_PROMPT = """Optimize this resume so it's 100% compatible with Applicant Tracking Systems. Add keywords matching the job title and requirements for 2025. Focus on:
1. Keyword density and placement
2. Standard section headings
3. Clean formatting without tables/graphics
4. Skills section optimization
5. Action verbs and industry terminology"""

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Optimize resume for ATS compatibility
    
    Input:
        - tailoredResumeMarkdown: Generated resume
        - parsedJob: Job requirements with keywords
        
    Output:
        - atsOptimizedResume: ATS-friendly version
        - atsScore: Compatibility score (0-100)
        - optimizations: List of ATS improvements made
    """
    try:
        tailored_resume = event.get('tailoredResumeMarkdown', '')
        parsed_job = event.get('parsedJob', {})
        keywords = parsed_job.get('keywords', [])
        
        prompt = f"""{ATS_OPTIMIZATION_PROMPT}

TAILORED RESUME:
{tailored_resume}

TARGET KEYWORDS:
{', '.join(keywords)}

JOB REQUIREMENTS:
{json.dumps(parsed_job, indent=2)}

Return JSON with:
{{
  "atsOptimizedResume": "<ATS-optimized resume in Markdown>",
  "atsScore": <0-100 compatibility score>,
  "optimizations": [<array of specific ATS improvements made>],
  "keywordCoverage": {{
    "included": [<keywords successfully included>],
    "missing": [<keywords that couldn't be naturally included>]
  }}
}}

Return ONLY valid JSON."""

        # Call Claude 4.5 Haiku for fast ATS optimization
        response = bedrock.invoke_model(
            modelId='anthropic.claude-haiku-4-5-20251001-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8192,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3
            })
        )
        
        response_body = json.loads(response['body'].read())
        result_content = response_body['content'][0]['text']
        
        result = json.loads(result_content)
        
        return {
            'statusCode': 200,
            'atsOptimizedResume': result.get('atsOptimizedResume', ''),
            'atsScore': result.get('atsScore', 0),
            'optimizations': result.get('optimizations', []),
            'keywordCoverage': result.get('keywordCoverage', {})
        }
        
    except Exception as e:
        print(f"Error optimizing for ATS: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to optimize for ATS'
        }
