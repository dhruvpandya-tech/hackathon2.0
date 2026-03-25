from fastapi import APIRouter, HTTPException

from ..schemas.report import EmailReportRequest
from ..services.emailer import EmailSendError, send_report_email

router = APIRouter(prefix="/send-report", tags=["report"])


@router.post("", response_model=dict)
async def send_report_endpoint(payload: EmailReportRequest) -> dict[str, str]:
    try:
        await send_report_email(payload)
    except EmailSendError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"status": "success"}
