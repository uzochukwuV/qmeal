#!/usr/bin/env python3
"""
Restaurant Owner API Testing for Qmeal App
Tests the NEW Restaurant Owner endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend environment
BASE_URL = "https://order-platform-32.preview.emergentagent.com/api"

class QmealOwnerAPITester:
    def __init__(self):
        self.owner_token = None
        self.customer_token = None
        self.owner_user_id = None
        self.restaurant_id = None
        self.menu_item_id = None
        self.test_results = []
        
        # Test credentials from review request
        self.owner_email = "owner@bellatest.com"
        self.owner_password = "Owner1234!"
        self.owner_name = "Test Owner"
        self.restaurant_name = "Bella Test Kitchen"
        
        # Customer credentials for verification
        self.customer_email = "test@qmeal.com"
        self.customer_password = "Test1234!"
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, use_owner_auth=False, use_customer_auth=False):
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
            
        if use_owner_auth and self.owner_token:
            request_headers["Authorization"] = f"Bearer {self.owner_token}"
        elif use_customer_auth and self.customer_token:
            request_headers["Authorization"] = f"Bearer {self.customer_token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=15)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=15)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=request_headers, timeout=15)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, headers=request_headers, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None

    def test_1_register_owner(self):
        """Test 1: Register a new restaurant owner"""
        data = {
            "name": self.owner_name,
            "email": self.owner_email,
            "password": self.owner_password,
            "restaurant_name": self.restaurant_name,
            "cuisine_type": "Italian",
            "description": "Test Italian restaurant",
            "address": "123 Test St"
        }
        
        response = self.make_request("POST", "/auth/register-owner", data)
        if response and response.status_code == 200:
            data = response.json()
            if (data.get("role") == "owner" and 
                data.get("restaurant_id") and 
                data.get("token")):
                self.owner_token = data["token"]
                self.owner_user_id = data["user_id"]
                self.restaurant_id = data["restaurant_id"]
                self.log_result("1. Register Owner", True, 
                              f"Owner registered successfully - role: {data['role']}, restaurant_id: {self.restaurant_id}")
                return True
        
        # If owner already exists, try login instead
        if response and response.status_code == 400:
            self.log_result("1. Register Owner", True, "Owner already exists (expected), will use login")
            return self.test_2_login_owner()
            
        self.log_result("1. Register Owner", False, 
                       f"Registration failed: {response.status_code if response else 'No response'}")
        return False

    def test_2_login_owner(self):
        """Test 2: Login as restaurant owner"""
        data = {
            "email": self.owner_email,
            "password": self.owner_password
        }
        
        response = self.make_request("POST", "/auth/login", data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("role") == "owner" and data.get("token"):
                self.owner_token = data["token"]
                self.owner_user_id = data["user_id"]
                self.restaurant_id = data.get("restaurant_id")
                self.log_result("2. Login Owner", True, 
                              f"Owner login successful - role: {data['role']}")
                return True
        
        self.log_result("2. Login Owner", False, 
                       f"Login failed: {response.status_code if response else 'No response'}")
        return False

    def test_3_owner_dashboard(self):
        """Test 3: Get owner dashboard stats"""
        response = self.make_request("GET", "/owner/dashboard", use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if "stats" in data and "total_orders" in data["stats"] and "total_revenue" in data["stats"]:
                stats = data["stats"]
                self.log_result("3. Owner Dashboard", True, 
                              f"Dashboard retrieved - orders: {stats['total_orders']}, revenue: ${stats['total_revenue']}")
                return True
        
        self.log_result("3. Owner Dashboard", False, 
                       f"Dashboard failed: {response.status_code if response else 'No response'}")
        return False

    def test_4_get_restaurant_details(self):
        """Test 4: Get restaurant details"""
        response = self.make_request("GET", "/owner/restaurant", use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("restaurant_id") and data.get("name"):
                self.log_result("4. Get Restaurant Details", True, 
                              f"Restaurant details retrieved - name: {data['name']}")
                return True
        
        self.log_result("4. Get Restaurant Details", False, 
                       f"Get restaurant failed: {response.status_code if response else 'No response'}")
        return False

    def test_5_update_restaurant(self):
        """Test 5: Update restaurant details (change delivery_fee to 3.99)"""
        data = {
            "delivery_fee": 3.99
        }
        
        response = self.make_request("PATCH", "/owner/restaurant", data, use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("delivery_fee") == 3.99:
                self.log_result("5. Update Restaurant", True, 
                              f"Restaurant updated - delivery_fee: ${data['delivery_fee']}")
                return True
        
        self.log_result("5. Update Restaurant", False, 
                       f"Update restaurant failed: {response.status_code if response else 'No response'}")
        return False

    def test_6_get_menu_empty(self):
        """Test 6: Get menu items (should be empty for new restaurant)"""
        response = self.make_request("GET", "/owner/menu", use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("6. Get Menu (Empty)", True, 
                              f"Menu retrieved - {len(data)} items (expected empty for new restaurant)")
                return True
        
        self.log_result("6. Get Menu (Empty)", False, 
                       f"Get menu failed: {response.status_code if response else 'No response'}")
        return False

    def test_7_add_menu_item(self):
        """Test 7: Add a menu item"""
        data = {
            "name": "Test Pizza",
            "description": "Delicious test pizza",
            "price": 14.99,
            "category": "Pizza",
            "is_available": True,
            "is_popular": True
        }
        
        response = self.make_request("POST", "/owner/menu", data, use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("item_id") and data.get("name") == "Test Pizza":
                self.menu_item_id = data["item_id"]
                self.log_result("7. Add Menu Item", True, 
                              f"Menu item added - name: {data['name']}, price: ${data['price']}")
                return True
        
        self.log_result("7. Add Menu Item", False, 
                       f"Add menu item failed: {response.status_code if response else 'No response'}")
        return False

    def test_8_update_menu_item(self):
        """Test 8: Update the added menu item (change price to 15.99)"""
        if not self.menu_item_id:
            self.log_result("8. Update Menu Item", False, "No menu item ID available")
            return False
            
        data = {
            "price": 15.99
        }
        
        response = self.make_request("PATCH", f"/owner/menu/{self.menu_item_id}", data, use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("price") == 15.99:
                self.log_result("8. Update Menu Item", True, 
                              f"Menu item updated - new price: ${data['price']}")
                return True
        
        self.log_result("8. Update Menu Item", False, 
                       f"Update menu item failed: {response.status_code if response else 'No response'}")
        return False

    def test_9_delete_menu_item(self):
        """Test 9: Delete the menu item"""
        if not self.menu_item_id:
            self.log_result("9. Delete Menu Item", False, "No menu item ID available")
            return False
            
        response = self.make_request("DELETE", f"/owner/menu/{self.menu_item_id}", use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_result("9. Delete Menu Item", True, "Menu item deleted successfully")
                return True
        
        self.log_result("9. Delete Menu Item", False, 
                       f"Delete menu item failed: {response.status_code if response else 'No response'}")
        return False

    def test_10_get_orders(self):
        """Test 10: Get orders for restaurant"""
        response = self.make_request("GET", "/owner/orders", use_owner_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("10. Get Orders", True, 
                              f"Orders retrieved - {len(data)} orders for restaurant")
                return True
        
        self.log_result("10. Get Orders", False, 
                       f"Get orders failed: {response.status_code if response else 'No response'}")
        return False

    def test_11_customer_register(self):
        """Test 11: Verify existing customer endpoints still work - register"""
        data = {
            "email": self.customer_email,
            "password": self.customer_password,
            "name": "Test Customer"
        }
        
        response = self.make_request("POST", "/auth/register", data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("token") and data.get("role") == "customer":
                self.customer_token = data["token"]
                self.log_result("11. Customer Register", True, "Customer registration working")
                return True
        
        # If customer already exists, try login
        if response and response.status_code == 400:
            self.log_result("11. Customer Register", True, "Customer already exists (expected), will use login")
            return self.test_12_customer_login()
            
        self.log_result("11. Customer Register", False, 
                       f"Customer registration failed: {response.status_code if response else 'No response'}")
        return False

    def test_12_customer_login(self):
        """Test 12: Verify existing customer endpoints still work - login"""
        data = {
            "email": self.customer_email,
            "password": self.customer_password
        }
        
        response = self.make_request("POST", "/auth/login", data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("token") and data.get("role") == "customer":
                self.customer_token = data["token"]
                self.log_result("12. Customer Login", True, "Customer login working")
                return True
        
        self.log_result("12. Customer Login", False, 
                       f"Customer login failed: {response.status_code if response else 'No response'}")
        return False

    def test_13_get_restaurants(self):
        """Test 13: Verify customer can get restaurants"""
        response = self.make_request("GET", "/restaurants", use_customer_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("13. Get Restaurants", True, 
                              f"Customer can get restaurants - {len(data)} restaurants available")
                return True
        
        self.log_result("13. Get Restaurants", False, 
                       f"Get restaurants failed: {response.status_code if response else 'No response'}")
        return False

    def run_all_tests(self):
        """Run all owner API tests"""
        print(f"🚀 Starting Qmeal Owner API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Test sequence as specified in review request
        tests = [
            ("1. Register Owner", self.test_1_register_owner),
            ("2. Login Owner", self.test_2_login_owner),
            ("3. Owner Dashboard", self.test_3_owner_dashboard),
            ("4. Get Restaurant Details", self.test_4_get_restaurant_details),
            ("5. Update Restaurant", self.test_5_update_restaurant),
            ("6. Get Menu (Empty)", self.test_6_get_menu_empty),
            ("7. Add Menu Item", self.test_7_add_menu_item),
            ("8. Update Menu Item", self.test_8_update_menu_item),
            ("9. Delete Menu Item", self.test_9_delete_menu_item),
            ("10. Get Orders", self.test_10_get_orders),
            ("11. Customer Register", self.test_11_customer_register),
            ("12. Customer Login", self.test_12_customer_login),
            ("13. Get Restaurants", self.test_13_get_restaurants),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_result(test_name, False, f"Test error: {str(e)}")
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All owner API tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed")
            
            # Show failed tests
            failed_tests = [result for result in self.test_results if not result["success"]]
            if failed_tests:
                print(f"\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['message']}")
            
            return False

if __name__ == "__main__":
    tester = QmealOwnerAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)