from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Used by:
    - Docker
    - Kubernetes
    - Load Balancers
    - Monitoring
    """

    return {
        "status": "healthy",
        "service": "Serein DataHub Agent",
    }