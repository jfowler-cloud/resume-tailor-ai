#!/bin/bash
# Quick deployment script for Resume Tailor
# Run this in WSL: bash deploy.sh

set -e

echo "=========================================="
echo "Resume Tailor - Quick Deploy"
echo "=========================================="
echo ""

# Check if we're in WSL
if grep -qi microsoft /proc/version; then
    echo "✅ Running in WSL"
else
    echo "⚠️  Not in WSL, but continuing..."
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install

echo ""
echo "Installing AWS CDK globally..."
if ! command -v cdk &> /dev/null; then
    npm install -g aws-cdk
else
    echo "✅ CDK already installed: $(cdk --version)"
fi

# Check AWS credentials
echo ""
echo "Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS credentials configured"
    aws sts get-caller-identity
else
    echo "❌ AWS credentials not configured"
    echo "Run: aws configure sso"
    echo "Or: aws configure"
    exit 1
fi

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

echo ""
echo "Account ID: $ACCOUNT_ID"
echo "Region: $REGION"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << EOF
AWS_PROFILE=default
AWS_REGION=$REGION
AWS_ACCOUNT_ID=$ACCOUNT_ID
BEDROCK_REGION=$REGION
USER_EMAIL=your-email@example.com
EOF
    echo "✅ .env created - please update USER_EMAIL"
fi

# Bootstrap CDK
echo ""
read -p "Bootstrap CDK? (y/n): " BOOTSTRAP
if [ "$BOOTSTRAP" = "y" ]; then
    echo "Bootstrapping CDK..."
    cdk bootstrap
fi

# Deploy
echo ""
read -p "Deploy stack? (y/n): " DEPLOY
if [ "$DEPLOY" = "y" ]; then
    echo "Deploying stack..."
    cdk deploy --require-approval never
    
    echo ""
    echo "=========================================="
    echo "Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Enable Bedrock models in AWS Console"
    echo "2. Verify email in SES"
    echo "3. Test the workflow"
fi

echo ""
echo "Done!"
