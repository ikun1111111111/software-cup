from app.core.security import get_password_hash, verify_password


def test_password_hash_roundtrip():
    hashed = get_password_hash("secret123")

    assert hashed.startswith("$2b$")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong-password", hashed)
