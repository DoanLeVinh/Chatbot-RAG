import sys
import json
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
from dotenv import load_dotenv
load_dotenv()
import os
print(f"KEY: {os.getenv('GEMINI_API_KEY')}")

from retriever_local import _call_gemini_api
sys_prompt = "You are a helpful assistant."
user_prompt = "Say hello."
try:
    res = _call_gemini_api(sys_prompt, user_prompt)
    print(res)
except Exception as e:
    import traceback
    traceback.print_exc()
