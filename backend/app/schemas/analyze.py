from typing import List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequest(BaseModel):
    url: HttpUrl = Field(..., description="Public website URL to evaluate")
    visitors: Optional[int] = Field(
        default=None,
        gt=0,
        description="Monthly visitors used for revenue estimation",
    )
    conversion_rate: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Conversion rate percentage (0-100)",
    )
    avg_order_value: Optional[float] = Field(
        default=None,
        ge=0,
        description="Average order value in INR used for revenue estimation",
    )


class Issue(BaseModel):
    area: Literal["ux", "seo", "performance", "content"]
    description: str
    severity: Literal["low", "medium", "high"]
    priority_score: float = Field(
        default=0,
        ge=0,
        description="Calculated priority score used for sorting issues",
    )
    priority_label: Literal["High Impact", "Medium Impact",
                            "Low Impact"] = "Low Impact"


class Suggestion(BaseModel):
    title: str
    rationale: str
    expected_outcome: Optional[str] = None


class BusinessImpact(BaseModel):
    summary: str
    confidence: Literal["low", "medium", "high"] = "medium"


class SeoSnapshot(BaseModel):
    title: Optional[str]
    meta_description: Optional[str]
    meta_keywords: Optional[str]
    h1: List[str]
    h2: List[str]
    has_viewport_meta: bool = False
    responsive_class_count: int = 0
    script_count: int = 0
    image_count: int = 0
    form_count: int = 0
    cta_count: int = 0
    load_time_ms: Optional[float] = None


class AnalyzeResponse(BaseModel):
    ux_score: int = Field(ge=0, le=100)
    seo_score: int = Field(ge=0, le=100)
    mobile_score: int = Field(ge=0, le=100)
    performance_score: int = Field(ge=0, le=100)
    lead_score: int = Field(ge=0, le=100)
    growth_score: int = Field(ge=0, le=100)
    estimated_monthly_loss: int = Field(
        description="Estimated monthly revenue impact in INR"
    )
    estimated_conversion_loss: float = Field(
        description="Estimated percentage drop in conversions"
    )
    estimated_traffic_loss: float = Field(
        description="Estimated percentage drop in traffic"
    )
    issues: List[Issue]
    suggestions: List[Suggestion]
    business_impact: BusinessImpact
    seo_snapshot: SeoSnapshot
    screenshot_b64: Optional[str] = Field(
        default=None,
        description="Base64 encoded screenshot captured via Playwright",
    )
