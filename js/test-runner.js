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

async function renderTestActivity(container, breadcrumbText, unit) {
  var sections = unit.testSections || [];
  var sectionIndex = 0;
  var totalScore = 0;
  var totalMax = 0;
  var sectionResults = [];
  var testStartedAt = new Date();
  var totalTabSwitchCount = 0;

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
      var cfg = TEST_SECTION_CONFIG[sections[i].section_type];
      var count = 0;
      if (cfg) {
        var secItems = await cfg.load(sections[i].source_unit_id, sections[i].source_set_name);
        count = secItems ? secItems.length : 0;
      }
      sectionTotals.push(count);
      grandTotal += count;
    }
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
      finishSectionAndAdvance(section, index, 0, 0);
      return;
    }

    container.innerHTML = "";

    var labelBanner = document.createElement("div");
    labelBanner.className = "test-section-label-banner";
    labelBanner.textContent = (section.label || config.label);
    container.appendChild(labelBanner);

    if (isAdminPreview()) {
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
    }

    var sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);

    var loading = document.createElement("div");
    loading.className = "placeholder";
    loading.textContent = "Đang tải nội dung...";
    sectionContainer.appendChild(loading);

    var items = await config.load(section.source_unit_id, section.source_set_name);
    if (!items || !items.length) {
      finishSectionAndAdvance(section, index, 0, 0);
      return;
    }

    var offsetForThisSection = runningOffset;
    config.render(sectionContainer, breadcrumbText, items, section.source_unit_id, section.source_set_name, function (score, total, answersLog, tabSwitchCount) {
      runningOffset = offsetForThisSection + total;
      totalTabSwitchCount += (tabSwitchCount || 0);
      finishSectionAndAdvance(section, index, score, total);
    }, offsetForThisSection, grandTotal, totalScore);
  }

  function finishSectionAndAdvance(section, index, score, total) {
    var config = TEST_SECTION_CONFIG[section.section_type];
    sectionResults.push({
      label: section.label || (config ? config.label : section.section_type),
      score: score,
      total: total
    });
    totalScore += score;
    totalMax += total;

    if (index < sections.length - 1) {
      runSection(sections[index + 1], index + 1);
    } else {
      showTestResult();
    }
  }

  function showTestResult() {
    submitQuizAttempt(unit.id, "test", totalScore, totalMax, testStartedAt, sectionResults, null, totalTabSwitchCount);

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
      sectionIndex = 0;
      totalScore = 0;
      totalMax = 0;
      runningOffset = 0;
      totalTabSwitchCount = 0;
      sectionResults = [];
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
