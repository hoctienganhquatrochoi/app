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

  var doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn";
  doneBtn.type = "button";
  doneBtn.textContent = "✅ Hoàn thành";
  body.appendChild(doneBtn);

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
  var target = 1 + Math.floor(Math.random() * num);

  var speakText = "Lấy bớt " + numberToWords(target) + " " + icon.name + " nhé";
  body.appendChild(buildPromptRow(
    "Lấy bớt <b>" + target + "</b> " + icon.name + " nhé!",
    speakText
  ));

  var poolLabel = document.createElement("div");
  poolLabel.className = "section-label";
  poolLabel.textContent = "Ô ban đầu:";
  body.appendChild(poolLabel);

  var mainWrap = document.createElement("div");
  mainWrap.className = "drop-pool tachgop-rect-box";
  body.appendChild(mainWrap);

  var equation = document.createElement("div");
  equation.className = "tachgop-equation";
  body.appendChild(equation);

  var items = [];
  var sizeClass = iconSizeClass(num);
  for (var i = 0; i < num; i++) {
    var item = document.createElement("div");
    item.className = "drag-icon tappable " + sizeClass;
    item.innerHTML = icon.svg;
    item.addEventListener("click", function () {
      this.classList.toggle("crossed");
      updateEquation();
    });
    mainWrap.appendChild(item);
    items.push(item);
  }

  var doneBtn = document.createElement("button");
  doneBtn.className = "primary-btn";
  doneBtn.type = "button";
  doneBtn.textContent = "✅ Hoàn thành";
  body.appendChild(doneBtn);

  var resultEl = document.createElement("div");
  resultEl.className = "result-msg";
  body.appendChild(resultEl);

  function countCrossed() {
    return items.filter(function (el) { return el.classList.contains("crossed"); }).length;
  }

  function updateEquation() {
    var crossed = countCrossed();
    var remain = num - crossed;
    equation.textContent = (crossed > 0) ? (num + " - " + crossed + " = " + remain) : "";
  }

  doneBtn.addEventListener("click", function () {
    var crossed = countCrossed();
    var remain = num - crossed;
    var correct = crossed === target;
    if (!correct) {
      resultEl.textContent = "❌ Cần lấy bớt đúng " + target + " hình, hiện đang lấy " + crossed + ", thử lại nhé!";
      resultEl.className = "result-msg is-wrong";
      playResultSound(false);
      return;
    }
    resultEl.textContent = "✅ " + num + " - " + crossed + " = " + remain;
    resultEl.className = "result-msg is-correct";
    speak(numberToWords(num) + " trừ " + numberToWords(crossed) + " bằng " + numberToWords(remain));
    submitMathAttempt("math-tachgop-tru", 1, 1, startedAt, [{ number: num, target: target, removed: crossed, remain: remain }]);
  });

  if (autoSpeak) {
    speak(speakText);
  }
}
