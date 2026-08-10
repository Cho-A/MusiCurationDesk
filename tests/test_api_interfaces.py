import os
import re

def test_no_local_api_interface_declarations():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src")
    
    # We want to forbid local declarations of interfaces that should be imported from types/models.ts
    banned_interfaces = [
        "SongCardData",
        "SongData",
        "AlbumCardData",
        "AlbumData",
        "ArtistData"
    ]
    
    pattern = re.compile(rf"interface\s+({'|'.join(banned_interfaces)})\s*{{")
    
    errors = []
    
    for root, dirs, files in os.walk(frontend_dir):
        if "types" in root.split(os.sep):
            continue
            
        for file in files:
            if not file.endswith(('.tsx', '.ts')):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                
            for i, line in enumerate(lines):
                match = pattern.search(line)
                if match:
                    rel_path = os.path.relpath(filepath, start=frontend_dir)
                    errors.append(f"{rel_path}:{i+1} -> {line.strip()}")

    assert len(errors) == 0, f"Found local API interface declarations. Please import from types/models instead:\n" + "\n".join(errors)
