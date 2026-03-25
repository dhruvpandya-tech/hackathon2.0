class AnalysisError(Exception):
    """Base error for analysis workflow."""

    def __init__(self, message: str, *, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ScreenshotError(AnalysisError):
    """Raised when Playwright cannot capture the page."""


class SEOParseError(AnalysisError):
    """Raised when SEO metadata extraction fails."""


class AIServiceError(AnalysisError):
    """Placeholder for AI provider failures."""
