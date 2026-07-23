def test_get_albums_empty(client):
    response = client.get("/albums")
    assert response.status_code == 200
    assert response.json() == []

def test_create_album(client):
    album_data = {
        "main_title": "Test Album",
        "release_date": "2023-01-01",
        "album_type": "Original"
    }
    response = client.post("/albums/", json=album_data)
    # Wait, earlier grep showed `@router.post("/albums/")` or `@router.post("/albums")`
    # Let's see if 307 redirect happens. If so, client follows it.
    assert response.status_code == 200
    data = response.json()
    assert data["main_title"] == "Test Album"
    assert "id" in data

def test_get_album_detail(client):
    album_data = {
        "main_title": "Detail Album",
        "release_date": "2023-01-01",
        "album_type": "Original"
    }
    create_response = client.post("/albums/", json=album_data)
    assert create_response.status_code == 200
    album_id = create_response.json()["id"]

    response = client.get(f"/albums/{album_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["main_title"] == "Detail Album"
    assert data["id"] == album_id
