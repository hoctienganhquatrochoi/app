MODES.tapdem = {
  label: "Tập đếm",
  icon: "🌸",
  range: [1, 10],
  onSelect: function (num, contentEl) {
    contentEl.innerHTML = "";
    var icon = randomIcon();
    var startedAt = new Date();

    var wrap = document.createElement("div");
    wrap.className = "tapdem-wrap";

    wrap.appendChild(buildPromptRow(
      "Kéo đủ <b>" + num + "</b> " + icon.name + " vào ô phía dưới nhé!",
      "Kéo " + numberToWords(num) + " " + icon.name + " vào ô phía dưới nhé"
    ));

    var poolLabel = document.createElement("div");
    poolLabel.className = "section-label";
    poolLabel.textContent = "Kho hình:";
    wrap.appendChild(poolLabel);

    var pool = document.createElement("div");
    pool.className = "drop-pool";
    wrap.appendChild(pool);

    var basketLabel = document.createElement("div");
    basketLabel.className = "section-label";
    basketLabel.textContent = "Ô của bé:";
    wrap.appendChild(basketLabel);

    var basket = document.createElement("div");
    basket.className = "drop-pool drop-basket";
    wrap.appendChild(basket);

    var counter = document.createElement("div");
    counter.className = "tapdem-counter";
    wrap.appendChild(counter);

    var doneBtn = document.createElement("button");
    doneBtn.className = "primary-btn";
    doneBtn.type = "button";
    doneBtn.textContent = "✅ Hoàn thành";
    wrap.appendChild(doneBtn);

    var resultEl = document.createElement("div");
    resultEl.className = "result-msg";
    wrap.appendChild(resultEl);

    contentEl.appendChild(wrap);

    var poolSize = Math.min(10, num + 4);
    var sizeClass = iconSizeClass(poolSize);
    for (var i = 0; i < poolSize; i++) {
      var item = document.createElement("div");
      item.className = "drag-icon " + sizeClass;
      item.innerHTML = icon.svg;
      pool.appendChild(item);
      makeDraggable(item, function () { return [pool, basket]; }, updateCounter);
    }

    function updateCounter() {
      counter.textContent = "Trong ô: " + basket.children.length;
    }
    updateCounter();

    doneBtn.addEventListener("click", function () {
      var count = basket.children.length;
      var correct = count === num;
      resultEl.textContent = correct
        ? "✅ Chính xác! " + num + " " + icon.name
        : "❌ Trong ô có " + count + ", chưa đúng, thử lại nhé!";
      resultEl.className = "result-msg " + (correct ? "is-correct" : "is-wrong");
      playResultSound(correct);
      submitMathAttempt("math-tapdem", correct ? 1 : 0, 1, startedAt, [{ number: num, dragged: count, is_correct: correct }]);
    });

    speak("Kéo " + numberToWords(num) + " " + icon.name + " vào ô phía dưới nhé");
  }
};
