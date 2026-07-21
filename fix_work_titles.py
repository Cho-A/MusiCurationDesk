import sqlite3
import re

def clean_title(title: str) -> str:
    if not title:
        return ""
    # " - " や " (" や " [" 以降を取り除く
    cleaned = re.split(r'\s*[\(\[\-]\s*', title)[0].strip()
    return cleaned if cleaned else title.strip()

def fix_data():
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()

    # 1. musical_works のタイトルを純粋な楽曲名に修正
    cursor.execute("SELECT id, title FROM musical_works")
    works = cursor.fetchall()
    
    for work_id, title in works:
        pure_title = clean_title(title)
        if pure_title != title:
            # 同名の既存 work がないか確認
            cursor.execute("SELECT id FROM musical_works WHERE title = ? AND id != ?", (pure_title, work_id))
            existing = cursor.fetchone()
            if existing:
                # 既に存在する場合は existing[0] に統廃合
                target_work_id = existing[0]
                cursor.execute("UPDATE songs SET work_id = ? WHERE work_id = ?", (target_work_id, work_id))
                cursor.execute("DELETE FROM musical_works WHERE id = ?", (work_id,))
                print(f"Merged MusicalWork id={work_id} '{title}' into id={target_work_id} '{pure_title}'")
            else:
                cursor.execute("UPDATE musical_works SET title = ? WHERE id = ?", (pure_title, work_id))
                print(f"Cleaned MusicalWork id={work_id}: '{title}' -> '{pure_title}'")

    conn.commit()

    # 2. 「センチメンタルピリオド」「オリオンをなぞる」などのMV映像データ (is_video = 1) をデモ用に登録し、同じ楽曲 (Work) に紐付ける
    # 「センチメンタルピリオド」の work_id を取得
    cursor.execute("SELECT id FROM musical_works WHERE title = 'センチメンタルピリオド'")
    sp_work = cursor.fetchone()
    if sp_work:
        work_id = sp_work[0]
        # 「センチメンタルピリオド (Music Video)」が存在しなければ作成
        cursor.execute("SELECT id FROM songs WHERE title = 'センチメンタルピリオド (Music Video)'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO songs (title, work_id, is_video)
                VALUES ('センチメンタルピリオド (Music Video)', ?, 1)
            """, (work_id,))
            print("Created demo MV: センチメンタルピリオド (Music Video)")

    # 「オリオンをなぞる」の work_id を取得
    cursor.execute("SELECT id FROM musical_works WHERE title = 'オリオンをなぞる'")
    orion_work = cursor.fetchone()
    if orion_work:
        work_id = orion_work[0]
        cursor.execute("SELECT id FROM songs WHERE title = 'オリオンをなぞる (Music Video)'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO songs (title, work_id, is_video)
                VALUES ('オリオンをなぞる (Music Video)', ?, 1)
            """, (work_id,))
            print("Created demo MV: オリオンをなぞる (Music Video)")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_data()
