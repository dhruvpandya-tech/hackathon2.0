import os
from textwrap import dedent

from fastapi.concurrency import run_in_threadpool
import resend

from ..schemas.report import EmailReportRequest


class EmailSendError(RuntimeError):
    """Raised when the email provider cannot send the report."""


def _build_email_body(payload: EmailReportRequest) -> str:
    issues = payload.top_issues or ["No critical issues provided."]
    issue_items = "".join(f"<li>{issue}</li>" for issue in issues)
    html = f"""
    <h2>ConvertX Report</h2>
    <p>UX Score: {payload.ux_score}</p>
    <p>SEO Score: {payload.seo_score}</p>
    <p>Estimated Monthly Loss: ₹{payload.estimated_loss}</p>
    <h3>Top Issues:</h3>
    <ul>
      {issue_items}
    </ul>
    <p>Generated via ConvertX Demo Dashboard.</p>
    """
    return dedent(html)


async def send_report_email(payload: EmailReportRequest) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise EmailSendError("Resend API key not configured")

    resend.api_key = api_key
    html = _build_email_body(payload)

    request_payload = {
        "from": "ConvertX <onboarding@resend.dev>",
        "to": [payload.email],
        "subject": "Your Website Report",
        "html": html,
    }

    try:
        await run_in_threadpool(resend.Emails.send, request_payload)
    except Exception as exc:  # noqa: BLE001
        raise EmailSendError("Failed to send report email") from exc
