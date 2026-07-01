from fastapi.testclient import TestClient

from app.main import app, fastapi_app


def test_localhost_8082_preflight_is_allowed():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.options(
        "/api/auth/register",
        headers={
            "Origin": "http://localhost:8082",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8082"


def test_server_errors_still_include_cors_headers():
    async def force_error():
        raise RuntimeError("forced CORS probe")

    route_count = len(fastapi_app.router.routes)
    fastapi_app.add_api_route("/__tests__/cors-error", force_error, methods=["GET"])

    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(
            "/__tests__/cors-error",
            headers={"Origin": "http://localhost:8082"},
        )
    finally:
        del fastapi_app.router.routes[route_count:]

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://localhost:8082"
