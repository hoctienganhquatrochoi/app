var TEST_SECTION_CONFIG = {
  "grammar-mcq": { load: loadGrammarMcqForUnit, render: renderGrammarMcq, label: "Trắc nghiệm ngữ pháp" },
  "grammar-typing": { load: loadGrammarTypingForUnit, render: renderGrammarTyping, label: "Viết câu trả lời" },
  "grammar-matching": { load: loadGrammarMatchingForUnit, render: renderGrammarMatching, label: "Nối câu" },
  "grammar-dragfill": { load: loadGrammarDragfillForUnit, render: renderGrammarDragfill, label: "Điền từ vào chỗ trống" },
  "math-dragfill": {
    load: loadMathDragfillForUnit,
    render: function (container, breadcrumbText, items, unitId, setName, onTestComplete) {
      renderMathDragfill(container, breadcrumbText, items, unitId, setName, "math-dragfill", onTestComplete);
    },
    label: "Toán - Điền số"
  },
  "text-dragfill": {
    load: loadTextDragfillForUnit,
    render: function (container, breadcrumbText, items, unitId, setName, onTestComplete) {
      renderMathDragfill(container, breadcrumbText, items, unitId, setName, "text-dragfill", onTestComplete);
    },
    label: "Điền đoạn văn/hội thoại"
  }
};

var TEST_SECTION_TRANSITION_MS = 1200;

async function renderTestActivity(container, breadcrumbText, unit) {
  var sections = unit.testSections || [];
  var sectionIndex = 0;
  var totalScore = 0;
  var totalMax = 0;
  var sectionResults = [];
  var testStartedAt = new Date();
  var testTabTracker = startTabSwitchTracker();

  if (!sections.length) {
    container.innerHTML = "";
    var empty = document.createElement("div");
    empty.className = "placeholder";
    empty.textContent = "Đề này chưa có mục nào.";
    container.appendChild(empty);
    return;
  }

  function showTransition(section, index) {
    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "test-transition-wrap";

    var heading = document.createElement("h2");
    heading.textContent = "📝 " + (section.label || ("Mục " + (index + 1)));
    wrap.appendChild(heading);

    var sub = document.createElement("p");
    sub.textContent = "Mục " + (index + 1) + " / " + sections.length;
    wrap.appendChild(sub);

    container.appendChild(wrap);

    setTimeout(function () {
      runSection(section, index);
    }, TEST_SECTION_TRANSITION_MS);
  }

  async function runSection(section, index) {
    var config = TEST_SECTION_CONFIG[section.section_type];
    if (!config) {
      finishSectionAndAdvance(section, index, 0, 0);
      return;
    }

    var loading = document.createElement("div");
    loading.className = "placeholder";
    loading.textContent = "Đang tải nội dung...";
    container.innerHTML = "";
    container.appendChild(loading);

    var items = await config.load(section.source_unit_id, section.source_set_name);
    if (!items || !items.length) {
      finishSectionAndAdvance(section, index, 0, 0);
      return;
    }

    var sectionBreadcrumb = breadcrumbText + " › " + (section.label || config.label);
    config.render(container, sectionBreadcrumb, items, section.source_unit_id, section.source_set_name, function (score, total) {
      finishSectionAndAdvance(section, index, score, total);
    });
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
      showTransition(sections[index + 1], index + 1);
    } else {
      showTestResult();
    }
  }

  function showTestResult() {
    testTabTracker.stop();
    submitQuizAttempt(unit.id, "test", totalScore, totalMax, testStartedAt, sectionResults, null, testTabTracker.getCount());

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
    wrap.appendChild(buildTabSwitchLine(testTabTracker.getCount()));

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
      sectionResults = [];
      testStartedAt = new Date();
      testTabTracker = startTabSwitchTracker();
      showTransition(sections[0], 0);
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showTransition(sections[0], 0);
}
