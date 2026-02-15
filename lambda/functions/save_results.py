"""
Save Results Lambda Function
Stores all analysis results in DynamoDB
"""
import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')

def convert_floats_to_decimal(obj):
    """Recursively convert float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Save all workflow results to DynamoDB
    
    Input: Complete workflow output from all previous steps
    
    Output:
        - saved: Boolean indicating success
        - itemId: DynamoDB item identifier
    """
    try:
        table_name = os.environ['TABLE_NAME']
        table = dynamodb.Table(table_name)
        
        job_id = event.get('jobId', '')
        user_id = event.get('userId', 'anonymous')
        
        # Extract timestamp from jobId (format: job-1770764725413)
        timestamp = int(job_id.split('-')[1]) if '-' in job_id else int(datetime.utcnow().timestamp() * 1000)
        
        # Extract critique data from analysis
        analysis_data = event.get('analysis', {})
        
        # Extract parallel results (ATS, Cover Letter, Critical Review)
        parallel_results = event.get('parallelResults', [])
        ats_result = parallel_results[0] if len(parallel_results) > 0 else {}
        cover_letter_result = parallel_results[1] if len(parallel_results) > 1 else {}
        critical_review_result = parallel_results[2] if len(parallel_results) > 2 else {}
        
        # Extract tailored resume info
        tailored_resume = event.get('tailoredResume', {})
        
        # Prepare item for DynamoDB (convert floats to Decimal)
        item = convert_floats_to_decimal({
            'jobId': job_id,
            'timestamp': timestamp,
            'userId': user_id,
            'jobDescription': event.get('jobDescription', ''),
            'parsedJob': event.get('parsedJob', {}),
            'analysis': analysis_data,
            'fitScore': analysis_data.get('fitScore', 0),
            'matchedSkills': analysis_data.get('matchedSkills', []),
            'missingSkills': analysis_data.get('missingSkills', []),
            'strengths': analysis_data.get('strengths', []),
            'weaknesses': analysis_data.get('weaknesses', []),
            'gaps': analysis_data.get('gaps', []),
            'recommendations': analysis_data.get('recommendations', []),
            'actionItems': analysis_data.get('actionItems', []),
            'tailoredResumeS3Key': tailored_resume.get('tailoredResumeS3Key', ''),
            'atsOptimizedResume': ats_result.get('atsOptimizedResume', ''),
            'atsScore': ats_result.get('atsScore', 0),
            'coverLetterS3Key': cover_letter_result.get('coverLetterS3Key', ''),
            'criticalReview': critical_review_result,
            'overallRating': critical_review_result.get('overallRating', 0),
            'createdAt': datetime.utcnow().isoformat(),
            'status': 'completed'
        })
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'saved': True,
            'itemId': f"{job_id}#{timestamp}",
            'jobId': job_id,
            'userId': user_id,
            'timestamp': timestamp,
            'results': {
                'fitScore': item['fitScore'],
                'atsScore': item['atsScore'],
                'overallRating': item['overallRating'],
                'tailoredResumeS3Key': item['tailoredResumeS3Key'],
                'coverLetterS3Key': item['coverLetterS3Key']
            }
        }
        
    except Exception as e:
        print(f"Error saving results: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'saved': False,
            'message': 'Failed to save results'
        }
