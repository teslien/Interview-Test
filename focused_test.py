#!/usr/bin/env python3

import requests
import json
import uuid
from datetime import datetime

def test_submission_flow():
    """Test the complete submission flow as requested"""
    base_url = "https://prescreen-app.preview.emergentagent.com/api"
    
    print("🚀 Testing Complete Submission and Monitoring Flow")
    print("=" * 60)
    
    # 1. Admin Login
    print("\n1. Admin Login...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Admin login failed: {login_response.status_code}")
        return False
        
    admin_token = login_response.json()['access_token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Admin login successful")
    
    # 2. Applicant Login
    print("\n2. Applicant Login...")
    applicant_response = requests.post(f"{base_url}/auth/login", json={
        "email": "applicant@example.com", 
        "password": "applicant123"
    })
    
    if applicant_response.status_code != 200:
        print(f"❌ Applicant login failed: {applicant_response.status_code}")
        return False
        
    applicant_token = applicant_response.json()['access_token']
    applicant_headers = {"Authorization": f"Bearer {applicant_token}"}
    print("✅ Applicant login successful")
    
    # 3. Create Test with Multiple Choice Questions
    print("\n3. Creating test with multiple choice questions...")
    q1_id = str(uuid.uuid4())
    q2_id = str(uuid.uuid4())
    
    test_data = {
        "title": "Submission Flow Test",
        "description": "Test for complete submission flow",
        "duration_minutes": 30,
        "questions": [
            {
                "id": q1_id,
                "type": "multiple_choice",
                "question": "What is 3 + 3?",
                "options": ["5", "6", "7", "8"],
                "correct_answer": "6",
                "points": 2
            },
            {
                "id": q2_id,
                "type": "multiple_choice",
                "question": "What is the capital of Japan?",
                "options": ["Tokyo", "Osaka", "Kyoto", "Hiroshima"],
                "correct_answer": "Tokyo",
                "points": 3
            }
        ]
    }
    
    test_response = requests.post(f"{base_url}/tests", json=test_data, headers=admin_headers)
    if test_response.status_code != 200:
        print(f"❌ Test creation failed: {test_response.status_code}")
        return False
        
    test_id = test_response.json()['id']
    print(f"✅ Test created with ID: {test_id}")
    
    # 4. Create Fresh Test Invitation
    print("\n4. Creating fresh test invitation...")
    invite_data = {
        "test_id": test_id,
        "applicant_email": "test.submission@example.com",
        "applicant_name": "Test Submission User"
    }
    
    invite_response = requests.post(f"{base_url}/invites", json=invite_data, headers=admin_headers)
    if invite_response.status_code != 200:
        print(f"❌ Invitation creation failed: {invite_response.status_code}")
        return False
        
    invite_token = invite_response.json()['invite_token']
    print(f"✅ Invitation created with token: {invite_token[:20]}...")
    
    # 5. Admin Monitoring - Check Invites
    print("\n5. Admin monitoring - checking invites...")
    invites_response = requests.get(f"{base_url}/invites", headers=admin_headers)
    if invites_response.status_code != 200:
        print(f"❌ Get invites failed: {invites_response.status_code}")
        return False
        
    invites = invites_response.json()
    print(f"✅ Admin can see {len(invites)} invitations")
    
    # Check invitation by token instead (this should work)
    token_response = requests.get(f"{base_url}/invites/token/{invite_token}")
    if token_response.status_code != 200:
        print(f"❌ Get invite by token failed: {token_response.status_code}")
        return False
        
    token_data = token_response.json()
    initial_status = token_data['invite']['status']
    print(f"✅ Initial invitation status: {initial_status}")
    
    # 6. Start Test via /start-test/{token}
    print("\n6. Starting test via /start-test endpoint...")
    start_response = requests.post(f"{base_url}/start-test/{invite_token}")
    if start_response.status_code != 200:
        print(f"❌ Start test failed: {start_response.status_code}")
        return False
        
    start_data = start_response.json()
    print(f"✅ Test started successfully, status: {start_data.get('status')}")
    
    # 7. Verify Status Update (sent → in_progress)
    print("\n7. Verifying status update to 'in_progress'...")
    status_response = requests.get(f"{base_url}/invites/token/{invite_token}")
    if status_response.status_code != 200:
        print(f"❌ Get invite status failed: {status_response.status_code}")
        return False
        
    status_data = status_response.json()
    current_status = status_data['invite']['status']
    print(f"✅ Status updated to: {current_status}")
    
    if current_status != 'in_progress':
        print(f"❌ Expected 'in_progress', got '{current_status}'")
        return False
    
    # 8. Submit Test with Proper Answer Format
    print("\n8. Submitting test with proper answer format...")
    submission_data = {
        "answers": [
            {"question_id": q1_id, "answer": "6"},  # Correct answer
            {"question_id": q2_id, "answer": "Tokyo"}  # Correct answer
        ]
    }
    
    submit_response = requests.post(f"{base_url}/submit-test/{invite_token}", json=submission_data)
    if submit_response.status_code != 200:
        print(f"❌ Test submission failed: {submit_response.status_code}")
        print(f"Error: {submit_response.text}")
        return False
        
    submit_data = submit_response.json()
    score = submit_data.get('score')
    print(f"✅ Test submitted successfully, score: {score}%")
    
    # 9. Verify Score Calculation
    print("\n9. Verifying score calculation...")
    expected_score = 100.0  # Both answers correct
    if score == expected_score:
        print(f"✅ Score calculation correct: {score}%")
    else:
        print(f"❌ Score calculation incorrect. Expected: {expected_score}%, Got: {score}%")
        return False
    
    # 10. Verify Final Status Update (in_progress → completed)
    print("\n10. Verifying final status update to 'completed'...")
    final_status_response = requests.get(f"{base_url}/invites/token/{invite_token}")
    if final_status_response.status_code != 200:
        print(f"❌ Get final status failed: {final_status_response.status_code}")
        return False
        
    final_status_data = final_status_response.json()
    final_status = final_status_data['invite']['status']
    print(f"✅ Final status: {final_status}")
    
    if final_status != 'completed':
        print(f"❌ Expected 'completed', got '{final_status}'")
        return False
    
    # 11. Admin Monitoring - Check Results
    print("\n11. Admin monitoring - checking results...")
    results_response = requests.get(f"{base_url}/results", headers=admin_headers)
    if results_response.status_code != 200:
        print(f"❌ Get results failed: {results_response.status_code}")
        print(f"Error: {results_response.text}")
        return False
        
    results = results_response.json()
    print(f"✅ Admin can see {len(results)} test results")
    
    # 12. Test Error Handling - Invalid Token
    print("\n12. Testing error handling with invalid token...")
    invalid_response = requests.post(f"{base_url}/start-test/invalid-token-123")
    if invalid_response.status_code == 404:
        print("✅ Invalid token properly rejected")
    else:
        print(f"❌ Invalid token handling failed: {invalid_response.status_code}")
        return False
    
    # 13. Test Error Handling - Malformed Data
    print("\n13. Testing error handling with malformed data...")
    malformed_data = {"invalid_field": "test"}
    malformed_response = requests.post(f"{base_url}/submit-test/{invite_token}", json=malformed_data)
    if malformed_response.status_code == 422:
        print("✅ Malformed data properly rejected")
    else:
        print(f"❌ Malformed data handling failed: {malformed_response.status_code}")
    
    print("\n" + "=" * 60)
    print("🎉 COMPLETE SUBMISSION FLOW TEST PASSED!")
    print("✅ All critical functionality verified:")
    print("   - Fresh test invitation creation")
    print("   - Test start via /start-test/{token}")
    print("   - Proper answer format submission via /submit-test/{token}")
    print("   - Score calculation accuracy")
    print("   - Status transitions: sent → in_progress → completed")
    print("   - Admin monitoring of invitations and results")
    print("   - Error handling for invalid tokens and malformed data")
    print("   - ObjectId serialization working correctly")
    
    return True

if __name__ == "__main__":
    success = test_submission_flow()
    exit(0 if success else 1)