from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User, UserOTP
from app.auth.utils import UserRegister, UserLogin, Token, get_password_hash, verify_password, create_access_token
from datetime import timedelta, datetime
import random
from pydantic import BaseModel
from app.services.notifier import send_email_via_brevo

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/register", response_model=Token)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        is_onboarded=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate access token
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_onboarded": new_user.is_onboarded
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_onboarded": user.is_onboarded
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Look up user
    user = db.query(User).filter(User.email == req.email).first()
    
    # Generate OTP (always, to prevent timing attacks / user enumeration)
    otp_code = f"{random.randint(100000, 999999)}"
    expiry_time = datetime.utcnow() + timedelta(minutes=15)
    
    if user:
        # Delete any existing OTP entries for this email
        db.query(UserOTP).filter(UserOTP.email == req.email).delete()
        
        # Save OTP to DB
        otp_entry = UserOTP(
            email=req.email,
            otp=otp_code,
            expiry=expiry_time
        )
        db.add(otp_entry)
        db.commit()
        
        # Send Email
        subject = "NutriSense AI - Password Reset OTP"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #0b0b12; color: #f5f5f7;">
            <h2 style="color: #9333ea; text-align: center;">NutriSense AI Password Reset</h2>
            <p>Hello {user.name},</p>
            <p>You requested a password reset. Use the 6-digit OTP code below to verify your identity. This code is valid for 15 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; border-radius: 8px; background-color: #12121c; border: 1px solid #242436; color: #ffffff; display: inline-block;">{otp_code}</span>
            </div>
            <p>If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #242436; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">NutriSense AI Coach &copy; 2026</p>
        </div>
        """
        send_email_via_brevo(to_email=user.email, to_name=user.name, subject=subject, html_content=html_content)
    else:
        # Log warning but return success to prevent email discovery attacks
        import logging
        logging.getLogger(__name__).warning(f"[Auth] Password reset requested for unregistered email: {req.email}")
        
    return {"message": "If this email is registered, a 6-digit OTP code has been dispatched."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Check OTP
    now = datetime.utcnow()
    otp_record = db.query(UserOTP).filter(
        UserOTP.email == req.email,
        UserOTP.otp == req.otp,
        UserOTP.expiry > now
    ).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )
        
    # Update User password
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User no longer exists"
        )
        
    # Update hashed password
    user.hashed_password = get_password_hash(req.new_password)
    
    # Delete verified OTP
    db.delete(otp_record)
    db.commit()
    
    return {"message": "Password reset successful!"}
