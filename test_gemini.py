import json
import urllib.request
from urllib.error import HTTPError
import ssl

def check_gemini(api_key):
    ctx = ssl._create_unverified_context()
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        with urllib.request.urlopen(url, timeout=10, context=ctx) as response:
            print(f"Status: {response.status}")
            data = json.loads(response.read().decode())
            print("Successfully retrieved models.")
            # Print first few models
            for model in data.get('models', [])[:3]:
                print(f" - {model.get('name')}")
    except HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    with open('backend/config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
        key = config.get('gemini_key')
        print(f"Checking key: {key[:5]}...{key[-5:]}")
        check_gemini(key)
