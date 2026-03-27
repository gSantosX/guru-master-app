import os
import subprocess
import json
import re

def get_audio_duration(file_path):
    """Gets the duration of an audio file using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return 10.0  # Fallback duration

def build_ffmpeg_command(
    output_path,
    images,
    audio=None,
    music=None,
    subtitle=None,
    settings=None,
    ffmpeg_path='ffmpeg',
    filter_script_path=None
):
    """
    Builds a complex FFmpeg command using relative paths and optionally a filter script.
    Assumes FFmpeg will be run with cwd as the directory containing the assets.
    """
    if not settings:
        settings = {}
    
    res_str = settings.get('resolution', '1080p Horizontal (1920x1080)')
    fps_match = re.search(r'\d+', settings.get('fps', '30'))
    fps = int(fps_match.group()) if fps_match else 30
    
    transition = settings.get('transitionStyle', 'fade')
    transition_map = {
        'crossfade': 'fade',
        'fade': 'fadeblack',
        'dissolve': 'dissolve',
        'wipeleft': 'wipeleft',
        'wiperight': 'wiperight'
    }
    transition = transition_map.get(transition, 'fade')
    
    # Parse resolution
    if '1920x1080' in res_str:
        width, height = 1920, 1080
    elif '3840x2160' in res_str:
        width, height = 3840, 2160
    elif '1080x1920' in res_str:
        width, height = 1080, 1920
    elif '1080x1080' in res_str:
        width, height = 1080, 1080
    else:
        width, height = 1920, 1080

    total_duration = get_audio_duration(audio) if audio and os.path.exists(audio) else (len(images) * 5.0)
    image_duration = total_duration / len(images) if images else 5.0
    transition_duration = 1.0 if transition != 'none' else 0.0

    cmd = [ffmpeg_path, '-y']
    
    # Helper to get filename for relative paths
    def rel(path):
        return os.path.basename(path) if path else None

    # Add image inputs (relative)
    for img in images:
        cmd.extend(['-loop', '1', '-t', str(image_duration + transition_duration), '-i', rel(img)])
    
    # Add audio inputs (relative)
    if audio:
        cmd.extend(['-i', rel(audio)])
    if music:
        cmd.extend(['-i', rel(music)])
        
    # Build filter_complex
    filters = []
    for i in range(len(images)):
        f = f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1"
        filters.append(f + f"[v{i}]")

    # Transitions
    if len(images) > 1 and transition != 'none':
        current_v = "[v0]"
        offset = image_duration
        for i in range(1, len(images)):
            next_v = f"[v{i}]"
            out_v = f"[tr{i}]"
            filters.append(f"{current_v}{next_v}xfade=transition={transition}:duration={transition_duration}:offset={offset}{out_v}")
            current_v = out_v
            offset += image_duration
        final_v = current_v
    else:
        input_list = "".join([f"[v{i}]" for i in range(len(images))])
        filters.append(f"{input_list}concat=n={len(images)}:v=1:a=0[v_concat]")
        final_v = "[v_concat]"

    # Audio
    if audio and music:
        filters.append(f"[{len(images)}:a]volume=1.0[a1];[{len(images)+1}:a]volume=0.2[a2];[a1][a2]amix=inputs=2:duration=first[a_out]")
        final_a = "[a_out]"
    elif audio:
        filters.append(f"[{len(images)}:a]anull[a_out]")
        final_a = "[a_out]"
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
    
    # Subtitles (Use absolute path as it's hard to handle relatively in some ffmpeg versions)
    if subtitle:
        sub_path = subtitle.replace('\\', '/')
        if ':' in sub_path: sub_path = sub_path.replace(':', '\\\\:')
        cmd.extend(['-vf', f"subtitles='{sub_path}'"])

    cmd.extend([
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-pix_fmt', 'yuv420p', '-shortest',
        output_path  # Output path should probably stay absolute
    ])
    
    return cmd
