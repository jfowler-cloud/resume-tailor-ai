"""
Notification Lambda Function
Sends email notification when resume analysis is complete
"""
import json
import os
import boto3
from typing import Dict, Any

ses = boto3.client('ses', region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Send email notification with results summary
    
    Input: Complete workflow results
    
    Output:
        - emailSent: Boolean indicating success
        - messageId: SES message ID
    """
    try:
        user_email = event.get('userEmail', os.environ.get('USER_EMAIL'))
        
        if not user_email:
            print("No email address provided, skipping notification")
            return {
                'statusCode': 200,
                'emailSent': False,
                'message': 'No email address configured'
            }
        
        job_id = event.get('jobId', 'Unknown')
        fit_score = event.get('fitScore', 0)
        ats_score = event.get('atsScore', 0)
        overall_rating = event.get('overallRating', 0)
        
        # Prepare email content
        subject = f"Resume Analysis Complete - {fit_score}% Fit"
        
        body_text = f"""Resume Tailor Analysis Complete

Job ID: {job_id}

Results Summary:
- Job Fit Score: {fit_score}%
- ATS Compatibility: {ats_score}%
- Overall Rating: {overall_rating}/10

Your tailored resume and cover letter are ready for download.

Log in to view full results and download your documents.

---
Resume Tailor Platform
"""
        
        body_html = f"""<html>
<head></head>
<body>
  <h2>Resume Analysis Complete</h2>
  <p><strong>Job ID:</strong> {job_id}</p>
  
  <h3>Results Summary</h3>
  <ul>
    <li><strong>Job Fit Score:</strong> {fit_score}%</li>
    <li><strong>ATS Compatibility:</strong> {ats_score}%</li>
    <li><strong>Overall Rating:</strong> {overall_rating}/10</li>
  </ul>
  
  <p>Your tailored resume and cover letter are ready for download.</p>
  <p>Log in to view full results and download your documents.</p>
  
  <hr>
  <p><em>Resume Tailor Platform</em></p>
</body>
</html>"""
        
        # Send email via SES
        response = ses.send_email(
            Source=user_email,  # Must be verified in SES
            Destination={
                'ToAddresses': [user_email]
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': body_text,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': body_html,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        
        return {
            'statusCode': 200,
            'emailSent': True,
            'messageId': response['MessageId'],
            'recipient': user_email
        }
        
    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'emailSent': False,
            'message': 'Failed to send notification'
        }
