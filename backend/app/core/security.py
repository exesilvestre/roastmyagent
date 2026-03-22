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
    raw = (token or "").strip()
    if not raw:
        raise ValueError("empty encrypted secret")
    try:
        return _fernet().decrypt(raw.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError(
            "Failed to decrypt stored secret (wrong FERNET_KEY, corrupted data, or value not "
            "encrypted with this key). Use the same FERNET_KEY that was used when the data was "
            "saved, or re-enter API keys and agent connection secrets in the app."
        ) from exc


def mask_key_preview(plain: str) -> str:
    t = plain.strip()
    if len(t) <= 8:
        return "****"
    return f"{t[:4]}…{t[-4:]}"
