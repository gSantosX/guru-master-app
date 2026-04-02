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
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            vid_results = list(executor.map(process_vid, videos))
        pool.extend(vid_results)

    if not pool:
        raise ValueError("Nenhuma mídia visual fornecida.")

    # Proteção monumental: Se existirem DEZENAS/CENTENAS de clipes,
    # rodar uma cadeia infinita de 'xfade' no FFmpeg engole toda a memória RAM
    # (buffering simultâneo de inuts) e dropa frames causando congelamento severo.
    # Desativamos o crossfade se a pool somada ao áudio der dezenas de iterações.
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
            # Enforce mathematical minimum duration to prevent layout breaking/offset negations
            item['duration'] = max(item['duration'], transition_duration + 0.1)
            sequence.append(item)
            
            # The timeline "advances" by exactly the duration minus the transition overlap slice
            time_advance = item['duration'] - transition_duration
            current_time += time_advance
            idx += 1
    else:
        # Fallback if no audio
        sequence = pool.copy()
        for it in sequence:
             it['duration'] = max(it['duration'], transition_duration + 0.1)

    # 3. Assemble ffmpeg command & filter_complex
    cmd = [ffmpeg_path, '-y']
    
    for item in sequence:
        if item['type'] == 'image':
            # Images feed exactly their expected active duration to ffmpeg.
            cmd.extend(['-loop', '1', '-t', str(item['duration']), '-i', rel(item['path'])])
        else:
            cmd.extend(['-i', rel(item['path'])])

    total_media = len(sequence)
    audio_idx = total_media
    music_idx = total_media + (1 if audio else 0)

    if audio: cmd.extend(['-i', rel(audio)])
    if music: cmd.extend(['-i', rel(music)])

    filters = []
    video_outs = []
    audio_outs = []
    
    for i, item in enumerate(sequence):
        # Apply standard formating AND append `tpad` to pad trailing frames securely. 
        # This completely prevents xfade EOF freezing bugs if a video is short or streams desync near borders.
        f = f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1,format=yuv420p,fps={fps},tpad=stop_mode=clone:stop_duration={transition_duration + 1.0}"
        v_out = f"[v{i}]"
        filters.append(f + v_out)
        video_outs.append(v_out)
        
        # Build matching audio streams for sequential integration or amix later
        a_out = f"[a{i}]"
        if item['type'] == 'video' and item.get('has_audio'):
            # The clip has audio. If we are using concat, we must TRIM it or let it pass so it aligns conceptually.
            # volume -14dB and FORCE 48000Hz stereo so concat doesn't crash on sample rate mismatch
            filters.append(f"[{i}:a]volume=-14dB,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo{a_out}")
        else:
            # Generate silent audio exactly matching the mathematical duration of this visual
            filters.append(f"anullsrc=r=48000:cl=stereo:d={item['duration']}{a_out}")
        audio_outs.append(a_out)

    broll_audio = None
    final_v = None

    # Videos Transitions
    if total_media > 1 and transition != 'none':
        current_v = video_outs[0]
        # offset begins exactly where the crossfade overlap must initiate
        offset = sequence[0]['duration'] - transition_duration
        for i in range(1, total_media):
            next_v = video_outs[i]
            out_v = f"[tr{i}]"
            filters.append(f"{current_v}{next_v}xfade=transition={transition}:duration={transition_duration}:offset={offset}{out_v}")
            current_v = out_v
            # Increment next transition starting position
            offset += sequence[i]['duration'] - transition_duration
        final_v = current_v

        # For xfade (which implies limited medias due to our protection block), we amix the audio using delays
        video_audios = []
        current_time_ms = 0
        for i, item in enumerate(sequence):
            delay_ms = int(current_time_ms)
            if item['type'] == 'video' and item.get('has_audio'):
                da_out = f"[broll_a{i}]"
                filters.append(f"{audio_outs[i]}adelay={delay_ms}|{delay_ms}{da_out}")
                video_audios.append(da_out)
            current_time_ms += (item['duration'] - transition_duration) * 1000.0
            
        if video_audios:
            if len(video_audios) > 1:
                inputs_str = "".join(video_audios)
                filters.append(f"{inputs_str}amix=inputs={len(video_audios)}:normalize=0[mixed_broll]")
                broll_audio = "[mixed_broll]"
            else:
                broll_audio = video_audios[0]

    elif total_media > 1:
        # CONCAT MODE: High performance, zero overlap looping (immune to Buffer Explosions)
        # We interleave [v0][a0] [v1][a1] exactly how ffmpeg concat demands!
        concat_inputs = []
        for i in range(total_media):
            concat_inputs.append(video_outs[i])
            concat_inputs.append(audio_outs[i])
            
        input_list = "".join(concat_inputs)
        filters.append(f"{input_list}concat=n={total_media}:v=1:a=1[v_concat][a_concat]")
        final_v = "[v_concat]"
        broll_audio = "[a_concat]"
    else:
        final_v = video_outs[0]
        if sequence[0].get('has_audio'):
            broll_audio = audio_outs[0]

    # Main Audio Assembly
    final_mix_inputs = []
    
    if audio:
        filters.append(f"[{audio_idx}:a]volume=1.0[main_a]")
        final_mix_inputs.append("[main_a]")
    
    if music:
        filters.append(f"[{music_idx}:a]volume=0.2[bgm_a]")
        final_mix_inputs.append("[bgm_a]")
        
    if broll_audio:
        final_mix_inputs.append(broll_audio)

    # Master mix
    if final_mix_inputs:
        if len(final_mix_inputs) > 1:
            amix_str = "".join(final_mix_inputs)
            # duration=first sets to length of 1st input (main_a) -- prevents truncating the main story track
            filters.append(f"{amix_str}amix=inputs={len(final_mix_inputs)}:normalize=0:duration=first[final_a]")
            final_a = "[final_a]"
        else:
            final_a = final_mix_inputs[0]
    else:
        final_a = None

    filter_complex = ";".join(filters)
    
    if filter_script_path:
        with open(filter_script_path, 'w', encoding='utf-8') as f:
            f.write(filter_complex)
        cmd.extend(['-filter_complex_script', rel(filter_script_path)])
    else:
        cmd.extend(['-filter_complex', filter_complex])
    
    cmd.extend(['-map', final_v])
    
    if final_a:
        cmd.extend(['-map', final_a])
    
    if subtitle:
        sub_path = subtitle.replace('\\', '/')
        if ':' in sub_path: sub_path = sub_path.replace(':', '\\\\:')
        cmd.extend(['-vf', f"subtitles='{sub_path}'"])

    cmd.extend([
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-pix_fmt', 'yuv420p'
    ])
    
    # We never use -shortest on the video if the user states "never cut the audio duration"
    # But video track might be longer than audio. Let's strictly constrain total output 
    # time accurately mapped by audio track using -t:
    if audio_dur > 0:
        cmd.extend(['-t', str(audio_dur)])

    cmd.append(output_path)
    return cmd
