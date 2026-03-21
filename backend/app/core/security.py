from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    key = settings.fernet_key.strip()
    if not key:
        raise RuntimeError("FERNET_KEY is not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("invalid ciphertext") from exc


def mask_key_preview(plain: str) -> str:
    t = plain.strip()
    if len(t) <= 8:
        return "****"
    return f"{t[:4]}…{t[-4:]}"
