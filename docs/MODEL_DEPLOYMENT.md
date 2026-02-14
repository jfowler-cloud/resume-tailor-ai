# Model Deployment Modes

The Resume Tailor platform supports two deployment modes to balance cost and quality.

## Deployment Modes

### PREMIUM Mode (Default)
Uses **Claude Opus 4.5** for all functions - maximum reasoning and quality.

```bash
npx cdk deploy
# or explicitly
npx cdk deploy -c deploymentMode=PREMIUM
```

**Cost:** ~$3-5/month for moderate usage
**Best for:** Maximum quality, complex resumes, senior positions

### OPTIMIZED Mode
Uses a mix of Claude models based on task complexity - significant cost savings.

```bash
npx cdk deploy -c deploymentMode=OPTIMIZED
```

**Cost:** ~$1-2/month for moderate usage (60-70% savings)
**Best for:** Cost-conscious users, high volume usage

## Model Assignments by Mode

| Function | PREMIUM | OPTIMIZED | Reasoning |
|----------|---------|-----------|-----------|
| **Parse Job** | Opus 4.5 | Haiku 3.5 | Simple extraction task |
| **Analyze Resume** | Opus 4.5 | Opus 4.5 | Critical analysis needs best reasoning |
| **Generate Resume** | Opus 4.5 | Opus 4.5 | Most important output |
| **ATS Optimize** | Opus 4.5 | Sonnet 3.5 v2 | Good balance of quality/cost |
| **Cover Letter** | Opus 4.5 | Sonnet 3.5 v2 | Good writing quality |
| **Critical Review** | Opus 4.5 | Sonnet 3.5 v2 | Good analysis capability |

## Model Specifications

All models use US inference endpoints for optimal performance.

### Claude Opus 4.5
- **Model ID:** `us.anthropic.claude-opus-4-5-20251101-v1:0`
- **Cost:** Input $15/M tokens, Output $75/M tokens
- **Best for:** Complex reasoning, critical analysis

### Claude 3.5 Sonnet v2
- **Model ID:** `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Cost:** Input $3/M tokens, Output $15/M tokens
- **Best for:** Writing, analysis, optimization

### Claude 3.5 Haiku
- **Model ID:** `us.anthropic.claude-3-5-haiku-20241022-v1:0`
- **Cost:** Input $1/M tokens, Output $5/M tokens
- **Best for:** Simple extraction, parsing

## Switching Modes

You can redeploy with a different mode at any time:

```bash
# Switch to optimized
npx cdk deploy -c deploymentMode=OPTIMIZED

# Switch back to premium
npx cdk deploy -c deploymentMode=PREMIUM
```

The deployment will update all Lambda function environment variables with the new model IDs.

## Bedrock Model Access

Before deploying, ensure you have access to the required models in Amazon Bedrock:

1. Go to [Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to **Model access**
3. Request access to:
   - **PREMIUM mode:** Claude Opus 4.5
   - **OPTIMIZED mode:** Claude Opus 4.5, Claude 3.5 Sonnet v2, Claude 3.5 Haiku

Access is typically granted within minutes.

## Cost Estimation

Based on typical usage (20 job applications/month):

| Mode | Parse | Analyze | Generate | ATS | Cover | Review | **Total** |
|------|-------|---------|----------|-----|-------|--------|-----------|
| **PREMIUM** | $0.30 | $1.20 | $1.50 | $0.60 | $0.60 | $0.60 | **~$4.80** |
| **OPTIMIZED** | $0.02 | $1.20 | $1.50 | $0.12 | $0.12 | $0.12 | **~$3.08** |

**Savings:** ~36% with OPTIMIZED mode

Note: Costs include AWS infrastructure (~$0.50/month) and vary based on resume length and job description complexity.

## Quality Comparison

### PREMIUM Mode
- ✅ Maximum reasoning capability
- ✅ Best for complex technical roles
- ✅ Most nuanced analysis
- ✅ Highest quality outputs across all functions

### OPTIMIZED Mode
- ✅ Excellent quality for core functions (analyze, generate)
- ✅ Good quality for supporting functions
- ✅ Minimal quality difference for most users
- ✅ Significant cost savings
- ⚠️ Slightly less nuanced in ATS optimization and cover letters

## Recommendation

- **Start with OPTIMIZED** - Most users won't notice quality differences
- **Upgrade to PREMIUM** if:
  - Applying to senior/executive positions
  - Need maximum quality for every output
  - Cost is not a concern
  - Resume has complex technical content

## Technical Details

The model configuration is defined in `lib/model-config.ts` and can be customized if needed. Each Lambda function receives its model ID via the `MODEL_ID` environment variable.
