"""Интеграционные тесты пересоздают схему. Работают только на базе с суффиксом _test."""

from sqlalchemy.engine import make_url


class NotATestDatabaseError(RuntimeError):
    pass


def require_test_database(url: str) -> str:
    name = make_url(url).database or ""
    if not name.endswith("_test"):
        raise NotATestDatabaseError(
            f"TEST_DATABASE_URL указывает на базу «{name}»: тесты стирают схему, "
            "нужна база с суффиксом _test"
        )
    return url
