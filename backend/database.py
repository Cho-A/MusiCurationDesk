from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# --- データベース接続設定 (まずはSQLite) ---
# (本番ではPostgreSQLのURLに変更します)
SQLALCHEMY_DATABASE_URL = "sqlite:///./music_curation_desk.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- データベースの初期化関数 ---
def create_db_and_tables():
    # この関数を呼び出すと、SQLiteファイルと全テーブルが作成されます
    Base.metadata.create_all(bind=engine)
