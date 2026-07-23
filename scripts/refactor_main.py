import re

path = "/home/takanoryo/MusiCurationDesk/app/main.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    r"app\.include_router\(albums\.album_router\)\napp\.include_router\(albums\.album_track_router\)\napp\.include_router\(albums\.album_relatinship_router\)": "app.include_router(albums.router)",
    r"app\.include_router\(performances\.performance_router\)\napp\.include_router\(performances\.setlist_entries_router\)\napp\.include_router\(performances\.performance_roster_router\)": "app.include_router(performances.router)",
    r"app\.include_router\(goods_and_stores\.merchandise_router\)\napp\.include_router\(goods_and_stores\.stores_router\)\napp\.include_router\(goods_and_stores\.merchandice_relationship_router\)": "app.include_router(goods_and_stores.router)",
    r"app\.include_router\(users\.user_router\)\napp\.include_router\(users\.user_possessions_router\)\napp\.include_router\(users\.user_attendance_router\)": "app.include_router(users.router)",
    r"app\.include_router\(auth\.token_router\)\napp\.include_router\(auth\.refresh_router\)\napp\.include_router\(auth\.logout_router\)": "app.include_router(auth.router)",
    r"app\.include_router\(links\.song_artist_router\)\napp\.include_router\(links\.song_tieup_router\)": "app.include_router(links.router)"
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("main.py refactored.")
