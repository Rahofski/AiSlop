import httpx

REGISTER = {"email": "student@example.com", "name": "Student", "password": "secret-pass-1"}


async def test_register_login_me(client: httpx.AsyncClient) -> None:
    registered = await client.post("/api/auth/register", json=REGISTER)
    assert registered.status_code == 201
    body = registered.json()
    assert body["user"]["email"] == "student@example.com"
    assert "password" not in body["user"]

    logged_in = await client.post(
        "/api/auth/login", json={"email": "Student@Example.com", "password": "secret-pass-1"}
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["access_token"]

    me = await client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["name"] == "Student"


async def test_register_duplicate_email(client: httpx.AsyncClient) -> None:
    assert (await client.post("/api/auth/register", json=REGISTER)).status_code == 201
    duplicate = await client.post(
        "/api/auth/register", json={**REGISTER, "name": "Other", "password": "another-pass"}
    )
    assert duplicate.status_code == 409


async def test_login_wrong_password(client: httpx.AsyncClient) -> None:
    await client.post("/api/auth/register", json=REGISTER)
    response = await client.post(
        "/api/auth/login", json={"email": REGISTER["email"], "password": "wrong-password"}
    )
    assert response.status_code == 401


async def test_protected_routes_require_auth(client: httpx.AsyncClient) -> None:
    for path in ("/api/me", "/api/subjects", "/api/tasks"):
        assert (await client.get(path)).status_code == 401
    junk = await client.get("/api/me", headers={"Authorization": "Bearer junk"})
    assert junk.status_code == 401


async def test_data_is_scoped_per_user(client: httpx.AsyncClient) -> None:
    first = await client.post("/api/auth/register", json=REGISTER)
    first_token = first.json()["access_token"]
    first_auth = {"Authorization": f"Bearer {first_token}"}
    subject = (
        await client.post("/api/subjects", json={"name": "C#"}, headers=first_auth)
    ).json()
    await client.post(
        "/api/tasks",
        json={"prompt_text": "task", "subject_id": subject["id"], "tasktype_id": "csharp-console"},
        headers=first_auth,
    )

    second = await client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "name": "Other", "password": "other-pass-1"},
    )
    second_auth = {"Authorization": f"Bearer {second.json()['access_token']}"}

    assert (await client.get("/api/subjects", headers=second_auth)).json() == []
    assert (await client.get("/api/tasks", headers=second_auth)).json() == []
    foreign_task = await client.post(
        "/api/tasks",
        json={"prompt_text": "x", "subject_id": subject["id"], "tasktype_id": "csharp-console"},
        headers=second_auth,
    )
    assert foreign_task.status_code == 404
