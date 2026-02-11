# CloudFront Deployment Guide

## Steps to Deploy

### 1. Authenticate with AWS
```bash
aws sso login --profile <your-profile>
# OR
aws configure  # if using access keys
```

### 2. Deploy CDK Stack
```bash
cd /mnt/c/Users/airma/OneDrive/Desktop/resume-tailor-project
npx cdk deploy
```

This will create:
- S3 bucket for hosting (`resume-tailor-hosting-<account-id>`)
- CloudFront distribution with HTTPS
- Updated CORS on resume bucket to allow CloudFront domain

### 3. Build and Deploy Frontend
```bash
./deploy-frontend.sh
```

This script will:
- Build the React app
- Upload to S3 hosting bucket
- Invalidate CloudFront cache
- Display your CloudFront URL

### 4. Update Frontend .env
After deployment, add the CloudFront URL to your frontend/.env:
```bash
# Get the CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)

# Add to frontend/.env
echo "VITE_APP_URL=https://$CLOUDFRONT_DOMAIN" >> frontend/.env
```

### 5. Test Locally
Your local dev server should still work:
```bash
cd frontend
npm run dev
```

### 6. Access Production
Open the CloudFront URL from the deployment output:
```
https://<distribution-id>.cloudfront.net
```

## Cost Estimate
- ~$0.50-1/month for demo usage
- First 1TB of data transfer is $0.085/GB
- First 10M requests are $0.0075 per 10K requests

## Troubleshooting

**CORS errors:** Wait 5-10 minutes for CloudFront distribution to fully deploy

**404 errors:** Run `./deploy-frontend.sh` again to ensure files are uploaded

**Authentication issues:** Make sure Cognito allows the CloudFront domain in CORS
