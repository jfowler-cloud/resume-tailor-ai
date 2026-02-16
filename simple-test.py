#!/usr/bin/env python3
"""
End-to-end test for Resume Tailor workflow.
Uploads demo resume, runs Step Functions workflow, and verifies results.

Usage:
    pip install boto3 "botocore[crt]"
    python simple-test.py
"""
import boto3
import json
import os
import time
from datetime import datetime

print("=" * 60)
print("Resume Tailor CLI Test")
print("=" * 60)

# Initialize clients
cfn = boto3.client('cloudformation', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
sfn = boto3.client('stepfunctions', region_name='us-east-1')

# Get configuration from CloudFormation stack outputs
print("\n🔧 Fetching configuration from CloudFormation...")
stack_name = os.environ.get('STACK_NAME', 'ResumeTailorStack')
try:
    response = cfn.describe_stacks(StackName=stack_name)
    outputs = {o['OutputKey']: o['OutputValue'] for o in response['Stacks'][0]['Outputs']}
    BUCKET_NAME = outputs.get('ResumeBucketName')
    STATE_MACHINE_ARN = outputs.get('StateMachineArn')
    if not BUCKET_NAME or not STATE_MACHINE_ARN:
        raise ValueError("Missing required stack outputs")
    print(f"✅ Bucket: {BUCKET_NAME}")
    print(f"✅ State Machine: {STATE_MACHINE_ARN.split(':')[-1]}")
except Exception as e:
    print(f"❌ Failed to get stack outputs: {e}")
    print("   Make sure the ResumeTailorStack is deployed and you have AWS credentials configured.")
    exit(1)

# Read demo files
print("\n📄 Reading demo files...")
with open('resumes/demo_resume.md', 'r') as f:
    demo_resume = f.read()
with open('resumes/demo_job_description.md', 'r') as f:
    demo_job = f.read()

print(f"✅ Read demo resume ({len(demo_resume)} chars)")
print(f"✅ Read demo job description ({len(demo_job)} chars)")

# Upload resume
print("\n📤 Uploading demo resume to S3...")
job_id = f"test-{int(datetime.now().timestamp())}"
user_id = "demo-user"
resume_key = f"uploads/{user_id}/demo_resume.md"

s3.put_object(
    Bucket=BUCKET_NAME,
    Key=resume_key,
    Body=demo_resume.encode('utf-8'),
    ContentType='text/markdown'
)
print(f"✅ Uploaded to s3://{BUCKET_NAME}/{resume_key}")

# Start execution
print("\n🚀 Starting Step Functions execution...")
execution_input = {
    "jobId": job_id,
    "userId": user_id,
    "jobDescription": demo_job,
    "resumeS3Keys": [resume_key],  # Changed to array
    "userEmail": "demo@example.com"
}

response = sfn.start_execution(
    stateMachineArn=STATE_MACHINE_ARN,
    name=f"test-execution-{job_id}",
    input=json.dumps(execution_input)
)
execution_arn = response['executionArn']
print(f"✅ Started: {execution_arn}")

# Poll for completion
print("\n⏳ Waiting for completion (30-60 seconds)...")
start_time = time.time()

while time.time() - start_time < 300:
    response = sfn.describe_execution(executionArn=execution_arn)
    status = response['status']
    
    if status == 'SUCCEEDED':
        print("\n✅ Execution SUCCEEDED!")

        # Check S3 for actual results
        print("\n📊 Checking S3 for results...")
        try:
            resume_obj = s3.get_object(Bucket=BUCKET_NAME, Key=f"tailored/{job_id}/resume.md")
            resume_content = resume_obj['Body'].read().decode('utf-8')
            print(f"   Tailored Resume: {len(resume_content)} chars")
        except Exception as e:
            resume_content = None
            print(f"   Tailored Resume: Not found ({e})")

        try:
            cover_obj = s3.get_object(Bucket=BUCKET_NAME, Key=f"tailored/{job_id}/cover_letter.txt")
            cover_content = cover_obj['Body'].read().decode('utf-8')
            print(f"   Cover Letter: {len(cover_content)} chars")
        except Exception as e:
            cover_content = None
            print(f"   Cover Letter: Not found ({e})")

        if resume_content and cover_content:
            print("\n" + "=" * 60)
            print("✅ TEST PASSED - Workflow generated tailored resume and cover letter")
            print("=" * 60)
            exit(0)
        else:
            print("\n" + "=" * 60)
            print("⚠️ TEST PARTIAL - Workflow succeeded but some outputs missing")
            print("=" * 60)
            exit(1)
    elif status in ['FAILED', 'TIMED_OUT', 'ABORTED']:
        print(f"\n❌ Execution {status}")
        print(f"   Error: {response.get('error', 'Unknown')}")
        print("\n" + "=" * 60)
        print("❌ TEST FAILED")
        print("=" * 60)
        exit(1)
    
    elapsed = int(time.time() - start_time)
    print(f"   Status: {status} ({elapsed}s)", end='\r')
    time.sleep(5)

print("\n⏰ Timeout")
print("=" * 60)
print("❌ TEST FAILED")
print("=" * 60)
exit(1)
