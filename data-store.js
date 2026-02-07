const STORAGE_KEY = "saadatfar_lectures";

const fallbackLectures = [
  {
    id: "lec-fallback-1",
    title: "شرح اسما حسنی - جلسه 1",
    date: "",
    location: "",
    collection: "اسما حسنای الهی",
    topic: "شرح اسما حسنی",
    sessionNumber: 1,
    duration: "30 دقیقه",
    audio: "",
    text: "متن نمونه"
  }
];

const seedLectures = Array.isArray(window.asmaSeedLectures) && window.asmaSeedLectures.length
  ? window.asmaSeedLectures
  : fallbackLectures;

function normalizeLecture(lecture, index) {
  return {
    id: lecture.id || `lec-${Date.now()}-${index}`,
    title: lecture.title || "بدون عنوان",
    date: lecture.date || "",
    location: lecture.location || "",
    collection: lecture.collection || "سایر",
    topic: lecture.topic || "عمومی",
    sessionNumber: Number(lecture.sessionNumber) || index + 1,
    duration: lecture.duration || "30 دقیقه",
    audio: lecture.audio || "",
    text: lecture.text || ""
  };
}

function parseLectures(raw) {
  if (!raw) {
    return seedLectures.map(normalizeLecture);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return seedLectures.map(normalizeLecture);
    }
    return parsed.map(normalizeLecture);
  } catch {
    return seedLectures.map(normalizeLecture);
  }
}

function mergeMissingSeed(lectures) {
  const normalized = lectures.map(normalizeLecture);
  const byId = new Set(normalized.map((item) => item.id));
  const byKey = new Set(
    normalized.map((item) => `${item.collection}::${item.topic}::${item.sessionNumber}`)
  );

  const merged = [...normalized];

  seedLectures.map(normalizeLecture).forEach((seed) => {
    const key = `${seed.collection}::${seed.topic}::${seed.sessionNumber}`;
    if (!byId.has(seed.id) && !byKey.has(key)) {
      merged.push(seed);
      byId.add(seed.id);
      byKey.add(key);
    }
  });

  merged.sort((a, b) => {
    if (a.collection !== b.collection) {
      return a.collection.localeCompare(b.collection, "fa");
    }
    if (a.topic !== b.topic) {
      return a.topic.localeCompare(b.topic, "fa");
    }
    return a.sessionNumber - b.sessionNumber;
  });

  return merged;
}

function readLectures() {
  return parseLectures(localStorage.getItem(STORAGE_KEY));
}

function writeLectures(lectures) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lectures));
}

function getLectures() {
  const lectures = mergeMissingSeed(readLectures());
  writeLectures(lectures);
  return lectures;
}

function addLecture(lecture) {
  const lectures = getLectures();
  const nextLecture = normalizeLecture(
    {
      id: `lec-${Date.now()}`,
      ...lecture
    },
    lectures.length
  );

  lectures.unshift(nextLecture);
  writeLectures(lectures);
  return nextLecture;
}

function getLectureById(id) {
  const lectures = getLectures();
  return lectures.find((lecture) => lecture.id === id) || null;
}

function removeLecture(id) {
  const lectures = getLectures();
  const filtered = lectures.filter((lecture) => lecture.id !== id);
  writeLectures(filtered);
  return filtered;
}

window.lectureStore = {
  getLectures,
  addLecture,
  getLectureById,
  removeLecture
};
