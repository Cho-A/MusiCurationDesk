from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app, raise_server_exceptions=True)
try:
    response = client.get("/songs/1")
except Exception as e:
    import traceback
    traceback.print_exc()
