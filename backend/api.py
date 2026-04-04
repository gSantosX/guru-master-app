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
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import urllib.error
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import webbrowser
import logging
import ffmpeg_utils
import guru_brain

# --- ELITE STABILITY LOGGING ---
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend_logs.txt')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("GuruMaster")

app = Flask(__name__)
CORS(app)
# Permitir envios massivos (ex: 185 vídeos podem chegar a 10GB)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024 
# Evitar que o Werkzeug limite a quantidade de campos no formulário
app.config['MAX_FORM_PARTS'] = 3000
# Aumentar memória para campos não-arquivos (ex: JSON de settings gigante)
app.config['MAX_FORM_MEMORY_SIZE'] = 100 * 1024 * 1024 # 100MB

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
whisk_total_prompts = 0
whisk_settings = {
    "aspect_ratio": "16:9",
    "image_count": 1,
    "prompt_interval": 5,
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
        "anthropic_key": "",
        "deepseek_key": "",
        "elevenlabs_key": "",
        "leonardo_key": "",
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
            logger.error(f"Error loading config: {e}")
    
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
        res = subprocess.run([str(config.get('ffmpeg_path', 'ffmpeg')), '-version'], capture_output=True, text=True, timeout=3)
        if res.returncode == 0:
            ffmpeg_ver = res.stdout.split('\n')[0]
    except subprocess.TimeoutExpired:
        ffmpeg_ver = "FFmpeg Timeout"
    except Exception as e:
        logger.error(f"FFmpeg Check Error: {e}")
    
    ffprobe_ver = "Not found"
    try:
        res = subprocess.run([str(config.get('ffprobe_path', 'ffprobe')), '-version'], capture_output=True, text=True, timeout=3)
        if res.returncode == 0:
            ffprobe_ver = res.stdout.split('\n')[0]
    except subprocess.TimeoutExpired:
        ffprobe_ver = "FFprobe Timeout"
    except Exception as e: 
        logger.error(f"FFprobe Check Error: {e}")
    
    import ssl
    ctx = ssl._create_unverified_context()

    # 1. YouTube Check (Real request)
    youtube_status = False
    youtube_error = None
    yt_key = config.get('youtube_key')
    if yt_key and isinstance(yt_key, str) and len(yt_key) > 5:
        try:
            url = f"https://www.googleapis.com/youtube/v3/videos?part=id&id=Ks-_Mh1QhMc&key={yt_key}"
            with urlopen(url, timeout=5, context=ctx) as response:
                if response.status == 200:
                    youtube_status = True
        except HTTPError as e:
             try:
                 error_data = json.loads(e.read().decode())
                 youtube_error = error_data.get('error', {}).get('message', str(e))
             except:
                 youtube_error = str(e)
             youtube_status = False
        except Exception as e:
             youtube_error = str(e)
             youtube_status = False

    # 2. Gemini Check (Real request)
    gemini_key = config.get('gemini_key')
    gemini_status = False
    if gemini_key and len(gemini_key) > 5:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}"
            with urlopen(url, timeout=5, context=ctx) as response:
                if response.status == 200: gemini_status = True
        except Exception as e:
            logger.error(f"Gemini Check Fail: {e}")
            gemini_status = False

    # 3. OpenAI Check (Real request)
    openai_key = config.get('gpt_key')
    openai_status = False
    if openai_key and len(openai_key) > 5:
        try:
            req = Request("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {openai_key}"})
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: openai_status = True
        except Exception as e:
            logger.error(f"OpenAI Check Fail: {e}")
            openai_status = False

    # 4. Grok Check (Real request)
    grok_key = config.get('grok_key')
    grok_status = False
    if grok_key and len(grok_key) > 5:
        try:
            req = Request("https://api.x.ai/v1/models", headers={"Authorization": f"Bearer {grok_key}"})
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: grok_status = True
        except: grok_status = False

    # 5. Anthropic Check
    anthropic_key = config.get('anthropic_key')
    anthropic_status = False
    if anthropic_key and len(anthropic_key) > 5:
        try:
            req = Request("https://api.anthropic.com/v1/messages", 
                          headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                          data=json.dumps({"model": "claude-3-haiku-20240307", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]}).encode())
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: anthropic_status = True
        except: anthropic_status = False

    # 6. DeepSeek Check
    deepseek_key = config.get('deepseek_key')
    deepseek_status = False
    if deepseek_key and len(deepseek_key) > 5:
        try:
            req = Request("https://api.deepseek.com/models", headers={"Authorization": f"Bearer {deepseek_key}"})
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: deepseek_status = True
        except: deepseek_status = False

    # 7. ElevenLabs Check
    eleven_key = config.get('elevenlabs_key')
    eleven_status = False
    eleven_key = config.get('elevenlabs_key')
    if eleven_key and len(eleven_key) > 5:
        try:
            req = Request("https://api.elevenlabs.io/v1/models", headers={"xi-api-key": eleven_key})
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: eleven_status = True
        except: eleven_status = False

    # 8. Leonardo.ai Check
    leonardo_key = config.get('leonardo_key')
    leonardo_status = False
    if leonardo_key and len(leonardo_key) > 5:
        try:
            req = Request("https://api.leonardo.ai/v1/me", headers={"Authorization": f"Bearer {leonardo_key}"})
            with urlopen(req, timeout=5, context=ctx) as response:
                if response.status == 200: leonardo_status = True
        except: leonardo_status = False

    # 9. SMTP Check
    smtp_status = False
    smtp_user = config.get('smtp_user')
    smtp_pass = config.get('smtp_password')
    if smtp_user and smtp_pass:
        try:
            server = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=5)
            server.login(smtp_user, smtp_pass)
            server.quit()
            smtp_status = True
        except: smtp_status = False

    status = {
        "status": "online",
        "ffmpeg": ffmpeg_ver,
        "ffprobe": ffprobe_ver,
        "ai": {
            "gemini": gemini_status,
            "openai": openai_status,
            "grok": grok_status,
            "anthropic": anthropic_status,
            "deepseek": deepseek_status,
            "elevenlabs": eleven_status,
            "leonardo": leonardo_status,
            "youtube": youtube_status,
            "youtube_error": youtube_error
        },
        "smtp": smtp_status
    }
    return jsonify(status)

# --- GURU GLOBAL BRAIN (Learning Engine) ---

@app.route('/api/brain/learn', methods=['POST'])
def guru_learn():
    data = request.json
    niche = data.get('niche', 'Geral')
    report = data.get('report', '')
    metadata = data.get('metadata', {})
    
    if not report:
        return jsonify({"error": "Report is empty"}), 400
        
    success = guru_brain.learn_from_analysis(niche, report, metadata)
    return jsonify({"success": success, "message": "Guru aprendeu com esta análise."})

@app.route('/api/brain/context', methods=['GET'])
def guru_context():
    niche = request.args.get('niche', 'Geral')
    experience = guru_brain.get_niche_experience(niche)
    return jsonify({"experience": experience})

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
    # Remover Tkinter direto aqui para evitar hangs no servidor Flask Windows
    return jsonify({"error": "Seleção de pasta via diálogo não disponível no momento. Use o config.json"}), 400

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
    global whisk_queue, whisk_total_prompts
    if request.method == 'POST':
        data = request.json
        if "prompts" in data:
            whisk_queue = data["prompts"]
        elif "prompt" in data:
            whisk_queue.append(data["prompt"])
        whisk_total_prompts = len(whisk_queue)
        return jsonify({"message": "Fila atualizada", "count": len(whisk_queue)})
    
    if request.method == 'DELETE':
        whisk_queue = []
        whisk_total_prompts = 0
        return jsonify({"message": "Fila limpa"})
        
    return jsonify({"prompts": whisk_queue})

@app.route('/api/whisk/next', methods=['GET'])
def whisk_next():
    global whisk_queue, whisk_total_prompts
    if not whisk_queue:
        return jsonify({"prompt": None})
    
    prompt = whisk_queue.pop(0)
    current_index = whisk_total_prompts - len(whisk_queue)
    return jsonify({"prompt": prompt, "remaining": len(whisk_queue), "index": current_index})

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
        # Add a default User-Agent
        if not req.get_header('User-agent'):
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
        with urlopen(req, context=ctx, timeout=45) as response:
            res_body = response.read()
            res_status = response.status
            
            # Filter headers
            safe_headers = []
            for k, v in response.getheaders():
                kl = k.lower()
                if kl not in ['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'access-control-allow-origin']:
                    safe_headers.append((k, v))
            
            # Ensure CORS is handled by Flask-CORS, so we filter it out from proxy
            return res_body, res_status, safe_headers
            
    except urllib.error.HTTPError as e:
        print(f"Proxy HTTP Error: {e.code} - {e.reason}")
        try:
            body = e.read()
        except:
            body = str(e).encode('utf-8')
        
        safe_headers = []
        for k, v in e.headers.items():
            if k.lower() not in ['content-encoding', 'transfer-encoding', 'content-length', 'connection']:
                safe_headers.append((k, v))
        return body, e.code, safe_headers
        
    except Exception as e:
        print(f"Proxy General Error: {e}")
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
    
    print(f"DEBUG: YouTube Proxy Request -> {target_url.split('key=')[0]}key=***")
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'accept-encoding']}
    
    req = Request(
        target_url,
        headers=headers,
        method='GET'
    )
    
    try:
        res_body, res_status, res_headers = proxy_response(req)
        print(f"DEBUG: YouTube Proxy Response Code -> {res_status}")
        return res_body, res_status, res_headers
    except Exception as e:
        print(f"DEBUG: YouTube Proxy Exception -> {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/render', methods=['POST'])
def render_video():
    project_name = request.form.get('projectName', 'Unnamed Project')
    settings_raw = request.form.get('settings', '{}')
    settings = json.loads(settings_raw)
    
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(UPLOAD_FOLDER, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    render_jobs[job_id] = {
        "id": job_id,
        "name": project_name,
        "status": "Iniciando Processo...",
        "progress": 5,
        "color": "neon-purple"
    }
    
    # Save uploaded files
    saved_files = {
        "audio": None,
        "music": None,
        "subtitle": None,
        "images": [],
        "videos": []
    }
    
    try:
        if 'audio' in request.files:
            audio_path = os.path.join(job_dir, 'audio.mp3')
            request.files['audio'].save(audio_path)
            saved_files["audio"] = audio_path
            
        if 'music' in request.files:
            music_path = os.path.join(job_dir, 'music.mp3')
            request.files['music'].save(music_path)
            saved_files["music"] = music_path
            
        if 'subtitle' in request.files:
            sub_filename = secure_filename(request.files['subtitle'].filename)
            sub_path = os.path.join(job_dir, sub_filename)
            request.files['subtitle'].save(sub_path)
            saved_files["subtitle"] = sub_path
            
        # Images and Videos are multiple
        all_file_keys = [k for k in request.files if k.startswith('image_') or k.startswith('video_')]
        file_count = len(all_file_keys)
        print(f"DEBUG: Receiving {file_count} media files for job {job_id}")
        
        saved_vid_count = 0
        saved_img_count = 0
        
        for key in all_file_keys:
            current_file = request.files[key]
            if not current_file.filename: continue
            
            safe_name = secure_filename(current_file.filename)
            save_path = os.path.join(job_dir, safe_name)
            current_file.save(save_path)
            
            if key.startswith('image_'):
                saved_files["images"].append(save_path)
                saved_img_count += 1
            else:
                saved_files["videos"].append(save_path)
                saved_vid_count += 1
                
        print(f"DEBUG: Saved {saved_img_count} images and {saved_vid_count} videos for job {job_id}")
                
    except Exception as e:
        print(f"Error saving files: {e}")
        return jsonify({"error": f"Erro ao salvar arquivos: {str(e)}"}), 500

    if not saved_files["images"] and not saved_files["videos"]:
        print(f"DEBUG: Job {job_id} failed: No media provided.")
        return jsonify({"error": "Nenhuma mídia enviada para o vídeo."}), 400

    def background_render(jid, files, config_settings):
        try:
            # 1. Prepare output path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = "".join([c if c.isalnum() else "_" for c in project_name])
            output_filename = f"video_{safe_name}_{timestamp}.mp4"
            
            custom_output_dir = config_settings.get("outputDir")
            if custom_output_dir and os.path.exists(custom_output_dir) and os.path.isdir(custom_output_dir):
                output_path = os.path.join(custom_output_dir, output_filename)
            else:
                output_path = os.path.join(OUTPUT_FOLDER, output_filename)
            
            render_jobs[jid]["status"] = "Compilando Matriz..."
            render_jobs[jid]["progress"] = 20
            
            filter_script_path = os.path.join(job_dir, 'filter_complex.txt')
            
            # 2. Build and run FFmpeg command (using relative paths for assets)
            cmd = ffmpeg_utils.build_ffmpeg_command(
                output_path,
                files["images"],
                videos=files.get("videos", []),
                audio=files["audio"],
                music=files["music"],
                subtitle=files["subtitle"],
                settings=config_settings,
                ffmpeg_path=FFMPEG_CMD,
                filter_script_path=filter_script_path
            )
            
            log_path = os.path.join(job_dir, 'render.log')
            with open(log_path, 'w', encoding='utf-8') as log_file:
                log_file.write(f"FFMPEG CMD (Relative to JobDir): {' '.join(cmd)}\n\n")
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    universal_newlines=True,
                    encoding='utf-8',
                    errors='replace',
                    cwd=job_dir
                )
                
                total_duration = ffmpeg_utils.get_media_duration(files["audio"]) if files["audio"] else (len(files["images"]) * 5.0 + sum(ffmpeg_utils.get_media_duration(v) for v in files.get("videos", [])))
                
                for line in process.stdout:
                    log_file.write(line)
                    log_file.flush()
                    if 'time=' in line:
                        time_match = re.search(r'time=(\d+:\d+:\d+\.\d+)', line)
                        if time_match:
                            time_str = time_match.group(1)
                            try:
                                h, m, s = map(float, time_str.split(':'))
                                curr_time = h*3600 + m*60 + s
                                # Scale progress from 20% (init) to 98% (almost done)
                                progress_percent = min(98, 20 + int((curr_time / max(1, total_duration)) * 78))
                                render_jobs[jid]["progress"] = progress_percent
                                render_jobs[jid]["status"] = f"Codificando: {int((curr_time/max(1, total_duration))*100)}%"
                                render_jobs[jid]["last_log"] = line.strip()
                            except: pass

                process.wait()
            
            if process.returncode == 0:
                render_jobs[jid]["status"] = "Renderização Concluída!"
                render_jobs[jid]["progress"] = 100
                render_jobs[jid]["result_file"] = output_path # Store where the file is
            else:
                render_jobs[jid]["status"] = "Erro no FFmpeg"
                render_jobs[jid]["progress"] = 0
                
        except Exception as e:
            print(f"Render Task Error: {e}")
            if jid in render_jobs:
                render_jobs[jid]["status"] = f"Falha: {str(e)}"
                render_jobs[jid]["progress"] = 0
                
    threading.Thread(target=background_render, args=(job_id, saved_files, settings)).start()
    return jsonify({"job_id": job_id})

@app.route('/api/status/<job_id>', methods=['GET'])
def render_status(job_id):
    if job_id not in render_jobs:
        return jsonify({"error": "Job not found"}), 404
        
    return jsonify(render_jobs[job_id])

@app.route('/api/render/log/<job_id>', methods=['GET'])
def render_log(job_id):
    if job_id not in render_jobs:
        return jsonify({"error": "Job not found"}), 404
        
    job_dir = os.path.join(UPLOAD_FOLDER, job_id)
    log_path = os.path.join(job_dir, 'render.log')
    
    if not os.path.exists(log_path):
        return jsonify({"log": ["Aguardando início do motor..."]})
        
    try:
        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            # Return last 10 lines
            lines = f.readlines()
            return jsonify({"log": [l.strip() for l in lines[-10:]]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download/<job_id>', methods=['GET'])
def download_video(job_id):
    if job_id not in render_jobs:
        return jsonify({"error": "Job not found", "requested_id": job_id}), 404
        
    job = render_jobs[job_id]
    
    if job.get("status") not in ["Renderização Concluída!", "Render SUCCESS!"] and job.get("progress") < 100:
         # Allow downloading if file exists anyway, but warn
         if not job.get("result_file") or not os.path.exists(job.get("result_file")):
             return jsonify({"error": "Renderização não concluída", "requested_id": job_id}), 400

    video_path = job.get("result_file")
    if not video_path:
         video_path = os.path.join(OUTPUT_FOLDER, f"{job_id}.mp4")

    if not video_path or not os.path.exists(video_path):
        return jsonify({"error": "Arquivo não encontrado no servidor.", "requested_id": job_id}), 404
        
    try:
        # Determine a safe filename
        filename = f"video_{job.get('name', 'pronto').replace(' ', '_')}.mp4"
        return send_file(video_path, as_attachment=True, download_name=filename, mimetype='video/mp4')
    except Exception as e:
        return jsonify({"error": str(e), "requested_id": job_id}), 500

@app.route('/api/whisk/open', methods=['POST'])
def whisk_open():
    webbrowser.open("https://labs.google/fx/pt/tools/whisk")
    return jsonify({"message": "Website opened"})

if __name__ == '__main__':
    # Desativar debug mode para evitar reinicializações duplas e instabilidades no Windows com 185 uploads
    app.run(host='0.0.0.0', debug=False, port=5000, threaded=True)
