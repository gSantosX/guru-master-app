import json
import urllib.request
import urllib.error
import ssl
import os

def debug_connection():
    ctx = ssl._create_unverified_context()
    config_path = 'backend/config.json'
    
    if not os.path.exists(config_path):
        print(f"Error: {config_path} not found.")
        return

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    raw_keys = config.get('gemini_key', '')
    keys = [k.strip() for k in raw_keys.split(',') if k.strip()]
    
    if not keys:
        print("Error: No Gemini keys found in config.")
        return

    for i, key in enumerate(keys):
        print(f"\n=== Testing Key {i+1} ({key[:10]}...) ===")
        
        # Test basic connectivity and model access
        models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        try:
            with urllib.request.urlopen(models_url, timeout=10, context=ctx) as resp:
                print(f"Listing Models (v1beta): SUCCESS (Status {resp.status})")
                data = json.loads(resp.read().decode())
                available_models = [m['name'] for m in data.get('models', [])]
                print(f"Found {len(available_models)} models.")
        except urllib.error.HTTPError as e:
            print(f"Listing Models (v1beta): FAIL (Status {e.code})")
            print(f"Error Body: {e.read().decode()}")
            continue
        except Exception as e:
            print(f"Unexpected Error: {e}")
            continue

        # Test generation with a common model
        gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        body = json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode()
        try:
            req = urllib.request.Request(gen_url, data=body, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
                print(f"Generation (v1beta): SUCCESS (Status {resp.status})")
        except urllib.error.HTTPError as e:
            print(f"Generation (v1beta): FAIL (Status {e.code})")
            print(f"Error Body: {e.read().decode()}")

if __name__ == "__main__":
    debug_connection()
