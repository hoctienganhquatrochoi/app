function renderFlashcard(container, breadcrumbText, items) {
  var index = 0;
  var flipped = false;

  function draw() {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "fc-wrap";

    var crumb = document.createElement("div");
    crumb.className = "breadcrumb";
    crumb.textContent = breadcrumbText;
    wrap.appendChild(crumb);

    var title = document.createElement("h2");
    title.textContent = "Thẻ đọc";
    wrap.appendChild(title);

    var progress = document.createElement("div");
    progress.className = "fc-progress";
    progress.textContent = "Thẻ " + (index + 1) + " / " + items.length;
    wrap.appendChild(progress);

    var item = items[index];

    var card = document.createElement("div");
    card.className = "fc-card";

    var emoji = document.createElement("div");
    emoji.className = "fc-emoji";
    emoji.textContent = item.emoji;
    card.appendChild(emoji);

    if (!flipped) {
      var word = document.createElement("div");
      word.className = "fc-word";
      word.textContent = item.en;
      card.appendChild(word);

      var audioBtn = document.createElement("button");
      audioBtn.className = "audio-btn fc-audio-btn";
      audioBtn.type = "button";
      audioBtn.textContent = "▶";
      audioBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        playAudioUrlOrSpeak(item.audioEnUrl, item.en, "en-US");
      });
      card.appendChild(audioBtn);

      var hint = document.createElement("div");
      hint.className = "fc-hint";
      hint.textContent = "Chạm vào thẻ để xem nghĩa tiếng Việt";
      card.appendChild(hint);
    } else {
      var phonetic = document.createElement("div");
      phonetic.className = "fc-phonetic";
      phonetic.textContent = item.phonetic;
      card.appendChild(phonetic);

      var meaning = document.createElement("div");
      meaning.className = "fc-meaning";
      meaning.textContent = item.vi;
      card.appendChild(meaning);

      var audioBtnVi = document.createElement("button");
      audioBtnVi.className = "audio-btn fc-audio-btn";
      audioBtnVi.type = "button";
      audioBtnVi.textContent = "▶";
      audioBtnVi.addEventListener("click", function (e) {
        e.stopPropagation();
        playAudioUrlOrSpeak(item.audioViUrl, item.vi, "vi-VN");
      });
      card.appendChild(audioBtnVi);

      var hintBack = document.createElement("div");
      hintBack.className = "fc-hint";
      hintBack.textContent = "Chạm vào thẻ để quay lại";
      card.appendChild(hintBack);
    }

    card.addEventListener("click", function () {
      flipped = !flipped;
      draw();
    });

    wrap.appendChild(card);

    var nav = document.createElement("div");
    nav.className = "fc-nav";

    var prevBtn = document.createElement("button");
    prevBtn.className = "btn-prev";
    prevBtn.type = "button";
    prevBtn.textContent = "← Trước";
    prevBtn.disabled = index === 0;
    prevBtn.addEventListener("click", function () {
      if (index > 0) {
        index--;
        flipped = false;
        draw();
      }
    });
    nav.appendChild(prevBtn);

    var nextBtn = document.createElement("button");
    nextBtn.className = "btn-next";
    nextBtn.type = "button";
    nextBtn.textContent = index === items.length - 1 ? "Hoàn thành" : "Tiếp theo →";
    nextBtn.addEventListener("click", function () {
      if (index < items.length - 1) {
        index++;
        flipped = false;
        draw();
      } else {
        showComplete();
      }
    });
    nav.appendChild(nextBtn);

    wrap.appendChild(nav);
    container.appendChild(wrap);
  }

  function showComplete() {
    var overlay = document.createElement("div");
    overlay.className = "fc-overlay";

    var popup = document.createElement("div");
    popup.className = "fc-popup";

    var h3 = document.createElement("h3");
    h3.textContent = "🎉 Hoàn thành!";
    popup.appendChild(h3);

    var p = document.createElement("p");
    p.textContent = "Bé đã học xong " + items.length + " từ trong bài này.";
    popup.appendChild(p);

    var actions = document.createElement("div");
    actions.className = "fc-popup-actions";

    var againBtn = document.createElement("button");
    againBtn.className = "btn-next";
    againBtn.type = "button";
    againBtn.textContent = "Học lại";
    againBtn.addEventListener("click", function () {
      index = 0;
      flipped = false;
      overlay.remove();
      draw();
    });
    actions.appendChild(againBtn);

    var closeBtn = document.createElement("button");
    closeBtn.className = "btn-prev";
    closeBtn.type = "button";
    closeBtn.textContent = "Xem lại thẻ cuối";
    closeBtn.addEventListener("click", function () {
      overlay.remove();
    });
    actions.appendChild(closeBtn);

    popup.appendChild(actions);
    overlay.appendChild(popup);
    container.appendChild(overlay);
  }

  draw();
}
