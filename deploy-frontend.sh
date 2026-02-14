#!/bin/bash
set -e

# Check if config exists
if [ ! -f "frontend/.deploy-config.json" ]; then
  echo "❌ Deployment config not found. Run: ./scripts/setup-frontend-config.sh"
  exit 1
fi

echo "📝 Loading deployment configuration..."
CONFIG=$(cat frontend/.deploy-config.json)
REGION=$(echo "$CONFIG" | jq -r '.region')
USER_POOL_ID=$(echo "$CONFIG" | jq -r '.userPoolId')
USER_POOL_CLIENT_ID=$(echo "$CONFIG" | jq -r '.userPoolClientId')
IDENTITY_POOL_ID=$(echo "$CONFIG" | jq -r '.identityPoolId')
BUCKET_NAME=$(echo "$CONFIG" | jq -r '.bucketName')
STATE_MACHINE_ARN=$(echo "$CONFIG" | jq -r '.stateMachineArn')

echo "🏗️  Building frontend with production config..."
cd frontend

# Create production config file that will be bundled
cat > src/aws-config.json << EOF
{
  "region": "${REGION}",
  "userPoolId": "${USER_POOL_ID}",
  "userPoolClientId": "${USER_POOL_CLIENT_ID}",
  "identityPoolId": "${IDENTITY_POOL_ID}",
  "bucketName": "${BUCKET_NAME}",
  "stateMachineArn": "${STATE_MACHINE_ARN}"
}
EOF

npm run build

# Clean up the config file
rm src/aws-config.json

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
