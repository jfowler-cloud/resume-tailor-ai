#!/bin/bash

# Pre-commit hook to check for sensitive data
# This file should be copied to .git/hooks/pre-commit

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking for sensitive data..."

# Get list of files to be committed
FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Patterns to check for
PATTERNS=(
  '[0-9]{12}'  # 12-digit numbers (AWS account IDs, timestamps)
  'arn:aws:[^:]*:[^:]*:[0-9]{12}:'  # ARNs with account IDs
  'resume-tailor-[a-z0-9]{12}'  # Bucket names with account suffix
  'us-east-1_[A-Za-z0-9]{9}'  # Cognito User Pool IDs
  'us-east-1:[a-f0-9-]{36}'  # Cognito Identity Pool IDs
)

FOUND_ISSUES=0

for FILE in $FILES; do
  # Skip binary files and certain directories
  if [[ "$FILE" == *.png ]] || [[ "$FILE" == *.jpg ]] || [[ "$FILE" == *.pdf ]] || \
     [[ "$FILE" == *node_modules* ]] || [[ "$FILE" == *.git/* ]] || \
     [[ "$FILE" == *dist/* ]] || [[ "$FILE" == *build/* ]]; then
    continue
  fi
  
  # Check each pattern
  for PATTERN in "${PATTERNS[@]}"; do
    MATCHES=$(git diff --cached "$FILE" | grep -E "^\+" | grep -vE "^\+\+\+" | grep -E "$PATTERN" | \
      grep -v "123456789012" | \
      grep -v "us-east-1_XXXXXXXXX" | \
      grep -v "XXXXXXXXXXXX" || true)
    
    if [ -n "$MATCHES" ]; then
      if [ $FOUND_ISSUES -eq 0 ]; then
        echo -e "${RED}❌ Sensitive data detected!${NC}"
        echo ""
      fi
      
      echo -e "${YELLOW}File: $FILE${NC}"
      echo "$MATCHES"
      echo ""
      FOUND_ISSUES=1
    fi
  done
done

if [ $FOUND_ISSUES -eq 1 ]; then
  echo -e "${RED}Commit blocked: Please sanitize sensitive data before committing.${NC}"
  echo ""
  echo "Common patterns to replace:"
  echo "  • AWS Account IDs (12 digits) → XXXXXXXXXXXX"
  echo "  • Bucket names → resume-tailor-XXXXXXXXXXXX"
  echo "  • User Pool IDs → us-east-1_XXXXXXXXX"
  echo "  • Identity Pool IDs → us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  echo "  • Job ID timestamps → job-XXXXXXXXXXXXX"
  echo ""
  exit 1
fi

echo "✅ No sensitive data detected"
exit 0
