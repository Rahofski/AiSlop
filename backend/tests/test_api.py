import httpx


async def test_subject_crud_and_task_flow(auth_client: httpx.AsyncClient) -> None:
    created = await auth_client.post(
        "/api/subjects", json={"name": "C# Programming", "teacher": "Petrova"}
    )
    assert created.status_code == 201
    subject = created.json()
    assert subject["name"] == "C# Programming"

    listed = await auth_client.get("/api/subjects")
    assert listed.status_code == 200
    assert listed.json()[0]["task_count"] == 0

    task_resp = await auth_client.post(
        "/api/tasks",
        json={
            "prompt_text": "Write a matrix calculator console app with unit tests",
            "subject_id": subject["id"],
            "tasktype_id": "csharp-console",
        },
    )
    assert task_resp.status_code == 201
    task = task_resp.json()
    assert task["status"] == "queued"
    assert task["kind"] == "code"
    assert len(task["title"]) <= 48

    listed = await auth_client.get("/api/subjects")
    assert listed.json()[0]["task_count"] == 1

    detail = await auth_client.get(f"/api/tasks/{task['id']}")
    assert detail.status_code == 200
    assert detail.json()["prompt_text"].startswith("Write a matrix")
    assert detail.json()["steps"] == []


async def test_task_filters(auth_client: httpx.AsyncClient) -> None:
    subject = (await auth_client.post("/api/subjects", json={"name": "Databases"})).json()
    await auth_client.post(
        "/api/tasks",
        json={
            "prompt_text": "SQL queries",
            "subject_id": subject["id"],
            "tasktype_id": "csharp-console",
        },
    )
    await auth_client.post(
        "/api/tasks",
        json={
            "prompt_text": "Report on ER models",
            "subject_id": subject["id"],
            "tasktype_id": "docx-report",
        },
    )

    all_tasks = (await auth_client.get("/api/tasks")).json()
    assert len(all_tasks) == 2

    docs = (await auth_client.get("/api/tasks", params={"kind": "doc"})).json()
    assert len(docs) == 1
    assert docs[0]["tasktype_id"] == "docx-report"

    recent = (await auth_client.get("/api/tasks", params={"days": 7})).json()
    assert len(recent) == 2

    other_subject = (await auth_client.get("/api/tasks", params={"subject_id": "missing"})).json()
    assert other_subject == []


async def test_task_for_unknown_subject(auth_client: httpx.AsyncClient) -> None:
    response = await auth_client.post(
        "/api/tasks",
        json={"prompt_text": "x", "subject_id": "nope", "tasktype_id": "csharp-console"},
    )
    assert response.status_code == 404
