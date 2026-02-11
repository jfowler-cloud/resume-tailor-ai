"""
Critical Review Lambda Function
Provides brutally honest feedback on resume quality
"""
import json
import os
import boto3
from extract_json import extract_json_from_text
from typing import Dict, Any

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

CRITICAL_REVIEW_PROMPT = """Give unfiltered feedback on this resume. Tell me what's weak, what's okay, and how to make it impossible to ignore. Be brutally honest but constructive. Focus on:
1. Content quality and impact
2. Quantifiable achievements
3. Clarity and conciseness
4. Professional presentation
5. Competitive positioning"""

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Provide critical review of tailored resume
    
    Input:
        - tailoredResumeMarkdown: Generated resume
        - atsOptimizedResume: ATS version
        
    Output:
        - criticalReview: Honest feedback
        - rating: Overall rating (1-10)
        - strengths: What works well
        - weaknesses: What needs improvement
        - actionableSteps: Specific improvements to make
    """
    try:
        tailored_resume = event.get('tailoredResumeMarkdown', '')
        ats_resume = event.get('atsOptimizedResume', tailored_resume)
        
        prompt = f"""{CRITICAL_REVIEW_PROMPT}

TAILORED RESUME:
{tailored_resume}

ATS-OPTIMIZED VERSION:
{ats_resume}

Provide a critical analysis in JSON format:
{{
  "overallRating": <1-10 score>,
  "strengths": [<array of what works well>],
  "weaknesses": [<array of what needs improvement>],
  "actionableSteps": [<array of specific improvements>],
  "competitiveAnalysis": "<how this resume compares to typical candidates>",
  "redFlags": [<array of potential concerns for recruiters>],
  "standoutElements": [<array of elements that make candidate memorable>],
  "summary": "<2-3 sentence honest assessment>"
}}

Be direct and honest. Return ONLY valid JSON."""

        # Call Claude 4.5 Opus for thorough critical analysis
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
                "temperature": 0.3
            })
        )
        
        response_body = json.loads(response['body'].read())
        result_content = response_body['content'][0]['text']
        
        result = extract_json_from_text(result_content)
        
        return {
            'statusCode': 200,
            'criticalReview': result,
            'overallRating': result.get('overallRating', 0),
            'strengths': result.get('strengths', []),
            'weaknesses': result.get('weaknesses', []),
            'actionableSteps': result.get('actionableSteps', []),
            'competitiveAnalysis': result.get('competitiveAnalysis', ''),
            'redFlags': result.get('redFlags', []),
            'standoutElements': result.get('standoutElements', []),
            'summary': result.get('summary', '')
        }
        
    except Exception as e:
        print(f"Error performing critical review: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to perform critical review'
        }
