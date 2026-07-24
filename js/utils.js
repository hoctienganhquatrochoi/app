function stripParentheticalForSpeech(text) {
  return (text || "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function normalizeQuoteChars(str) {
  return (str || "").replace(/[‘’ʼʻ´`]/g, "'").replace(/[“”]/g, "\"");
}

async function fetchAllRows(buildQuery) {
  var pageSize = 500;
  var from = 0;
  var all = [];
  while (true) {
    var result = await buildQuery().range(from, from + pageSize - 1);
    if (result.error) {
      return { error: result.error };
    }
    var rows = result.data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }
  return { data: all };
}

function speak(text, lang) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(stripParentheticalForSpeech(text));
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

function capitalizeFirst(str) {
  if (!str) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function appendTextWithUnderline(el, text) {
  var parts = (text || "").split("_");
  var i;
  for (i = 0; i < parts.length; i++) {
    if (!parts[i]) {
      continue;
    }
    if (i % 2 === 1) {
      var span = document.createElement("span");
      span.className = "underline-text";
      span.textContent = parts[i];
      el.appendChild(span);
    } else {
      el.appendChild(document.createTextNode(parts[i]));
    }
  }
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

var currentActivityTimerId = null;

function startActivityTimer(startedAt) {
  if (currentActivityTimerId) {
    clearInterval(currentActivityTimerId);
  }
  currentActivityTimerId = setInterval(function () {
    var el = document.getElementById("activity-timer");
    if (!el) {
      clearInterval(currentActivityTimerId);
      currentActivityTimerId = null;
      return;
    }
    el.textContent = formatElapsed(startedAt);
  }, 1000);
  return currentActivityTimerId;
}

function buildActivityHeader(startedAt, score) {
  var header = document.createElement("div");
  header.className = "quiz-header";
  header.appendChild(buildTimerEl(startedAt));

  var scoreEl = document.createElement("span");
  scoreEl.className = "quiz-score";
  scoreEl.textContent = "✓ " + score;
  header.appendChild(scoreEl);

  return header;
}

function buildProgressFooter(current, total) {
  var el = document.createElement("div");
  el.className = "quiz-progress-footer";
  el.textContent = "Câu " + current + " / " + total;
  return el;
}

function buildResultMeta(activityLabel) {
  var wrap = document.createElement("div");
  wrap.className = "result-meta";

  var name = currentStudent ? currentStudent.full_name : "Khách";
  var nameEl = document.createElement("div");
  nameEl.className = "result-meta-name";
  nameEl.textContent = "🌟 " + name;
  wrap.appendChild(nameEl);

  if (activityLabel) {
    var activityEl = document.createElement("div");
    activityEl.className = "result-meta-activity";
    activityEl.textContent = activityLabel;
    wrap.appendChild(activityEl);
  }

  var d = new Date();
  var dd = d.getDate() < 10 ? "0" + d.getDate() : "" + d.getDate();
  var mm = (d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : "" + (d.getMonth() + 1);
  var hh = d.getHours() < 10 ? "0" + d.getHours() : "" + d.getHours();
  var mi = d.getMinutes() < 10 ? "0" + d.getMinutes() : "" + d.getMinutes();
  var dateEl = document.createElement("div");
  dateEl.className = "result-meta-date";
  dateEl.textContent = hh + ":" + mi + " " + dd + "/" + mm + "/" + d.getFullYear();
  wrap.appendChild(dateEl);

  return wrap;
}

function formatSecondsVN(totalSeconds) {
  var seconds = Math.max(0, Math.floor(totalSeconds || 0));
  var minutes = Math.floor(seconds / 60);
  var rem = seconds % 60;
  if (minutes > 0) {
    return minutes + " phút " + rem + " giây";
  }
  return rem + " giây";
}

function formatDurationVN(startedAt) {
  var totalSeconds = Math.max(0, Math.floor((new Date() - startedAt) / 1000));
  return formatSecondsVN(totalSeconds);
}

function buildDurationLine(startedAt) {
  var el = document.createElement("div");
  el.className = "result-extra-line";
  el.textContent = "⏱ Thời gian làm bài: " + formatDurationVN(startedAt);
  return el;
}

var activeTabSwitchTracker = null;

function startTabSwitchTracker() {
  if (activeTabSwitchTracker) {
    activeTabSwitchTracker.stop();
  }
  var count = 0;
  function handler() {
    if (document.hidden) {
      count++;
    }
  }
  document.addEventListener("visibilitychange", handler);
  var tracker = {
    getCount: function () {
      return count;
    },
    stop: function () {
      document.removeEventListener("visibilitychange", handler);
      if (activeTabSwitchTracker === tracker) {
        activeTabSwitchTracker = null;
      }
    }
  };
  activeTabSwitchTracker = tracker;
  return tracker;
}

function buildTabSwitchLine(count) {
  var el = document.createElement("div");
  el.className = "result-extra-line" + (count > 0 ? " result-extra-warn" : "");
  el.textContent = count > 0
    ? "👀 Đã rời khỏi màn hình " + count + " lần trong khi làm bài"
    : "👀 Không rời khỏi màn hình trong khi làm bài";
  return el;
}

function buildAnswerBreakdown(answersLog) {
  var wrap = document.createElement("div");
  wrap.className = "answer-breakdown";
  answersLog.forEach(function (a, idx) {
    var dot = document.createElement("span");
    dot.className = "answer-dot " + (a.is_correct ? "answer-dot-correct" : "answer-dot-wrong");
    dot.title = a.word_en;
    dot.textContent = "" + (idx + 1);
    wrap.appendChild(dot);
  });
  return wrap;
}
