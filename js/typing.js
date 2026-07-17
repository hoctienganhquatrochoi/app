function isAutoTypingChar(ch) {
  return ch === " " || /[.,!?;:]/.test(ch);
}

function shuffleWordLetters(word) {
  var letters = word.split("");
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

function renderTyping(container, items, unitId, maxQuestions, mode) {
  var pool = pickQuestionPool(items, maxQuestions);
  var qIndex = 0;
  var score = 0;
  var answersLog = [];
  var startedAt = new Date();
  var blanks = [];
  var tiles = [];
  var firstAttemptDone = false;
  var firstAttemptCorrect = false;
  var activityType = mode === "hint" ? "typing-hint" : "typing-blank";
  var keyInputEl = null;
  var keyboardModeEnabled = false;
  var timerIntervalId = startActivityTimer(startedAt);

  function setupQuestion() {
    var item = pool[qIndex];
    var letters = item.en.split("");
    blanks = letters.map(function (ch) {
      return isAutoTypingChar(ch) ? { id: "auto", char: ch, used: true, auto: true } : null;
    });
    var tileChars = letters.filter(function (ch) {
      return !isAutoTypingChar(ch);
    }).join("");
    var shuffled = shuffleWordLetters(tileChars);
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

    wrap.appendChild(buildActivityHeader(startedAt, score));

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "▶";
    audioBtn.addEventListener("click", function () {
      playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
    });
    wrap.appendChild(audioBtn);

    var hasVisual = !!(item.imageUrl || item.emoji);
    if (hasVisual) {
      wrap.appendChild(buildVisualElement(item, "ty-emoji"));
    }

    var line = document.createElement("div");
    line.className = "ty-meaning" + (hasVisual ? "" : " no-visual");
    line.textContent = mode === "hint" ? (item.en + " " + (item.phonetic || "") + " - " + capitalizeFirst(item.vi)) : capitalizeFirst(item.vi);
    wrap.appendChild(line);

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

    var toggleLabel = document.createElement("label");
    toggleLabel.className = "ty-keyboard-toggle";
    var toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = keyboardModeEnabled;
    toggleCheckbox.addEventListener("change", function () {
      keyboardModeEnabled = toggleCheckbox.checked;
      draw();
    });
    toggleLabel.appendChild(toggleCheckbox);
    toggleLabel.appendChild(document.createTextNode(" Dùng bàn phím máy tính để gõ (tắt sẵn để dùng trên điện thoại/máy tính bảng)"));
    wrap.appendChild(toggleLabel);

    var hint = document.createElement("div");
    hint.className = "ty-hint";
    hint.textContent = keyboardModeEnabled ? "Bấm vào ô chữ ở trên, hoặc gõ bàn phím trực tiếp" : "Bấm vào ô chữ ở trên để ghép từ";
    wrap.appendChild(hint);

    keyInputEl = null;
    if (keyboardModeEnabled) {
      keyInputEl = document.createElement("input");
      keyInputEl.type = "text";
      keyInputEl.className = "ty-key-input";
      keyInputEl.autocapitalize = "off";
      keyInputEl.autocomplete = "off";
      keyInputEl.spellcheck = false;
      keyInputEl.addEventListener("input", function () {
        var ch = keyInputEl.value.slice(-1).toLowerCase();
        keyInputEl.value = "";
        if (ch) {
          tryFillLetter(ch);
        }
      });
      keyInputEl.addEventListener("keydown", function (e) {
        if (e.key === "Backspace") {
          removeLastFilledBlank();
        }
      });
      wrap.appendChild(keyInputEl);
    }

    wrap.appendChild(buildProgressFooter(qIndex + 1, pool.length));
    container.appendChild(wrap);
    if (keyboardModeEnabled && keyInputEl) {
      keyInputEl.focus();
    }
  }

  function firstEmptyBlankIndex() {
    var i;
    for (i = 0; i < blanks.length; i++) {
      if (!blanks[i]) {
        return i;
      }
    }
    return -1;
  }

  function allBlanksFilled() {
    return firstEmptyBlankIndex() === -1;
  }

  function fillBlankWithTile(tile) {
    var emptyIndex = firstEmptyBlankIndex();
    if (emptyIndex === -1) {
      return;
    }
    blanks[emptyIndex] = tile;
    tile.used = true;

    if (allBlanksFilled()) {
      checkAnswer();
    } else {
      draw();
    }
  }

  function tryFillLetter(ch) {
    var i;
    for (i = 0; i < tiles.length; i++) {
      if (!tiles[i].used && tiles[i].char.toLowerCase() === ch.toLowerCase()) {
        fillBlankWithTile(tiles[i]);
        return;
      }
    }
  }

  function removeLastFilledBlank() {
    var i;
    for (i = blanks.length - 1; i >= 0; i--) {
      if (blanks[i] && !blanks[i].auto) {
        var tileId = blanks[i].id;
        var t;
        for (t = 0; t < tiles.length; t++) {
          if (tiles[t].id === tileId) {
            tiles[t].used = false;
          }
        }
        blanks[i] = null;
        draw();
        return;
      }
    }
  }

  function buildBlankSlot(index) {
    var b = blanks[index];
    var slot = document.createElement("button");
    var className = "ty-blank" + (b ? " filled" : "");
    if (b && b.auto) {
      className += " auto" + (b.char === " " ? " space" : "");
    }
    slot.className = className;
    slot.type = "button";
    slot.textContent = b ? b.char : "";
    if (b && !b.auto) {
      slot.addEventListener("click", function () {
        var filledTileId = b.id;
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
      fillBlankWithTile(tile);
    });
    return btn;
  }

  function checkAnswer() {
    var item = pool[qIndex];
    var attempt = blanks.map(function (b) {
      return b.char;
    }).join("");
    var target = item.en;
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
    draw();
    var blanksEls = container.querySelectorAll(".ty-blank");
    var i;
    for (i = 0; i < blanksEls.length; i++) {
      blanksEls[i].className += " " + cls;
    }
  }

  function showResult() {
    clearInterval(timerIntervalId);
    submitQuizAttempt(unitId, activityType, score, pool.length, startedAt, answersLog);

    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "quiz-wrap quiz-result";

    var title = document.createElement("h2");
    title.textContent = "Kết quả";
    wrap.appendChild(title);
    wrap.appendChild(buildResultMeta());

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
      timerIntervalId = startActivityTimer(startedAt);
      showQuestion();
    });
    wrap.appendChild(retryBtn);

    container.appendChild(wrap);
  }

  showQuestion();
}
