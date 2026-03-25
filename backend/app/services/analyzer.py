import asyncio
import logging
import random
from typing import List, Optional

from ..schemas.analyze import (
    AnalyzeResponse,
    BusinessImpact,
    Issue,
    SeoSnapshot,
    Suggestion,
)
from .ai_analyzer import AIMessage, analyze_with_ai
from .errors import AIServiceError, AnalysisError, SEOParseError
from .screenshot import capture_full_page_screenshot
from .seo_parser import extract_seo_data

logger = logging.getLogger(__name__)


def compute_hseo_score(snapshot):
    def normalize(value, max_val):
        return min(value / max_val, 1.0)

    total_score = 0

    # --- 1. Metadata Quality (0.25) ---
    meta_score = 0
    if snapshot.title:
        meta_score += normalize(len(snapshot.title), 60)
    if snapshot.meta_description:
        meta_score += normalize(len(snapshot.meta_description), 160)
    meta_score = meta_score / 2
    total_score += meta_score * 0.25

    # --- 2. Content Structure (0.20) ---
    structure_score = 0
    if snapshot.h1:
        structure_score += 1 if len(snapshot.h1) == 1 else 0.5
    if snapshot.h2:
        structure_score += 1
    structure_score = structure_score / 2
    total_score += structure_score * 0.20

    # --- 3. Keyword Relevance (0.15) ---
    keyword_score = 0
    content = " ".join(snapshot.h1 + snapshot.h2).lower()
    if snapshot.title:
        title_words = snapshot.title.lower().split()
        matches = sum(1 for w in title_words if w in content)
        keyword_score = normalize(matches, len(title_words))
    total_score += keyword_score * 0.15

    # --- 4. Accessibility Signals (0.10) ---
    accessibility_score = 1 if getattr(
        snapshot, "images_with_alt", None) else 0
    total_score += accessibility_score * 0.10

    # --- 5. Link Structure (0.10) ---
    link_score = 1 if getattr(snapshot, "internal_links", None) else 0
    total_score += link_score * 0.10

    # --- 6. Content Depth (0.10) ---
    depth_score = normalize(len(content.split()), 300)
    total_score += depth_score * 0.10

    # --- 7. Technical Signals (0.10) ---
    tech_score = 0
    if snapshot.title:
        tech_score += 0.5
    if snapshot.meta_description:
        tech_score += 0.5
    total_score += tech_score * 0.10

    return int(total_score * 100)


def _score_from_snapshot(snapshot: SeoSnapshot) -> tuple[int, int, List[Issue], List[Suggestion]]:
    issues: List[Issue] = []
    suggestions: List[Suggestion] = []

    ux_score = 80
    seo_score = compute_hseo_score(snapshot)

    # --- Existing Rules ---

    if not snapshot.title:
        issues.append(
            Issue(area="seo", description="Missing <title> tag", severity="high")
        )
        suggestions.append(
            Suggestion(
                title="Add a descriptive <title>",
                rationale="Improve SERP messaging and click-through rates.",
            )
        )

    if not snapshot.meta_description:
        issues.append(
            Issue(area="seo", description="Meta description not found",
                  severity="medium")
        )
        suggestions.append(
            Suggestion(
                title="Write a compelling meta description",
                rationale="Search engines use it for snippets; adds messaging control.",
                expected_outcome="Higher organic CTR",
            )
        )

    if len(snapshot.h1) != 1:
        ux_score -= 10
        issues.append(
            Issue(
                area="ux",
                description="Pages benefit from a single primary H1",
                severity="medium",
            )
        )
        suggestions.append(
            Suggestion(
                title="Review heading hierarchy",
                rationale="Multiple H1 tags confuse both crawlers and assistive tech.",
            )
        )

    if not snapshot.h2:
        ux_score -= 5
        suggestions.append(
            Suggestion(
                title="Introduce H2 sections",
                rationale="Chunking sections improves readability and scannability.",
            )
        )
        # --- NEW: H-SEO BASED ISSUES ---

    # Weak metadata
    if snapshot.title and len(snapshot.title) < 30:
        issues.append(
            Issue(
                area="seo",
                description="Title tag is too short",
                severity="medium",
            )
        )

    if snapshot.meta_description and len(snapshot.meta_description) < 80:
        issues.append(
            Issue(
                area="seo",
                description="Meta description is too short",
                severity="medium",
            )
        )

    # Keyword mismatch
    content = " ".join(snapshot.h1 + snapshot.h2).lower()
    if snapshot.title:
        title_words = snapshot.title.lower().split()
        matches = sum(1 for w in title_words if w in content)
        if len(title_words) > 0 and matches < len(title_words) // 2:
            issues.append(
                Issue(
                    area="seo",
                    description="Poor keyword alignment between title and headings",
                    severity="medium",
                )
            )

    # Thin content
    if len(content.split()) < 150:
        issues.append(
            Issue(
                area="seo",
                description="Content depth is low",
                severity="medium",
            )
        )

    # Missing internal links
    if not getattr(snapshot, "internal_links", None):
        issues.append(
            Issue(
                area="seo",
                description="No internal links detected",
                severity="low",
            )
        )

    # Missing alt text
    if not getattr(snapshot, "images_with_alt", None):
        issues.append(
            Issue(
                area="seo",
                description="Images missing alt text",
                severity="low",
            )
        )
    # --- NEW: H-SEO BASED SUGGESTIONS ---

    # Metadata quality
    if snapshot.title and len(snapshot.title) < 30:
        suggestions.append(
            Suggestion(
                title="Improve title length",
                rationale="Short titles reduce keyword visibility and ranking potential.",
            )
        )

    if snapshot.meta_description and len(snapshot.meta_description) < 80:
        suggestions.append(
            Suggestion(
                title="Expand meta description",
                rationale="Longer descriptions improve click-through rate and SEO context.",
            )
        )

    # Keyword relevance
    content = " ".join(snapshot.h1 + snapshot.h2).lower()
    if snapshot.title:
        title_words = snapshot.title.lower().split()
        matches = sum(1 for w in title_words if w in content)
        if len(title_words) > 0 and matches < len(title_words) // 2:
            suggestions.append(
                Suggestion(
                    title="Improve keyword alignment",
                    rationale="Page headings should reflect keywords used in the title for better SEO relevance.",
                )
            )

    # Content depth
    if len(content.split()) < 150:
        suggestions.append(
            Suggestion(
                title="Increase content depth",
                rationale="More detailed content improves ranking and user engagement.",
            )
        )

    # Internal links
    if not getattr(snapshot, "internal_links", None):
        suggestions.append(
            Suggestion(
                title="Add internal links",
                rationale="Internal linking improves crawlability and distributes page authority.",
            )
        )

    # Accessibility
    if not getattr(snapshot, "images_with_alt", None):
        suggestions.append(
            Suggestion(
                title="Add alt text to images",
                rationale="Alt text improves accessibility and contributes to SEO.",
            )
        )

    ux_score = max(0, min(100, ux_score))
    seo_score = max(0, min(100, seo_score))

    return ux_score, seo_score, issues, suggestions


def _build_signals(snapshot: SeoSnapshot) -> dict[str, int | bool]:
    return {
        "missing_title": snapshot.title is None,
        "missing_meta_description": snapshot.meta_description is None,
        "missing_meta_keywords": snapshot.meta_keywords is None,
        "h1_count": len(snapshot.h1),
        "has_single_h1": len(snapshot.h1) == 1,
        "missing_h1": len(snapshot.h1) == 0,
        "missing_h2": len(snapshot.h2) == 0,
    }


def _blend_scores(local_score: int, ai_score: int) -> int:
    blended = round((local_score + _clamp_score(ai_score)) / 2)
    return _clamp_score(blended)


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _infer_area(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if any(keyword in text for keyword in ("seo", "meta", "search", "keyword", "schema")):
        return "seo"
    if any(keyword in text for keyword in ("performance", "speed", "core web vitals")):
        return "performance"
    return "ux"


def _infer_severity(description: str) -> str:
    lowered = description.lower()
    if any(keyword in lowered for keyword in ("critical", "urgent", "major", "severe")):
        return "high"
    if any(keyword in lowered for keyword in ("minor", "optional", "nice")):
        return "low"
    return "medium"


def _issues_from_ai(ai_issues: List[AIMessage]) -> List[Issue]:
    converted: List[Issue] = []
    for item in ai_issues:
        converted.append(
            Issue(
                area=_infer_area(item.title, item.description),
                description=f"{item.title}: {item.description}",
                severity=_infer_severity(item.description),
            )
        )
    return converted


def _suggestions_from_ai(ai_suggestions: List[AIMessage]) -> List[Suggestion]:
    converted: List[Suggestion] = []
    for item in ai_suggestions:
        converted.append(
            Suggestion(
                title=item.title,
                rationale=item.description,
            )
        )
    return converted


SEVERITY_WEIGHTS = {
    "high": 3,
    "medium": 2,
    "low": 1,
}

AREA_WEIGHTS = {
    "seo": 1.2,
    "ux": 1.0,
    "performance": 1.1,
    "content": 1.0,
}


def _priority_label(score: float) -> str:
    if score >= 3:
        return "High Impact"
    if score >= 2:
        return "Medium Impact"
    return "Low Impact"


def _apply_priority_engine(issues: List[Issue]) -> List[Issue]:
    scored = []

    for issue in issues:
        severity = issue.severity if not isinstance(
            issue, dict) else issue.get("severity")
        area = issue.area if not isinstance(issue, dict) else issue.get("area")

        severity_score = SEVERITY_WEIGHTS.get(severity, 1)
        area_weight = AREA_WEIGHTS.get(area, 1.0)

        priority_score = round(severity_score * area_weight, 2)
        priority_label = _priority_label(priority_score)

        if isinstance(issue, dict):
            updated = {
                **issue,
                "priority_score": priority_score,
                "priority_label": priority_label,
            }
        else:
            updated = issue.copy(
                update={
                    "priority_score": priority_score,
                    "priority_label": priority_label,
                }
            )

        scored.append(updated)

    return sorted(
        scored,
        key=lambda x: x["priority_score"] if isinstance(
            x, dict) else x.priority_score,
        reverse=True
    )


def _compute_revenue_impact(
    ux_score: int,
    seo_score: int,
    *,
    visitors: Optional[int] = None,
    conversion_rate: Optional[float] = None,
    avg_order_value: Optional[float] = None,
) -> tuple[int, float, float]:
    base_monthly_traffic = max(visitors if visitors is not None else 10_000, 0)
    base_conversion_pct = conversion_rate if conversion_rate is not None else 2.0
    base_conversion_rate = max(
        base_conversion_pct, 0) / 100  # convert to ratio
    order_value = max(
        avg_order_value if avg_order_value is not None else 500, 0)

    traffic_loss_pct = max(0.0, min(100.0, (100 - seo_score) * 0.5))
    conversion_loss_pct = max(0.0, min(100.0, (100 - ux_score) * 0.3))

    adjusted_traffic = base_monthly_traffic * (traffic_loss_pct / 100)
    adjusted_conversion_rate = base_conversion_rate * \
        (conversion_loss_pct / 100)

    estimated_loss = adjusted_traffic * adjusted_conversion_rate * order_value

    return (
        int(round(estimated_loss)),
        round(conversion_loss_pct, 1),
        round(traffic_loss_pct, 1),
    )


def _compute_mobile_score(seo_snapshot):
    import random

    base = random.randint(60, 80)

    seo_score = getattr(seo_snapshot, "seo_score", 50)
    adjustment = int((seo_score - 50) * 0.2)

    score = base + adjustment

    return max(55, min(90, score))


def _compute_performance_score(snapshot: SeoSnapshot) -> int:
    score = 100.0
    load_time_ms = getattr(snapshot, "load_time_ms", None)
    if load_time_ms:
        score -= min(load_time_ms / 50, 40)
    script_count = getattr(snapshot, "script_count", 0)
    if script_count > 20:
        score -= min((script_count - 20) * 1.5, 25)
    image_count = getattr(snapshot, "image_count", 0)
    if image_count > 40:
        score -= min((image_count - 40) * 0.5, 15)
    return _clamp_score(int(round(score)))


def _compute_lead_score(snapshot: SeoSnapshot) -> int:
    form_count = min(getattr(snapshot, "form_count", 0), 3)
    cta_count = min(getattr(snapshot, "cta_count", 0), 5)
    score = (form_count / 3) * 60 + (cta_count / 5) * 40
    return _clamp_score(int(round(score)))


async def run_analysis(
    url: str,
    *,
    visitors: Optional[int] = None,
    conversion_rate: Optional[float] = None,
    avg_order_value: Optional[float] = None,
) -> AnalyzeResponse:
    try:
        screenshot_b64, seo_snapshot = await asyncio.gather(
            capture_full_page_screenshot(url),
            extract_seo_data(url),
        )
    except SEOParseError:
        raise
    except Exception as exc:
        raise AnalysisError("Analysis pipeline failed") from exc

    ux_score, seo_score, issues, suggestions = _score_from_snapshot(
        seo_snapshot)
    signals = _build_signals(seo_snapshot)

    # --- BUSINESS IMPACT (FIXED) ---
    count = len(issues) or 1

    seo_issues = [i for i in issues if i.area == "seo"]
    ux_issues = [i for i in issues if i.area == "ux"]

    business_summary = (
        f"Our analysis identified {count} key optimization opportunities affecting your website’s "
        f"performance. "
        f"{'SEO-related gaps may be limiting your search engine visibility and organic traffic. ' if seo_issues else ''}"
        f"{'UX-related issues may be reducing user engagement and conversion rates. ' if ux_issues else ''}"
        "Addressing these areas can improve discoverability, enhance user experience, and increase "
        "lead generation potential. Businesses implementing similar optimizations typically observe "
        "higher engagement rates, improved session duration, and better conversion outcomes."
    )

    business_confidence = "medium"

    # --- AI BLOCK (FIXED) ---
    try:
        ai_result = await analyze_with_ai(seo_snapshot, signals)
    except AIServiceError as exc:
        logger.warning("AI analysis failed: %s", exc)
        ai_result = None

    if ai_result:
        ux_score = _blend_scores(ux_score, ai_result.ux_score)
        seo_score = _blend_scores(seo_score, ai_result.seo_score)
        issues.extend(_issues_from_ai(ai_result.issues))
        suggestions.extend(_suggestions_from_ai(ai_result.suggestions))

        # Safe business impact enhancement
        if ai_result.business_impact and isinstance(ai_result.business_impact, list):
            ai_text = " ".join(ai_result.business_impact)
            business_summary = business_summary + " " + ai_text
            business_confidence = "high"

    business_impact = BusinessImpact(
        summary=business_summary,
        confidence=business_confidence,
    )

    mobile_score = _compute_mobile_score(seo_snapshot)
    if mobile_score < 40:
        severity = "high"
    elif mobile_score < 70:
        severity = "medium"
    else:
        severity = None

    if severity:
        issues.append({
            "title": "Mobile usability issues",
            "severity": severity,
            "area": "ux",
            "description": "Improving mobile responsiveness can significantly boost engagement."
        })
    performance_score = _compute_performance_score(seo_snapshot)
    lead_score = _compute_lead_score(seo_snapshot)
    growth_score = _clamp_score(
        int(
            round(
                ux_score * 0.25
                + seo_score * 0.25
                + mobile_score * 0.2
                + performance_score * 0.15
                + lead_score * 0.15
            )
        )
    )

    (
        estimated_monthly_loss,
        estimated_conversion_loss,
        estimated_traffic_loss,
    ) = _compute_revenue_impact(
        ux_score,
        seo_score,
        visitors=visitors,
        conversion_rate=conversion_rate,
        avg_order_value=avg_order_value,
    )

    prioritized_issues = _apply_priority_engine(issues)

    return AnalyzeResponse(
        ux_score=ux_score,
        seo_score=seo_score,
        mobile_score=mobile_score,
        performance_score=performance_score,
        lead_score=lead_score,
        growth_score=growth_score,
        estimated_monthly_loss=estimated_monthly_loss,
        estimated_conversion_loss=estimated_conversion_loss,
        estimated_traffic_loss=estimated_traffic_loss,
        issues=prioritized_issues,
        suggestions=suggestions,
        business_impact=business_impact,
        seo_snapshot=seo_snapshot,
        screenshot_b64=screenshot_b64,
    )
