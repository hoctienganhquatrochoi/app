var VN_NUMBER_WORDS = [
  "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười",
  "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín", "hai mươi"
];

function numberToWords(n) {
  return VN_NUMBER_WORDS[n] || String(n);
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

// Plain bold color circles - simple, big, easy for preschoolers to read at a glance.
var ICON_SETS = [
  { name: "hình tròn đỏ", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#E63946" stroke="#C62839" stroke-width="2"/></svg>' },
  { name: "hình tròn xanh dương", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#32A0FF" stroke="#1C7FDB" stroke-width="2"/></svg>' },
  { name: "hình tròn xanh lá", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#49B800" stroke="#388F00" stroke-width="2"/></svg>' },
  { name: "hình tròn vàng", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#FFD700" stroke="#DAA520" stroke-width="2"/></svg>' },
  { name: "hình tròn cam", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#FF8300" stroke="#DB6F00" stroke-width="2"/></svg>' },
  { name: "hình tròn tím", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#AB47BC" stroke="#8E24AA" stroke-width="2"/></svg>' },
  { name: "hình tròn hồng", svg: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#EC407A" stroke="#D81B60" stroke-width="2"/></svg>' }
];

function randomIcon() {
  return ICON_SETS[Math.floor(Math.random() * ICON_SETS.length)];
}

// Two distinct colors, for exercises with two separate groups (e.g. Nâng cao, Gộp).
function randomIconPair() {
  var i1 = Math.floor(Math.random() * ICON_SETS.length);
  var i2 = Math.floor(Math.random() * (ICON_SETS.length - 1));
  if (i2 >= i1) {
    i2++;
  }
  return [ICON_SETS[i1], ICON_SETS[i2]];
}

// Pulls one value from a shuffled "bag" so every possibility in generateItems() shows up
// once before any repeats. bagStore/key let callers keep a separate bag per number/anchor.
function nextFromBag(bagStore, key, generateItems) {
  var bag = bagStore[key];
  if (!bag || bag.length === 0) {
    bag = generateItems().slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }
    bagStore[key] = bag;
  }
  return bagStore[key].pop();
}

// Keeps a source pool showing its full original count even as real items get dragged out:
// removes old fade markers, then tops back up with faded/crossed placeholders so
// (real items) + (placeholders) === originalCount. Call after every drag in that pool.
function syncPlaceholders(poolEl, originalCount, iconSvg, sizeClass) {
  var existing = poolEl.querySelectorAll(".used-placeholder");
  for (var i = 0; i < existing.length; i++) {
    existing[i].remove();
  }
  var realCount = poolEl.querySelectorAll(".drag-icon:not(.used-placeholder)").length;
  var missing = originalCount - realCount;
  for (var j = 0; j < missing; j++) {
    var ph = document.createElement("div");
    ph.className = "drag-icon used-placeholder " + (sizeClass || "");
    ph.innerHTML = iconSvg;
    poolEl.appendChild(ph);
  }
}

// Shrink icons a bit once a group needs more than one row, so bigger counts don't push
// the rest of the screen (basket, done button) out of view.
function iconSizeClass(count) {
  return count > 5 ? "compact" : "";
}

// Renders `count` copies of an icon into container, wrapped 5-per-row.
function renderCountIcons(container, count, iconSvg, iconClass) {
  container.innerHTML = "";
  var remaining = count;
  while (remaining > 0) {
    var rowCount = Math.min(5, remaining);
    var row = document.createElement("div");
    row.className = "icon-row";
    for (var i = 0; i < rowCount; i++) {
      var span = document.createElement("span");
      span.className = iconClass || "count-icon";
      span.innerHTML = iconSvg;
      row.appendChild(span);
    }
    container.appendChild(row);
    remaining -= rowCount;
  }
}

// Prompt text + speaker button on one row, to save vertical space.
function buildPromptRow(html, speakText) {
  var row = document.createElement("div");
  row.className = "prompt-row";

  var textEl = document.createElement("div");
  textEl.className = "prompt-text";
  textEl.innerHTML = html;
  row.appendChild(textEl);

  var audioBtn = document.createElement("button");
  audioBtn.className = "audio-btn";
  audioBtn.type = "button";
  audioBtn.textContent = "🔊";
  audioBtn.addEventListener("click", function () { speak(speakText); });
  row.appendChild(audioBtn);

  return row;
}

function playResultSound(isCorrect) {
  speak(isCorrect ? "Chính xác! Bé giỏi quá!" : "Chưa đúng, bé thử lại nhé!");
}

async function submitMathAttempt(activityType, score, total, startedAt, answers) {
  if (!currentStudent) {
    return;
  }
  await supabaseClient.from("game_quiz_attempts").insert({
    student_id: currentStudent.id,
    unit_id: "math-preschool",
    activity_type: activityType,
    score: score,
    total: total,
    started_at: startedAt.toISOString(),
    answers: answers || []
  });
}
