function generateMakeTenPair(sum) {
  var aMin = Math.max(6, sum - 9);
  var aMax = Math.min(9, sum - 1);
  if (aMin > aMax) {
    aMin = 1;
    aMax = Math.min(9, sum - 1);
  }
  var a = aMin + Math.floor(Math.random() * (aMax - aMin + 1));
  var b = sum - a;
  return [a, b];
}

MODES.nangcao = {
  label: "Nâng cao",
  icon: "✨",
  range: [10, 18],
  onSelect: function (sum, contentEl) {
    contentEl.innerHTML = "";
    var icon = randomIcon();
    var pair = generateMakeTenPair(sum);
    var a = pair[0];
    var b = pair[1];
    var startedAt = new Date();

    var wrap = document.createElement("div");
    wrap.className = "nangcao-wrap";

    wrap.appendChild(buildPromptRow(
      "Kéo hình từ nhóm 2 lên nhóm 1 cho đủ <b>10</b>, xem còn lại bao nhiêu nhé!",
      "Kéo hình từ nhóm 2 lên nhóm 1 cho đủ mười nhé"
    ));

    var equationTop = document.createElement("div");
    equationTop.className = "nangcao-equation-top";
    equationTop.textContent = a + " + " + b + " = ?";
    wrap.appendChild(equationTop);

    var frameLabel = document.createElement("div");
    frameLabel.className = "section-label";
    frameLabel.textContent = "Nhóm 1 (đang có " + a + "):";
    wrap.appendChild(frameLabel);

    var frame = document.createElement("div");
    frame.className = "drop-pool nangcao-tenframe";
    wrap.appendChild(frame);

    for (var i = 0; i < a; i++) {
      var lockedItem = document.createElement("div");
      lockedItem.className = "drag-icon locked compact";
      lockedItem.innerHTML = icon.svg;
      frame.appendChild(lockedItem);
    }

    var poolLabel = document.createElement("div");
    poolLabel.className = "section-label";
    poolLabel.textContent = "Nhóm 2 (đang có " + b + "):";
    wrap.appendChild(poolLabel);

    var pool = document.createElement("div");
    pool.className = "drop-pool";
    wrap.appendChild(pool);

    for (var j = 0; j < b; j++) {
      var item = document.createElement("div");
      item.className = "drag-icon compact";
      item.innerHTML = icon.svg;
      pool.appendChild(item);
      makeDraggable(item, function () { return [pool, frame]; }, updateStatus);
    }

    var statusEl = document.createElement("div");
    statusEl.className = "nangcao-status";
    wrap.appendChild(statusEl);

    var doneBtn = document.createElement("button");
    doneBtn.className = "primary-btn";
    doneBtn.type = "button";
    doneBtn.textContent = "✅ Hoàn thành";
    wrap.appendChild(doneBtn);

    var resultEl = document.createElement("div");
    resultEl.className = "result-msg";
    wrap.appendChild(resultEl);

    contentEl.appendChild(wrap);

    function updateStatus() {
      statusEl.textContent = "Nhóm 1: " + frame.children.length + " | Nhóm 2 còn: " + pool.children.length;
    }
    updateStatus();

    doneBtn.addEventListener("click", function () {
      var frameCount = frame.children.length;
      var poolCount = pool.children.length;
      var correct = frameCount === 10 && (frameCount + poolCount === sum);
      if (!correct) {
        resultEl.textContent = "❌ Kéo cho nhóm 1 đủ 10 hình đã nhé, thử lại!";
        resultEl.className = "result-msg is-wrong";
        playResultSound(false);
        return;
      }
      resultEl.textContent = "✅ 10 + " + poolCount + " = " + sum + "  (" + a + " + " + b + " = " + sum + ")";
      resultEl.className = "result-msg is-correct";
      speak(numberToWords(a) + " cộng " + numberToWords(b) + " bằng " + numberToWords(sum));
      submitMathAttempt("math-nangcao", 1, 1, startedAt, [{ a: a, b: b, sum: sum }]);
    });

    speak("Kéo hình từ nhóm 2 lên nhóm 1 cho đủ mười nhé");
  }
};
