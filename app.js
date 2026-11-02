// DocuCraft 2D - Frontend Logic & Backend Bridge

// Preset Documentary Scripts
const PRESETS = {
  urdu_bermuda: `برمودا تکون بحر اوقیانوس کا وہ پراسرار مقام ہے جہاں درجنوں بحری جہاز اور طیارے پراسرار طور پر غائب ہو چکے ہیں۔
پائلٹوں نے اس علاقے میں کمپاس کے غیر معمولی انداز میں گھومنے کی اطلاع دی۔
سائنسدانوں کے مطابق اچانک اٹھنے والی بلند سمندری لہریں اور سمندر کی تہہ سے نکلنے والی میتھین گیس کے بلبلے ان پراسرار حادثات کی اصل سائنسی وجہ ہو سکتے ہیں۔`,

  urdu_history: `پانچ ہزار سال قدیم وادی سندھ کی تہذیب کا سب سے بڑا مرکز موہنجو دڑو تھا۔
اس قدیم شہر کا نکاسی آب کا نظام اور پختہ اینٹوں سے بنے مکانات اس دور کے انجینئروں کی غیر معمولی مہارت کا منہ بولتا ثبوت ہیں۔
لیکن یہ عظیم الشان اور ترقی یافتہ شہر آخر کیوں اور کیسے صفحہ ہستی سے مٹ گیا؟ یہ راز آج تک تاریخ کے پردوں میں چھپا ہوا ہے۔`,

  en_deep_sea: `Plunging nearly seven miles beneath the Pacific Ocean lies the Mariana Trench, the deepest and most unforgiving abyss on planet Earth.
Under crushing hydrostatic pressure and perpetual absolute darkness, bizarre bioluminescent creatures thrive against all odds.
Explorers and robotic submersibles continue to uncover lifeforms that redefine our understanding of biology and extraterrestrial survival.`,

  en_ai_future: `Artificial Intelligence is transitioning from predictive algorithms to autonomous reasoning engines capable of complex synthesis.
Machines are now capable of analyzing centuries of medical literature, predicting protein structures, and composing art in fractions of a second.
As autonomous agents reshape civilizations, humanity stands on the precipice of the most profound technological renaissance in history.`
};

// Global App State
let backendUrl = localStorage.getItem("docu_colab_url") || "";
let activeJobId = null;
let pollInterval = null;
let timerInterval = null;
let startTime = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Restore saved Colab URL
  const urlInput = document.getElementById("colabUrlInput");
  if (backendUrl) {
    urlInput.value = backendUrl;
    testBackendConnection(true); // silent check
  } else {
    updateStatusBadge("disconnected", "No Backend Connected");
  }

  // Script character counter
  const scriptInput = document.getElementById("scriptInput");
  scriptInput.addEventListener("input", updateScriptStats);

  // Auto-detect Google OAuth code on redirect
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get("code");
  if (authCode) {
    if (window.opener) {
      try {
        window.opener.postMessage({ type: "GOOGLE_AUTH_CODE", code: authCode }, "*");
        window.close();
        return;
      } catch (e) {}
    }
    setTimeout(() => {
      handleAutoConnectFromCode(authCode);
    }, 400);
  }
});

// Listen for OAuth message from popup
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GOOGLE_AUTH_CODE") {
    handleAutoConnectFromCode(event.data.code);
  }
});

// Update word and character counts
function updateScriptStats() {
  const text = document.getElementById("scriptInput").value.trim();
  const chars = text.length;
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById("charCount").innerText = `${chars} characters | ${words} words`;
}

// Paste clipboard to URL input
async function pasteColabUrl() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      document.getElementById("colabUrlInput").value = text.trim();
      testBackendConnection();
    }
  } catch (err) {
    alert("Please allow clipboard permission or paste manually.");
  }
}

// Load a preset script
function loadPresetScript() {
  const selector = document.getElementById("presetSelector");
  const key = selector.value;
  if (key && PRESETS[key]) {
    document.getElementById("scriptInput").value = PRESETS[key];
    updateScriptStats();

    // Auto-select matching voice
    const voiceSelect = document.getElementById("voiceSelect");
    if (key.startsWith("urdu_")) {
      voiceSelect.value = "ur-male";
    } else {
      voiceSelect.value = "en-doc-male";
    }
  }
}

// Clear script box
function clearScript() {
  document.getElementById("scriptInput").value = "";
  document.getElementById("presetSelector").value = "";
  updateScriptStats();
}

// Clean and normalize Backend URL
function getCleanUrl() {
  let input = document.getElementById("colabUrlInput");
  if (!input) return "";
  let url = input.value.trim();
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
    input.value = url;
  }
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}

// Test Connection to Google Colab
async function testBackendConnection(silent = false) {
  const url = getCleanUrl();
  if (!url) {
    if (!silent) alert("Please enter your Google Colab trycloudflare.com URL first!");
    updateStatusBadge("disconnected", "No Backend URL");
    return;
  }

  updateStatusBadge("checking", "Testing Connection...");
  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn) connectBtn.disabled = true;

  try {
    const startPing = Date.now();
    const res = await fetch(`${url}/health`, { method: "GET", headers: { "Accept": "application/json" } });
    const latency = Date.now() - startPing;

    if (res.ok) {
      const data = await res.json();
      backendUrl = url;
      localStorage.setItem("docu_colab_url", url);
      const ytInfo = data.youtube_ready ? " • YouTube 📺" : "";
      updateStatusBadge("connected", `Colab Online (${latency}ms)${ytInfo}`);
      if (!silent) {
        logToTerminal(`✅ Connected to Colab GPU backend! YouTube Direct Upload: ${data.youtube_ready ? 'Ready 📺' : 'Not Linked'}`);
      }
      checkUserYouTubeStatus();
    } else if (res.status === 502) {
      throw new Error(`Cloudflare Tunnel connected, lekin Google Colab par server band hai (502 Bad Gateway). Colab par Cell ko dobara Play karein.`);
    } else {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (err) {
    updateStatusBadge("disconnected", "Connection Failed");
    if (!silent) {
      alert(`⚠️ Connection Error:\n\n${err.message}\n\nURL: ${url}`);
    }
  } finally {
    if (connectBtn) connectBtn.disabled = false;
  }
}

// Update Header Status Badge
function updateStatusBadge(state, text) {
  const badge = document.getElementById("colabStatusBadge");
  const dot = document.getElementById("statusDot");
  const textEl = document.getElementById("statusText");

  textEl.innerText = text;

  if (state === "connected") {
    dot.className = "w-2 h-2 rounded-full bg-emerald-400";
    badge.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300";
  } else if (state === "checking") {
    dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
    badge.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-800 text-xs text-amber-300";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-rose-500";
    badge.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400";
  }
}

// Start Video Generation Job
async function startGeneration() {
  const url = getCleanUrl();
  if (!url) {
    alert("Please enter and connect your Google Colab Backend URL first!");
    return;
  }

  const script = document.getElementById("scriptInput").value.trim();
  if (!script || script.length < 15) {
    alert("Please enter a longer script for your documentary (at least a couple of sentences).");
    return;
  }

  const voice = document.getElementById("voiceSelect").value;
  const style = document.getElementById("styleSelect").value;
  const aspectRatio = document.querySelector('input[name="aspectRatio"]:checked')?.value || "16:9";
  const mediaType = document.querySelector('input[name="mediaType"]:checked')?.value || "pictures";
  const bgMusic = document.getElementById("bgMusicSelect").value;
  const kenBurns = document.getElementById("kenBurnsCheck").checked;
  const subtitles = document.getElementById("subtitlesCheck").checked;

  // YouTube Auto-Upload Settings
  const ytUpload = document.getElementById("ytUploadCheck")?.checked || false;
  const ytTitle = document.getElementById("ytTitleInput")?.value?.trim() || "";
  const ytPrivacy = document.getElementById("ytPrivacySelect")?.value || "private";
  const ytTags = document.getElementById("ytTagsInput")?.value?.trim() || "";

  const payload = {
    script: script,
    voice: voice,
    style: style,
    aspect_ratio: aspectRatio,
    media_type: mediaType,
    bg_music: bgMusic,
    ken_burns: kenBurns,
    subtitles: subtitles,
    youtube_upload: ytUpload,
    youtube_title: ytTitle,
    youtube_privacy: ytPrivacy,
    youtube_tags: ytTags,
    session_id: getOrCreateSessionId()
  };

  // Switch UI to Progress State
  switchRightPanel("progress");
  resetPipelineSteps();
  startElapsedTimer();
  logToTerminal("🚀 Connecting to Google Colab backend...");

  try {
    // 1. Verify backend is alive
    const healthCheck = await fetch(`${url}/health`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    }).catch(() => null);

    if (!healthCheck || !healthCheck.ok) {
      throw new Error("Colab Disconnected: Aapka Google Colab server band ho chuka hai ya Colab mein naya link generate hua hai. Colab tab mein check karein aur wahan aane wala naya URL paste karein.");
    }

    logToTerminal("Submitting documentary script to AI engine...");

    // 2. Submit generation job (Using simple request to bypass CORS preflight restrictions on local files)
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: {
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server returned error code ${res.status}`);
    }

    const data = await res.json();
    activeJobId = data.job_id;
    logToTerminal(`📋 Job created with ID: ${activeJobId}`);
    logToTerminal("⏳ Colab worker starting TTS voice synthesis & 2D rendering...");

    // Start polling status
    pollInterval = setInterval(pollJobStatus, 2000);
  } catch (err) {
    let msg = err.message;
    if (msg.includes("Failed to fetch")) {
      msg = "Colab se rabta nahi ho saka (Failed to fetch). Wajah: Colab par Cell 1 band ho gaya hai ya Colab ne naya URL de diya hai. Colab tab mein check karein aur naya URL paste karein.";
    }
    alert(`⚠️ Generation Error:\n\n${msg}`);
    switchRightPanel("idle");
    stopElapsedTimer();
  }
}

// Poll Job Status from Colab
async function pollJobStatus() {
  if (!activeJobId) return;

  const url = getCleanUrl();
  try {
    const res = await fetch(`${url}/api/status/${activeJobId}`);
    if (!res.ok) return;

    const data = await res.json();
    const progress = data.progress || 0;
    const stepText = data.step || "Processing...";

    // Update Progress Bar & Percentage
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("progressPercent").innerText = `${progress}%`;
    document.getElementById("currentStepText").innerText = stepText;

    logToTerminal(`[${progress}%] ${stepText}`);

    // Update Step Indicators
    updatePipelineVisuals(progress);

    // Check if completed
    if (data.status === "completed") {
      clearInterval(pollInterval);
      stopElapsedTimer();
      logToTerminal("🎉 Documentary video rendering completed successfully!");
      showCompletedVideo(data);
    } else if (data.status === "failed") {
      clearInterval(pollInterval);
      stopElapsedTimer();
      alert(`Generation Error: ${data.error || "Unknown error in Colab"}`);
      switchRightPanel("idle");
    }
  } catch (err) {
    console.warn("Poll status network glitch, retrying...", err);
  }
}

// Update Visual Step Highlights
function updatePipelineVisuals(progress) {
  const steps = [
    { id: "step1", threshold: 10 },
    { id: "step2", threshold: 30 },
    { id: "step3", threshold: 60 },
    { id: "step4", threshold: 80 },
    { id: "step5", threshold: 95 }
  ];

  steps.forEach((s, idx) => {
    const el = document.getElementById(s.id);
    const badge = el.querySelector(".step-badge");
    if (progress >= s.threshold) {
      el.className = "flex items-center justify-between step-completed";
      badge.innerText = "Completed";
    } else if (progress >= (idx === 0 ? 0 : steps[idx - 1].threshold)) {
      el.className = "flex items-center justify-between step-active";
      badge.innerText = "In Progress";
    } else {
      el.className = "flex items-center justify-between text-slate-500";
      badge.innerText = "Pending";
    }
  });
}

function resetPipelineSteps() {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step${i}`);
    el.className = "flex items-center justify-between text-slate-500";
    el.querySelector(".step-badge").innerText = "Pending";
  }
  document.getElementById("progressBar").style.width = "0%";
  document.getElementById("progressPercent").innerText = "0%";
  document.getElementById("logTerminal").innerHTML = "";
}

// Show Completed Video Player
function showCompletedVideo(jobData) {
  switchRightPanel("completed");

  const url = getCleanUrl();
  const videoPlayer = document.getElementById("finalVideoPlayer");
  const downloadBtn = document.getElementById("downloadVideoBtn");
  const durationBadge = document.getElementById("finalDurationBadge");

  const videoStreamUrl = `${url}/api/video/${activeJobId}?t=${Date.now()}`;
  const videoDownloadUrl = `${url}/api/download/${activeJobId}`;

  videoPlayer.src = videoStreamUrl;
  downloadBtn.href = videoDownloadUrl;
  // Update YouTube Banner if uploaded
  const ytBanner = document.getElementById("ytSuccessBanner");
  const ytWatchBtn = document.getElementById("ytWatchBtn");
  const ytPrivacyBadge = document.getElementById("ytPrivacyBadge");

  if (jobData.youtube_url) {
    currentYouTubeUrl = jobData.youtube_url;
    if (ytBanner) ytBanner.classList.remove("hidden");
    if (ytWatchBtn) ytWatchBtn.href = jobData.youtube_url;
    if (ytPrivacyBadge) ytPrivacyBadge.innerText = jobData.youtube_privacy || "Private";
    logToTerminal(`🎉 Video uploaded directly to YouTube: ${jobData.youtube_url}`);
  } else {
    if (ytBanner) ytBanner.classList.add("hidden");
    if (jobData.youtube_error) {
      logToTerminal(`ℹ️ YouTube: ${jobData.youtube_error}`);
    }
  }

  // Populate Storyboard
  const storyboard = document.getElementById("storyboardList");
  storyboard.innerHTML = "";

  if (jobData.scenes_data && jobData.scenes_data.length > 0) {
    jobData.scenes_data.forEach((sc) => {
      const card = document.createElement("div");
      card.className = "storyboard-card flex items-center justify-between p-2.5 rounded-xl bg-[#0a0e17] border border-slate-800 text-xs";
      const tag = sc.keyword ? `<span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 font-mono">${sc.keyword}</span>` : '';
      card.innerHTML = `
        <div class="flex items-center gap-2.5 overflow-hidden">
          <span class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">${sc.index}</span>
          <p class="text-slate-300 truncate max-w-xs">${sc.text}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${tag}
          <span class="text-slate-500 font-mono text-[11px]">${sc.duration}s</span>
        </div>
      `;
      storyboard.appendChild(card);
    });
  }

  // Refresh icons
  if (window.lucide) lucide.createIcons();
}

// Reset UI to create another
function resetToCreateNew() {
  clearInterval(pollInterval);
  stopElapsedTimer();
  activeJobId = null;
  switchRightPanel("idle");
}

// Switch Right Panel Views
function switchRightPanel(view) {
  const idle = document.getElementById("idleState");
  const progress = document.getElementById("progressState");
  const completed = document.getElementById("completedState");

  idle.classList.add("hidden");
  progress.classList.add("hidden");
  completed.classList.add("hidden");

  if (view === "idle") {
    idle.classList.remove("hidden");
  } else if (view === "progress") {
    progress.classList.remove("hidden");
    progress.classList.add("flex");
  } else if (view === "completed") {
    completed.classList.remove("hidden");
    completed.classList.add("flex");
  }

  if (window.lucide) lucide.createIcons();
}

// Timer
function startElapsedTimer() {
  startTime = Date.now();
  const timerEl = document.getElementById("elapsedTimer");
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
}

function stopElapsedTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

// Log message to terminal view
function logToTerminal(msg) {
  const term = document.getElementById("logTerminal");
  if (!term) return;
  const row = document.createElement("div");
  row.innerText = `> ${msg}`;
  term.appendChild(row);
  term.scrollTop = term.scrollHeight;
}

// Toggle Visual Media Selection styling
function updateMediaSelection() {
  const mediaType = document.querySelector('input[name="mediaType"]:checked')?.value || "pictures";
  const optPic = document.getElementById("mediaOptPictures");
  const optVid = document.getElementById("mediaOptVideos");

  if (mediaType === "pictures") {
    optPic.className = "flex items-start gap-3 p-2.5 rounded-xl border border-indigo-500/50 bg-indigo-950/20 cursor-pointer hover:border-indigo-400 transition";
    optVid.className = "flex items-start gap-3 p-2.5 rounded-xl border border-slate-800 bg-[#0e1422] cursor-pointer hover:border-indigo-500/50 transition";
  } else {
    optPic.className = "flex items-start gap-3 p-2.5 rounded-xl border border-slate-800 bg-[#0e1422] cursor-pointer hover:border-indigo-500/50 transition";
    optVid.className = "flex items-start gap-3 p-2.5 rounded-xl border border-cyan-500/50 bg-cyan-950/20 cursor-pointer hover:border-cyan-400 transition";
  }
}

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (window.lucide) lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// Toggle YouTube Options Panel
function toggleYouTubePanel() {
  const check = document.getElementById("ytUploadCheck");
  const panel = document.getElementById("ytConfigPanel");
  if (!panel || !check) return;
  if (check.checked) {
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

// Copy YouTube Watch Link
let currentYouTubeUrl = "";
async function copyYouTubeLink() {
  if (!currentYouTubeUrl) return;
  try {
    await navigator.clipboard.writeText(currentYouTubeUrl);
    const textEl = document.getElementById("ytCopyText");
    if (textEl) {
      textEl.innerText = "Copied! ✓";
      setTimeout(() => { textEl.innerText = "Copy Link"; }, 2000);
    }
  } catch (err) {
    prompt("Copy YouTube link:", currentYouTubeUrl);
  }
}

// =====================================================================
// 📺 MULTI-USER YOUTUBE OAUTH CLIENT
// =====================================================================

function getOrCreateSessionId() {
  let sid = localStorage.getItem("docu_user_session");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    localStorage.setItem("docu_user_session", sid);
  }
  return sid;
}

async function checkUserYouTubeStatus() {
  if (!backendUrl) return;
  const sid = getOrCreateSessionId();
  try {
    const res = await fetch(`${backendUrl}/api/youtube/user-status?session_id=${encodeURIComponent(sid)}`);
    if (res.ok) {
      const data = await res.json();
      updateChannelUI(data);
    }
  } catch (e) {
    console.warn("YouTube channel check error:", e);
  }
}

function updateChannelUI(data) {
  const titleEl = document.getElementById("ytChannelTitle");
  const subEl = document.getElementById("ytChannelSub");
  const avatarEl = document.getElementById("ytChannelAvatar");
  const connectBtn = document.getElementById("ytConnectBtn");
  const disconnectBtn = document.getElementById("ytDisconnectBtn");

  // Header Elements
  const headerGoogleBtn = document.getElementById("headerGoogleBtn");
  const headerChannelPill = document.getElementById("headerChannelPill");
  const headerChannelName = document.getElementById("headerChannelName");
  const headerChannelAvatar = document.getElementById("headerChannelAvatar");

  const googleIconSvg = `
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  `;

  if (data && data.connected) {
    if (titleEl) {
      titleEl.innerText = data.channel_title || "My YouTube Channel";
    }
    if (subEl) {
      subEl.innerText = data.is_custom_user 
        ? "Personal Channel Linked (Ready to Upload 🚀)" 
        : "Default Server Channel Active";
    }
    if (avatarEl) {
      if (data.channel_thumbnail) {
        avatarEl.innerHTML = `<img src="${data.channel_thumbnail}" class="w-full h-full object-cover rounded-full" alt="Channel Avatar"/>`;
      } else {
        avatarEl.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>`;
      }
    }

    if (data.is_custom_user) {
      if (connectBtn) connectBtn.classList.add("hidden");
      if (disconnectBtn) disconnectBtn.classList.remove("hidden");

      // Update Header
      if (headerGoogleBtn) headerGoogleBtn.classList.add("hidden");
      if (headerChannelPill) {
        headerChannelPill.classList.remove("hidden");
        headerChannelPill.classList.add("flex");
      }
      if (headerChannelName) headerChannelName.innerText = data.channel_title || "Channel";
      if (headerChannelAvatar) {
        if (data.channel_thumbnail) {
          headerChannelAvatar.innerHTML = `<img src="${data.channel_thumbnail}" class="w-full h-full object-cover rounded-full" alt="avatar"/>`;
        } else {
          headerChannelAvatar.innerHTML = `<i data-lucide="youtube" class="w-3 h-3 text-red-500"></i>`;
        }
      }
    } else {
      if (connectBtn) {
        connectBtn.classList.remove("hidden");
        connectBtn.innerHTML = `${googleIconSvg}<span>Link Your Google Account</span>`;
      }
      if (disconnectBtn) disconnectBtn.classList.add("hidden");
      if (headerGoogleBtn) headerGoogleBtn.classList.remove("hidden");
      if (headerChannelPill) {
        headerChannelPill.classList.add("hidden");
        headerChannelPill.classList.remove("flex");
      }
    }
  } else {
    if (titleEl) titleEl.innerText = "No Personal Channel Connected";
    if (subEl) subEl.innerText = "Click 'Login with Google' to connect your YouTube";
    if (avatarEl) {
      avatarEl.innerHTML = `<i data-lucide="youtube" class="w-5 h-5 text-red-500"></i>`;
    }
    if (connectBtn) {
      connectBtn.classList.remove("hidden");
      connectBtn.innerHTML = `${googleIconSvg}<span>Login with Google</span>`;
    }
    if (disconnectBtn) disconnectBtn.classList.add("hidden");

    if (headerGoogleBtn) headerGoogleBtn.classList.remove("hidden");
    if (headerChannelPill) {
      headerChannelPill.classList.add("hidden");
      headerChannelPill.classList.remove("flex");
    }
  }
  if (window.lucide) lucide.createIcons();
}

function openYouTubeLoginModal() {
  if (!backendUrl) {
    alert("⚠️ Barah-e-karam pehle upar apna Colab URL daal kar 'Connect & Test' button dabayein!");
    return;
  }
  const modal = document.getElementById("ytLoginModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    const msg = document.getElementById("ytAuthModalMsg");
    if (msg) msg.classList.add("hidden");
    const input = document.getElementById("ytAuthCodeInput");
    if (input) input.value = "";
    if (window.lucide) lucide.createIcons();
  }
}

function closeYouTubeLoginModal() {
  const modal = document.getElementById("ytLoginModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

let authPollTimer = null;

async function continueWithGoogle() {
  if (!backendUrl) {
    alert("⚠️ Barah-e-karam pehle upar apna Colab URL daal kar 'Connect & Test' button dabayein!");
    return;
  }

  const sid = getOrCreateSessionId();
  const btn = document.getElementById("ytStartAuthBtn");
  const btnText = document.getElementById("ytStartAuthBtnText");
  const msg = document.getElementById("ytAuthModalMsg");

  if (btn) btn.disabled = true;
  if (btnText) btnText.innerText = "Opening Google Sign-in...";

  // Automatically determine clean redirect URI (exact domain origin)
  const currentRedirectUri = window.location.origin;

  try {
    const res = await fetch(`${backendUrl}/api/youtube/auth-url?session_id=${encodeURIComponent(sid)}&redirect_uri=${encodeURIComponent(currentRedirectUri)}`);
    if (!res.ok) {
      throw new Error(`Colab returned error (${res.status})`);
    }
    const data = await res.json();
    if (!data.auth_url) {
      throw new Error("No authorization URL returned from server.");
    }

    if (data.code_verifier) {
      localStorage.setItem("docu_pending_verifier", data.code_verifier);
    }

    if (msg) {
      msg.className = "text-xs p-3.5 rounded-xl border bg-indigo-950/40 border-indigo-500/40 text-indigo-200 leading-relaxed";
      msg.innerHTML = `
        <div class="flex items-center gap-2 font-bold mb-1 text-white">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Google Window khul chuki hai...</span>
        </div>
        1. Apna YouTube Channel wala account select karein aur <strong>Allow</strong> karein.<br>
        2. Agar <em>"Google hasn't verified this app"</em> aaye to <strong>Advanced &gt; Go to DocuCraft (unsafe)</strong> select karein.<br>
        <span class="text-emerald-300 font-semibold mt-1 block">✨ Allow karte hi aapka channel automatically link ho jayega!</span>
      `;
      msg.classList.remove("hidden");
    }

    // Save session in localStorage for matching
    localStorage.setItem("docu_pending_auth_sid", sid);
    localStorage.setItem("docu_pending_auth_redirect", currentRedirectUri);

    // Open popup
    const popup = window.open(data.auth_url, "google_oauth_popup", "width=550,height=680,menubar=no,status=no");

    // If popup blocked or failed, fall back to redirecting current window
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = data.auth_url;
      return;
    }

    // Poll popup for completion
    if (authPollTimer) clearInterval(authPollTimer);
    authPollTimer = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(authPollTimer);
          if (btn) btn.disabled = false;
          if (btnText) btnText.innerText = "Continue with Google (چینل سلیکٹ کریں)";
          return;
        }

        let popupUrl = "";
        try {
          popupUrl = popup.location.href;
        } catch (crossOriginErr) {
          // Cross-origin while on accounts.google.com
        }

        if (popupUrl && popupUrl.includes("code=")) {
          clearInterval(authPollTimer);
          popup.close();
          const parsed = new URL(popupUrl);
          const c = parsed.searchParams.get("code");
          if (c) {
            await handleAutoConnectFromCode(c);
          }
        }
      } catch (e) {}
    }, 600);

  } catch (err) {
    if (msg) {
      msg.className = "text-xs p-3 rounded-xl border bg-red-950/40 border-red-500/40 text-red-200";
      msg.innerText = `❌ Error: ${err.message}`;
      msg.classList.remove("hidden");
    }
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerText = "Continue with Google (چینل سلیکٹ کریں)";
  }
}

async function handleAutoConnectFromCode(code) {
  const sid = localStorage.getItem("docu_pending_auth_sid") || getOrCreateSessionId();
  const currentRedirectUri = localStorage.getItem("docu_pending_auth_redirect") || window.location.origin;

  openYouTubeLoginModal();
  const msg = document.getElementById("ytAuthModalMsg");
  const btn = document.getElementById("ytStartAuthBtn");
  const btnText = document.getElementById("ytStartAuthBtnText");

  if (btn) btn.disabled = true;
  if (btnText) btnText.innerText = "Connecting Channel...";

  if (msg) {
    msg.className = "text-xs p-3.5 rounded-xl border bg-indigo-950/40 border-indigo-500/40 text-indigo-200 font-semibold";
    msg.innerHTML = `🔄 <strong>Google verify ho gaya hai!</strong> Channel connect ho raha hai, barah-e-karam intezar karein...`;
    msg.classList.remove("hidden");
  }

  try {
    const verifier = localStorage.getItem("docu_pending_verifier") || "";

    const res = await fetch(`${backendUrl}/api/youtube/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sid,
        code: code,
        redirect_uri: currentRedirectUri,
        code_verifier: verifier
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || `Server error ${res.status}`);
    }

    localStorage.removeItem("docu_pending_verifier");

    if (msg) {
      msg.className = "text-xs p-3.5 rounded-xl border bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-semibold";
      msg.innerHTML = `🎉 <strong>Mubarak!</strong> Channel <strong>${data.channel_title}</strong> kamyabi se connect ho gaya hai!`;
      msg.classList.remove("hidden");
    }

    logToTerminal(`✅ YouTube Channel Connected: ${data.channel_title}`);
    await checkUserYouTubeStatus();

    // Clean address bar URL so code is not accidentally reused
    window.history.replaceState({}, document.title, window.location.pathname);

    setTimeout(() => {
      closeYouTubeLoginModal();
    }, 1800);

  } catch (err) {
    if (msg) {
      msg.className = "text-xs p-3 rounded-xl border bg-red-950/40 border-red-500/40 text-red-200";
      msg.innerHTML = `❌ <strong>Verification failed:</strong> ${err.message}`;
      msg.classList.remove("hidden");
    }
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerText = "Continue with Google (چینل سلیکٹ کریں)";
    if (window.lucide) lucide.createIcons();
  }
}

async function disconnectYouTubeChannel() {
  if (!confirm("Kya aap waqai apna YouTube channel logout / disconnect karna chahte hain?")) {
    return;
  }
  const sid = getOrCreateSessionId();
  try {
    if (backendUrl) {
      await fetch(`${backendUrl}/api/youtube/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid })
      });
    }
    await checkUserYouTubeStatus();
    logToTerminal("ℹ️ Personal YouTube Channel disconnected.");
  } catch (e) {
    console.error("Disconnect error:", e);
  }
}


