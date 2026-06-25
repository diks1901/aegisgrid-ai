"""
AegisGrid AI — Security Middleware
===================================
Standalone security module. Import into main.py or any FastAPI app.

Provides:
- Prompt injection detection
- Input sanitization
- API key authentication dependency
- Rate limiter setup (slowapi)
- Security event audit logging
"""

import re
import logging
import os
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ── LOGGING ──────────────────────────────────────────────────
security_logger = logging.getLogger("AegisGrid.Security")

# ── PROMPT INJECTION DETECTION ───────────────────────────────

# Patterns that indicate adversarial prompt manipulation.
# Designed to be strict enough to catch common attacks while
# allowing legitimate incident descriptions (which may naturally
# contain phrases like "override normal operations").

_INJECTION_PATTERNS = [
    r"ignore\s+previous",
    r"ignore\s+all\s+instructions",
    r"disregard\s+your",
    r"forget\s+previous",
    r"system\s*:",               # fake system prompt injection
    r"<\s*system\s*>",           # XML-style system block
    r"jailbreak",
    r"override\s+instructions",
    r"override\s+your\s+rules",
    r"act\s+as\s+(?!an?\s+infrastructure)",  # allow "act as an infrastructure expert"
    r"new\s+persona",
    r"pretend\s+you\s+are",
    r"you\s+are\s+now\s+(?!analyzing)",      # allow "you are now analyzing"
    r"roleplay\s+as",
    r"DAN\s+mode",
    r"developer\s+mode",
    r"do\s+anything\s+now",
    r"bypass\s+(?:safety|filter|restriction)",
    r"reveal\s+(?:your\s+)?(?:system\s+prompt|instructions|training)",
    r"print\s+(?:your\s+)?(?:system\s+prompt|instructions)",
]

_INJECTION_REGEX = re.compile(
    "|".join(_INJECTION_PATTERNS),
    re.IGNORECASE,
)


def detect_prompt_injection(text: str) -> bool:
    """
    Returns True if the input contains prompt injection patterns.

    Args:
        text: The raw user input to check.

    Returns:
        bool: True if injection detected, False if clean.

    Usage:
        if detect_prompt_injection(user_input):
            raise HTTPException(status_code=400, detail="Malicious input detected.")
    """
    match = _INJECTION_REGEX.search(text)
    if match:
        security_logger.warning(
            f"[InjectionDetected] Pattern matched: '{match.group()}' in input: {text[:80]}..."
        )
    return bool(match)


def get_injection_match(text: str) -> Optional[str]:
    """
    Returns the matched injection pattern string, or None if clean.
    Useful for detailed audit logging.
    """
    match = _INJECTION_REGEX.search(text)
    return match.group() if match else None


# ── INPUT SANITIZATION ────────────────────────────────────────

# HTML tag pattern — strips any <tag> or </tag> from input
_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")

# Null byte pattern — prevents null byte injection
_NULL_BYTE_PATTERN = re.compile(r"\x00")

# Control character pattern (excludes tabs and newlines which are legitimate)
_CONTROL_CHAR_PATTERN = re.compile(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_input(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitizes user input by removing HTML tags, null bytes, control
    characters, and normalizing whitespace.

    Args:
        text:       The raw input string.
        max_length: Optional hard truncation after sanitization.

    Returns:
        str: Cleaned, normalized string.

    Usage:
        clean_description = sanitize_input(body.incident_description, max_length=2000)
    """
    if not text:
        return ""

    # Strip HTML tags
    clean = _HTML_TAG_PATTERN.sub("", text)

    # Remove null bytes
    clean = _NULL_BYTE_PATTERN.sub("", clean)

    # Remove non-printable control characters (keep \t \n \r)
    clean = _CONTROL_CHAR_PATTERN.sub("", clean)

    # Normalize whitespace (collapse multiple spaces/tabs but preserve newlines)
    clean = re.sub(r"[ \t]+", " ", clean)
    clean = re.sub(r"\n{3,}", "\n\n", clean)  # collapse 3+ newlines to 2
    clean = clean.strip()

    # Hard truncation
    if max_length and len(clean) > max_length:
        clean = clean[:max_length]
        security_logger.warning(f"[InputTruncated] Input truncated to {max_length} chars.")

    return clean


def sanitize_list(items: list[str], max_items: int = 20, max_item_length: int = 100) -> list[str]:
    """
    Sanitizes a list of strings (e.g. affected_systems).

    Args:
        items:           List of strings to sanitize.
        max_items:       Maximum list length (excess items dropped).
        max_item_length: Maximum length per item.

    Returns:
        list[str]: Cleaned list.
    """
    cleaned = []
    for item in items[:max_items]:
        clean_item = sanitize_input(str(item), max_length=max_item_length)
        if clean_item:
            cleaned.append(clean_item)
    return cleaned


# ── API KEY AUTHENTICATION ────────────────────────────────────

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
_AEGISGRID_API_KEY = os.getenv("AEGISGRID_API_KEY", "aegisgrid-dev-key-change-in-prod")


async def verify_api_key(
    request: Request,
    api_key: Optional[str] = Depends(_API_KEY_HEADER),
) -> str:
    """
    FastAPI dependency: validates the X-API-Key header.

    Raises:
        HTTPException 401: If key is missing or invalid.

    Usage:
        @app.post("/api/investigate")
        async def endpoint(_key: str = Depends(verify_api_key)):
            ...
    """
    if not api_key or api_key != _AEGISGRID_API_KEY:
        client_ip = request.client.host if request.client else "unknown"
        security_logger.warning(
            f"[AuthFailed] Invalid API key from {client_ip}. "
            f"Key prefix: {str(api_key)[:6] if api_key else 'NONE'}..."
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Include 'X-API-Key' header.",
        )
    return api_key


# ── RATE LIMITING ─────────────────────────────────────────────

# Singleton limiter — initialize once, attach to app
limiter = Limiter(key_func=get_remote_address)


def configure_rate_limiting(app) -> None:
    """
    Attaches slowapi rate limiter and error handler to a FastAPI app.

    Args:
        app: FastAPI application instance.

    Usage:
        app = FastAPI(...)
        configure_rate_limiting(app)

        @app.post("/api/investigate")
        @limiter.limit("10/minute")
        async def endpoint(request: Request, ...):
            ...
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    security_logger.info("[RateLimiter] Configured: 10 requests/minute per IP.")


# ── AUDIT LOGGING ─────────────────────────────────────────────

def audit_log_request(
    session_id: str,
    client_ip: str,
    location: str,
    primary_cause: str,
    elapsed_seconds: float,
    status: str = "SUCCESS",
) -> None:
    """
    Writes a structured audit log entry for every investigation request.

    Args:
        session_id:      Unique investigation session UUID.
        client_ip:       Requesting IP address.
        location:        Incident location from request.
        primary_cause:   Final root cause assessment from DecisionFusion.
        elapsed_seconds: Total pipeline execution time.
        status:          "SUCCESS" or "ERROR".

    Log format (machine-parseable):
        [Audit] session=<id> | ip=<ip> | location=<loc> | cause=<cause> | elapsed=<s>s | status=<status>
    """
    security_logger.info(
        f"[Audit] session={session_id} | ip={client_ip} | "
        f"location={location} | cause={primary_cause} | "
        f"elapsed={elapsed_seconds}s | status={status}"
    )


def audit_log_security_event(
    event_type: str,
    client_ip: str,
    details: str,
) -> None:
    """
    Writes a security-specific audit entry (injections, auth failures, etc).

    Args:
        event_type: e.g. "INJECTION_ATTEMPT", "AUTH_FAILURE", "RATE_LIMIT"
        client_ip:  Requesting IP address.
        details:    Short human-readable description of the event.
    """
    security_logger.warning(
        f"[SecurityEvent:{event_type}] ip={client_ip} | {details}"
    )


# ── CONVENIENCE: run all input security checks ───────────────

def validate_and_sanitize(
    incident_description: str,
    location: str,
    affected_systems: list[str],
    client_ip: str = "unknown",
) -> tuple[str, str, list[str]]:
    """
    Runs the full security gauntlet on request inputs:
    1. Sanitize all fields
    2. Check for prompt injection across all text fields

    Returns:
        tuple: (clean_description, clean_location, clean_systems)

    Raises:
        HTTPException 400: If prompt injection is detected.

    Usage:
        description, location, systems = validate_and_sanitize(
            body.incident_description,
            body.location,
            body.affected_systems,
            client_ip=request.client.host,
        )
    """
    # Sanitize
    clean_desc     = sanitize_input(incident_description, max_length=2000)
    clean_location = sanitize_input(location, max_length=100)
    clean_systems  = sanitize_list(affected_systems)

    # Injection check on combined text
    combined = f"{clean_desc} {clean_location} {' '.join(clean_systems)}"
    matched_pattern = get_injection_match(combined)

    if matched_pattern:
        audit_log_security_event(
            event_type="INJECTION_ATTEMPT",
            client_ip=client_ip,
            details=f"Pattern: '{matched_pattern}' | Input preview: {combined[:80]}",
        )
        raise HTTPException(
            status_code=400,
            detail=(
                "Input contains potentially malicious content. "
                "Investigation aborted. This event has been logged."
            ),
        )

    return clean_desc, clean_location, clean_systems
