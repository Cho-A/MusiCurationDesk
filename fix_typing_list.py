import os
import re

app_dir = "/home/takanoryo/MusiCurationDesk/app"

for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith(".py"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # `list[` を `List[` に置換
            if "list[" in content:
                new_content = re.sub(r'\blist\[', 'List[', content)
                
                # `from typing import` があれば `List,` を追加、なければ `from typing import List` を追加
                if "from typing import" in new_content and "List" not in new_content:
                    new_content = re.sub(r'(from typing import )', r'\1List, ', new_content)
                elif "from typing import" not in new_content:
                    # 先頭付近（importsの中）に挿入
                    lines = new_content.split('\n')
                    for i, line in enumerate(lines):
                        if not line.startswith("from __future__"):
                            if line.startswith("import ") or line.startswith("from "):
                                lines.insert(i, "from typing import List")
                                break
                    else:
                        lines.insert(1, "from typing import List") # fallback
                    new_content = '\n'.join(lines)
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
