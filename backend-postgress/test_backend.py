import requests
import json
import uuid

# Test if the backend is working
try:
    response = requests.get('http://localhost:8000/api/', timeout=5)
    print(f'Backend status: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Backend error: {str(e)}')

# Generate a valid UUID for testing
test_token = str(uuid.uuid4())
print(f'Using test token: {test_token}')

# Test submit test endpoint with a mock request
try:
    test_data = {
        'answers': [
            {
                'question_id': str(uuid.uuid4()),
                'answer': 'Test answer'
            }
        ]
    }

    response = requests.post(f'http://localhost:8000/api/submit-test/{test_token}', json=test_data, timeout=5)
    print(f'Submit test: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Submit test error: {str(e)}')
