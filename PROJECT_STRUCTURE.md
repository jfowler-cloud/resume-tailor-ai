# Resume Tailor Project - Structure

## Current Project Structure

```
resume-tailor-project/
│
├── README.md                          # Project overview and quick start
├── QUICKSTART.md                      # Detailed quick start guide
├── TESTING.md                         # Testing guide and coverage
├── PROJECT_STRUCTURE.md               # This file
├── DEPLOYMENT.md                      # Deployment instructions
├── CLOUDFRONT_DEPLOYMENT.md           # CloudFront deployment guide
├── DEPLOY_FEATURE_STACK.md            # Feature branch deployment
├── IMPLEMENTATION_COMPLETE.md         # Implementation details
├── BACKEND_TEST_RESULTS.md            # Backend test results
│
├── package.json                       # Root Node.js dependencies (CDK)
├── tsconfig.json                      # TypeScript configuration
├── cdk.json                          # CDK configuration
├── cdk.context.json                  # CDK context cache
├── .env                              # Environment variables (DO NOT COMMIT)
├── .gitignore                        # Git ignore rules
│
├── deploy-frontend.sh                # Frontend deployment script
├── deploy-feature-stack.sh           # Feature stack deployment
├── deploy.sh                         # Main deployment script
│
├── setup/                            # Setup and configuration
│   └── AWS_ACCOUNT_SETUP.md         # Detailed AWS setup guide
│
├── lib/                              # CDK infrastructure code
│   └── resume-tailor-stack.ts       # Main CDK stack definition
│
├── bin/                              # CDK app entry point
│   └── resume-tailor.ts             # CDK app initialization
│
├── lambda/                           # Lambda function code
│   ├── requirements.txt             # Python dependencies
│   ├── requirements-test.txt        # Test dependencies
│   ├── pytest.ini                   # Pytest configuration
│   │
│   ├── functions/                   # Lambda function handlers
│   │   ├── parse_job.py            # Parse job description (Step 1)
│   │   ├── analyze_resume.py       # Analyze resume fit (Step 2)
│   │   ├── generate_resume.py      # Generate tailored resume (Step 3)
│   │   ├── ats_optimize.py         # ATS optimization (Parallel)
│   │   ├── cover_letter.py         # Generate cover letter (Parallel)
│   │   ├── critical_review.py      # Critical resume review (Parallel)
│   │   ├── refine_resume.py        # Refine resume based on feedback
│   │   ├── save_results.py         # Save to DynamoDB (Step 4)
│   │   ├── notify.py               # Send email notification (Step 5)
│   │   ├── validation.py           # Input validation utilities
│   │   ├── extract_json.py         # JSON extraction utilities
│   │   └── convert_to_pdf.py       # PDF conversion (future)
│   │
│   ├── tests/                       # Backend unit tests (33 tests)
│   │   ├── test_parse_job.py       # Parse job tests (4 tests)
│   │   ├── test_analyze_resume.py  # Analyze resume tests (3 tests)
│   │   ├── test_generate_resume.py # Generate resume tests (3 tests)
│   │   ├── test_save_results.py    # Save results tests (3 tests)
│   │   └── test_validation.py      # Validation tests (20 tests)
│   │
│   └── layers/                      # Lambda layers
│       └── shared/                  # Shared dependencies layer
│           ├── README.md
│           └── python/              # Python packages
│
├── frontend/                        # React frontend application
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── vite.config.ts              # Vite configuration
│   ├── vitest.config.ts            # Vitest test configuration
│   ├── index.html                  # Entry HTML
│   │
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Main app component
│   │   ├── App.css                 # App styles
│   │   ├── vite-env.d.ts           # Vite type definitions
│   │   │
│   │   ├── components/             # React components
│   │   │   ├── ResumeUpload.tsx   # Resume upload component
│   │   │   ├── JobAnalysis.tsx    # Job analysis form
│   │   │   ├── ResumeManagement.tsx # Resume library
│   │   │   ├── Results.tsx        # Results display
│   │   │   └── CriticalFeedback.tsx # Critical feedback display
│   │   │   │
│   │   │   └── __tests__/         # Component tests (10 tests)
│   │   │       ├── ResumeUpload.test.tsx (3 tests)
│   │   │       ├── JobAnalysis.test.tsx (4 tests)
│   │   │       └── ResumeManagement.test.tsx (3 tests)
│   │   │
│   │   ├── config/                 # Configuration
│   │   │   └── amplify.ts         # AWS Amplify configuration
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   └── auth.ts            # Authentication utilities
│   │   │
│   │   └── test/                   # Test setup
│   │       └── setup.ts           # Vitest setup
│   │
│   └── .deploy-config.json         # Deployment configuration (generated)
│
├── scripts/                         # Utility scripts
│   ├── setup-frontend-config.sh    # Auto-configure frontend
│   └── install-git-hooks.sh        # Install pre-commit hooks
│
├── prompts/                         # AI prompt templates
│   └── resume-optimization-prompts.md  # All AI prompts documented
│
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── MODEL_DEPLOYMENT.md         # Model deployment modes
│   ├── DEPLOYMENT_MODES.md         # Deployment mode comparison
│   ├── CRITICAL_FEEDBACK_FEATURE.md # Critical feedback feature
│   ├── CONFIGURATION.md            # Configuration guide
│   ├── CONFIG_AUTOMATION.md        # Config automation
│   ├── GIT_HOOKS.md                # Git hooks documentation
│   └── images/                     # Documentation images
│       ├── upload_resumes.png
│       ├── resume_library.png
│       ├── analyze_job.png
│       ├── results_1.png
│       ├── results_2.png
│       ├── results_3.png
│       └── primary_critical_feedback.png
│
├── .github/                        # GitHub configuration
│   └── workflows/                  # GitHub Actions
│       └── deploy.yml             # CI/CD workflow
│
└── .kiro/                          # Kiro CLI configuration
    └── settings/                   # Kiro settings
        └── lsp.json               # LSP configuration
```

---

## Key Directories Explained

### `/lib` - Infrastructure as Code

Single CDK stack defining all AWS resources:
- **Storage:** S3 buckets (uploads, hosting), DynamoDB table
- **Compute:** Lambda functions for workflow steps
- **Orchestration:** Step Functions state machine
- **Auth:** Cognito User Pool and Identity Pool
- **Frontend:** CloudFront distribution with S3 origin
- **Notifications:** SES email configuration

### `/lambda` - Serverless Functions

Python Lambda functions orchestrated by Step Functions:

**Workflow Steps:**
1. `parse_job.py` - Extract job requirements using Claude Opus 4.5
2. `analyze_resume.py` - Evaluate resume fit against job
3. `generate_resume.py` - Create tailored resume (streaming)
4. Parallel processing:
   - `ats_optimize.py` - ATS optimization
   - `cover_letter.py` - Generate cover letter
   - `critical_review.py` - Detailed critique
5. `save_results.py` - Store in DynamoDB
6. `notify.py` - Send email notification

**Utilities:**
- `validation.py` - Input validation (95% coverage)
- `extract_json.py` - JSON extraction from AI responses
- `refine_resume.py` - AI-powered resume refinement

**Tests:** 33 unit tests with 54% coverage

### `/frontend` - React Application

TypeScript React app with AWS Cloudscape Design System:

**Components:**
- `ResumeUpload.tsx` - Multi-file resume upload with drag-and-drop
- `JobAnalysis.tsx` - Job description input and analysis trigger
- `ResumeManagement.tsx` - Resume library with CRUD operations
- `Results.tsx` - Display fit analysis, tailored resume, cover letter
- `CriticalFeedback.tsx` - Detailed resume critique with refinement

**Configuration:**
- `amplify.ts` - AWS Amplify auth and API configuration
- `.deploy-config.json` - Auto-generated deployment config

**Tests:** 10 component tests with 22% coverage

### `/scripts` - Automation Scripts

- `setup-frontend-config.sh` - Auto-configure frontend from CDK outputs
- `install-git-hooks.sh` - Install pre-commit hooks for security

### `/prompts` - AI Prompt Engineering

Documented prompts for Claude Opus 4.5:
- Job description parsing
- Resume fit analysis
- Resume tailoring strategies
- Cover letter generation
- Critical review and feedback
- Resume refinement

### `/docs` - Documentation

Comprehensive guides:
- Architecture and design decisions
- Deployment modes (Premium vs Optimized)
- Feature documentation
- Configuration guides
- Screenshots and examples

---

## File Naming Conventions

### Lambda Functions
- `{feature}.py` - Lambda handler with core logic
- Single-file functions for simplicity
- Tests in separate `tests/` directory

### React Components
- `{ComponentName}.tsx` - Component file (PascalCase)
- `{ComponentName}.test.tsx` - Component test
- `{utilName}.ts` - Utility functions (camelCase)

### Documentation
- `{TOPIC}.md` - Documentation files (UPPERCASE)
- `{feature}-{detail}.md` - Detailed guides (lowercase)

---

## Environment Variables

Required in `.env`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Optional: Deployment Mode
DEPLOYMENT_MODE=PREMIUM  # or OPTIMIZED
```

---

## Dependencies

### Backend (Python 3.14)
- `boto3` - AWS SDK
- `pytest` - Testing framework
- `pytest-cov` - Coverage reporting
- `pytest-mock` - Mocking utilities
- `moto` - AWS service mocking

### Frontend (TypeScript)
- `react@19` - UI framework
- `@cloudscape-design/components` - AWS design system
- `@aws-amplify/ui-react@6.15.0` - Amplify UI components
- `aws-amplify@6.16.2` - AWS Amplify SDK
- `@aws-sdk/client-*` - AWS SDK v3 clients
- `vite@7` - Build tool
- `vitest@4` - Testing framework

### Infrastructure (TypeScript)
- `aws-cdk-lib@2.x` - CDK framework
- `constructs` - CDK constructs

---

## Build Artifacts

Generated during build (not committed):

```
cdk.out/                    # CDK CloudFormation templates
node_modules/               # Node.js dependencies
lambda/.venv/               # Python virtual environment
lambda/.coverage            # Coverage data
lambda/htmlcov/             # Coverage HTML report
frontend/dist/              # Built frontend
frontend/node_modules/      # Frontend dependencies
frontend/coverage/          # Frontend coverage
.env                        # Environment variables
cdk.context.json           # CDK context cache
```

---

## Deployment Modes

### PREMIUM (Default)
- Claude Opus 4.5 for all functions
- Best quality results
- ~$4-5/month

### OPTIMIZED
- Mixed models (Haiku/Sonnet/Opus)
- 60-70% cost savings
- ~$1-2/month

Set via CDK context:
```bash
npx cdk deploy -c deploymentMode=OPTIMIZED
```

---

## Test Coverage Summary

| Category | Tests | Coverage | Status |
|----------|-------|----------|--------|
| **Backend** | 33 | 54% | ✅ All Passing |
| **Frontend** | 10 | 22% | ✅ All Passing |
| **Total** | **43** | - | ✅ **All Passing** |

**Backend Coverage:**
- `parse_job.py` - 100%
- `validation.py` - 95%
- `save_results.py` - 93%
- `analyze_resume.py` - 92%
- `generate_resume.py` - 88%

---

## Quick Commands

### Deploy Backend
```bash
npx cdk deploy                              # Premium mode
npx cdk deploy -c deploymentMode=OPTIMIZED  # Optimized mode
```

### Deploy Frontend
```bash
./scripts/setup-frontend-config.sh  # Configure
cd frontend && npm run dev          # Local dev
./deploy-frontend.sh                # Deploy to CloudFront
```

### Run Tests
```bash
# Backend
cd lambda
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-test.txt
PYTHONPATH=functions pytest tests/ -v --cov=functions

# Frontend
cd frontend
npm test                # Run tests
npm run test:coverage   # With coverage
```

---

## Architecture Highlights

- **Serverless:** 100% serverless architecture (Lambda, S3, DynamoDB, Step Functions)
- **AI-Powered:** Claude Opus 4.5 via Amazon Bedrock
- **Scalable:** Auto-scaling with pay-per-use pricing
- **Secure:** Cognito authentication, IAM roles, S3 encryption
- **Cost-Effective:** ~$1-5/month depending on deployment mode
- **Production-Ready:** Comprehensive testing, error handling, monitoring

---

## Next Steps

1. **Setup:** Follow [QUICKSTART.md](QUICKSTART.md)
2. **Deploy:** Run `npx cdk deploy`
3. **Configure:** Run `./scripts/setup-frontend-config.sh`
4. **Test:** Upload resumes and analyze jobs
5. **Customize:** Modify prompts in `/prompts` directory

---

This structure supports:
- ✅ Rapid development with AI assistance
- ✅ Clean separation of concerns
- ✅ Comprehensive testing (43 tests)
- ✅ Production-ready infrastructure
- ✅ Cost-optimized deployment options
- ✅ Easy maintenance and updates
