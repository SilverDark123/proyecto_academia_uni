import httpx
import asyncio

BASE_URL = "http://localhost:4000/api"

async def test_endpoints():
    print("=== Testing Frontend API Endpoints ===\n")
    
    async with httpx.AsyncClient() as client:
        # Test 1: Login admin
        print("1. Testing POST /auth/login")
        try:
            response = await client.post(f"{BASE_URL}/auth/login", json={"dni": "admin", "password": "admin123"})
            print(f"   Status: {response.status_code}")
            if response.is_success:
                data = response.json()
                token = data.get("token")
                print(f"   ✓ Login successful")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

        # Test 2: Get active cycle
        print("\n2. Testing GET /cycles/active")
        try:
            response = await client.get(f"{BASE_URL}/cycles/active")
            print(f"   Status: {response.status_code}")
            if response.status_code == 404:
                print(f"   ℹ No active cycle (expected if no data)")
            elif response.is_success:
                print(f"   ✓ Active cycle found")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

        # Test 3: Get all packages
        print("\n3. Testing GET /packages")
        try:
            response = await client.get(f"{BASE_URL}/packages")
            print(f"   Status: {response.status_code}")
            if response.is_success:
                data = response.json()
                print(f"   ✓ Packages: {len(data)} items")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

        # Test 4: Get package offerings (no cycle filter)
        print("\n4. Testing GET /packages/offerings")
        try:
            response = await client.get(f"{BASE_URL}/packages/offerings")
            print(f"   Status: {response.status_code}")
            if response.is_success:
                data = response.json()
                print(f"   ✓ Package offerings: {len(data)} items")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

        # Test 5: Get payments with status filter
        print("\n5. Testing GET /payments?status=pendiente")
        try:
            response = await client.get(f"{BASE_URL}/payments?status=pendiente")
            print(f"   Status: {response.status_code}")
            if response.is_success:
                data = response.json()
                print(f"   ✓ Pending payments: {len(data)} items")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

        # Test 6: Get schedules by offering (alternative endpoint)
        print("\n6. Testing GET /schedules/offering/1")
        try:
            response = await client.get(f"{BASE_URL}/schedules/offering/1")
            print(f"   Status: {response.status_code}")
            if response.is_success:
                data = response.json()
                print(f"   ✓ Schedules: {len(data)} items")
            elif response.status_code == 404:
                print(f"   ℹ No schedules found (expected if no data)")
            else:
                print(f"   ✗ Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Exception: {e}")

    print("\n=== Tests Complete ===")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
