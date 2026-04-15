/**
 * Guru Master — Build-time Python Setup
 * Downloads the Python embeddable zip for Windows, extracts it to /bin/python,
 * and prepares it for bundling with Electron.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BIN_DIR = path.join(ROOT, 'bin');
const PYTHON_DIR = path.join(BIN_DIR, 'python');
const PYTHON_ZIP = path.join(BIN_DIR, 'python-embed.zip');

// Python version to download
const PYTHON_VER = '3.11.9';
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VER}/python-${PYTHON_VER}-embed-amd64.zip`;

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function setup() {
  console.log('🚀 Iniciando setup do Python portátil...');

  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR);
  if (fs.existsSync(PYTHON_DIR)) {
    console.log('✅ Python já está presente em /bin/python.');
    return;
  }

  console.log(`📥 Baixando Python ${PYTHON_VER} embeddable...`);
  await downloadFile(PYTHON_URL, PYTHON_ZIP);

  console.log('📦 Extraindo arquivos...');
  if (!fs.existsSync(PYTHON_DIR)) fs.mkdirSync(PYTHON_DIR);
  
  // Use PowerShell for unzip to avoid dependencies
  execSync(`powershell Expand-Archive -Path "${PYTHON_ZIP}" -DestinationPath "${PYTHON_DIR}" -Force`);
  fs.unlinkSync(PYTHON_ZIP);

  // Setup pip (get-pip.py)
  console.log('🛠️ Configurando pip...');
  const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';
  const GET_PIP_PATH = path.join(PYTHON_DIR, 'get-pip.py');
  await downloadFile(GET_PIP_URL, GET_PIP_PATH);
  
  // In embeddable python, we need to uncomment 'import site' in ._pth file
  const pthFile = path.join(PYTHON_DIR, `python${PYTHON_VER.split('.').slice(0, 2).join('')}._pth`);
  if (fs.existsSync(pthFile)) {
    let content = fs.readFileSync(pthFile, 'utf8');
    content = content.replace('#import site', 'import site');
    fs.writeFileSync(pthFile, content);
  }

  console.log('⚙️ Instalando pip...');
  execSync(`"${path.join(PYTHON_DIR, 'python.exe')}" "${GET_PIP_PATH}" --quiet`, { stdio: 'inherit' });
  fs.unlinkSync(GET_PIP_PATH);

  console.log('✅ Python portátil configurado com sucesso!');
}

setup().catch(console.error);
