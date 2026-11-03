"""`make test` не трогает dev-базу: фикстура отказывается работать без суффикса _test."""

import pytest

from tests.db_guard import NotATestDatabaseError, require_test_database


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://postgres@localhost:55201/shopprobe",
        "postgresql+psycopg://postgres:postgres@localhost:5432/app",
        "postgresql+psycopg://postgres@localhost:5432/test_app",
    ],
)
def test_refuses_non_test_database(url: str) -> None:
    with pytest.raises(NotATestDatabaseError, match="_test"):
        require_test_database(url)


def test_accepts_test_database() -> None:
    url = "postgresql+psycopg://postgres:postgres@localhost:5432/app_test"
    assert require_test_database(url) == url
