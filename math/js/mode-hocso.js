MODES.hocso = {
  label: "Học số",
  icon: "🔢",
  range: [1, 10],
  onSelect: function (num, contentEl) {
    contentEl.innerHTML = "";
    var icon = randomIcon();

    var card = document.createElement("div");
    card.className = "hocso-card";

    var topRow = document.createElement("div");
    topRow.className = "hocso-top-row";

    var numberBox = document.createElement("div");
    numberBox.className = "hocso-number-box";
    numberBox.textContent = num;
    topRow.appendChild(numberBox);

    var audioBtn = document.createElement("button");
    audioBtn.className = "audio-btn";
    audioBtn.type = "button";
    audioBtn.textContent = "🔊";
    audioBtn.addEventListener("click", function () {
      speak("Số " + numberToWords(num));
    });
    topRow.appendChild(audioBtn);

    card.appendChild(topRow);

    var iconsWrap = document.createElement("div");
    iconsWrap.className = "icons-wrap";
    renderCountIcons(iconsWrap, num, icon.svg, "count-icon " + iconSizeClass(num));
    card.appendChild(iconsWrap);

    var label = document.createElement("div");
    label.className = "hocso-label";
    label.textContent = num + " " + icon.name;
    card.appendChild(label);

    contentEl.appendChild(card);
    speak("Số " + numberToWords(num));
  }
};
