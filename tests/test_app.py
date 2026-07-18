from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_home_loads():
    response = client.get("/")
    assert response.status_code == 200
    assert "AIOS ONE" in response.text


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "aios-one"
    assert body["version"] == "3.0.0"


def test_rejects_unsupported_upload():
    response = client.post("/api/upload", files={"file": ("malware.exe", b"no", "application/octet-stream")})
    assert response.status_code == 415
