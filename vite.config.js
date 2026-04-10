import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite Plugin to Auto-Start Guru Backend
const guruBackendPlugin = () => {
  let backendProcess = null;

  return {
    name: 'guru-backend-starter',
    configureServer(server) {
      if (process.env.GURU_BACKEND_STARTED) return;
      
      console.log('\n[Guru] Iniciando Motor Backend automaticamente (Porta 5000)...');
      
      const venvPath = path.join(__dirname, 'backend/venv/Scripts/python.exe');
      const apiPath = path.join(__dirname, 'backend/api.py');
      
      backendProcess = spawn(venvPath, [apiPath], {
        cwd: path.join(__dirname, 'backend'),
        shell: false,
        stdio: 'inherit',
        env: { ...process.env, GURU_BACKEND_STARTED: 'true' }
      });

      backendProcess.on('error', (err) => {
        console.error('[Guru] Erro ao iniciar Motor Backend:', err.message);
      });

      process.on('exit', () => {
        if (backendProcess) backendProcess.kill();
      });
      
      process.on('SIGINT', () => {
        if (backendProcess) backendProcess.kill();
        process.exit();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), guruBackendPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, '')
      },
      '/api/grok': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/grok/, '')
      },
      '/api/gemini': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '/api/gemini')
      },
      // Generic Local Backend Proxy
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
