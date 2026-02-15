# Critical Feedback Refinement Feature

## Overview

This feature branch implements a comprehensive critical feedback and resume refinement system that allows users to:

1. View detailed critical feedback on their tailored resume
2. Trigger an AI-powered refinement based on that feedback
3. Compare original and refined resumes side-by-side
4. Download both versions
5. Save refined resumes to their library

## Architecture

### Backend Components

#### 1. Lambda Function: `refine_resume.py`
- **Purpose**: Regenerates resume incorporating critical feedback
- **Model**: Claude Opus 4.5 (streaming)
- **Input**:
  - Original tailored resume
  - Critical review feedback
  - Job description
  - Parsed job requirements
- **Output**: Refined resume in Markdown format
- **Key Features**:
  - Addresses specific weaknesses
  - Implements actionable steps
  - Fixes red flags
  - Maintains candidate's authentic voice
  - Streaming response for better UX

#### 2. CDK Stack Updates
- Added `RefineResumeFunction` Lambda
- Granted authenticated users permission to invoke function
- Added CloudFormation output for function name
- Memory: 2048 MB (for streaming large responses)
- Timeout: 13 minutes

### Frontend Components

#### 1. New Component: `CriticalFeedback.tsx`
- **Purpose**: Display critical feedback and manage refinement workflow
- **Features**:
  - Prominent display of critical review data:
    - Overall rating (1-10) with color coding
    - Summary
    - Strengths (green checkmarks)
    - Weaknesses (red X marks)
    - Red flags (warning symbols)
    - Actionable steps (numbered list)
    - Standout elements (star symbols)
    - Competitive analysis
  - "Refine Resume" button to trigger refinement
  - Side-by-side comparison modal with tabs:
    - Side by Side view (2 columns)
    - Original only
    - Refined only
  - Download buttons for both versions
  - Automatic save to S3

#### 2. Updated Component: `Results.tsx`
- Added state for:
  - `criticalReview`: Critical feedback data
  - `jobDescription`: Original job posting
  - `parsedJob`: Parsed requirements
- Fetches critical review from DynamoDB
- Renders `CriticalFeedback` component when data available
- Passes all necessary props for refinement

#### 3. Configuration Updates
- Added `refineResumeFunctionName` to `awsConfig`
- Updated `setup-frontend-config.sh` to extract function name from stack
- Added `VITE_REFINE_RESUME_FUNCTION` environment variable

## User Flow

1. **Initial Analysis**
   - User uploads resume and job description
   - System generates tailored resume
   - Critical review is performed automatically
   - Results displayed including critical feedback section

2. **View Critical Feedback**
   - Prominent container shows:
     - Overall rating badge (color-coded)
     - Summary of assessment
     - Detailed breakdown of strengths/weaknesses
     - Red flags to address
     - Actionable improvement steps
     - Competitive positioning

3. **Trigger Refinement**
   - User clicks "Refine Resume" button
   - Loading state shows progress
   - Lambda invoked with:
     - Original resume
     - Critical feedback
     - Job requirements
   - Refined resume generated via streaming

4. **Compare Results**
   - Modal opens automatically when refinement complete
   - Three viewing modes:
     - Side-by-side comparison
     - Original only
     - Refined only
   - Both versions downloadable
   - Refined version saved to S3 library

5. **Save and Reuse**
   - Refined resume saved as: `users/{userId}/resumes/refined-{jobId}.md`
   - Available in Resume Library
   - Can be used for future applications

## Technical Details

### Data Flow

```
User clicks "Refine Resume"
  ↓
Frontend invokes Lambda directly (not Step Functions)
  ↓
Lambda receives:
  - originalResume
  - criticalReview (weaknesses, actionableSteps, redFlags)
  - jobDescription
  - parsedJob
  ↓
Claude Opus 4.5 generates refined resume
  ↓
Streaming response collected
  ↓
Returned to frontend
  ↓
Saved to S3: users/{userId}/resumes/refined-{jobId}.md
  ↓
Displayed in comparison modal
```

### API Integration

**Lambda Invocation:**
```typescript
const lambdaClient = new LambdaClient({
  region: awsConfig.region,
  credentials: credentials
})

const response = await lambdaClient.send(
  new InvokeCommand({
    FunctionName: awsConfig.refineResumeFunctionName,
    Payload: JSON.stringify({
      originalResume,
      criticalReview,
      jobDescription,
      parsedJob
    })
  })
)
```

**S3 Save:**
```typescript
const s3Client = new S3Client({ region, credentials })
await s3Client.send(
  new PutObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: `users/${userId}/resumes/refined-${jobId}.md`,
    Body: refinedResumeMarkdown,
    ContentType: 'text/markdown'
  })
)
```

### UI Components

**Critical Feedback Display:**
- Container with header and "Refine Resume" action button
- Color-coded rating badge (green ≥8, blue ≥6, grey ≥4, red <4)
- Organized sections with appropriate icons
- Expandable/collapsible sections for long content

**Comparison Modal:**
- Full-screen modal (`size="max"`)
- Tabs for different viewing modes
- Download buttons in footer
- Markdown rendering with proper formatting
- Responsive layout

## Deployment

### Prerequisites
- Existing ResumeTailor stack deployed
- Claude Opus 4.5 access in Bedrock

### Deploy Steps

```bash
# 1. Ensure you're on the feature branch
git checkout feature/critical-feedback-refinement

# 2. Deploy backend
npx cdk deploy

# 3. Update frontend config
./scripts/setup-frontend-config.sh

# 4. Install frontend dependencies (if needed)
cd frontend
npm install

# 5. Run locally
npm run dev

# 6. Or deploy to CloudFront
cd ..
./deploy-frontend.sh
```

### Environment Variables

The setup script will add:
```
VITE_REFINE_RESUME_FUNCTION=ResumeTailor-RefineResume
```

## Testing

### Manual Testing Checklist

- [ ] Critical feedback displays correctly
- [ ] Rating badge shows correct color
- [ ] All feedback sections render properly
- [ ] "Refine Resume" button triggers refinement
- [ ] Loading state shows during refinement
- [ ] Refined resume appears in modal
- [ ] Side-by-side comparison works
- [ ] Tab switching works
- [ ] Download original works
- [ ] Download refined works
- [ ] Refined resume saved to S3
- [ ] Error handling works (network failures, Lambda errors)

### Test Scenarios

1. **Happy Path**
   - Upload resume
   - Analyze job
   - View critical feedback
   - Refine resume
   - Compare versions
   - Download both

2. **Error Handling**
   - Lambda invocation failure
   - S3 save failure
   - Network timeout
   - Invalid response format

3. **Edge Cases**
   - Very long resumes
   - Missing critical review data
   - Incomplete feedback
   - Multiple refinement attempts

## Cost Impact

### Additional Costs
- **Lambda Invocations**: ~$0.0000002 per refinement
- **Claude Opus 4.5**: ~$0.03 per refinement (streaming)
- **S3 Storage**: ~$0.023 per GB/month for refined resumes
- **Data Transfer**: Minimal

### Estimated Monthly Cost
- 20 refinements/month: ~$0.60
- Storage (100 refined resumes @ 10KB each): ~$0.001
- **Total Additional**: ~$0.60/month

## Future Enhancements

1. **Iterative Refinement**
   - Allow multiple refinement passes
   - Track refinement history
   - Show improvement metrics

2. **Diff View**
   - Highlight specific changes between versions
   - Show before/after for each section
   - Color-coded additions/deletions

3. **Refinement Templates**
   - Save refinement preferences
   - Apply consistent style across refinements
   - Industry-specific refinement strategies

4. **A/B Testing**
   - Track which version performs better
   - Collect feedback on refinements
   - Improve refinement prompts based on data

5. **Batch Refinement**
   - Refine multiple resumes at once
   - Apply feedback to similar resumes
   - Bulk operations in library

## Known Limitations

1. **Single Refinement**: Currently only supports one refinement per analysis
2. **No Diff Highlighting**: Changes not highlighted in comparison view
3. **No Undo**: Cannot revert refinement (but original is preserved)
4. **Manual Trigger**: Refinement must be manually initiated
5. **No Metrics**: No tracking of refinement effectiveness

## Security Considerations

- Lambda invocation requires authenticated Cognito credentials
- S3 saves use user-specific paths (`users/{userId}/`)
- No public access to refined resumes
- Function name exposed in frontend config (not sensitive)
- All data encrypted at rest (S3) and in transit (HTTPS)

## Monitoring

### CloudWatch Metrics
- `RefineResumeFunction` invocations
- Duration and memory usage
- Error rates
- Throttling

### Logs
- Lambda execution logs
- Frontend console errors
- S3 access logs

## Documentation Updates Needed

- [ ] Update README.md with refinement feature
- [ ] Add screenshots of critical feedback UI
- [ ] Add screenshots of comparison modal
- [ ] Update QUICKSTART.md
- [ ] Update cost breakdown in README
- [ ] Add to feature list

## Branch Information

- **Branch**: `feature/critical-feedback-refinement`
- **Base**: `main`
- **Status**: Ready for testing
- **Merge Strategy**: Squash and merge after testing

## Files Changed

### Backend
- `lambda/functions/refine_resume.py` (new)
- `lib/resume-tailor-stack.ts` (modified)
- `scripts/setup-frontend-config.sh` (modified)

### Frontend
- `frontend/src/components/CriticalFeedback.tsx` (new)
- `frontend/src/components/Results.tsx` (modified)
- `frontend/src/config/amplify.ts` (modified)

### Total Changes
- 3 new files
- 3 modified files
- ~500 lines of code added
