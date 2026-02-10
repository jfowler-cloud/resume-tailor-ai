# Resume Tailor Project - Structure

```
resume-tailor-project/
│
├── README.md                          # Project overview
├── QUICKSTART.md                      # Quick start guide
├── PROJECT_STRUCTURE.md               # This file
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript configuration
├── cdk.json                          # CDK configuration
├── .env                              # Environment variables (DO NOT COMMIT)
├── .gitignore                        # Git ignore rules
│
├── setup/                            # Setup and configuration
│   ├── AWS_ACCOUNT_SETUP.md         # Detailed AWS setup guide
│   ├── setup.sh                     # Automated setup script
│   └── iam-policy.json              # Scoped IAM policy
│
├── lib/                              # CDK infrastructure code
│   ├── resume-tailor-stack.ts       # Main CDK stack
│   ├── constructs/                  # Reusable CDK constructs
│   │   ├── storage-construct.ts     # S3 + DynamoDB
│   │   ├── api-construct.ts         # API Gateway + Lambda
│   │   ├── workflow-construct.ts    # Step Functions
│   │   ├── frontend-construct.ts    # CloudFront + S3
│   │   └── notifications-construct.ts # SES + SNS
│   └── config/                      # Configuration files
│       ├── dev.ts                   # Dev environment config
│       └── prod.ts                  # Prod environment config
│
├── lambda/                           # Lambda function code
│   ├── requirements.txt             # Python dependencies
│   ├── common/                      # Shared utilities
│   │   ├── bedrock_client.py       # Bedrock API wrapper
│   │   ├── s3_client.py            # S3 operations
│   │   ├── dynamodb_client.py      # DynamoDB operations
│   │   └── utils.py                # Common utilities
│   │
│   ├── parse-resumes/              # Step 1: Parse uploaded resumes
│   │   ├── handler.py              # Lambda handler
│   │   ├── parser.py               # Resume parsing logic
│   │   └── tests/                  # Unit tests
│   │
│   ├── analyze-job/                # Step 2: Analyze job requirements
│   │   ├── handler.py              # Lambda handler
│   │   ├── analyzer.py             # Job analysis logic
│   │   ├── prompts.py              # AI prompts
│   │   └── tests/
│   │
│   ├── evaluate-fit/               # Step 3: Evaluate resume fit
│   │   ├── handler.py              # Lambda handler
│   │   ├── evaluator.py            # Fit evaluation logic
│   │   ├── prompts.py              # AI prompts
│   │   └── tests/
│   │
│   ├── select-resume/              # Step 4: Select best base resume
│   │   ├── handler.py              # Lambda handler
│   │   ├── selector.py             # Selection logic
│   │   └── tests/
│   │
│   ├── tailor-resume/              # Step 5: Tailor resume
│   │   ├── handler.py              # Lambda handler
│   │   ├── tailorer.py             # Resume tailoring logic
│   │   ├── prompts.py              # AI prompts (all 6 approaches)
│   │   └── tests/
│   │
│   ├── generate-cover-letter/      # Step 6: Generate cover letter
│   │   ├── handler.py              # Lambda handler
│   │   ├── generator.py            # Cover letter generation
│   │   ├── prompts.py              # AI prompts
│   │   └── tests/
│   │
│   ├── quality-check/              # Step 7: Final quality check
│   │   ├── handler.py              # Lambda handler
│   │   ├── checker.py              # Quality validation
│   │   └── tests/
│   │
│   ├── store-results/              # Step 8: Store results
│   │   ├── handler.py              # Lambda handler
│   │   ├── storage.py              # Storage logic
│   │   └── tests/
│   │
│   └── api/                        # API Lambda functions
│       ├── upload-resume.py        # Upload resume endpoint
│       ├── analyze-fit.py          # Trigger analysis
│       ├── get-results.py          # Retrieve results
│       └── health.py               # Health check
│
├── frontend/                        # React frontend
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── vite.config.ts              # Vite configuration
│   ├── index.html                  # Entry HTML
│   │
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Main app component
│   │   │
│   │   ├── components/             # React components
│   │   │   ├── ResumeUpload.tsx   # Resume upload component
│   │   │   ├── JobDescription.tsx  # Job description input
│   │   │   ├── FitAnalysis.tsx    # Fit analysis display
│   │   │   ├── TailoredResume.tsx # Resume display
│   │   │   └── CoverLetter.tsx    # Cover letter display
│   │   │
│   │   ├── services/               # API services
│   │   │   ├── api.ts             # API client
│   │   │   └── auth.ts            # Authentication
│   │   │
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useResumes.ts      # Resume management
│   │   │   └── useAnalysis.ts     # Analysis state
│   │   │
│   │   ├── types/                  # TypeScript types
│   │   │   ├── resume.ts          # Resume types
│   │   │   └── analysis.ts        # Analysis types
│   │   │
│   │   └── styles/                 # CSS styles
│   │       └── main.css           # Global styles
│   │
│   └── tests/                      # Frontend tests
│       ├── components/             # Component tests
│       └── integration/            # Integration tests
│
├── prompts/                         # AI prompt templates
│   ├── resume-optimization-prompts.md  # All prompts documented
│   └── examples/                   # Example inputs/outputs
│       ├── job-description.txt    # Sample job description
│       ├── resume-input.md        # Sample resume
│       └── tailored-output.md     # Sample output
│
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── API.md                      # API documentation
│   ├── DEVELOPMENT.md              # Development guide
│   ├── DEPLOYMENT.md               # Deployment guide
│   └── TROUBLESHOOTING.md          # Common issues
│
├── tests/                           # Integration tests
│   ├── integration/                # Integration test suites
│   │   ├── test_workflow.py       # End-to-end workflow
│   │   ├── test_api.py            # API tests
│   │   └── test_ai_prompts.py     # AI prompt tests
│   │
│   └── fixtures/                   # Test data
│       ├── resumes/               # Sample resumes
│       └── job-descriptions/      # Sample job postings
│
├── scripts/                         # Utility scripts
│   ├── deploy.sh                   # Deployment script
│   ├── test.sh                     # Test runner
│   ├── seed-data.sh               # Seed test data
│   └── cleanup.sh                 # Cleanup resources
│
└── .github/                        # GitHub configuration
    └── workflows/                  # GitHub Actions
        ├── test.yml               # Run tests on PR
        ├── deploy-dev.yml         # Deploy to dev
        └── deploy-prod.yml        # Deploy to prod
```

---

## Key Directories Explained

### `/lib` - Infrastructure as Code

CDK constructs defining AWS resources:
- **Storage:** S3 buckets, DynamoDB tables
- **API:** API Gateway, Lambda functions
- **Workflow:** Step Functions state machine
- **Frontend:** CloudFront distribution, S3 hosting
- **Notifications:** SES, SNS topics

### `/lambda` - Serverless Functions

Python Lambda functions for each workflow step:
- **Common utilities:** Shared code for Bedrock, S3, DynamoDB
- **Workflow steps:** 8 Lambda functions orchestrated by Step Functions
- **API handlers:** REST API endpoints

### `/frontend` - React Application

TypeScript React app with Cloudscape Design System:
- **Components:** Reusable UI components
- **Services:** API integration
- **Hooks:** State management
- **Tests:** Vitest component tests

### `/prompts` - AI Prompt Engineering

Documented prompts for each AI task:
- Resume analysis
- Fit evaluation
- Resume tailoring (6 approaches)
- Cover letter generation
- Quality checking

### `/setup` - Configuration

Setup scripts and guides:
- Automated setup script
- AWS account configuration
- IAM policies

### `/docs` - Documentation

Comprehensive documentation:
- Architecture diagrams
- API reference
- Development guides
- Troubleshooting

---

## File Naming Conventions

### Lambda Functions
- `handler.py` - Lambda entry point
- `{feature}.py` - Core logic
- `prompts.py` - AI prompts
- `tests/` - Unit tests

### CDK Constructs
- `{feature}-construct.ts` - Reusable construct
- `{env}.ts` - Environment config

### React Components
- `{ComponentName}.tsx` - Component file
- `use{HookName}.ts` - Custom hook
- `{feature}.test.tsx` - Component test

---

## Environment Variables

Required in `.env`:

```bash
# AWS Configuration
AWS_PROFILE=resume-tailor
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Project Configuration
PROJECT_NAME=resume-tailor
ENVIRONMENT=dev

# Bedrock Configuration
BEDROCK_REGION=us-east-1

# User Configuration
USER_EMAIL=your-email@example.com
```

---

## Dependencies

### Backend (Python)
- `boto3` - AWS SDK
- `anthropic` - Claude API (via Bedrock)
- `pydantic` - Data validation
- `pytest` - Testing

### Frontend (TypeScript)
- `react` - UI framework
- `@cloudscape-design/components` - AWS design system
- `vite` - Build tool
- `vitest` - Testing

### Infrastructure (TypeScript)
- `aws-cdk-lib` - CDK framework
- `constructs` - CDK constructs

---

## Build Artifacts

Generated during build (not committed):

```
cdk.out/                    # CDK CloudFormation templates
node_modules/               # Node.js dependencies
lambda/.venv/               # Python virtual environment
frontend/dist/              # Built frontend
frontend/node_modules/      # Frontend dependencies
.env                        # Environment variables
cdk.context.json           # CDK context cache
```

---

## Next Steps

1. **Review:** [QUICKSTART.md](QUICKSTART.md) for setup
2. **Configure:** Run `setup/setup.sh`
3. **Deploy:** `cdk deploy --profile resume-tailor`
4. **Test:** Upload resumes and analyze fit
5. **Iterate:** Customize prompts and UI

---

This structure supports:
- ✅ Rapid development with AI assistance
- ✅ Clean separation of concerns
- ✅ Easy testing and debugging
- ✅ Scalable architecture
- ✅ Production-ready code quality
