MODES.nangcao = {
  label: "Nâng cao",
  icon: "✨",
  range: [5, 9],
  onSelect: function (anchor, contentEl) {
    contentEl.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "nangcao-wrap";

    var subTabs = document.createElement("div");
    subTabs.className = "subtabs";
    var congBtn = document.createElement("button");
    congBtn.className = "subtab active";
    congBtn.type = "button";
    congBtn.textContent = "➕ Cộng qua 10";
    var truBtn = document.createElement("button");
    truBtn.className = "subtab";
    truBtn.type = "button";
    truBtn.textContent = "➖ Trừ qua 10";
    subTabs.appendChild(congBtn);
    subTabs.appendChild(truBtn);
    wrap.appendChild(subTabs);

    var panels = document.createElement("div");
    panels.className = "tachgop-panels";
    var congPanel = document.createElement("div");
    congPanel.className = "tachgop-panel active";
    var truPanel = document.createElement("div");
    truPanel.className = "tachgop-panel";
    panels.appendChild(congPanel);
    panels.appendChild(truPanel);
    wrap.appendChild(panels);

    contentEl.appendChild(wrap);

    renderMakeTenAddition(anchor, congPanel, true);
    renderMakeTenSubtraction(anchor, truPanel, false);

    congBtn.addEventListener("click", function () {
      congBtn.classList.add("active");
      truBtn.classList.remove("active");
      congPanel.classList.add("active");
      truPanel.classList.remove("active");
    });
    truBtn.addEventListener("click", function () {
      truBtn.classList.add("active");
      congBtn.classList.remove("active");
      truPanel.classList.add("active");
      congPanel.classList.remove("active");
    });
  }
};

var nangcaoAddBags = {};
var nangcaoSubBags = {};

// For anchor a (6..9 near-ten style, but we allow 5 too), valid second addends are those
// that actually cross ten with a leftover remainder: a + n >= 11, n <= 9.
function makeTenAddends(anchor) {
  var nMin = Math.max(2, 11 - anchor);
  var nMax = 9;
  var list = [];
  for (var n = nMin; n <= nMax; n++) {
    list.push(n);
  }
  return list;
}

// For subtractor s, valid minuends are teen numbers (11..18) where the leftover after
// filling back to 10 is still less than s (otherwise you'd never need to borrow from the ten).
function makeTenMinuends(s) {
  var mMax = Math.min(18, 9 + s);
  var list = [];
  for (var m = 11; m <= mMax; m++) {
    list.push(m);
  }
  return list;
}

function renderMakeTenAddition(anchor, body, autoSpeak) {
  body.innerHTML = "";
  var icons = randomIconPair();
  var icon1 = icons[0], icon2 = icons[1];
  var startedAt = new Date();
  var n = nextFromBag(nangcaoAddBags, anchor, function () { return makeTenAddends(anchor); });
  var sum = anchor + n;

  var speakText = "Kéo hình từ nhóm 2 lên nhóm 1 cho đủ mười nhé";
  body.appendChild(buildPromptRow(
    "Kéo hình từ nhóm 2 lên nhóm 1 cho đủ <b>10</b>, xem còn lại bao nhiêu nhé!",
    speakText
  ));

  var equationTop = document.createElement("div");
  equationTop.className = "nangcao-equation-top";
  equationTop.textContent = anchor + " + " + n + " = ?";
  body.appendChild(equationTop);

  var frameLabel = document.createElement("div");
  frameLabel.className = "section-label";
  frameLabel.textContent = "Nhóm 1 (đang có " + anchor + "):";
  body.appendChild(frameLabel);

  var frame = document.createElement("div");
  frame.className = "drop-pool nangcao-tenframe";
  body.appendChild(frame);

  for (var i = 0; i < anchor; i++) {
    var lockedItem = document.createElement("div");
    lockedItem.className = "drag-icon locked compact";
    lockedItem.innerHTML = icon1.svg;
    frame.appendChild(lockedItem);
  }

  var poolLabel = document.createElement("div");
  poolLabel.className = "section-label";
  poolLabel.textContent = "Nhóm 2 (đang có " + n + "):";
  body.appendChild(poolLabel);

  var pool = document.createElement("div");
  pool.className = "drop-pool tachgop-rect-box";
  body.appendChild(pool);

  var sizeClass = "compact";
  for (var j = 0; j < n; j++) {
    var item = document.createElement("div");
    item.className = "drag-icon " + sizeClass;
    item.innerHTML = icon2.svg;
    pool.appendChild(item);
    makeDraggable(item, function () { return [pool, frame]; }, function () {
      syncPlaceholders(pool, n, icon2.svg, sizeClass);
      updateStatus();
    });
  }

  var statusEl = document.createElement("div");
  statusEl.className = "nangcao-status";
  body.appendChild(statusEl);

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
  nextBtn.addEventListener("click", function () { renderMakeTenAddition(anchor, body, true); });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function realCount(el) {
    return el.querySelectorAll(".drag-icon:not(.used-placeholder)").length;
  }

  function updateStatus() {
    statusEl.textContent = "Nhóm 1: " + realCount(frame) + " | Nhóm 2 còn: " + realCount(pool);
  }
  updateStatus();

  doneBtn.addEventListener("click", function () {
    var frameCount = realCount(frame);
    var poolCount = realCount(pool);
    var correct = frameCount === 10 && (frameCount + poolCount === sum);
    if (!correct) {
      resultEl.textContent = "❌ Kéo cho nhóm 1 đủ 10 hình đã nhé, thử lại!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ 10 + " + poolCount + " = " + sum + "  (" + anchor + " + " + n + " = " + sum + ")";
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(anchor) + " cộng " + numberToWords(n) + " bằng " + numberToWords(sum));
    submitMathAttempt("math-nangcao-cong", 1, 1, startedAt, [{ anchor: anchor, n: n, sum: sum }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}

function renderMakeTenSubtraction(subtractor, body, autoSpeak) {
  body.innerHTML = "";
  var icons = randomIconPair();
  var tensIcon = icons[0], remainderIcon = icons[1];
  var startedAt = new Date();
  var minuend = nextFromBag(nangcaoSubBags, subtractor, function () { return makeTenMinuends(subtractor); });
  var remainderCount = minuend - 10;

  var speakText = "Kéo " + numberToWords(subtractor) + " hình từ ô chục xuống ô đã lấy ra nhé";
  body.appendChild(buildPromptRow(
    "Kéo <b>" + subtractor + "</b> hình từ ô Chục xuống \"Đã lấy ra\" nhé!",
    speakText
  ));

  var equationTop = document.createElement("div");
  equationTop.className = "nangcao-equation-top";
  equationTop.textContent = minuend + " - " + subtractor + " = ?";
  body.appendChild(equationTop);

  var tensLabel = document.createElement("div");
  tensLabel.className = "section-label";
  tensLabel.textContent = "Chục (10):";
  body.appendChild(tensLabel);

  var tensGroup = document.createElement("div");
  tensGroup.className = "drop-pool tachgop-rect-box";
  body.appendChild(tensGroup);

  var remainderLabel = document.createElement("div");
  remainderLabel.className = "section-label";
  remainderLabel.textContent = "Còn dư (" + remainderCount + "):";
  body.appendChild(remainderLabel);

  var remainderGroup = document.createElement("div");
  remainderGroup.className = "drop-pool nangcao-tenframe";
  body.appendChild(remainderGroup);

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

  var sizeClass = "compact";

  for (var i = 0; i < 10; i++) {
    var item = document.createElement("div");
    item.className = "drag-icon " + sizeClass;
    item.innerHTML = tensIcon.svg;
    tensGroup.appendChild(item);
    makeDraggable(item, function () { return [tensGroup, removedBox]; }, function () {
      syncPlaceholders(tensGroup, 10, tensIcon.svg, sizeClass);
      updateEquation();
    });
  }

  for (var r = 0; r < remainderCount; r++) {
    var remItem = document.createElement("div");
    remItem.className = "drag-icon locked " + sizeClass;
    remItem.innerHTML = remainderIcon.svg;
    remainderGroup.appendChild(remItem);
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
  nextBtn.addEventListener("click", function () { renderMakeTenSubtraction(subtractor, body, true); });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function realCount(el) {
    return el.querySelectorAll(".drag-icon:not(.used-placeholder)").length;
  }

  function updateEquation() {
    var removed = realCount(removedBox);
    var tensLeft = 10 - removed;
    equation.textContent = (removed > 0) ? ("10 - " + removed + " = " + tensLeft) : "";
  }

  doneBtn.addEventListener("click", function () {
    var removed = realCount(removedBox);
    var tensLeft = 10 - removed;
    var answer = tensLeft + remainderCount;
    var correct = removed === subtractor;
    if (!correct) {
      resultEl.textContent = "❌ Cần kéo đúng " + subtractor + " hình từ ô Chục, hiện đang có " + removed + ", thử lại nhé!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + tensLeft + " + " + remainderCount + " = " + answer + "  (" + minuend + " - " + subtractor + " = " + answer + ")";
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(minuend) + " trừ " + numberToWords(subtractor) + " bằng " + numberToWords(answer));
    submitMathAttempt("math-nangcao-tru", 1, 1, startedAt, [{ minuend: minuend, subtractor: subtractor, answer: answer }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}
