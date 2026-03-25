import base64
import logging
from typing import Optional

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

SCREENSHOT_TIMEOUT_MS = 15_000


async def capture_full_page_screenshot(url: str, *, width: int = 1280, height: int = 720) -> Optional[str]:
    """Return a base64 screenshot for the provided URL, or None if capture fails."""

    browser = None
    context = None

    try:
        async with async_playwright() as playwright:
            try:
                browser = await playwright.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                )
                page = await context.new_page()

                try:
                    await page.goto(
                        url,
                        wait_until="domcontentloaded",
                        timeout=SCREENSHOT_TIMEOUT_MS,
                    )
                except PlaywrightTimeoutError as exc:  # pragma: no cover - network variability
                    logger.warning("Screenshot navigation timed out for %s: %s", url, exc)
                    return None
                except Exception as exc:  # pragma: no cover - browser/runtime variability
                    logger.warning("Screenshot navigation failed for %s: %s", url, exc)
                    return None

                try:
                    screenshot_bytes = await page.screenshot(
                        full_page=True,
                        timeout=SCREENSHOT_TIMEOUT_MS,
                    )
                except PlaywrightTimeoutError as exc:  # pragma: no cover - network variability
                    logger.warning("Screenshot capture timed out for %s: %s", url, exc)
                    return None
                except Exception as exc:  # pragma: no cover - browser/runtime variability
                    logger.warning("Screenshot capture failed for %s: %s", url, exc)
                    return None

                return base64.b64encode(screenshot_bytes).decode("ascii")
            finally:
                if context is not None:
                    try:
                        await context.close()
                    except Exception as exc:  # pragma: no cover - cleanup best-effort
                        logger.debug("Failed to close screenshot context for %s: %s", url, exc)
                if browser is not None:
                    try:
                        await browser.close()
                    except Exception as exc:  # pragma: no cover - cleanup best-effort
                        logger.debug("Failed to close screenshot browser for %s: %s", url, exc)
    except Exception as exc:  # pragma: no cover - playwright bootstrap issues
        logger.warning("Unable to initialize screenshot capture for %s: %s", url, exc)
        return None
