# 🎬 DocuCraft 2D - AI Documentary Video Studio

> **Vercel Frontend + Google Colab Free GPU Backend**  
> Generate complete 2D documentary videos from any script using Google Colab for free heavy video processing and Vercel for fast, modern web hosting.

---

## 🌟 Overview & Architecture

```
+--------------------------------------------------------------+
|                     1. USER BROWSER                          |
|             Enters Urdu / English Documentary Script         |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|             2. VERCEL FRONTEND (HTML5 + Tailwind)            |
|       - Sends API Request to Colab Tunnel URL                |
|       - Tracks live multi-stage rendering progress           |
|       - Plays & Downloads finished MP4 video                 |
+------------------------------+-------------------------------+
                               | (Public HTTPS Cloudflare Tunnel)
                               v
+--------------------------------------------------------------+
|             3. GOOGLE COLAB BACKEND (Free T4 GPU)            |
|  - Edge-TTS: Ultra-realistic Urdu/English neural voiceover   |
|  - AI Imagery: Historical, Crime, Science scene generator   |
|  - FFmpeg: 2D Ken Burns smooth camera panning & zoom         |
|  - Subtitles: Clean modern captions synchronized with voice  |
|  - Audio Mix: Ambient documentary background score ducking   |
+--------------------------------------------------------------+
```

---

## 📁 Project Structure

```text
2d Editing/
├── colab/
│   ├── Documentary_AI_Backend.ipynb  # Upload this to Google Colab
│   ├── colab_backend.py              # Python script version
│   └── colab_setup_guide.md          # Urdu & English setup guide
├── index.html                        # Vercel-ready frontend studio
├── style.css                         # Sleek dark cinematic styling
├── app.js                            # Frontend logic & API connection
├── vercel.json                       # Vercel deployment configuration
├── package.json                      # Project metadata
└── README.md                         # Documentation
```

---

## 🚀 Quick Start Guide (تیز رفتار رہنمائی)

### 1️⃣ Run Google Colab (بیک اینڈ سرور)
1. Open [Google Colab](https://colab.research.google.com/).
2. Click **File > Upload notebook** and upload `colab/Documentary_AI_Backend.ipynb`.
3. In Colab, go to **Runtime > Change runtime type** and choose **T4 GPU**.
4. Run **Cell 1** (Installs packages) and **Cell 2** (Launches server and Cloudflare tunnel).
5. Copy the generated URL: `https://xxxx.trycloudflare.com`.

### 2️⃣ Deploy Frontend to Vercel (ویب سائٹ)
1. Push this repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select this GitHub repository and click **Deploy**. (Zero configuration required!).
4. Open your live Vercel URL!

*(You can also test locally right now by opening `index.html` in any browser or running `python -m http.server 3000`)*.

### 3️⃣ Generate Your First Documentary
1. Paste the `trycloudflare.com` URL into the top bar of your Vercel website.
2. Click **Connect & Test** (The status will turn green).
3. Type or choose a preset script:
   - 🇵🇰 Urdu: برمودا تکون کا پراسرار راز
   - 🇵🇰 Urdu: موہنجو دڑو کی گمشدہ دنیا
   - 🇬🇧 English: Secrets of the Mariana Trench
4. Select your preferred voice (e.g. Urdu Asad / Uzma, English Christopher / Ryan).
5. Click **Generate 2D Documentary Video**!
6. Watch the live progress bar, preview the video, and download the finished 1080p MP4.

---

## 🎙️ Supported Neural Voices

| Voice ID | Display Name | Language | Description |
|---|---|---|---|
| `ur-male` | Asad | Urdu (PK) | Deep, authoritative documentary narrator |
| `ur-female` | Uzma | Urdu (PK) | Clear, expressive storytelling voice |
| `ur-male-in` | Salman | Urdu (IN) | Natural balanced Urdu narration |
| `en-doc-male` | Christopher | English (US) | Deep cinematic documentary tone |
| `en-bbc-male` | Ryan | English (UK) | Classic BBC documentary style |
| `en-us-female` | Jenny | English (US) | Crisp, modern explainer voice |
| `hi-male` | Madhur | Hindi (IN) | Clear Hindi documentary narration |

---

## 🎬 2D Documentary Motion Effects
- **Ken Burns Effect**: Automated smooth zoom-in, zoom-out, and lateral camera pans across generated scene artwork.
- **Synchronized Subtitles**: Clear, high-contrast bottom captions with semi-transparent backplates.
- **Audio Ducking**: Background cinematic ambient synth tones automatically balanced beneath the spoken voiceover.
