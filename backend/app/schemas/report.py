from typing import List

from pydantic import BaseModel, EmailStr, Field


class EmailReportRequest(BaseModel):
    email: EmailStr
    ux_score: float = Field(..., description="UX score to share in the report")
    seo_score: float = Field(..., description="SEO score to share in the report")
    estimated_loss: float = Field(..., ge=0, description="Estimated monthly loss in INR")
    top_issues: List[str] = Field(
        default_factory=list,
        description="Top issues to highlight inside the email body",
    )
