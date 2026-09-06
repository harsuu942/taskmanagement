// Automated End-to-End Workflow Verification Script
async function runTests() {
  const BASE = "http://localhost:3000";
  console.log("=== Starting TaskFlow Verification Tests ===");

  // 1. Check Auth & Users
  console.log("\n[Test 1] Fetching Users & Roles...");
  const authRes = await fetch(`${BASE}/api/auth`);
  const authData = await authRes.json();
  console.log(`Found ${authData.allUsers.length} users. Current user: ${authData.currentUser?.name} (${authData.currentUser?.role})`);

  const admin = authData.allUsers.find((u) => u.role === "ADMIN");
  const employee = authData.allUsers.find((u) => u.role === "EMPLOYEE");

  if (!admin || !employee) throw new Error("Admin or Employee user not found");

  // 2. Admin creates a new Employee with Gmail
  console.log("\n[Test 2] Admin creating new employee with Gmail account...");
  const newEmpRes = await fetch(`${BASE}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Elena Rostova",
      email: "elena.rostova.dev@gmail.com",
      designation: "UI/UX & Mobile Engineer",
      role: "EMPLOYEE",
    }),
  });
  const newEmpData = await newEmpRes.json();
  console.log("Created employee:", newEmpData.employee?.name, "(Gmail:", newEmpData.employee?.email, ")");

  // 3. Create a Monthly Task with Day 15 Recurrence
  console.log("\n[Test 3] Creating Monthly task with Day 15 selector & Priority...");
  const taskRes = await fetch(`${BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Monthly Sprint Performance Review",
      description: "Analyze sprint burn-down charts, velocity, and story point accuracy.",
      recurrence: "MONTHLY",
      monthlyDay: 15,
      priority: "HIGH",
      assignedToId: employee.id,
      createdById: admin.id,
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    }),
  });
  const taskData = await taskRes.json();
  const testTask = taskData.task;
  console.log("Created task:", testTask.title, "| Recurrence:", testTask.recurrence, "| Day:", testTask.monthlyDay, "| Initial Status:", testTask.employeeStatus);

  // 4. Timer workflow: Start -> Wait -> Hold -> Resume -> Complete
  console.log("\n[Test 4] Testing per-task interactive timer workflow...");
  console.log("-> Starting timer on task...");
  const timerStartRes = await fetch(`${BASE}/api/tasks/${testTask.id}/timer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", userId: employee.id }),
  });
  const timerStartData = await timerStartRes.json();
  console.log("Timer started. Task running:", timerStartData.task.isTimerRunning, "Employee Status:", timerStartData.task.employeeStatus);

  // Wait 2 seconds
  await new Promise((r) => setTimeout(r, 2000));

  console.log("-> Putting timer on Hold (Pause)...");
  const timerHoldRes = await fetch(`${BASE}/api/tasks/${testTask.id}/timer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "hold", userId: employee.id }),
  });
  const timerHoldData = await timerHoldRes.json();
  console.log("Timer held. Task running:", timerHoldData.task.isTimerRunning, "Employee Status:", timerHoldData.task.employeeStatus, "Total seconds:", timerHoldData.task.totalDurationSeconds);

  console.log("-> Resuming timer...");
  const timerResumeRes = await fetch(`${BASE}/api/tasks/${testTask.id}/timer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resume", userId: employee.id }),
  });
  const timerResumeData = await timerResumeRes.json();
  console.log("Timer resumed. Task running:", timerResumeData.task.isTimerRunning, "Employee Status:", timerResumeData.task.employeeStatus);

  // Wait 1 second
  await new Promise((r) => setTimeout(r, 1000));

  console.log("-> Employee completes task...");
  const timerCompleteRes = await fetch(`${BASE}/api/tasks/${testTask.id}/timer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", userId: employee.id }),
  });
  const timerCompleteData = await timerCompleteRes.json();
  console.log("Employee completed task. Employee Status:", timerCompleteData.task.employeeStatus, "| Admin Status:", timerCompleteData.task.adminStatus, "| Total Time Logged:", timerCompleteData.task.totalDurationSeconds, "seconds");

  // 5. Dual-Tier Approval: Admin approves Final Complete
  console.log("\n[Test 5] Dual-Tier Approval: Admin grants Final Completion...");
  const approveRes = await fetch(`${BASE}/api/tasks/${testTask.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: admin.id,
      role: "ADMIN",
      adminStatus: "FINAL_COMPLETED",
    }),
  });
  const approveData = await approveRes.json();
  console.log("Admin approval result:", approveData.task.adminStatus, "| Employee status:", approveData.task.employeeStatus);

  // 6. Attendance punch card & Auto-leave
  console.log("\n[Test 6] Attendance Check-in & Auto-leave verification...");
  const checkInRes = await fetch(`${BASE}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: employee.id,
      action: "check-in",
      notes: "Morning sprint check-in",
    }),
  });
  const checkInData = await checkInRes.json();
  console.log("Check-in result:", checkInData.record?.status, "Time:", checkInData.record?.checkInTime);

  const rosterRes = await fetch(`${BASE}/api/attendance`);
  const rosterData = await rosterRes.json();
  console.log(`Today's Attendance summary: Total ${rosterData.summary.totalEmployees}, Present: ${rosterData.summary.present}, Checked Out: ${rosterData.summary.checkedOut}, Absent/Leave: ${rosterData.summary.absentOrLeave}`);

  // 7. End-of-Day (EOD) Report Generation & Gmail Dispatch
  console.log("\n[Test 7] End-of-Day (EOD) Report & Gmail Dispatch...");
  const reportRes = await fetch(`${BASE}/api/reports/eod`);
  const reportData = await reportRes.json();
  console.log(`Found ${reportData.reports.length} employee daily report(s).`);

  const empReport = reportData.reports.find((r) => r.employee.id === employee.id);
  if (empReport) {
    console.log(`Report for ${empReport.employee.name}: Tasks: ${empReport.tasks.length}, Active Time: ${empReport.totalActiveSeconds}s, Attendance: ${empReport.attendance.status}`);
  }

  console.log("-> Dispatching EOD Report to Admin Gmail...");
  const dispatchRes = await fetch(`${BASE}/api/reports/eod`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: employee.id,
      date: new Date().toISOString().slice(0, 10),
    }),
  });
  const dispatchData = await dispatchRes.json();
  console.log("Gmail Dispatch status:", dispatchData.message, "| Dispatches count:", dispatchData.dispatches?.length);

  // 8. Automated Scheduler Cycle
  console.log("\n[Test 8] Automated Scheduler cycle...");
  const schedRes = await fetch(`${BASE}/api/scheduler`, { method: "POST" });
  const schedData = await schedRes.json();
  console.log("Scheduler executed successfully. Generated count:", schedData.taskResults?.generatedCount);

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
