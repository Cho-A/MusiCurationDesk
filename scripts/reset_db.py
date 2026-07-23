import os
import sys
import argparse

# PYTHONPATHをルートに通すため、1つ上の階層（プロジェクトルート）を追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models import engine, Base

def reset_database(force=False):
    print("==================================================")
    print("⚠️ 警告: データベースの全テーブルと全データが削除されます。")
    print("==================================================")
    
    if not force:
        confirm = input("本当に全データを削除して初期化しますか？ (yes/no): ")
        if confirm.lower() != "yes":
            print("リセットを中止しました。")
            return
            
    print("全テーブルを削除しています...")
    Base.metadata.drop_all(bind=engine)
    
    print("全テーブルを再構築しています...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ データベースの初期化が完了しました。")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset the database by dropping and recreating all tables.")
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()
    
    reset_database(force=args.force)
