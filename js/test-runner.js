var TEST_SECTION_CONFIG = {
  "grammar-mcq": { load: loadGrammarMcqForUnit, render: renderGrammarMcq, label: "Trắc nghiệm ngữ pháp" },
  "grammar-typing": { load: loadGrammarTypingForUnit, render: renderGrammarTyping, label: "Viết câu trả lời" },
  "grammar-matching": { load: loadGrammarMatchingForUnit, render: renderGrammarMatching, label: "Nối câu" },
  "grammar-dragfill": { load: loadGrammarDragfillForUnit, render: renderGrammarDragfill, label: "Điền từ vào chỗ trống" },
  "math-dragfill": {
    load: loadMathDragfillForUnit,
    render: function (container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
      renderMathDragfill(container, breadcrumbText, items, unitId, setName, "math-dragfill", onTestComplete, progressOffset, progressTotal, scoreOffset);
    },
    label: "Toán - Điền số"
  },
  "text-dragfill": {
    load: loadTextDragfillForUnit,
    render: function (container, breadcrumbText, items, unitId, setName, onTestComplete, progressOffset, progressTotal, scoreOffset) {
      renderMathDragfill(container, breadcrumbText, items, unitId, setName, "text-dragfill", onTestComplete, progressOffset, progressTotal, scoreOffset);
    },
    label: "Điền đoạn văn/hội thoại"
  }
};

async function renderTestActivity(container, breadcrumbText, unitId, sections) {
  sections = sections || [];
  var sectionResults = sections.map(function () { return null; });
  var testStartedAt = new Date();

  if (!sections.length) {
    container.innerHTML = "";
    var empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "Đề này chưa có mục nào.";
    container.appendChild(empty);
    return;
  }

  var grandTotal = 0;
  var runningOffset = 0;
  var sectionTotals = [];

  async function preloadGrandTotal() {
    for (var i = 0; i < sections.length; i++) {
      var sectionType = sections[i].section_type;
      var cfg = TEST_SECTION_CONFIG[sectionType];
      var count = 0;
      if (cfg) {
        var secItems = await cfg.load(sections[i].source_unit_id, sections[i].source_set_name);
        if (sectionType === "math-dragfill" || sectionType === "text-dragfill") {
          count = (secItems || []).reduce(function (sum, row) {
            return sum + splitMathPassageAroundBlanks(row.passage).answers.length;
          }, 0);
        } else {
          count = secItems ? secItems.length : 0;
        }
      }
      sectionTotals.push(count);
      grandTotal += count;
    }
  }

  function currentTotalScore() {
    return sectionResults.reduce(function (sum, r) { return sum + (r ? r.score : 0); }, 0);
  }

  function currentTotalMax() {
    return sectionResults.reduce(function (sum, r) { return sum + (r ? r.total : 0); }, 0);
  }

  function currentTotalTabSwitchCount() {
    return sectionResults.reduce(function (sum, r) { return sum + (r ? r.tabSwitchCount : 0); }, 0);
  }

  function findNextIncompleteSection(fromIndex) {
    var i;
    for (i = fromIndex + 1; i < sections.length; i++) {
      if (!sectionResults[i]) {
        return i;
      }
    }
    for (i = 0; i < sections.length; i++) {
      if (!sectionResults[i]) {
        return i;
      }
    }
    return -1;
  }

  function jumpToSection(index) {
    if (index < 0 || index >= sections.length) {
      return;
    }
    var offset = 0;
    for (var i = 0; i < index; i++) {
      offset += sectionTotals[i];
    }
    runningOffset = offset;
    runSection(sections[index], index);
  }

  async function runSection(section, index) {
    var config = TEST_SECTION_CONFIG[section.section_type];
    if (!config) {
      finishSectionAndAdvance(section, index, 0, 0, 0);
      return;
    }

    container.innerHTML = "";

    var labelBanner = document.createElement("div");
    labelBanner.className = "test-section-label-banner";
    labelBanner.textContent = (section.label || config.label);
    container.appendChild(labelBanner);

    var sectionLabelEl = document.createElement("div");
    sectionLabelEl.className = "test-section-dev-nav-label";
    sectionLabelEl.textContent = "Mục " + (index + 1) + " / " + sections.length;
    container.appendChild(sectionLabelEl);
    container.appendChild(buildDevNavButtons(
      function () { jumpToSection(index - 1); },
      function () { jumpToSection(index + 1); },
      index > 0,
      index < sections.length - 1
    ));

    var sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);

    var loading = document.createElement("div");
    loading.className = "placeholder";
    loading.textContent = "Đang tải nội dung...";
    sectionContainer.appendChild(loading);

    var items = await config.load(section.source_unit_id, section.source_set_name);
    if (!items || !items.length) {
      finishSectionAndAdvance(section, index, 0, 0, 0);
      return;
    }

    var offsetForThisSection = runningOffset;
    config.render(sectionContainer, breadcrumbText, items, section.source_unit_id, section.source_set_name, function (score, total, answersLog, tabSwitchCount) {
      runningOffset = offsetForThisSection + total;
      finishSectionAndAdvance(section, index, score, total, tabSwitchCount || 0);
    }, offsetForThisSection, grandTotal, currentTotalScore());
  }

  function finishSectionAndAdvance(section, index, score, total, tabSwitchCount) {
    var config = TEST_SECTION_CONFIG[section.section_type];
    sectionResults[index] = {
      label: section.label || (config ? config.label : section.section_type),
      score: score,
      total: total,
      tabSwitchCount: tabSwitchCount || 0
    };

    var nextIndex = findNextIncompleteSection(index);
    if (nextIndex === -1) {
      showTestResult();
    } else {
      runSection(sections[nextIndex], nextIndex);
    }
  }

  function showTestResult() {
    var totalScore = currentTotalScore();
    var totalMax = currentTotalMax();
    var totalTabSwitchCount = currentTotalTabSwitchCount();
    submitQuizAttempt(unitId, "test", totalScore, totalMax, testStartedAt, sectionResults, null, totalTabSwitchCount);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta(breadcrumbText));

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = totalScore + " / " + totalMax;
    wrap.appendChild(scoreBig);

    wrap.appendChild(buildDurationLine(testStartedAt));
    wrap.appendChild(buildTabSwitchLine(totalTabSwitchCount));

    var table = document.createElement("table");
    table.className = "ranking-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Mục", "Điểm"].forEach(function (text) {
      var th = document.createElement("th");
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    sectionResults.forEach(function (r) {
      var tr = document.createElement("tr");
      var labelTd = document.createElement("td");
      labelTd.textContent = r.label;
      tr.appendChild(labelTd);
      var scoreTd = document.createElement("td");
      scoreTd.textContent = r.score + " / " + r.total;
      tr.appendChild(scoreTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      runningOffset = 0;
      sectionResults = sections.map(function () { return null; });
      testStartedAt = new Date();
      runSection(sections[0], 0);
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  container.innerHTML = "";
  var initialLoading = document.createElement("div");
  initialLoading.className = "placeholder";
  initialLoading.textContent = "Đang tải đề...";
  container.appendChild(initialLoading);

  preloadGrandTotal().then(function () {
    runSection(sections[0], 0);
  });
}
