# Resume Tailor Platform - Architecture

## Overview

A serverless AI-powered resume tailoring platform using AWS Cognito for authentication and Step Functions for workflow orchestration. The React frontend communicates directly with AWS services using AWS Amplify and AWS SDK v3.

**Key Design Decisions:**
- **Cognito Authentication:** User pools for sign-up/sign-in, identity pools for AWS credentials
- **Direct AWS Access:** React app uses AWS SDK to invoke Step Functions, S3, and DynamoDB
- **Step Functions Orchestration:** Coordinates Lambda functions and AI processing
- **Cost-Optimized:** Serverless architecture with pay-per-use pricing (~$1-5/month)

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React | 19.x |
| **UI Library** | Cloudscape Design System | 3.x |
| **Build Tool** | Vite | 7.x |
| **Runtime** | Node.js | 24.x |
| **Backend** | Python | 3.14 |
| **Infrastructure** | AWS CDK | 2.x |
| **AI** | Claude (via Bedrock) | Opus 4.5 |
| **Authentication** | AWS Cognito | User Pools |
| **Authorization** | IAM Roles | Identity Pools |
| **Storage** | S3 + DynamoDB | - |
| **Orchestration** | Step Functions | - |
| **Hosting** | CloudFront + S3 | - |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                    │
│                                                                      │
│  • Sign up / Sign in via Cognito                                    │
│  • Upload resumes                                                    │
│  • Paste job description                                             │
│  • View results                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                                    │
│                    (CloudFront + S3)                                 │
│                                                                      │
│  • Cloudscape Design System UI                                       │
│  • AWS Amplify (Authentication)                                      │
│  • AWS SDK v3 (S3, Step Functions, DynamoDB)                        │
│                                                                      │
│  Components:                                                         │
│  ├─ ResumeUpload.tsx (multi-file upload)                            │
│  ├─ JobAnalysis.tsx (job description input)                         │
│  ├─ ResumeManagement.tsx (resume library)                           │
│  ├─ Results.tsx (fit analysis, tailored resume)                     │
│  └─ CriticalFeedback.tsx (detailed critique)                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS COGNITO                                       │
│                                                                      │
│  User Pool:                                                          │
│  • Email/password authentication                                     │
│  • User registration and management                                  │
│                                                                      │
│  Identity Pool:                                                      │
│  • Exchanges Cognito tokens for AWS credentials                     │
│  • Assumes ResumeTailorAppRole                                       │
│  • Temporary credentials (1 hour validity)                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS SERVICES (Direct Access)                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │      S3      │  │  DynamoDB    │  │Step Functions│             │
│  │              │  │              │  │              │             │
│  │ • Uploads/   │  │ • Job data   │  │ • Workflow   │             │
│  │ • Tailored/  │  │ • Results    │  │   execution  │             │
│  │ • Hosting/   │  │ • Metadata   │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │   Bedrock    │  │     SES      │                                │
│  │              │  │              │                                │
│  │ • Claude     │  │ • Email      │                                │
│  │   Opus 4.5   │  │   notifications                               │
│  │ • Claude     │  │              │                                │
│  │   Sonnet 4.5 │  │              │                                │
│  │ • Claude     │  │              │                                │
│  │   Haiku 4.5  │  │              │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP FUNCTIONS WORKFLOW                           │
│                                                                      │
│  State Machine: ResumeTailorWorkflow                                 │
│                                                                      │
│  1. ParseJob (Lambda + Claude Opus 4.5)                             │
│     └─> Extract requirements from job description                   │
│                                                                      │
│  2. AnalyzeResume (Lambda + Claude Opus 4.5)                        │
│     └─> Evaluate resume fit against job                             │
│     └─> Calculate fit score, matched/missing skills                 │
│                                                                      │
│  3. GenerateResume (Lambda + Claude Opus 4.5 - Streaming)           │
│     └─> Create tailored resume optimized for job                    │
│     └─> Save to S3 (tailored/ and uploads/ for reuse)              │
│                                                                      │
│  4. Parallel Processing:                                             │
│     ├─> ATSOptimize (Lambda + Claude Opus 4.5)                      │
│     │   └─> ATS compatibility check and score                       │
│     ├─> CoverLetter (Lambda + Claude Opus 4.5)                      │
│     │   └─> Generate personalized cover letter                      │
│     └─> CriticalReview (Lambda + Claude Opus 4.5)                   │
│         └─> Detailed critique with 0-10 rating                      │
│                                                                      │
│  5. SaveResults (Lambda)                                             │
│     └─> Store all results in DynamoDB                               │
│                                                                      │
│  6. Notify (Lambda + SES)                                            │
│     └─> Send email notification to user                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization Flow

### User Sign-Up/Sign-In

```
1. User visits app (https://d3p4fy7i5mq8am.cloudfront.net)
   └─> Hosted on CloudFront + S3

2. User signs up or signs in:
   └─> AWS Amplify UI components
   └─> Cognito User Pool handles authentication
   └─> Email/password credentials

3. Successful authentication:
   └─> Cognito returns ID token, access token, refresh token
   └─> Amplify stores tokens securely

4. Frontend exchanges Cognito token for AWS credentials:
   └─> Cognito Identity Pool
   └─> Assumes ResumeTailorAppRole
   └─> Returns temporary AWS credentials (1 hour)

5. Frontend uses credentials to access AWS services:
   └─> Upload resumes to S3
   └─> Start Step Functions execution
   └─> Query DynamoDB for results
```

### IAM Role Permissions

**ResumeTailorAppRole** (assumed by authenticated users):
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on resume buckets
- `states:StartExecution`, `states:DescribeExecution` on workflow
- `dynamodb:GetItem`, `dynamodb:Query` on results table
- `lambda:InvokeFunction` on RefineResume function

---

## Data Flow

### 1. Resume Upload
```
User → Frontend → S3 (uploads/{userId}/{filename})
                → DynamoDB (metadata)
```

### 2. Job Analysis
```
User → Frontend → Step Functions (StartExecution)
                → Lambda (ParseJob)
                → Bedrock (Claude Opus 4.5)
                → Returns: job requirements
```

### 3. Resume Tailoring
```
Step Functions → Lambda (AnalyzeResume)
              → Bedrock (Claude Opus 4.5)
              → Returns: fit score, skills analysis

              → Lambda (GenerateResume)
              → Bedrock (Claude Opus 4.5 - Streaming)
              → S3 (tailored/{jobId}/resume.md)
              → S3 (uploads/{userId}/tailored-{timestamp}.md)

              → Parallel:
                ├─> Lambda (ATSOptimize) → Bedrock
                ├─> Lambda (CoverLetter) → Bedrock
                └─> Lambda (CriticalReview) → Bedrock

              → Lambda (SaveResults)
              → DynamoDB (job data + results)

              → Lambda (Notify)
              → SES (email notification)
```

### 4. Results Retrieval
```
Frontend → DynamoDB (GetItem by jobId)
        → S3 (GetObject for resume/cover letter)
        → Display in Results component
```

---

## Deployment Modes

### PREMIUM (Default)
- **Model:** Claude Opus 4.5 for all functions
- **Quality:** Best results
- **Cost:** ~$4-5/month
- **Use Case:** Maximum quality

### OPTIMIZED
- **Models:** Mixed (Haiku 4.5, Sonnet 4.5, Opus 4.5)
- **Quality:** Excellent results
- **Cost:** ~$1-2/month (60-70% savings)
- **Use Case:** Cost-conscious deployment

Deploy with:
```bash
npx cdk deploy                              # Premium
npx cdk deploy -c deploymentMode=OPTIMIZED  # Optimized
```

---

## Security

### Authentication
- ✅ Cognito User Pools for user management
- ✅ Email/password authentication
- ✅ Secure token storage via Amplify

### Authorization
- ✅ IAM roles with least-privilege permissions
- ✅ Cognito Identity Pools for credential vending
- ✅ User-scoped S3 access (uploads/{userId}/)

### Data Protection
- ✅ S3 encryption at rest (AES-256)
- ✅ HTTPS/TLS for data in transit
- ✅ CloudFront with HTTPS only
- ✅ DynamoDB encryption at rest

### Secrets Management
- ✅ No hardcoded credentials
- ✅ IAM roles for Lambda execution
- ✅ Environment variables for configuration
- ✅ Git hooks prevent committing sensitive data

---

## Scalability

### Auto-Scaling Components
- **Lambda:** Automatic scaling (up to 1000 concurrent executions)
- **S3:** Unlimited storage, automatic scaling
- **DynamoDB:** On-demand capacity mode
- **CloudFront:** Global CDN with automatic scaling
- **Step Functions:** Handles concurrent workflows

### Performance
- **Resume Upload:** < 1 second
- **Job Analysis:** 30-60 seconds (AI processing)
- **Results Retrieval:** < 500ms (DynamoDB + S3)
- **Frontend Load:** < 2 seconds (CloudFront cache)

---

## Cost Optimization

### Monthly Cost Breakdown (~$1-5/month)

| Service | Usage | Cost |
|---------|-------|------|
| Cognito | 1 user | $0 (free tier) |
| Lambda | ~100 invocations | $0 (free tier) |
| Step Functions | ~20 executions | $0.05 |
| Bedrock | ~50K tokens | $1.50-4.00 |
| DynamoDB | On-demand | $0.25 |
| S3 | ~1GB storage | $0.02 |
| CloudFront | ~1K requests | $0.01 |
| SES | ~20 emails | $0.002 |

### Cost Reduction Strategies
1. Use OPTIMIZED deployment mode (60-70% savings)
2. Delete old tailored resumes from S3
3. Use DynamoDB TTL for old job data
4. CloudFront caching reduces S3 requests

---

## Monitoring & Observability

### CloudWatch Logs
- Lambda function logs (all executions)
- Step Functions execution history
- API access logs

### CloudWatch Metrics
- Lambda invocation count, duration, errors
- Step Functions execution count, success/failure
- S3 request metrics
- DynamoDB read/write capacity

### Alarms (Optional)
- Lambda error rate > 5%
- Step Functions failed executions
- DynamoDB throttling

---

## Testing

### Backend Tests (33 tests, 54% coverage)
- `test_parse_job.py` - Job parsing (100% coverage)
- `test_validation.py` - Input validation (95% coverage)
- `test_save_results.py` - DynamoDB operations (93% coverage)
- `test_analyze_resume.py` - Resume analysis (92% coverage)
- `test_generate_resume.py` - Resume generation (88% coverage)

### Frontend Tests (10 tests, 22% coverage)
- `ResumeUpload.test.tsx` - Upload component
- `JobAnalysis.test.tsx` - Analysis form
- `ResumeManagement.test.tsx` - Resume library

---

## Future Enhancements

### Planned Features
1. Native PDF generation (server-side)
2. Resume version comparison
3. Job application tracking
4. Multi-language support
5. Resume templates

### Infrastructure Improvements
1. CI/CD pipeline (GitHub Actions)
2. Integration tests
3. E2E tests with Playwright
4. Performance monitoring
5. Cost alerts

---

## Development Workflow

### Local Development
```bash
# Backend
cd lambda
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-test.txt
PYTHONPATH=functions pytest tests/ -v

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000
npm test     # Run tests
```

### Deployment
```bash
# Deploy backend
npx cdk deploy

# Configure frontend
./scripts/setup-frontend-config.sh

# Deploy frontend
./deploy-frontend.sh
```

---

## Architecture Principles

1. **Serverless-First:** No servers to manage, automatic scaling
2. **Cost-Optimized:** Pay only for what you use
3. **Security-First:** Cognito auth, IAM roles, encryption
4. **AI-Powered:** Claude Opus 4.5 for intelligent processing
5. **User-Friendly:** Cloudscape Design System for AWS-native UX
6. **Production-Ready:** Comprehensive testing, error handling
7. **Maintainable:** Clean code, documentation, type safety

---

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Cloudscape Design System](https://cloudscape.design/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
