from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Serein DataHub Agent"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    LOG_LEVEL: str = "INFO"

    # --- LLM provider (see 08_LANGGRAPH_SPEC.md) ---
    LLM_PROVIDER: str = "nim"          # "nim" | "ollama"
    LLM_MODEL: str = "qwen2.5-coder"
    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_TEMPERATURE: float = 0.2

    # NVIDIA NIM (primary, OpenAI-compatible)
    NVIDIA_API_KEY: str = ""
    NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"

    # Ollama (fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"

    # --- DataHub (see 09_DATAHUB_SPEC.md) ---
    DATAHUB_PROVIDER: str = "fixtures"  # "mcp" | "fixtures"
    DATAHUB_MCP_URL: str = ""
    DATAHUB_MCP_TOKEN: str = ""
    DATAHUB_GRAPHQL_URL: str = ""
    DATAHUB_GRAPHQL_TOKEN: str = ""
    DATAHUB_TIMEOUT_SECONDS: float = 15.0
    DATAHUB_FIXTURE: str = "sales_dashboard"

    # --- GitHub (see 10_GITHUB_SPEC.md) ---
    GITHUB_TOKEN: str = ""
    GITHUB_REPOSITORY: str = ""          # "owner/repo"
    GITHUB_BASE_BRANCH: str = "main"
    GITHUB_DRAFT_PR: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()