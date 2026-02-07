const lectureRoot = document.getElementById("lecture-page");

function getLectureIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderNotFound() {
  lectureRoot.innerHTML = "<p>جلسه موردنظر پیدا نشد.</p>";
}

function renderLecture() {
  const id = getLectureIdFromQuery();
  if (!id) {
    renderNotFound();
    return;
  }

  const lecture = window.lectureStore.getLectureById(id);
  if (!lecture) {
    renderNotFound();
    return;
  }

  lectureRoot.innerHTML = "";

  const chipRow = document.createElement("div");
  chipRow.className = "chip-row";

  const collectionChip = document.createElement("span");
  collectionChip.className = "chip chip-primary";
  collectionChip.textContent = lecture.collection;

  const topicChip = document.createElement("span");
  topicChip.className = "chip";
  topicChip.textContent = lecture.topic;

  chipRow.appendChild(collectionChip);
  chipRow.appendChild(topicChip);

  const title = document.createElement("h1");
  title.className = "lecture-title";
  title.textContent = lecture.title;

  const meta = document.createElement("p");
  meta.className = "card-meta";
  const datePart = lecture.date || "تاریخ نامشخص";
  const locationPart = lecture.location || "مکان نامشخص";
  meta.textContent = `جلسه ${lecture.sessionNumber} | ${datePart} | ${locationPart} | ${lecture.duration}`;

  lectureRoot.appendChild(chipRow);
  lectureRoot.appendChild(title);
  lectureRoot.appendChild(meta);

  if (lecture.audio) {
    const audio = document.createElement("audio");
    audio.className = "card-audio";
    audio.controls = true;
    audio.preload = "none";
    audio.src = lecture.audio;
    lectureRoot.appendChild(audio);
  } else {
    const noAudio = document.createElement("p");
    noAudio.className = "audio-missing";
    noAudio.textContent = "لینک صوت هنوز ثبت نشده است.";
    lectureRoot.appendChild(noAudio);
  }

  const text = document.createElement("div");
  text.className = "lecture-full-text";
  text.textContent = lecture.text;

  lectureRoot.appendChild(text);
}

renderLecture();
