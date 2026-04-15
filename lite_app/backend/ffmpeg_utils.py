import os
import subprocess
import json
import re

def get_media_duration(file_path):
    """Gets the duration of a media file using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting media duration: {e}")
        return 5.0  # Fallback duration

def check_audio_stream(file_path):
    try:
        cmd = ['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return 'audio' in res.stdout.strip().lower()
    except:
        return False

def build_ffmpeg_command(
    output_path,
    images,
    videos=None,
    audio=None,
    music=None,
    subtitle=None,
    settings=None,
    ffmpeg_path='ffmpeg',
    filter_script_path=None
):
    if not settings: settings = {}
    if videos is None: videos = []
    
    res_str = settings.get('resolution', '1080p Horizontal (1920x1080)')
    fps_match = re.search(r'\d+', settings.get('fps', '30'))
    fps = int(fps_match.group()) if fps_match else 30
    
    transition = settings.get('transitionStyle', 'fade')
    transition_map = {
        'crossfade': 'fade', 'fade': 'fadeblack', 'dissolve': 'dissolve',
        'wipeleft': 'wipeleft', 'wiperight': 'wiperight', 'none': 'none'
    }
    transition = transition_map.get(transition, 'none')
    transition_duration = 1.0 if transition != 'none' else 0.0

    if '1920x1080' in res_str: width, height = 1920, 1080
    elif '3840x2160' in res_str: width, height = 3840, 2160
    elif '1080x1920' in res_str: width, height = 1080, 1920
    elif '1080x1080' in res_str: width, height = 1080, 1080
    else: width, height = 1920, 1080

    def rel(path): return os.path.basename(path) if path else None

    import concurrent.futures

    # Determine audio duration (master clock)
    audio_dur = get_media_duration(audio) if audio and os.path.exists(audio) else 0

    # 1. Build initial media pool
    pool = []
    for img in images:
        pool.append({'type': 'image', 'path': img, 'duration': 5.0, 'has_audio': False})
        
    def process_vid(vid):
        d = get_media_duration(vid)
        has_a = check_audio_stream(vid)
        return {'type': 'video', 'path': vid, 'duration': d, 'has_audio': has_a}

    if videos:
        # Optimized concurrency to prevent I/O saturation (8 workers is safer for varied hardware)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            vid_results = list(executor.map(process_vid, videos))
        pool.extend(vid_results)

    if not pool:
        raise ValueError("Nenhuma mídia visual fornecida.")

    estimated_loops = 1
    total_pool_dur = sum(item['duration'] for item in pool)
    if audio_dur > 0 and total_pool_dur > 0:
        estimated_loops = max(1, int((audio_dur / total_pool_dur) * len(pool)) + len(pool))
    
    if len(pool) > 15 or estimated_loops > 20:
        transition = 'none'
        transition_duration = 0.0

    # 2. Sequence loop generation matching audio_dur
    sequence = []
    current_time = 0.0

    if audio_dur > 0:
        idx = 0
        while current_time < audio_dur:
            item = pool[idx % len(pool)].copy()
            item['duration'] = max(item['duration'], transition_duration + 0.1)
            sequence.append(item)
            time_advance = item['duration'] - transition_duration
            current_time += time_advance
            idx += 1
    else:
        sequence = pool.copy()
        for it in sequence:
             it['duration'] = max(it['duration'], transition_duration + 0.1)

    # 3. Assemble ffmpeg command & filter_complex
    cmd = [ffmpeg_path, '-y']
    use_manifest = len(sequence) > 20
    manifest_path = None
    
    if use_manifest:
        manifest_path = os.path.join(os.path.dirname(output_path), 'inputs_manifest.txt')
        if filter_script_path:
            manifest_path = os.path.join(os.path.dirname(filter_script_path), 'inputs_manifest.txt')
            
        with open(manifest_path, 'w', encoding='utf-8') as f:
            for item in sequence:
                safe_p = rel(item['path']).replace("'", "'\\''")
                f.write(f"file '{safe_p}'\nduration {item['duration']}\n")
        
        cmd.extend(['-f', 'concat', '-safe', '0', '-i', rel(manifest_path)])
    else:
        for item in sequence:
            if item['type'] == 'image':
                cmd.extend(['-loop', '1', '-t', str(item['duration']), '-i', rel(item['path'])])
            else:
                cmd.extend(['-i', rel(item['path'])])

    total_media = len(sequence)
    audio_input_base_index = 1 if use_manifest else total_media
    audio_idx = audio_input_base_index
    music_idx = audio_input_base_index + (1 if audio else 0)

    if audio: cmd.extend(['-i', rel(audio)])
    if music: cmd.extend(['-i', rel(music)])

    filters = []
    video_outs = []
    audio_outs = []
    broll_audio = None
    
    def get_clip_filters(idx, item, width, height, fps, settings, is_manifest=False):
        input_label = "[0:v]" if is_manifest else f"[{idx}:v]"
        zoom_style = settings.get('zoomStyle', 'none')
        filter_style = settings.get('filterStyle', 'nenhum')
        
        zm_val = settings.get('zoomSpeed', 3)
        try: zm_val = int(zm_val)
        except: zm_val = 3
        step = 0.0005 + (zm_val - 1) * 0.0005 

        scale_w, scale_h = width, height
        if zoom_style != 'none':
            scale_w, scale_h = int(width * 1.5), int(height * 1.5)

        sws_flags = "fast_bilinear" if settings.get('renderPreset') in ['ultrafast', 'superfast'] else "bicubic"
        chain = f"{input_label}scale={scale_w}:{scale_h}:force_original_aspect_ratio=increase:flags={sws_flags},crop={scale_w}:{scale_h},setsar=1"
        
        if filter_style == 'sepia': chain += ",colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
        elif filter_style == 'grayscale': chain += ",hue=s=0"
        elif filter_style == 'high-contrast': chain += ",eq=contrast=1.3:brightness=0.05"
        elif filter_style == 'high-saturation': chain += ",eq=saturation=1.6"
        elif filter_style == 'blur': chain += ",boxblur=luma_radius=2:luma_power=1"
        elif filter_style == 'vignette': chain += ",vignette=PI/4"

        duration_frames = int(item['duration'] * fps)
        if zoom_style == 'zoom-in': chain += f",zoompan=z='min(zoom+{step},1.5)':d={duration_frames}:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s={width}x{height}"
        elif zoom_style == 'zoom-out': chain += f",zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-{step}))':d={duration_frames}:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s={width}x{height}"
        elif zoom_style == 'pan-right': chain += f",zoompan=z=1.2:x='if(lte(x,0),0,x+{step*width*10})':y='ih/2-(ih/zoom)/2':d={duration_frames}:s={width}x{height}"
        elif zoom_style == 'pan-left': chain += f",zoompan=z=1.2:x='if(lte(x,0),iw-iw/zoom,x-{step*width*10})':y='ih/2-(ih/zoom)/2':d={duration_frames}:s={width}x{height}"
        elif zoom_style == 'random':
            modes = ['zoom-in', 'zoom-out', 'pan-right']; m = modes[idx % len(modes)]
            if m == 'zoom-in': chain += f",zoompan=z='min(zoom+{step},1.5)':d={duration_frames}:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s={width}x{height}"
            elif m == 'zoom-out': chain += f",zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-{step}))':d={duration_frames}:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s={width}x{height}"
            else: chain += f",zoompan=z=1.2:x='if(lte(x,0),0,x+{step*width*10})':y='ih/2-(ih/zoom)/2':d={duration_frames}:s={width}x{height}"
        else: chain += f",scale={width}:{height}"

        chain += f",format=yuv420p,fps={fps},tpad=stop_mode=clone:stop_duration={transition_duration + 1.0}"
        return chain

    v_master = None
    a_master = None

    if use_manifest:
        v_stream = "[0:v]"
        filters.append(f"{v_stream}scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1[v_scaled]")
        v_master = "[v_scaled]"
        
        if subtitle:
            sub_path_safe = subtitle.replace('\\', '/').replace(':', '\\\\:')
            filters.append(f"{v_master}subtitles='{sub_path_safe}'[v_final]")
            v_master = "[v_final]"
            subtitle = None
        
        # Audio from MP4s with custom volume
        video_vol = settings.get('videoVolume', -15)
        filters.append(f"[0:a]volume={video_vol}dB,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[broll_a_reduced]")
        broll_audio = "[broll_a_reduced]"
    else:
        for i, item in enumerate(sequence):
            f = get_clip_filters(i, item, width, height, fps, settings)
            v_out = f"[v{i}]"
            filters.append(f + v_out)
            video_outs.append(v_out)
            
            a_out = f"[a{i}]"
            if item['type'] == 'video' and item.get('has_audio'):
                # Clips audio with custom volume
                video_vol = settings.get('videoVolume', -15)
                filters.append(f"[{i}:a]volume={video_vol}dB,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo{a_out}")
            else:
                filters.append(f"anullsrc=r=48000:cl=stereo:d={item['duration']}{a_out}")
            audio_outs.append(a_out)

        if total_media > 1 and transition != 'none':
            curr_v = video_outs[0]; offset = sequence[0]['duration'] - transition_duration
            for i in range(1, total_media):
                out_v = f"[tr{i}]"
                filters.append(f"{curr_v}{video_outs[i]}xfade=transition={transition}:duration={transition_duration}:offset={offset}{out_v}")
                curr_v = out_v; offset += sequence[i]['duration'] - transition_duration
            v_master = curr_v

            video_audios = []; current_time_ms = 0
            for i, item in enumerate(sequence):
                delay_ms = int(current_time_ms)
                if item['type'] == 'video' and item.get('has_audio'):
                    da_out = f"[broll_a{i}]"
                    filters.append(f"{audio_outs[i]}adelay={delay_ms}|{delay_ms}{da_out}")
                    video_audios.append(da_out)
                current_time_ms += (item['duration'] - transition_duration) * 1000.0
            if video_audios:
                broll_audio = "[mixed_broll]"
                if len(video_audios) > 1: filters.append(f"{''.join(video_audios)}amix=inputs={len(video_audios)}:normalize=0{broll_audio}")
                else: broll_audio = video_audios[0]
        elif total_media > 1:
            concat_inputs = []
            for i in range(total_media):
                concat_inputs.extend([video_outs[i], audio_outs[i]])
            v_master = "[v_concat]"; broll_audio = "[a_concat]"
            filters.append(f"{''.join(concat_inputs)}concat=n={total_media}:v=1:a=1{v_master}{broll_audio}")
        else:
            v_master = video_outs[0]
            if sequence[0].get('has_audio'): broll_audio = audio_outs[0]

    # Main Audio Assembly
    final_mix_inputs = []
    if audio:
        nar_vol = settings.get('narrationVolume', 0)
        filters.append(f"[{audio_idx}:a]volume={nar_vol}dB,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[main_a]")
        final_mix_inputs.append("[main_a]")
    if music:
        mus_vol = settings.get('musicVolume', -15)
        filters.append(f"[{music_idx}:a]volume={mus_vol}dB,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[bgm_a]")
        final_mix_inputs.append("[bgm_a]")
    if broll_audio:
        final_mix_inputs.append(broll_audio)

    # Master Mixer
    if final_mix_inputs:
        if len(final_mix_inputs) > 1:
            a_master = "[a_final]"
            filters.append(f"{''.join(final_mix_inputs)}amix=inputs={len(final_mix_inputs)}:normalize=0:duration=first{a_master}")
        else: a_master = final_mix_inputs[0]

    # FINAL COMMAND CONSTRUCTION
    filter_complex = ";".join(filters)
    if filter_complex:
        if filter_script_path:
            with open(filter_script_path, 'w', encoding='utf-8') as f: f.write(filter_complex)
            cmd.extend(['-filter_complex_script', rel(filter_script_path)])
        else: cmd.extend(['-filter_complex', filter_complex])
    
    # Map final labels
    if v_master: cmd.extend(['-map', v_master])
    if a_master: cmd.extend(['-map', a_master])
    
    # Subtitle fallback
    if subtitle:
        sub_path_safe = subtitle.replace('\\', '/').replace(':', '\\\\:')
        cmd.extend(['-vf', f"subtitles='{sub_path_safe}'"])

    # Codificador e Velocidade
    encoder = settings.get('encoder', 'libx264')
    render_preset = settings.get('renderPreset', 'medium')
    
    # Mapeamento de presets para hardware (nvenc usa p1...p7, mas aceita alguns nomes)
    # Para ser seguro e compatível, vamos traduzir os nomes comuns
    hw_preset = render_preset
    if encoder == 'h264_nvenc':
        nv_map = {
            'ultrafast': 'p1', 'superfast': 'p2', 'veryfast': 'p3', 
            'faster': 'p4', 'fast': 'p4', 'medium': 'p5', 
            'slow': 'p6', 'slower': 'p7', 'veryslow': 'p7'
        }
        hw_preset = nv_map.get(render_preset, 'p4')
    elif encoder == 'h264_amf':
         amf_map = {
            'ultrafast': 'speed', 'superfast': 'speed', 'veryfast': 'speed',
            'medium': 'balanced', 'slow': 'quality', 'veryslow': 'quality'
         }
         hw_preset = amf_map.get(render_preset, 'balanced')

    cmd.extend(['-c:v', encoder])
    
    # Alguns encoders não suportam -crf, usamos -b:v como fallback ou apenas o preset
    if encoder == 'libx264':
        cmd.extend(['-preset', render_preset, '-crf', '23'])
    else:
        # Encoders de hardware geralmente preferem controle de bitrate ou presets de qualidade
        cmd.extend(['-preset', hw_preset])
        if encoder == 'h264_nvenc':
            cmd.extend(['-rc', 'vbr', '-cq', '24', '-gpu', 'any'])
        elif encoder == 'h264_qsv':
            cmd.extend(['-global_quality', '23'])

    cmd.extend([
        '-c:a', 'aac', '-b:a', '192k',
        '-pix_fmt', 'yuv420p'
    ])
    
    if audio_dur > 0: cmd.extend(['-t', str(audio_dur)])
    cmd.append(output_path)
    return cmd
