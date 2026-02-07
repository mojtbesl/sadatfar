function initAdminPanel() {
  const form = document.getElementById("lecture-form");
  const message = document.getElementById("form-message");
  const listRoot = document.getElementById("admin-lecture-list");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  if (!form || !message || !listRoot || !submitBtn || !cancelEditBtn) {
    return;
  }

  function isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function setFormMode(mode) {
    const isEdit = mode === "edit";
    submitBtn.textContent = isEdit ? "ذخیره تغییرات" : "ثبت سخنرانی";
    cancelEditBtn.hidden = !isEdit;
  }

  function clearForm() {
    form.reset();
    form.elements.editId.value = "";
    form.elements.duration.value = "30 دقیقه";
    setFormMode("create");
  }

  function fillFormForEdit(lecture) {
    form.elements.editId.value = lecture.id;
    form.elements.collection.value = lecture.collection;
    form.elements.topic.value = lecture.topic;
    form.elements.sessionNumber.value = lecture.sessionNumber;
    form.elements.title.value = lecture.title;
    form.elements.date.value = lecture.date || "";
    form.elements.location.value = lecture.location || "";
    form.elements.duration.value = lecture.duration || "30 دقیقه";
    form.elements.audio.value = lecture.audio || "";
    form.elements.text.value = lecture.text || "";

    setFormMode("edit");
    message.textContent = "در حال ویرایش جلسه";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
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

      const actions = document.createElement("div");
      actions.className = "admin-item-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "secondary-btn";
      editBtn.textContent = "ویرایش";

      editBtn.addEventListener("click", () => {
        fillFormForEdit(lecture);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "danger-btn";
      deleteBtn.textContent = "حذف";

      deleteBtn.addEventListener("click", () => {
        window.lectureStore.removeLecture(lecture.id);
        if (form.elements.editId.value === lecture.id) {
          clearForm();
        }
        renderAdminList();
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      wrapper.appendChild(title);
      wrapper.appendChild(meta);
      wrapper.appendChild(details);
      wrapper.appendChild(linksRow);
      wrapper.appendChild(actions);

      listRoot.appendChild(wrapper);
    });
  }

  cancelEditBtn.addEventListener("click", () => {
    message.textContent = "";
    clearForm();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.textContent = "";

    const formData = new FormData(form);
    const editId = String(formData.get("editId") || "").trim();
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

    const payload = {
      collection,
      topic,
      sessionNumber,
      title,
      date,
      location,
      duration,
      audio,
      text
    };

    if (editId) {
      const updated = window.lectureStore.updateLecture(editId, payload);
      if (!updated) {
        message.textContent = "جلسه برای ویرایش پیدا نشد.";
        return;
      }

      message.textContent = "جلسه با موفقیت ویرایش شد.";
    } else {
      window.lectureStore.addLecture(payload);
      message.textContent = "جلسه با موفقیت ثبت شد.";
    }

    clearForm();
    renderAdminList();
  });

  setFormMode("create");
  renderAdminList();
}

window.addEventListener("admin-authenticated", initAdminPanel);
