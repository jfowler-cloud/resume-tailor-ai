# Resume Tailor - Quick Start Guide

## 🚀 Deploy in 10 Minutes

Get your Resume Tailor platform running on AWS.

---

## Prerequisites

- AWS Account with credentials configured (`aws configure`)
- Node.js 18+ and npm
- Python 3.12+

---

## Step 1: Clone and Install (1 minute)

```bash
git clone https://github.com/jfowler-cloud/resume-tailor-ai.git
cd resume-tailor-ai
npm install
```

---

## Step 2: Bootstrap CDK (1 minute)

**First time only** in your AWS account/region:

```bash
npx cdk bootstrap
```

This creates the CDK toolkit stack for deployments.

---

## Step 3: Deploy Backend (5 minutes)

```bash
npx cdk deploy
```

This creates:
- S3 bucket for resume storage
- DynamoDB table for results
- 8 Lambda functions
- Step Functions workflow
- Cognito user pool
- IAM roles with Bedrock permissions

**Save the outputs** - you'll need them for the frontend.

---

## Step 4: Enable Bedrock Models (2 minutes)

**In AWS Console:**

1. Go to: https://console.aws.amazon.com/bedrock/
2. Click **Model access** → **Manage model access**
3. Enable: **Claude Sonnet 4**
4. Click **Save changes**
5. Wait for **Access granted** (~1 minute)

---

## Step 5: Setup Frontend (2 minutes)

```bash
cd frontend
npm install

# Create .env file with CDK outputs
cat > .env << 'EOF'
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<UserPoolId from CDK output>
VITE_USER_POOL_CLIENT_ID=<UserPoolClientId from CDK output>
VITE_IDENTITY_POOL_ID=<IdentityPoolId from CDK output>
VITE_BUCKET_NAME=<BucketName from CDK output>
VITE_STATE_MACHINE_ARN=<StateMachineArn from CDK output>
EOF

# Start dev server
npm run dev
```

---

## Step 6: Create Account & Test

1. Open http://localhost:5173
2. Click **Create account**
3. Verify email (check spam folder)
4. Upload a resume
5. Paste a job description
6. Click **Analyze Job**
7. Wait ~2 minutes for results

---

## 🎉 You're Done!

Your Resume Tailor is now running. Check out:
- **Resume Library** - View all your resumes
- **Results** - See fit scores and critique
- **Download** - Get tailored resumes and cover letters

---

## Troubleshooting

### CDK Deploy Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Re-bootstrap if needed
npx cdk bootstrap --force
```

### Bedrock Access Denied
- Ensure Claude Sonnet 4 is enabled in Bedrock console
- Check IAM role has `bedrock:InvokeModel` permission

### Frontend Can't Connect
- Verify .env values match CDK outputs exactly
- Check region is `us-east-1` in both places

### Email Not Received
- Check spam folder
- Verify email in Cognito console
- Resend verification code

---

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- See [TESTING.md](TESTING.md) for running tests
- Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design

---

## Cost Estimate

Running this platform costs approximately **$1-2/month**:
- Lambda: Free tier
- S3: $0.02/month
- DynamoDB: $0.25/month
- Bedrock: $0.75/month (~50K tokens)
- Cognito: Free tier
- Step Functions: $0.05/month

**Total: ~$1-2/month** for personal use
