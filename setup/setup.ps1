# Resume Tailor Project - AWS Account Setup Script (PowerShell)
# This script automates the initial AWS account configuration for Windows

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Resume Tailor Project - AWS Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Please install: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
$nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($nodeMajor -lt 24) {
    Write-Host "❌ Node.js 24+ required. Current version: $nodeVersion" -ForegroundColor Red
    Write-Host "Please install Node.js 24 from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install: https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Check Python version
$pythonVersion = python --version
if ($pythonVersion -notmatch "Python 3\.1[4-9]") {
    Write-Host "⚠️  Python 3.14+ recommended. Current version: $pythonVersion" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host "✅ All prerequisites installed" -ForegroundColor Green
Write-Host ""

# Get user input
$AWS_ACCOUNT_ID = Read-Host "Enter your AWS Account ID"
$AWS_REGION = Read-Host "Enter your preferred AWS region (default: us-east-1)"
if ([string]::IsNullOrWhiteSpace($AWS_REGION)) {
    $AWS_REGION = "us-east-1"
}
$USER_EMAIL = Read-Host "Enter your email for SES notifications"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Account ID: $AWS_ACCOUNT_ID"
Write-Host "  Region: $AWS_REGION"
Write-Host "  Email: $USER_EMAIL"
Write-Host ""
$CONFIRM = Read-Host "Is this correct? (y/n)"

if ($CONFIRM -ne "y") {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit 0
}

# Create .env file
Write-Host ""
Write-Host "Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# AWS Configuration
AWS_PROFILE=resume-tailor
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# Project Configuration
PROJECT_NAME=resume-tailor
ENVIRONMENT=dev

# Node.js Version
NODE_VERSION=24

# Python Version
PYTHON_VERSION=3.14

# Bedrock Configuration
BEDROCK_REGION=$AWS_REGION

# User Configuration
USER_EMAIL=$USER_EMAIL
"@

Set-Content -Path "..\\.env" -Value $envContent
Write-Host "✅ .env file created" -ForegroundColor Green

# Add to .gitignore
if (-not (Test-Path "..\.gitignore")) {
    New-Item -Path "..\.gitignore" -ItemType File | Out-Null
}

$gitignoreContent = Get-Content "..\.gitignore" -ErrorAction SilentlyContinue
if ($gitignoreContent -notcontains ".env") {
    Add-Content -Path "..\.gitignore" -Value "`n# Environment variables"
    Add-Content -Path "..\.gitignore" -Value ".env"
    Add-Content -Path "..\.gitignore" -Value ".env.*"
    Add-Content -Path "..\.gitignore" -Value "cdk.context.json"
    Add-Content -Path "..\.gitignore" -Value "cdk.out/"
    Write-Host "✅ Added .env to .gitignore" -ForegroundColor Green
}

# Check if AWS profile exists
Write-Host ""
Write-Host "Checking AWS profile..." -ForegroundColor Yellow

$profileExists = $false
try {
    aws configure list --profile resume-tailor 2>$null
    $profileExists = $true
} catch {
    $profileExists = $false
}

if ($profileExists) {
    Write-Host "⚠️  Profile 'resume-tailor' already exists" -ForegroundColor Yellow
    $RECONFIG = Read-Host "Do you want to reconfigure it? (y/n)"
    if ($RECONFIG -eq "y") {
        Write-Host "Please run: aws configure sso --profile resume-tailor" -ForegroundColor Cyan
        Write-Host "Or: aws configure --profile resume-tailor (for access keys)" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️  Profile 'resume-tailor' not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommended: Use AWS SSO" -ForegroundColor Cyan
    Write-Host "  aws configure sso" -ForegroundColor White
    Write-Host "  Session name: resume-tailor" -ForegroundColor Gray
    Write-Host "  Region: $AWS_REGION" -ForegroundColor Gray
    Write-Host "  Profile name: resume-tailor" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternative: Use access keys" -ForegroundColor Cyan
    Write-Host "  aws configure --profile resume-tailor" -ForegroundColor White
    Write-Host ""
}

# Install CDK globally
Write-Host ""
Write-Host "Installing AWS CDK..." -ForegroundColor Yellow

if (Get-Command cdk -ErrorAction SilentlyContinue) {
    $cdkVersion = cdk --version
    Write-Host "✅ AWS CDK already installed ($cdkVersion)" -ForegroundColor Green
} else {
    npm install -g aws-cdk
    Write-Host "✅ AWS CDK installed" -ForegroundColor Green
}

# Bootstrap CDK
Write-Host ""
$BOOTSTRAP = Read-Host "Do you want to bootstrap CDK in your account? (y/n)"
if ($BOOTSTRAP -eq "y") {
    Write-Host "Bootstrapping CDK..." -ForegroundColor Yellow
    try {
        cdk bootstrap "aws://$AWS_ACCOUNT_ID/$AWS_REGION" --profile resume-tailor
        Write-Host "✅ CDK bootstrapped" -ForegroundColor Green
    } catch {
        Write-Host "❌ CDK bootstrap failed. Make sure you're logged in:" -ForegroundColor Red
        Write-Host "  aws sso login --profile resume-tailor" -ForegroundColor Yellow
    }
}

# Create IAM role
Write-Host ""
$CREATE_ROLE = Read-Host "Do you want to create the ResumeTailorAppRole? (y/n)"
if ($CREATE_ROLE -eq "y") {
    Write-Host "Creating IAM role..." -ForegroundColor Yellow
    
    # Create trust policy
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::$AWS_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    
    $trustPolicyPath = "$env:TEMP\trust-policy.json"
    Set-Content -Path $trustPolicyPath -Value $trustPolicy
    
    try {
        aws iam create-role `
            --role-name ResumeTailorAppRole `
            --assume-role-policy-document "file://$trustPolicyPath" `
            --description "Central role for Resume Tailor application" `
            --profile resume-tailor
        
        Write-Host "✅ IAM role created" -ForegroundColor Green
        
        # Get role ARN
        $roleArn = aws iam get-role `
            --role-name ResumeTailorAppRole `
            --profile resume-tailor `
            --query 'Role.Arn' `
            --output text
        
        Write-Host "Role ARN: $roleArn" -ForegroundColor Cyan
        
        # Add to .env
        Add-Content -Path "..\.env" -Value "`n# Application Role (for frontend to assume)"
        Add-Content -Path "..\.env" -Value "AWS_ROLE_ARN=$roleArn"
        
        # Attach permissions
        Write-Host "Attaching permissions policy..." -ForegroundColor Yellow
        
        $policyArn = aws iam create-policy `
            --policy-name ResumeTailorAppPolicy `
            --policy-document file://iam-policy.json `
            --description "Permissions for Resume Tailor application" `
            --profile resume-tailor `
            --query 'Policy.Arn' `
            --output text 2>$null
        
        if ([string]::IsNullOrWhiteSpace($policyArn)) {
            # Policy might already exist
            $policyArn = aws iam list-policies `
                --profile resume-tailor `
                --query 'Policies[?PolicyName==`ResumeTailorAppPolicy`].Arn' `
                --output text
        }
        
        aws iam attach-role-policy `
            --role-name ResumeTailorAppRole `
            --policy-arn $policyArn `
            --profile resume-tailor
        
        Write-Host "✅ Permissions attached" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️  Role might already exist or you need to login first" -ForegroundColor Yellow
        Write-Host "Run: aws sso login --profile resume-tailor" -ForegroundColor Cyan
    }
}

# Verify Bedrock access
Write-Host ""
Write-Host "Checking Bedrock access..." -ForegroundColor Yellow

try {
    $models = aws bedrock list-foundation-models --region $AWS_REGION --profile resume-tailor 2>$null
    if ($models) {
        Write-Host "✅ Bedrock access confirmed" -ForegroundColor Green
        
        # Check for Claude models
        $claudeModels = aws bedrock list-foundation-models `
            --region $AWS_REGION `
            --profile resume-tailor `
            --query 'modelSummaries[?contains(modelId, `claude`)].modelId' `
            --output text
        
        if ($claudeModels) {
            Write-Host "✅ Claude models available:" -ForegroundColor Green
            Write-Host $claudeModels -ForegroundColor Gray
        } else {
            Write-Host "⚠️  No Claude models found. You may need to request access:" -ForegroundColor Yellow
            Write-Host "   1. Go to AWS Console → Bedrock → Model access" -ForegroundColor White
            Write-Host "   2. Request access to Claude 4.5 Sonnet, Opus, and Haiku" -ForegroundColor White
        }
    }
} catch {
    Write-Host "⚠️  Unable to access Bedrock. You may need to:" -ForegroundColor Yellow
    Write-Host "   1. Enable Bedrock in AWS Console" -ForegroundColor White
    Write-Host "   2. Request model access" -ForegroundColor White
    Write-Host "   3. Login: aws sso login --profile resume-tailor" -ForegroundColor White
}

# Verify SES email
Write-Host ""
$VERIFY_EMAIL = Read-Host "Do you want to verify your email for SES? (y/n)"
if ($VERIFY_EMAIL -eq "y") {
    Write-Host "Sending verification email to $USER_EMAIL..." -ForegroundColor Yellow
    try {
        aws ses verify-email-identity `
            --email-address $USER_EMAIL `
            --region $AWS_REGION `
            --profile resume-tailor
        Write-Host "✅ Verification email sent. Please check your inbox and click the link." -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to send verification email. Make sure you're logged in." -ForegroundColor Yellow
    }
}

# Create S3 bucket
Write-Host ""
$BUCKET_NAME = "resume-tailor-$AWS_ACCOUNT_ID"
$CREATE_BUCKET = Read-Host "Do you want to create S3 bucket '$BUCKET_NAME'? (y/n)"
if ($CREATE_BUCKET -eq "y") {
    try {
        aws s3 ls "s3://$BUCKET_NAME" --profile resume-tailor 2>$null
        Write-Host "⚠️  Bucket already exists" -ForegroundColor Yellow
    } catch {
        Write-Host "Creating S3 bucket..." -ForegroundColor Yellow
        
        aws s3 mb "s3://$BUCKET_NAME" --region $AWS_REGION --profile resume-tailor
        
        # Enable versioning
        aws s3api put-bucket-versioning `
            --bucket $BUCKET_NAME `
            --versioning-configuration Status=Enabled `
            --profile resume-tailor
        
        # Block public access
        aws s3api put-public-access-block `
            --bucket $BUCKET_NAME `
            --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" `
            --profile resume-tailor
        
        Write-Host "✅ S3 bucket created and secured" -ForegroundColor Green
    }
}

# Install project dependencies
Write-Host ""
$INSTALL_DEPS = Read-Host "Do you want to install project dependencies? (y/n)"
if ($INSTALL_DEPS -eq "y") {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    Set-Location ..
    npm install
    Write-Host "✅ Node.js dependencies installed" -ForegroundColor Green
    
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    if (Test-Path "lambda") {
        Set-Location lambda
        pip install -r requirements.txt -t .
        Set-Location ..
        Write-Host "✅ Python dependencies installed" -ForegroundColor Green
    }
    Set-Location setup
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Login to AWS: aws sso login --profile resume-tailor" -ForegroundColor White
Write-Host "  2. Verify your email in SES (check inbox)" -ForegroundColor White
Write-Host "  3. Request Bedrock model access if needed" -ForegroundColor White
Write-Host "  4. Run: cdk synth --profile resume-tailor" -ForegroundColor White
Write-Host "  5. Run: cdk deploy --profile resume-tailor" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: setup/AWS_ACCOUNT_SETUP.md" -ForegroundColor Cyan
Write-Host ""
