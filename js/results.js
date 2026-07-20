async function findActiveAssignmentId(studentId, unitId, activityType) {
  var result = await supabaseClient
    .from("game_assignment_access")
    .select("game_assignments!inner(id, unit_id, activity_type, due_at)")
    .eq("student_id", studentId)
    .eq("game_assignments.unit_id", unitId)
    .eq("game_assignments.activity_type", activityType)
    .gte("game_assignments.due_at", new Date().toISOString());

  if (result.error || !result.data || !result.data.length) {
    return null;
  }
  return result.data[0].game_assignments.id;
}

async function submitQuizAttempt(unitId, activityType, score, total, startedAt, answersLog) {
  if (!currentStudent) {
    return;
  }

  var insertResult = await supabaseClient.from("game_quiz_attempts").insert({
    student_id: currentStudent.id,
    unit_id: unitId,
    activity_type: activityType,
    score: score,
    total: total,
    started_at: startedAt.toISOString(),
    answers: answersLog
  }).select().single();

  if (insertResult.error || !insertResult.data) {
    return;
  }

  var assignmentId = await findActiveAssignmentId(currentStudent.id, unitId, activityType);
  if (assignmentId) {
    await supabaseClient.from("game_quiz_attempts").update({ assignment_id: assignmentId }).eq("id", insertResult.data.id);
  }
}
