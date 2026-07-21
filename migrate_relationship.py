import sqlite3

def run():
    conn = sqlite3.connect('music_curation_desk.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE artist_relationships ADD COLUMN start_date DATE")
        cursor.execute("ALTER TABLE artist_relationships ADD COLUMN end_date DATE")
        print("Successfully added start_date and end_date.")
    except sqlite3.OperationalError as e:
        print("Error or already exists:", e)
        
    # Also add a tag sample and associate it to UNISON for testing
    cursor.execute("INSERT OR IGNORE INTO tags (name, type) VALUES ('Rock', 'Genre')")
    cursor.execute("SELECT id FROM tags WHERE name='Rock'")
    tag_id = cursor.fetchone()[0]
    
    cursor.execute("SELECT id FROM artists WHERE name='UNISON SQUARE GARDEN'")
    artist_row = cursor.fetchone()
    if artist_row:
        artist_id = artist_row[0]
        cursor.execute("INSERT OR IGNORE INTO artist_tags (artist_id, tag_id) VALUES (?, ?)", (artist_id, tag_id))
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    run()
