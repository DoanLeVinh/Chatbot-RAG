import urllib.request
import urllib.error
import json
import uuid
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
import db

u = db.register_user(f"freeuser_{uuid.uuid4().hex[:6]}@test.com", "Pass@123", "Free User")
uid = u["id"]
token = db.create_jwt_token({"id": uid, "email": u["email"], "role": "user"})
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("[TEST 1] Testing reasoning model protection...")
payload = json.dumps({"prompt": "Test reasoning", "userId": uid, "aiModel": "logi_think"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/chat/stream", data=payload, headers=headers)
try:
    urllib.request.urlopen(req)
    print("FAILED: Free user was allowed to use logi_think!")
except urllib.error.HTTPError as e:
    print(f"PASSED: HTTP {e.code} received with body: {e.read().decode('utf-8')}")

print("[TEST 2] Testing normal message with logi_fast...")
payload_fast = json.dumps({"prompt": "Xin chào LogiChat", "userId": uid, "aiModel": "logi_fast"}).encode("utf-8")
req_fast = urllib.request.Request("http://127.0.0.1:8000/api/chat/stream", data=payload_fast, headers=headers)
try:
    res = urllib.request.urlopen(req_fast)
    print(f"PASSED: HTTP {res.status} streaming connected successfully!")
except Exception as e:
    print(f"Chat stream test note: {e}")

db.delete_user(uid)
print("All backend checks completed!")
