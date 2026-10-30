import os
import sys
from pathlib import Path

# Add current directory to path to avoid conflict with standard library 'code' module
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import asyncio
import threading
import time
import httpx
import uvicorn
from app import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8888, log_level="warning")

async def test_full_flow():
    # Start server in background thread
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(2)

    base_url = "http://127.0.0.1:8888"
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        print("1. Testing Mock Hotel page...")
        res = await client.get("/mock-hotel")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Mock Hotel is up!")

        print("\n2. Testing /api/v1/generate on mock hotel...")
        gen_res = await client.post("/api/v1/generate", json={"url": f"{base_url}/mock-hotel"})
        assert gen_res.status_code == 200, f"Generate failed: {gen_res.text}"
        data = gen_res.json()
        server_id = data["server_id"]
        print(f"   Server generated: {server_id}")
        print(f"   Tools: {[t['name'] for t in data['tools']]}")

        print("\n3. Testing tool execution: check_availability...")
        call_res = await client.post(
            f"/api/v1/servers/{server_id}/call",
            json={
                "tool_name": "check_availability",
                "arguments": {
                    "check_in": "2026-11-10",
                    "check_out": "2026-11-14",
                    "guests": 2
                }
            }
        )
        assert call_res.status_code == 200, f"Call failed: {call_res.text}"
        call_data = call_res.json()
        print(f"   Success: {call_data['success']}")
        print(f"   Rooms found: {call_data['data'].get('rooms_count')}")
        print(f"   Screenshot: {call_data.get('screenshot_url')}")

        print("\n4. Testing tool execution: reserve_room...")
        res_call = await client.post(
            f"/api/v1/servers/{server_id}/call",
            json={
                "tool_name": "reserve_room",
                "arguments": {
                    "room_title": "Deluxe Rhine View Suite",
                    "guest_name": "Sacha Ramstein",
                    "guest_email": "sacha@baselhack.ch",
                    "guest_phone": "+41 79 123 45 67",
                    "special_requests": "Quiet room with river view"
                }
            }
        )
        assert res_call.status_code == 200, f"Reserve failed: {res_call.text}"
        res_data = res_call.json()
        print(f"   Reservation Success: {res_data['success']}")
        print(f"   Summary: {res_data['data'].get('confirmation_summary')}")
        print(f"   Confirmation Screenshot: {res_data.get('screenshot_url')}")
        print("\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨")

if __name__ == "__main__":
    asyncio.run(test_full_flow())
