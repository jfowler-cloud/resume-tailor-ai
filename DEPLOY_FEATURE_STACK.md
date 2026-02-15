# Deploy Feature Stack Guide

## Quick Deploy

```bash
# 1. Authenticate
aws login

# 2. Deploy
./deploy-feature-stack.sh

# 3. Configure frontend
./scripts/setup-frontend-config.sh ResumeTailorFeatureStack

# 4. Test
cd frontend && npm run dev
```

## What Gets Created

A completely separate stack with `-feature` suffix on all resources:

- **Cognito**: `ResumeTailorUsers-feature`
- **S3**: `resume-tailor-feature-{account}`
- **DynamoDB**: `ResumeTailorResults-feature`
- **Lambdas**: `ResumeTailor-feature-*`
- **Step Functions**: `ResumeTailorWorkflow-feature`

## Cost Optimization

Uses OPTIMIZED mode:
- Haiku 4.5 for parsing (cheapest)
- Opus 4.5 for analysis & generation (best quality)
- Sonnet 4.5 for ATS, cover letter, critical review (balanced)

**Estimated**: ~$1-2/month for testing

## Testing the New Feature

1. Create account in feature stack
2. Upload resume
3. Analyze job
4. **NEW**: View "Critical Feedback" section
5. **NEW**: Click "Refine Resume"
6. **NEW**: Compare side-by-side
7. Download both versions

## Cleanup

```bash
npx cdk destroy ResumeTailorFeatureStack
```

Your production stack is completely unaffected!

## Switch Between Stacks

```bash
# Use feature stack
./scripts/setup-frontend-config.sh ResumeTailorFeatureStack

# Use production stack
./scripts/setup-frontend-config.sh ResumeTailorStack
```
