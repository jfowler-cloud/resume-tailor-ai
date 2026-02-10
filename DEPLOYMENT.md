# Resume Tailor - Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- Node.js 24+ installed
- Python 3.14+ installed
- AWS CLI configured

## Quick Deployment

### 1. Install Dependencies

```powershell
cd resume-tailor-project
npm install
```

### 2. Configure AWS Credentials

```powershell
# Check if already configured
aws sts get-caller-identity

# If not, configure
aws configure
# Enter Access Key ID
# Enter Secret Access Key
# Region: us-east-1
# Output format: json
```

### 3. Bootstrap CDK (First Time Only)

```powershell
npx cdk bootstrap
```

### 4. Deploy Stack

```powershell
npx cdk deploy --require-approval never
```

This will create:
- S3 bucket for resume storage
- DynamoDB table for results
- 8 Lambda functions
- Step Functions state machine
- IAM roles and policies
- CloudWatch log groups

### 5. Enable Bedrock Models

1. Go to AWS Console → Bedrock → Model access
2. Request access to:
   - Claude 4.5 Sonnet
   - Claude 4.5 Opus
   - Claude 4.5 Haiku
3. Wait for approval (usually instant)

### 6. Verify SES Email (Optional)

```powershell
aws ses verify-email-identity --email-address your-email@example.com --region us-east-1
```

Check your inbox and click the verification link.

## Post-Deployment

### Get Stack Outputs

```powershell
aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs"
```

You'll get:
- `BucketName`: S3 bucket for resumes
- `TableName`: DynamoDB table name
- `StateMachineArn`: Step Functions ARN
- `AppRoleArn`: IAM role for frontend

### Test the Workflow

Create `test-input.json`:

```json
{
  "jobId": "test-job-001",
  "userId": "test-user",
  "jobDescription": "We are seeking an AI/ML Engineer with expertise in Large Language Models, Python, and AWS Bedrock.",
  "resumeS3Key": "uploads/test-user/resume.md",
  "userEmail": "your-email@example.com"
}
```

Start execution:

```powershell
$STATE_MACHINE = "arn:aws:states:us-east-1:ACCOUNT-ID:stateMachine:ResumeTailorWorkflow"
aws stepfunctions start-execution --state-machine-arn $STATE_MACHINE --input file://test-input.json
```

## Troubleshooting

### Issue: CDK Bootstrap Fails

```powershell
# Check if you're logged in
aws sts get-caller-identity

# Try with explicit account/region
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

### Issue: Bedrock Access Denied

1. Go to AWS Console → Bedrock
2. Click "Model access" in left sidebar
3. Request access to Claude models
4. Wait for approval

### Issue: Lambda Timeout

Increase timeout in `lib/resume-tailor-stack.ts`:

```typescript
timeout: cdk.Duration.minutes(5),  // Increase from 2 to 5
```

Then redeploy:

```powershell
npx cdk deploy
```

### Issue: SES Email Not Sending

1. Verify your email in SES
2. Check SES is in the correct region (us-east-1)
3. If in sandbox mode, both sender and recipient must be verified

## Cost Monitoring

### Expected Monthly Costs

- Lambda: ~$0.10 (free tier covers most usage)
- Step Functions: ~$0.05
- Bedrock: ~$0.75 (50K tokens)
- DynamoDB: ~$0.25 (on-demand)
- S3: ~$0.02 (1GB storage)
- SES: ~$0.002 (20 emails)

**Total: ~$1-2/month**

### Monitor Costs

```powershell
# Check current month costs
aws ce get-cost-and-usage --time-period Start=2026-02-01,End=2026-02-28 --granularity MONTHLY --metrics BlendedCost
```

## Cleanup

To delete all resources:

```powershell
npx cdk destroy
```

This will remove:
- Lambda functions
- Step Functions state machine
- IAM roles
- CloudWatch logs

**Note:** S3 bucket and DynamoDB table are retained by default. Delete manually if needed:

```powershell
# Delete S3 bucket
aws s3 rb s3://resume-tailor-ACCOUNT-ID --force

# Delete DynamoDB table
aws dynamodb delete-table --table-name ResumeTailorResults
```

## Next Steps

1. **Build Frontend**: Create React app for user interface
2. **Add Authentication**: Integrate AWS Cognito for multi-user support
3. **Custom Domain**: Set up CloudFront + Route53 for custom domain
4. **CI/CD**: Add GitHub Actions for automated deployments

## Support

For issues or questions:
- Check CloudWatch Logs for Lambda errors
- Review Step Functions execution history
- Verify IAM permissions
- Ensure Bedrock models are enabled
