"""Step 10: Payment and seat confirmation.

The docx says the payment gateway is 'finalized after approval' (section
13, point 2) - so this is a manual-confirm stub that mirrors the shape a
real gateway integration will have: initiate -> (student scans a payment
QR in their own banking app, off-system) -> gateway calls back -> confirm.
Swap `confirm_payment`'s body for a signature-verified webhook handler once
a gateway is chosen; nothing else in the app needs to change.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_application_by_session, require_role
from ..enums import ApplicationStatus, PaymentStatus, StaffRole
from ..workflow import WorkflowError, advance_status

router = APIRouter(prefix="/kiosk/applications/payment", tags=["payments"])


@router.post("/initiate", response_model=schemas.PaymentInitiateOut, status_code=201)
def initiate_payment(
    amount: float,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    if app.status != ApplicationStatus.SIGNED:
        raise HTTPException(409, "Payment can only start after signatures are confirmed")
    if amount <= 0:
        raise HTTPException(400, "amount must be positive")

    payment = models.Payment(application_id=app.id, amount=amount, reference=uuid.uuid4().hex[:12].upper())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return schemas.PaymentInitiateOut(
        payment_id=payment.id, reference=payment.reference, amount=payment.amount, status=payment.status
    )


@router.post("/confirm", response_model=schemas.ApplicationDetail)
def confirm_payment(
    payload: schemas.PaymentConfirmIn,
    app: models.Application = Depends(get_application_by_session),
    db: Session = Depends(get_db),
):
    """TODO: replace with a real gateway webhook (verify signature, look up
    `reference` from the gateway's own payload instead of trusting the kiosk)."""
    from datetime import datetime, timezone

    payment = db.scalar(
        select(models.Payment).where(
            models.Payment.application_id == app.id, models.Payment.reference == payload.reference
        )
    )
    if not payment:
        raise HTTPException(404, "No such payment reference for this application")
    if payment.status == PaymentStatus.PAID:
        raise HTTPException(409, "Payment already confirmed")

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.now(timezone.utc)
    payment.gateway_payload = payload.gateway_payload

    try:
        advance_status(app, ApplicationStatus.PAYMENT_COMPLETED)
        advance_status(app, ApplicationStatus.SEAT_CONFIRMED)
    except WorkflowError as e:
        raise HTTPException(409, str(e))

    db.commit()
    db.refresh(app)
    return app
