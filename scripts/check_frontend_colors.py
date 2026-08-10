#!/usr/bin/env python3
import os
import re
import sys

def main():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src")
    
    # We look for color:, background:, or backgroundColor:
    # followed by white, black, #fff, #ffffff, #000, #000000
    # Examples: color: 'white', background: "#000"
    pattern = re.compile(
        r"(color|background(?:Color)?):\s*['\"]?(white|black|#(?:fff(?:fff)?|000(?:000)?))['\"]?",
        re.IGNORECASE
    )
    
    # Files that are allowed to have hardcoded colors due to fixed background colors (e.g. var(--spotify-color))
    # We will exclude these lines if they also contain the fixed background variables on the same line,
    # OR we can just add an ignore comment check. 
    # For simplicity, if the line contains a fixed brand variable, we will allow it.
    allowed_fixed_backgrounds = [
        "var(--spotify-color)",
        "var(--success-color)",
        "var(--error-color)",
        "var(--warning-color)",
        "var(--accent-primary)",
        "var(--accent-hover)",
        "allow-hardcoded-color"
    ]
    
    errors_found = 0
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if not file.endswith(('.tsx', '.ts')):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                
            for i, line in enumerate(lines):
                match = pattern.search(line)
                if match:
                    # Check if line is safe because it uses a fixed brand background
                    is_safe = any(bg in line for bg in allowed_fixed_backgrounds)
                    
                    if not is_safe:
                        rel_path = os.path.relpath(filepath, start=frontend_dir)
                        print(f"[ERROR] {rel_path}:{i+1}")
                        print(f"  Found hardcoded color: {match.group(0).strip()}")
                        print(f"  Context: {line.strip()}")
                        print("  Please use CSS variables (e.g. var(--text-primary)) instead.\n")
                        errors_found += 1

    if errors_found > 0:
        print(f"Static Test Failed: Found {errors_found} hardcoded color(s) in inline styles.")
        sys.exit(1)
    else:
        print("Static Test Passed: No invalid hardcoded colors found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
