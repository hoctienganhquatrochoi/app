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
    loadAllAssignmentsForResults();
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadCurriculumData();
  await loadTeachingGroups();

  populateUnitSelect();
  populateAllGroupSelects();
  populateResultsUnitSelect();
  populateAssignmentUnitSelect();
  populateAssignmentStudentAccess();
  loadVocabTable();
  loadSpeakingTestList().then(loadSpeakingTable);
  loadWordwallList();
  loadWordwallTemplates();
  loadStudents();
  loadActivityToggles();
  initCurriculumManage();
  renderTeachingGroupList();
  populateNewTeachingGroupClassAccess();

  document.getElementById("unitSelect").addEventListener("change", loadVocabTable);
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadSpeakingTestList().then(loadSpeakingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", loadWordwallList);
  document.getElementById("unitSelect").addEventListener("change", loadActivityToggles);
  document.getElementById("bulkAddForm").addEventListener("submit", handleBulkAdd);
  document.getElementById("bulkAddSpeakingForm").addEventListener("submit", handleBulkAddSpeaking);
  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);
  document.getElementById("addTeachingGroupBtn").addEventListener("click", handleAddTeachingGroup);
  document.getElementById("newStudentGroupSelect").addEventListener("change", applyGroupDefaultClassAccess);
  document.getElementById("studentsGroupFilter").addEventListener("change", function () {
    loadStudents();
    populateAssignmentUnitSelect();
    populateAssignmentStudentAccess();
  });
  document.getElementById("resultsUnitSearch").addEventListener("input", populateResultsUnitSelect);
  document.getElementById("resultsUnitSelect").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("resultsActivitySelect").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("resultsGroupFilter").addEventListener("change", function () {
    currentResultsAssignmentId = null;
    loadResults();
  });
  document.getElementById("addAssignmentBtn").addEventListener("click", handleAddAssignment);
  document.getElementById("assignmentUnitSearch").addEventListener("input", populateAssignmentUnitSelect);
  document.getElementById("closeWordwallTemplateModalBtn").addEventListener("click", closeWordwallTemplateModal);
  document.getElementById("addWordwallTemplateBtn").addEventListener("click", handleAddWordwallTemplate);
  document.getElementById("addWordwallTemplateItemBtn").addEventListener("click", handleAddWordwallTemplateItem);
  document.getElementById("wordwallTemplateModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) {
      closeWordwallTemplateModal();
    }
  });

  var tabs = document.querySelectorAll(".admin-tab");
  var i;
  for (i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  }
});
