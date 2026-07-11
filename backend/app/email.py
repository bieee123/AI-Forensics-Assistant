"""
SMTP email sender for OTP delivery.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM


def send_otp_email(to_email: str, otp_code: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your OTP Code - AI Forensics Assistant"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        text = f"Your OTP code is: {otp_code}\n\nThis code expires in 5 minutes."
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #e0e0e0;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #1a1a1a;">AI Forensics Assistant</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #666;">Use the OTP below to reset your password:</p>
              <div style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a73e8; padding: 16px; background: #f0f7ff; border-radius: 6px; margin-bottom: 20px;">
                {otp_code}
              </div>
              <p style="margin: 0 0 8px; font-size: 12px; color: #999;">This OTP expires in 5 minutes.</p>
              <p style="margin: 0; font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
            </div>
          </body>
        </html>
        """

        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        return True
    except Exception:
        return False
