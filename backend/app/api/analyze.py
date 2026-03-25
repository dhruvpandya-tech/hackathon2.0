from fastapi import APIRouter, HTTPException
from ..schemas.analyze import AnalyzeRequest, AnalyzeResponse
from ..services.analyzer import run_analysis
from ..services.errors import AnalysisError

router = APIRouter(prefix="/analyze", tags=["analysis"])


@router.post("", response_model=AnalyzeResponse)
async def analyze_endpoint(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return await run_analysis(
            str(payload.url),
            visitors=payload.visitors,
            conversion_rate=payload.conversion_rate,
            avg_order_value=payload.avg_order_value,
        )
    except AnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
