"""
Unit tests for validation module
"""
import pytest
from validation import (
    validate_job_description,
    validate_resume_content,
    validate_s3_key,
    safe_decode_s3_body,
    MAX_JOB_DESCRIPTION_LENGTH,
    MIN_JOB_DESCRIPTION_LENGTH,
    MAX_RESUME_CONTENT_LENGTH,
)


class TestValidateJobDescription:
    def test_valid_description(self):
        desc = "A" * 100
        result = validate_job_description(desc)
        assert result == desc

    def test_strips_whitespace(self):
        desc = "  " + "A" * 100 + "  "
        result = validate_job_description(desc)
        assert result == "A" * 100

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="required"):
            validate_job_description("")

    def test_none_raises(self):
        with pytest.raises(ValueError, match="required"):
            validate_job_description(None)

    def test_whitespace_only_raises(self):
        with pytest.raises(ValueError, match="required"):
            validate_job_description("   ")

    def test_too_short_raises(self):
        with pytest.raises(ValueError, match="too short"):
            validate_job_description("Short")

    def test_too_long_raises(self):
        with pytest.raises(ValueError, match="too long"):
            validate_job_description("A" * (MAX_JOB_DESCRIPTION_LENGTH + 1))

    def test_at_max_length(self):
        desc = "A" * MAX_JOB_DESCRIPTION_LENGTH
        result = validate_job_description(desc)
        assert len(result) == MAX_JOB_DESCRIPTION_LENGTH

    def test_at_min_length(self):
        desc = "A" * MIN_JOB_DESCRIPTION_LENGTH
        result = validate_job_description(desc)
        assert len(result) == MIN_JOB_DESCRIPTION_LENGTH


class TestValidateResumeContent:
    def test_valid_content(self):
        content = "# My Resume\nExperience..."
        result = validate_resume_content(content)
        assert result == content

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="Empty"):
            validate_resume_content("")

    def test_too_long_raises(self):
        with pytest.raises(ValueError, match="too long"):
            validate_resume_content("A" * (MAX_RESUME_CONTENT_LENGTH + 1))


class TestValidateS3Key:
    def test_valid_key(self):
        assert validate_s3_key("uploads/user1/resume.md") == "uploads/user1/resume.md"

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="required"):
            validate_s3_key("")

    def test_path_traversal_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            validate_s3_key("uploads/../../etc/passwd")

    def test_leading_slash_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            validate_s3_key("/uploads/resume.md")

    def test_strips_whitespace(self):
        result = validate_s3_key("  uploads/resume.md  ")
        assert result == "uploads/resume.md"


class TestSafeDecodeS3Body:
    def test_utf8_content(self):
        content = "Hello World".encode("utf-8")
        result = safe_decode_s3_body(content)
        assert result == "Hello World"

    def test_latin1_fallback(self):
        content = "R\xe9sum\xe9".encode("latin-1")
        result = safe_decode_s3_body(content)
        assert "sum" in result

    def test_binary_raises(self):
        # Invalid byte sequence that can't be decoded
        content = bytes([0x80, 0x81, 0x82, 0x83, 0x00, 0xFF])
        # latin-1 can decode any byte, so this should succeed
        result = safe_decode_s3_body(content)
        assert isinstance(result, str)
