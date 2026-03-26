import urllib.request
import urllib.parse
import json
import time
import os
import uuid

BASE_URL = "http://localhost:5000/api"
IMAGE_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\guru-master-app\\backend\\temp\\828ee3a9-0733-42b7-9d1d-67e858f4a400"

def create_multipart_formdata(fields, files):
    boundary = uuid.uuid4().hex
    body = []
    
    for name, value in fields.items():
        body.extend([
            f'--{boundary}',
            f'Content-Disposition: form-data; name="{name}"',
            '',
            str(value)
        ])
    
    for name, filepath in files.items():
        filename = os.path.basename(filepath)
        with open(filepath, 'rb') as f:
            content = f.read()
        body.extend([
            f'--{boundary}',
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"',
            'Content-Type: image/jpeg',
            ''
        ])
        body.append(content)
    
    body.append(f'--{boundary}--')
    
    # Flatten body list into bytes
    payload = b''
    for part in body:
        if isinstance(part, str):
            payload += part.encode('utf-8') + b'\r\n'
        else:
            payload += part + b'\r\n'
            
    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(payload))
    }
    
    return payload, headers

def test_render():
    print("Listing images...")
    try:
        images = [f for f in os.listdir(IMAGE_DIR) if f.endswith('.jpg')][:3]
    except Exception as e:
        print(f"Error listing images: {e}")
        return

    if not images:
        print("No images found.")
        return

    fields = {
        'projectName': 'Urllib Test Render',
        'settings': json.dumps({
            'resolution': '1080p Horizontal (1920x1080)',
            'fps': '30 FPS',
            'transitionStyle': 'crossfade',
            'zoomStyle': 'zoom-in',
            'zoomSpeed': 'Normal (1.1x)',
            'filterStyle': 'nenhum'
        })
    }
    
    files = {}
    for i, img in enumerate(images):
        files[f'image_{i}'] = os.path.join(IMAGE_DIR, img)

    print("Building payload...")
    payload, headers = create_multipart_formdata(fields, files)

    print("Sending render request...")
    req = urllib.request.Request(f"{BASE_URL}/render", data=payload, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            job_id = data['job_id']
            print(f"Job started: {job_id}")
    except Exception as e:
        print(f"Error starting render: {e}")
        return

    while True:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/status/{job_id}") as resp:
                status_data = json.loads(resp.read().decode('utf-8'))
                print(f"Status: {status_data['status']} | Progress: {status_data['progress']}%")
                
                if status_data['progress'] == 100 or 'Erro' in status_data['status'] or 'Falha' in status_data['status']:
                    break
        except Exception as e:
            print(f"Error checking status: {e}")
            break
            
        time.sleep(2)

    print("Final Status:", status_data['status'])

if __name__ == "__main__":
    test_render()
