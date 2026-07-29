MODES.tachgop = {
  label: "Tách/Gộp",
  icon: "🧺",
  range: [2, 10],
  onSelect: function (num, contentEl) {
    contentEl.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "tachgop-wrap";

    var subTabs = document.createElement("div");
    subTabs.className = "subtabs";
    var tachBtn = document.createElement("button");
    tachBtn.className = "subtab active";
    tachBtn.type = "button";
    tachBtn.textContent = "✂️ Tách";
    var gopBtn = document.createElement("button");
    gopBtn.className = "subtab";
    gopBtn.type = "button";
    gopBtn.textContent = "➕ Gộp";
    var truBtn = document.createElement("button");
    truBtn.className = "subtab";
    truBtn.type = "button";
    truBtn.textContent = "➖ Trừ";
    subTabs.appendChild(tachBtn);
    subTabs.appendChild(gopBtn);
    subTabs.appendChild(truBtn);
    wrap.appendChild(subTabs);

    var panels = document.createElement("div");
    panels.className = "tachgop-panels";
    var tachPanel = document.createElement("div");
    tachPanel.className = "tachgop-panel active";
    var gopPanel = document.createElement("div");
    gopPanel.className = "tachgop-panel";
    var truPanel = document.createElement("div");
    truPanel.className = "tachgop-panel";
    panels.appendChild(tachPanel);
    panels.appendChild(gopPanel);
    panels.appendChild(truPanel);
    wrap.appendChild(panels);

    contentEl.appendChild(wrap);

    renderTach(num, tachPanel, true);
    renderGop(num, gopPanel, false);
    renderTru(num, truPanel, false);

    var tabs = [tachBtn, gopBtn, truBtn];
    var thePanels = [tachPanel, gopPanel, truPanel];
    function activate(idx) {
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("active", i === idx);
        thePanels[i].classList.toggle("active", i === idx);
      }
    }
    tachBtn.addEventListener("click", function () { activate(0); });
    gopBtn.addEventListener("click", function () { activate(1); });
    truBtn.addEventListener("click", function () { activate(2); });
  }
};

// Shuffled bags so every split/target case shows up once before any repeats.
var tachBags = {};
var gopBags = {};
var truBags = {};

function splitPairs(num) {
  var pairs = [];
  for (var a = 1; a < num; a++) {
    pairs.push([a, num - a]);
  }
  return pairs;
}

// ---------- Tách: split N into Phần 1 / Phần 2 with a specific target ----------
function renderTach(num, body, autoSpeak) {
  body.innerHTML = "";
  var icon = randomIcon();
  var startedAt = new Date();
  var pair = nextFromBag(tachBags, num, function () { return splitPairs(num); });
  var targetA = pair[0], targetB = pair[1];

  var speakText = "Tách " + numberToWords(num) + " thành " + numberToWords(targetA) + " và " + numberToWords(targetB) + " nhé";
  body.appendChild(buildPromptRow(
    "Tách <b>" + num + "</b> thành <b>" + targetA + "</b> và <b>" + targetB + "</b> nhé!",
    speakText
  ));

  var poolLabel = document.createElement("div");
  poolLabel.className = "section-label";
  poolLabel.textContent = "Kho hình:";
  body.appendChild(poolLabel);

  var pool = document.createElement("div");
  pool.className = "drop-pool tachgop-rect-box";
  body.appendChild(pool);

  var boxesWrap = document.createElement("div");
  boxesWrap.className = "tachgop-boxes";

  var boxAItems = document.createElement("div");
  boxAItems.className = "drop-pool tachgop-box-items tachgop-rect-box";
  var boxA = document.createElement("div");
  boxA.className = "tachgop-box";
  boxA.innerHTML = '<div class="section-label">Phần 1</div>';
  boxA.appendChild(boxAItems);

  var boxBItems = document.createElement("div");
  boxBItems.className = "drop-pool tachgop-box-items tachgop-rect-box";
  var boxB = document.createElement("div");
  boxB.className = "tachgop-box";
  boxB.innerHTML = '<div class="section-label">Phần 2</div>';
  boxB.appendChild(boxBItems);

  boxesWrap.appendChild(boxA);
  boxesWrap.appendChild(boxB);
  body.appendChild(boxesWrap);

  var equation = document.createElement("div");
  equation.className = "tachgop-equation";
  body.appendChild(equation);

  var sizeClass = iconSizeClass(num);
  for (var i = 0; i < num; i++) {
    var item = document.createElement("div");
    item.className = "drag-icon " + sizeClass;
    item.innerHTML = icon.svg;
    pool.appendChild(item);
    makeDraggable(item, function () { return [pool, boxAItems, boxBItems]; }, function () {
      syncPlaceholders(pool, num, icon.svg, sizeClass);
      updateEquation();
    });
  }

  var actionRow = document.createElement("div");
  actionRow.className = "tachgop-action-row";
  body.appendChild(actionRow);

  var doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn";
  doneBtn.type = "button";
  doneBtn.textContent = "✅ Hoàn thành";
  actionRow.appendChild(doneBtn);

  var nextBtn = document.createElement("button");
  nextBtn.className = "primary-btn next-btn";
  nextBtn.type = "button";
  nextBtn.textContent = "🔁 Làm tiếp";
  nextBtn.style.display = "none";
  nextBtn.addEventListener("click", function () { renderTach(num, body, true); });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function realCount(el) {
    return el.querySelectorAll(".drag-icon:not(.used-placeholder)").length;
  }

  function updateEquation() {
    var a = realCount(boxAItems);
    var b = realCount(boxBItems);
    if (realCount(pool) === 0) {
      equation.textContent = a + " + " + b + " = " + num;
    } else {
      equation.textContent = "";
    }
  }

  doneBtn.addEventListener("click", function () {
    var a = realCount(boxAItems);
    var b = realCount(boxBItems);
    var correct = a === targetA && b === targetB;
    if (!correct) {
      resultEl.textContent = "❌ Cần tách đúng " + targetA + " và " + targetB + ", thử lại nhé!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + num + " = " + a + " + " + b;
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(num) + " bằng " + numberToWords(a) + " cộng " + numberToWords(b));
    submitMathAttempt("math-tach", 1, 1, startedAt, [{ number: num, a: a, b: b }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}

// ---------- Gộp: pick specific counts from 2 colored source shelves, combine, read total ----------
function renderGop(num, body, autoSpeak) {
  body.innerHTML = "";
  var icons = randomIconPair();
  var icon1 = icons[0], icon2 = icons[1];
  var startedAt = new Date();
  var pair = nextFromBag(gopBags, num, function () { return splitPairs(num); });
  var targetA = pair[0], targetB = pair[1];
  var SHELF_SIZE = 10;

  var speakText = "Lấy " + numberToWords(targetA) + " " + icon1.name + " ở ô 1 và " + numberToWords(targetB) + " " + icon2.name + " ở ô 2, gộp lại nhé";
  body.appendChild(buildPromptRow(
    "Lấy <b>" + targetA + "</b> " + icon1.name + " ở ô 1 và <b>" + targetB + "</b> " + icon2.name + " ở ô 2, kéo xuống gộp lại nhé!",
    speakText
  ));

  var shelvesWrap = document.createElement("div");
  shelvesWrap.className = "tachgop-boxes";

  var shelf1 = document.createElement("div");
  shelf1.className = "drop-pool tachgop-box-items tachgop-rect-box";
  var shelf1Box = document.createElement("div");
  shelf1Box.className = "tachgop-box";
  shelf1Box.innerHTML = '<div class="section-label">Ô 1</div>';
  shelf1Box.appendChild(shelf1);

  var shelf2 = document.createElement("div");
  shelf2.className = "drop-pool tachgop-box-items tachgop-rect-box";
  var shelf2Box = document.createElement("div");
  shelf2Box.className = "tachgop-box";
  shelf2Box.innerHTML = '<div class="section-label">Ô 2</div>';
  shelf2Box.appendChild(shelf2);

  shelvesWrap.appendChild(shelf1Box);
  shelvesWrap.appendChild(shelf2Box);
  body.appendChild(shelvesWrap);

  var resultLabel = document.createElement("div");
  resultLabel.className = "section-label";
  resultLabel.textContent = "Gộp lại:";
  body.appendChild(resultLabel);

  var resultBox = document.createElement("div");
  resultBox.className = "drop-pool tachgop-rect-box";
  body.appendChild(resultBox);

  var equation = document.createElement("div");
  equation.className = "tachgop-equation";
  body.appendChild(equation);

  var sizeClass = iconSizeClass(SHELF_SIZE);

  for (var i = 0; i < SHELF_SIZE; i++) {
    var item1 = document.createElement("div");
    item1.className = "drag-icon " + sizeClass;
    item1.innerHTML = icon1.svg;
    item1.dataset.origin = "shelf1";
    shelf1.appendChild(item1);
    makeDraggable(item1, function () { return [shelf1, resultBox]; }, function () {
      syncPlaceholders(shelf1, SHELF_SIZE, icon1.svg, sizeClass);
      updateEquation();
    });
  }

  for (var j = 0; j < SHELF_SIZE; j++) {
    var item2 = document.createElement("div");
    item2.className = "drag-icon " + sizeClass;
    item2.innerHTML = icon2.svg;
    item2.dataset.origin = "shelf2";
    shelf2.appendChild(item2);
    makeDraggable(item2, function () { return [shelf2, resultBox]; }, function () {
      syncPlaceholders(shelf2, SHELF_SIZE, icon2.svg, sizeClass);
      updateEquation();
    });
  }

  var actionRow = document.createElement("div");
  actionRow.className = "tachgop-action-row";
  body.appendChild(actionRow);

  var doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn";
  doneBtn.type = "button";
  doneBtn.textContent = "✅ Hoàn thành";
  actionRow.appendChild(doneBtn);

  var nextBtn = document.createElement("button");
  nextBtn.className = "primary-btn next-btn";
  nextBtn.type = "button";
  nextBtn.textContent = "🔁 Làm tiếp";
  nextBtn.style.display = "none";
  nextBtn.addEventListener("click", function () { renderGop(num, body, true); });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function countInResult(origin) {
    return resultBox.querySelectorAll('[data-origin="' + origin + '"]').length;
  }

  function updateEquation() {
    var a = countInResult("shelf1");
    var b = countInResult("shelf2");
    if (a > 0 || b > 0) {
      equation.textContent = a + " + " + b + " = " + (a + b);
    } else {
      equation.textContent = "";
    }
  }

  doneBtn.addEventListener("click", function () {
    var a = countInResult("shelf1");
    var b = countInResult("shelf2");
    var correct = a === targetA && b === targetB;
    if (!correct) {
      resultEl.textContent = "❌ Cần lấy đúng " + targetA + " ở ô 1 và " + targetB + " ở ô 2, thử lại nhé!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + a + " + " + b + " = " + num;
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(a) + " cộng " + numberToWords(b) + " bằng " + numberToWords(num));
    submitMathAttempt("math-gop", 1, 1, startedAt, [{ number: num, a: a, b: b }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}

// ---------- Trừ: drag a specific count out of "Ô ban đầu" into "Đã lấy ra" ----------
function renderTru(num, body, autoSpeak) {
  body.innerHTML = "";
  var icon = randomIcon();
  var startedAt = new Date();
  var target = nextFromBag(truBags, num, function () {
    var arr = [];
    for (var i = 1; i <= num; i++) {
      arr.push(i);
    }
    return arr;
  });

  var speakText = "Kéo bớt " + numberToWords(target) + " " + icon.name + " sang ô bên cạnh nhé";
  body.appendChild(buildPromptRow(
    "Kéo bớt <b>" + target + "</b> " + icon.name + " sang ô bên cạnh nhé!",
    speakText
  ));

  var poolLabel = document.createElement("div");
  poolLabel.className = "section-label";
  poolLabel.textContent = "Ô ban đầu:";
  body.appendChild(poolLabel);

  var mainWrap = document.createElement("div");
  mainWrap.className = "drop-pool tachgop-rect-box";
  body.appendChild(mainWrap);

  var removedLabel = document.createElement("div");
  removedLabel.className = "section-label";
  removedLabel.textContent = "Đã lấy ra:";
  body.appendChild(removedLabel);

  var removedBox = document.createElement("div");
  removedBox.className = "drop-pool tachgop-rect-box";
  body.appendChild(removedBox);

  var equation = document.createElement("div");
  equation.className = "tachgop-equation";
  body.appendChild(equation);

  var sizeClass = iconSizeClass(num);
  for (var i = 0; i < num; i++) {
    var item = document.createElement("div");
    item.className = "drag-icon " + sizeClass;
    item.innerHTML = icon.svg;
    mainWrap.appendChild(item);
    makeDraggable(item, function () { return [mainWrap, removedBox]; }, function () {
      syncPlaceholders(mainWrap, num, icon.svg, sizeClass);
      updateEquation();
    });
  }

  var actionRow = document.createElement("div");
  actionRow.className = "tachgop-action-row";
  body.appendChild(actionRow);

  var doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn";
  doneBtn.type = "button";
  doneBtn.textContent = "✅ Hoàn thành";
  actionRow.appendChild(doneBtn);

  var nextBtn = document.createElement("button");
  nextBtn.className = "primary-btn next-btn";
  nextBtn.type = "button";
  nextBtn.textContent = "🔁 Làm tiếp";
  nextBtn.style.display = "none";
  nextBtn.addEventListener("click", function () { renderTru(num, body, true); });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function realCount(el) {
    return el.querySelectorAll(".drag-icon:not(.used-placeholder)").length;
  }

  function updateEquation() {
    var removed = realCount(removedBox);
    var remain = num - removed;
    equation.textContent = (removed > 0) ? (num + " - " + removed + " = " + remain) : "";
  }

  doneBtn.addEventListener("click", function () {
    var removed = realCount(removedBox);
    var remain = num - removed;
    var correct = removed === target;
    if (!correct) {
      resultEl.textContent = "❌ Cần kéo đúng " + target + " hình sang ô bên, hiện đang có " + removed + ", thử lại nhé!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + num + " - " + removed + " = " + remain;
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(num) + " trừ " + numberToWords(removed) + " bằng " + numberToWords(remain));
    submitMathAttempt("math-tachgop-tru", 1, 1, startedAt, [{ number: num, target: target, removed: removed, remain: remain }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}
