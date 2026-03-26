import requests
import time
import os
import json

BASE_URL = "http://localhost:5000/api"
IMAGE_DIR = r"c:\Users\ASUS\.\gemini\antigravity\scratch\guru-master-app\backend\temp\828ee3a9-0733-42b7-9d1d-67e858f4a400"

def test_render():
    print("Listing images...")
    images = [f for f in os.listdir(IMAGE_DIR) if f.endswith('.jpg')][:3]
    if not images:
        print("No images found for testing.")
        return

    files = {}
    for i, img in enumerate(images):
        files[f'image_{i}'] = open(os.path.join(IMAGE_DIR, img), 'rb')

    payload = {
        'projectName': 'Test Render Bot',
        'settings': json.dumps({
            'resolution': '1080p Horizontal (1920x1080)',
            'fps': '30 FPS',
            'transitionStyle': 'crossfade',
            'zoomStyle': 'zoom-in',
            'zoomSpeed': 'Normal (1.1x)',
            'filterStyle': 'nenhum'
        })
    }

    print("Sending render request...")
    resp = requests.post(f"{BASE_URL}/render", data=payload, files=files)
    
    for f in files.values():
        f.close()

    if resp.status_code != 200:
        print(f"Error starting render: {resp.text}")
        return

    job_id = resp.json()['job_id']
    print(f"Job started: {job_id}")

    while True:
        status_resp = requests.get(f"{BASE_URL}/status/{job_id}")
        if status_resp.status_code != 200:
            print(f"Error checking status: {status_resp.text}")
            break
        
        status_data = status_resp.json()
        print(f"Status: {status_data['status']} | Progress: {status_data['progress']}%")
        
        if status_data['progress'] == 100 or 'Erro' in status_data['status'] or 'Falha' in status_data['status']:
            break
            
        time.sleep(2)

    print("Final Status:", status_data['status'])

if __name__ == "__main__":
    test_render()
