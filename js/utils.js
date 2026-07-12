function speak(text, lang) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  window.speechSynthesis.speak(utter);
}

function playAudioUrlOrSpeak(url, text, lang) {
  if (url) {
    var audio = new Audio(url);
    audio.play();
    return;
  }
  speak(text, lang);
}

function shuffleArray(arr) {
  var copy = arr.slice();
  var i, j, tmp;
  for (i = copy.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function buildResultIcon(isCorrect) {
  var icon = document.createElement("span");
  icon.className = "option-icon " + (isCorrect ? "option-icon-correct" : "option-icon-wrong");
  icon.textContent = isCorrect ? "✓" : "✗";
  return icon;
}

function pickRandomDistractors(pool, correctItem, count) {
  var candidates = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    if (pool[i].id !== correctItem.id) {
      candidates.push(pool[i]);
    }
  }
  candidates = shuffleArray(candidates);
  return candidates.slice(0, count);
}

function buildVisualElement(item, sizeClass) {
  var frame = document.createElement("div");
  frame.className = "vocab-visual-frame" + (sizeClass ? " " + sizeClass : "");

  if (item.imageUrl) {
    var img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.en;
    img.className = "vocab-image";
    frame.appendChild(img);
  } else {
    var span = document.createElement("span");
    span.className = "vocab-emoji";
    span.textContent = item.emoji;
    frame.appendChild(span);
  }

  return frame;
}

function pickQuestionPool(items, maxQuestions) {
  if (!maxQuestions || items.length <= maxQuestions) {
    return shuffleArray(items);
  }
  return shuffleArray(items).slice(0, maxQuestions);
}

function formatElapsed(startedAt) {
  var elapsedSec = Math.max(0, Math.floor((new Date() - startedAt) / 1000));
  var mm = Math.floor(elapsedSec / 60);
  var ss = elapsedSec % 60;
  return "⏱ " + mm + ":" + (ss < 10 ? "0" : "") + ss;
}

function buildTimerEl(startedAt) {
  var el = document.createElement("span");
  el.className = "activity-timer";
  el.id = "activity-timer";
  el.textContent = formatElapsed(startedAt);
  return el;
}

function startActivityTimer(startedAt) {
  return setInterval(function () {
    var el = document.getElementById("activity-timer");
    if (!el) {
      return;
    }
    el.textContent = formatElapsed(startedAt);
  }, 1000);
}
