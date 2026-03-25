import asyncio
import json
from typing import Any, Dict, List

from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, ValidationError

from ..core.config import get_settings
from ..schemas.analyze import SeoSnapshot
from .errors import AIServiceError

SYSTEM_PROMPT = (
    "You are ConvertX AI, a senior UX designer and SEO strategist specializing in conversion optimization and business impact.\n\n"
    "Your goal is to analyze website data and identify issues that directly affect:\n"
    "- user engagement\n"
    "- conversion rates\n"
    "- SEO ranking\n\n"
    "Focus strongly on:\n"
    "- CTA visibility and placement\n"
    "- layout clarity and visual hierarchy\n"
    "- readability and accessibility\n"
    "- heading structure and keyword usage\n"
    "- user journey and friction points\n\n"
    "Give insights that are specific, practical, and business-focused.\n"
    "Avoid generic advice.\n"
    "Prioritize high-impact issues.\n\n"
    "Respond ONLY with valid JSON matching the required schema."
)


class AIMessage(BaseModel):
    title: str
    description: str


class AIAnalysis(BaseModel):
    ux_score: int
    seo_score: int
    issues: List[AIMessage]
    suggestions: List[AIMessage]
    business_impact: List[str]


def _build_payload(snapshot: SeoSnapshot, signals: Dict[str, bool]) -> Dict[str, Any]:
    payload = snapshot.model_dump()
    payload["signals"] = signals
    return payload


def _extract_output_text(response: Any) -> str:
    text = getattr(response, "output_text", None)
    if isinstance(text, list):
        text = "\n".join(text)
    if isinstance(text, str) and text.strip():
        return text

    output = getattr(response, "output", None)
    if output is None and isinstance(response, dict):
        output = response.get("output")

    if output:
        chunks: List[str] = []
        for item in output:
            content = getattr(item, "content", None) or item.get("content") if isinstance(item, dict) else None
            if not content:
                continue
            for piece in content:
                ptype = getattr(piece, "type", None) or piece.get("type") if isinstance(piece, dict) else None
                if ptype == "output_text":
                    text_value = getattr(piece, "text", None) or piece.get("text") if isinstance(piece, dict) else None
                    if text_value:
                        chunks.append(str(text_value))
        if chunks:
            return "\n".join(chunks)

    raise AIServiceError("AI response missing text payload", status_code=502)


async def analyze_with_ai(snapshot: SeoSnapshot, signals: Dict[str, bool]) -> AIAnalysis:
    settings = get_settings()
    if not settings.openai_api_key:
        raise AIServiceError("OpenAI API key is not configured")

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
    )

    payload = _build_payload(snapshot, signals)
    user_payload = json.dumps(payload, ensure_ascii=False, indent=2)

    try:
        response = await client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "developer",
                    "content": [
                        {"type": "text", "text": SYSTEM_PROMPT},
                        {
    "type": "text",
    "text": (
        "Return strictly valid JSON in this format:\n"
        "{\n"
        '  "ux_score": number (0-100),\n'
        '  "seo_score": number (0-100),\n'
        '  "issues": [\n'
        '    { "title": string, "description": string }\n'
        "  ],\n"
        '  "suggestions": [\n'
        '    { "title": string, "description": string }\n'
        "  ],\n"
        '  "business_impact": [\n'
        "    string\n"
        "  ]\n"
        "}\n\n"
        "All insights must be actionable and tied to business outcomes like conversions, engagement, or traffic."
    ),
},
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Website crawl findings and diagnostic signals:\n"
                                f"{user_payload}\n"
                                "Focus on conversions, readability, CTA placement, and SEO rankings."
                            ),
                        }
                    ],
                },
            ],
            format={"type": "json_object"},
            temperature=0.2,
            max_output_tokens=800,
        )
    except asyncio.TimeoutError as exc:
        raise AIServiceError("AI analysis timed out", status_code=504) from exc
    except OpenAIError as exc:
        raise AIServiceError("OpenAI API error") from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise AIServiceError("Unexpected AI failure") from exc

    text_response = _extract_output_text(response)
    try:
        parsed = json.loads(text_response)
    except json.JSONDecodeError as exc:
        raise AIServiceError("AI returned invalid JSON", status_code=502) from exc

    try:
        return AIAnalysis.model_validate(parsed)
    except ValidationError as exc:
        raise AIServiceError("AI JSON did not match schema", status_code=502) from exc
