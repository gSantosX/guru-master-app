import sys
import os
import json
import uuid

# Add current dir to path to import ffmpeg_utils
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
import ffmpeg_utils

def test_render_with_params():
    print("Testing FFmpeg Command Generation with User Params...")
    
    # Mock data
    item = {'type': 'image', 'path': 'dummy.jpg', 'duration': 5.0}
    images = ['dummy.jpg']
    settings = {
        'resolution': '1080p Horizontal (1920x1080)',
        'fps': '30 FPS',
        'transitionStyle': 'crossfade',
        'zoomStyle': 'zoom-in',
        'zoomSpeed': 5, # Aggressive
        'filterStyle': 'sepia',
        'narrationVolume': 5,
        'videoVolume': -10,
        'musicVolume': -20
    }
    
    # We need dummy files to pass some checks
    with open('dummy.jpg', 'w') as f: f.write('dummy')
    
    try:
        cmd = ffmpeg_utils.build_ffmpeg_command(
            output_path='output.mp4',
            images=images,
            audio='dummy.mp3',
            music='dummy_music.mp3',
            settings=settings,
            filter_script_path='filter_test.txt'
        )
        
        print("\nGenerated Command:")
        print(" ".join(cmd))
        
        if os.path.exists('filter_test.txt'):
            print("\nFilter Complex Content:")
            with open('filter_test.txt', 'r') as f:
                content = f.read()
                print(content)
                
                if 'aresample=48000,aformat=sample_fmts=fltp' in content:
                    print("PASS: Audio Normalization (48kHz FLTP) correctly integrated!")
                else:
                    print("FAIL: Audio Normalization MISSING!")
                    
                if 'volume=' in content and 'dB' in content:
                    print("PASS: Volume Control (dB) correctly integrated!")
                else:
                    print("FAIL: Volume Control MISSING or WRONG FORMAT!")
                    
                if 'musicVolume' in json.dumps(settings):
                     print("PASS: settings contains musicVolume!")
    finally:
        if os.path.exists('dummy.jpg'): os.remove('dummy.jpg')
        if os.path.exists('filter_test.txt'): os.remove('filter_test.txt')

if __name__ == "__main__":
    test_render_with_params()
