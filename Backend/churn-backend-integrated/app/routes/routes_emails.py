# app/routes/routes_emails.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from app.db import get_db
from app.deps import verify_api_key
from app import models
from app.services.email_service import send_single_email, send_bulk_emails

router = APIRouter(prefix="/emails", tags=["Email"])


# Request schemas
class SingleEmailRequest(BaseModel):
    to_email: EmailStr
    to_name: str
    subject: str
    html_content: str


class BulkEmailRequest(BaseModel):
    recipients: List[dict]  # List of {"email": str, "name": str}
    subject: str
    html_content: str


@router.post("/send-single")
async def send_single_email_endpoint(
    email_data: SingleEmailRequest,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
):
    """
    Send a single personalized email to a customer.
    """
    try:
        result = send_single_email(
            to_email=email_data.to_email,
            to_name=email_data.to_name,
            subject=email_data.subject,
            html_content=email_data.html_content
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "message_id": result.get("message_id")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to send email")
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending email: {str(e)}"
        )


@router.post("/send-bulk")
async def send_bulk_emails_endpoint(
    email_data: BulkEmailRequest,
    db: AsyncSession = Depends(get_db),
    client: models.Client = Depends(verify_api_key)
):
    """
    Send bulk emails to multiple customers.
    """
    try:
        # Validate recipients format
        validated_recipients = []
        for recipient in email_data.recipients:
            if not isinstance(recipient, dict) or "email" not in recipient:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each recipient must have 'email' field"
                )
            validated_recipients.append({
                "email": recipient["email"],
                "name": recipient.get("name", recipient["email"])
            })
        
        result = send_bulk_emails(
            recipients=validated_recipients,
            subject=email_data.subject,
            html_content=email_data.html_content
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "sent_count": result.get("sent_count", 0),
                "message_id": result.get("message_id")
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to send bulk email")
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending bulk email: {str(e)}"
        )

