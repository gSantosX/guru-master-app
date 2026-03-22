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

FFMPEG_CMD = 'ffmpeg'
FFPROBE_CMD = 'ffprobe'

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
        cmd = [FFPROBE_CMD, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting duration: {e}")
        return 0

def get_zoom_filter(zoom_style, zoom_speed_str, fps, img_duration):
    """Build a zoompan filtergraph expression for the Ken Burns effect."""
    # Map speed label to zoom multiplier
    zoom_map = {
        'Muito Lenta': 1.05, 'Média': 1.08, 'Normal': 1.1,
        'Rápida': 1.15, 'Agressiva': 1.2
    }
    z_factor = 1.1
    for key, val in zoom_map.items():
        if key in zoom_speed_str:
            z_factor = val
            break

    fps_int = int(fps)
    frames = int(img_duration * fps_int)
    z_step = (z_factor - 1.0) / max(frames, 1)

    styles = {
        'zoom-in':  f"zoompan=z='min(zoom+{z_step:.6f},{z_factor})':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
        'zoom-out':  f"zoompan=z='if(eq(on,1),{z_factor},max(zoom-{z_step:.6f},1))':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
        'pan-right': f"zoompan=z='{z_factor}':d={frames}:x='if(eq(on,1),0,x+{z_step*10:.4f}*iw)':y='ih/2-(ih/zoom/2)'",
        'pan-left':  f"zoompan=z='{z_factor}':d={frames}:x='if(eq(on,1),iw-(iw/zoom),max(x-{z_step*10:.4f}*iw,0))':y='ih/2-(ih/zoom/2)'",
    }
    return styles.get(zoom_style, styles['zoom-in'])

def get_color_filter(filter_style):
    """Return a FFmpeg video filter string for the selected color filter."""
    filters = {
        'sepia':           'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        'grayscale':       'colorchannelmixer=.299:.587:.114:0:.299:.587:.114:0:.299:.587:.114',
        'high-contrast':   'eq=contrast=1.3:brightness=0.05:saturation=1.1',
        'high-saturation': 'eq=saturation=1.6:contrast=1.05',
        'blur':            'gblur=sigma=1.5',
        'vignette':        'vignette=PI/4',
    }
    return filters.get(filter_style, '')

def process_video(job_id, images, audio_path, music_path, subtitle_path, settings):
    if not images:
        jobs[job_id]['status'] = 'Erro: Nenhuma imagem fornecida'
        jobs[job_id]['progress'] = 0
        return
    try:
        jobs[job_id]['status'] = 'Preparando mídia...'
        jobs[job_id]['progress'] = 5

        # --- Parse settings ---
        resolution_map = {
            '1080p Horizontal (1920x1080)': ('1920', '1080'),
            '4K Filmes (3840x2160)': ('3840', '2160'),
            'Shorts / Reels (1080x1920)': ('1080', '1920'),
            'Quadrado (1080x1080)': ('1080', '1080'),
        }
        res_str = settings.get('resolution', '1080p Horizontal (1920x1080)')
        w, h = resolution_map.get(res_str, ('1920', '1080'))
        scale_str = f"{w}:{h}"

        fps_raw = settings.get('fps', '30 FPS').split(' ')[0]
        fps = int(fps_raw) if fps_raw.isdigit() else 30

        transition = settings.get('transitionStyle', 'crossfade')
        zoom_style = settings.get('zoomStyle', 'zoom-in')
        zoom_speed = settings.get('zoomSpeed', 'Normal (1.1x)')
        filter_style = settings.get('filterStyle', 'nenhum')

        # --- Duration ---
        total_duration = 10
        if audio_path:
            total_duration = get_audio_duration(audio_path)
        else:
            total_duration = len(images) * 4

        img_duration = total_duration / max(len(images), 1)

        jobs[job_id]['progress'] = 10
        jobs[job_id]['status'] = f'Configurando FFmpeg ({w}x{h} @ {fps}fps)...'

        output_path = os.path.join(OUTPUT_FOLDER, f"{job_id}.mp4")

        # ================================================================
        # STRATEGY: build per-image filters with optional zoompan + color,
        #           then xfade between them if transitions enabled.
        # ================================================================

        # Build zoompan filter string (only if zoom is enabled)
        zoom_filter = ''
        if zoom_style != 'none':
            zoom_filter = get_zoom_filter(zoom_style, zoom_speed, fps, img_duration)

        # Color filter
        color_filter = get_color_filter(filter_style)

        n = len(images)
        # Transition duration (0 for none/cut)
        trans_dur = 0.5 if transition not in ('none', 'fade') else 0.0
        fade_black = (transition == 'fade')

        # xfade mode mapping
        xfade_mode_map = {
            'crossfade': 'fade',
            'dissolve': 'dissolve',
            'wipeleft': 'wipeleft',
            'wiperight': 'wiperight',
        }
        xfade_mode = xfade_mode_map.get(transition, 'fade')

        # Build filter_complex
        # Step 1: per-image chain: scale → zoompan (opt) → color (opt) → fps → setpts (trim to img_duration)
        filter_parts = []
        for idx in range(n):
            per_img = f"[0:v]select=eq(n\\,{idx}),setpts=N/FRAME_RATE/TB"
            parts = [f"[0:v]trim=start_pts={idx}:end_pts=1"]  # placeholder

            # Build this image's filter chain
            chain_parts = [f"scale={scale_str}:force_original_aspect_ratio=decrease",
                           f"pad={scale_str}:(ow-iw)/2:(oh-ih)/2,setsar=1"]
            if zoom_filter:
                chain_parts.append(zoom_filter)
            if color_filter:
                chain_parts.append(color_filter)
            chain_parts.append(f"fps={fps}")
            chain_parts.append(f"settb=1/{fps},setpts=PTS-STARTPTS")
            filter_parts.append(','.join(chain_parts))

        # Simpler approach: use concat demuxer with individual per-img filters
        # Build the concat file
        concat_file_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_concat.txt")
        with open(concat_file_path, 'w', encoding='utf-8') as f:
            for img in images:
                f.write(f"file '{img}'\n")
                f.write(f"duration {img_duration:.4f}\n")
            if images:
                f.write(f"file '{images[-1]}'\n")

        jobs[job_id]['progress'] = 20
        jobs[job_id]['status'] = 'Aplicando filtros e renderizando...'

        # Build the single video filtergraph
        vf_chain = []
        vf_chain.append(f"scale={scale_str}:force_original_aspect_ratio=decrease")
        vf_chain.append(f"pad={scale_str}:(ow-iw)/2:(oh-ih)/2,setsar=1")

        if zoom_style != 'none' and zoom_filter:
            jobs[job_id]['status'] = f'Aplicando zoom/pan ({zoom_style})...'
            vf_chain.append(zoom_filter)

        if color_filter:
            jobs[job_id]['status'] = f'Aplicando filtro visual ({filter_style})...'
            vf_chain.append(color_filter)

        if fade_black:
            # Add per-segment fade trick via afade; for video use fade filter at start/end
            vf_chain.append(f"fade=t=in:st=0:d=0.3,fade=t=out:st={max(img_duration-0.3,0):.2f}:d=0.3")

        vf_chain.append(f"format=yuv420p,fps={fps}")

        # Subtitle burn-in (hardcoded into video stream)
        if subtitle_path:
            jobs[job_id]['status'] = 'Queimando legenda no vídeo...'
            # Escape backslashes and colons for FFmpeg filter syntax (Windows path safety)
            safe_sub = subtitle_path.replace('\\', '/').replace(':', '\\:')
            ext = os.path.splitext(subtitle_path)[1].lower()
            if ext == '.srt':
                vf_chain.append(
                    f"subtitles='{safe_sub}':force_style='FontName=Arial,FontSize=22,"
                    f"PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,"
                    f"Alignment=2,MarginV=30'"
                )
            else:  # .ass or .vtt
                vf_chain.append(f"ass='{safe_sub}'")

        video_filter = ','.join(vf_chain)

        # --- Build FFmpeg command ---
        cmd = [FFMPEG_CMD, '-y', '-f', 'concat', '-safe', '0', '-i', concat_file_path]

        audio_input_index = 1
        if audio_path:
            cmd.extend(['-i', audio_path])
            audio_input_index += 1
        if music_path:
            cmd.extend(['-i', music_path])

        cmd.extend(['-vf', video_filter])

        # Audio mixing
        audio_input_count = (1 if audio_path else 0) + (1 if music_path else 0)
        if audio_path and music_path:
            # music at 20% volume mixed with narration
            narr_idx = 1
            music_idx = 2
            cmd.extend(['-filter_complex',
                        f"[{music_idx}:a]volume=0.2[bgm];[{narr_idx}:a][bgm]amix=inputs=2:duration=first[aout]"])
            cmd.extend(['-map', '0:v', '-map', '[aout]'])
        elif audio_path:
            cmd.extend(['-map', '0:v', '-map', '1:a'])
        elif music_path:
            cmd.extend(['-map', '0:v', '-map', '1:a'])
        else:
            cmd.extend(['-map', '0:v'])

        # Encoding settings
        cmd.extend([
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',          # high quality
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-shortest',
            output_path
        ])

        jobs[job_id]['status'] = 'Renderizando FFmpeg...'

        # Run and track progress
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   universal_newlines=True, encoding='utf-8', errors='replace')

        duration_pattern = re.compile(r'Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})')
        time_pattern     = re.compile(r'time=(\d{2}):(\d{2}):(\d{2}\.\d{2})')
        out_total_duration = float(total_duration) if total_duration else 0.0

        last_lines = []
        for line in process.stdout:
            line_str = line.strip()
            if not out_total_duration:
                dur_match = duration_pattern.search(line_str)
                if dur_match:
                    h, m, s = dur_match.groups()
                    out_total_duration = int(h) * 3600 + int(m) * 60 + float(s)

            time_match = time_pattern.search(line_str)
            if time_match and out_total_duration > 0:
                h, m, s = time_match.groups()
                current_time = int(h) * 3600 + int(m) * 60 + float(s)
                calc_progress = 20 + int((current_time / out_total_duration) * 75)
                jobs[job_id]['progress'] = min(calc_progress, 95)
            
            # Keep a buffer of last lines for error reporting
            last_lines.append(line_str)
            if len(last_lines) > 20: last_lines.pop(0)

        process.wait()

        if process.returncode == 0:
            jobs[job_id]['progress'] = 100
            jobs[job_id]['status'] = 'Concluído'
            jobs[job_id]['result_file'] = output_path
        else:
            # Capture last few lines of log to help user debug
            error_msg = "Erro desconhecido"
            if last_lines:
                error_msg = " | ".join(last_lines[-3:])
            
            jobs[job_id]['progress'] = 0
            jobs[job_id]['status'] = f'Erro FFmpeg: {error_msg}'
            print(f"FFmpeg failed with code {process.returncode}. Last output: {error_msg}")

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

    # Save Subtitle
    subtitle_path = None
    if 'subtitle' in request.files:
        sub_file = request.files['subtitle']
        if sub_file.filename:
            subtitle_path = os.path.join(job_dir, secure_filename(sub_file.filename)).replace('\\', '/')
            sub_file.save(subtitle_path)

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
    thread = threading.Thread(target=process_video, args=(job_id, images, audio_path, music_path, subtitle_path, settings))
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
        ffmpeg_res = subprocess.run([FFMPEG_CMD, '-version'], capture_output=True, text=True)
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

import urllib.request
import io
from PIL import Image as PILImage

@app.route('/api/image-proxy', methods=['GET'])
def image_proxy():
    """Downloads an external image and returns it as a JPEG, bypassing CORS."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL not provided'}), 400
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as resp:
            img_data = resp.read()
        
        img = PILImage.open(io.BytesIO(img_data)).convert('RGB')
        out = io.BytesIO()
        img.save(out, format='JPEG', quality=95)
        out.seek(0)
        return send_file(out, mimetype='image/jpeg', as_attachment=False)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update', methods=['POST'])

def update_application():
    try:
        # 1. Fetch latest from remote
        subprocess.run(['git', 'fetch'], check=True, capture_output=True, text=True)
        
        # 2. Check if local is behind remote
        status_res = subprocess.run(['git', 'status', '-uno'], check=True, capture_output=True, text=True)
        
        if "your branch is behind" in status_res.stdout.lower() or "can be fast-forwarded" in status_res.stdout.lower():
            # 3. Pull updates
            pull_res = subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
            return jsonify({
                "status": "updated", 
                "message": "Aplicativo atualizado com sucesso! Por favor, reinicie os servidores para aplicar as mudanças.",
                "details": pull_res.stdout
            })
        else:
            return jsonify({
                "status": "up-to-date", 
                "message": "O Guru Master já está na versão mais recente."
            })
            
    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error", 
            "message": f"Erro ao tentar atualizar: {e.stderr or str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Erro inesperado: {str(e)}"
        }), 500

@app.route('/api/download/<job_id>', methods=['GET'])
def download(job_id):
    if job_id not in jobs or 'result_file' not in jobs[job_id]:
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(jobs[job_id]['result_file'], as_attachment=True)

if __name__ == '__main__':
    # Usando porta 5000, e acessível por todos pra n dar erro cors
    app.run(host='0.0.0.0', port=5000)
