function renderFlipCard(container, breadcrumbText, items, unitId) {
  var pool = shuffleArray(items);
  var retryQueue = [];
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var firstAttemptResult = {};
  var startedAt = new Date();
  var flipped = false;
  var timerIntervalId = startActivityTimer(startedAt);

  function showCard() {
    flipped = false;
    draw();
    var item = pool[qIndex];
    playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
  }

  function draw() {
    container.innerHTML = "";
    var item = pool[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";

    wrap.appendChild(buildActivityHeader(startedAt, score));

    var progress = document.createElement("div");
    progress.className = "fc-progress";
    progress.textContent = "Thẻ " + (qIndex + 1) + " / " + pool.length;
    wrap.appendChild(progress);

    var card = document.createElement("div");
    card.className = "fc-card flip-card";

    if (!flipped) {
      var audioBtn = document.createElement("button");
      audioBtn.className = "audio-btn fc-audio-btn";
      audioBtn.type = "button";
      audioBtn.textContent = "▶";
      audioBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
      });
      card.appendChild(audioBtn);

      var wordLine = document.createElement("div");
      wordLine.className = "fc-word no-visual flip-card-word-front";
      wordLine.textContent = item.en;
      card.appendChild(wordLine);

      if (item.phonetic) {
        var phLine = document.createElement("div");
        phLine.className = "flip-card-phonetic";
        phLine.textContent = item.phonetic;
        card.appendChild(phLine);
      }
    } else {
      var meaningLine = document.createElement("div");
      meaningLine.className = "fc-word no-visual";
      meaningLine.textContent = capitalizeFirst(item.vi);
      card.appendChild(meaningLine);
    }

    card.addEventListener("click", function () {
      flipped = !flipped;
      draw();
    });
    wrap.appendChild(card);

    if (flipped) {
      var actions = document.createElement("div");
      actions.className = "flip-card-actions";

      var wrongBtn = document.createElement("button");
      wrongBtn.className = "flip-btn flip-btn-wrong";
      wrongBtn.type = "button";
      wrongBtn.textContent = "✗ Chưa nhớ";
      wrongBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        answerCard(item, false);
      });
      actions.appendChild(wrongBtn);

      var rightBtn = document.createElement("button");
      rightBtn.className = "flip-btn flip-btn-correct";
      rightBtn.type = "button";
      rightBtn.textContent = "✓ Đã nhớ";
      rightBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        answerCard(item, true);
      });
      actions.appendChild(rightBtn);

      wrap.appendChild(actions);
    } else {
      var hint = document.createElement("div");
      hint.className = "fc-hint";
      hint.textContent = "Chạm vào thẻ để xem nghĩa";
      wrap.appendChild(hint);
    }

    container.appendChild(wrap);
  }

  function answerCard(item, isCorrect) {
    if (firstAttemptResult[item.id] === undefined) {
      firstAttemptResult[item.id] = isCorrect;
      if (isCorrect) {
        score++;
      }
    }
    if (!isCorrect) {
      retryQueue.push(item);
    }

    if (qIndex < pool.length - 1) {
      qIndex++;
      showCard();
    } else if (retryQueue.length) {
      pool = shuffleArray(retryQueue);
      retryQueue = [];
      qIndex = 0;
      showCard();
    } else {
      showResult();
    }
  }

  function showResult() {
    clearInterval(timerIntervalId);

    items.forEach(function (item) {
      answersLog.push({
        vocab_id: item.id,
        word_en: item.en,
        selected_label: firstAttemptResult[item.id] ? "Đã nhớ" : "Chưa nhớ",
        is_correct: !!firstAttemptResult[item.id]
      });
    });
    submitQuizAttempt(unitId, "flip-card", score, items.length, startedAt, answersLog);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + items.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = "Bé đã nhớ được " + score + " / " + items.length + " từ trong bài này.";
    wrap.appendChild(p);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Học lại";
    retryBtn.addEventListener("click", function () {
      pool = shuffleArray(items);
      retryQueue = [];
      qIndex = 0;
      score = 0;
      answersLog = [];
      firstAttemptResult = {};
      startedAt = new Date();
      timerIntervalId = startActivityTimer(startedAt);
      showCard();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showCard();
}
