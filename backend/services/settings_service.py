"""AI settings service: active provider + per-provider API keys.

Stored in Mongo so they can be changed live from the GUI without a
redeploy/restart. Falls back to environment variables when nothing has
been configured yet, so existing env-based deployments keep working.
"""
import os

from db import db

settings_collection = db["settings"]
SETTINGS_ID = "ai_config"

# key -> (label, available). "available" providers have a working
# extraction implementation; others are shown in the GUI as coming soon.
PROVIDER_META = {
    "gemini": {"label": "Gemini Flash", "available": True},
    "deepseek": {"label": "DeepSeek", "available": True},
    "claude": {"label": "Claude (Anthropic)", "available": False},
}

ENV_KEYS = {
    "gemini": "GEMINI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
}

DEFAULT_PROVIDER = os.environ.get("AI_PROVIDER", "gemini").lower()


async def _get_doc() -> dict:
    return await settings_collection.find_one({"_id": SETTINGS_ID}) or {}


async def get_active_provider() -> str:
    doc = await _get_doc()
    provider = (doc.get("provider") or DEFAULT_PROVIDER).lower()
    return provider if provider in PROVIDER_META else DEFAULT_PROVIDER


async def get_api_key(provider: str) -> str:
    doc = await _get_doc()
    stored = (doc.get("api_keys") or {}).get(provider)
    if stored:
        return stored
    return os.environ.get(ENV_KEYS.get(provider, ""), "")


async def set_provider(provider: str) -> None:
    await settings_collection.update_one(
        {"_id": SETTINGS_ID}, {"$set": {"provider": provider}}, upsert=True
    )


async def set_api_key(provider: str, api_key: str) -> None:
    await settings_collection.update_one(
        {"_id": SETTINGS_ID}, {"$set": {f"api_keys.{provider}": api_key}}, upsert=True
    )


async def get_status() -> dict:
    doc = await _get_doc()
    stored_keys = doc.get("api_keys") or {}
    active = await get_active_provider()

    providers = []
    for key, meta in PROVIDER_META.items():
        configured = bool(stored_keys.get(key)) or bool(os.environ.get(ENV_KEYS.get(key, "")))
        providers.append({
            "key": key,
            "label": meta["label"],
            "available": meta["available"],
            "configured": configured,
        })

    return {"provider": active, "providers": providers}
