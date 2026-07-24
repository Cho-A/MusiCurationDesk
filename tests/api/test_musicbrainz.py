import pytest
from unittest.mock import patch, MagicMock
from backend.main import app
from backend import dependencies
from backend.models import User

class TestMusicBrainzAPI:
    """MusicBrainz APIのテスト"""
    
    @pytest.fixture
    def admin_client(self, client):
        # 簡易的に管理者ユーザーをモック
        admin_user = User(id=1, username="admin", is_admin=True)
        def override_get_current_admin_user():
            return admin_user
            
        app.dependency_overrides[dependencies.get_current_admin_user] = override_get_current_admin_user
        yield client
        app.dependency_overrides.pop(dependencies.get_current_admin_user)
        
    @patch('backend.routers.musicbrainz.musicbrainz_fetcher.search_releases')
    def test_search_mb_release(self, mock_search, admin_client):
        """MB検索APIが正しくフェッチャーを呼ぶこと"""
        mock_search.return_value = [{"id": "123", "title": "Test Release"}]
        
        response = admin_client.get("/musicbrainz/search?q=Test")
        assert response.status_code == 200
        assert response.json() == [{"id": "123", "title": "Test Release"}]
        mock_search.assert_called_once_with("Test", 10)
        
    @patch('backend.routers.musicbrainz.MusicImporter')
    @patch('backend.routers.musicbrainz.BackgroundTasks.add_task')
    def test_import_mb_releases_bulk(self, mock_add_task, mock_importer, admin_client):
        """一括インポートAPIがジョブを発行すること"""
        payload = {"release_ids": ["mb_1", "mb_2"]}
        response = admin_client.post("/musicbrainz/import/bulk", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["message"] == "MB bulk import started"
        
        job_id = data["job_id"]
        
        # バックグラウンドタスクが追加されたことを確認
        assert mock_add_task.called
        
        # 進捗APIが呼び出せることを確認
        progress_res = admin_client.get(f"/musicbrainz/import/bulk/progress/{job_id}")
        assert progress_res.status_code == 200
        assert progress_res.json()["status"] == "queued"

    @patch('backend.services.musicbrainz_fetcher.get_release_details')
    def test_import_mb_releases_bulk_date_parsing(self, mock_get_release, db_session):
        """日付文字列が正しく datetime.date にパースされること（デグレ防止テスト）"""
        from backend.services.credit_fetcher import MusicImporter
        import datetime
        
        mock_get_release.return_value = {
            "title": "Date Parsing Test Album",
            "artist": "Test Artist",
            "date": "2019-07",
            "media": []
        }
        
        importer = MusicImporter()
        res = importer.import_mb_releases_bulk(["dummy_id"], db_session)
        assert res["imported_albums"] == 1
        
        from backend.models import Album
        album = db_session.query(Album).filter_by(main_title="Date Parsing Test Album").first()
        assert album is not None
        assert album.physical_release_date == datetime.date(2019, 7, 1)
