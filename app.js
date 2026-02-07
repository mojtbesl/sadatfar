const PER_PAGE = 12;

const lecturesRoot = document.getElementById("lectures");
const template = document.getElementById("lecture-card-template");
const collectionFilter = document.getElementById("collection-filter");
const topicFilter = document.getElementById("topic-filter");
const searchInput = document.getElementById("search-input");
const resultsInfo = document.getElementById("results-info");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

const state = {
  collection: "all",
  topic: "all",
  search: "",
  page: 1
};

function getUniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))];
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function previewText(text, maxLength = 160) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function filterLectures(lectures) {
  return lectures.filter((lecture) => {
    const collectionMatch = state.collection === "all" || lecture.collection === state.collection;
    const topicMatch = state.topic === "all" || lecture.topic === state.topic;

    const searchValue = state.search.trim().toLowerCase();
    const searchMatch =
      searchValue.length === 0 ||
      lecture.title.toLowerCase().includes(searchValue) ||
      lecture.text.toLowerCase().includes(searchValue);

    return collectionMatch && topicMatch && searchMatch;
  });
}

function renderFilters(lectures) {
  const collections = getUniqueValues(lectures, "collection");
  fillSelect(collectionFilter, collections, "همه دسته ها");

  const filteredByCollection =
    state.collection === "all"
      ? lectures
      : lectures.filter((lecture) => lecture.collection === state.collection);

  const topics = getUniqueValues(filteredByCollection, "topic");
  fillSelect(topicFilter, topics, "همه موضوع ها");

  collectionFilter.value = state.collection;
  if (!topics.includes(state.topic)) {
    state.topic = "all";
  }
  topicFilter.value = state.topic;
}

function renderLectures() {
  const lectures = window.lectureStore.getLectures();
  renderFilters(lectures);

  const filtered = filterLectures(lectures);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  if (state.page > totalPages) {
    state.page = totalPages;
  }

  const start = (state.page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  lecturesRoot.innerHTML = "";

  if (pageItems.length === 0) {
    lecturesRoot.innerHTML = '<p class="card">نتیجه ای پیدا نشد.</p>';
  }

  pageItems.forEach((lecture) => {
    const card = template.content.cloneNode(true);

    card.querySelector(".card-collection").textContent = lecture.collection;
    card.querySelector(".card-topic").textContent = lecture.topic;
    card.querySelector(".card-title").textContent = lecture.title;

    const datePart = lecture.date || "تاریخ نامشخص";
    const locationPart = lecture.location || "مکان نامشخص";
    card.querySelector(".card-meta").textContent = `جلسه ${lecture.sessionNumber} | ${datePart} | ${locationPart} | ${lecture.duration}`;

    const audio = card.querySelector(".card-audio");
    const audioMissing = card.querySelector(".audio-missing");

    if (lecture.audio) {
      audio.src = lecture.audio;
      audio.hidden = false;
      audioMissing.hidden = true;
    } else {
      audio.hidden = true;
      audioMissing.hidden = false;
    }

    card.querySelector(".card-text-preview").textContent = previewText(lecture.text);

    const detailsLink = card.querySelector(".details-link");
    detailsLink.href = `lecture.html?id=${encodeURIComponent(lecture.id)}`;

    lecturesRoot.appendChild(card);
  });

  resultsInfo.textContent = `${filtered.length} جلسه پیدا شد`;
  pageInfo.textContent = `صفحه ${state.page} از ${totalPages}`;
  prevPageBtn.disabled = state.page === 1;
  nextPageBtn.disabled = state.page === totalPages;
}

collectionFilter.addEventListener("change", (event) => {
  state.collection = event.target.value;
  state.page = 1;
  renderLectures();
});

topicFilter.addEventListener("change", (event) => {
  state.topic = event.target.value;
  state.page = 1;
  renderLectures();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  state.page = 1;
  renderLectures();
});

prevPageBtn.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    renderLectures();
  }
});

nextPageBtn.addEventListener("click", () => {
  state.page += 1;
  renderLectures();
});

renderLectures();
