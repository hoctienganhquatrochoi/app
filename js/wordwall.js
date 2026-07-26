function isPhotoProofRequiredForClass(cls) {
  if (!cls) {
    return false;
  }
  if (cls.level === "mamnon") {
    return false;
  }
  if (/^Lớp\s*1$/i.test((cls.name || "").trim())) {
    return false;
  }
  return true;
}

function compressImageFile(file, maxWidth, quality) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var reader = new FileReader();
    reader.onload = function (e) {
      img.onload = function () {
        var scale = Math.min(1, maxWidth / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Không nén được ảnh"));
          }
        }, "image/jpeg", quality);
      };
      img.onerror = function () {
        reject(new Error("Ảnh không hợp lệ"));
      };
      img.src = e.target.result;
    };
    reader.onerror = function () {
      reject(new Error("Không đọc được file"));
    };
    reader.readAsDataURL(file);
  });
}

async function uploadWordwallProofPhoto(file, wordwallOpenId, unitId) {
  var blob = await compressImageFile(file, 900, 0.7);
  var path = unitId + "/" + wordwallOpenId + "_" + Date.now() + ".jpg";
  var uploadResult = await supabaseClient.storage.from("wordwall-proof").upload(path, blob, { contentType: "image/jpeg" });
  if (uploadResult.error) {
    throw uploadResult.error;
  }
  var urlResult = supabaseClient.storage.from("wordwall-proof").getPublicUrl(path);
  var photoUrl = urlResult.data.publicUrl;
  var insertResult = await supabaseClient.from("game_wordwall_photos").insert({
    wordwall_open_id: wordwallOpenId,
    student_id: currentStudent.id,
    photo_url: photoUrl
  });
  if (insertResult.error) {
    throw insertResult.error;
  }
  return photoUrl;
}

var WORDWALL_HEARTBEAT_MS = 5000;
var WORDWALL_GAMING_MIN_SECONDS = 15;
var WORDWALL_GAMING_WINDOW_MS = 30 * 60 * 1000;
var WORDWALL_GAMING_THRESHOLD_COUNT = 3;
var activeWordwallTracker = null;
var activeWordwallPasteHandler = null;

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
    reason: "Mở Wordwall " + shortCount + " lần dưới 15 giây trong vòng 30 phút",
    student_message: "⚠️ Em vừa mở đi mở lại Wordwall nhiều lần liên tục mà không làm bài thật — đây là gian dối trong quá trình học tập. Cô giáo đã biết việc này. Em học nghiêm túc lại nhé!"
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
  var tabTracker = startTabSwitchTracker();
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
      tabTracker.stop();
      supabaseClient.from("game_wordwall_opens").update({ tab_switch_count: tabTracker.getCount() }).eq("id", rowId).then(function () {});
      checkForWordwallGaming(studentId);
    }
  };
}

function stopActiveWordwallTracker() {
  if (activeWordwallTracker) {
    activeWordwallTracker.stop();
    activeWordwallTracker = null;
  }
  if (activeWordwallPasteHandler) {
    document.removeEventListener("paste", activeWordwallPasteHandler);
    activeWordwallPasteHandler = null;
  }
}

function flushActiveWordwallTracker() {
  if (activeWordwallTracker) {
    activeWordwallTracker.flush();
  }
}

async function renderWordwallActivity(container, breadcrumbText, embedUrl, unitId, wordwallName, photoProofRequired) {
  stopActiveWordwallTracker();

  container.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "ww-wrap";

  var uploadBtn = null;
  var statusEl = null;

  if (photoProofRequired) {
    var bar = document.createElement("div");
    bar.className = "ww-photo-bar";

    var noticeText = document.createElement("span");
    noticeText.className = "ww-photo-bar-text";
    noticeText.textContent = "📸 Làm xong, dán ảnh (Ctrl+V) hoặc chọn file để gửi kết quả! Không gửi ảnh, bài sẽ không được tính.";
    bar.appendChild(noticeText);

    var actions = document.createElement("div");
    actions.className = "ww-photo-bar-actions";

    uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "ww-photo-upload-btn";
    uploadBtn.textContent = "📤 Chọn ảnh";
    actions.appendChild(uploadBtn);

    statusEl = document.createElement("span");
    statusEl.className = "ww-photo-upload-status";
    actions.appendChild(statusEl);

    bar.appendChild(actions);
    wrap.appendChild(bar);
  }

  var aspectBox = document.createElement("div");
  aspectBox.className = "ww-aspect" + (photoProofRequired ? " ww-aspect-compact" : "");

  var iframe = document.createElement("iframe");
  iframe.className = "ww-iframe";
  iframe.src = embedUrl;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("allow", "fullscreen");
  aspectBox.appendChild(iframe);
  wrap.appendChild(aspectBox);

  var rowId = await logWordwallOpen(unitId, wordwallName);

  if (photoProofRequired && rowId && uploadBtn) {
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    wrap.appendChild(fileInput);

    var handleUploadFile = function (file) {
      uploadBtn.disabled = true;
      statusEl.textContent = "Đang gửi ảnh...";
      uploadWordwallProofPhoto(file, rowId, unitId).then(function () {
        statusEl.textContent = "✓ Đã gửi ảnh";
        uploadBtn.textContent = "📤 Gửi ảnh khác";
        uploadBtn.disabled = false;
      }).catch(function (err) {
        statusEl.textContent = "Lỗi gửi ảnh, thử lại nhé";
        uploadBtn.disabled = false;
        console.error("uploadWordwallProofPhoto failed:", err);
      });
    };

    uploadBtn.addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) {
        handleUploadFile(file);
      }
    });

    var handlePaste = function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.indexOf("image/") === 0) {
          var file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleUploadFile(file);
          }
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    activeWordwallPasteHandler = handlePaste;
  }

  container.appendChild(wrap);

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
