# app/services/email_service.py
import os
import re
import html as html_module
from typing import List, Dict, Any, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Default sender email (should be configured in Brevo)
DEFAULT_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@example.com")
DEFAULT_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "ChurnPredict")


def convert_text_to_html(text_content: str, unsubscribe_url: Optional[str] = None) -> str:
    """
    Convert plain text to HTML format with proper email structure.
    Includes anti-spam best practices.
    """
    # Replace newlines with <br> tags
    html = text_content.replace("\n", "<br>")
    # Escape HTML special characters (but keep <br> tags)
    # First, temporarily replace <br> with a placeholder
    html = html.replace("<br>", "___BR___")
    html = html_module.escape(html)
    html = html.replace("___BR___", "<br>")
    
    # Add unsubscribe link if provided
    unsubscribe_html = ""
    if unsubscribe_url:
        unsubscribe_html = f'<p style="margin: 20px 0 0 0; text-align: center;"><a href="{unsubscribe_url}" style="color: #666666; font-size: 12px; text-decoration: underline;">Unsubscribe</a></p>'
    else:
        unsubscribe_html = '<p style="margin: 20px 0 0 0; color: #666666; font-size: 12px; text-align: center;">If you no longer wish to receive these emails, please contact us.</p>'
    
    # Wrap in professional HTML email structure with anti-spam best practices
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="format-detection" content="telephone=no">
    <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="color: #333333; font-size: 16px; line-height: 1.8; word-wrap: break-word;">
                                {html}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; text-align: center;">
                                This email was sent by ChurnPredict. Please do not reply to this email.
                            </p>
                            {unsubscribe_html}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


def send_single_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send a single email using Brevo API.
    
    Args:
        to_email: Recipient email address
        to_name: Recipient name
        subject: Email subject
        html_content: Email HTML content
        sender_email: Sender email (defaults to env var)
        sender_name: Sender name (defaults to env var)
    
    Returns:
        Dict with success status and message/error
    """
    if not BREVO_API_KEY:
        return {
            "success": False,
            "error": "Brevo API key not configured. Please set BREVO_API_KEY environment variable."
        }
    
    sender_email = sender_email or DEFAULT_SENDER_EMAIL
    sender_name = sender_name or DEFAULT_SENDER_NAME
    
    # Convert plain text to HTML if needed
    if not html_content.strip().startswith("<"):
        html_content = convert_text_to_html(html_content)
    
    # Create plain text version from HTML (simple conversion)
    text_content = html_content.replace("<br>", "\n").replace("<br/>", "\n")
    # Remove HTML tags for plain text
    text_content = re.sub(r'<[^>]+>', '', text_content)
    text_content = text_content.strip()
    
    # Ensure subject doesn't trigger spam filters (no all caps, no excessive punctuation)
    subject = subject.strip()
    if subject.isupper() and len(subject) > 10:
        subject = subject.capitalize()
    
    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_name
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,  # Add plain text version (reduces spam score)
        "headers": {
            "X-Mailer": "ChurnPredict",
            "X-Priority": "3",
            "Importance": "normal",
            "List-Unsubscribe": f"<mailto:{sender_email}?subject=unsubscribe>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        },
        "tags": ["churn-prediction", "customer-retention"]
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers)
        
        if response.status_code == 201:
            return {
                "success": True,
                "message": f"Email sent successfully to {to_email}",
                "message_id": response.json().get("messageId")
            }
        else:
            error_msg = response.json().get("message", "Unknown error")
            return {
                "success": False,
                "error": f"Failed to send email: {error_msg}",
                "status_code": response.status_code
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error sending email: {str(e)}"
        }


def send_bulk_emails(
    recipients: List[Dict[str, str]],
    subject: str,
    html_content: str,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send bulk emails to multiple recipients using Brevo API.
    
    Args:
        recipients: List of dicts with 'email' and 'name' keys
        subject: Email subject
        html_content: Email HTML content
        sender_email: Sender email (defaults to env var)
        sender_name: Sender name (defaults to env var)
    
    Returns:
        Dict with success status, sent count, and errors
    """
    if not BREVO_API_KEY:
        return {
            "success": False,
            "error": "Brevo API key not configured. Please set BREVO_API_KEY environment variable."
        }
    
    if not recipients:
        return {
            "success": False,
            "error": "No recipients provided"
        }
    
    sender_email = sender_email or DEFAULT_SENDER_EMAIL
    sender_name = sender_name or DEFAULT_SENDER_NAME
    
    # Convert plain text to HTML if needed
    if not html_content.strip().startswith("<"):
        html_content = convert_text_to_html(html_content)
    
    # Brevo supports bulk emails by sending to multiple recipients in one request
    to_list = [
        {
            "email": recipient["email"],
            "name": recipient.get("name", recipient["email"])
        }
        for recipient in recipients
    ]
    
    # Create plain text version from HTML (simple conversion)
    text_content = html_content.replace("<br>", "\n").replace("<br/>", "\n")
    # Remove HTML tags for plain text
    text_content = re.sub(r'<[^>]+>', '', text_content)
    text_content = text_content.strip()
    
    # Ensure subject doesn't trigger spam filters
    subject = subject.strip()
    if subject.isupper() and len(subject) > 10:
        subject = subject.capitalize()
    
    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": to_list,
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,  # Add plain text version (reduces spam score)
        "headers": {
            "X-Mailer": "ChurnPredict",
            "X-Priority": "3",
            "Importance": "normal",
            "List-Unsubscribe": f"<mailto:{sender_email}?subject=unsubscribe>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        },
        "tags": ["churn-prediction", "bulk-email", "customer-retention"]
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers)
        
        if response.status_code == 201:
            return {
                "success": True,
                "message": f"Bulk email sent successfully to {len(recipients)} recipients",
                "sent_count": len(recipients),
                "message_id": response.json().get("messageId")
            }
        else:
            error_msg = response.json().get("message", "Unknown error")
            return {
                "success": False,
                "error": f"Failed to send bulk email: {error_msg}",
                "status_code": response.status_code,
                "sent_count": 0
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error sending bulk email: {str(e)}",
            "sent_count": 0
        }

