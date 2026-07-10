function shuffleWordLetters(word) {
  var letters = word.toLowerCase().split("");
  if (letters.length <= 1) {
    return letters;
  }
  var shuffled = shuffleArray(letters);
  var tries = 0;
  while (shuffled.join("") === letters.join("") && tries < 5) {
    shuffled = shuffleArray(letters);
    tries++;
  }
  return shuffled;
}

function renderTypingHint(container, items, unitId, maxQuestions) {
  var pool = pickQuestionPool(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var startedAt = new Date();
  var blanks = [];
  var tiles = [];
  var firstAttemptCorrect = false;
  var firstAttemptDone = false;

  function setupQuestion() {
    var item = pool[qIndex];
    var letters = item.en.toLowerCase().split("");
    blanks = letters.map(function () {
      return null;
    });
    var shuffled = shuffleWordLetters(item.en);
    tiles = shuffled.map(function (ch, i) {
      return { id: i, char: ch, used: false };
    });
    firstAttemptDone = false;
    firstAttemptCorrect = false;
  }

  function showQuestion() {
    setupQuestion();
    draw();
    var item = pool[qIndex];
    playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
  }

  function draw() {
    container.innerHTML = "";
    var item = pool[qIndex];

    var wrap = document.createElement("div");
    wrap.className = "ty-wrap";

    var header = document.createElement("div");
    header.className = "quiz-header";
    var counter = document.createElement("span");
    counter.textContent = "Câu " + (qIndex + 1) + " / " + pool.length;
    header.appendChild(counter);
    var scoreEl = document.createElement("span");
    scoreEl.textContent = "Đúng: " + score;
    header.appendChild(scoreEl);
    wrap.appendChild(header);

    wrap.appendChild(buildVisualElement(item, "ty-emoji"));

    var meaning = document.createElement("div");
    meaning.className = "ty-meaning";
    meaning.textContent = item.vi;
    wrap.appendChild(meaning);

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
    });
    wrap.appendChild(audioBtn);

    var blanksEl = document.createElement("div");
    blanksEl.className = "ty-blanks";
    var i;
    for (i = 0; i < blanks.length; i++) {
      blanksEl.appendChild(buildBlankSlot(i));
    }
    wrap.appendChild(blanksEl);

    var tilesEl = document.createElement("div");
    tilesEl.className = "ty-tiles";
    for (i = 0; i < tiles.length; i++) {
      tilesEl.appendChild(buildTile(tiles[i]));
    }
    wrap.appendChild(tilesEl);

    container.appendChild(wrap);
  }

  function buildBlankSlot(index) {
    var slot = document.createElement("button");
    slot.className = "ty-blank" + (blanks[index] ? " filled" : "");
    slot.type = "button";
    slot.textContent = blanks[index] ? blanks[index].char : "";
    if (blanks[index]) {
      slot.addEventListener("click", function () {
        var filledTileId = blanks[index].id;
        var i;
        for (i = 0; i < tiles.length; i++) {
          if (tiles[i].id === filledTileId) {
            tiles[i].used = false;
          }
        }
        blanks[index] = null;
        draw();
      });
    }
    return slot;
  }

  function buildTile(tile) {
    var btn = document.createElement("button");
    btn.className = "ty-tile" + (tile.used ? " used" : "");
    btn.type = "button";
    btn.textContent = tile.char;
    btn.disabled = tile.used;
    btn.addEventListener("click", function () {
      var emptyIndex = -1;
      var i;
      for (i = 0; i < blanks.length; i++) {
        if (!blanks[i]) {
          emptyIndex = i;
          break;
        }
      }
      if (emptyIndex === -1) {
        return;
      }
      blanks[emptyIndex] = tile;
      tile.used = true;

      var allFilled = true;
      for (i = 0; i < blanks.length; i++) {
        if (!blanks[i]) {
          allFilled = false;
        }
      }

      draw();

      if (allFilled) {
        checkAnswer();
      }
    });
    return btn;
  }

  function checkAnswer() {
    var item = pool[qIndex];
    var attempt = blanks.map(function (b) {
      return b.char;
    }).join("");
    var target = item.en.toLowerCase();
    var isCorrect = attempt === target;

    if (!firstAttemptDone) {
      firstAttemptDone = true;
      firstAttemptCorrect = isCorrect;
    }

    if (isCorrect) {
      score++;
      answersLog.push({
        vocab_id: item.id,
        word_en: item.en,
        selected_label: attempt,
        is_correct: firstAttemptCorrect
      });
      flashBlanks("correct");
      setTimeout(function () {
        if (qIndex < pool.length - 1) {
          qIndex++;
          showQuestion();
        } else {
          showResult();
        }
      }, 1200);
    } else {
      flashBlanks("wrong");
      setTimeout(function () {
        var i;
        for (i = 0; i < tiles.length; i++) {
          tiles[i].used = false;
        }
        for (i = 0; i < blanks.length; i++) {
          blanks[i] = null;
        }
        draw();
      }, 900);
    }
  }

  function flashBlanks(cls) {
    var blanksEls = container.querySelectorAll(".ty-blank");
    var i;
    for (i = 0; i < blanksEls.length; i++) {
      blanksEls[i].className += " " + cls;
    }
  }

  function showResult() {
    submitQuizAttempt(unitId, "typing-hint", score, pool.length, startedAt, answersLog);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);

    var scoreBig = document.createElement("div");
    scoreBig.className = "score-big";
    scoreBig.textContent = score + " / " + pool.length;
    wrap.appendChild(scoreBig);

    var p = document.createElement("p");
    p.textContent = "Bé đã ghép đúng hết " + pool.length + " từ!";
    wrap.appendChild(p);

    var retryBtn = document.createElement("button");
    retryBtn.className = "quiz-continue-btn";
    retryBtn.type = "button";
    retryBtn.textContent = "Làm lại";
    retryBtn.addEventListener("click", function () {
      pool = pickQuestionPool(items, maxQuestions);
      qIndex = 0;
      score = 0;
      answersLog = [];
      startedAt = new Date();
      showQuestion();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showQuestion();
}
