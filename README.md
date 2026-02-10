# 🎯 AI-Powered Resume Tailor Platform

> Leverage Claude 4.5 to automatically tailor your resume for any job posting

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com/)
[![CDK](https://img.shields.io/badge/CDK-TypeScript-blue)](https://aws.amazon.com/cdk/)
[![Claude](https://img.shields.io/badge/Claude-4.5-purple)](https://www.anthropic.com/claude)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)

---

## 📋 Overview

An intelligent resume tailoring platform that analyzes job descriptions, evaluates resume fit, and generates perfectly tailored resumes using Claude 4.5. Built with AWS serverless architecture for maximum efficiency and minimal cost (~$1-2/month).

### ✨ Key Features

- 🔐 **User Authentication** - Cognito with email/password
- 📤 **Resume Upload** - Upload multiple resume versions (.md, .txt)
- 🤖 **AI Analysis** - Claude 4.5 evaluates fit and identifies gaps
- ✍️ **Automated Tailoring** - AI rewrites resume to emphasize relevant experience
- 📊 **ATS Optimization** - Ensures resume passes Applicant Tracking Systems
- 💌 **Cover Letter Generation** - Creates personalized cover letters
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 💰 **Cost-Effective** - Runs for ~$1-2/month on AWS

---

## 🚀 Quick Start

### Prerequisites

- AWS Account with credentials configured
- AWS CLI installed
- Node.js 24+
- Python 3.14+

### Installation

```powershell
# Clone the repository
git clone https://github.com/yourusername/resume-tailor-project.git
cd resume-tailor-project

# Install dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy to AWS
npx cdk deploy --require-approval never
```

### Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Create .env file with CDK outputs
cp .env.example .env
# Edit .env with values from: aws cloudformation describe-stacks --stack-name ResumeTailorStack

# Run dev server
npm run dev
```

Open http://localhost:3000 and create an account!

**Detailed guides:** [QUICKSTART.md](QUICKSTART.md) | [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🏗️ Architecture

```
React Frontend (Cloudscape)
        ↓
Cognito Authentication
        ↓
AWS SDK v3 (S3, Step Functions, DynamoDB)
        ↓
┌─────────────────────────────────────────┐
│  Step Functions Workflow                │
│  1. Parse Job (Claude 4.5 Sonnet)      │
│  2. Analyze Resume Fit (Claude 4.5 Opus)│
│  3. Generate Tailored Resume            │
│  4. Parallel Processing:                │
│     - ATS Optimize (Claude 4.5 Haiku)   │
│     - Cover Letter (Claude 4.5 Sonnet)  │
│     - Critical Review (Claude 4.5 Opus) │
│  5. Save Results (DynamoDB)             │
│  6. Send Notification (SES)             │
└─────────────────────────────────────────┘
```

---

## 💡 How It Works

1. **Upload Resume** - Upload your resume in Markdown or text format
2. **Paste Job Description** - Copy the entire job posting
3. **AI Analysis** - Claude 4.5 extracts requirements and evaluates fit
4. **Get Results** - Receive tailored resume, cover letter, and feedback in 30-60 seconds

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite | User interface |
| **UI Components** | Cloudscape Design System | AWS-native components |
| **Authentication** | AWS Cognito | User management |
| **API** | Lambda (Python 3.14) | Serverless backend |
| **Orchestration** | Step Functions | Workflow management |
| **AI** | Amazon Bedrock (Claude 4.5) | Resume analysis & generation |
| **Storage** | S3 + DynamoDB | Data persistence |
| **IaC** | AWS CDK (TypeScript) | Infrastructure as code |

---

## 💰 Cost Breakdown

| Service | Monthly Usage | Cost |
|---------|--------------|------|
| **Cognito** | 1 user | **$0** (free tier) |
| Lambda | ~100 invocations | Free tier |
| Step Functions | ~20 executions | $0.05 |
| Bedrock Claude 4.5 | ~50K tokens | $0.75 |
| DynamoDB | On-demand | $0.25 |
| S3 | ~1GB storage | $0.02 |
| SES | ~20 emails | $0.002 |
| **Total** | | **~$1-2/month** |

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 15 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment guide
- **[DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md)** - Current deployment status
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design details
- **[frontend/README.md](frontend/README.md)** - Frontend documentation
- **[prompts/resume-optimization-prompts.md](prompts/resume-optimization-prompts.md)** - AI prompts

---

## 🎯 Current Status

### ✅ Completed
- Backend infrastructure deployed (S3, Lambda, Step Functions, DynamoDB)
- Cognito authentication configured
- React frontend with Cloudscape components
- Dark mode toggle
- Resume upload functionality
- Job analysis workflow
- Results display and download

### ⏳ Pending
- **Bedrock Access Approval** - Submitted use case, waiting for AWS approval (typically 1 business day)
- Once approved, full AI workflow will be operational

## GitHub Actions

This project uses automated workflows for:
- Frontend build validation
- Security scanning
- Cost estimation
- Dependency updates
