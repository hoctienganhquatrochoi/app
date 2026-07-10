var state = {
  selectedClassId: DATA.classes[0].id,
  openSubjectId: null,
  openUnitId: null,
  selectedActivity: null
};

function getSelectedClass() {
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (DATA.classes[i].id === state.selectedClassId) {
      return DATA.classes[i];
    }
  }
  return DATA.classes[0];
}

function renderSidebar() {
  var sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  var select = document.createElement("select");
  select.className = "class-select";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    var opt = document.createElement("option");
    opt.value = DATA.classes[i].id;
    opt.text = DATA.classes[i].name;
    if (DATA.classes[i].id === state.selectedClassId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }
  select.addEventListener("change", function (e) {
    state.selectedClassId = e.target.value;
    state.openSubjectId = null;
    state.openUnitId = null;
    renderSidebar();
  });
  sidebar.appendChild(select);

  var subjects = DATA.subjectsByClass[state.selectedClassId] || [];
  for (i = 0; i < subjects.length; i++) {
    sidebar.appendChild(buildSubjectItem(subjects[i]));
  }
}

function buildSubjectItem(subject) {
  var wrap = document.createElement("div");
  wrap.className = "subject-item";

  var isOpen = state.openSubjectId === subject.id;

  var header = document.createElement("div");
  header.className = "subject-header" + (isOpen ? " open" : "");

  var icon = document.createElement("span");
  icon.className = "subject-icon";
  icon.style.background = subject.color;
  header.appendChild(icon);

  var name = document.createElement("span");
  name.className = "subject-name";
  name.textContent = subject.name;
  header.appendChild(name);

  var chevron = document.createElement("span");
  chevron.className = "chevron" + (isOpen ? " open" : "");
  chevron.textContent = "▸";
  header.appendChild(chevron);

  header.addEventListener("click", function () {
    state.openSubjectId = isOpen ? null : subject.id;
    state.openUnitId = null;
    renderSidebar();
  });

  wrap.appendChild(header);

  if (isOpen) {
    var unitList = document.createElement("div");
    unitList.className = "unit-list";
    var i;
    for (i = 0; i < subject.units.length; i++) {
      unitList.appendChild(buildUnitItem(subject.units[i]));
    }
    wrap.appendChild(unitList);
  }

  return wrap;
}

function buildUnitItem(unit) {
  var wrap = document.createElement("div");
  wrap.className = "unit-item";

  var isOpen = state.openUnitId === unit.id;

  var header = document.createElement("div");
  header.className = "unit-header" + (isOpen ? " open" : "");

  var name = document.createElement("span");
  name.className = "unit-name";
  name.textContent = unit.name;
  header.appendChild(name);

  var progress = document.createElement("span");
  progress.className = "unit-progress";
  progress.textContent = unit.progress;
  header.appendChild(progress);

  header.addEventListener("click", function () {
    state.openUnitId = isOpen ? null : unit.id;
    renderSidebar();
  });

  wrap.appendChild(header);

  if (isOpen) {
    var list = document.createElement("div");
    list.className = "activity-list";
    var i;
    for (i = 0; i < unit.activities.length; i++) {
      list.appendChild(buildActivityItem(unit, unit.activities[i]));
    }
    wrap.appendChild(list);
  }

  return wrap;
}

function buildActivityItem(unit, activity) {
  var item = document.createElement("div");
  var isSelected = state.selectedActivity && state.selectedActivity.activity.id === activity.id;
  var classes = "activity-item";
  if (isSelected) {
    classes += " selected";
  }
  if (activity.locked) {
    classes += " locked";
  }
  item.className = classes;

  var label = document.createElement("span");
  label.textContent = activity.name;
  item.appendChild(label);

  if (activity.locked) {
    var badge = document.createElement("span");
    badge.className = "lock-badge";
    badge.textContent = "🔒";
    item.appendChild(badge);
  }

  item.addEventListener("click", function () {
    if (activity.locked) {
      return;
    }
    state.selectedActivity = { unit: unit, activity: activity };
    renderSidebar();
    renderMainContent();
  });

  return item;
}

var vocabActivityTypes = ["flashcard", "quiz", "missing-letter"];

async function renderMainContent() {
  var main = document.getElementById("mainContent");
  main.innerHTML = "";

  if (!state.selectedActivity) {
    var placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "Chọn một dạng bài ở menu bên trái để bắt đầu học";
    main.appendChild(placeholder);
    return;
  }

  var cls = getSelectedClass();
  var isMamNon = cls.level === "mamnon";
  var unit = state.selectedActivity.unit;
  var activity = state.selectedActivity.activity;
  var breadcrumbText = cls.name + " › " + unit.name + " › " + activity.name;

  if (vocabActivityTypes.indexOf(activity.type) !== -1) {
    var loading = document.createElement("div");
    loading.className = "placeholder";
    loading.textContent = "Đang tải nội dung...";
    main.appendChild(loading);

    var items = await loadVocabForUnit(unit.id);

    if (state.selectedActivity.activity.id !== activity.id) {
      return;
    }

    if (!items.length) {
      main.innerHTML = "";
      var empty = document.createElement("div");
      empty.className = "placeholder";
      empty.textContent = "Unit này chưa có nội dung.";
      main.appendChild(empty);
      return;
    }

    main.innerHTML = "";

    if (activity.type === "flashcard") {
      renderFlashcard(main, breadcrumbText, items);
    } else if (activity.type === "quiz") {
      renderQuiz(main, breadcrumbText, items, unit.id, activity.maxQuestions, activity.format);
    } else if (activity.type === "missing-letter") {
      renderMissingLetter(main, breadcrumbText, items, unit.id, activity.maxQuestions);
    }
    return;
  }

  var screen = document.createElement("div");
  screen.className = "play-screen" + (isMamNon ? " mamnon" : "");

  var breadcrumb = document.createElement("div");
  breadcrumb.className = "breadcrumb";
  breadcrumb.textContent = cls.name + " › " + unit.name + " › " + activity.name;
  screen.appendChild(breadcrumb);

  var title = document.createElement("h2");
  title.textContent = activity.name;
  screen.appendChild(title);

  var card = document.createElement("div");
  card.className = "play-card";
  card.textContent = "(Màn chơi \"" + activity.name + "\" sẽ hiển thị ở đây)";
  screen.appendChild(card);

  var audioBtn = document.createElement("button");
  audioBtn.className = "audio-btn";
  audioBtn.type = "button";
  audioBtn.textContent = "▶";
  screen.appendChild(audioBtn);

  main.appendChild(screen);
}

document.addEventListener("DOMContentLoaded", function () {
  renderSidebar();
  renderMainContent();
});
