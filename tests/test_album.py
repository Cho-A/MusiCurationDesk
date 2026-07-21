import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
res = requests.get('http://127.0.0.1:8000/albums/53')
print(res.status_code)
if res.status_code != 200:
    print(res.text)
