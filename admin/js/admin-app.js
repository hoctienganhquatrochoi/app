function switchTab(target) {
  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("data-tab") === target) {
      tabs[i].className = "admin-tab active";
    } else {
      tabs[i].className = "admin-tab";
    }
  }
  document.getElementById("contentPanel").style.display = target === "content" ? "block" : "none";
  document.getElementById("studentsPanel").style.display = target === "students" ? "block" : "none";
  document.getElementById("resultsPanel").style.display = target === "results" ? "block" : "none";

  if (target === "results") {
    loadResults();
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadCurriculumData();

  populateUnitSelect();
  populateClassSelect();
  populateStudentsClassFilter();
  populateResultsUnitSelect();
  populateResultsClassFilter();
  populateAssignmentUnitSelect();
  loadVocabTable();
  loadSpeakingTable();
  loadStudents();
  loadActivityToggles();
  initCurriculumManage();

  document.getElementById("unitSelect").addEventListener("change", loadVocabTable);
  document.getElementById("unitSelect").addEventListener("change", loadSpeakingTable);
  document.getElementById("unitSelect").addEventListener("change", loadActivityToggles);
  document.getElementById("bulkAddForm").addEventListener("submit", handleBulkAdd);
  document.getElementById("addSpeakingForm").addEventListener("submit", handleAddSpeaking);
  document.getElementById("bulkAddSpeakingForm").addEventListener("submit", handleBulkAddSpeaking);
  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);
  document.getElementById("studentsClassFilter").addEventListener("change", function () {
    loadStudents();
    populateAssignmentUnitSelect();
  });
  document.getElementById("resultsUnitSelect").addEventListener("change", loadResults);
  document.getElementById("resultsActivitySelect").addEventListener("change", loadResults);
  document.getElementById("resultsClassFilter").addEventListener("change", loadResults);
  document.getElementById("addAssignmentBtn").addEventListener("click", handleAddAssignment);

  initNewSpeakingImagePicker();

  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  }
});
