import urllib.request
import urllib.parse
import json
import urllib.error

def request(url, method="GET"):
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "message": e.read().decode()}

print(request("http://localhost:8000/songs/2/attach_to_song?target_song_id=3", method="POST"))
print("Get 2:")
print(request("http://localhost:8000/songs/2"))
print("Get 3:")
print(request("http://localhost:8000/songs/3"))
