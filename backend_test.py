import requests
import sys
import json
from datetime import datetime, timezone

class InterviewPlatformAPITester:
    def __init__(self, base_url="https://prescreen-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.applicant_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_applicant_login(self):
        """Test applicant login"""
        success, response = self.run_test(
            "Applicant Login",
            "POST",
            "auth/login",
            200,
            data={"email": "applicant@example.com", "password": "applicant123"}
        )
        if success and 'access_token' in response:
            self.applicant_token = response['access_token']
            print(f"   Applicant token obtained: {self.applicant_token[:20]}...")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        return success

    def test_admin_me_endpoint(self):
        """Test /auth/me endpoint with admin token"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Admin /auth/me",
            "GET",
            "auth/me",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and response.get('role') == 'admin':
            print(f"   Admin user: {response.get('email')}")
            return True
        return False

    def test_applicant_me_endpoint(self):
        """Test /auth/me endpoint with applicant token"""
        if not self.applicant_token:
            print("❌ Applicant token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Applicant /auth/me",
            "GET",
            "auth/me",
            200,
            headers={"Authorization": f"Bearer {self.applicant_token}"}
        )
        if success and response.get('role') == 'applicant':
            print(f"   Applicant user: {response.get('email')}")
            return True
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        success, response = self.run_test(
            "Unauthorized Access to /auth/me",
            "GET",
            "auth/me",
            401
        )
        return success

    def test_admin_tests_endpoint(self):
        """Test admin tests endpoint"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Admin Get Tests",
            "GET",
            "tests",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success:
            print(f"   Found {len(response)} tests")
            return True
        return False

    def test_applicant_forbidden_access(self):
        """Test applicant accessing admin-only endpoint"""
        if not self.applicant_token:
            print("❌ Applicant token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Applicant Forbidden Access to Tests",
            "GET",
            "tests",
            403,
            headers={"Authorization": f"Bearer {self.applicant_token}"}
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "full_name": "Test User",
                "role": "applicant"
            }
        )
        return success

    def test_duplicate_registration(self):
        """Test duplicate user registration"""
        success, response = self.run_test(
            "Duplicate Registration",
            "POST",
            "auth/register",
            400,
            data={
                "email": "admin@example.com",  # Already exists
                "password": "testpass123",
                "full_name": "Test Admin",
                "role": "admin"
            }
        )
        return success

    def test_create_test_multiple_choice(self):
        """Test creating a test with multiple choice questions"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        test_data = {
            "title": "Sample Multiple Choice Test",
            "description": "A test with multiple choice questions",
            "duration_minutes": 30,
            "questions": [
                {
                    "type": "multiple_choice",
                    "question": "What is 2 + 2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_answer": "4",
                    "points": 1
                },
                {
                    "type": "multiple_choice", 
                    "question": "What is the capital of France?",
                    "options": ["London", "Berlin", "Paris", "Madrid"],
                    "correct_answer": "Paris",
                    "points": 2
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Multiple Choice Test",
            "POST",
            "tests",
            200,
            data=test_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and 'id' in response:
            self.created_test_id = response['id']
            print(f"   Created test ID: {self.created_test_id}")
            return True
        return False

    def test_create_test_coding(self):
        """Test creating a test with coding questions"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        test_data = {
            "title": "Python Coding Test",
            "description": "A test with coding questions",
            "duration_minutes": 60,
            "questions": [
                {
                    "type": "coding",
                    "question": "Write a function to reverse a string",
                    "expected_language": "python",
                    "points": 5
                },
                {
                    "type": "essay",
                    "question": "Explain the difference between list and tuple in Python",
                    "points": 3
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Coding Test",
            "POST",
            "tests",
            200,
            data=test_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_specific_test(self):
        """Test getting a specific test by ID"""
        if not self.admin_token or not hasattr(self, 'created_test_id'):
            print("❌ Admin token or test ID not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Specific Test",
            "GET",
            f"tests/{self.created_test_id}",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and response.get('id') == self.created_test_id:
            print(f"   Retrieved test: {response.get('title')}")
            return True
        return False

    def test_create_test_invitation(self):
        """Test creating a test invitation"""
        if not self.admin_token or not hasattr(self, 'created_test_id'):
            print("❌ Admin token or test ID not available, skipping test")
            return False
            
        invite_data = {
            "test_id": self.created_test_id,
            "applicant_email": "john.doe@example.com",
            "applicant_name": "John Doe"
        }
        
        success, response = self.run_test(
            "Create Test Invitation",
            "POST",
            "invites",
            200,
            data=invite_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and 'invite_token' in response:
            self.invite_token = response['invite_token']
            print(f"   Created invite token: {self.invite_token[:20]}...")
            return True
        return False

    def test_get_invitations(self):
        """Test getting all invitations for admin"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Invitations",
            "GET",
            "invites",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success:
            print(f"   Found {len(response)} invitations")
            return True
        return False

    def test_get_invite_by_token(self):
        """Test getting invitation details by token"""
        if not hasattr(self, 'invite_token'):
            print("❌ Invite token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Invite by Token",
            "GET",
            f"invites/token/{self.invite_token}",
            200
        )
        if success and 'invite' in response and 'test' in response:
            print(f"   Retrieved invite for: {response['invite'].get('applicant_name')}")
            return True
        return False

    def test_applicant_cannot_create_test(self):
        """Test that applicant cannot create tests"""
        if not self.applicant_token:
            print("❌ Applicant token not available, skipping test")
            return False
            
        test_data = {
            "title": "Unauthorized Test",
            "description": "This should fail",
            "duration_minutes": 30,
            "questions": []
        }
        
        success, response = self.run_test(
            "Applicant Cannot Create Test",
            "POST",
            "tests",
            403,
            data=test_data,
            headers={"Authorization": f"Bearer {self.applicant_token}"}
        )
        return success

    def test_applicant_cannot_create_invite(self):
        """Test that applicant cannot create invitations"""
        if not self.applicant_token:
            print("❌ Applicant token not available, skipping test")
            return False
            
        invite_data = {
            "test_id": "some-test-id",
            "applicant_email": "test@example.com",
            "applicant_name": "Test User"
        }
        
        success, response = self.run_test(
            "Applicant Cannot Create Invite",
            "POST",
            "invites",
            403,
            data=invite_data,
            headers={"Authorization": f"Bearer {self.applicant_token}"}
        )
        return success

    def test_invalid_test_creation(self):
        """Test creating test with invalid data"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        # Missing required fields
        invalid_test_data = {
            "title": "Invalid Test"
            # Missing description, duration_minutes, questions
        }
        
        success, response = self.run_test(
            "Invalid Test Creation",
            "POST",
            "tests",
            422,  # Validation error
            data=invalid_test_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_results(self):
        """Test getting test results (admin only)"""
        if not self.admin_token:
            print("❌ Admin token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Get Test Results",
            "GET",
            "results",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success:
            print(f"   Found {len(response)} test results")
            return True
        return False

    def test_applicant_cannot_access_results(self):
        """Test that applicant cannot access results"""
        if not self.applicant_token:
            print("❌ Applicant token not available, skipping test")
            return False
            
        success, response = self.run_test(
            "Applicant Cannot Access Results",
            "GET",
            "results",
            403,
            headers={"Authorization": f"Bearer {self.applicant_token}"}
        )
        return success

def main():
    print("🚀 Starting Interview Platform API Tests")
    print("=" * 50)
    
    tester = InterviewPlatformAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Admin Login", tester.test_admin_login),
        ("Applicant Login", tester.test_applicant_login),
        ("Invalid Login", tester.test_invalid_login),
        ("Admin /auth/me", tester.test_admin_me_endpoint),
        ("Applicant /auth/me", tester.test_applicant_me_endpoint),
        ("Unauthorized Access", tester.test_unauthorized_access),
        ("Admin Tests Access", tester.test_admin_tests_endpoint),
        ("Applicant Forbidden Access", tester.test_applicant_forbidden_access),
        ("User Registration", tester.test_user_registration),
        ("Duplicate Registration", tester.test_duplicate_registration),
        ("Create Multiple Choice Test", tester.test_create_test_multiple_choice),
        ("Create Coding Test", tester.test_create_test_coding),
        ("Get Specific Test", tester.test_get_specific_test),
        ("Create Test Invitation", tester.test_create_test_invitation),
        ("Get Invitations", tester.test_get_invitations),
        ("Get Invite by Token", tester.test_get_invite_by_token),
        ("Applicant Cannot Create Test", tester.test_applicant_cannot_create_test),
        ("Applicant Cannot Create Invite", tester.test_applicant_cannot_create_invite),
        ("Invalid Test Creation", tester.test_invalid_test_creation),
        ("Get Test Results", tester.test_get_results),
        ("Applicant Cannot Access Results", tester.test_applicant_cannot_access_results),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": str(e)
            })
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
            print(f"  - {failure['test']}: {error_msg}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())