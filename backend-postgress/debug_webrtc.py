import requests
import json

# First, let's check if the backend is running
try:
    response = requests.get('http://localhost:8000/api/')
    print(f'Backend status: {response.status_code} - {response.json()}')
except Exception as e:
    print(f'Backend not running: {e}')
    exit(1)

# Check if there are any users (try to register an admin)
try:
    register_response = requests.post('http://localhost:8000/api/auth/register', json={
        'email': 'admin@example.com',
        'password': 'password',
        'full_name': 'Test Admin',
        'role': 'admin'
    })
    if register_response.status_code in [200, 400]:  # 400 means user already exists
        print(f'Register result: {register_response.status_code}')
    else:
        print(f'Register error: {register_response.status_code} - {register_response.text}')
except Exception as e:
    print(f'Register error: {e}')

# Try to login
try:
    login_response = requests.post('http://localhost:8000/api/auth/login', json={
        'email': 'admin@example.com',
        'password': 'password'
    })
    if login_response.status_code == 200:
        user_data = login_response.json()
        print(f'Login successful: {user_data["user"]["role"]}')
        token = user_data['access_token']
        headers = {'Authorization': f'Bearer {token}'}
    else:
        print(f'Login failed: {login_response.status_code} - {login_response.text}')
        exit(1)
except Exception as e:
    print(f'Login error: {e}')
    exit(1)

# Get all tests
try:
    response = requests.get('http://localhost:8000/api/tests', headers=headers)
    if response.status_code == 200:
        tests = response.json()
        print(f'Found {len(tests)} tests')
        if tests:
            test_id = tests[0]['id']
            print(f'Using test ID: {test_id}')
        else:
            print('No tests found - need to create one first')
            exit(1)
    else:
        print(f'Error getting tests: {response.status_code} - {response.text}')
        exit(1)
except Exception as e:
    print(f'Error getting tests: {e}')
    exit(1)

# Create a test invite
try:
    invite_response = requests.post('http://localhost:8000/api/invites', headers=headers, json={
        'test_id': test_id,
        'applicant_email': 'test@example.com',
        'applicant_name': 'Test User'
    })
    if invite_response.status_code == 200:
        invite_data = invite_response.json()
        invite_id = invite_data['id']
        invite_token = invite_data['invite_token']
        print(f'Created invite - ID: {invite_id}, Token: {invite_token}')
    else:
        print(f'Error creating invite: {invite_response.status_code} - {invite_response.text}')
        exit(1)
except Exception as e:
    print(f'Error creating invite: {e}')
    exit(1)

# Check the invite status
try:
    response = requests.get(f'http://localhost:8000/api/take-test/{invite_token}')
    print(f'Invite access: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'Invite status: {data.get("invite", {}).get("status")}')
        print(f'Invite ID: {data.get("invite", {}).get("id")}')
        db_invite_id = data.get("invite", {}).get("id")
except Exception as e:
    print(f'Error checking invite: {e}')

# Try to start the test (this should change status to in_progress)
if 'invite_token' in locals():
    try:
        start_response = requests.post(f'http://localhost:8000/api/start-test/{invite_token}')
        print(f'Start test: {start_response.status_code} - {start_response.text}')
    except Exception as e:
        print(f'Error starting test: {e}')

    # Check invite status again
    try:
        response = requests.get(f'http://localhost:8000/api/take-test/{invite_token}')
        if response.status_code == 200:
            data = response.json()
            print(f'Invite status after start: {data.get("invite", {}).get("status")}')
    except Exception as e:
        print(f'Error checking invite after start: {e}')

# Test WebRTC endpoints with the real invite ID
if 'db_invite_id' in locals():
    try:
        response = requests.post(f'http://localhost:8000/api/webrtc/start-session/{db_invite_id}')
        print(f'Start WebRTC session: {response.status_code} - {response.text}')
    except Exception as e:
        print(f'Error starting WebRTC session: {e}')

    # Check signals
    try:
        response = requests.get(f'http://localhost:8000/api/webrtc/signals/{db_invite_id}')
        if response.status_code == 200:
            data = response.json()
            print(f'Signals found: {len(data.get("signals", []))}')
            print(f'Session status: {data.get("session_status", "unknown")}')
            for signal in data.get("signals", []):
                print(f'  - {signal["type"]}: {signal["data"].get("type", "unknown")[:50]}...')
        else:
            print(f'Error getting signals: {response.status_code} - {response.text}')
    except Exception as e:
        print(f'Error getting signals: {e}')

    # Wait a bit and check again to see if signals arrive
    import time
    print('Waiting 3 seconds for signals...')
    time.sleep(3)

    try:
        response = requests.get(f'http://localhost:8000/api/webrtc/signals/{db_invite_id}')
        if response.status_code == 200:
            data = response.json()
            print(f'Signals after wait: {len(data.get("signals", []))}')
            for signal in data.get("signals", []):
                print(f'  - {signal["type"]}: {signal["data"].get("type", "unknown")[:50]}...')
    except Exception as e:
        print(f'Error getting signals after wait: {e}')

print('Debug complete')
