from datetime import datetime, timedelta
import base64
import hashlib
import hmac
import json
import secrets

from app.core.config import get_settings


settings = get_settings()

ALGORITHM = "HS256"
PASSWORD_ITERATIONS = 210_000
PASSWORD_SCHEME = "pbkdf2_sha256"


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}".encode("ascii"))


def get_password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return "$".join(
        [
            PASSWORD_SCHEME,
            str(PASSWORD_ITERATIONS),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        ]
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme, iterations_text, salt_text, digest_text = hashed_password.split("$", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        iterations = int(iterations_text)
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = {"sub": str(user_id), "username": username, "exp": int(expire.timestamp())}
    signing_input = ".".join(
        [
            _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_token(token: str) -> dict | None:
    try:
        header_text, payload_text, signature_text = token.split(".", 2)
        signing_input = f"{header_text}.{payload_text}"
        expected_signature = hmac.new(
            settings.jwt_secret_key.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
        actual_signature = _base64url_decode(signature_text)
        if not hmac.compare_digest(actual_signature, expected_signature):
            return None

        header = json.loads(_base64url_decode(header_text))
        if header.get("alg") != ALGORITHM:
            return None

        payload = json.loads(_base64url_decode(payload_text))
        exp = payload.get("exp")
        if exp is not None and datetime.utcnow().timestamp() > float(exp):
            return None
        return payload
    except Exception:
        return None
