import json
import re

def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks"""
    # Try to find JSON in markdown code blocks
    if '```json' in text:
        match = re.search(r'```json\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    elif '```' in text:
        match = re.search(r'```\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    
    # Try direct JSON parse
    return json.loads(text)
