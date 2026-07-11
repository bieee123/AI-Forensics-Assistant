"""
Auth router — login, forgot-password, OTP, profile, activity log.
"""

import secrets
import string
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy.orm import Session

from app.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, OTP_EXPIRE_SECONDS, SMTP_USERNAME, SMTP_PASSWORD
from app.email import send_otp_email
from app.models.schemas import (
    SessionLocal, UserDB, OTPTokenDB, PasswordPolicyDB, UserSessionDB, ActivityLogDB,
    LoginRequest, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    ChangePasswordRequest, UpdateProfileRequest,
)

router = APIRouter()


# --- Helpers ---

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _generate_token() -> str:
    return secrets.token_urlsafe(48)


def _generate_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def _get_current_user(db: Session, token: str) -> UserDB:
    session = db.query(UserSessionDB).filter(
        UserSessionDB.token == token,
        UserSessionDB.is_active == True,
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.query(UserDB).filter(UserDB.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def _log_activity(db: Session, user_id: int, action: str, details: str, dot_color: str = "var(--accent)"):
    db.add(ActivityLogDB(
        user_id=user_id,
        action=action,
        details=details,
        dot_color=dot_color,
    ))
    db.commit()


# --- Endpoints ---

@router.post("/seed-default-user")
def seed_default_user():
    """Create default analyst user if not exists. Returns user info."""
    db: Session = SessionLocal()
    try:
        existing = db.query(UserDB).filter(UserDB.username == "analyst01").first()
        if existing:
            return {"message": "Default user already exists", "user_id": existing.id}
        user = UserDB(
            username="analyst01",
            email="analyst01@lti-internal.id",
            password_hash=_hash_password("Forensic@2026"),
            full_name="Ahmad Analyst",
            role="Forensic Analyst",
            organization="PT Teknologi Nasional Indonesia Siber (LTI)",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message": "Default user created", "user_id": user.id}
    finally:
        db.close()


@router.post("/login", response_model=dict)
def login(req: LoginRequest):
    db: Session = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.username == req.username).first()
        if not user or not _check_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = _generate_token()
        expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        db.add(UserSessionDB(
            user_id=user.id,
            token=token,
            is_active=True,
            expires_at=expires_at,
        ))
        _log_activity(db, user.id, "Login successful",
                      f"Login via username <strong>{user.username}</strong>",
                      "var(--severity-low)")
        db.commit()

        return {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization": user.organization,
            },
        }
    finally:
        db.close()


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    db: Session = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.email == req.email).first()
        if not user:
            return {"message": "If the email is registered, an OTP has been sent"}

        # Invalidate old unused OTPs
        db.query(OTPTokenDB).filter(
            OTPTokenDB.user_id == user.id,
            OTPTokenDB.purpose == "reset_password",
            OTPTokenDB.is_used == False,
        ).update({"is_used": True})
        db.commit()

        otp_code = _generate_otp()
        expires_at = datetime.utcnow() + timedelta(seconds=OTP_EXPIRE_SECONDS)
        db.add(OTPTokenDB(
            user_id=user.id,
            email=user.email,
            otp_code=otp_code,
            purpose="reset_password",
            expires_at=expires_at,
        ))
        _log_activity(db, user.id, "Password reset requested",
                      "Password reset OTP sent to email")
        db.commit()

        # Log OTP to console (always for dev visibility)
        print(f"[DEV] OTP for {user.email}: {otp_code}")

        # Send via email if SMTP configured
        if SMTP_USERNAME and SMTP_PASSWORD:
            sent = send_otp_email(user.email, otp_code)
            if sent:
                print(f"[EMAIL] OTP sent to {user.email}")
            else:
                print(f"[EMAIL] Failed to send OTP to {user.email}")

        return {"message": "If the email is registered, an OTP has been sent"}
    finally:
        db.close()


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    db: Session = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.email == req.email).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid request")

        otp_record = db.query(OTPTokenDB).filter(
            OTPTokenDB.user_id == user.id,
            OTPTokenDB.email == req.email,
            OTPTokenDB.otp_code == req.otp_code,
            OTPTokenDB.is_used == False,
            OTPTokenDB.expires_at > datetime.utcnow(),
        ).first()

        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        otp_record.is_used = True
        db.commit()

        # Generate a reset token (stored in OTP record or just return a temp token)
        reset_token = _generate_token()

        return {"message": "OTP verified", "reset_token": reset_token}
    finally:
        db.close()


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    db: Session = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.email == req.email).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid request")

        # Verify policy
        policy = db.query(PasswordPolicyDB).first()
        min_len = policy.min_length if policy else 8
        require_upper = policy.require_uppercase if policy else True
        require_num = policy.require_number if policy else True
        require_sym = policy.require_symbol if policy else True

        errors = []
        if len(req.new_password) < min_len:
            errors.append(f"Minimum {min_len} characters")
        if require_upper and not any(c.isupper() for c in req.new_password):
            errors.append("Must contain uppercase letter")
        if require_num and not any(c.isdigit() for c in req.new_password):
            errors.append("Must contain number")
        if require_sym and not any(c in string.punctuation for c in req.new_password):
            errors.append("Must contain symbol")
        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))

        user.password_hash = _hash_password(req.new_password)
        _log_activity(db, user.id, "Password changed successfully",
                      "Password was reset via OTP verification",
                      "var(--severity-low)")

        # Invalidate all sessions
        db.query(UserSessionDB).filter(
            UserSessionDB.user_id == user.id,
            UserSessionDB.is_active == True,
        ).update({"is_active": False})
        db.commit()

        return {"message": "Password reset successful"}
    finally:
        db.close()


@router.get("/profile")
def get_profile(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")
    db: Session = SessionLocal()
    try:
        user = _get_current_user(db, token)
        # Get stats
        total_sessions = db.query(UserSessionDB).filter(
            UserSessionDB.user_id == user.id,
            UserSessionDB.is_active == True,
        ).count()
        from app.models.schemas import LogUploadDB
        total_uploads = db.query(LogUploadDB).count()
        from app.models.schemas import AnalysisResultDB
        total_reports = db.query(AnalysisResultDB).count()

        # Latest session
        latest_session = db.query(UserSessionDB).filter(
            UserSessionDB.user_id == user.id,
        ).order_by(UserSessionDB.created_at.desc()).first()

        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization": user.organization,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "stats": {
                "total_sessions": total_sessions,
                "total_uploads": total_uploads,
                "total_reports": total_reports,
            },
            "last_login": latest_session.created_at.isoformat() if latest_session else None,
        }
    finally:
        db.close()


@router.put("/profile")
def update_profile(req: UpdateProfileRequest, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")
    db: Session = SessionLocal()
    try:
        user = _get_current_user(db, token)
        if req.full_name is not None:
            user.full_name = req.full_name
        if req.email is not None:
            existing = db.query(UserDB).filter(UserDB.email == req.email, UserDB.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = req.email
        db.commit()
        _log_activity(db, user.id, "Profile updated", "Account information changed")
        return {"message": "Profile updated"}
    finally:
        db.close()


@router.put("/change-password")
def change_password(req: ChangePasswordRequest, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")
    db: Session = SessionLocal()
    try:
        user = _get_current_user(db, token)

        if not _check_password(req.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Verify policy
        policy = db.query(PasswordPolicyDB).first()
        min_len = policy.min_length if policy else 8
        require_upper = policy.require_uppercase if policy else True
        require_num = policy.require_number if policy else True
        require_sym = policy.require_symbol if policy else True

        errors = []
        if len(req.new_password) < min_len:
            errors.append(f"Minimum {min_len} characters")
        if require_upper and not any(c.isupper() for c in req.new_password):
            errors.append("Must contain uppercase letter")
        if require_num and not any(c.isdigit() for c in req.new_password):
            errors.append("Must contain number")
        if require_sym and not any(c in string.punctuation for c in req.new_password):
            errors.append("Must contain symbol")
        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))

        user.password_hash = _hash_password(req.new_password)
        _log_activity(db, user.id, "Password changed successfully",
                      "Password changed from profile settings",
                      "var(--severity-low)")
        db.commit()
        return {"message": "Password changed successfully"}
    finally:
        db.close()


@router.get("/activity-log")
def get_activity_log(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")
    db: Session = SessionLocal()
    try:
        user = _get_current_user(db, token)
        logs = db.query(ActivityLogDB).filter(
            ActivityLogDB.user_id == user.id,
        ).order_by(ActivityLogDB.created_at.desc()).limit(20).all()

        return [
            {
                "timestamp": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "action": log.action,
                "details": log.details,
                "dot_color": log.dot_color,
            }
            for log in logs
        ]
    finally:
        db.close()
