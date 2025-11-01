// app.js (frontend)
// By default the frontend talks to the backend proxy at /api/chat
const BACKEND_URL = window.__BACKEND_URL__ || location.origin + "/api/chat"; // will be replaced if needed

const chatEl = document.getElementById("chat");
const form = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const statusEl = document.getElementById("status");
const micToggle = document.getElementById("mic-toggle");
const ttsToggle = document.getElementById("tts-toggle");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const clearBtn = document.getElementById("clear-chats");

let controller = null;
let chatHistory = loadHistory();
let voiceEnabled = false;
let recognition = null;

renderHistory();
updateStatus("Idle");

// Utilities
function el(html, classes = []) {
  const d = document.createElement("div");
  d.classList.add("message", ...classes);
  d.innerHTML = html;
  return d;
}
function updateStatus(t) {
  statusEl.textContent = t;
}
function saveHistory() {
  localStorage.setItem("chatbotai_history_v1", JSON.stringify(chatHistory));
}
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("chatbotai_history_v1") || "[]");
  } catch (e) {
    return [];
  }
}
function scrollBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
}
function renderMarkdown(md) {
  try {
    const html = marked.parse(md);
    const c = document.createElement("div");
    c.innerHTML = html;
    c.querySelectorAll("pre code").forEach((b) => hljs.highlightElement(b));
    return c.innerHTML;
  } catch (e) {
    return md;
  }
}
function escapeHtml(s) {
  return s.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}

// Render history
function renderHistory() {
  chatEl.innerHTML = "";
  for (const item of chatHistory) {
    if (item.role === "user") {
      const fileHtml = item.file
        ? item.file.isImage
          ? `<img src="${item.file.dataUrl}" style="max-width:220px;border-radius:6px;margin-top:8px">`
          : `<div class="code-block">${escapeHtml(item.file.fileName)}</div>`
        : "";
      const m = el(
        `<div class="message-text">${escapeHtml(item.text)}</div>${fileHtml}`,
        ["user"]
      );
      chatEl.appendChild(m);
    } else {
      const m = el(
        `<div class="message-text">${renderMarkdown(item.text)}</div>`,
        ["bot"]
      );
      chatEl.appendChild(m);
    }
  }
  scrollBottom();
}

// Voice & TTS
ttsToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  ttsToggle.textContent = voiceEnabled ? "🔊" : "🔈";
});
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (e) => {
    promptInput.value = e.results[0][0].transcript;
    promptInput.focus();
  };
  micToggle.addEventListener("click", () => {
    try {
      recognition.start();
      micToggle.textContent = "🎙️";
    } catch (e) {}
  });
} else {
  micToggle.style.opacity = 0.5;
  micToggle.title = "Voice input not supported";
}

// Attach file
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const isImage = f.type.startsWith("image/");
  const dataUrl = await fileToDataURL(f);
  promptInput.value = `(attached file: ${f.name})`;
  promptInput._attached = {
    fileName: f.name,
    dataUrl,
    mime_type: f.type,
    isImage,
  };
});

// Submit
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const text = promptInput.value?.trim();
  if (!text) return;
  if (document.body.classList.contains("bot-responding")) return;
  const fileObj = promptInput._attached || null;
  chatHistory.push({ role: "user", text, file: fileObj });
  saveHistory();
  renderHistory();
  promptInput.value = "";
  promptInput._attached = null;
  document.body.classList.add("bot-responding");
  updateStatus("Generating...");
  const botPlaceholder = appendBotPlaceholder("…thinking");
  try {
    await generateResponse(text, fileObj, botPlaceholder);
    updateStatus("Idle");
  } catch (err) {
    console.error(err);
    botPlaceholder.querySelector(".message-text").textContent =
      err.message || String(err);
    botPlaceholder.classList.remove("loading");
    botPlaceholder.querySelector(".message-text").classList.add("error");
    updateStatus("Error");
  } finally {
    document.body.classList.remove("bot-responding");
  }
});

function appendBotPlaceholder(initial = "…") {
  const m = el(`<div class="message-text">${escapeHtml(initial)}</div>`, [
    "bot",
    "loading",
  ]);
  chatEl.appendChild(m);
  scrollBottom();
  return m;
}

async function generateResponse(userText, fileObj, botPlaceholder) {
  controller?.abort();
  controller = new AbortController();
  const parts = [{ text: userText }];
  if (fileObj && fileObj.dataUrl) {
    const base64 = fileObj.dataUrl.split(",")[1];
    parts.push({
      inline_data: {
        mime_type: fileObj.mime_type,
        data: base64,
        fileName: fileObj.fileName,
        isImage: fileObj.isImage,
      },
    });
  }
  const payload = { contents: [{ role: "user", parts }] };
  const resp = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  if (!resp.ok) {
    const errBody = await safeJson(resp);
    throw new Error(
      errBody?.error?.message || `${resp.status} ${resp.statusText}`
    );
  }
  const json = await resp.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(json);
  await waitTypeEffect(botPlaceholder.querySelector(".message-text"), text);
  botPlaceholder.classList.remove("loading");
  botPlaceholder.querySelector(".message-text").innerHTML =
    renderMarkdown(text);
  chatHistory.push({ role: "model", text });
  saveHistory();
  return text;
}

async function waitTypeEffect(el, text) {
  return new Promise((res) => {
    el.textContent = "";
    const words = text.split(/(\s+)/);
    let i = 0;
    const t = setInterval(() => {
      el.textContent += words[i++] ?? "";
      scrollBottom();
      if (i >= words.length) {
        clearInterval(t);
        res();
      }
    }, 18);
  });
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch (e) {
    return null;
  }
}

// Clear chats
clearBtn.addEventListener("click", () => {
  if (!confirm("Clear chat history?")) return;
  chatHistory = [];
  saveHistory();
  renderHistory();
  updateStatus("Idle");
});

// initial focus handling
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
// expose for debug
window.__chatbotai = { chatHistory, BACKEND_URL };
renderHistory();
