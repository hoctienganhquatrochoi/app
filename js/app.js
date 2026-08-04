var state = {
  selectedClassId: null,
  openSubjectId: null,
  openChapterId: null,
  openUnitId: null,
  selectedActivity: null
};

document.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});

document.addEventListener("keydown", function (e) {
  var key = (e.key || "").toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (key === "s" || key === "p" || key === "u")) {
    e.preventDefault();
  }
  if (key === "f12") {
    e.preventDefault();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
    e.preventDefault();
  }
});

function buildBreadcrumbText(cls, unit, activity) {
  var parts = [cls.name];
  if (unit.name) {
    parts.push(unit.name);
  }
  parts.push(activity.name);
  return parts.join(" › ");
}

function findClassById(classId) {
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (DATA.classes[i].id === classId) {
      return DATA.classes[i];
    }
  }
  return null;
}

function getSelectedClass() {
  if (state.selectedActivity && state.selectedActivity.unit) {
    var activeCls = findClassById(state.selectedActivity.unit.class_id);
    if (activeCls) {
      return activeCls;
    }
  }
  return findClassById(state.selectedClassId) || DATA.classes[0];
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

function renderSidebar() {
  var sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  var sidebarTitle = document.createElement("div");
  sidebarTitle.className = "sidebar-title";
  sidebarTitle.textContent = "📚 Chọn bài học";
  sidebar.appendChild(sidebarTitle);

  var classList = document.createElement("div");
  classList.className = "class-list";
  var i;
  for (i = 0; i < DATA.classes.length; i++) {
    if (classIsVisibleForStudent(DATA.classes[i])) {
      classList.appendChild(buildClassItem(DATA.classes[i]));
    }
  }
  sidebar.appendChild(classList);
}

function buildClassItem(cls) {
  var wrap = document.createElement("div");
  wrap.className = "class-item";

  var isOpen = state.selectedClassId === cls.id;

  var header = document.createElement("div");
  header.className = "class-header" + (isOpen ? " open" : "");

  var name = document.createElement("span");
  name.className = "class-name";
  name.textContent = cls.name;
  header.appendChild(name);

  var chevron = document.createElement("span");
  chevron.className = "chevron" + (isOpen ? " open" : "");
  chevron.textContent = "▸";
  header.appendChild(chevron);

  header.addEventListener("click", function () {
    if (isOpen) {
      state.selectedClassId = null;
    } else {
      state.selectedClassId = cls.id;
      state.openSubjectId = null;
      state.openUnitId = null;
    }
    renderSidebar();
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen) {
    var subjects = DATA.subjectsByClass[cls.id] || [];
    var subjectsWrap = document.createElement("div");
    subjectsWrap.className = "class-subjects";
    var i;
    for (i = 0; i < subjects.length; i++) {
      if (subjects[i].name) {
        subjectsWrap.appendChild(buildSubjectItem(subjects[i]));
      } else {
        subjectsWrap.appendChild(buildUnitListForSubject(subjects[i]));
      }
    }
    wrap.appendChild(subjectsWrap);
  }

  return wrap;
}

function buildUnitListForUnits(units) {
  var unitList = document.createElement("div");
  unitList.className = "unit-list";
  var i;
  for (i = 0; i < units.length; i++) {
    var unit = units[i];
    if (unit.name) {
      unitList.appendChild(buildUnitItem(unit));
    } else {
      unitList.appendChild(buildFlattenedUnitActivities(unit));
    }
  }
  return unitList;
}

function buildUnitListForSubject(subject) {
  return buildUnitListForUnits(subject.units);
}

function buildChapterItem(chapter) {
  var wrap = document.createElement("div");
  wrap.className = "chapter-item";

  var isOpen = state.openChapterId === chapter.id;

  var header = document.createElement("div");
  header.className = "chapter-header" + (isOpen ? " open" : "");

  var name = document.createElement("span");
  name.className = "chapter-name";
  name.textContent = chapter.name;
  header.appendChild(name);

  var chevron = document.createElement("span");
  chevron.className = "chevron" + (isOpen ? " open" : "");
  chevron.textContent = "▸";
  header.appendChild(chevron);

  header.addEventListener("click", function () {
    state.openChapterId = isOpen ? null : chapter.id;
    state.openUnitId = null;
    renderSidebar();
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen) {
    wrap.appendChild(buildUnitListForUnits(chapter.units));
  }

  return wrap;
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
    state.openChapterId = null;
    state.openUnitId = null;
    renderSidebar();
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen) {
    if (subject.chapters && subject.chapters.length > 0) {
      var chaptersWrap = document.createElement("div");
      chaptersWrap.className = "subject-chapters";
      var c;
      for (c = 0; c < subject.chapters.length; c++) {
        chaptersWrap.appendChild(buildChapterItem(subject.chapters[c]));
      }
      wrap.appendChild(chaptersWrap);

      var ungrouped = subject.units.filter(function (u) { return !u.chapter_id; });
      if (ungrouped.length > 0) {
        wrap.appendChild(buildUnitListForUnits(ungrouped));
      }
    } else {
      wrap.appendChild(buildUnitListForSubject(subject));
    }
  }

  return wrap;
}

function appendActivityListItems(listEl, unit, activities, disabledIds, needsAccess) {
  var i;
  var sawOther = false;
  var sentenceDividerInserted = false;
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

function isTemplateActivityId(id) {
  return VOCAB_ACTIVITY_TEMPLATE.some(function (a) { return a.id === id; }) ||
    SENTENCE_ACTIVITY_TEMPLATE.some(function (a) { return a.id === id; });
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

  // The vocab/sentence template block always follows the current canonical
  // template order — it's not something meant to be drag-reordered per unit,
  // so a stale saved position for an activity added after the last save
  // (e.g. "Dịch Việt - Anh") can't leave it stuck in the wrong spot relative
  // to its siblings. Only non-template content (grammar/wordwall/etc) keeps
  // whatever relative order was saved.
  var templateActivities = unit.activities.filter(function (a) {
    return isTemplateActivityId(a.id);
  });
  var nonTemplateSavedIds = orderIds.filter(function (id) {
    return byId[id] && !isTemplateActivityId(id);
  });

  var ordered = templateActivities.slice();
  var usedIds = {};
  ordered.forEach(function (a) {
    usedIds[a.id] = true;
  });
  nonTemplateSavedIds.forEach(function (id) {
    ordered.push(byId[id]);
    usedIds[id] = true;
  });

  // Any non-template activity never saved (e.g. a brand-new grammar/wordwall
  // set) gets slotted in at the position matching its rank in the fresh
  // order, instead of always landing at the very end.
  var freshIndex = {};
  unit.activities.forEach(function (a, i) {
    freshIndex[a.id] = i;
  });
  unit.activities.forEach(function (a) {
    if (usedIds[a.id]) {
      return;
    }
    var freshPos = freshIndex[a.id];
    var insertAt = ordered.length;
    for (var i = 0; i < ordered.length; i++) {
      if (freshIndex[ordered[i].id] > freshPos) {
        insertAt = i;
        break;
      }
    }
    ordered.splice(insertAt, 0, a);
  });

  return ordered;
}

function buildUnitItem(unit) {
  var wrap = document.createElement("div");
  wrap.className = "unit-item";

  var isOpen = state.openUnitId === unit.id;
  var isTest = unit.content_type === "test";
  var isSingleTest = isTest && unit.activities.length === 1;
  var isTestSelected = isSingleTest && state.selectedActivity && state.selectedActivity.unit.id === unit.id;

  var header = document.createElement("div");
  header.className = "unit-header" + (isOpen || isTestSelected ? " open" : "");

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
    if (isSingleTest) {
      if (!unitHasAccess(unit)) {
        showAccessNeededMessage();
        return;
      }
      state.selectedActivity = { unit: unit, activity: unit.activities[0] };
      document.getElementById("sidebar").classList.remove("mobile-open");
      renderSidebar();
      renderMainContent();
      updateUrlHash();
      return;
    }
    var willOpen = !isOpen;
    state.openUnitId = willOpen ? unit.id : null;
    if (willOpen && unitDisabledActivities[unit.id] === undefined) {
      loadUnitDisabledActivities(unit.id);
    }
    renderSidebar();
    updateUrlHash();
  });

  wrap.appendChild(header);

  if (isOpen && !isSingleTest) {
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

function classHasActiveDemo(cls) {
  return !!(cls && cls.demo_until && new Date(cls.demo_until) > new Date());
}

function studentHasRealAccess() {
  return !!(currentStudent && ((currentStudent.allowed_class_ids || []).length || (currentStudent.assignedUnitIds || []).length));
}

function unitHasAccess(unit) {
  if (unit.is_demo) {
    return true;
  }
  if (classHasActiveDemo(findClassById(unit.class_id)) && !studentHasRealAccess()) {
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

function classIsVisibleForStudent(cls) {
  if (!studentHasRealAccess()) {
    return true;
  }
  if ((currentStudent.allowed_class_ids || []).indexOf(cls.id) !== -1) {
    return true;
  }
  var subjects = DATA.subjectsByClass[cls.id] || [];
  var i, u;
  for (i = 0; i < subjects.length; i++) {
    for (u = 0; u < subjects[i].units.length; u++) {
      var unit = subjects[i].units[u];
      if (unit.is_demo || (currentStudent.assignedUnitIds || []).indexOf(unit.id) !== -1) {
        return true;
      }
    }
  }
  return false;
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

async function checkAndShowCheatWarning() {
  if (!currentStudent) {
    return;
  }
  var result = await supabaseClient
    .from("game_cheat_flags")
    .select("id, student_message")
    .eq("student_id", currentStudent.id)
    .eq("acknowledged", false)
    .order("flagged_at", { ascending: false })
    .limit(1);
  if (result.error || !result.data || !result.data.length) {
    return;
  }
  var flag = result.data[0];
  await supabaseClient.from("game_cheat_flags").update({ acknowledged: true }).eq("id", flag.id);
  window.alert(flag.student_message || "⚠️ Hệ thống vừa phát hiện hành vi bất thường trong quá trình học tập. Cô giáo đã biết việc này. Em học nghiêm túc lại nhé!");
}

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

  await checkAndShowCheatWarning();

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
      renderFlashcard(main, breadcrumbText, items, unit.id);
    } else if (activity.type === "flip-card") {
      renderFlipCard(main, breadcrumbText, items, unit.id);
    } else if (activity.type === "quiz") {
      renderQuiz(main, breadcrumbText, items, unit.id, activity.maxQuestions, activity.format, activity.id.indexOf("s") === 0);
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

  if (activity.type === "grammar-mcq" || activity.type === "grammar-typing" || activity.type === "grammar-matching" || activity.type === "grammar-dragfill" || activity.type === "math-dragfill" || activity.type === "text-dragfill") {
    var grammarLoading = document.createElement("div");
    grammarLoading.className = "placeholder";
    grammarLoading.textContent = "Đang tải nội dung...";
    main.appendChild(grammarLoading);

    var grammarItems;
    if (activity.type === "grammar-mcq") {
      grammarItems = await loadGrammarMcqForUnit(unit.id, activity.setName);
    } else if (activity.type === "grammar-typing") {
      grammarItems = await loadGrammarTypingForUnit(unit.id, activity.setName);
    } else if (activity.type === "grammar-matching") {
      grammarItems = await loadGrammarMatchingForUnit(unit.id, activity.setName);
    } else if (activity.type === "grammar-dragfill") {
      grammarItems = await loadGrammarDragfillForUnit(unit.id, activity.setName);
    } else if (activity.type === "math-dragfill") {
      grammarItems = await loadMathDragfillForUnit(unit.id, activity.setName);
    } else {
      grammarItems = await loadTextDragfillForUnit(unit.id, activity.setName);
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
      renderGrammarMcq(main, breadcrumbText, grammarItems, unit.id, activity.setName);
    } else if (activity.type === "grammar-typing") {
      renderGrammarTyping(main, breadcrumbText, grammarItems, unit.id, activity.setName);
    } else if (activity.type === "grammar-matching") {
      renderGrammarMatching(main, breadcrumbText, grammarItems, unit.id, activity.setName);
    } else if (activity.type === "grammar-dragfill") {
      renderGrammarDragfill(main, breadcrumbText, grammarItems, unit.id, activity.setName);
    } else if (activity.type === "math-dragfill") {
      renderMathDragfill(main, breadcrumbText, grammarItems, unit.id, activity.setName, "math-dragfill");
    } else {
      renderMathDragfill(main, breadcrumbText, grammarItems, unit.id, activity.setName, "text-dragfill");
    }
    return;
  }

  if (activity.type === "photo-quiz") {
    var photoLoading = document.createElement("div");
    photoLoading.className = "placeholder";
    photoLoading.textContent = "Đang tải nội dung...";
    main.appendChild(photoLoading);

    var photoQuizSet = await loadPhotoQuizSet(unit.id, activity.setName);

    if (!state.selectedActivity || state.selectedActivity.unit.id !== unit.id || state.selectedActivity.activity.id !== activity.id) {
      return;
    }

    if (!photoQuizSet.imageUrl && !photoQuizSet.questions.length) {
      main.innerHTML = "";
      var photoEmpty = document.createElement("div");
      photoEmpty.className = "placeholder";
      photoEmpty.textContent = "Unit này chưa có nội dung.";
      main.appendChild(photoEmpty);
      return;
    }

    main.innerHTML = "";
    renderPhotoQuiz(main, breadcrumbText, photoQuizSet.imageUrl, photoQuizSet.questions, unit.id, activity.setName);
    return;
  }

  if (activity.type === "wordwall") {
    main.innerHTML = "";
    renderWordwallActivity(main, breadcrumbText, activity.embedUrl, unit.id, activity.name);
    return;
  }

  if (activity.type === "test") {
    main.innerHTML = "";
    renderTestActivity(main, breadcrumbText, unit.id, activity.testSections || []);
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
    state.openSubjectId = null;
    state.openUnitId = null;
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
    state.openSubjectId = null;
    state.openUnitId = null;
    return true;
  }

  state.openSubjectId = foundSubject.id;
  state.openChapterId = foundUnit.chapter_id || null;
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

function findFirstUnitForClass(cls) {
  var subjects = DATA.subjectsByClass[cls.id] || [];
  var s, c;
  for (s = 0; s < subjects.length; s++) {
    var subj = subjects[s];
    if (subj.chapters && subj.chapters.length) {
      for (c = 0; c < subj.chapters.length; c++) {
        if (subj.chapters[c].units.length) {
          return subj.chapters[c].units[0];
        }
      }
    }
    var ungrouped = subj.units.filter(function (u) { return !u.chapter_id; });
    if (ungrouped.length) {
      return ungrouped[0];
    }
  }
  return null;
}

async function openDemoClass(cls) {
  state.selectedClassId = cls.id;
  state.openSubjectId = null;
  state.openChapterId = null;
  state.openUnitId = null;
  state.selectedActivity = null;

  var firstUnit = findFirstUnitForClass(cls);
  if (firstUnit) {
    state.openSubjectId = firstUnit.subject_id;
    state.openChapterId = firstUnit.chapter_id || null;
    state.openUnitId = firstUnit.id;
    var firstActivity = (firstUnit.activities || []).filter(function (a) { return !a.locked; })[0];
    if (firstActivity) {
      state.selectedActivity = { unit: firstUnit, activity: firstActivity };
    }
    await loadUnitDisabledActivities(firstUnit.id);
  } else {
    renderSidebar();
  }

  renderMainContent();
  updateUrlHash();
  document.getElementById("sidebar").classList.add("mobile-open");
}

function buildPopupCard(overlay, closePopup) {
  var card = document.createElement("div");
  card.className = "site-popup-card";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "site-popup-close";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closePopup);
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closePopup();
    }
  });
  return card;
}

function addPopupConfetti(card) {
  var items = [
    { text: "⭐", top: "-8px", left: "14%", size: "20px" },
    { text: "✨", top: "8%", right: "6%", size: "18px" },
    { text: "🎉", bottom: "-6px", left: "8%", size: "22px" },
    { text: "+", top: "4%", left: "50%", size: "26px", color: "#2D6A4F" },
    { text: "+", bottom: "10%", right: "18%", size: "20px", color: "#F4A261" }
  ];
  items.forEach(function (item) {
    var span = document.createElement("span");
    span.className = "site-popup-decor";
    span.textContent = item.text;
    span.style.fontSize = item.size;
    if (item.top) {
      span.style.top = item.top;
    }
    if (item.bottom) {
      span.style.bottom = item.bottom;
    }
    if (item.left) {
      span.style.left = item.left;
    }
    if (item.right) {
      span.style.right = item.right;
    }
    if (item.color) {
      span.style.color = item.color;
      span.style.fontWeight = "900";
    }
    card.appendChild(span);
  });
}

function buildPopupTemplateContent(card, title, subtitle, buttonText, onButtonClick) {
  addPopupConfetti(card);

  var icon = document.createElement("div");
  icon.className = "site-popup-icon";
  icon.textContent = "🎁";
  card.appendChild(icon);

  var body = document.createElement("div");
  body.className = "site-popup-body";

  var titleEl = document.createElement("h3");
  titleEl.className = "site-popup-title";
  titleEl.textContent = title;
  body.appendChild(titleEl);

  if (subtitle) {
    var subtitleEl = document.createElement("p");
    subtitleEl.className = "site-popup-subtitle";
    subtitleEl.textContent = subtitle;
    body.appendChild(subtitleEl);
  }

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "site-popup-btn";
  btn.textContent = buttonText;
  btn.addEventListener("click", onButtonClick);
  body.appendChild(btn);

  return body;
}

function showDemoClassPopup(cls) {
  var overlay = document.createElement("div");
  overlay.className = "site-popup-overlay";

  function closePopup() {
    sessionStorage.setItem("efkPopupDismissed", "yes");
    overlay.remove();
  }

  var card = buildPopupCard(overlay, closePopup);
  var body = buildPopupTemplateContent(
    card,
    "Đang mở demo miễn phí!",
    "Trải nghiệm ngay chương trình " + cls.name + "\nKhông cần tài khoản.",
    "Thử ngay →",
    function () {
      closePopup();
      openDemoClass(cls);
    }
  );

  var dismiss = document.createElement("a");
  dismiss.className = "site-popup-dismiss";
  dismiss.href = "#";
  dismiss.textContent = "Để sau";
  dismiss.addEventListener("click", function (e) {
    e.preventDefault();
    closePopup();
  });
  body.appendChild(dismiss);
  card.appendChild(body);

  document.body.appendChild(overlay);
}

function showCustomAdPopup(data, useImage) {
  var overlay = document.createElement("div");
  overlay.className = "site-popup-overlay";

  function closePopup() {
    sessionStorage.setItem("efkPopupDismissed", "yes");
    overlay.remove();
  }

  var card = buildPopupCard(overlay, closePopup);

  if (useImage) {
    var img = document.createElement("img");
    img.src = data.banner_image_url;
    img.className = "site-popup-img";
    if (data.banner_link_url) {
      var imgLink = document.createElement("a");
      imgLink.href = data.banner_link_url;
      imgLink.target = "_blank";
      imgLink.rel = "noopener noreferrer";
      imgLink.addEventListener("click", closePopup);
      imgLink.appendChild(img);
      card.appendChild(imgLink);
    } else {
      card.appendChild(img);
    }
  } else {
    var body = buildPopupTemplateContent(
      card,
      data.popup_title,
      data.popup_subtitle,
      data.popup_button_text || "Xem ngay",
      function () {
        closePopup();
        if (data.banner_link_url) {
          window.open(data.banner_link_url, "_blank");
        }
      }
    );

    var dismiss = document.createElement("a");
    dismiss.className = "site-popup-dismiss";
    dismiss.href = "#";
    dismiss.textContent = "Không, cảm ơn";
    dismiss.addEventListener("click", function (e) {
      e.preventDefault();
      closePopup();
    });
    body.appendChild(dismiss);
    card.appendChild(body);
  }

  document.body.appendChild(overlay);
}

async function renderHomePopup() {
  if (sessionStorage.getItem("efkPopupDismissed") === "yes") {
    return;
  }

  var demoClass = !studentHasRealAccess() ? DATA.classes.filter(classHasActiveDemo)[0] : null;
  if (demoClass) {
    showDemoClassPopup(demoClass);
    return;
  }

  var result = await supabaseClient.from("game_admin_settings")
    .select("banner_image_url, banner_link_url, popup_title, popup_subtitle, popup_button_text, popup_mode")
    .eq("id", 1).maybeSingle();
  var data = result.data;
  if (!data) {
    return;
  }
  var useImage = data.popup_mode === "image" ? true : (data.popup_mode === "text" ? false : !!data.banner_image_url);
  var hasContent = useImage ? !!data.banner_image_url : !!data.popup_title;
  if (!hasContent) {
    return;
  }
  showCustomAdPopup(data, useImage);
}

document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("sidebar").innerHTML = '<div class="placeholder">Đang tải...</div>';

  await loadCurriculumData();
  renderHomePopup();

  applyUrlHash();

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

  var lastHiddenAt = null;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      lastHiddenAt = Date.now();
    } else if (lastHiddenAt && Date.now() - lastHiddenAt > 10 * 60 * 1000) {
      window.location.href = window.location.pathname + "?refresh=" + Date.now();
    }
  });
});
