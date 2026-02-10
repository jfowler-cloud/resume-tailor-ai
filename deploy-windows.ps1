# Resume Tailor - Windows Deployment Script
# Run this in PowerShell with execution policy bypassed

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Resume Tailor - Windows Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Add AWS CLI to PATH if needed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
}

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js: $(node --version)" -ForegroundColor Green

# Check AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found" -ForegroundColor Red
    exit 1
}

Write-Host "AWS CLI: $(aws --version)" -ForegroundColor Green

# Check AWS credentials
Write-Host ""
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "✅ AWS credentials configured" -ForegroundColor Green
    Write-Host "Account: $($identity.Account)" -ForegroundColor Gray
    Write-Host "User: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

# Install CDK globally
Write-Host ""
if (Get-Command cdk -ErrorAction SilentlyContinue) {
    Write-Host "✅ AWS CDK already installed" -ForegroundColor Green
} else {
    Write-Host "Installing AWS CDK globally..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Build TypeScript
Write-Host ""
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build

# Create .env if needed
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    $accountId = $identity.Account
    $region = "us-east-1"
    
    @"
AWS_PROFILE=default
AWS_REGION=$region
AWS_ACCOUNT_ID=$accountId
BEDROCK_REGION=$region
USER_EMAIL=your-email@example.com
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ .env created - please update USER_EMAIL" -ForegroundColor Green
}

# Bootstrap CDK
Write-Host ""
$bootstrap = Read-Host "Bootstrap CDK? (y/n)"
if ($bootstrap -eq "y") {
    Write-Host "Bootstrapping CDK..." -ForegroundColor Yellow
    cdk bootstrap
}

# Deploy
Write-Host ""
$deploy = Read-Host "Deploy stack? (y/n)"
if ($deploy -eq "y") {
    Write-Host "Deploying stack..." -ForegroundColor Yellow
    cdk deploy --require-approval never
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Deployment Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Enable Bedrock Claude 4.5 models in AWS Console" -ForegroundColor White
    Write-Host "2. Verify email in SES" -ForegroundColor White
    Write-Host "3. Test the workflow" -ForegroundColor White
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
