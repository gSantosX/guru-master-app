# 🚀 Guru Master AI - v2.1.1

O Guru Master é um pipeline completo de automação para criação de conteúdo em vídeo, mineração de canais e geração de assets via IA. Esta versão 2.1.1 traz estabilidade, novas ferramentas de modelagem de canais e suporte aprimorado para renderização via FFmpeg.

---

## 🛠️ Requisitos de Sistema (Necessários para Funcionar)

Para que o Guru Master funcione perfeitamente em sua máquina, você **precisa** instalar os seguintes componentes:

### 1. Node.js (LTS)
O motor principal para o frontend e a ponte Electron.
- **Versão recomendada:** v20 ou superior.
- **Download:** [nodejs.org](https://nodejs.org/)

### 2. Python 3.10+
Responsável por toda a lógica de backend, automação do Whisk e processamento de dados.
- **IMPORTANTE:** Certifique-se de marcar a opção **"Add Python to PATH"** durante a instalação.
- **Download:** [python.org](https://www.python.org/downloads/)

### 3. FFmpeg (Full Build)
Essencial para a renderização de vídeos e manipulação de áudio.
- **Instrução:** O executável `ffmpeg` e `ffprobe` devem estar acessíveis no seu terminal (PATH do sistema) ou configurados manualmente na aba de Configurações do app.
- **Download Recomendado:** [Gyan.dev (Windows Full Build)](https://www.gyan.dev/ffmpeg/builds/)

### 4. Google Chrome
Necessário para a automação do **Auto Whisk** (Geração de Imagens).
- Certifique-se de ter o Chrome instalado para que a extensão e a automação funcionem corretamente.

---

## 🚀 Como Instalar e Rodar

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/gSantosX/guru-master-app.git
    cd guru-master-app
    ```

2.  **Instale as dependências do Frontend:**
    ```bash
    npm install
    ```

3.  **Instale as dependências do Backend (Python):**
    ```bash
    pip install -r backend/requirements.txt
    ```

4.  **Inicie o Aplicativo:**
    Execute o arquivo `GURU_MASTER.bat` na raiz do projeto para subir o servidor e a interface simultaneamente.

---

## 🏗️ Estrutura do Projeto

*   `/src`: Código fonte da interface React.
*   `/backend`: API em Python (Flask) e processamento de vídeo.
*   `/desktop`: Configurações do Electron.
*   `/whisk-extension`: Extensão para automação do Google Whisk.

---

## 📝 Notas da Versão 2.1.1
- Sincronização de versão em toda a interface.
- Novo módulo de **Modelagem de Canais**.
- Melhorias na fila de renderização (Progress Tab).
- Suporte a filtros complexos no FFmpeg.

---
**Desenvolvido por gSantosX**
