from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки только из окружения; значения по умолчанию — для локального стенда."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres@localhost:55201/shopprobe"
    # SEEDED_BUGS=1 включает посаженные дефекты для демонстрации ShopProbe.
    seeded_bugs: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
