import subprocess
import os

def test_ffmpeg():
    print("--- INICIANDO TESTE DE DIAGNÓSTICO DO GURU MASTER ---")
    
    # 1. Verificar se FFmpeg existe no PATH
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        print("[OK] FFmpeg detectado no PATH do Windows.")
        print(f"Versão: {result.stdout.splitlines()[0]}")
    except Exception as e:
        print(f"[ERRO] FFmpeg não encontrado: {e}")
        return False

    # 2. Testar geração de um vídeo de 1 segundo (Solid Color)
    # Isso valida se o FFmpeg tem permissão de escrita e se os codecs (libx264) estão funcionando
    test_output = "test_render.mp4"
    if os.path.exists(test_output):
        os.remove(test_output)
        
    print(f"[PROCESSANDO] Tentando renderizar vídeo de teste de 1 segundo...")
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'color=c=blue:s=1280x720:d=1',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        test_output
    ]
    
    try:
        process = subprocess.run(cmd, capture_output=True, text=True)
        if process.returncode == 0 and os.path.exists(test_output):
            print(f"[SUCESSO] Vídeo de teste gerado com sucesso em '{os.path.abspath(test_output)}'!")
            print("[INFO] Todos os codecs e permissões de escrita estão operacionais.")
            os.remove(test_output) # Limpar após teste bem sucedido
            return True
        else:
            print("[ERRO] Falha na renderização de teste.")
            print(f"Log do FFmpeg: {process.stderr}")
            return False
    except Exception as e:
        print(f"[ERRO] Falha crítica ao disparar o motor: {e}")
        return False

if __name__ == "__main__":
    test_ffmpeg()
