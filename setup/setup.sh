#!/bin/bash

# Resume Tailor Project - AWS Account Setup Script
# This script automates the initial AWS account configuration

set -e  # Exit on error

echo "=========================================="
echo "Resume Tailor Project - AWS Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install: https://aws.amazon.com/cli/${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install: https://nodejs.org/${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install: https://www.python.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# Get user input
read -p "Enter your AWS Account ID: " AWS_ACCOUNT_ID
read -p "Enter your preferred AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "Enter your email for SES notifications: " USER_EMAIL

echo ""
echo "Configuration:"
echo "  Account ID: $AWS_ACCOUNT_ID"
echo "  Region: $AWS_REGION"
echo "  Email: $USER_EMAIL"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Create .env file
echo ""
echo "Creating .env file..."
cat > ../.env << EOF
# AWS Configuration
AWS_PROFILE=resume-tailor
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# Project Configuration
PROJECT_NAME=resume-tailor
ENVIRONMENT=dev

# Bedrock Configuration
BEDROCK_REGION=$AWS_REGION

# User Configuration
USER_EMAIL=$USER_EMAIL
EOF

echo -e "${GREEN}✅ .env file created${NC}"

# Add to .gitignore
if ! grep -q ".env" ../.gitignore 2>/dev/null; then
    echo "" >> ../.gitignore
    echo "# Environment variables" >> ../.gitignore
    echo ".env" >> ../.gitignore
    echo ".env.*" >> ../.gitignore
    echo "cdk.context.json" >> ../.gitignore
    echo "cdk.out/" >> ../.gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi

# Check if AWS profile exists
echo ""
echo "Checking AWS profile..."
if aws configure list --profile resume-tailor &> /dev/null; then
    echo -e "${YELLOW}⚠️  Profile 'resume-tailor' already exists${NC}"
    read -p "Do you want to reconfigure it? (y/n): " RECONFIG
    if [ "$RECONFIG" = "y" ]; then
        echo "Please run: aws configure --profile resume-tailor"
    fi
else
    echo -e "${YELLOW}⚠️  Profile 'resume-tailor' not found${NC}"
    echo "Please run: aws configure --profile resume-tailor"
    echo ""
    echo "You'll need:"
    echo "  1. AWS Access Key ID (from IAM user)"
    echo "  2. AWS Secret Access Key (from IAM user)"
    echo "  3. Default region: $AWS_REGION"
    echo "  4. Default output format: json"
fi

# Install CDK globally
echo ""
echo "Installing AWS CDK..."
if command -v cdk &> /dev/null; then
    echo -e "${GREEN}✅ AWS CDK already installed ($(cdk --version))${NC}"
else
    npm install -g aws-cdk
    echo -e "${GREEN}✅ AWS CDK installed${NC}"
fi

# Bootstrap CDK
echo ""
read -p "Do you want to bootstrap CDK in your account? (y/n): " BOOTSTRAP
if [ "$BOOTSTRAP" = "y" ]; then
    echo "Bootstrapping CDK..."
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --profile resume-tailor
    echo -e "${GREEN}✅ CDK bootstrapped${NC}"
fi

# Verify Bedrock access
echo ""
echo "Checking Bedrock access..."
if aws bedrock list-foundation-models --region $AWS_REGION --profile resume-tailor &> /dev/null; then
    echo -e "${GREEN}✅ Bedrock access confirmed${NC}"
    
    # Check for Claude models
    CLAUDE_MODELS=$(aws bedrock list-foundation-models \
        --region $AWS_REGION \
        --profile resume-tailor \
        --query 'modelSummaries[?contains(modelId, `claude`)].modelId' \
        --output text)
    
    if [ -n "$CLAUDE_MODELS" ]; then
        echo -e "${GREEN}✅ Claude models available:${NC}"
        echo "$CLAUDE_MODELS"
    else
        echo -e "${YELLOW}⚠️  No Claude models found. You may need to request access:${NC}"
        echo "   1. Go to AWS Console → Bedrock → Model access"
        echo "   2. Request access to Claude 4.5 Sonnet, Opus, and Haiku"
    fi
else
    echo -e "${YELLOW}⚠️  Unable to access Bedrock. You may need to:${NC}"
    echo "   1. Enable Bedrock in AWS Console"
    echo "   2. Request model access"
fi

# Verify SES email
echo ""
read -p "Do you want to verify your email for SES? (y/n): " VERIFY_EMAIL
if [ "$VERIFY_EMAIL" = "y" ]; then
    echo "Sending verification email to $USER_EMAIL..."
    aws ses verify-email-identity \
        --email-address $USER_EMAIL \
        --region $AWS_REGION \
        --profile resume-tailor
    echo -e "${GREEN}✅ Verification email sent. Please check your inbox and click the link.${NC}"
fi

# Create S3 bucket
echo ""
BUCKET_NAME="resume-tailor-$AWS_ACCOUNT_ID"
read -p "Do you want to create S3 bucket '$BUCKET_NAME'? (y/n): " CREATE_BUCKET
if [ "$CREATE_BUCKET" = "y" ]; then
    if aws s3 ls s3://$BUCKET_NAME --profile resume-tailor 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Bucket already exists${NC}"
    else
        echo "Creating S3 bucket..."
        aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION --profile resume-tailor
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket $BUCKET_NAME \
            --versioning-configuration Status=Enabled \
            --profile resume-tailor
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket $BUCKET_NAME \
            --public-access-block-configuration \
                "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
            --profile resume-tailor
        
        echo -e "${GREEN}✅ S3 bucket created and secured${NC}"
    fi
fi

# Install project dependencies
echo ""
read -p "Do you want to install project dependencies? (y/n): " INSTALL_DEPS
if [ "$INSTALL_DEPS" = "y" ]; then
    echo "Installing Node.js dependencies..."
    cd ..
    npm install
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
    
    echo "Installing Python dependencies..."
    if [ -d "lambda" ]; then
        cd lambda
        pip3 install -r requirements.txt -t .
        cd ..
        echo -e "${GREEN}✅ Python dependencies installed${NC}"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify your email in SES (check inbox)"
echo "  2. Request Bedrock model access if needed"
echo "  3. Run: cdk synth --profile resume-tailor"
echo "  4. Run: cdk deploy --profile resume-tailor"
echo ""
echo "For detailed instructions, see: setup/AWS_ACCOUNT_SETUP.md"
echo ""
