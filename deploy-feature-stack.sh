#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Feature Branch as Separate Stack${NC}"
echo -e "${YELLOW}⚠️  This will create a new stack: ResumeTailorFeatureStack${NC}"
echo -e "${YELLOW}⚠️  Using OPTIMIZED mode for cost savings${NC}"
echo ""

# Deploy with custom stack name and optimized mode
npx cdk deploy ResumeTailorFeatureStack \
  --context stackName=ResumeTailorFeatureStack \
  --context deploymentMode=OPTIMIZED \
  --require-approval never

echo ""
echo -e "${GREEN}✅ Feature stack deployed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run: ./scripts/setup-frontend-config.sh ResumeTailorFeatureStack"
echo "2. Update frontend/.env to point to feature stack"
echo "3. Test the critical feedback refinement feature"
echo ""
echo -e "${YELLOW}Note: This is a separate stack from your production demo${NC}"
