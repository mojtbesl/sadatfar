const form = document.getElementById("lecture-form");
const message = document.getElementById("form-message");
const listRoot = document.getElementById("admin-lecture-list");

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderAdminList() {
  const lectures = window.lectureStore.getLectures();
  listRoot.innerHTML = "";

  if (lectures.length === 0) {
    listRoot.innerHTML = "<p>هنوز جلسه ای ثبت نشده است.</p>";
    return;
  }

  lectures.forEach((lecture) => {
    const wrapper = document.createElement("article");
    wrapper.className = "admin-item";

    const title = document.createElement("h3");
    title.textContent = lecture.title;

    const meta = document.createElement("p");
    meta.className = "admin-item-meta";
    meta.textContent = `${lecture.collection} | ${lecture.topic} | جلسه ${lecture.sessionNumber}`;

    const details = document.createElement("p");
    details.className = "admin-item-meta";
    details.textContent = `${lecture.date || "تاریخ نامشخص"} | ${lecture.location || "مکان نامشخص"} | ${lecture.duration}`;

    const linksRow = document.createElement("div");
    linksRow.className = "admin-links";

    if (lecture.audio) {
      const audioLink = document.createElement("a");
      audioLink.href = lecture.audio;
      audioLink.target = "_blank";
      audioLink.rel = "noopener noreferrer";
      audioLink.textContent = "لینک صوت";
      linksRow.appendChild(audioLink);
    } else {
      const noAudio = document.createElement("span");
      noAudio.className = "audio-missing";
      noAudio.textContent = "صوت ثبت نشده";
      linksRow.appendChild(noAudio);
    }

    const pageLink = document.createElement("a");
    pageLink.href = `lecture.html?id=${encodeURIComponent(lecture.id)}`;
    pageLink.textContent = "صفحه جلسه";
    linksRow.appendChild(pageLink);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "حذف";

    deleteBtn.addEventListener("click", () => {
      window.lectureStore.removeLecture(lecture.id);
      renderAdminList();
    });

    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    wrapper.appendChild(details);
    wrapper.appendChild(linksRow);
    wrapper.appendChild(deleteBtn);

    listRoot.appendChild(wrapper);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";

  const formData = new FormData(form);
  const collection = String(formData.get("collection") || "").trim();
  const topic = String(formData.get("topic") || "").trim();
  const sessionNumber = Number(formData.get("sessionNumber") || 0);
  const title = String(formData.get("title") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const duration = String(formData.get("duration") || "").trim();
  const audio = String(formData.get("audio") || "").trim();
  const text = String(formData.get("text") || "").trim();

  if (audio && !isValidUrl(audio)) {
    message.textContent = "لطفا لینک معتبر برای فایل صوتی وارد کنید.";
    return;
  }

  if (sessionNumber < 1) {
    message.textContent = "شماره جلسه باید بزرگتر از صفر باشد.";
    return;
  }

  window.lectureStore.addLecture({
    collection,
    topic,
    sessionNumber,
    title,
    date,
    location,
    duration,
    audio,
    text
  });

  form.reset();
  message.textContent = "جلسه با موفقیت ثبت شد.";
  renderAdminList();
});

renderAdminList();
