import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Login
        res = await client.post("http://127.0.0.1:8000/api/auth/login", json={"email":"admin@logichat.vn", "password":"Admin@123456"})
        print(f"Login status: {res.status_code}")
        data = res.json()
        token = data.get("token")
        print(f"Token received: {token[:20] if token else 'None'}...")
        
        # Access admin API
        res2 = await client.get("http://127.0.0.1:8000/api/admin/users", headers={"Authorization": f"Bearer {token}"})
        print(f"Admin API status: {res2.status_code}")
        if res2.status_code != 200:
            print(f"Admin API response: {res2.text}")

asyncio.run(main())
