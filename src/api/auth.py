import os
import httpx
import jwt
from jwt import PyJWKClient
from fastapi import Request, HTTPException
from src.models.store import SessionLocal, User

# Lấy URL JWKS từ Clerk Dashboard -> Developers -> API Keys -> Advanced -> JWT public key (Endpoint /jwks.json)
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")

jwks_client = PyJWKClient(CLERK_JWKS_URL) if CLERK_JWKS_URL else None

def get_current_user(request: Request) -> User:
    """FastAPI dependency — extracts user from Clerk JWT token via proxy headers."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated (header is missing)")

    token = auth_header[7:]

    if not CLERK_JWKS_URL:
        # NOTE: Without JWKS, we are forced to skip signature verification mapping (development fallback)
        # NEVER DO THIS IN PRODUCTION WITHOUT VERIFYING THE SIGNATURE
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"]
            )
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token validation failed: {e}")

    clerk_id = payload.get("sub")
    
    # Clerk does not always embed the email inside the JWT payload natively without templates,
    # but we can try to extract from email addresses or just use clerk_id
    email = payload.get("email", f"{clerk_id}@clerk.local")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Tự động tạo user mới nếu chưa tồn tại
            user = User(
                email=email,
                name=f"User {clerk_id[-4:]}",
                password_hash="clerk"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()
