import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import os

file_path = "app/schemas.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("orm_mode = True", "from_attributes = True")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced orm_mode with from_attributes in schemas.py")
