import requests
import os
import json
import time

BASE_URL = "http://localhost:5000/api"

# Paths to sample assets (adjust as necessary)
IMAGE_1 = r"C:\Users\gusta\.gemini\antigravity\scratch\guru-master-app-main\backend\test_output.jpg"
IMAGE_2 = r"C:\Users\gusta\.gemini\antigravity\scratch\guru-master-app-main\backend\temp_verify.jpg"
AUDIO = r"C:\Users\gusta\.gemini\antigravity\scratch\guru-master-app-main\backend\short_audio.mp3"

def test_render():
    print("Testing Video Render...")
    
    if not os.path.exists(IMAGE_1) or not os.path.exists(AUDIO):
        print(f"Error: Sample files not found. Check paths.")
        print(f"IMAGE_1 exists: {os.path.exists(IMAGE_1)}")
        print(f"AUDIO exists: {os.path.exists(AUDIO)}")
        return

    files = {
        'image_0': open(IMAGE_1, 'rb'),
        'image_1': open(IMAGE_2, 'rb'),
        'audio': open(AUDIO, 'rb')
    }
    
    payload = {
        'projectName': 'Smoke Test Video',
        'settings': json.dumps({
            'resolution': '1080p Horizontal (1920x1080)',
            'fps': '30 FPS',
            'transitionStyle': 'crossfade',
            'zoomStyle': 'none',
            'filterStyle': 'sepia'
        })
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/render", data=payload, files=files)
        if resp.status_code != 200:
            print(f"Failed to start render: {resp.text}")
            return
            
        job_id = resp.json()['job_id']
        print(f"Job started: {job_id}")
        
        while True:
            s_resp = requests.get(f"{BASE_URL}/status/{job_id}")
            if s_resp.status_code != 200:
                print(f"Error checking status: {s_resp.text}")
                break
                
            data = s_resp.json()
            print(f"Status: {data['status']} | Progress: {data['progress']}%")
            
            if data['progress'] == 100:
                print("Render SUCCESS!")
                print(f"File saved at: {data.get('local_path')}")
                break
            if 'Falha' in data['status'] or 'Erro' in data['status']:
                print(f"Render FAILED: {data['status']}")
                # Check log
                log_url = f"{BASE_URL}/temp/{job_id}/render.log" # This route might not exist, but let's check filesystem
                break
                
            time.sleep(2)
            
    finally:
        for f in files.values():
            f.close()

def test_proxy():
    print("\nTesting Gemini Proxy...")
    try:
        resp = requests.get(f"{BASE_URL}/gemini/v1beta/models?key=INVALID_KEY")
        print(f"Proxy response status: {resp.status_code}")
        if resp.status_code != 200:
             print(f"Note: Got {resp.status_code}, which indicates proxy is communicating with Google.")
        else:
             print("Proxy returned 200.")
    except Exception as e:
        print(f"Proxy test failed: {e}")

if __name__ == "__main__":
    test_render()
    test_proxy()
