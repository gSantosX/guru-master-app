import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_check():
    print("Testing /api/check...")
    try:
        res = requests.get(f"{BASE_URL}/api/check")
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_gemini_proxy():
    print("\nTesting /api/gemini proxy...")
    # The key provided by the user
    key = "AIzaSyCMf2eacAIVhJmrd8lTVxF-33PJ4PA_EPM"
    url = f"{BASE_URL}/api/gemini/v1beta/models?api_key={key}"
    try:
        res = requests.get(f"{BASE_URL}/api/gemini/v1beta/models?key={key}")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print("Successfully reached Gemini via proxy!")
        else:
            print(f"Error Body: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_check()
    test_gemini_proxy()
