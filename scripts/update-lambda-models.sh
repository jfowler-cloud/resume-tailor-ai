#!/bin/bash

# Update all Lambda functions to use MODEL_ID environment variable

LAMBDA_DIR="lambda/functions"

FILES=(
  "parse_job.py"
  "analyze_resume.py"
  "generate_resume.py"
  "ats_optimize.py"
  "cover_letter.py"
  "critical_review.py"
)

for FILE in "${FILES[@]}"; do
  FILE_PATH="$LAMBDA_DIR/$FILE"
  
  if [ -f "$FILE_PATH" ]; then
    echo "Updating $FILE..."
    
    # Add import for os if not present
    if ! grep -q "^import os" "$FILE_PATH"; then
      sed -i '1i import os' "$FILE_PATH"
    fi
    
    # Replace hardcoded modelId with environment variable
    sed -i "s/modelId='us\.anthropic\.claude-opus-4-5-20251101-v1:0'/modelId=os.environ.get('MODEL_ID', 'us.anthropic.claude-opus-4-5-20251101-v1:0')/g" "$FILE_PATH"
    
    echo "✅ Updated $FILE"
  else
    echo "❌ File not found: $FILE_PATH"
  fi
done

echo ""
echo "✅ All Lambda functions updated to use MODEL_ID environment variable"
