import json
import logging
import re

logger = logging.getLogger()

def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks and control characters.

    Tries multiple extraction strategies in order:
    1. JSON inside ```json code blocks
    2. JSON inside ``` code blocks
    3. First valid { ... } or [ ... ] substring with proper brace matching
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
                # Continue to next strategy

    # Strategy 2: JSON in ``` code blocks
    if '```' in text:
        match = re.search(r'```\s*\n(.*?)\n```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning("Found ``` block but content was not valid JSON")
                # Continue to next strategy

    # Strategy 3: Find first valid { ... } or [ ... ] in the text with proper brace matching
    # Check which comes first: { or [
    first_brace = text.find('{')
    first_bracket = text.find('[')
    
    # Determine order to try based on which appears first
    if first_bracket != -1 and (first_brace == -1 or first_bracket < first_brace):
        char_pairs = [('[', ']'), ('{', '}')]
    else:
        char_pairs = [('{', '}'), ('[', ']')]
    
    for start_char, end_char in char_pairs:
        search_from = 0
        while True:
            start_idx = text.find(start_char, search_from)
            if start_idx == -1:
                break
            
            # Find matching closing brace/bracket using depth tracking
            depth = 0
            for i in range(start_idx, len(text)):
                if text[i] == start_char:
                    depth += 1
                elif text[i] == end_char:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[start_idx:i + 1])
                        except json.JSONDecodeError:
                            # This JSON object didn't work, try next occurrence
                            search_from = start_idx + 1
                            break
            else:
                # No matching closing bracket found
                break

    # Strategy 4: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not extract valid JSON from AI response: {e}")
