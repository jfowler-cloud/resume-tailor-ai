# Resume Tailor Platform - Architecture

## Overview

A serverless AI-powered resume tailoring platform using IAM role assumption for secure, direct AWS resource access from the React frontend.

**Key Design Decision:** Instead of API Gateway, the React app assumes an IAM role to directly invoke AWS services (Step Functions, S3, DynamoDB, Bedrock). This simplifies the architecture for personal use and reduces costs.

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React | 19.x (latest) |
| **Runtime** | Node.js | 24.x |
| **Backend** | Python | 3.14 |
| **Infrastructure** | AWS CDK | Latest |
| **AI** | Claude (via Bedrock) | Sonnet 4 |
| **Authentication** | AWS SSO | - |
| **Authorization** | IAM Role Assumption | - |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Developer)                             │
│                                                                      │
│  aws sso login --profile resume-tailor                              │
│  (Temporary credentials via AWS SSO)                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Local Dev)                        │
│                    or S3 + CloudFront (Deployed)                     │
│                                                                      │
│  • Upload resumes                                                    │
│  • Paste job description                                             │
│  • View results                                                      │
│                                                                      │
│  AWS SDK for JavaScript v3                                           │
│  └─> Assumes ResumeTailorAppRole                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    IAM ROLE ASSUMPTION                               │
│                                                                      │
│  ResumeTailorAppRole                                                 │
│  • Trust policy allows your AWS account                              │
│  • Permissions for: Bedrock, S3, DynamoDB, Step Functions, SES      │
│  • Returns temporary credentials (valid for 1 hour)                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS SERVICES (Direct Access)                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │      S3      │  │  DynamoDB    │  │Step Functions│             │
│  │              │  │              │  │              │             │
│  │ • Resume     │  │ • Job data   │  │ • Workflow   │             │
│  │   storage    │  │ • Results    │  │   execution  │             │
│  │ • Generated  │  │ • Metadata   │  │              │             │
│  │   resumes    │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │   Bedrock    │  │     SES      │                                │
│  │              │  │              │                                │
│  │ • Claude Sonnet 4 │  │ • Email      │                                │
│  │   Sonnet     │  │   notifications                               │
│  │ • Claude Sonnet 4 │  │              │                                │
│  │   Opus       │  │              │                                │
│  │ • Claude Sonnet 4 │  │              │                                │
│  │   Haiku      │  │              │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP FUNCTIONS WORKFLOW                           │
│                                                                      │
│  State Machine: ResumeTailorWorkflow                                 │
│                                                                      │
│  1. ParseResumes (Lambda)                                            │
│     └─> Extract text from uploaded resumes                          │
│                                                                      │
│  2. AnalyzeJobRequirements (Lambda + Claude Sonnet 4)                     │
│     └─> Extract skills, experience, keywords from job description   │
│                                                                      │
│  3. EvaluateFit (Lambda + Claude Sonnet 4)                                │
│     └─> Score each resume against job requirements                  │
│     └─> Parallel execution for multiple resumes                     │
│                                                                      │
│  4. SelectBestResume (Lambda)                                        │
│     └─> Choose resume with highest fit score                        │
│                                                                      │
│  5. TailorResume (Lambda + Claude Sonnet 4)                               │
│     └─> Apply all 6 optimization approaches                         │
│     └─> Generate ATS-optimized resume                               │
│                                                                      │
│  6. GenerateCoverLetter (Lambda + Claude Sonnet 4)                        │
│     └─> Create personalized cover letter                            │
│                                                                      │
│  7. QualityCheck (Lambda + Claude Sonnet 4)                               │
│     └─> Final validation and scoring                                │
│                                                                      │
│  8. StoreResults (Lambda)                                            │
│     └─> Save to S3 and DynamoDB                                     │
│     └─> Send email notification via SES                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization Flow

### Development (Local)

```
1. Developer runs: aws sso login --profile resume-tailor
   └─> Opens browser for AWS SSO authentication
   └─> Stores temporary credentials in ~/.aws/cli/cache/

2. React app (running locally) uses AWS SDK:
   └─> Reads credentials from AWS_PROFILE=resume-tailor
   └─> Calls STS AssumeRole for ResumeTailorAppRole
   └─> Gets temporary credentials (valid 1 hour)

3. React app uses temporary credentials to:
   └─> Upload resumes to S3
   └─> Start Step Functions execution
   └─> Query DynamoDB for results
   └─> Invoke Bedrock (if needed for real-time features)
```

### Production (Deployed)

```
1. React app deployed to S3 + CloudFront

2. User authenticates via:
   Option A: AWS Cognito (for public access)
   Option B: AWS SSO (for personal use only)

3. Frontend assumes ResumeTailorAppRole:
   └─> Uses AWS SDK for JavaScript v3
   └─> STS AssumeRole with web identity or user credentials
   └─> Gets temporary credentials

4. Same direct AWS service access as development
```

---

## Data Flow

### 1. Resume Upload

```
User uploads resumes (PDF/MD)
  └─> React app assumes role
  └─> Uploads to S3: s3://resume-tailor-{account-id}/uploads/{user-id}/{resume-id}
  └─> Stores metadata in DynamoDB: ResumeTailorResumes table
```

### 2. Job Analysis Trigger

```
User pastes job description
  └─> React app assumes role
  └─> Starts Step Functions execution:
      {
        "jobDescription": "...",
        "resumeIds": ["resume-1", "resume-2", ...],
        "userId": "user-123"
      }
  └─> Returns execution ARN
```

### 3. Workflow Execution

```
Step Functions orchestrates 8 Lambda functions:
  └─> Each Lambda has ResumeTailorAppRole execution role
  └─> Lambdas invoke Bedrock Claude Sonnet 4 APIs
  └─> Results stored in DynamoDB and S3
```

### 4. Results Retrieval

```
React app polls for completion:
  └─> Queries DynamoDB: ResumeTailorResults table
  └─> Downloads generated resume from S3
  └─> Displays in UI
```

---

## IAM Role Structure

### ResumeTailorAppRole (Central Application Role)

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::{account-id}:root"
      },
      "Action": "sts:AssumeRole"
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
```

**Permissions:**
- Bedrock: InvokeModel, InvokeModelWithResponseStream
- S3: GetObject, PutObject, DeleteObject, ListBucket
- DynamoDB: GetItem, PutItem, UpdateItem, Query, Scan
- Step Functions: StartExecution, DescribeExecution, GetExecutionHistory
- SES: SendEmail, SendRawEmail
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

---

## AWS Resources

### S3 Buckets

**resume-tailor-{account-id}**
- `/uploads/{user-id}/{resume-id}` - Original resumes
- `/generated/{job-id}/{resume-id}` - Tailored resumes
- `/generated/{job-id}/cover-letter.md` - Cover letters

**Lifecycle:**
- Uploads: 30 days retention
- Generated: 90 days retention
- Versioning: Enabled

### DynamoDB Tables

**ResumeTailorResumes**
- PK: `userId`
- SK: `resumeId`
- Attributes: fileName, uploadDate, s3Key, metadata

**ResumeTailorJobs**
- PK: `userId`
- SK: `jobId`
- Attributes: jobDescription, status, createdAt, executionArn
- GSI: StatusIndex (status, createdAt)

**ResumeTailorResults**
- PK: `jobId`
- SK: `resultType` (fit-analysis | tailored-resume | cover-letter)
- Attributes: content, score, s3Key, generatedAt

### Step Functions State Machine

**ResumeTailorWorkflow**
- Type: Standard (for long-running workflows)
- Timeout: 15 minutes
- Error handling: Retry with exponential backoff
- Logging: CloudWatch Logs (ALL events)

### Lambda Functions

All functions use:
- Runtime: Python 3.14
- Architecture: arm64 (Graviton2 - cheaper)
- Memory: 512 MB (adjustable per function)
- Timeout: 5 minutes (except parse-resumes: 2 minutes)
- Execution Role: ResumeTailorAppRole

---

## Security

### Data Protection

**At Rest:**
- S3: SSE-S3 (AES-256)
- DynamoDB: AWS-managed encryption
- Secrets: AWS Secrets Manager (if needed)

**In Transit:**
- All AWS API calls: TLS 1.2+
- Frontend: HTTPS only (CloudFront)

### Access Control

**Principle of Least Privilege:**
- ResumeTailorAppRole: Scoped to specific resources
- Resource policies: Restrict access to role ARN
- S3 bucket policies: Deny public access

**Audit:**
- CloudTrail: All API calls logged
- CloudWatch Logs: Lambda execution logs
- S3 access logs: Enabled

---

## Cost Optimization

### Serverless Architecture

**No idle costs:**
- Lambda: Pay per invocation
- Step Functions: Pay per state transition
- DynamoDB: On-demand pricing
- S3: Pay per GB stored

### Resource Optimization

**Lambda:**
- arm64 architecture (20% cheaper)
- Right-sized memory allocation
- Provisioned concurrency: None (not needed)

**Bedrock:**
- Claude Haiku for simple tasks ($0.25/1M tokens)
- Claude Sonnet for complex analysis ($3/1M tokens)
- Claude Opus for critical tailoring ($15/1M tokens)

**S3:**
- Intelligent-Tiering storage class
- Lifecycle policies for automatic deletion
- Compression for large files

### Expected Monthly Cost

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | ~100 invocations | Free tier |
| Step Functions | ~20 executions | $0.05 |
| Bedrock | ~50K tokens | $0.75 |
| DynamoDB | On-demand | $0.25 |
| S3 | ~1GB | $0.02 |
| SES | ~20 emails | $0.002 |
| **Total** | | **~$1-2/month** |

---

## Scalability

### Current Design (Personal Use)

- **Users:** 1 (you)
- **Concurrent executions:** 1-2
- **Resumes per job:** 5-10
- **Jobs per month:** 20-50

### Future Scaling (If Needed)

**To support multiple users:**
1. Add Cognito for authentication
2. Implement user isolation in S3/DynamoDB
3. Add API Gateway for rate limiting
4. Enable DynamoDB auto-scaling
5. Add CloudFront caching

**Current architecture supports:**
- 100+ concurrent users
- 1000+ jobs per day
- No code changes needed

---

## Monitoring & Observability

### CloudWatch Dashboards

**Metrics to track:**
- Step Functions execution success rate
- Lambda error rate and duration
- Bedrock API latency
- DynamoDB throttling
- S3 request rate

### Alarms

**Critical:**
- Step Functions execution failures > 10%
- Lambda errors > 5%
- DynamoDB throttling > 0

**Warning:**
- Bedrock API latency > 5s
- S3 4xx errors > 1%

### Logging

**CloudWatch Log Groups:**
- `/aws/lambda/ResumeTailor-*` - Lambda logs
- `/aws/states/ResumeTailorWorkflow` - Step Functions logs
- `/aws/bedrock/model-invocations` - Bedrock logs

**Log retention:** 7 days (dev), 30 days (prod)

---

## Disaster Recovery

### Backup Strategy

**S3:**
- Versioning enabled
- Cross-region replication (optional)
- Lifecycle policies prevent accidental deletion

**DynamoDB:**
- Point-in-time recovery enabled
- On-demand backups before major changes
- Export to S3 for long-term storage

**Infrastructure:**
- CDK code in Git (infrastructure as code)
- Can redeploy entire stack in minutes

### Recovery Procedures

**Data loss:**
1. Restore DynamoDB from point-in-time recovery
2. Restore S3 objects from versioning
3. Re-run failed Step Functions executions

**Service outage:**
1. Check AWS Service Health Dashboard
2. Retry failed operations
3. Switch to different region (if configured)

---

## Development Workflow

### Local Development

```bash
# 1. Login to AWS
aws sso login --profile resume-tailor

# 2. Start frontend dev server
cd frontend
npm run dev

# 3. Frontend uses local AWS credentials
# AWS SDK automatically uses AWS_PROFILE=resume-tailor

# 4. Test against real AWS resources
# (No local mocking needed)
```

### Testing

**Unit Tests:**
- Lambda functions: pytest
- React components: Vitest

**Integration Tests:**
- Deploy to dev environment
- Run end-to-end tests against real AWS

**Manual Testing:**
- Upload test resumes
- Trigger workflow
- Verify results

### Deployment

```bash
# 1. Synthesize CloudFormation
cdk synth --profile resume-tailor

# 2. Deploy to AWS
cdk deploy --profile resume-tailor

# 3. Verify deployment
aws cloudformation describe-stacks \
  --stack-name ResumeTailorStack \
  --profile resume-tailor
```

---

## Future Enhancements

### Phase 2 Features

- [ ] A/B testing different resume versions
- [ ] Interview question generator
- [ ] Salary range estimator
- [ ] LinkedIn profile optimizer
- [ ] Application tracking dashboard

### Phase 3 Features

- [ ] Chrome extension for one-click tailoring
- [ ] Integration with job boards
- [ ] Resume version control
- [ ] Collaborative editing
- [ ] Analytics dashboard

---

## Comparison: Role Assumption vs API Gateway

### Why Role Assumption?

**Advantages:**
✅ Simpler architecture (fewer components)
✅ Lower cost (no API Gateway charges)
✅ Direct AWS SDK usage (no REST API layer)
✅ Better for personal projects
✅ Easier local development

**Disadvantages:**
❌ Requires AWS credentials
❌ Not suitable for public access
❌ No built-in rate limiting
❌ No API versioning

### When to Use API Gateway?

Use API Gateway when:
- Building a public-facing application
- Need rate limiting and throttling
- Want API versioning and stages
- Require custom authorizers
- Need request/response transformation

For this personal project, role assumption is the better choice.

---

This architecture provides a secure, cost-effective, and scalable solution for AI-powered resume tailoring using modern AWS serverless technologies.
