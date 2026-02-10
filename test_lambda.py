#!/usr/bin/env python3
"""
Local test script for Lambda functions
"""
import json
import sys
import os

# Add lambda functions to path
sys.path.insert(0, 'lambda/functions')

# Set environment variables
os.environ['BUCKET_NAME'] = 'resume-tailor-831729228662'
os.environ['TABLE_NAME'] = 'ResumeTailorResults'
os.environ['BEDROCK_REGION'] = 'us-east-1'

# Test parse_job
print("Testing parse_job...")
from parse_job import handler as parse_job_handler

test_event = {
    'jobId': 'test-job-123',
    'jobDescription': '''
AI/ML Research Scientist position at Peraton Labs.
Required: Python, AWS, Machine Learning, LLMs
Preferred: Claude, Bedrock, Agentic AI
'''
}

try:
    result = parse_job_handler(test_event, None)
    print("✅ Parse Job Result:")
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"❌ Parse Job Error: {e}")
    import traceback
    traceback.print_exc()
