"""AI settings routes: switch the active provider and update API keys live.

Keys are write-only from the frontend's perspective — responses only ever
report whether a provider is "configured", never the key value itself.
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import settings_service

logger = logging.getLogger("settings")
router = APIRouter(tags=["settings"])


class ProviderUpdate(BaseModel):
    provider: str


class ApiKeyUpdate(BaseModel):
    provider: str
    api_key: str = Field(min_length=1)


def _validate_provider(provider: str) -> str:
    provider = (provider or "").lower().strip()
    if provider not in settings_service.PROVIDER_META:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'.")
    return provider


@router.get("/settings/ai")
async def get_ai_settings():
    return await settings_service.get_status()


@router.put("/settings/ai/provider")
async def update_provider(body: ProviderUpdate):
    provider = _validate_provider(body.provider)
    if not settings_service.PROVIDER_META[provider]["available"]:
        raise HTTPException(status_code=400, detail=f"'{provider}' is not available yet.")
    await settings_service.set_provider(provider)
    logger.info("AI provider switched to %s", provider)
    return await settings_service.get_status()


@router.put("/settings/ai/api-key")
async def update_api_key(body: ApiKeyUpdate):
    provider = _validate_provider(body.provider)
    api_key = body.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
    await settings_service.set_api_key(provider, api_key)
    logger.info("API key updated for provider %s", provider)
    return await settings_service.get_status()
