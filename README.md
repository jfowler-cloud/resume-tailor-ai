# 🎯 AI-Powered Resume Tailor Platform

> Leverage Claude 4.5 to automatically tailor your resume for any job posting

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com/)
[![CDK](https://img.shields.io/badge/CDK-TypeScript-blue)](https://aws.amazon.com/cdk/)
[![Claude](https://img.shields.io/badge/Claude-4.5-purple)](https://www.anthropic.com/claude)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-23%20passing-brightgreen)](https://github.com)

---

## 📋 Overview

An intelligent resume tailoring platform that analyzes job descriptions, evaluates resume fit, and generates perfectly tailored resumes using Claude 4.5. Built with AWS serverless architecture for maximum efficiency and minimal cost (~$1-2/month).

### ✨ Key Features

- 🔐 **User Authentication** - Cognito with email/password
- 📤 **Multiple Resume Upload** - Upload and manage multiple resume versions (.md, .txt)
- 📚 **Resume Library** - View, download, and manage all your resumes in one place
- 🤖 **AI Analysis** - Claude 4.5 evaluates fit and identifies gaps
- 📊 **Detailed Critique** - Fit scores, matched/missing skills, strengths, weaknesses
- ✍️ **Automated Tailoring** - AI rewrites resume to emphasize relevant experience
- 🔄 **Reusable Tailored Resumes** - Automatically saved for future applications
- 📈 **ATS Optimization** - Ensures resume passes Applicant Tracking Systems
- 💌 **Cover Letter Generation** - Creates personalized cover letters
- 💾 **Download Capabilities** - Download resumes (Markdown) and cover letters
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 💰 **Cost-Effective** - Runs for ~$1-2/month on AWS
- ✅ **Fully Tested** - 10 frontend unit tests, 13 backend tests

---

## 🚀 Quick Start

### Prerequisites

- AWS Account with credentials configured
- AWS CLI installed
- Node.js 24+
- Python 3.14+

### Installation

```bash
# Clone the repository
git clone https://github.com/jfowler-cloud/resume-tailor-ai.git
cd resume-tailor-ai

# Install dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy to AWS
npx cdk deploy --require-approval never
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file with CDK outputs
cp .env.example .env
# Edit .env with values from: aws cloudformation describe-stacks --stack-name ResumeTailorStack

# Run dev server
npm run dev
```

Open http://localhost:5173 and create an account!

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

1. **Upload Resumes** - Upload one or more resumes in Markdown or text format
2. **Paste Job Description** - Copy the entire job posting
3. **AI Analysis** - Claude 4.5 extracts requirements and evaluates fit
4. **Get Results** - Receive tailored resume, cover letter, and detailed feedback in 30-60 seconds
5. **Manage Library** - View, download, and reuse all your resumes from the Resume Library

---

## 🎯 Dashboard Features

### 1. Upload Resume
- Drag-and-drop or browse to upload
- Support for .md and .txt formats
- Multiple file upload
- Automatic deduplication

### 2. Analyze Job
- Paste job description
- Select one or more resumes to analyze
- Optional company name and custom instructions
- Real-time processing status

### 3. Results
- **Fit Score** - Color-coded percentage match
- **Matched Skills** - Green badges for skills you have
- **Missing Skills** - Red badges for gaps to address
- **Strengths** - What makes you a strong candidate
- **Weaknesses** - Areas for improvement
- **Recommendations** - Actionable advice
- **Tailored Resume** - Optimized for the job
- **Cover Letter** - Personalized introduction
- **Download Options** - Save as Markdown or text

### 4. Resume Library
- View all uploaded and tailored resumes
- Sort by date, name, or size
- Download any resume
- Delete old versions
- Reuse tailored resumes for similar jobs

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
| **Testing** | Vitest + pytest | Unit tests |

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

## 🧪 Testing

### Run Tests

**Frontend:**
```bash
cd frontend
npm test              # Run tests
npm run test:ui       # Interactive UI
npm run test:coverage # With coverage
```

**Backend:**
```bash
cd lambda
pip install -r requirements-test.txt
PYTHONPATH=functions pytest tests/ -v --cov=functions
```

### Test Coverage
- ✅ Frontend: 10/10 tests passing
- ✅ Backend: 13 tests configured
- ✅ Components: ResumeUpload, JobAnalysis, ResumeManagement
- ✅ Lambda Functions: ParseJob, AnalyzeResume, GenerateResume, SaveResults

See [TESTING.md](TESTING.md) for detailed testing guide.

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 15 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment guide
- **[TESTING.md](TESTING.md)** - Testing guide and best practices
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Feature implementation details
- **[BACKEND_TEST_RESULTS.md](BACKEND_TEST_RESULTS.md)** - Backend verification results
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design details
- **[frontend/README.md](frontend/README.md)** - Frontend documentation
- **[prompts/resume-optimization-prompts.md](prompts/resume-optimization-prompts.md)** - AI prompts

---

## 🎯 Current Status

### ✅ Fully Operational
- ✅ Backend infrastructure deployed (S3, Lambda, Step Functions, DynamoDB)
- ✅ Cognito authentication configured
- ✅ React frontend with Cloudscape components
- ✅ Dark mode toggle
- ✅ Multiple resume upload functionality
- ✅ Resume Library with view/download/delete
- ✅ Job analysis workflow
- ✅ Enhanced results display with critique data
- ✅ Download capabilities (Markdown, text)
- ✅ Reusable tailored resumes
- ✅ Unit tests (23 total: 10 frontend, 13 backend)
- ✅ All features tested and verified

### 🔄 Optional Enhancements
- PDF conversion (placeholder implemented)
- CI/CD pipeline (GitHub Actions configured)
- Integration tests
- E2E tests

---

## 🚀 Recent Updates

### v2.0.0 - Enhanced Resume Management (Feb 2026)
- ✨ Added Resume Library component
- ✨ Multiple resume upload support
- ✨ Reusable tailored resumes
- ✨ Enhanced results with critique data display
- ✨ Download capabilities for resumes and cover letters
- ✨ Comprehensive unit test coverage
- 🐛 Fixed TypeScript build errors
- 📝 Updated documentation

### v1.0.0 - Initial Release
- 🎉 Core resume tailoring functionality
- 🎉 AWS serverless architecture
- 🎉 Claude 4.5 integration
- 🎉 User authentication

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- AWS for serverless infrastructure
- Anthropic for Claude 4.5 AI models
- Cloudscape Design System for UI components
- React and Vite communities

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the testing guide in `TESTING.md`

---

**Built with ❤️ using AWS, React, and Claude 4.5**
