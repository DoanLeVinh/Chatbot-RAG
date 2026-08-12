import urllib.request
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/query', 
    data=json.dumps({'query':'Phạm vi điều chỉnh của Luật hải quan là gì?', 'top_k':4}).encode('utf-8'), 
    headers={'Content-Type':'application/json'}, 
    method='POST'
)
try:
    resp = urllib.request.urlopen(req)
    res = json.loads(resp.read().decode('utf-8'))
    print(res.get('answer', 'No answer'))
except Exception as e:
    print('Error:', e)
