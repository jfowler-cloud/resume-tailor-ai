# Quick Deployment Reference

## Deploy with PREMIUM mode (default)
```bash
npx cdk deploy
```
- Uses Claude Opus 4.5 for all functions
- Best quality
- Cost: ~$4-5/month

## Deploy with OPTIMIZED mode
```bash
npx cdk deploy -c deploymentMode=OPTIMIZED
```
- Uses mixed models (Haiku, Sonnet, Opus 4.5)
- 60-70% cost savings
- Cost: ~$1-2/month

## Switch modes
```bash
# Switch to optimized
npx cdk deploy -c deploymentMode=OPTIMIZED

# Switch back to premium
npx cdk deploy -c deploymentMode=PREMIUM
```

## Model assignments (OPTIMIZED mode)

| Function | Model | Why |
|----------|-------|-----|
| Parse Job | Haiku 4.5 | Simple extraction |
| Analyze Resume | **Opus 4.5** | Critical analysis |
| Generate Resume | **Opus 4.5** | Most important output |
| ATS Optimize | Sonnet 4.5 | Good balance |
| Cover Letter | Sonnet 4.5 | Good writing |
| Critical Review | Sonnet 4.5 | Good analysis |

## Required Bedrock access

### PREMIUM mode
- Claude Opus 4.5

### OPTIMIZED mode
- Claude Opus 4.5
- Claude 3.5 Sonnet v2
- Claude 3.5 Haiku

Request access at: https://console.aws.amazon.com/bedrock/ → Model access

## Full documentation
See [MODEL_DEPLOYMENT.md](MODEL_DEPLOYMENT.md) for complete details.
