import requests
import json
import uuid

# Test WebRTC endpoints with better error handling
print('Testing WebRTC endpoints...')

# Generate a valid UUID for testing
test_invite_id = str(uuid.uuid4())
print(f'Using test invite ID: {test_invite_id}')

# Test start session endpoint
try:
    response = requests.post(f'http://localhost:8000/api/webrtc/start-session/{test_invite_id}', timeout=5)
    print(f'Start session: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Start session error: {str(e)}')

# Test offer endpoint
try:
    offer_data = {
        'type': 'offer',
        'sdp': 'test-sdp-offer-data',
        'invite_id': test_invite_id
    }
    response = requests.post('http://localhost:8000/api/webrtc/offer', json=offer_data, timeout=5)
    print(f'Offer: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Offer error: {str(e)}')

# Test getting signals
try:
    response = requests.get(f'http://localhost:8000/api/webrtc/signals/{test_invite_id}', timeout=5)
    print(f'Signals: {response.status_code} - {response.text[:200]}...')
except Exception as e:
    print(f'Signals error: {str(e)}')
