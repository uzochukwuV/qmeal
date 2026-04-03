#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Qmeal App
Tests the updated JWT-based authentication and all new endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend environment
BASE_URL = "https://order-platform-32.preview.emergentagent.com/api"

class QmealAPITester:
    def __init__(self):
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        self.test_user_email = "testuser@qmeal.com"
        self.test_user_password = "testpass123"
        self.test_user_name = "Test User"
        
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
        
    def make_request(self, method, endpoint, data=None, headers=None, use_auth=False):
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
            
        if use_auth and self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
            
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

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.make_request("GET", "/health")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                self.log_result("Health Check", True, "API is healthy")
                return True
        
        self.log_result("Health Check", False, f"Health check failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_register(self):
        """Test user registration with JWT"""
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        response = self.make_request("POST", "/auth/register", data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("token") and data.get("user_id"):
                self.auth_token = data["token"]
                self.user_id = data["user_id"]
                self.log_result("Auth Register", True, f"User registered successfully, token received")
                return True
        
        # If user already exists, try login instead
        if response and response.status_code == 400:
            self.log_result("Auth Register", True, "User already exists (expected), will use login")
            return self.test_auth_login()
            
        self.log_result("Auth Register", False, f"Registration failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_login(self):
        """Test user login with JWT"""
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        response = self.make_request("POST", "/auth/login", data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("token") and data.get("user_id"):
                self.auth_token = data["token"]
                self.user_id = data["user_id"]
                self.log_result("Auth Login", True, f"Login successful, token received")
                return True
        
        self.log_result("Auth Login", False, f"Login failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_me(self):
        """Test get current user endpoint"""
        response = self.make_request("GET", "/auth/me", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("user_id") and data.get("name"):
                self.log_result("Auth Me", True, f"User info retrieved: {data.get('name')}")
                return True
        
        self.log_result("Auth Me", False, f"Get user info failed: {response.status_code if response else 'No response'}")
        return False

    def test_auth_logout(self):
        """Test logout endpoint"""
        response = self.make_request("POST", "/auth/logout", use_auth=True)
        if response and response.status_code == 200:
            self.log_result("Auth Logout", True, "Logout successful")
            return True
        
        self.log_result("Auth Logout", False, f"Logout failed: {response.status_code if response else 'No response'}")
        return False

    def test_restaurants_list(self):
        """Test restaurant listing"""
        response = self.make_request("GET", "/restaurants")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("Restaurants List", True, f"Retrieved {len(data)} restaurants")
                return True
        
        self.log_result("Restaurants List", False, f"Failed to get restaurants: {response.status_code if response else 'No response'}")
        return False

    def test_restaurant_detail(self):
        """Test single restaurant detail"""
        # First get a restaurant ID
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Restaurant Detail", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Restaurant Detail", False, "No restaurants available")
            return False
            
        restaurant_id = restaurants[0]["restaurant_id"]
        
        response = self.make_request("GET", f"/restaurants/{restaurant_id}")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("restaurant_id") == restaurant_id:
                self.log_result("Restaurant Detail", True, f"Retrieved restaurant: {data.get('name')}")
                return True
        
        self.log_result("Restaurant Detail", False, f"Failed to get restaurant detail: {response.status_code if response else 'No response'}")
        return False

    def test_restaurant_menu(self):
        """Test restaurant menu endpoint"""
        # First get a restaurant ID
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Restaurant Menu", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Restaurant Menu", False, "No restaurants available")
            return False
            
        restaurant_id = restaurants[0]["restaurant_id"]
        
        response = self.make_request("GET", f"/restaurants/{restaurant_id}/menu")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Restaurant Menu", True, f"Retrieved {len(data)} menu items")
                return True
        
        self.log_result("Restaurant Menu", False, f"Failed to get menu: {response.status_code if response else 'No response'}")
        return False

    def test_favorites_add(self):
        """Test adding restaurant to favorites"""
        # First get a restaurant ID
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Add Favorite", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Add Favorite", False, "No restaurants available")
            return False
            
        restaurant_id = restaurants[0]["restaurant_id"]
        
        response = self.make_request("POST", f"/favorites/{restaurant_id}", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if "favorite_id" in data or "Already in favorites" in data.get("message", ""):
                self.log_result("Add Favorite", True, "Restaurant added to favorites")
                return True
        
        self.log_result("Add Favorite", False, f"Failed to add favorite: {response.status_code if response else 'No response'}")
        return False

    def test_favorites_list(self):
        """Test getting user's favorites"""
        response = self.make_request("GET", "/favorites", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Favorites List", True, f"Retrieved {len(data)} favorite restaurants")
                return True
        
        self.log_result("Favorites List", False, f"Failed to get favorites: {response.status_code if response else 'No response'}")
        return False

    def test_favorites_check(self):
        """Test checking if restaurant is favorited"""
        # First get a restaurant ID
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Check Favorite", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Check Favorite", False, "No restaurants available")
            return False
            
        restaurant_id = restaurants[0]["restaurant_id"]
        
        response = self.make_request("GET", f"/favorites/check/{restaurant_id}", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if "is_favorite" in data:
                self.log_result("Check Favorite", True, f"Favorite status: {data['is_favorite']}")
                return True
        
        self.log_result("Check Favorite", False, f"Failed to check favorite: {response.status_code if response else 'No response'}")
        return False

    def test_favorites_remove(self):
        """Test removing restaurant from favorites"""
        # First get a restaurant ID
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Remove Favorite", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Remove Favorite", False, "No restaurants available")
            return False
            
        restaurant_id = restaurants[0]["restaurant_id"]
        
        response = self.make_request("DELETE", f"/favorites/{restaurant_id}", use_auth=True)
        if response and (response.status_code == 200 or response.status_code == 404):
            # 404 is acceptable if favorite doesn't exist
            self.log_result("Remove Favorite", True, "Remove favorite endpoint working")
            return True
        
        self.log_result("Remove Favorite", False, f"Failed to remove favorite: {response.status_code if response else 'No response'}")
        return False

    def test_payment_config(self):
        """Test payment configuration endpoint"""
        response = self.make_request("GET", "/payments/config")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("publishable_key"):
                self.log_result("Payment Config", True, f"Payment config retrieved (mock: {data.get('is_mock', False)})")
                return True
        
        self.log_result("Payment Config", False, f"Failed to get payment config: {response.status_code if response else 'No response'}")
        return False

    def test_payment_intent(self):
        """Test creating payment intent"""
        data = {
            "amount": 25.99,
            "currency": "usd"
        }
        
        response = self.make_request("POST", "/payments/create-intent", data, use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("client_secret") and data.get("payment_intent_id"):
                mock_status = " (MOCK)" if data.get("mock") else ""
                self.log_result("Payment Intent", True, f"Payment intent created{mock_status}")
                return True
        
        self.log_result("Payment Intent", False, f"Failed to create payment intent: {response.status_code if response else 'No response'}")
        return False

    def test_notifications_list(self):
        """Test getting user notifications"""
        response = self.make_request("GET", "/notifications", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Notifications List", True, f"Retrieved {len(data)} notifications")
                return True
        
        self.log_result("Notifications List", False, f"Failed to get notifications: {response.status_code if response else 'No response'}")
        return False

    def test_notifications_read_all(self):
        """Test marking all notifications as read"""
        response = self.make_request("POST", "/notifications/read-all", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_result("Mark All Notifications Read", True, "All notifications marked as read")
                return True
        
        self.log_result("Mark All Notifications Read", False, f"Failed to mark notifications as read: {response.status_code if response else 'No response'}")
        return False

    def test_orders_create(self):
        """Test creating an order"""
        # First get a restaurant and menu item
        response = self.make_request("GET", "/restaurants")
        if not response or response.status_code != 200:
            self.log_result("Create Order", False, "Could not get restaurant list first")
            return False
            
        restaurants = response.json()
        if not restaurants:
            self.log_result("Create Order", False, "No restaurants available")
            return False
            
        restaurant = restaurants[0]
        restaurant_id = restaurant["restaurant_id"]
        
        # Get menu items
        response = self.make_request("GET", f"/restaurants/{restaurant_id}/menu")
        if not response or response.status_code != 200:
            self.log_result("Create Order", False, "Could not get menu items")
            return False
            
        menu_items = response.json()
        if not menu_items:
            self.log_result("Create Order", False, "No menu items available")
            return False
            
        item = menu_items[0]
        
        order_data = {
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant["name"],
            "items": [{
                "item_id": item["item_id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": 2,
                "restaurant_id": restaurant_id
            }],
            "subtotal": item["price"] * 2,
            "delivery_fee": restaurant["delivery_fee"],
            "total": (item["price"] * 2) + restaurant["delivery_fee"],
            "delivery_address": "123 Test Street, Test City"
        }
        
        response = self.make_request("POST", "/orders", order_data, use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("order_id"):
                self.log_result("Create Order", True, f"Order created: {data['order_id']}")
                return True
        
        self.log_result("Create Order", False, f"Failed to create order: {response.status_code if response else 'No response'}")
        return False

    def test_orders_list(self):
        """Test getting user orders"""
        response = self.make_request("GET", "/orders", use_auth=True)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Orders List", True, f"Retrieved {len(data)} orders")
                return True
        
        self.log_result("Orders List", False, f"Failed to get orders: {response.status_code if response else 'No response'}")
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Qmeal API Tests - Updated JWT Authentication")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            # Basic health check
            ("Health Check", self.test_health_check),
            
            # Authentication flow (NEW JWT-based)
            ("Auth Register/Login", self.test_auth_register),
            ("Auth Me", self.test_auth_me),
            
            # Public endpoints
            ("Restaurants List", self.test_restaurants_list),
            ("Restaurant Detail", self.test_restaurant_detail),
            ("Restaurant Menu", self.test_restaurant_menu),
            
            # NEW Favorites endpoints
            ("Add Favorite", self.test_favorites_add),
            ("Favorites List", self.test_favorites_list),
            ("Check Favorite", self.test_favorites_check),
            ("Remove Favorite", self.test_favorites_remove),
            
            # NEW Payment endpoints
            ("Payment Config", self.test_payment_config),
            ("Payment Intent", self.test_payment_intent),
            
            # NEW Notifications endpoints
            ("Notifications List", self.test_notifications_list),
            ("Mark All Notifications Read", self.test_notifications_read_all),
            
            # Orders
            ("Create Order", self.test_orders_create),
            ("Orders List", self.test_orders_list),
            
            # Logout
            ("Auth Logout", self.test_auth_logout),
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
            print("🎉 All tests passed!")
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
    tester = QmealAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)