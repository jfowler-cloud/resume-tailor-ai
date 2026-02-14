# Configuration Management

This project uses automated configuration management to keep sensitive values out of the repository while making setup easy.

## How It Works

1. **Deploy Backend** - CDK outputs are stored in CloudFormation
2. **Run Setup Script** - Fetches outputs and generates config files
3. **Config Files Ignored** - `.env` and `.deploy-config.json` are gitignored
4. **Repository Stays Clean** - No sensitive values committed

## Setup Commands

### Initial Setup (After CDK Deploy)

```bash
# Fetch CDK outputs and generate config files
./scripts/setup-frontend-config.sh

# This creates:
# - frontend/.env (for local development)
# - frontend/.deploy-config.json (for CloudFront deployment)
```

### Local Development

```bash
cd frontend
npm run dev
# Uses frontend/.env automatically
```

### CloudFront Deployment

```bash
./deploy-frontend.sh
# Uses frontend/.deploy-config.json automatically
```

## Files

| File | Purpose | Committed? |
|------|---------|-----------|
| `frontend/.env.example` | Template with placeholders | ✅ Yes |
| `frontend/.env` | Real values for local dev | ❌ No (gitignored) |
| `frontend/.deploy-config.json` | Real values for deployment | ❌ No (gitignored) |
| `scripts/setup-frontend-config.sh` | Fetches values from AWS | ✅ Yes |

## For New Developers

1. Clone the repository
2. Deploy the CDK stack: `npx cdk deploy`
3. Run setup script: `./scripts/setup-frontend-config.sh`
4. Start developing: `cd frontend && npm run dev`

The setup script will automatically fetch all required values from your deployed AWS resources.

## Updating Configuration

If you redeploy the stack or change regions:

```bash
# Re-run the setup script
./scripts/setup-frontend-config.sh

# Optionally specify stack name and region
./scripts/setup-frontend-config.sh MyStackName
AWS_REGION=us-west-2 ./scripts/setup-frontend-config.sh
```

## Security Notes

- Never commit `.env` or `.deploy-config.json` files
- The `.env.example` file contains only placeholders
- All real values are fetched from CloudFormation at setup time
- Config files are automatically added to `.gitignore`
