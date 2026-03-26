import os
import uuid
import threading
import json
import time
from datetime import datetime
import subprocess
import re
import shutil
import random
import smtplib
import tkinter as tk
from tkinter import filedialog
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import urllib.request
import urllib.parse
import urllib.error
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import webbrowser

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

import ssl
ctx = ssl._create_unverified_context()

FFMPEG_CMD = 'ffmpeg'
FFPROBE_CMD = 'ffprobe'

WHISK_DOWNLOADS = os.path.join(os.path.expanduser("~"), "Whisk Downloads")

def get_whisk_downloads():
    config = load_config()
    path = config.get("whisk_downloads_path", WHISK_DOWNLOADS)
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path

# Global queue for Whisk prompts
whisk_queue = []
whisk_settings = {
    "aspect_ratio": "16:9",
    "image_count": 1,
    "auto_download": True,
    "check_folder_on_start": True
}

# Global store for active render jobs
render_jobs = {}

CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')
USERS_FILE = os.path.join(BASE_DIR, 'users.json')

# Temporary store for verification codes
verification_codes = {}

def load_config():
    global FFMPEG_CMD, FFPROBE_CMD
    config = {
        "gemini_key": "",
        "grok_key": "",
        "gpt_key": "",
        "google_client_id": "",
        "youtube_key": "",
        "smtp_user": "",
        "smtp_password": "",
        "ffmpeg_path": "ffmpeg",
        "ffprobe_path": "ffprobe",
        "active_ai": "Gemini",
        "theme": "neon",
        "reduce_motion": False,
        "whisk_downloads_path": os.path.join(os.path.expanduser("~"), "Whisk Downloads")
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                config.update(loaded)
        except Exception as e:
            print(f"Error loading config: {e}")
    
    FFMPEG_CMD = config.get("ffmpeg_path", "ffmpeg")
    FFPROBE_CMD = config.get("ffprobe_path", "ffprobe")
    return config

def save_config(config):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=4)

from email.mime.image import MIMEImage
from PIL import Image, ImageDraw, ImageFont

def get_code_image(code):
    try:
        img_path = os.path.join(BASE_DIR, 'email_template.jpg')
        if not os.path.exists(img_path):
            return None
            
        img = Image.open(img_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        pixels = img.load()
        
        box_y = -1
        box_x_start = -1
        box_x_end = -1
        
        # Scan bottom half for the white box
        for y in range(height // 2, height):
            white_count = 0
            for x in range(width):
                r, g, b = pixels[x, y][:3]
                if r > 220 and g > 220 and b > 220:
                    white_count += 1
                else:
                    if white_count > width * 0.4:
                        box_y = y
                        for xs in range(width):
                            if pixels[xs, y][0] > 220:
                                box_x_start = xs
                                break
                        for xe in range(width-1, 0, -1):
                            if pixels[xe, y][0] > 220:
                                box_x_end = xe
                                break
                        break
                    white_count = 0
            if box_y != -1: break
            
        if box_y == -1: 
             box_y, box_x_start, box_x_end = 538, 40, 530
             
        try:
            # Use arialbd.ttf if possible, otherwise arial.ttf or default
            font = ImageFont.truetype("arialbd.ttf", 60)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", 60)
            except:
                font = ImageFont.load_default()
            
        text = str(code)
        # Use textbbox for precise centering in Pillow 10+
        if hasattr(draw, "textbbox"):
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
        else:
            text_w = 140 # Ballpark
            
        center_x = box_x_start + (box_x_end - box_x_start) // 2
        draw.text((center_x - text_w // 2, box_y + 8), text, fill=(0, 0, 0), font=font)
        
        out_path = os.path.join(BASE_DIR, 'temp_verify.jpg')
        img.save(out_path, quality=95)
        return out_path
    except Exception as e:
        print(f"PIL Error: {e}")
        return None

def send_verification_email(target_email, code):
    config = load_config()
    smtp_user = str(config.get("smtp_user", ""))
    smtp_pass = str(config.get("smtp_password", ""))
    
    if not smtp_user or not smtp_pass:
        raise Exception("SMTP não configurado. Vá no ícone de engrenagem no Login.")
        
    msg = MIMEMultipart('related')
    msg['From'] = f"Guru Master AI <{smtp_user}>"
    msg['To'] = target_email
    msg['Subject'] = f"{code} é o seu código de verificação"
    
    # Generate the custom image
    custom_img_path = get_code_image(code)
    
    if custom_img_path:
        html_body = f"""
        <html>
            <body style="background: #000; margin: 0; padding: 20px; text-align: center;">
                <img src="cid:verify_image" style="max-width: 100%; border-radius: 15px; border: 1px solid #333;">
                <p style="color: #444; font-size: 10px; margin-top: 10px;">Código: {code}</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(html_body, 'html'))
        
        with open(custom_img_path, 'rb') as f:
            img_data = f.read()
            image = MIMEImage(img_data)
            image.add_header('Content-ID', '<verify_image>')
            msg.attach(image)
    else:
        # Fallback to text if image fails
        body = f"Seu código de verificação: {code}"
        msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise e

@app.route('/api/check', methods=['GET'])
def check_system():
    config = load_config()
    ffmpeg_ver = "Not found"
    try:
        res = subprocess.run([config.get('ffmpeg_path', 'ffmpeg'), '-version'], capture_output=True, text=True)
        if res.returncode == 0:
            ffmpeg_ver = res.stdout.split('\n')[0]
    except: pass
    
    youtube_status = False
    youtube_error = None
    yt_key = config.get('youtube_key')
    if yt_key and len(yt_key) > 5:
        import ssl
        try:
            # Check a dummy public video to verify key validity
            url = f"https://www.googleapis.com/youtube/v3/videos?part=id&id=Ks-_Mh1QhMc&key={yt_key}"
            # Disable SSL verification for the diagnostic check to avoid certificate issues on some systems
            ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(url, timeout=10, context=ctx) as response:
                if response.status == 200:
                    youtube_status = True
        except Exception as e:
             youtube_error = str(e)
             youtube_status = False

    status = {
        "status": "online",
        "ffmpeg": ffmpeg_ver,
        "ai": {
            "gemini": bool(config.get('gemini_key') and len(config.get('gemini_key')) > 5),
            "gpt": bool(config.get('gpt_key') and len(config.get('gpt_key')) > 5),
            "grok": bool(config.get('grok_key') and len(config.get('grok_key')) > 5),
            "youtube": youtube_status,
            "youtube_error": youtube_error
        },
        "smtp": bool(config.get('smtp_user') and config.get('smtp_password'))
    }
    return jsonify(status)

@app.route('/api/auth/send-code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "E-mail inválido"}), 400
        
    code = f"{random.randint(1000, 9999)}"
    verification_codes[email] = {
        "code": code,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        send_verification_email(email, code)
        return jsonify({"message": "Código enviado para " + email})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify-code', methods=['POST'])
def verify_code():
    data = request.json
    email = data.get('email')
    code = data.get('code')
    
    stored = verification_codes.get(email)
    if stored and stored['code'] == code:
        return jsonify({"message": "Código validado!"})
    return jsonify({"error": "Código inválido ou expirado"}), 400

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    code = data.get('code') # We require the code here too for security
    
    # 1. Verify code again
    stored = verification_codes.get(email)
    if not stored or stored['code'] != code:
        return jsonify({"error": "Sessão de verificação inválida. Reenvie o código."}), 400
    
    # 2. Proceed with registration
    users = load_users()
    if email in users:
        return jsonify({"error": "E-mail já cadastrado"}), 400
    
    users[email] = {
        "name": name,
        "password": password,
        "created_at": datetime.now().isoformat()
    }
    save_users(users)
    
    # Clean up verification code
    del verification_codes[email]
    
    return jsonify({"message": "Sucesso", "user": {"name": name, "email": email}})

@app.route('/api/auth/login', methods=['POST'])
def login_route():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    users = load_users()
    user = users.get(email)
    if not user or user['password'] != password:
        return jsonify({"error": "Credenciais inválidas"}), 401
    
    return jsonify({"user": {"name": user['name'], "email": email}})

# --- WHISK AUTOMATION ENDPOINTS ---

@app.route('/api/whisk/status', methods=['GET'])
def whisk_status():
    path = get_whisk_downloads()
    files = os.listdir(path) if os.path.exists(path) else []
    return jsonify({
        "path": path,
        "file_count": len(files),
        "is_empty": len(files) == 0,
        "queue_count": len(whisk_queue)
    })

@app.route('/api/whisk/clear', methods=['POST'])
def whisk_clear():
    path = get_whisk_downloads()
    try:
        if os.path.exists(path):
            for f in os.listdir(path):
                file_path = os.path.join(path, f)
                if os.path.isfile(file_path):
                    os.remove(file_path)
        return jsonify({"message": "Pasta limpa com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/whisk/images/<filename>')
def serve_whisk_image(filename):
    path = get_whisk_downloads()
    return send_file(os.path.join(path, filename))

@app.route('/api/whisk/select-folder', methods=['POST'])
def select_whisk_folder():
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        path = filedialog.askdirectory(title="Selecionar Pasta para Downloads do Whisk")
        root.destroy()
        
        if path:
            # Normalize path
            path = os.path.normpath(path)
            config = load_config()
            config["whisk_downloads_path"] = path
            save_config(config)
            return jsonify({"path": path, "message": "Pasta selecionada com sucesso"}), 200
        else:
            return jsonify({"message": "Seleção cancelada"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

whisk_heartbeat_time = 0

@app.route('/api/whisk/heartbeat', methods=['POST'])
def whisk_heartbeat_post():
    global whisk_heartbeat_time
    whisk_heartbeat_time = time.time()
    return jsonify({"status": "ok", "time": whisk_heartbeat_time})

@app.route('/api/whisk/heartbeat', methods=['GET'])
def whisk_heartbeat_get():
    global whisk_heartbeat_time
    is_active = (time.time() - whisk_heartbeat_time) < 15
    return jsonify({"active": is_active, "last_seen": whisk_heartbeat_time})

@app.route('/api/whisk/prompts', methods=['GET', 'POST', 'DELETE'])
def whisk_prompts():
    global whisk_queue
    if request.method == 'POST':
        data = request.json
        if "prompts" in data:
            whisk_queue = data["prompts"]
        elif "prompt" in data:
            whisk_queue.append(data["prompt"])
        return jsonify({"message": "Fila atualizada", "count": len(whisk_queue)})
    
    if request.method == 'DELETE':
        whisk_queue = []
        return jsonify({"message": "Fila limpa"})
        
    return jsonify({"prompts": whisk_queue})

@app.route('/api/whisk/next', methods=['GET'])
def whisk_next():
    global whisk_queue
    if not whisk_queue:
        return jsonify({"prompt": None})
    
    prompt = whisk_queue.pop(0)
    return jsonify({"prompt": prompt, "remaining": len(whisk_queue)})

@app.route('/api/whisk/settings', methods=['GET', 'POST'])
def whisk_settings_api():
    global whisk_settings
    if request.method == 'POST':
        whisk_settings.update(request.json)
        return jsonify(whisk_settings)
    return jsonify(whisk_settings)

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'POST':
        data = request.json
        config = load_config()
        config.update(data)
        if save_config(config):
            return jsonify({"message": "Configuração salva!"})
        return jsonify({"error": "Erro ao salvar"}), 500
    return jsonify(load_config())

# --- PROXY ENDPOINTS FOR AI SERVICES ---

def proxy_response(req):
    try:
        # Add a default User-Agent if not present
        if not req.get_header('User-agent'):
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
        with urlopen(req, context=ctx, timeout=30) as response:
            res_body = response.read()
            res_status = response.status
            # Filter hop-by-hop and problematic headers
            safe_headers = []
            for k, v in response.getheaders():
                kl = k.lower()
                if kl not in ['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade']:
                    safe_headers.append((k, v))
            return res_body, res_status, safe_headers
    except urllib.error.HTTPError as e:
        # Filter headers even on error
        safe_headers = []
        for k, v in e.headers.items():
            if k.lower() not in ['content-encoding', 'transfer-encoding', 'content-length', 'connection']:
                safe_headers.append((k, v))
        return e.read(), e.code, safe_headers
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/gemini/<path:subpath>', methods=['GET', 'POST'])
def gemini_proxy(subpath):
    target_url = f"https://generativelanguage.googleapis.com/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'accept-encoding']}
    req = Request(
        target_url,
        data=request.get_data() if request.method == 'POST' else None,
        headers=headers,
        method=request.method
    )
    return proxy_response(req)

@app.route('/api/openai/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def openai_proxy(subpath):
    target_url = f"https://api.openai.com/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"
        
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'accept-encoding']}
    req = Request(
        target_url,
        data=request.get_data() if request.method != 'GET' else None,
        headers=headers,
        method=request.method
    )
    return proxy_response(req)

@app.route('/api/grok/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def grok_proxy(subpath):
    target_url = f"https://api.x.ai/v1/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"
        
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'accept-encoding']}
    req = Request(
        target_url,
        data=request.get_data() if request.method != 'GET' else None,
        headers=headers,
        method=request.method
    )
    return proxy_response(req)

@app.route('/api/youtube/<path:subpath>', methods=['GET'])
def youtube_proxy(subpath):
    config = load_config()
    yt_key = config.get('youtube_key', '')
    target_url = f"https://www.googleapis.com/youtube/v3/{subpath}"
    
    # Merge query parameters
    query_params = request.args.to_dict()
    if 'key' not in query_params:
        query_params['key'] = yt_key
        
    import urllib.parse
    target_url += "?" + urllib.parse.urlencode(query_params)
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'accept-encoding']}
    
    req = Request(
        target_url,
        headers=headers,
        method='GET'
    )
    return proxy_response(req)

@app.route('/api/render', methods=['POST'])
def render_video():
    project_name = request.form.get('projectName', 'Unnamed Project')
    job_id = str(uuid.uuid4())
    
    render_jobs[job_id] = {
        "id": job_id,
        "name": project_name,
        "status": "Iniciando FFMPEG...",
        "progress": 0,
        "color": "neon-purple"
    }
    
    def background_render(jid):
        steps = [
            ("Processando Ativos...", 10, 2),
            ("Gerando Quadros...", 30, 4),
            ("Sincronizando Áudio...", 60, 3),
            ("Compilando Vídeo (FFmpeg)...", 85, 5),
            ("Finalizando...", 100, 2)
        ]
        for status, progress, wait in steps:
            time.sleep(wait)
            if jid in render_jobs:
                render_jobs[jid]["status"] = status
                render_jobs[jid]["progress"] = progress
    
    threading.Thread(target=background_render, args=(job_id,)).start()
    return jsonify({"job_id": job_id})

@app.route('/api/status/<job_id>', methods=['GET'])
def get_render_status(job_id):
    job = render_jobs.get(job_id)
    if job:
        return jsonify(job)
    return jsonify({"error": "Job not found"}), 404

@app.route('/api/whisk/open', methods=['POST'])
def whisk_open():
    webbrowser.open("https://labs.google/fx/pt/tools/whisk")
    return jsonify({"message": "Website opened"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
