var WORDWALL_HEARTBEAT_MS = 5000;
var WORDWALL_GAMING_MIN_SECONDS = 15;
var WORDWALL_GAMING_WINDOW_MS = 30 * 60 * 1000;
var WORDWALL_GAMING_THRESHOLD_COUNT = 3;
var activeWordwallTracker = null;

async function checkForWordwallGaming(studentId) {
  var windowStart = new Date(Date.now() - WORDWALL_GAMING_WINDOW_MS).toISOString();
  var recentResult = await supabaseClient
    .from("game_wordwall_opens")
    .select("duration_seconds")
    .eq("student_id", studentId)
    .gte("opened_at", windowStart);
  if (recentResult.error) {
    return;
  }
  var shortCount = (recentResult.data || []).filter(function (row) {
    return typeof row.duration_seconds === "number" && row.duration_seconds < WORDWALL_GAMING_MIN_SECONDS;
  }).length;
  if (shortCount < WORDWALL_GAMING_THRESHOLD_COUNT) {
    return;
  }
  var existingFlag = await supabaseClient
    .from("game_cheat_flags")
    .select("id")
    .eq("student_id", studentId)
    .eq("acknowledged", false)
    .limit(1);
  if (existingFlag.error || (existingFlag.data && existingFlag.data.length)) {
    return;
  }
  await supabaseClient.from("game_cheat_flags").insert({
    student_id: studentId,
    reason: "Mở Wordwall " + shortCount + " lần dưới 15 giây trong vòng 30 phút"
  });
}

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

function startWordwallTracker(rowId, studentId) {
  var startedAt = Date.now();
  var intervalId = setInterval(function () {
    updateWordwallDuration(rowId, startedAt);
  }, WORDWALL_HEARTBEAT_MS);

  return {
    flush: function () {
      updateWordwallDuration(rowId, startedAt);
    },
    stop: function () {
      clearInterval(intervalId);
      updateWordwallDuration(rowId, startedAt);
      checkForWordwallGaming(studentId);
    }
  };
}

function stopActiveWordwallTracker() {
  if (activeWordwallTracker) {
    activeWordwallTracker.stop();
    activeWordwallTracker = null;
  }
}

function flushActiveWordwallTracker() {
  if (activeWordwallTracker) {
    activeWordwallTracker.flush();
  }
}

async function renderWordwallActivity(container, breadcrumbText, embedUrl, unitId, wordwallName) {
  stopActiveWordwallTracker();

  container.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "ww-wrap";

  var aspectBox = document.createElement("div");
  aspectBox.className = "ww-aspect";

  var iframe = document.createElement("iframe");
  iframe.className = "ww-iframe";
  iframe.src = embedUrl;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "true");
  aspectBox.appendChild(iframe);
  wrap.appendChild(aspectBox);

  container.appendChild(wrap);

  var rowId = await logWordwallOpen(unitId, wordwallName);
  if (rowId) {
    activeWordwallTracker = startWordwallTracker(rowId, currentStudent.id);
  }
}

window.addEventListener("beforeunload", function () {
  stopActiveWordwallTracker();
});

window.addEventListener("pagehide", function () {
  stopActiveWordwallTracker();
});

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    flushActiveWordwallTracker();
  }
});
