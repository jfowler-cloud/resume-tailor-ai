import json
import logging
import re

logger = logging.getLogger()

def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks and control characters.

    Tries multiple extraction strategies in order:
    1. JSON inside ```json code blocks
    2. JSON inside ``` code blocks
    3. First { ... } or [ ... ] substring
    4. Direct parse of full text

    Raises ValueError if no valid JSON can be extracted.
    """
    # Remove control characters except newline (\n), carriage return (\r), and tab (\t)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)

    # Strategy 1: JSON in ```json code blocks
    if '```json' in text:
        match = re.search(r'```json\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning("Found ```json block but content was not valid JSON")

    # Strategy 2: JSON in ``` code blocks
    if '```' in text:
        match = re.search(r'```\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning("Found ``` block but content was not valid JSON")

    # Strategy 3: Find first { ... } or [ ... ] in the text
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start_idx = text.find(start_char)
        if start_idx != -1:
            end_idx = text.rfind(end_char)
            if end_idx > start_idx:
                try:
                    return json.loads(text[start_idx:end_idx + 1])
                except json.JSONDecodeError:
                    continue

    # Strategy 4: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not extract valid JSON from AI response: {e}")
