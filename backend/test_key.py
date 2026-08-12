import urllib.request
import urllib.error

key = 'YOUR_API_KEY_HERE'
url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}'
req = urllib.request.Request(url, data=b'{"contents":[{"parts":[{"text":"hi"}]}]}', headers={'Content-Type': 'application/json'}, method='POST')

try:
    urllib.request.urlopen(req)
    print("SUCCESS")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code} {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"OTHER ERROR: {e}")
