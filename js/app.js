var state = {
  selectedClassId: null,
  openSubjectId: null,
  openUnitId: null,
  selectedActivity: null
};

function buildBreadcrumbText(cls, unit, activity) {
  var parts = [cls.name];
  if (unit.name) {
    parts.push(unit.name);
  }
  parts.push(activity.name);
  return parts.join(" › ");
}

function getSelectedClass() {
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (DATA.classes[i].id === state.selectedClassId) {
      return DATA.classes[i];
    }
  }
  return DATA.classes[0];
}

function findUnitById(unitId) {
  var c, s, u;
  for (c = 0; c < DATA.classes.length; c++) {
    var subjects = DATA.subjectsByClass[DATA.classes[c].id] || [];
    for (s = 0; s < subjects.length; s++) {
      for (u = 0; u < subjects[s].units.length; u++) {
        if (subjects[s].units[u].id === unitId) {
          return subjects[s].units[u];
        }
      }
    }
  }
  return null;
}

function autoOpenFirstSubject() {
  var subjects = DATA.subjectsByClass[state.selectedClassId] || [];
  state.openSubjectId = subjects.length ? subjects[0].id : null;
  state.openUnitId = null;
}

function renderSidebar() {
  var sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  var sidebarTitle = document.createElement("div");
  sidebarTitle.className = "sidebar-title";
  sidebarTitle.textContent = "📚 Chọn bài học";
  sidebar.appendChild(sidebarTitle);

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
    autoOpenFirstSubject();
    renderSidebar();
    updateUrlHash();
  });
  sidebar.appendChild(select);

  var subjects = DATA.subjectsByClass[state.selectedClassId] || [];
  for (i = 0; i < subjects.length; i++) {
    if (subjects[i].name) {
      sidebar.appendChild(buildSubjectItem(subjects[i]));
    } else {
      sidebar.appendChild(buildUnitListForSubject(subjects[i]));
    }
  }
}

function buildUnitListForSubject(subject) {
  var unitList = document.createElement("div");
  unitList.className = "unit-list";
  var i;
  for (i = 0; i < subject.units.length; i++) {
    var unit = subject.units[i];
    if (unit.name) {
      unitList.appendChild(buildUnitItem(unit));
    } else {
      unitList.appendChild(buildFlattenedUnitActivities(unit));
    }
  }
  return unitList;
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
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen) {
    wrap.appendChild(buildUnitListForSubject(subject));
  }

  return wrap;
}

function appendActivityListItems(listEl, unit, activities, disabledIds, needsAccess) {
  var i;
  var sawOther = false;
  var sentenceDividerInserted = false;
  var grammarDividerInserted = false;
  for (i = 0; i < activities.length; i++) {
    if (disabledIds.indexOf(activities[i].id) !== -1) {
      continue;
    }
    var id = activities[i].id;
    var isSentence = id.indexOf("s") === 0;
    var isGrammar = id.indexOf("gm") === 0 || id.indexOf("gt") === 0 || id.indexOf("gx") === 0 || id.indexOf("gd") === 0;
    if (isSentence && sawOther && !sentenceDividerInserted) {
      var sentenceDivider = document.createElement("div");
      sentenceDivider.className = "activity-section-divider";
      sentenceDivider.textContent = "Luyện câu";
      listEl.appendChild(sentenceDivider);
      sentenceDividerInserted = true;
    }
    if (isGrammar && sawOther && !grammarDividerInserted) {
      var grammarDivider = document.createElement("div");
      grammarDivider.className = "activity-section-divider";
      grammarDivider.textContent = "Ngữ pháp";
      listEl.appendChild(grammarDivider);
      grammarDividerInserted = true;
    }
    if (!isSentence && !isGrammar) {
      sawOther = true;
    }
    listEl.appendChild(buildActivityItem(unit, activities[i], needsAccess));
  }
}

function buildFlattenedUnitActivities(unit) {
  if (unitDisabledActivities[unit.id] === undefined) {
    loadUnitDisabledActivities(unit.id);
  }

  var list = document.createElement("div");
  list.className = "activity-list activity-list-flat";
  var disabledIds = unitDisabledActivities[unit.id] || [];
  var activities = orderedActivitiesForUnit(unit);
  var needsAccess = !unitHasAccess(unit);
  appendActivityListItems(list, unit, activities, disabledIds, needsAccess);
  return list;
}

var unitDisabledActivities = {};
var unitActivityOrder = {};

async function loadUnitDisabledActivities(unitId) {
  var result = await supabaseClient
    .from("game_unit_settings")
    .select("disabled_activity_ids, activity_order")
    .eq("unit_id", unitId)
    .maybeSingle();

  if (result.data) {
    unitDisabledActivities[unitId] = result.data.disabled_activity_ids || [];
    unitActivityOrder[unitId] = result.data.activity_order;
  } else {
    unitDisabledActivities[unitId] = [];
    unitActivityOrder[unitId] = null;
  }
  renderSidebar();
}

function orderedActivitiesForUnit(unit) {
  var orderIds = unitActivityOrder[unit.id];
  if (!orderIds || !orderIds.length) {
    return unit.activities;
  }
  var byId = {};
  unit.activities.forEach(function (a) {
    byId[a.id] = a;
  });
  var ordered = [];
  orderIds.forEach(function (id) {
    if (byId[id]) {
      ordered.push(byId[id]);
      delete byId[id];
    }
  });
  unit.activities.forEach(function (a) {
    if (byId[a.id]) {
      ordered.push(a);
    }
  });
  return ordered;
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

  if (!unitHasAccess(unit)) {
    var lockBadge = document.createElement("span");
    lockBadge.className = "lock-badge";
    lockBadge.textContent = "🔒";
    header.appendChild(lockBadge);
  }

  var progress = document.createElement("span");
  progress.className = "unit-progress";
  progress.textContent = unit.progress;
  header.appendChild(progress);

  header.addEventListener("click", function () {
    var willOpen = !isOpen;
    state.openUnitId = willOpen ? unit.id : null;
    if (willOpen && unitDisabledActivities[unit.id] === undefined) {
      loadUnitDisabledActivities(unit.id);
    }
    renderSidebar();
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen) {
    var list = document.createElement("div");
    list.className = "activity-list";
    var disabledIds = unitDisabledActivities[unit.id] || [];
    var activities = orderedActivitiesForUnit(unit);
    var needsAccess = !unitHasAccess(unit);
    appendActivityListItems(list, unit, activities, disabledIds, needsAccess);
    wrap.appendChild(list);
  }

  return wrap;
}

function unitHasAccess(unit) {
  if (unit.is_demo) {
    return true;
  }
  if (!currentStudent) {
    return false;
  }
  if ((currentStudent.allowed_class_ids || []).indexOf(unit.class_id) !== -1) {
    return true;
  }
  return (currentStudent.assignedUnitIds || []).indexOf(unit.id) !== -1;
}

function showAccessNeededMessage() {
  if (currentStudent) {
    window.alert("🔒 Bài này chưa nằm trong gói học của em, liên hệ trung tâm để được mở thêm nhé!");
    return;
  }
  openLoginModal();
  document.getElementById("loginStatus").textContent = "🔒 Bài này cần tài khoản để học. Đăng nhập hoặc liên hệ trung tâm để được cấp tài khoản nhé!";
}

function buildActivityItem(unit, activity, needsAccess) {
  var item = document.createElement("div");
  var isSelected = state.selectedActivity && state.selectedActivity.unit.id === unit.id && state.selectedActivity.activity.id === activity.id;
  var isLocked = needsAccess || activity.locked;
  var classes = "activity-item";
  if (isSelected) {
    classes += " selected";
  }
  if (isLocked) {
    classes += " locked";
  }
  item.className = classes;

  var label = document.createElement("span");
  label.textContent = activity.name;
  item.appendChild(label);

  if (isLocked) {
    var badge = document.createElement("span");
    badge.className = "lock-badge";
    badge.textContent = "🔒";
    item.appendChild(badge);
  }

  item.addEventListener("click", function () {
    if (isLocked) {
      if (needsAccess) {
        showAccessNeededMessage();
      }
      return;
    }
    state.selectedActivity = { unit: unit, activity: activity };
    document.getElementById("sidebar").classList.remove("mobile-open");
    renderSidebar();
    renderMainContent();
    updateUrlHash();
  });

  return item;
}

var vocabActivityTypes = ["flashcard", "flip-card", "quiz", "missing-letter", "typing", "free-typing"];

async function renderMainContent() {
  var main = document.getElementById("mainContent");
  stopActiveWordwallTracker();
  main.innerHTML = "";

  if (!state.selectedActivity) {
    var placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "👈 Chọn một dạng bài ở menu bên trái để bắt đầu học";
    main.appendChild(placeholder);
    return;
  }

  var cls = getSelectedClass();
  var isMamNon = cls.level === "mamnon";
  var unit = state.selectedActivity.unit;
  var activity = state.selectedActivity.activity;
  var breadcrumbText = buildBreadcrumbText(cls, unit, activity);

  if (vocabActivityTypes.indexOf(activity.type) !== -1) {
    var loading = document.createElement("div");
    loading.className = "placeholder";
    loading.textContent = "Đang tải nội dung...";
    main.appendChild(loading);

    var items;
    if (activity.id.indexOf("s") === 0) {
      items = await loadSentencesForUnit(unit.id);
    } else {
      items = await loadVocabForUnit(unit.id);
    }

    if (!state.selectedActivity || state.selectedActivity.unit.id !== unit.id || state.selectedActivity.activity.id !== activity.id) {
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
    } else if (activity.type === "flip-card") {
      renderFlipCard(main, breadcrumbText, items, unit.id);
    } else if (activity.type === "quiz") {
      renderQuiz(main, breadcrumbText, items, unit.id, activity.maxQuestions, activity.format);
    } else if (activity.type === "missing-letter") {
      renderMissingLetter(main, breadcrumbText, items, unit.id, activity.maxQuestions);
    } else if (activity.type === "typing") {
      renderTyping(main, breadcrumbText, items, unit.id, activity.maxQuestions, activity.mode);
    } else if (activity.type === "free-typing") {
      renderFreeTyping(main, breadcrumbText, items, unit.id, activity.maxQuestions, activity.mode);
    }
    return;
  }

  if (activity.type === "speaking") {
    var speakingLoading = document.createElement("div");
    speakingLoading.className = "placeholder";
    speakingLoading.textContent = "Đang tải nội dung...";
    main.appendChild(speakingLoading);

    var testNames = await loadSpeakingTestNames(unit.id);

    if (!state.selectedActivity || state.selectedActivity.unit.id !== unit.id || state.selectedActivity.activity.id !== activity.id) {
      return;
    }

    if (!testNames.length) {
      main.innerHTML = "";
      var speakingEmpty = document.createElement("div");
      speakingEmpty.className = "placeholder";
      speakingEmpty.textContent = "Unit này chưa có nội dung.";
      main.appendChild(speakingEmpty);
      return;
    }

    if (testNames.length === 1) {
      var soloItems = await loadSpeakingForUnit(unit.id, testNames[0]);
      if (!state.selectedActivity || state.selectedActivity.unit.id !== unit.id || state.selectedActivity.activity.id !== activity.id) {
        return;
      }
      main.innerHTML = "";
      renderSpeaking(main, breadcrumbText, soloItems);
      return;
    }

    main.innerHTML = "";
    renderSpeakingTestPicker(main, breadcrumbText, unit.id, testNames);
    return;
  }

  if (activity.type === "grammar-mcq" || activity.type === "grammar-typing" || activity.type === "grammar-matching" || activity.type === "grammar-dragfill") {
    var grammarLoading = document.createElement("div");
    grammarLoading.className = "placeholder";
    grammarLoading.textContent = "Đang tải nội dung...";
    main.appendChild(grammarLoading);

    var grammarItems;
    if (activity.type === "grammar-mcq") {
      grammarItems = await loadGrammarMcqForUnit(unit.id);
    } else if (activity.type === "grammar-typing") {
      grammarItems = await loadGrammarTypingForUnit(unit.id, activity.setName);
    } else if (activity.type === "grammar-matching") {
      grammarItems = await loadGrammarMatchingForUnit(unit.id);
    } else {
      grammarItems = await loadGrammarDragfillForUnit(unit.id);
    }

    if (!state.selectedActivity || state.selectedActivity.unit.id !== unit.id || state.selectedActivity.activity.id !== activity.id) {
      return;
    }

    if (!grammarItems.length) {
      main.innerHTML = "";
      var grammarEmpty = document.createElement("div");
      grammarEmpty.className = "placeholder";
      grammarEmpty.textContent = "Unit này chưa có nội dung.";
      main.appendChild(grammarEmpty);
      return;
    }

    main.innerHTML = "";
    if (activity.type === "grammar-mcq") {
      renderGrammarMcq(main, breadcrumbText, grammarItems, unit.id);
    } else if (activity.type === "grammar-typing") {
      renderGrammarTyping(main, breadcrumbText, grammarItems, unit.id);
    } else if (activity.type === "grammar-matching") {
      renderGrammarMatching(main, breadcrumbText, grammarItems, unit.id);
    } else {
      renderGrammarDragfill(main, breadcrumbText, grammarItems, unit.id);
    }
    return;
  }

  if (activity.type === "wordwall") {
    main.innerHTML = "";
    renderWordwallActivity(main, breadcrumbText, activity.embedUrl, unit.id, activity.name);
    return;
  }

  var screen = document.createElement("div");
  screen.className = "play-screen" + (isMamNon ? " mamnon" : "");

  var breadcrumb = document.createElement("div");
  breadcrumb.className = "breadcrumb";
  breadcrumb.textContent = buildBreadcrumbText(cls, unit, activity);
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

function slugify(text) {
  var s = (text || "").toLowerCase();
  s = s.replace(/đ/g, "d");
  var combiningMarkStart = String.fromCharCode(768);
  var combiningMarkEnd = String.fromCharCode(879);
  var combiningMarkRegex = new RegExp("[" + combiningMarkStart + "-" + combiningMarkEnd + "]", "g");
  s = s.normalize("NFD").replace(combiningMarkRegex, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "x";
}

function updateUrlHash() {
  var parts = [];
  var cls = getSelectedClass();
  if (cls) {
    parts.push(slugify(cls.name));
  }
  if (state.selectedActivity) {
    parts.push(slugify(state.selectedActivity.unit.name));
    parts.push(slugify(state.selectedActivity.activity.name));
  }
  var hash = parts.length ? "#" + parts.join("/") : "";
  window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
}

function applyUrlHash() {
  var hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return false;
  }

  var parts = hash.split("/");
  var classSlug = parts[0];
  var unitSlug = parts[1];
  var activitySlug = parts[2];

  var cls = null;
  var c;
  for (c = 0; c < DATA.classes.length; c++) {
    if (slugify(DATA.classes[c].name) === classSlug) {
      cls = DATA.classes[c];
    }
  }
  if (!cls) {
    return false;
  }

  state.selectedClassId = cls.id;

  if (!unitSlug) {
    autoOpenFirstSubject();
    return true;
  }

  var subjects = DATA.subjectsByClass[cls.id] || [];
  var foundSubject = null;
  var foundUnit = null;
  var s, u;
  for (s = 0; s < subjects.length; s++) {
    for (u = 0; u < subjects[s].units.length; u++) {
      if (slugify(subjects[s].units[u].name) === unitSlug) {
        foundSubject = subjects[s];
        foundUnit = subjects[s].units[u];
      }
    }
  }

  if (!foundUnit) {
    autoOpenFirstSubject();
    return true;
  }

  state.openSubjectId = foundSubject.id;
  state.openUnitId = foundUnit.id;

  if (activitySlug) {
    var activity = null;
    var a;
    for (a = 0; a < foundUnit.activities.length; a++) {
      if (slugify(foundUnit.activities[a].name) === activitySlug) {
        activity = foundUnit.activities[a];
      }
    }
    if (activity && !activity.locked) {
      state.selectedActivity = { unit: foundUnit, activity: activity };
    }
  }

  return true;
}

document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("sidebar").innerHTML = '<div class="placeholder">Đang tải...</div>';

  await loadCurriculumData();

  var matched = applyUrlHash();
  if (!matched) {
    state.selectedClassId = DATA.classes[0] ? DATA.classes[0].id : null;
    autoOpenFirstSubject();
  }

  if (state.openUnitId) {
    await loadUnitDisabledActivities(state.openUnitId);
  } else {
    renderSidebar();
  }

  renderMainContent();
  updateUrlHash();

  document.getElementById("sidebarToggleBtn").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("mobile-open");
  });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    window.location.href = window.location.pathname + "?refresh=" + Date.now();
  });
});
