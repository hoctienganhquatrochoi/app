function switchTab(target) {
  saveAdminNavState({ topTab: target });
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
  document.getElementById("speakPanel").style.display = target === "speak" ? "block" : "none";

  if (target === "results") {
    loadResults();
    loadCheatFlags();
    loadAllAssignmentsForResults();
    populateHistoryGroupSelect();
    loadAllStudentsForHistory().then(populateHistoryStudentSelect);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  var savedNavState = loadAdminNavState();

  await loadCurriculumData();
  await loadTeachingGroups();

  populateUnitSelect();
  populateAllGroupSelects();
  populateResultsUnitSelect();
  populateAssignmentUnitSelect();
  populateAssignmentStudentAccess();
  loadVocabTable();
  loadSentenceTable();
  loadGrammarMcqSetList().then(loadGrammarMcqTable);
  loadGrammarTypingSetList().then(loadGrammarTypingTable);
  loadGrammarMatchingSetList().then(loadGrammarMatchingTable);
  loadGrammarDragfillSetList().then(loadGrammarDragfillTable);
  loadPhotoQuizSetList().then(function () {
    loadPhotoQuizTable();
    loadPhotoQuizSetImage();
  });
  loadSpeakingTestList().then(loadSpeakingTable);
  loadWordwallList();
  loadWordwallTemplates();
  loadStudents();
  loadActivityToggles();
  initCurriculumManage();
  renderTeachingGroupList();
  populateNewTeachingGroupClassAccess();

  document.getElementById("unitSelect").addEventListener("change", loadVocabTable);
  document.getElementById("unitSelect").addEventListener("change", loadSentenceTable);
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarMcqSetList().then(loadGrammarMcqTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarTypingSetList().then(loadGrammarTypingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarMatchingSetList().then(loadGrammarMatchingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadGrammarDragfillSetList().then(loadGrammarDragfillTable);
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadPhotoQuizSetList().then(function () {
      loadPhotoQuizTable();
      loadPhotoQuizSetImage();
    });
  });
  document.getElementById("unitSelect").addEventListener("change", function () {
    loadSpeakingTestList().then(loadSpeakingTable);
  });
  document.getElementById("unitSelect").addEventListener("change", loadWordwallList);
  document.getElementById("unitSelect").addEventListener("change", loadActivityToggles);
  document.getElementById("toggleAllVocabOnBtn").addEventListener("click", function () {
    setVocabTogglesEnabled(true);
  });
  document.getElementById("toggleAllVocabOffBtn").addEventListener("click", function () {
    setVocabTogglesEnabled(false);
  });
  document.getElementById("bulkAddForm").addEventListener("submit", handleBulkAdd);
  document.getElementById("exportVocabListBtn").addEventListener("click", handleExportVocabList);
  document.getElementById("exportVocabPdfBtn").addEventListener("click", handleExportVocabPdf);
  document.getElementById("exportSentencesPdfBtn").addEventListener("click", handleExportSentencesPdf);
  document.getElementById("uploadSiteBannerBtn").addEventListener("click", handleUploadSiteBanner);
  document.getElementById("saveSiteBannerLinkBtn").addEventListener("click", handleSaveSiteBannerLink);
  document.getElementById("removeSiteBannerBtn").addEventListener("click", handleRemoveSiteBanner);
  loadSiteBannerSettings();
  document.getElementById("saveDemoPopupBtn").addEventListener("click", handleSaveDemoPopup);
  loadDemoPopupSettings();
  document.getElementById("backfillViAudioBtn").addEventListener("click", handleBackfillViAudio);
  document.getElementById("stopBackfillViAudioBtn").addEventListener("click", handleStopBackfillViAudio);
  document.getElementById("bulkAddSentenceForm").addEventListener("submit", handleBulkAddSentences);
  document.getElementById("bulkAddGrammarMcqForm").addEventListener("submit", handleBulkAddGrammarMcq);
  document.getElementById("addGrammarMcqSetBtn").addEventListener("click", handleAddGrammarMcqSet);
  document.getElementById("grammarMcqSetSelect").addEventListener("change", loadGrammarMcqTable);
  document.getElementById("exportGrammarMcqPdfBtn").addEventListener("click", handleExportGrammarMcqPdf);
  document.getElementById("bulkAddGrammarTypingForm").addEventListener("submit", handleBulkAddGrammarTyping);
  document.getElementById("addGrammarTypingSetBtn").addEventListener("click", handleAddGrammarTypingSet);
  document.getElementById("grammarTypingSetSelect").addEventListener("change", loadGrammarTypingTable);
  document.getElementById("exportGrammarTypingPdfBtn").addEventListener("click", handleExportGrammarTypingPdf);
  document.getElementById("bulkAddGrammarMatchingForm").addEventListener("submit", handleBulkAddGrammarMatching);
  document.getElementById("addGrammarMatchingSetBtn").addEventListener("click", handleAddGrammarMatchingSet);
  document.getElementById("grammarMatchingSetSelect").addEventListener("change", loadGrammarMatchingTable);
  document.getElementById("exportGrammarMatchingPdfBtn").addEventListener("click", handleExportGrammarMatchingPdf);
  document.getElementById("bulkAddGrammarDragfillForm").addEventListener("submit", handleBulkAddGrammarDragfill);
  document.getElementById("addGrammarDragfillSetBtn").addEventListener("click", handleAddGrammarDragfillSet);
  document.getElementById("grammarDragfillSetSelect").addEventListener("change", loadGrammarDragfillTable);
  document.getElementById("exportGrammarDragfillPdfBtn").addEventListener("click", handleExportGrammarDragfillPdf);
  document.getElementById("bulkAddMathDragfillForm").addEventListener("submit", handleBulkAddMathDragfill);
  document.getElementById("addMathDragfillSetBtn").addEventListener("click", handleAddMathDragfillSet);
  document.getElementById("mathDragfillSetSelect").addEventListener("change", loadMathDragfillTable);
  document.getElementById("exportMathDragfillPdfBtn").addEventListener("click", handleExportMathDragfillPdf);
  document.getElementById("bulkAddTextDragfillForm").addEventListener("submit", handleBulkAddTextDragfill);
  document.getElementById("addTextDragfillSetBtn").addEventListener("click", handleAddTextDragfillSet);
  document.getElementById("textDragfillSetSelect").addEventListener("change", loadTextDragfillTable);
  document.getElementById("exportTextDragfillPdfBtn").addEventListener("click", handleExportTextDragfillPdf);
  document.getElementById("addTestBtn").addEventListener("click", handleAddTest);
  document.getElementById("addTestSectionBtn").addEventListener("click", handleAddTestSection);
  document.getElementById("newTestSectionType").addEventListener("change", updateTestSectionContentHint);
  document.getElementById("cancelEditTestSectionBtn").addEventListener("click", resetTestSectionForm);
  document.getElementById("megaImportBtn").addEventListener("click", handleMegaImport);
  document.getElementById("bulkAddPhotoQuizForm").addEventListener("submit", handleBulkAddPhotoQuiz);
  document.getElementById("addPhotoQuizSetBtn").addEventListener("click", handleAddPhotoQuizSet);
  document.getElementById("photoQuizSetSelect").addEventListener("change", function () {
    loadPhotoQuizTable();
    loadPhotoQuizSetImage();
  });
  document.getElementById("exportPhotoQuizPdfBtn").addEventListener("click", handleExportPhotoQuizPdf);
  document.getElementById("bulkAddSpeakingForm").addEventListener("submit", handleBulkAddSpeaking);
  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);
  document.getElementById("addTeachingGroupBtn").addEventListener("click", handleAddTeachingGroup);
  document.getElementById("newStudentGroupSelect").addEventListener("change", applyGroupDefaultClassAccess);
  document.getElementById("studentsGroupFilter").addEventListener("change", function () {
    loadStudents();
    populateAssignmentUnitSelect();
    populateAssignmentStudentAccess();
  });
  document.getElementById("historyGroupSelect").addEventListener("change", function () {
    populateHistoryStudentSelect();
    loadGroupHistory();
  });
  document.getElementById("historyStudentSearch").addEventListener("input", populateHistoryStudentSelect);
  document.getElementById("historyStudentSelect").addEventListener("change", loadGroupHistory);
  document.getElementById("historyFromDate").addEventListener("change", loadGroupHistory);
  document.getElementById("historyToDate").addEventListener("change", loadGroupHistory);
  document.getElementById("historyTodayBtn").addEventListener("click", function () {
    setHistoryDateRange(1);
    loadGroupHistory();
  });
  document.getElementById("historyLast7Btn").addEventListener("click", function () {
    setHistoryDateRange(7);
    loadGroupHistory();
  });
  document.getElementById("historyExportPdfBtn").addEventListener("click", handleHistoryExportPdf);
  document.getElementById("historyExportRankingImgBtn").addEventListener("click", handleExportRankingImage);
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
  document.getElementById("assignmentUnitSearch").addEventListener("input", function () {
    populateAssignmentUnitSelect();
    updateAssignmentSetNameField();
  });
  document.getElementById("assignmentUnitSelect").addEventListener("change", updateAssignmentSetNameField);
  document.getElementById("assignmentActivitySelect").addEventListener("change", updateAssignmentSetNameField);
  document.getElementById("quickAssignCancelBtn").addEventListener("click", closeQuickAssignModal);
  document.getElementById("quickAssignSubmitBtn").addEventListener("click", handleQuickAssignSubmit);
  document.getElementById("quickAssignModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) {
      closeQuickAssignModal();
    }
  });
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

  restoreAdminNavState(savedNavState);
});
