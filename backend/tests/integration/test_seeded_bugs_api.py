"""Серверные посаженные дефекты включаются только флагом (FR-12)."""

from fastapi.testclient import TestClient

from app.seeded_bugs import BROKEN_IMAGE_SLUG


def test_clean_mode_recommendations_always_ok(client: TestClient) -> None:
    assert [client.get("/api/recommendations").status_code for _ in range(4)] == [200] * 4


def test_seeded_recommendations_fail_every_other_call(buggy_client: TestClient) -> None:
    codes = [buggy_client.get("/api/recommendations").status_code for _ in range(4)]
    assert codes == [503, 200, 503, 200]


def test_seeded_broken_image_only_for_one_product(buggy_client: TestClient) -> None:
    broken = buggy_client.get(f"/api/images/{BROKEN_IMAGE_SLUG}.svg")
    assert broken.status_code == 200 and not broken.content.endswith(b"</svg>")
    ok = buggy_client.get("/api/images/sencha-utrennyaya.svg")
    assert ok.content.endswith(b"</svg>")


def test_clean_mode_image_is_whole(client: TestClient) -> None:
    assert client.get(f"/api/images/{BROKEN_IMAGE_SLUG}.svg").content.endswith(b"</svg>")
