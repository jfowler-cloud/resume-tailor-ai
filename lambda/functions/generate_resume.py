"""
Generate Tailored Resume Lambda Function
Creates customized resume optimized for specific job posting
"""
import json
import os
import boto3
from datetime import datetime
from botocore.config import Config
from extract_json import extract_json_from_text
from typing import Dict, Any

s3 = boto3.client('s3')
bedrock = boto3.client(
    'bedrock-runtime',
    region_name='us-east-1',
    config=Config(read_timeout=600, connect_timeout=60)
)

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
        print(f"Received event keys: {list(event.keys())}")
        
        bucket_name = os.environ['BUCKET_NAME']
        job_id = event.get('jobId', 'unknown')
        resume_keys = event.get('resumeS3Keys', [event.get('resumeS3Key', '')])
        if isinstance(resume_keys, str):
            resume_keys = [resume_keys]
        
        print(f"Processing job: {job_id} with {len(resume_keys)} resume(s)")
        
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

        print(f"Starting resume generation with {len(resumes)} resume(s)...")
        
        # Call Claude 4.5 Sonnet with streaming for resume generation
        response = bedrock.invoke_model_with_response_stream(
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
        
        # Collect streamed response
        result_content = ""
        stream = response.get('body')
        if stream:
            for event in stream:
                chunk = event.get('chunk')
                if chunk:
                    chunk_obj = json.loads(chunk.get('bytes').decode())
                    if chunk_obj['type'] == 'content_block_delta':
                        delta = chunk_obj['delta'].get('text', '')
                        result_content += delta
                        if len(result_content) % 1000 < 100:  # Log progress every ~1000 chars
                            print(f"Generated {len(result_content)} characters...")
        
        print(f"Resume generation complete. Total length: {len(result_content)} characters")
        
        # Parse result
        result = extract_json_from_text(result_content)
        tailored_resume = result.get('tailoredResume', '')
        
        print(f"Extracted tailored resume length: {len(tailored_resume)} characters")
        
        if not tailored_resume:
            print("WARNING: No tailored resume content extracted from response")
            print(f"First 500 chars of response: {result_content[:500]}")
        
        # Save tailored resume to S3
        tailored_key = f"tailored/{job_id}/resume.md"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=tailored_key,
            Body=tailored_resume.encode('utf-8'),
            ContentType='text/markdown'
        )
        
        print(f"Saved tailored resume to S3: {tailored_key}")
        
        # Also save to uploads folder for reuse
        user_id = event.get('userId', 'unknown')
        print(f"DEBUG: userId from event: {user_id}")
        print(f"DEBUG: Full event keys: {list(event.keys())}")
        
        timestamp = int(datetime.now().timestamp() * 1000)
        reusable_key = f"uploads/{user_id}/{timestamp}-tailored-{job_id[:13]}.md"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=reusable_key,
            Body=tailored_resume.encode('utf-8'),
            ContentType='text/markdown'
        )
        
        print(f"Saved reusable copy to: {reusable_key}")
        
        return {
            'statusCode': 200,
            'jobId': job_id,
            'originalResumeS3Keys': resume_keys,
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
