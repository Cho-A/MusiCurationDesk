import os
import requests
from typing import Optional, Dict, Any

class SetlistFMClient:
    BASE_URL = "https://api.setlist.fm/rest/1.0"

    def __init__(self):
        self.api_key = os.environ.get("SETLISTFM_API_KEY")

    def _get_headers(self):
        if not self.api_key:
            raise ValueError("SETLISTFM_API_KEY environment variable is not set.")
        return {
            "Accept": "application/json",
            "x-api-key": self.api_key
        }

    def search_setlists(self, artist_name: str, p: int = 1) -> Dict[str, Any]:
        """Search for setlists by artist name."""
        url = f"{self.BASE_URL}/search/setlists"
        params = {
            "artistName": artist_name,
            "p": p
        }
        res = requests.get(url, headers=self._get_headers(), params=params)
        if res.status_code == 404:
            return {"setlist": []}  # No results
        res.raise_for_status()
        return res.json()

    def get_setlist(self, setlist_id: str) -> Dict[str, Any]:
        """Get a specific setlist by ID."""
        url = f"{self.BASE_URL}/setlist/{setlist_id}"
        res = requests.get(url, headers=self._get_headers())
        res.raise_for_status()
        return res.json()
