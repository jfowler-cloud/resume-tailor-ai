# AWS Personal Account Setup for Resume Tailor Project

## Prerequisites

- AWS Personal Account
- AWS CLI installed locally
- Node.js 24+ installed
- Python 3.14+ installed

---

## Step 1: Configure AWS SSO / AWS Login

### Using AWS SSO (Recommended for Personal Development)

Instead of creating IAM users with access keys, we'll use AWS SSO for secure, temporary credentials.

```bash
# Configure AWS SSO
aws configure sso

# You'll be prompted for:
# SSO session name: resume-tailor
# SSO start URL: [your AWS SSO URL or leave blank for IAM Identity Center]
# SSO region: us-east-1
# SSO registration scopes: sso:account:access

# Select your AWS account
# Select the role: PowerUserAccess or AdministratorAccess

# CLI default client Region: us-east-1
# CLI default output format: json
# CLI profile name: resume-tailor
```

### Login to AWS

```bash
# Login (creates temporary credentials)
aws sso login --profile resume-tailor

# Verify login
aws sts get-caller-identity --profile resume-tailor

# Expected output:
# {
#     "UserId": "AROAXXXXXXXXXXXXXXXXX:your-email@example.com",
#     "Account": "123456789012",
#     "Arn": "arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_PowerUserAccess_xxxxx/your-email@example.com"
# }
```

### Session Management

```bash
# Your session will expire after a few hours
# To refresh:
aws sso login --profile resume-tailor

# Check if session is valid:
aws sts get-caller-identity --profile resume-tailor
```

---

## Step 2: Create Central IAM Role for Application

Instead of using API Gateway, the React app will assume a role to access AWS resources directly.

### Create the Application Role

```bash
# Create trust policy for the role
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {}
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Replace YOUR_ACCOUNT_ID with your actual account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile resume-tailor --query Account --output text)
sed -i "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" /tmp/trust-policy.json

# Create the role
aws iam create-role \
  --role-name ResumeTailorAppRole \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Central role for Resume Tailor application" \
  --profile resume-tailor

# Get the role ARN (save this)
aws iam get-role \
  --role-name ResumeTailorAppRole \
  --profile resume-tailor \
  --query 'Role.Arn' \
  --output text
```

### Attach Permissions to the Role

```bash
# Create permissions policy
cat > /tmp/app-permissions.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::resume-tailor-*",
        "arn:aws:s3:::resume-tailor-*/*"
      ]
    },
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/ResumeTailor*"
    },
    {
      "Sid": "StepFunctionsAccess",
      "Effect": "Allow",
      "Action": [
        "states:StartExecution",
        "states:DescribeExecution",
        "states:GetExecutionHistory",
        "states:ListExecutions"
      ],
      "Resource": "arn:aws:states:*:*:stateMachine:ResumeTailor*"
    },
    {
      "Sid": "SESAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/ResumeTailor*"
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name ResumeTailorAppPolicy \
  --policy-document file:///tmp/app-permissions.json \
  --description "Permissions for Resume Tailor application" \
  --profile resume-tailor

# Attach policy to role
POLICY_ARN=$(aws iam list-policies \
  --profile resume-tailor \
  --query 'Policies[?PolicyName==`ResumeTailorAppPolicy`].Arn' \
  --output text)

aws iam attach-role-policy \
  --role-name ResumeTailorAppRole \
  --policy-arn $POLICY_ARN \
  --profile resume-tailor
```

---

## Step 3: Configure Frontend to Assume Role

The React app will use AWS SDK to assume the role and get temporary credentials.

### Update .env with Role ARN

```bash
# Get the role ARN
ROLE_ARN=$(aws iam get-role \
  --role-name ResumeTailorAppRole \
  --profile resume-tailor \
  --query 'Role.Arn' \
  --output text)

# Add to .env
echo "AWS_ROLE_ARN=$ROLE_ARN" >> .env
```

---

## Step 4: Set Environment Variables

### Create `.env` file (DO NOT COMMIT THIS)

```bash
# In your project root
cat > .env << 'EOF'
# AWS Configuration
AWS_PROFILE=resume-tailor
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID_HERE

# Application Role (for frontend to assume)
AWS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID_HERE:role/ResumeTailorAppRole

# Project Configuration
PROJECT_NAME=resume-tailor
ENVIRONMENT=dev

# Node.js Version
NODE_VERSION=24

# Python Version  
PYTHON_VERSION=3.14

# Bedrock Configuration
BEDROCK_REGION=us-east-1
EOF
```

### Add `.env` to `.gitignore`

```bash
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "cdk.context.json" >> .gitignore
echo "cdk.out/" >> .gitignore
```

---

## Step 4: Bootstrap CDK in Your Account

### Install AWS CDK

```bash
npm install -g aws-cdk

# Verify installation
cdk --version
```

### Bootstrap CDK

```bash
# Bootstrap CDK in your account (one-time setup)
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile resume-tailor

# This creates:
# - S3 bucket for CDK assets
# - IAM roles for CloudFormation
# - ECR repository for Docker images (if needed)
```

---

## Step 5: Enable Required AWS Services

### Enable Amazon Bedrock

```bash
# Check if Bedrock is available in your region
aws bedrock list-foundation-models --region us-east-1 --profile resume-tailor

# If you get an error, you may need to:
# 1. Go to AWS Console → Bedrock
# 2. Click "Get Started"
# 3. Request access to Claude models (usually instant approval)
```

### Request Model Access

1. **AWS Console** → **Amazon Bedrock** → **Model access**
2. **Request access** to:
   - ✅ Claude 4.5 Sonnet
   - ✅ Claude 4.5 Opus
   - ✅ Claude 4.5 Haiku
3. **Wait for approval** (usually instant, sometimes up to 24 hours)

### Verify Model Access

```bash
# List available models
aws bedrock list-foundation-models \
  --region us-east-1 \
  --profile resume-tailor \
  --query 'modelSummaries[?contains(modelId, `claude`)].modelId'
```

---

## Step 6: Set Up SES for Email Notifications

### Verify Email Address

```bash
# Verify your email address for SES
aws ses verify-email-identity \
  --email-address your-email@example.com \
  --region us-east-1 \
  --profile resume-tailor

# Check your email and click the verification link
```

### Check Verification Status

```bash
aws ses get-identity-verification-attributes \
  --identities your-email@example.com \
  --region us-east-1 \
  --profile resume-tailor
```

### Request Production Access (Optional)

By default, SES is in sandbox mode (can only send to verified addresses).

To send to any email:
1. **AWS Console** → **SES** → **Account dashboard**
2. **Request production access**
3. Fill out the form (usually approved within 24 hours)

---

## Step 7: Create S3 Bucket for Resume Storage

```bash
# Create bucket with unique name
aws s3 mb s3://resume-tailor-YOUR_ACCOUNT_ID \
  --region us-east-1 \
  --profile resume-tailor

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket resume-tailor-YOUR_ACCOUNT_ID \
  --versioning-configuration Status=Enabled \
  --profile resume-tailor

# Block public access (security best practice)
aws s3api put-public-access-block \
  --bucket resume-tailor-YOUR_ACCOUNT_ID \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile resume-tailor
```

---

## Step 8: Install Project Dependencies

```bash
# Navigate to project directory
cd resume-tailor-project

# Install CDK dependencies
npm install

# Install Python dependencies for Lambda functions
cd lambda
pip install -r requirements.txt -t .
cd ..
```

---

## Step 9: Deploy the Stack

```bash
# Synthesize CloudFormation template (check for errors)
cdk synth --profile resume-tailor

# Deploy the stack
cdk deploy --profile resume-tailor

# You'll be prompted to approve IAM changes - type 'y' to proceed
```

---

## Step 10: Verify Deployment

### Check Stack Status

```bash
aws cloudformation describe-stacks \
  --stack-name ResumeTailorStack \
  --region us-east-1 \
  --profile resume-tailor \
  --query 'Stacks[0].StackStatus'
```

### Get API Gateway URL

```bash
aws cloudformation describe-stacks \
  --stack-name ResumeTailorStack \
  --region us-east-1 \
  --profile resume-tailor \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### Test API Endpoint

```bash
# Get the API URL from above command
API_URL="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"

# Test health check
curl $API_URL/health
```

---

## Step 11: Set Up CI/CD (Optional)

### GitHub Actions Setup

1. **Add AWS credentials to GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_ACCOUNT_ID`

2. **GitHub Actions will automatically:**
   - Run tests on every push
   - Deploy to dev on push to `main`
   - Deploy to prod on release tags

---

## Security Best Practices

### Scope Down IAM Permissions (After Initial Setup)

Once everything is working, replace `AdministratorAccess` with a scoped-down policy:

```bash
# Create custom policy (see iam-policy.json)
aws iam create-policy \
  --policy-name ResumeTailorDeployPolicy \
  --policy-document file://setup/iam-policy.json \
  --profile resume-tailor

# Detach admin policy
aws iam detach-user-policy \
  --user-name resume-tailor-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --profile resume-tailor

# Attach scoped policy
aws iam attach-user-policy \
  --user-name resume-tailor-deployer \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ResumeTailorDeployPolicy \
  --profile resume-tailor
```

### Enable MFA (Recommended)

```bash
# Enable MFA for your IAM user
aws iam enable-mfa-device \
  --user-name resume-tailor-deployer \
  --serial-number arn:aws:iam::YOUR_ACCOUNT_ID:mfa/resume-tailor-deployer \
  --authentication-code-1 123456 \
  --authentication-code-2 789012 \
  --profile resume-tailor
```

---

## Troubleshooting

### Issue: "Unable to locate credentials"

**Solution:**
```bash
# Verify profile exists
cat ~/.aws/credentials | grep resume-tailor

# Re-configure if needed
aws configure --profile resume-tailor
```

### Issue: "Access Denied" when deploying

**Solution:**
```bash
# Check current identity
aws sts get-caller-identity --profile resume-tailor

# Verify IAM permissions
aws iam list-attached-user-policies \
  --user-name resume-tailor-deployer \
  --profile resume-tailor
```

### Issue: Bedrock models not available

**Solution:**
1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude models
3. Wait for approval (usually instant)

### Issue: SES emails not sending

**Solution:**
```bash
# Check if email is verified
aws ses get-identity-verification-attributes \
  --identities your-email@example.com \
  --region us-east-1 \
  --profile resume-tailor

# If not verified, verify again
aws ses verify-email-identity \
  --email-address your-email@example.com \
  --region us-east-1 \
  --profile resume-tailor
```

---

## Cost Monitoring

### Set Up Billing Alerts

```bash
# Create SNS topic for billing alerts
aws sns create-topic \
  --name billing-alerts \
  --region us-east-1 \
  --profile resume-tailor

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1 \
  --profile resume-tailor
```

### Create Budget

1. **AWS Console** → **Billing** → **Budgets**
2. **Create budget:**
   - Type: Cost budget
   - Amount: $10/month
   - Alert threshold: 80% ($8)
   - Email: your-email@example.com

---

## Next Steps

✅ AWS account configured
✅ IAM user created
✅ AWS CLI profile set up
✅ CDK bootstrapped
✅ Bedrock access enabled
✅ SES email verified
✅ S3 bucket created

**You're ready to deploy!**

Proceed to: `DEPLOYMENT.md` for deployment instructions.
