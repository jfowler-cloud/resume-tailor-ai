# Resume Tailor Frontend

React 19 + TypeScript + Vite + Cloudscape Design System + AWS Amplify

## Features

- ✅ **User Authentication** - Cognito with email/password
- ✅ **Dark Mode Toggle** - Persistent theme preference
- ✅ **Resume Upload** - Upload .md or .txt files to S3
- ✅ **Job Analysis** - Submit job descriptions for AI processing
- ✅ **Real-time Results** - View tailored resumes and cover letters
- ✅ **Download Results** - Export generated documents

## Prerequisites

- Node.js 24+
- AWS account with deployed backend (CDK stack)
- Cognito User Pool configured

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in values from CDK outputs:

```bash
cp .env.example .env
```

Get values from CDK:

```powershell
aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs"
```

Update `.env`:

```env
VITE_AWS_REGION=us-east-1
VITE_BUCKET_NAME=resume-tailor-<YOUR-AWS-ACCOUNT-ID>
VITE_STATE_MACHINE_ARN=arn:aws:states:us-east-1:<YOUR-AWS-ACCOUNT-ID>:stateMachine:ResumeTailorWorkflow
VITE_TABLE_NAME=ResumeTailorResults
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Usage

### First Time Setup

1. **Sign Up**
   - Click "Create Account"
   - Enter email and password
   - Verify email with code sent to inbox

2. **Sign In**
   - Enter credentials
   - Access dashboard

### Upload Resume

1. Go to "Upload Resume" tab
2. Select .md or .txt file
3. Click "Upload Resume"
4. File is stored in S3

### Analyze Job

1. Go to "Analyze Job" tab
2. Select uploaded resume
3. Enter company name (optional)
4. Paste full job description
5. Click "Analyze & Tailor Resume"

### View Results

1. Go to "Results" tab
2. Wait for processing (30-60 seconds)
3. View tailored resume and cover letter
4. Download documents

## Architecture

```
React App
  ↓
Cognito Authentication
  ↓
AWS SDK (with Cognito credentials)
  ↓
┌─────────────────────────────────┐
│ S3 - Upload/Download Resumes    │
│ Step Functions - Start Workflow │
│ DynamoDB - Query Results        │
└─────────────────────────────────┘
```

## Components

- **App.tsx** - Main app with auth and dark mode
- **Dashboard.tsx** - Tab navigation
- **ResumeUpload.tsx** - File upload to S3
- **JobAnalysis.tsx** - Job description input and workflow trigger
- **Results.tsx** - Display and download results

## Dark Mode

Toggle between light and dark themes using the button in the top navigation. Preference is saved to localStorage.

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## Deploy to S3 + CloudFront

```bash
# Build
npm run build

# Deploy (add to CDK stack)
aws s3 sync dist/ s3://your-frontend-bucket/ --delete
```

## Troubleshooting

### "No credentials available"

- Ensure Cognito is configured correctly
- Check Identity Pool has authenticated role
- Verify IAM permissions

### "Access Denied" on S3/Step Functions

- Check Cognito authenticated role has permissions
- Verify bucket CORS configuration

### Results not showing

- Check Step Functions execution in AWS Console
- Verify Bedrock model access is enabled
- Check Lambda function logs

## Cost

**Cognito Free Tier:**
- 50,000 MAUs (Monthly Active Users) free
- Perfect for personal use

**Estimated Monthly Cost:** $0 (within free tier)

## Security

- All authentication via Cognito
- Temporary AWS credentials (1 hour expiry)
- No long-lived access keys
- S3 bucket private (no public access)
- HTTPS only in production

## Development

```bash
# Run dev server
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Cloudscape** - AWS design system
- **AWS Amplify** - Auth integration
- **AWS SDK v3** - AWS service clients
