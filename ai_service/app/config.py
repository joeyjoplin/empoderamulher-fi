from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 1024
    anthropic_timeout_seconds: float = 30.0
    anthropic_max_retries: int = 2
    log_level: str = "info"
    cors_allow_origins: list[str] = ["*"]
    database_url: str = "sqlite:///./empowerfi.db"


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
