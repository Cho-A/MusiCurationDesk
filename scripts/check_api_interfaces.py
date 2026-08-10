#!/usr/bin/env python3
import os
import re
import sys

def main():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src")
    
    # We want to forbid local declarations of interfaces that should be imported from types/models.ts
    # Banned interfaces:
    banned_interfaces = [
        "SongCardData",
        "SongData", # Often used locally for SongCardData
        "AlbumCardData",
        "AlbumData",
        "ArtistData"
    ]
    
    pattern = re.compile(rf"interface\s+({'|'.join(banned_interfaces)})\s*{{")
    
    errors_found = 0
    
    for root, dirs, files in os.walk(frontend_dir):
        # Ignore the types directory itself
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
                    print(f"[ERROR] {rel_path}:{i+1}")
                    print(f"  Found local interface declaration: {line.strip()}")
                    print(f"  Please import the official schema from 'types/models' instead of defining it locally.")
                    errors_found += 1

    if errors_found > 0:
        print(f"Static Test Failed: Found {errors_found} local API interface declarations.")
        sys.exit(1)
    else:
        print("Static Test Passed: No local API interface declarations found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
