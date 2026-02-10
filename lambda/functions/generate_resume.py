"""
Generate Tailored Resume Lambda Function
Creates customized resume optimized for specific job posting
"""
import json
import os
import boto3
from extract_json import extract_json_from_text
from typing import Dict, Any

s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Load resume optimization prompts
PROFESSIONAL_REWRITE_PROMPT = """You're a top recruiter. Rewrite this resume for the specific job role, using strong, measurable language that grabs attention. Focus on achievements with quantifiable results."""

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Generate tailored resume based on job requirements and fit analysis
    
    Input:
        - jobId: Job identifier
        - resumeS3Key: Original resume S3 key
        - parsedJob: Job requirements
        - analysis: Fit analysis results
        
    Output:
        - tailoredResumeS3Key: S3 key for generated resume
        - tailoredResumeMarkdown: Generated resume content
        - changesApplied: List of modifications made
    """
    try:
        bucket_name = os.environ['BUCKET_NAME']
        resume_keys = event.get('resumeS3Keys', [event.get('resumeS3Key', '')])
        if isinstance(resume_keys, str):
            resume_keys = [resume_keys]
        
        parsed_job = event.get('parsedJob', {})
        analysis = event.get('analysis', {})
        job_description = event.get('jobDescription', '')
        custom_instructions = event.get('customInstructions', '')
        
        # Download all resumes
        resumes = []
        for key in resume_keys:
            if key:
                response = s3.get_object(Bucket=bucket_name, Key=key)
                content = response['Body'].read().decode('utf-8')
                resumes.append(content)
        
        primary_resume = resumes[0] if resumes else ''
        additional_context = '\n\n---ADDITIONAL RESUME VERSION---\n\n'.join(resumes[1:]) if len(resumes) > 1 else ''
        context_section = f"\n\nADDITIONAL RESUME VERSIONS FOR CONTEXT:\n{additional_context}\n" if additional_context else ""
        
        # Prepare tailoring prompt with steering doc approach
        prompt = f"""You are an expert resume writer. Create a tailored version of this resume for the specific job posting.

PRIMARY RESUME TO TAILOR:
{primary_resume}
{context_section}

JOB DESCRIPTION:
{job_description}

JOB REQUIREMENTS:
{json.dumps(parsed_job, indent=2)}

FIT ANALYSIS:
- Fit Score: {analysis.get('fitScore', 0)}%
- Matched Skills: {', '.join(analysis.get('matchedSkills', []))}
- Missing Skills: {', '.join(analysis.get('missingSkills', []))}
- Strengths: {', '.join(analysis.get('strengths', []))}
- Gaps: {', '.join(analysis.get('gaps', []))}

{'CUSTOM INSTRUCTIONS FROM USER:\n' + custom_instructions + '\n' if custom_instructions else ''}

INSTRUCTIONS:
{PROFESSIONAL_REWRITE_PROMPT}

1. Emphasize matched skills and strengths prominently
2. Reframe experience to address missing skills where possible
3. Use keywords from job description for ATS optimization
4. Quantify achievements with specific metrics
5. Align language and terminology with job posting
6. Maintain honesty - don't fabricate experience
7. Keep formatting clean and professional (Markdown)

Return a JSON object with:
{{
  "tailoredResume": "<complete resume in Markdown format>",
  "changesApplied": [<array of specific changes made>],
  "keywordOptimizations": [<array of keywords added/emphasized>]
}}

Return ONLY valid JSON."""

        # Call Claude 4.5 Sonnet for resume generation
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-sonnet-4-20250514-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 16384,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.4
            })
        )
        
        response_body = json.loads(response['body'].read())
        result_content = response_body['content'][0]['text']
        
        # Parse result
        result = extract_json_from_text(result_content)
        tailored_resume = result.get('tailoredResume', '')
        
        # Save tailored resume to S3
        job_id = event.get('jobId', 'unknown')
        tailored_key = f"tailored/{job_id}/resume.md"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=tailored_key,
            Body=tailored_resume.encode('utf-8'),
            ContentType='text/markdown'
        )
        
        return {
            'statusCode': 200,
            'jobId': job_id,
            'originalResumeS3Key': resume_key,
            'tailoredResumeS3Key': tailored_key,
            'tailoredResumeMarkdown': tailored_resume,
            'changesApplied': result.get('changesApplied', []),
            'keywordOptimizations': result.get('keywordOptimizations', [])
        }
        
    except Exception as e:
        print(f"Error generating tailored resume: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to generate tailored resume'
        }
# Updated Tue Feb 10 10:23:24 EST 2026
