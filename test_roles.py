import requests

BASE_URL = "http://localhost:8001/api"

def test_register_rider():
    res = requests.post(f"{BASE_URL}/auth/register-rider", json={
        "email": "rider@test.com",
        "password": "Password123!",
        "name": "Test Rider",
        "phone": "1234567890",
        "vehicle_type": "motorcycle"
    })
    print("Rider:", res.json())
    assert res.status_code == 200

def test_register_admin():
    res = requests.post(f"{BASE_URL}/auth/register-admin", json={
        "email": "admin@test.com",
        "password": "Password123!",
        "name": "Test Admin",
        "secret_key": "qmeal_admin_secret_2024"
    })
    print("Admin:", res.json())
    assert res.status_code == 200

if __name__ == "__main__":
    test_register_rider()
    test_register_admin()
