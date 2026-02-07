const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const sendBtn = document.getElementById("send-btn");

const modeSelect = document.getElementById("mode-select");
const modelInput = document.getElementById("model-input");
const baseUrlInput = document.getElementById("base-url-input");
const apiKeyInput = document.getElementById("api-key-input");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const settingsStatus = document.getElementById("settings-status");

const CHAT_SETTINGS_KEY = "saadatfar_chat_settings";

const STOP_WORDS = new Set([
  "و", "در", "به", "از", "که", "را", "با", "این", "آن", "برای", "است", "هست", "شد", "شود",
  "می", "یا", "تا", "هم", "بر", "اگر", "اما", "یک", "چه", "چرا", "چطور", "کدام", "های", "هایش",
  "جلسه", "سخنرانی", "حاج", "آقا", "سعادتفر"
]);

const chatHistory = [];

function getSettings() {
  try {
    const raw = localStorage.getItem(CHAT_SETTINGS_KEY);
    if (!raw) {
      return {
        mode: "ai",
        model: "openai/gpt-4o-mini",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: ""
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      mode: "ai",
      model: "openai/gpt-4o-mini",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: ""
    };
  }
}

function saveSettings(settings) {
  localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
}

function applySettingsToForm(settings) {
  modeSelect.value = settings.mode || "ai";
  modelInput.value = settings.model || "openai/gpt-4o-mini";
  baseUrlInput.value = settings.baseUrl || "https://openrouter.ai/api/v1";
  apiKeyInput.value = settings.apiKey || "";
}

function readSettingsFromForm() {
  return {
    mode: modeSelect.value,
    model: modelInput.value.trim(),
    baseUrl: baseUrlInput.value.trim().replace(/\/$/, ""),
    apiKey: apiKeyInput.value.trim()
  };
}

function setStatus(text, isError = false) {
  settingsStatus.textContent = text;
  settingsStatus.style.color = isError ? "#b91c1c" : "#0f766e";
}

function normalizeText(text) {
  return String(text || "")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 50);
}

function buildChunks() {
  const lectures = window.lectureStore.getLectures();
  const chunks = [];

  lectures.forEach((lecture) => {
    const paragraphs = splitParagraphs(lecture.text);
    paragraphs.forEach((paragraph, index) => {
      chunks.push({
        id: `${lecture.id}-p-${index + 1}`,
        lectureId: lecture.id,
        lectureTitle: lecture.title,
        lectureSession: lecture.sessionNumber,
        paragraph,
        tokens: tokenize(paragraph)
      });
    });
  });

  return chunks;
}

const ALL_CHUNKS = buildChunks();

function scoreChunk(questionTokens, chunk) {
  if (!questionTokens.length || !chunk.tokens.length) {
    return 0;
  }

  const chunkTokenSet = new Set(chunk.tokens);
  let overlap = 0;

  questionTokens.forEach((token) => {
    if (chunkTokenSet.has(token)) {
      overlap += 1;
    }
  });

  const overlapRatio = overlap / Math.max(questionTokens.length, 1);
  const densityBoost = overlap / Math.max(chunk.tokens.length, 20);

  return overlapRatio * 0.85 + densityBoost * 0.15;
}

function pickTopChunks(question, limit = 4) {
  const qTokens = tokenize(question);

  return ALL_CHUNKS
    .map((chunk) => ({ chunk, score: scoreChunk(qTokens, chunk) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function summarizeText(text, maxLen = 300) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}...`;
}

function makeLocalAnswer(question) {
  const top = pickTopChunks(question);

  if (!top.length) {
    return {
      answer: "در متن سخنرانی های موجود، پاسخ دقیقی برای این سوال پیدا نشد. لطفا سوال را جزئی تر بپرسید.",
      refs: []
    };
  }

  const best = top[0].chunk;
  const support = top.slice(1, 3).map((item) => item.chunk.paragraph);

  let answer = summarizeText(best.paragraph, 420);
  if (support.length) {
    answer += "\n\nنکات تکمیلی از جلسات مرتبط:\n";
    support.forEach((p) => {
      answer += `- ${summarizeText(p, 180)}\n`;
    });
  }

  const refs = top.map((item) => ({
    lectureId: item.chunk.lectureId,
    lectureTitle: item.chunk.lectureTitle,
    sessionNumber: item.chunk.lectureSession,
    excerpt: summarizeText(item.chunk.paragraph, 170)
  }));

  return { answer, refs };
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function refsHtml(refs) {
  if (!refs.length) return "";

  const items = refs
    .map((ref) => {
      const link = `lecture.html?id=${encodeURIComponent(ref.lectureId)}`;
      return `<li><a href="${link}">${escapeHtml(ref.lectureTitle)} (جلسه ${ref.sessionNumber})</a><p>${escapeHtml(ref.excerpt)}</p></li>`;
    })
    .join("");

  return `<div class="chat-refs"><h3>منابع پاسخ</h3><ul>${items}</ul></div>`;
}

function appendMessage(role, html) {
  const box = document.createElement("article");
  box.className = `chat-message ${role === "user" ? "chat-user" : "chat-bot"}`;
  box.innerHTML = html;
  chatMessages.appendChild(box);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setSending(isSending) {
  sendBtn.disabled = isSending;
  sendBtn.textContent = isSending ? "در حال پاسخ..." : "ارسال سوال";
}

async function askLLM(question, refs, settings) {
  const contextLines = refs.length
    ? refs.map((ref, index) => `${index + 1}) ${ref.lectureTitle} | ${ref.excerpt}`).join("\n")
    : "منبع مرتبطی پیدا نشد.";

  const history = chatHistory.slice(-8).map((item) => ({ role: item.role, content: item.content }));

  const systemPrompt = [
    "تو دستیار سایت سخنرانی های حاج آقای سعادتفر هستی.",
    "فقط بر اساس متن منابع داده شده پاسخ بده.",
    "اگر اطلاعات کافی نیست، صادقانه بگو اطلاعات کافی در منابع فعلی نیست.",
    "پاسخ را فارسی، شفاف، محاوره ای و کوتاه-متوسط بده.",
    "در پایان پاسخ اگر ممکن بود به شماره منبع ها مثل [منبع 1] اشاره کن."
  ].join(" ");

  const userPrompt = `سوال کاربر:\n${question}\n\nمنابع بازیابی شده:\n${contextLines}`;

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("پاسخ معتبری از مدل دریافت نشد.");
  }

  return content;
}

saveSettingsBtn.addEventListener("click", () => {
  const settings = readSettingsFromForm();
  saveSettings(settings);
  setStatus("تنظیمات ذخیره شد.");
});

clearChatBtn.addEventListener("click", () => {
  chatMessages.innerHTML = "";
  chatHistory.length = 0;
  appendMessage("bot", "<p>گفتگو پاک شد. سوال جدیدت را بپرس.</p>");
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question) return;

  const settings = readSettingsFromForm();
  appendMessage("user", `<p>${escapeHtml(question)}</p>`);
  chatHistory.push({ role: "user", content: question });

  const local = makeLocalAnswer(question);
  let answerText = local.answer;

  setSending(true);

  if (settings.mode === "ai") {
    if (!settings.apiKey) {
      appendMessage("bot", "<p>برای حالت هوشمند، API Key را در تنظیمات وارد کن. فعلا پاسخ محلی نمایش داده شد.</p>" + refsHtml(local.refs));
      chatHistory.push({ role: "assistant", content: local.answer });
      chatInput.value = "";
      setSending(false);
      return;
    }

    try {
      answerText = await askLLM(question, local.refs, settings);
    } catch (error) {
      const errMsg = String(error?.message || "").slice(0, 220);
      appendMessage("bot", `<p>خطا در اتصال به مدل: ${escapeHtml(errMsg)}<br />فعلا پاسخ محلی نمایش داده شد.</p>${refsHtml(local.refs)}`);
      chatHistory.push({ role: "assistant", content: local.answer });
      chatInput.value = "";
      setSending(false);
      return;
    }
  }

  appendMessage("bot", `<p>${escapeHtml(answerText).replaceAll("\n", "<br />")}</p>${refsHtml(local.refs)}`);
  chatHistory.push({ role: "assistant", content: answerText });

  chatInput.value = "";
  setSending(false);
});

const saved = getSettings();
applySettingsToForm(saved);

appendMessage(
  "bot",
  "<p>سلام. اگر می خواهی مثل ChatGPT پاسخ بگیر، حالت هوشمند را فعال کن، API Key بده و سوالت را بپرس.</p>"
);
