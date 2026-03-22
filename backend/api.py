import os
import uuid
import threading
import json
import subprocess
import re
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
    return {
        "gemini_key": "",
        "grok_key": "",
        "gpt_key": "",
        "active_ai": "Gemini",
        "theme": "neon",
        "reduce_motion": False
    }

def save_config(config):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

# Armazenamento em memória para status dos jobs
jobs = {}

def get_audio_duration(file_path):
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting duration: {e}")
        return 0

def process_video(job_id, images, audio_path, music_path, settings):
    if not images:
        jobs[job_id]['status'] = 'Erro: Nenhuma imagem fornecida'
        jobs[job_id]['progress'] = 0
        return
    try:
        jobs[job_id]['status'] = 'Preparando mídia...'
        jobs[job_id]['progress'] = 5

        # 1. Determinar duração do áudio (narração) para saber o tempo total do vídeo
        total_duration = 10 # Default
        if audio_path:
            total_duration = get_audio_duration(audio_path)
        else:
            total_duration = len(images) * 4 # 4 segundos por imagem caso não tenha narração

        jobs[job_id]['progress'] = 10
        jobs[job_id]['status'] = 'Configurando FFmpeg...'

        # Calculando duração que cada imagem deverá ficar na tela
        img_duration = total_duration / max(len(images), 1)
        
        # Construir o arquivo de concatenação do FFmpeg
        concat_file_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_concat.txt")
        with open(concat_file_path, 'w', encoding='utf-8') as f:
            for img in images:
                f.write(f"file '{img}'\n")
                f.write(f"duration {img_duration:.2f}\n")
            # ffmpeg concat demuxer bug require the last file to be repeated without duration
            if images:
                f.write(f"file '{images[-1]}'\n")

        jobs[job_id]['progress'] = 20
        jobs[job_id]['status'] = 'Gerando vídeo e transições...'

        output_path = os.path.join(OUTPUT_FOLDER, f"{job_id}.mp4")

        resolution_map = {
            '1080p Horizontal (1920x1080)': '1920:1080',
            '4K Filmes (3840x2160)': '3840:2160',
            'Shorts / Reels (1080x1920)': '1080:1920',
            'Quadrado (1080x1080)': '1080:1080'
        }
        scale = resolution_map.get(settings.get('resolution', ''), '1920:1080')
        fps = settings.get('fps', '30 FPS').split(" ")[0]

        # Comando básico usando demuxer de concatenação
        # O filtro de video (zoom, color) é bastante complexo no ffmpeg, pra esse scaffold inicial vamos aplicar apenas escala e fps p/ garantir q não quebre
        
        # Format filters
        video_filters = f"scale={scale}:force_original_aspect_ratio=decrease,pad={scale}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps={fps}"

        # Setup FFMPEG process
        cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_file_path]

        filter_complex = ""
        audio_inputs = []

        input_index = 1 # 0 is the images concat
        
        if audio_path:
            cmd.extend(['-i', audio_path])
            audio_inputs.append(f"[{input_index}:a]")
            input_index += 1
            
        if music_path:
            cmd.extend(['-i', music_path])
            audio_inputs.append(f"[{input_index}:a]")
            input_index += 1

        cmd.extend(['-vf', video_filters])

        # Se tiver mais de um audio, mixar
        if len(audio_inputs) > 1:
            # Volume da musica mais baixo se tiver narração
            cmd.extend(['-filter_complex', f"[{input_index-1}:a]volume=0.2[bgm]; [{input_index-2}:a][bgm]amix=inputs=2:duration=first[aout]"])
            cmd.extend(['-map', '0:v', '-map', '[aout]'])
        elif len(audio_inputs) == 1:
            cmd.extend(['-map', '0:v', '-map', f"{input_index-1}:a"])
        else:
            cmd.extend(['-map', '0:v'])

        cmd.extend(['-c:v', 'libx264', '-c:a', 'aac', '-shortest', output_path])

        jobs[job_id]['status'] = 'Renderizando FFmpeg...'
        
        # Run process and parse progress
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True, encoding='utf-8')
        
        duration_pattern = re.compile(r'Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})')
        time_pattern = re.compile(r'time=(\d{2}):(\d{2}):(\d{2}\.\d{2})')
        
        out_total_duration = float(total_duration) if total_duration else 0.0

        for line in process.stdout:
            # print(line.strip()) # Debug FFmpeg output
            
            # Find total duration if we didn't have it
            if not out_total_duration:
                dur_match = duration_pattern.search(line)
                if dur_match:
                    h, m, s = dur_match.groups()
                    out_total_duration = int(h) * 3600 + int(m) * 60 + float(s)
            
            # Find current time
            time_match = time_pattern.search(line)
            if time_match and out_total_duration > 0:
                h, m, s = time_match.groups()
                current_time = int(h) * 3600 + int(m) * 60 + float(s)
                # progress is 20% to 95%
                calc_progress = 20 + int((current_time / out_total_duration) * 75)
                jobs[job_id]['progress'] = min(calc_progress, 95)
        
        process.wait()

        if process.returncode == 0:
            jobs[job_id]['progress'] = 100
            jobs[job_id]['status'] = 'Concluído'
            jobs[job_id]['result_file'] = output_path
        else:
            jobs[job_id]['progress'] = 0
            jobs[job_id]['status'] = 'Erro no FFmpeg'

    except Exception as e:
        print(f"Error processing job {job_id}: {e}")
        jobs[job_id]['status'] = f'Falha: {str(e)}'
        jobs[job_id]['progress'] = 0

@app.route('/api/render', methods=['POST'])
def start_render():
    job_id = str(uuid.uuid4())
    
    # Extract Settings
    settings_json = request.form.get('settings', '{}')
    settings = json.loads(settings_json)
    
    job_dir = os.path.join(UPLOAD_FOLDER, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    # Save Images
    images = []
    if request.files:
        for key in request.files.keys():
            if key.startswith('image_'):
                file = request.files[key]
                if file.filename:
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(job_dir, filename)
                    file.save(filepath)
                    images.append(filepath.replace('\\', '/')) 
                
    # Save Audio
    audio_path = None
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if audio_file.filename:
            audio_path = os.path.join(job_dir, secure_filename(audio_file.filename)).replace('\\', '/')
            audio_file.save(audio_path)
            
    # Save Music
    music_path = None
    if 'music' in request.files:
        music_file = request.files['music']
        if music_file.filename:
            music_path = os.path.join(job_dir, secure_filename(music_file.filename)).replace('\\', '/')
            music_file.save(music_path)

    if not images:
        return jsonify({'error': 'No images provided'}), 400

    job_id_str = str(job_id)
    jobs[job_id] = {
        'id': job_id,
        'status': 'Iniciando container FFmpeg...',
        'progress': 0,
        'name': request.form.get('projectName', f'Projeto {job_id_str[:4]}')
    }

    # Start Background Thread
    thread = threading.Thread(target=process_video, args=(job_id, images, audio_path, music_path, settings))
    thread.daemon = True
    thread.start()

    return jsonify({'job_id': job_id})

@app.route('/api/status/<job_id>', methods=['GET'])
def get_status(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(jobs[job_id])

@app.route('/api/check', methods=['GET'])
def check_system():
    try:
        # Check FFmpeg
        ffmpeg_res = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        ffmpeg_info = ffmpeg_res.stdout.splitlines()[0] if ffmpeg_res.returncode == 0 else "Not found"
        
        return jsonify({
            'status': 'online',
            'ffmpeg': ffmpeg_info,
            'os': os.name,
            'backend': 'Flask Python',
            'storage_ok': os.access(OUTPUT_FOLDER, os.W_OK)
        })
    except Exception as e:
        return jsonify({'status': 'offline', 'error': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(load_config())

@app.route('/api/config', methods=['POST'])
def update_config():
    new_data = request.json
    config = load_config()
    config.update(new_data)
    if save_config(config):
        return jsonify({"status": "success", "message": "Configuração salva"})
    return jsonify({"status": "error", "message": "Falha ao salvar configuração"}), 500

@app.route('/api/download/<job_id>', methods=['GET'])
def download(job_id):
    if job_id not in jobs or 'result_file' not in jobs[job_id]:
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(jobs[job_id]['result_file'], as_attachment=True)

if __name__ == '__main__':
    # Usando porta 5000, e acessível por todos pra n dar erro cors
    app.run(host='0.0.0.0', port=5000)
