import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import chat as chat_router
from app.api.v1 import insights as insights_router
from app.api.v1 import score as score_router
from app.config import Settings, get_settings
from app.db.models import Base
from app.db.session import get_engine, get_session_factory
from app.services.persona_seeder import seed_personas


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if settings.seed_personas_on_startup:
            _run_persona_seeder(settings)
        yield

    app = FastAPI(
        title="EmpowerFI AI Service",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _: Request, exc: Exception
    ) -> JSONResponse:
        logging.exception("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": str(exc)}},
        )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(chat_router.router, prefix="/api/v1")
    app.include_router(insights_router.router, prefix="/api/v1")
    app.include_router(score_router.router, prefix="/api/v1")

    return app


def _run_persona_seeder(_: Settings) -> None:
    """Re-seed personas at startup. Idempotent — upserts rows and replaces
    each persona's transactions; wallet pubkeys + CNPJs are pinned by name.
    Failures are logged and swallowed so a bad seed doesn't down the service.
    """
    try:
        engine = get_engine()
        Base.metadata.create_all(engine)
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE personas "
                    "ADD COLUMN IF NOT EXISTS cnpj_digits varchar(14)"
                )
            )
        factory = get_session_factory()
        with factory() as session:
            generated = seed_personas(session)
        logging.info(
            "Seeded %d personas on startup: %s",
            len(generated),
            ", ".join(p.name for p in generated),
        )
    except Exception:
        logging.exception("Persona seeder failed on startup; continuing")


app = create_app()
