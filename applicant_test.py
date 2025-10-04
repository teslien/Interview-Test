#!/usr/bin/env python3

import requests
import json

def test_applicant_invites():
    """Test applicant my-invites endpoint"""
    base_url = "https://prescreen-app.preview.emergentagent.com/api"
    
    print("🚀 Testing Applicant My-Invites Endpoint")
    print("=" * 50)
    
    # Applicant Login
    print("\n1. Applicant Login...")
    applicant_response = requests.post(f"{base_url}/auth/login", json={
        "email": "applicant@example.com", 
        "password": "applicant123"
    })
    
    if applicant_response.status_code != 200:
        print(f"❌ Applicant login failed: {applicant_response.status_code}")
        return False
        
    applicant_token = applicant_response.json()['access_token']
    applicant_headers = {"Authorization": f"Bearer {applicant_token}"}
    print(" Applicant login successful")
    
    # Test my-invites endpoint
    print("\n2. Testing /my-invites endpoint...")
    invites_response = requests.get(f"{base_url}/my-invites", headers=applicant_headers)
    if invites_response.status_code != 200:
        print(f"❌ My-invites failed: {invites_response.status_code}")
        print(f"Error: {invites_response.text}")
        return False
        
    invites = invites_response.json()
    print(f" Applicant can see {len(invites)} invitations")
    
    # Display invitation details
    for i, invite in enumerate(invites):
        print(f"   Invite {i+1}:")
        print(f"     - Test: {invite.get('test_title', 'Unknown')}")
        print(f"     - Status: {invite.get('status', 'Unknown')}")
        print(f"     - Token: {invite.get('invite_token', 'Unknown')[:20]}...")
    
    return True

if __name__ == "__main__":
    success = test_applicant_invites()
    exit(0 if success else 1)