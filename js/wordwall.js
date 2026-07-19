var WORDWALL_HEARTBEAT_MS = 5000;
var activeWordwallTracker = null;

async function logWordwallOpen(unitId, wordwallName) {
  if (!currentStudent) {
    return null;
  }
  var result = await supabaseClient.from("game_wordwall_opens").insert({
    student_id: currentStudent.id,
    unit_id: unitId,
    wordwall_name: wordwallName
  }).select().single();
  if (result.error) {
    console.error("logWordwallOpen failed:", result.error);
    return null;
  }
  return result.data.id;
}

function updateWordwallDuration(rowId, startedAt) {
  var elapsed = Math.floor((Date.now() - startedAt) / 1000);
  supabaseClient.from("game_wordwall_opens").update({ duration_seconds: elapsed }).eq("id", rowId).then(function (result) {
    if (result.error) {
      console.error("updateWordwallDuration failed:", result.error);
    }
  });
}

function startWordwallTracker(rowId) {
  var startedAt = Date.now();
  var intervalId = setInterval(function () {
    updateWordwallDuration(rowId, startedAt);
  }, WORDWALL_HEARTBEAT_MS);

  return {
    stop: function () {
      clearInterval(intervalId);
      updateWordwallDuration(rowId, startedAt);
    }
  };
}

function stopActiveWordwallTracker() {
  if (activeWordwallTracker) {
    activeWordwallTracker.stop();
    activeWordwallTracker = null;
  }
}

async function renderWordwallActivity(container, breadcrumbText, embedUrl, unitId, wordwallName) {
  stopActiveWordwallTracker();

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

  var rowId = await logWordwallOpen(unitId, wordwallName);
  if (rowId) {
    activeWordwallTracker = startWordwallTracker(rowId);
  }
}

window.addEventListener("beforeunload", function () {
  stopActiveWordwallTracker();
});
