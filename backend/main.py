from fastapi import FastAPI

from app.api.health import router as health_router
from app.core.logging import setup_logging
from app.core.config import settings


logger = setup_logging()
app = FastAPI(title=settings.app_name)
app.include_router(health_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Serein DataHub API is running"}
