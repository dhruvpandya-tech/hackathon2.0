from bs4 import BeautifulSoup
import httpx
from httpx import HTTPError
from ..core.config import get_settings
from ..schemas.analyze import SeoSnapshot
from .errors import SEOParseError


async def extract_seo_data(url: str) -> SeoSnapshot:
    settings = get_settings()
    try:
        async with httpx.AsyncClient(
            timeout=settings.http_timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": "ConvertXAI/0.1"},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except HTTPError as exc:  # pragma: no cover - requires network failures
        raise SEOParseError("Unable to download page for SEO analysis", status_code=502) from exc

    soup = BeautifulSoup(response.text, "html.parser")
    title_tag = soup.find("title")
    meta_desc = soup.find("meta", attrs={"name": "description"})
    meta_keywords = soup.find("meta", attrs={"name": "keywords"})
    viewport_meta = soup.find("meta", attrs={"name": "viewport"})

    h1_tags = [tag.get_text(strip=True) for tag in soup.find_all("h1") if tag.get_text(strip=True)]
    h2_tags = [tag.get_text(strip=True) for tag in soup.find_all("h2") if tag.get_text(strip=True)]

    responsive_keywords = ("responsive", "mobile", "sm:", "md:", "lg:", "xl:", "flex", "grid")
    responsive_class_count = 0
    for tag in soup.find_all(class_=True):
        classes = tag.get("class") or []
        for cls in classes:
            cls_lower = cls.lower()
            if any(keyword in cls_lower for keyword in responsive_keywords):
                responsive_class_count += 1
                break

    script_count = len(soup.find_all("script"))
    image_count = len(soup.find_all("img"))
    forms = soup.find_all("form")
    form_count = len(forms)
    cta_keywords = ("buy", "contact", "get started", "start now", "book", "schedule", "sign up", "talk", "demo")
    cta_count = 0
    for element in soup.find_all(["a", "button"]):
        text = element.get_text(strip=True).lower()
        if text and any(keyword in text for keyword in cta_keywords):
            cta_count += 1

    load_time_ms = None
    if getattr(response, "elapsed", None):
        load_time_ms = round(response.elapsed.total_seconds() * 1000, 2)

    return SeoSnapshot(
        title=title_tag.get_text(strip=True) if title_tag else None,
        meta_description=meta_desc.get("content") if meta_desc else None,
        meta_keywords=meta_keywords.get("content") if meta_keywords else None,
        h1=h1_tags,
        h2=h2_tags,
        has_viewport_meta=viewport_meta is not None,
        responsive_class_count=responsive_class_count,
        script_count=script_count,
        image_count=image_count,
        form_count=form_count,
        cta_count=cta_count,
        load_time_ms=load_time_ms,
    )
