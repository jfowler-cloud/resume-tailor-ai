"""
Convert Markdown Resume to PDF Lambda Function
Converts markdown resume to professional PDF format
"""
import json
import os
import boto3
from typing import Dict, Any

s3 = boto3.client('s3')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Convert markdown resume to PDF
    
    Input:
        - resumeS3Key: S3 key for markdown resume
        - jobId: Job identifier
        
    Output:
        - pdfS3Key: S3 key for generated PDF
        - statusCode: HTTP status code
    """
    try:
        bucket_name = os.environ['BUCKET_NAME']
        resume_key = event.get('resumeS3Key', '')
        job_id = event.get('jobId', 'unknown')
        
        # Download markdown
        response = s3.get_object(Bucket=bucket_name, Key=resume_key)
        markdown_content = response['Body'].read().decode('utf-8')
        
        # For now, save as text (PDF conversion requires additional dependencies)
        # TODO: Implement actual PDF conversion with markdown2pdf or similar
        pdf_key = resume_key.replace('.md', '.pdf')
        
        # Placeholder: Save markdown as text with PDF extension
        # In production, use a proper markdown to PDF library
        s3.put_object(
            Bucket=bucket_name,
            Key=pdf_key,
            Body=markdown_content.encode('utf-8'),
            ContentType='application/pdf'
        )
        
        return {
            'statusCode': 200,
            'jobId': job_id,
            'pdfS3Key': pdf_key,
            'message': 'PDF conversion placeholder - implement with proper library'
        }
        
    except Exception as e:
        print(f"Error converting to PDF: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to convert resume to PDF'
        }
