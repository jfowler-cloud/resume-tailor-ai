"""
Unit tests for extract_json module
"""
import pytest
from extract_json import extract_json_from_text


class TestExtractJsonFromText:
    """Tests for extract_json_from_text function"""

    # Strategy 1: JSON in ```json code blocks
    def test_json_in_json_code_block(self):
        """Test extraction from ```json code block"""
        text = '''Here is the result:
```json
{"name": "John", "age": 30}
```
'''
        result = extract_json_from_text(text)
        assert result == {"name": "John", "age": 30}

    def test_json_in_json_code_block_with_array(self):
        """Test extraction of array from ```json code block"""
        text = '''Results:
```json
["item1", "item2", "item3"]
```
'''
        result = extract_json_from_text(text)
        assert result == ["item1", "item2", "item3"]

    def test_json_in_json_code_block_complex(self):
        """Test extraction of complex nested JSON from ```json code block"""
        text = '''Analysis:
```json
{
  "skills": ["Python", "AWS"],
  "experience": {"years": 5, "level": "senior"},
  "scores": [85, 90, 95]
}
```
Done.
'''
        result = extract_json_from_text(text)
        assert result["skills"] == ["Python", "AWS"]
        assert result["experience"]["years"] == 5
        assert result["scores"] == [85, 90, 95]

    # Strategy 2: JSON in ``` code blocks (no language specified)
    def test_json_in_generic_code_block(self):
        """Test extraction from ``` code block without language"""
        text = '''Output:
```
{"status": "success", "count": 42}
```
'''
        result = extract_json_from_text(text)
        assert result == {"status": "success", "count": 42}

    def test_json_in_generic_code_block_array(self):
        """Test extraction of array from generic code block"""
        text = '''List:
```
[1, 2, 3, 4, 5]
```
'''
        result = extract_json_from_text(text)
        assert result == [1, 2, 3, 4, 5]

    def test_generic_code_block_with_invalid_json_falls_through(self):
        """Test that invalid JSON in generic code block falls through to strategy 3"""
        # Generic code block has invalid JSON, but valid JSON exists later
        text = '''```
not valid json here
```
But valid here: {"success": true}'''
        result = extract_json_from_text(text)
        assert result == {"success": True}

    # Strategy 3: First {...} or [...] substring
    def test_json_object_in_text(self):
        """Test extraction of first JSON object from plain text"""
        text = 'The result is {"key": "value"} and that is all.'
        result = extract_json_from_text(text)
        assert result == {"key": "value"}

    def test_json_array_in_text(self):
        """Test extraction of first JSON array from plain text"""
        text = 'Here are the items: ["a", "b", "c"] which are important.'
        result = extract_json_from_text(text)
        assert result == ["a", "b", "c"]

    def test_json_object_with_nested_braces(self):
        """Test extraction of JSON with nested braces"""
        text = 'Data: {"outer": {"inner": {"deep": "value"}}}'
        result = extract_json_from_text(text)
        assert result["outer"]["inner"]["deep"] == "value"

    def test_json_object_preferred_over_array(self):
        """Test that object {...} is preferred over array [...] when object appears first"""
        text = 'Result: {"obj": true} or [1, 2, 3]'
        result = extract_json_from_text(text)
        assert result == {"obj": True}

    # Strategy 4: Direct parse
    def test_direct_json_object(self):
        """Test direct parsing of plain JSON object"""
        text = '{"direct": "parse", "number": 123}'
        result = extract_json_from_text(text)
        assert result == {"direct": "parse", "number": 123}

    def test_direct_json_array(self):
        """Test direct parsing of plain JSON array"""
        text = '[{"id": 1}, {"id": 2}]'
        result = extract_json_from_text(text)
        assert result == [{"id": 1}, {"id": 2}]

    # Control character handling
    def test_removes_control_characters(self):
        """Test that control characters are removed before parsing"""
        # Include some control characters that should be removed
        text = '{"key": "value\x00\x01\x02"}'
        result = extract_json_from_text(text)
        assert result == {"key": "value"}

    def test_preserves_newlines_tabs(self):
        """Test that newlines, tabs, and carriage returns are preserved"""
        text = '''```json
{"text": "line1\\nline2\\ttabbed"}
```'''
        result = extract_json_from_text(text)
        assert result == {"text": "line1\nline2\ttabbed"}

    # Error cases
    def test_invalid_json_raises_value_error(self):
        """Test that invalid JSON raises ValueError"""
        text = "This is not JSON at all"
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json_from_text(text)

    def test_malformed_json_in_code_block_falls_through(self):
        """Test that malformed JSON in code block falls through to next strategy"""
        # Malformed in ```json block, but valid JSON later
        text = '''```json
{invalid json here}
```
But here is valid: {"fallback": true}'''
        result = extract_json_from_text(text)
        assert result == {"fallback": True}

    def test_malformed_json_everywhere_raises(self):
        """Test that completely malformed JSON raises ValueError"""
        text = '''```json
{not valid}
```
{also not valid}
[broken array'''
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json_from_text(text)

    def test_empty_text_raises(self):
        """Test that empty text raises ValueError"""
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json_from_text("")

    def test_whitespace_only_raises(self):
        """Test that whitespace-only text raises ValueError"""
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            extract_json_from_text("   \n\t  ")

    # Edge cases
    def test_json_with_unicode(self):
        """Test JSON with unicode characters"""
        text = '{"name": "Caf\u00e9", "emoji": "\ud83d\ude00"}'
        result = extract_json_from_text(text)
        assert result == {"name": "Café", "emoji": "\ud83d\ude00"}

    def test_json_with_escaped_quotes(self):
        """Test JSON with escaped quotes"""
        text = '{"message": "He said \\"hello\\""}'
        result = extract_json_from_text(text)
        assert result == {"message": 'He said "hello"'}

    def test_json_with_boolean_and_null(self):
        """Test JSON with boolean and null values"""
        text = '{"active": true, "deleted": false, "metadata": null}'
        result = extract_json_from_text(text)
        assert result["active"] is True
        assert result["deleted"] is False
        assert result["metadata"] is None

    def test_json_with_numbers(self):
        """Test JSON with various number types"""
        text = '{"int": 42, "float": 3.14, "negative": -10, "scientific": 1.5e10}'
        result = extract_json_from_text(text)
        assert result["int"] == 42
        assert result["float"] == 3.14
        assert result["negative"] == -10
        assert result["scientific"] == 1.5e10

    def test_large_json_object(self):
        """Test extraction of a larger JSON object"""
        large_obj = {
            "atsOptimizedResume": "# Resume\n## Experience\n- Job 1\n- Job 2",
            "atsScore": 85,
            "optimizations": ["keyword density", "format fix", "section headers"],
            "keywordCoverage": {
                "included": ["Python", "AWS", "Docker"],
                "missing": ["Kubernetes"]
            }
        }
        import json
        text = f"Here is the analysis:\n```json\n{json.dumps(large_obj, indent=2)}\n```"
        result = extract_json_from_text(text)
        assert result["atsScore"] == 85
        assert len(result["optimizations"]) == 3
        assert "Python" in result["keywordCoverage"]["included"]

    def test_json_code_block_without_newline_before_closing(self):
        """Test JSON code block where content doesn't have trailing newline"""
        # The regex requires \n before closing ```, so this should fall through
        text = '```json\n{"key": "value"}```'
        # This should still work via strategy 3 (finding {...})
        result = extract_json_from_text(text)
        assert result == {"key": "value"}

    def test_multiple_json_objects_returns_first_valid(self):
        """Test that with multiple JSON objects, the first valid one is returned"""
        text = 'First: {"first": 1} Second: {"second": 2}'
        result = extract_json_from_text(text)
        assert result == {"first": 1}

    def test_json_with_special_characters_in_strings(self):
        """Test JSON with special characters that need to be in strings"""
        text = '{"path": "C:\\\\Users\\\\test", "url": "http://example.com?a=1&b=2"}'
        result = extract_json_from_text(text)
        assert result["path"] == "C:\\Users\\test"
        assert result["url"] == "http://example.com?a=1&b=2"
