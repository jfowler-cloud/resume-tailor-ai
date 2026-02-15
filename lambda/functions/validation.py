"""
Input validation utilities for Lambda functions.
Provides length limits, encoding checks, and basic sanitization.
"""
import logging

logger = logging.getLogger(__name__)

# Limits
MAX_JOB_DESCRIPTION_LENGTH = 50000  # ~12,500 tokens
MIN_JOB_DESCRIPTION_LENGTH = 50
MAX_RESUME_CONTENT_LENGTH = 100000  # ~25,000 tokens
MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000


def validate_job_description(job_description: str) -> str:
    """Validate and sanitize job description input."""
    if not job_description or not job_description.strip():
        raise ValueError("Job description is required")

    job_description = job_description.strip()

    if len(job_description) < MIN_JOB_DESCRIPTION_LENGTH:
        raise ValueError(
            f"Job description too short (minimum {MIN_JOB_DESCRIPTION_LENGTH} characters)"
        )

    if len(job_description) > MAX_JOB_DESCRIPTION_LENGTH:
        raise ValueError(
            f"Job description too long (maximum {MAX_JOB_DESCRIPTION_LENGTH} characters)"
        )

    return job_description


def validate_resume_content(content: str, source: str = "resume") -> str:
    """Validate resume content from S3."""
    if not content or not content.strip():
        raise ValueError(f"Empty {source} content")

    if len(content) > MAX_RESUME_CONTENT_LENGTH:
        raise ValueError(
            f"{source} content too long (maximum {MAX_RESUME_CONTENT_LENGTH} characters)"
        )

    return content


def validate_s3_key(key: str) -> str:
    """Validate an S3 key to prevent path traversal."""
    if not key or not key.strip():
        raise ValueError("S3 key is required")

    key = key.strip()

    if ".." in key or key.startswith("/"):
        raise ValueError("Invalid S3 key")

    return key


def safe_decode_s3_body(body: bytes, source: str = "file") -> str:
    """Safely decode S3 object body, handling encoding errors."""
    try:
        return body.decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("UTF-8 decode failed for %s, trying latin-1", source)
        try:
            return body.decode("latin-1")
        except Exception:
            raise ValueError(f"{source} must be a text file (UTF-8 or Latin-1 encoded)")
