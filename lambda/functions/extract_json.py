import json
import re

def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks and control characters"""
    # Remove control characters except newline (\n), carriage return (\r), and tab (\t)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    
    # Try to find JSON in markdown code blocks
    if '```json' in text:
        match = re.search(r'```json\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            json_text = match.group(1)
            return json.loads(json_text)
    elif '```' in text:
        match = re.search(r'```\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            json_text = match.group(1)
            return json.loads(json_text)
    
    # Try direct JSON parse
    return json.loads(text)
