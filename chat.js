const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

const STOP_WORDS = new Set([
  "و", "در", "به", "از", "که", "را", "با", "این", "آن", "برای", "است", "هست", "شد", "شود",
  "می", "یا", "تا", "هم", "بر", "اگر", "اما", "یک", "چه", "چرا", "چطور", "کدام", "های", "هایش",
  "جلسه", "سخنرانی", "حاج", "آقا", "سعادتفر"
]);

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

  const scored = ALL_CHUNKS
    .map((chunk) => ({
      chunk,
      score: scoreChunk(qTokens, chunk)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function summarizeText(text, maxLen = 300) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}...`;
}

function makeAnswer(question) {
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

function appendMessage(role, html) {
  const box = document.createElement("article");
  box.className = `chat-message ${role === "user" ? "chat-user" : "chat-bot"}`;
  box.innerHTML = html;
  chatMessages.appendChild(box);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question) return;

  appendMessage("user", `<p>${escapeHtml(question)}</p>`);

  const result = makeAnswer(question);
  const answerHtml = `<p>${escapeHtml(result.answer).replaceAll("\n", "<br />")}</p>${refsHtml(result.refs)}`;

  appendMessage("bot", answerHtml);
  chatInput.value = "";
});

appendMessage(
  "bot",
  "<p>سلام. سوال خود را بپرسید تا بر اساس متن سخنرانی ها پاسخ بدهم و رفرنس جلسه بدهم.</p>"
);
