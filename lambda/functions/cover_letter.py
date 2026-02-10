"""
Cover Letter Generation Lambda Function
Creates personalized cover letter that tells candidate's story
"""
import json
import os
import boto3
from extract_json import extract_json_from_text
from typing import Dict, Any

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

COVER_LETTER_PROMPT = """Create a personalized cover letter that tells the candidate's story, shows passion, and makes them stand out. The letter should:
1. Open with a compelling hook
2. Connect personal experience to job requirements
3. Show genuine enthusiasm for the role
4. Highlight 2-3 key achievements relevant to the position
5. Close with a strong call to action"""

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Generate personalized cover letter
    
    Input:
        - jobDescription: Full job posting
        - tailoredResumeMarkdown: Tailored resume
        - analysis: Fit analysis with strengths
        - companyName: Company name (optional)
        
    Output:
        - coverLetter: Generated cover letter
        - tone: Detected tone (professional, enthusiastic, etc.)
    """
    try:
        bucket_name = os.environ['BUCKET_NAME']
        job_description = event.get('jobDescription', '')
        tailored_resume = event.get('tailoredResumeMarkdown', '')
        analysis = event.get('analysis', {})
        company_name = event.get('companyName', '[Company Name]')
        
        strengths = analysis.get('strengths', [])
        
        prompt = f"""{COVER_LETTER_PROMPT}

JOB DESCRIPTION:
{job_description}

CANDIDATE'S RESUME:
{tailored_resume}

KEY STRENGTHS FOR THIS ROLE:
{chr(10).join(f'- {s}' for s in strengths)}

COMPANY: {company_name}

Generate a compelling cover letter that:
- Is 3-4 paragraphs (250-400 words)
- Uses specific examples from the resume
- Addresses the company and role specifically
- Shows personality while remaining professional
- Demonstrates understanding of the role's challenges

Return JSON with:
{{
  "coverLetter": "<complete cover letter text>",
  "tone": "<professional/enthusiastic/confident>",
  "keyPoints": [<array of main points covered>]
}}

Return ONLY valid JSON."""

        # Call Claude 4.5 Sonnet for creative writing
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-sonnet-4-20250514-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7
            })
        )
        
        response_body = json.loads(response['body'].read())
        result_content = response_body['content'][0]['text']
        
        result = extract_json_from_text(result_content)
        cover_letter = result.get('coverLetter', '')
        
        # Save cover letter to S3
        job_id = event.get('jobId', 'unknown')
        cover_letter_key = f"tailored/{job_id}/cover_letter.txt"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=cover_letter_key,
            Body=cover_letter.encode('utf-8'),
            ContentType='text/plain'
        )
        
        return {
            'statusCode': 200,
            'coverLetter': cover_letter,
            'coverLetterS3Key': cover_letter_key,
            'tone': result.get('tone', 'professional'),
            'keyPoints': result.get('keyPoints', [])
        }
        
    except Exception as e:
        print(f"Error generating cover letter: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to generate cover letter'
        }
