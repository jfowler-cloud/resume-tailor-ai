# Resume Tailor - Quick Start Guide

## 🚀 Get Deployed in 15 Minutes

This guide will get your Resume Tailor platform deployed to AWS.

---

## Prerequisites

- ✅ AWS Account with credentials configured
- ✅ AWS CLI installed
- ✅ Node.js 24+ installed
- ✅ Python 3.14+ installed

---

## Step 1: Install Dependencies (2 minutes)

```powershell
# Navigate to project directory
cd resume-tailor-project

# Install npm packages
npm install
```

---

## Step 2: Configure AWS Credentials (3 minutes)

### Check if already configured

```powershell
aws sts get-caller-identity
```

If this works, skip to Step 3.

### Configure credentials

```powershell
aws configure
```

Enter:
- **Access Key ID**: Your AWS access key
- **Secret Access Key**: Your AWS secret key
- **Region**: `us-east-1`
- **Output format**: `json`

---

## Step 3: Bootstrap CDK (2 minutes)

First time only:

```powershell
npx cdk bootstrap
```

This creates the necessary S3 bucket and roles for CDK deployments.

---

## Step 4: Deploy Stack (8 minutes)

```powershell
npx cdk deploy --require-approval never
```

This creates:
- ✅ S3 bucket for resume storage
- ✅ DynamoDB table for results
- ✅ 8 Lambda functions (Python 3.14)
- ✅ Step Functions workflow
- ✅ IAM roles with Bedrock permissions
- ✅ CloudWatch log groups

**Deployment time:** ~5-8 minutes

---

## Step 5: Enable Bedrock Models (2 minutes)

**Must be done in AWS Console:**

1. Go to: https://console.aws.amazon.com/bedrock/
2. Click **Model access** in left sidebar
3. Click **Manage model access**
4. Enable these models:
   - ✅ Claude 4.5 Sonnet
   - ✅ Claude 4.5 Opus
   - ✅ Claude 4.5 Haiku
5. Click **Save changes**
6. Wait for **Access granted** status (~1 minute)

---

## Step 6: Get Stack Outputs

```powershell
aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs"
```

You'll get:
- **BucketName**: `resume-tailor-{account-id}`
- **TableName**: `ResumeTailorResults`
- **StateMachineArn**: Step Functions workflow ARN
- **AppRoleArn**: IAM role for application access

---

## 🎉 You're Deployed!

Your Resume Tailor infrastructure is now live in AWS!

---

## Optional: Verify Email for Notifications

If you want email notifications:

```powershell
aws ses verify-email-identity --email-address your-email@example.com --region us-east-1
```

Check your inbox and click the verification link.

---

## Test the System

### Upload a Test Resume

```powershell
# Set your bucket name (from stack outputs)
$BUCKET = "resume-tailor-<YOUR-AWS-ACCOUNT-ID>"

# Upload a resume
aws s3 cp path\to\your\resume.md s3://$BUCKET/uploads/test-user/resume.md
```

### Start a Test Execution

Create `test-input.json`:

```json
{
  "jobId": "test-001",
  "userId": "test-user",
  "jobDescription": "We are seeking an AI/ML Engineer with expertise in Large Language Models, Python, and AWS. Experience with Claude and Bedrock required.",
  "resumeS3Key": "uploads/test-user/resume.md",
  "userEmail": "your-email@example.com"
}
```

Start the workflow:

```powershell
$STATE_MACHINE = "arn:aws:states:us-east-1:<YOUR-AWS-ACCOUNT-ID>:stateMachine:ResumeTailorWorkflow"
aws stepfunctions start-execution --state-machine-arn $STATE_MACHINE --input file://test-input.json
```

### Monitor Execution

```powershell
# List recent executions
aws stepfunctions list-executions --state-machine-arn $STATE_MACHINE --max-results 5

# Get execution details (use ARN from above)
aws stepfunctions describe-execution --execution-arn "EXECUTION_ARN"
```

---

## Architecture Overview

```
User → Upload Resume to S3
     ↓
     Start Step Functions Workflow
     ↓
     ┌─────────────────────────────────┐
     │ 1. Parse Job (Claude 4.5)       │
     └─────────────────────────────────┘
     ↓
     ┌─────────────────────────────────┐
     │ 2. Analyze Resume Fit           │
     └─────────────────────────────────┘
     ↓
     ┌─────────────────────────────────┐
     │ 3. Generate Tailored Resume     │
     └─────────────────────────────────┘
     ↓
     ┌──────────────────────────────────────────┐
     │ 4. Parallel Processing:                  │
     │    - ATS Optimization                    │
     │    - Cover Letter Generation             │
     │    - Critical Review                     │
     └──────────────────────────────────────────┘
     ↓
     ┌─────────────────────────────────┐
     │ 5. Save Results to DynamoDB     │
     └─────────────────────────────────┘
     ↓
     ┌─────────────────────────────────┐
     │ 6. Send Email Notification      │
     └─────────────────────────────────┘
```

---

## Cost Estimate

| Service | Monthly Usage | Cost |
|---------|--------------|------|
| Lambda | ~100 invocations | Free tier |
| Step Functions | ~20 executions | $0.05 |
| Bedrock Claude | ~50K tokens | $0.75 |
| DynamoDB | On-demand | $0.25 |
| S3 | ~1GB | $0.02 |
| SES | ~20 emails | $0.002 |
| **Total** | | **~$1-2/month** |

---

## Troubleshooting

### Issue: npm install warnings

The warnings about tar corruption are common on Windows. The installation still works - just ignore them.

### Issue: "Unable to locate credentials"

```powershell
# Reconfigure AWS credentials
aws configure
```

### Issue: "Access Denied" for Bedrock

1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude models
3. Wait for approval (usually instant)

### Issue: Lambda timeout

Increase timeout in `lib/resume-tailor-stack.ts`:

```typescript
timeout: cdk.Duration.minutes(5),  // Increase as needed
```

Then redeploy:

```powershell
npx cdk deploy
```

### Issue: CDK bootstrap fails

```powershell
# Check you're logged in
aws sts get-caller-identity

# Try bootstrapping with explicit account/region
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

---

## Next Steps

1. **Build Frontend**: Create React app for user interface
2. **Test Workflow**: Upload real resumes and job descriptions
3. **Add Authentication**: Integrate AWS Cognito for multi-user
4. **Custom Domain**: Set up CloudFront + Route53
5. **CI/CD**: Add GitHub Actions for automated deployments

---

## Clean Up

To delete all resources:

```powershell
npx cdk destroy
```

**Note:** S3 bucket and DynamoDB table are retained by default. Delete manually if needed:

```powershell
# Delete S3 bucket
aws s3 rb s3://resume-tailor-ACCOUNT-ID --force

# Delete DynamoDB table
aws dynamodb delete-table --table-name ResumeTailorResults
```

---

## Support

- **CloudWatch Logs**: Check Lambda function logs for errors
- **Step Functions Console**: Visual workflow execution history
- **Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guide

---

**Deployment complete! Time to start tailoring resumes with AI.** 🚀
