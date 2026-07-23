import re
import os

files = {
    "albums.py": [
        ("album_router", "/albums"),
        ("album_track_router", "/album_tracks"),
        ("album_relatinship_router", "/album_relationships")
    ],
    "auth.py": [
        ("token_router", "/token"),
        ("refresh_router", "/refresh"),
        ("logout_router", "/logout")
    ],
    "goods_and_stores.py": [
        ("merchandise_router", "/merchandises"),
        ("stores_router", "/stores"),
        ("merchandice_relationship_router", "/merchandise_relationships")
    ],
    "links.py": [
        ("song_artist_router", "/song_artist_links"),
        ("song_tieup_router", "/song_tieup_links")
    ],
    "performances.py": [
        ("performance_router", "/performances"),
        ("performance_roster_router", "/performance_roster"),
        ("setlist_entries_router", "/setlist_entries")
    ],
    "users.py": [
        ("user_router", "/users"),
        ("user_possessions_router", "/user_possessions"),
        ("user_attendance_router", "/user_attendance")
    ]
}

def remove_router_defs(content, rname):
    # Matches: rname = APIRouter( ... )
    pattern = re.compile(rf"^{rname}\s*=\s*APIRouter\([^)]*\)\n*", re.MULTILINE | re.DOTALL)
    # the DOTALL might match too much if there are multiple parentheses.
    # Instead, we can just replace specifically known lines, but let's try a non-greedy approach
    pattern = re.compile(rf"^{rname}\s*=\s*APIRouter\((?:[^)]*)\)\n*", re.MULTILINE)
    return pattern.sub("", content)

for file_name, routers in files.items():
    path = f"/home/takanoryo/MusiCurationDesk/app/routers/{file_name}"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    for rname, rprefix in routers:
        content = remove_router_defs(content, rname)
    
    # insert single router
    content = content.replace("from fastapi import APIRouter", "from fastapi import APIRouter")
    
    # Find the last import
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            last_import_idx = i
            
    lines.insert(last_import_idx + 1, "\nrouter = APIRouter()\n")
    content = "\n".join(lines)

    for rname, rprefix in routers:
        # regex for decorators: @rname.method("path", ...)
        def replacer(match):
            method = match.group(1)
            route_path = match.group(2)
            rest = match.group(3)
            if route_path == "/":
                new_path = rprefix
            elif route_path == "":
                new_path = rprefix
            else:
                if route_path.startswith("/"):
                    new_path = rprefix + route_path
                else:
                    new_path = rprefix + "/" + route_path
            return f"@router.{method}(\"{new_path}\"{rest}"
            
        content = re.sub(rf"@{rname}\.(get|post|put|delete|patch)\(\s*\"([^\"]*)\"(.*)", replacer, content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Router refactoring completed.")
