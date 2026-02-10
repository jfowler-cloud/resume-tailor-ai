"""
Save Results Lambda Function
Stores all analysis results in DynamoDB
"""
import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')

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
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        
        # Prepare item for DynamoDB
        item = {
            'jobId': job_id,
            'timestamp': timestamp,
            'userId': user_id,
            'jobDescription': event.get('jobDescription', ''),
            'parsedJob': event.get('parsedJob', {}),
            'analysis': event.get('analysis', {}),
            'fitScore': event.get('fitScore', 0),
            'tailoredResumeS3Key': event.get('tailoredResumeS3Key', ''),
            'atsOptimizedResume': event.get('atsOptimizedResume', ''),
            'atsScore': event.get('atsScore', 0),
            'coverLetterS3Key': event.get('coverLetterS3Key', ''),
            'criticalReview': event.get('criticalReview', {}),
            'overallRating': event.get('overallRating', 0),
            'createdAt': datetime.utcnow().isoformat(),
            'status': 'completed'
        }
        
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
