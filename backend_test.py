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
BASE_URL = "https://meal-express-162.preview.emergentagent.com/api"

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
        
    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("Health Check", True, "Health endpoint working correctly", data)
                else:
                    self.log_result("Health Check", False, f"Unexpected response format: {data}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
    
    def test_restaurants_list(self):
        """Test GET /api/restaurants"""
        try:
            response = requests.get(f"{BASE_URL}/restaurants", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check first restaurant structure
                    restaurant = data[0]
                    required_fields = ["restaurant_id", "name", "cuisine_type", "rating"]
                    missing_fields = [field for field in required_fields if field not in restaurant]
                    
                    if not missing_fields:
                        self.log_result("Restaurants List", True, f"Retrieved {len(data)} restaurants successfully")
                    else:
                        self.log_result("Restaurants List", False, f"Missing required fields: {missing_fields}")
                else:
                    self.log_result("Restaurants List", False, "Empty or invalid restaurant list")
            else:
                self.log_result("Restaurants List", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Restaurants List", False, f"Request failed: {str(e)}")
    
    def test_restaurants_with_filters(self):
        """Test GET /api/restaurants with filters"""
        try:
            # Test cuisine filter
            response = requests.get(f"{BASE_URL}/restaurants?cuisine=Italian", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Restaurant Cuisine Filter", True, f"Cuisine filter returned {len(data)} results")
                else:
                    self.log_result("Restaurant Cuisine Filter", False, "Invalid response format")
            else:
                self.log_result("Restaurant Cuisine Filter", False, f"HTTP {response.status_code}")
                
            # Test rating filter
            response = requests.get(f"{BASE_URL}/restaurants?min_rating=4.5", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Restaurant Rating Filter", True, f"Rating filter returned {len(data)} results")
                else:
                    self.log_result("Restaurant Rating Filter", False, "Invalid response format")
            else:
                self.log_result("Restaurant Rating Filter", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Restaurant Filters", False, f"Request failed: {str(e)}")
    
    def test_restaurant_detail(self):
        """Test GET /api/restaurants/{id}"""
        try:
            # Use known restaurant ID from seed data
            restaurant_id = "rest_001"
            response = requests.get(f"{BASE_URL}/restaurants/{restaurant_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["restaurant_id", "name", "description", "cuisine_type", "rating"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Restaurant Detail", True, f"Retrieved restaurant details for {data.get('name', 'Unknown')}")
                else:
                    self.log_result("Restaurant Detail", False, f"Missing required fields: {missing_fields}")
            else:
                self.log_result("Restaurant Detail", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Restaurant Detail", False, f"Request failed: {str(e)}")
    
    def test_restaurant_menu(self):
        """Test GET /api/restaurants/{id}/menu"""
        try:
            restaurant_id = "rest_001"
            response = requests.get(f"{BASE_URL}/restaurants/{restaurant_id}/menu", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check first menu item structure
                    item = data[0]
                    required_fields = ["item_id", "name", "price", "category"]
                    missing_fields = [field for field in required_fields if field not in item]
                    
                    if not missing_fields:
                        self.log_result("Restaurant Menu", True, f"Retrieved {len(data)} menu items")
                    else:
                        self.log_result("Restaurant Menu", False, f"Missing required fields: {missing_fields}")
                else:
                    self.log_result("Restaurant Menu", False, "Empty or invalid menu items")
            else:
                self.log_result("Restaurant Menu", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Restaurant Menu", False, f"Request failed: {str(e)}")
    
    def test_restaurant_reviews(self):
        """Test GET /api/restaurants/{id}/reviews"""
        try:
            restaurant_id = "rest_001"
            response = requests.get(f"{BASE_URL}/restaurants/{restaurant_id}/reviews", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Restaurant Reviews", True, f"Retrieved {len(data)} reviews")
                else:
                    self.log_result("Restaurant Reviews", False, "Invalid response format")
            else:
                self.log_result("Restaurant Reviews", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Restaurant Reviews", False, f"Request failed: {str(e)}")
    
    def test_cuisines_list(self):
        """Test GET /api/cuisines"""
        try:
            response = requests.get(f"{BASE_URL}/cuisines", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "cuisines" in data and isinstance(data["cuisines"], list):
                    self.log_result("Cuisines List", True, f"Retrieved {len(data['cuisines'])} cuisines")
                else:
                    self.log_result("Cuisines List", False, "Invalid response format")
            else:
                self.log_result("Cuisines List", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Cuisines List", False, f"Request failed: {str(e)}")
    
    def create_test_user_session(self):
        """Create a test user and session directly in MongoDB for auth testing"""
        try:
            import subprocess
            import uuid
            
            # Generate unique identifiers
            timestamp = int(datetime.now().timestamp())
            visitor_id = f"user_{timestamp}"
            session_token = f"test_session_{timestamp}"
            
            # MongoDB command to create test user and session
            mongo_command = f"""
            use('test_database');
            var visitorId = '{visitor_id}';
            var sessionToken = '{session_token}';
            db.users.insertOne({{
              user_id: visitorId,
              email: 'test.user.{timestamp}@example.com',
              name: 'Test User {timestamp}',
              picture: 'https://via.placeholder.com/150',
              created_at: new Date()
            }});
            db.user_sessions.insertOne({{
              user_id: visitorId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            }});
            print('SUCCESS: Session created');
            """
            
            result = subprocess.run(
                ["mongosh", "--eval", mongo_command],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and "SUCCESS: Session created" in result.stdout:
                self.session_token = session_token
                self.user_id = visitor_id
                self.log_result("Create Test Session", True, f"Created test user session: {visitor_id}")
                return True
            else:
                self.log_result("Create Test Session", False, f"MongoDB command failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_result("Create Test Session", False, f"Failed to create test session: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test GET /api/auth/me with authentication"""
        if not self.session_token:
            self.log_result("Auth Me", False, "No session token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["user_id", "email", "name"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Auth Me", True, f"Retrieved user info for {data.get('name', 'Unknown')}")
                else:
                    self.log_result("Auth Me", False, f"Missing required fields: {missing_fields}")
            elif response.status_code == 401:
                self.log_result("Auth Me", False, "Authentication failed - invalid session token")
            else:
                self.log_result("Auth Me", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Auth Me", False, f"Request failed: {str(e)}")
    
    def test_orders_get(self):
        """Test GET /api/orders with authentication"""
        if not self.session_token:
            self.log_result("Get Orders", False, "No session token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/orders", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Orders", True, f"Retrieved {len(data)} orders")
                else:
                    self.log_result("Get Orders", False, "Invalid response format")
            elif response.status_code == 401:
                self.log_result("Get Orders", False, "Authentication failed")
            else:
                self.log_result("Get Orders", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Orders", False, f"Request failed: {str(e)}")
    
    def test_orders_create(self):
        """Test POST /api/orders with authentication"""
        if not self.session_token:
            self.log_result("Create Order", False, "No session token available")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            order_data = {
                "restaurant_id": "rest_001",
                "restaurant_name": "Bella Italia",
                "items": [
                    {
                        "item_id": "item_001",
                        "name": "Margherita Pizza",
                        "price": 14.99,
                        "quantity": 2,
                        "restaurant_id": "rest_001"
                    }
                ],
                "subtotal": 29.98,
                "delivery_fee": 2.99,
                "total": 32.97,
                "delivery_address": "123 Test Street, Test City"
            }
            
            response = requests.post(f"{BASE_URL}/orders", headers=headers, json=order_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["order_id", "user_id", "restaurant_id", "total", "status"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Create Order", True, f"Created order {data.get('order_id', 'Unknown')} with total ${data.get('total', 0)}")
                else:
                    self.log_result("Create Order", False, f"Missing required fields: {missing_fields}")
            elif response.status_code == 401:
                self.log_result("Create Order", False, "Authentication failed")
            else:
                self.log_result("Create Order", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Create Order", False, f"Request failed: {str(e)}")
    
    def test_reviews_create(self):
        """Test POST /api/reviews with authentication"""
        if not self.session_token:
            self.log_result("Create Review", False, "No session token available")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            review_data = {
                "restaurant_id": "rest_001",
                "rating": 5,
                "comment": "Excellent pizza and great service! Highly recommend the Margherita."
            }
            
            response = requests.post(f"{BASE_URL}/reviews", headers=headers, json=review_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["review_id", "restaurant_id", "user_id", "rating", "comment"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Create Review", True, f"Created review {data.get('review_id', 'Unknown')} with {data.get('rating', 0)} stars")
                else:
                    self.log_result("Create Review", False, f"Missing required fields: {missing_fields}")
            elif response.status_code == 401:
                self.log_result("Create Review", False, "Authentication failed")
            else:
                self.log_result("Create Review", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Create Review", False, f"Request failed: {str(e)}")
    
    def test_auth_logout(self):
        """Test POST /api/auth/logout with authentication"""
        if not self.session_token:
            self.log_result("Auth Logout", False, "No session token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Auth Logout", True, "Successfully logged out")
                else:
                    self.log_result("Auth Logout", False, "Unexpected response format")
            else:
                self.log_result("Auth Logout", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Auth Logout", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Qmeal API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Test public endpoints first
        print("\n📋 Testing Public Endpoints:")
        self.test_health_check()
        self.test_restaurants_list()
        self.test_restaurants_with_filters()
        self.test_restaurant_detail()
        self.test_restaurant_menu()
        self.test_restaurant_reviews()
        self.test_cuisines_list()
        
        # Create test session for authenticated endpoints
        print("\n🔐 Setting up Authentication:")
        if self.create_test_user_session():
            print("\n🔒 Testing Authenticated Endpoints:")
            self.test_auth_me()
            self.test_orders_get()
            self.test_orders_create()
            self.test_reviews_create()
            self.test_auth_logout()
        else:
            print("❌ Skipping authenticated tests - session creation failed")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {total - passed}")
        print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = QmealAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)