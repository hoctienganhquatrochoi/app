function logWordwallOpen(unitId, wordwallName) {
  if (!currentStudent) {
    return;
  }
  supabaseClient.from("game_wordwall_opens").insert({
    student_id: currentStudent.id,
    unit_id: unitId,
    wordwall_name: wordwallName
  }).then(function (result) {
    if (result.error) {
      console.error("logWordwallOpen failed:", result.error);
    }
  });
}

function renderWordwallActivity(container, breadcrumbText, embedUrl, unitId, wordwallName) {
  container.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "ww-wrap";

  var iframe = document.createElement("iframe");
  iframe.className = "ww-iframe";
  iframe.src = embedUrl;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "true");
  wrap.appendChild(iframe);

  container.appendChild(wrap);
  logWordwallOpen(unitId, wordwallName);
}
