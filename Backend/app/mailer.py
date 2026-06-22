"""SMTP helper for transactional email (feedback OTP codes).

Transport-agnostic: reads standard SMTP_* env vars, so the same code works with a
Gmail App Password today and an institute SMTP server later with no change.
Uses only the Python standard library (smtplib + email).
"""
import os
import smtplib
import ssl
from email.message import EmailMessage


def _smtp_config():
    """Reads SMTP settings from the environment. Returns a dict or None if unset."""
    host = os.environ.get('SMTP_HOST')
    user = os.environ.get('SMTP_USER')
    password = os.environ.get('SMTP_PASSWORD')
    if not host or not user or not password:
        return None
    return {
        'host': host,
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'user': user,
        'password': password,
        'from': os.environ.get('SMTP_FROM') or user,
    }


def send_otp_email(to_email, code):
    """
    Sends a feedback-verification OTP to ``to_email``.

    Returns True on success, False on any failure (missing config, SMTP error).
    Never raises — callers turn a False into a clean 502 for the client.
    """
    cfg = _smtp_config()
    if not cfg:
        print("⚠️  SMTP not configured (SMTP_HOST/USER/PASSWORD) — cannot send OTP.")
        return False

    msg = EmailMessage()
    msg['Subject'] = 'Your IIT Palakkad Dashboard feedback code'
    msg['From'] = cfg['from']
    msg['To'] = to_email
    msg.set_content(
        f"Your one-time code to submit feedback on the IIT Palakkad Dashboard is:\n\n"
        f"    {code}\n\n"
        f"It is valid for 10 minutes. If you did not request this, you can ignore this email."
    )

    try:
        # Port 465 → implicit SSL; otherwise STARTTLS upgrade (e.g. Gmail on 587).
        if cfg['port'] == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(cfg['host'], cfg['port'], context=context, timeout=15) as server:
                server.login(cfg['user'], cfg['password'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(cfg['host'], cfg['port'], timeout=15) as server:
                server.starttls(context=ssl.create_default_context())
                server.login(cfg['user'], cfg['password'])
                server.send_message(msg)
        return True
    except Exception as e:
        print(f"OTP email send failed: {e}")
        return False
