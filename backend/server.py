"""Lease Abstraction Assistant — FastAPI entrypoint."""
import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

logging.basicConfig(level=logging.INFO)

from routes import documents as documents_route  # noqa: E402
from routes import export as export_route  # noqa: E402
from routes import settings as settings_route  # noqa: E402
from routes import upload as upload_route  # noqa: E402
from db import db  # noqa: E402
from services import settings_service  # noqa: E402

app = FastAPI(title="Lease Abstraction Assistant")

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (upload_route.router, documents_route.router, export_route.router, settings_route.router):
    # Vercel Services strips the /api service prefix before invoking FastAPI.
    # Keep prefixed routes too so local development continues to use /api.
    app.include_router(router)
    app.include_router(router, prefix="/api")


@app.get("/health")
@app.get("/api/health")
async def health():
    db_connected = False
    db_error = None
    try:
        await db.command("ping")
        db_connected = True
    except Exception as exc:
        db_error = type(exc).__name__

    ai_status = await settings_service.get_status()
    active = next((p for p in ai_status["providers"] if p["key"] == ai_status["provider"]), None)

    return {
        "status": "ok",
        "ai_provider": ai_status["provider"],
        "ai_key_configured": bool(active and active["configured"]),
        "db_connected": db_connected,
        "db_error": db_error,
    }
