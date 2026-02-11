#!/bin/bash
set -e

echo "🏗️  Building frontend..."
cd frontend
npm run build

echo "📦 Getting CloudFront distribution info..."
cd ..
HOSTING_BUCKET=$(aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs[?OutputKey=='HostingBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName==\`${HOSTING_BUCKET}.s3.amazonaws.com\`].Id" --output text)
DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks --stack-name ResumeTailorStack --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)

echo "🚀 Uploading to S3: $HOSTING_BUCKET"
aws s3 sync frontend/dist s3://$HOSTING_BUCKET --delete

echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://$DISTRIBUTION_DOMAIN"
