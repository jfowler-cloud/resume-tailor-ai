"""
Refine Resume Lambda Function
Regenerates resume incorporating critical feedback
"""
import json
import os
import boto3
from typing import Dict, Any

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Refine resume based on critical feedback
    
    Input:
        - originalResume: Original tailored resume
        - criticalReview: Feedback from critical review
        - jobDescription: Original job posting
        - parsedJob: Parsed job requirements
        
    Output:
        - refinedResumeMarkdown: Improved resume
    """
    try:
        original_resume = event.get('originalResume', '')
        critical_review = event.get('criticalReview', {})
        job_description = event.get('jobDescription', '')
        parsed_job = event.get('parsedJob', {})
        
        weaknesses = critical_review.get('weaknesses', [])
        actionable_steps = critical_review.get('actionableSteps', [])
        red_flags = critical_review.get('redFlags', [])
        
        prompt = f"""You are refining a resume based on critical feedback. Your goal is to address the identified weaknesses while maintaining the candidate's authentic voice and experience.

ORIGINAL RESUME:
{original_resume}

JOB REQUIREMENTS:
{json.dumps(parsed_job, indent=2)}

CRITICAL FEEDBACK TO ADDRESS:

Weaknesses:
{chr(10).join(f"- {w}" for w in weaknesses)}

Actionable Steps:
{chr(10).join(f"- {s}" for s in actionable_steps)}

Red Flags to Fix:
{chr(10).join(f"- {r}" for r in red_flags)}

INSTRUCTIONS:
1. Address each weakness and red flag specifically
2. Implement the actionable steps where applicable
3. Strengthen quantifiable achievements
4. Improve clarity and impact of bullet points
5. Maintain the candidate's authentic voice
6. Keep the same overall structure and format
7. Ensure all claims remain truthful and verifiable

Generate an improved resume in Markdown format that addresses the feedback while staying true to the candidate's actual experience."""

        # Stream response from Claude
        response = bedrock.invoke_model_with_response_stream(
            modelId=os.environ.get('MODEL_ID', 'us.anthropic.claude-opus-4-5-20251101-v1:0'),
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 16384,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7
            })
        )
        
        # Collect streamed response
        refined_resume = ""
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    if chunk_obj['type'] == 'content_block_delta':
                        if chunk_obj['delta']['type'] == 'text_delta':
                            refined_resume += chunk_obj['delta']['text']
        
        return {
            'statusCode': 200,
            'refinedResumeMarkdown': refined_resume.strip()
        }
        
    except Exception as e:
        print(f"Error refining resume: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to refine resume'
        }
