import requests
import time

class MusicBrainzClient:
    def __init__(self, user_agent="MusiCurationDesk/1.0 ( test@example.com )"):
        self.base_url = "https://musicbrainz.org/ws/2"
        self.headers = {
            "User-Agent": user_agent,
            "Accept": "application/json"
        }
        
    def _make_request(self, endpoint, params):
        url = f"{self.base_url}/{endpoint}"
        params['fmt'] = 'json'
        
        # MusicBrainzの公式レートリミット（1秒間に1リクエスト）を遵守
        time.sleep(1)
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"MusicBrainz API Error: {e}")
            return None

    def search_recording_by_isrc(self, isrc: str):
        """ISRC（国際標準レコーディングコード）からレコーディング情報を検索する"""
        params = {"query": f"isrc:{isrc}"}
        result = self._make_request("recording", params)
        if result and result.get('recordings') and len(result['recordings']) > 0:
            mb_id = result['recordings'][0]['id']
            return self.get_recording_details(mb_id)
        return None
        
    def search_recording_by_title_artist(self, title: str, artist: str):
        """曲名とアーティスト名からレコーディング情報を検索する"""
        query = f'recording:"{title}" AND artist:"{artist}"'
        params = {"query": query}
        result = self._make_request("recording", params)
        
        if result and result.get('recordings') and len(result['recordings']) > 0:
            mb_id = result['recordings'][0]['id']
            return self.get_recording_details(mb_id)
        return None

    def get_recording_details(self, mb_id: str):
        """特定のレコーディングIDから詳細なクレジット情報（演奏者、作曲者など）を取得する"""
        # incパラメータで関連する情報をすべて引っ張ってくる
        # artist-rels: 演奏者やプロデューサー
        # work-rels: 楽曲（Work）へのリンク（そこから作詞作曲家がわかることが多い）
        params = {"inc": "artist-credits+artist-rels+work-rels"}
        return self._make_request(f"recording/{mb_id}", params)

    def extract_credits(self, mb_recording_data):
        """MusicBrainzのAPIレスポンスから、本アプリのRole形式に変換してクレジットを抽出する"""
        credits = []
        if not mb_recording_data:
            return credits
            
        # 1. recording-artist relations (演奏参加、プロデューサーなど)
        for rel in mb_recording_data.get('relations', []):
            if rel.get('target-type') == 'artist':
                artist_name = rel.get('artist', {}).get('name')
                role_type = rel.get('type') # 例: "instrument", "producer", "vocal"
                attributes = rel.get('attributes', [])
                
                # 詳細な役割（ギター、ベースなど）がある場合はそちらを優先
                if attributes:
                    specific_role = attributes[0]
                    role = f"{specific_role.capitalize()}ist" if specific_role in ['guitar', 'bass', 'drum'] else specific_role.capitalize()
                else:
                    role = role_type.capitalize()
                    
                credits.append({
                    "artist_name": artist_name,
                    "role": role,
                    "source": "MusicBrainz (Recording)"
                })
                
        # 2. work-artist relations (作詞、作曲など)
        # MusicBrainzではRecording(録音)とWork(楽曲)が分かれており、作詞作曲はWorkに紐づく
        for work_rel in mb_recording_data.get('relations', []):
            if work_rel.get('target-type') == 'work':
                work_data = work_rel.get('work', {})
                # Workの情報をさらに取得する必要がある場合もあるが、一部は含まれていることがある
                pass # 実装の複雑化を避けるため、一旦簡易版とする

        return credits
