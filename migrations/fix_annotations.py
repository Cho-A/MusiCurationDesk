import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import os

app_dir = "/home/takanoryo/MusiCurationDesk/app"

for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith(".py"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "from __future__ import annotations" not in content:
                new_content = "from __future__ import annotations\n" + content
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Added to {filepath}")
