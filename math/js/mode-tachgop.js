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
    var addBtn = document.createElement("button");
    addBtn.className = "subtab active";
    addBtn.type = "button";
    addBtn.textContent = "➕ Tách / Gộp";
    var subBtn = document.createElement("button");
    subBtn.className = "subtab";
    subBtn.type = "button";
    subBtn.textContent = "➖ Bớt đi";
    subTabs.appendChild(addBtn);
    subTabs.appendChild(subBtn);
    wrap.appendChild(subTabs);

    var panels = document.createElement("div");
    panels.className = "tachgop-panels";
    var addPanel = document.createElement("div");
    addPanel.className = "tachgop-panel active";
    var subPanel = document.createElement("div");
    subPanel.className = "tachgop-panel";
    panels.appendChild(addPanel);
    panels.appendChild(subPanel);
    wrap.appendChild(panels);

    contentEl.appendChild(wrap);

    renderSplitAddition(num, addPanel, true);
    renderSplitSubtraction(num, subPanel, false);

    addBtn.addEventListener("click", function () {
      addBtn.classList.add("active");
      subBtn.classList.remove("active");
      addPanel.classList.add("active");
      subPanel.classList.remove("active");
    });
    subBtn.addEventListener("click", function () {
      subBtn.classList.add("active");
      addBtn.classList.remove("active");
      subPanel.classList.add("active");
      addPanel.classList.remove("active");
    });
  }
};

// Draws a target's target-count 1..num in shuffled order, one full cycle before repeating any
// value, so a student who keeps hitting "Làm tiếp" is guaranteed to eventually see every case.
var subtractionTargetBags = {};

function nextSubtractionTarget(num) {
  var bag = subtractionTargetBags[num];
  if (!bag || bag.length === 0) {
    bag = [];
    for (var i = 1; i <= num; i++) {
      bag.push(i);
    }
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }
    subtractionTargetBags[num] = bag;
  }
  return bag.pop();
}

function renderSplitAddition(num, body, autoSpeak) {
  body.innerHTML = "";
  var icon = randomIcon();
  var startedAt = new Date();

  var speakText = "Kéo " + numberToWords(num) + " " + icon.name + " chia làm 2 phần nhé";
  body.appendChild(buildPromptRow(
    "Kéo <b>" + num + "</b> " + icon.name + " chia làm 2 phần nhé!",
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
    makeDraggable(item, function () { return [pool, boxAItems, boxBItems]; }, updateEquation);
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
  nextBtn.addEventListener("click", function () {
    renderSplitAddition(num, body, true);
  });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  var equationStyle = Math.random() < 0.5;

  function updateEquation() {
    var a = boxAItems.children.length;
    var b = boxBItems.children.length;
    if (pool.children.length === 0) {
      equation.textContent = equationStyle ? (num + " = " + a + " + " + b) : (a + " + " + b + " = " + num);
    } else {
      equation.textContent = "";
    }
  }

  doneBtn.addEventListener("click", function () {
    var a = boxAItems.children.length;
    var b = boxBItems.children.length;
    var correct = pool.children.length === 0;
    if (!correct) {
      resultEl.textContent = "❌ Kéo hết hình chia vào 2 phần nhé, đừng để sót trong kho!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + a + " + " + b + " = " + num;
    resultEl.className = "result-msg is-correct";
    doneBtn.style.display = "none";
    nextBtn.style.display = "";
    speak(numberToWords(num) + " bằng " + numberToWords(a) + " cộng " + numberToWords(b));
    submitMathAttempt("math-tachgop-cong", 1, 1, startedAt, [{ number: num, a: a, b: b }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}

function renderSplitSubtraction(num, body, autoSpeak) {
  body.innerHTML = "";
  var icon = randomIcon();
  var startedAt = new Date();
  var target = nextSubtractionTarget(num);

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
    makeDraggable(item, function () { return [mainWrap, removedBox]; }, updateEquation);
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
  nextBtn.addEventListener("click", function () {
    renderSplitSubtraction(num, body, true);
  });
  actionRow.appendChild(nextBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function updateEquation() {
    var removed = removedBox.children.length;
    var remain = mainWrap.children.length;
    equation.textContent = (removed > 0) ? (num + " - " + removed + " = " + remain) : "";
  }

  doneBtn.addEventListener("click", function () {
    var removed = removedBox.children.length;
    var remain = mainWrap.children.length;
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
