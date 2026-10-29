import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateReportHtml, sendEmailReport, EmployeeDailyReportData } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");

    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = startDateParam || dateParam || todayStr;
    const endDate = endDateParam || dateParam || todayStr;

    // Fetch employees
    const employees = await prisma.user.findMany({
      where: employeeId && employeeId !== "ALL" ? { id: employeeId, role: "EMPLOYEE" } : { role: "EMPLOYEE" },
      orderBy: { name: "asc" },
    });

    // Fetch holidays in the range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    // Generate list of dates to process
    const datesToProcess: string[] = [];
    const cur = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (cur <= end) {
      datesToProcess.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const reports: EmployeeDailyReportData[] = [];

    for (const currentDate of datesToProcess) {
      const holiday = holidayMap.get(currentDate);

      for (const emp of employees) {
        // 1. Fetch attendance
        const attendance = await prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: emp.id,
              date: currentDate,
            },
          },
        });

        // Accurate shift duration
        let shiftDurationSeconds = 0;
        if (attendance?.checkInTime) {
          const inDate = new Date(attendance.checkInTime);
          const outDate = attendance.checkOutTime
            ? new Date(attendance.checkOutTime)
            : (currentDate === todayStr ? new Date() : inDate);
          const totalShiftSpan = Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 1000));
          const breaks = attendance.breakDurationSeconds || 0;
          shiftDurationSeconds = Math.max(0, totalShiftSpan - breaks);
          if (attendance.workDurationSeconds && attendance.workDurationSeconds > 0) {
            shiftDurationSeconds = attendance.workDurationSeconds;
          }
        }

        // Date boundaries for task time logs
        const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
        const localStart = new Date(`${currentDate}T00:00:00`);
        const localEnd = new Date(`${currentDate}T23:59:59`);
        const minStart = startOfDay < localStart ? startOfDay : localStart;
        const maxEnd = endOfDay > localEnd ? endOfDay : localEnd;

        // 2. Fetch tasks worked on, created, or assigned for this employee
        const tasks = await prisma.task.findMany({
          where: {
            isRecurringTemplate: false,
            OR: [
              { assignedToId: emp.id },
              { assignees: { some: { userId: emp.id } } },
              { timeLogs: { some: { userId: emp.id, startTime: { gte: minStart, lte: maxEnd } } } },
            ],
          },
          include: {
            client: { select: { id: true, name: true } },
            taskClients: { include: { client: { select: { id: true, name: true } } } },
            timeLogs: {
              where: {
                userId: emp.id,
                startTime: {
                  gte: minStart,
                  lte: maxEnd,
                },
              },
            },
          },
        });

        // Calculate task durations strictly logged on currentDate
        const allTaskReportItems = tasks.map((t) => {
          let todayLogSum = 0;
          for (const log of t.timeLogs) {
            if (log.isRunning && log.startTime) {
              const sessionSecs = Math.max(1, Math.floor((new Date().getTime() - new Date(log.startTime).getTime()) / 1000));
              todayLogSum += sessionSecs;
            } else {
              todayLogSum += (log.durationSeconds || 0);
            }
          }

          // Resolve client name
          const clientNames = [
            t.client?.name,
            ...(t.taskClients || []).map((tc: any) => tc.client?.name),
          ].filter(Boolean);
          const clientName = clientNames.length > 0 ? clientNames.join(", ") : "General / Internal";

          const createdOnDate = t.createdAt >= minStart && t.createdAt <= maxEnd;
          const updatedOnDate = t.updatedAt >= minStart && t.updatedAt <= maxEnd;
          const isCompleted = t.employeeStatus === "COMPLETED" || t.adminStatus === "FINAL_COMPLETED";

          return {
            id: t.id,
            title: t.title,
            recurrence: t.recurrence,
            priority: t.priority,
            employeeStatus: t.employeeStatus,
            adminStatus: t.adminStatus,
            durationSeconds: todayLogSum,
            billableHours: t.billableHours || 0,
            clientName,
            employeeName: emp.name,
            employeeEmail: emp.email,
            date: currentDate,
            isRelevantToDate: todayLogSum > 0 || createdOnDate || (updatedOnDate && isCompleted) || (currentDate === todayStr && t.employeeStatus === "IN_PROGRESS"),
          };
        });

        // Strictly keep tasks that had activity, were created, or completed on this date
        // If no tasks match, and currentDate is today, show active tasks
        const taskReportItems = allTaskReportItems.filter((t) => t.isRelevantToDate);

        const totalActiveSeconds = taskReportItems.reduce((acc, item) => acc + item.durationSeconds, 0);
        const totalTasksCompleted = taskReportItems.filter((t) => t.employeeStatus === "COMPLETED" || t.adminStatus === "FINAL_COMPLETED").length;
        const totalTasksPending = taskReportItems.length - totalTasksCompleted;

        let statusStr = "ABSENT_LEAVE";
        if (attendance) {
          statusStr = attendance.status;
        } else if (holiday) {
          statusStr = `PUBLIC_HOLIDAY: ${holiday.name}`;
        }

        const reportData: EmployeeDailyReportData = {
          employee: {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            designation: emp.designation,
          },
          date: currentDate,
          attendance: {
            status: statusStr,
            checkInTime: attendance?.checkInTime?.toISOString() || null,
            checkOutTime: attendance?.checkOutTime?.toISOString() || null,
            workDurationSeconds: shiftDurationSeconds,
            breakDurationSeconds: attendance?.breakDurationSeconds || 0,
            isOnBreak: attendance?.isOnBreak || false,
          },
          tasks: taskReportItems,
          shiftDurationSeconds,
          totalActiveSeconds,
          totalTasksCompleted,
          totalTasksPending,
        };

        reports.push(reportData);
      }
    }

    // Aggregate Client-Wise Data across the date range
    const clientMap = new Map<string, any>();
    const budgetVsActualList: any[] = [];
    const employeeTaskMatrixList: any[] = [];

    reports.forEach((rep) => {
      rep.tasks.forEach((t) => {
        const cName = t.clientName || "General / Internal";
        if (!clientMap.has(cName)) {
          clientMap.set(cName, {
            clientName: cName,
            tasksCount: 0,
            totalDurationSeconds: 0,
            totalBillableHours: 0,
            tasks: [],
            assignedEmployees: new Set<string>(),
          });
        }

        const cGroup = clientMap.get(cName);
        cGroup.tasksCount += 1;
        cGroup.totalDurationSeconds += t.durationSeconds;
        cGroup.totalBillableHours += (t.billableHours || 0);
        cGroup.tasks.push(t);
        cGroup.assignedEmployees.add(rep.employee.name);

        const actualHours = parseFloat((t.durationSeconds / 3600).toFixed(2));
        const billableHours = t.billableHours || 0;
        const varianceHours = parseFloat((billableHours - actualHours).toFixed(2));

        budgetVsActualList.push({
          id: `${t.id}-${rep.date}-${rep.employee.id}`,
          taskId: t.id,
          title: t.title,
          clientName: cName,
          employeeName: rep.employee.name,
          employeeEmail: rep.employee.email,
          date: rep.date,
          billableHours,
          actualHours,
          varianceHours,
          durationSeconds: t.durationSeconds,
          status: varianceHours >= 0 ? "UNDER_BUDGET" : "OVER_BUDGET",
          employeeStatus: t.employeeStatus,
          adminStatus: t.adminStatus,
        });

        employeeTaskMatrixList.push({
          id: `${t.id}-${rep.date}-${rep.employee.id}`,
          taskId: t.id,
          title: t.title,
          clientName: cName,
          employeeName: rep.employee.name,
          employeeEmail: rep.employee.email,
          date: rep.date,
          billableHours,
          actualHours,
          durationSeconds: t.durationSeconds,
          employeeStatus: t.employeeStatus,
          adminStatus: t.adminStatus,
        });
      });
    });

    const clientReports = Array.from(clientMap.values()).map((c) => {
      const totalActualHours = parseFloat((c.totalDurationSeconds / 3600).toFixed(2));
      return {
        clientName: c.clientName,
        tasksCount: c.tasksCount,
        totalDurationSeconds: c.totalDurationSeconds,
        totalActualHours,
        totalBillableHours: parseFloat(c.totalBillableHours.toFixed(2)),
        varianceHours: parseFloat((c.totalBillableHours - totalActualHours).toFixed(2)),
        assignedEmployees: Array.from(c.assignedEmployees),
      };
    }).sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

    // Fetch existing saved report dispatches
    const savedReports = await prisma.dailyReport.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      startDate,
      endDate,
      date: startDate,
      isRange: startDate !== endDate,
      reports,
      clientReports,
      budgetVsActual: budgetVsActualList,
      employeeTaskMatrix: employeeTaskMatrixList,
      savedReports,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, date = new Date().toISOString().slice(0, 10), adminEmail } = body;

    // Determine Admin notification email
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ADMIN_NOTIFICATION_EMAIL" },
    });
    const targetAdminEmail =
      adminEmail ||
      setting?.value ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.GMAIL_USER ||
      "gaurav141@gmail.com";

    // Target employees: single employee or all
    const employees = await prisma.user.findMany({
      where: employeeId && employeeId !== "ALL" ? { id: employeeId, role: "EMPLOYEE" } : { role: "EMPLOYEE" },
    });

    const dispatchResults: any[] = [];

    for (const emp of employees) {
      const attendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: emp.id,
            date,
          },
        },
      });

      // Accurate shift duration
      let shiftDurationSeconds = 0;
      if (attendance?.checkInTime) {
        const inDate = new Date(attendance.checkInTime);
        const outDate = attendance.checkOutTime
          ? new Date(attendance.checkOutTime)
          : (date === new Date().toISOString().slice(0, 10) ? new Date() : inDate);
        const totalShiftSpan = Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 1000));
        const breaks = attendance.breakDurationSeconds || 0;
        shiftDurationSeconds = Math.max(0, totalShiftSpan - breaks);
        if (attendance.workDurationSeconds && attendance.workDurationSeconds > 0) {
          shiftDurationSeconds = attendance.workDurationSeconds;
        }
      }

      // Date boundaries for task time logs
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      const tasks = await prisma.task.findMany({
        where: {
          isRecurringTemplate: false,
          OR: [
            { assignedToId: emp.id },
            { assignees: { some: { userId: emp.id } } },
            { timeLogs: { some: { userId: emp.id, startTime: { gte: startOfDay, lte: endOfDay } } } },
          ],
        },
        include: {
          timeLogs: {
            where: {
              userId: emp.id,
              startTime: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
        },
      });

      const taskReportItems = tasks.map((t) => {
        const todayLogSum = t.timeLogs.reduce((acc, log) => acc + log.durationSeconds, 0);
        return {
          id: t.id,
          title: t.title,
          recurrence: t.recurrence,
          priority: t.priority,
          employeeStatus: t.employeeStatus,
          adminStatus: t.adminStatus,
          durationSeconds: todayLogSum,
          billableHours: t.billableHours || 0,
        };
      });

      const totalActiveSeconds = taskReportItems.reduce((acc, item) => acc + item.durationSeconds, 0);
      const totalTasksCompleted = taskReportItems.filter((t) => t.employeeStatus === "COMPLETED").length;
      const totalTasksPending = taskReportItems.length - totalTasksCompleted;

      const reportData: EmployeeDailyReportData = {
        employee: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          designation: emp.designation,
        },
        date,
        attendance: {
          status: attendance ? attendance.status : "ABSENT_LEAVE",
          checkInTime: attendance?.checkInTime?.toISOString() || null,
          checkOutTime: attendance?.checkOutTime?.toISOString() || null,
          workDurationSeconds: shiftDurationSeconds,
          breakDurationSeconds: attendance?.breakDurationSeconds || 0,
          isOnBreak: attendance?.isOnBreak || false,
        },
        tasks: taskReportItems,
        shiftDurationSeconds,
        totalActiveSeconds,
        totalTasksCompleted,
        totalTasksPending,
      };

      const htmlContent = generateReportHtml(reportData);
      const subject = `[nacsconsulting EOD Report] ${emp.name} - ${date} (${totalTasksCompleted} Completed, Shift: ${formatDurationSecs(shiftDurationSeconds)})`;

      // Dispatch Email via Gmail
      const emailRes = await sendEmailReport(targetAdminEmail, subject, htmlContent);

      // Save or update DailyReport in DB
      const record = await prisma.dailyReport.upsert({
        where: {
          userId_date: {
            userId: emp.id,
            date,
          },
        },
        create: {
          userId: emp.id,
          date,
          totalTasksWorked: tasks.length,
          completedTasks: totalTasksCompleted,
          pendingTasks: totalTasksPending,
          totalTimeSpentSeconds: totalActiveSeconds,
          attendanceStatus: reportData.attendance.status,
          checkInTime: attendance?.checkInTime,
          checkOutTime: attendance?.checkOutTime,
          reportSummaryHtml: htmlContent,
          sentToAdminEmail: targetAdminEmail,
          emailSentAt: new Date(),
          emailStatus: emailRes.success ? "SENT" : "FAILED",
        },
        update: {
          totalTasksWorked: tasks.length,
          completedTasks: totalTasksCompleted,
          pendingTasks: totalTasksPending,
          totalTimeSpentSeconds: totalActiveSeconds,
          attendanceStatus: reportData.attendance.status,
          checkInTime: attendance?.checkInTime,
          checkOutTime: attendance?.checkOutTime,
          reportSummaryHtml: htmlContent,
          sentToAdminEmail: targetAdminEmail,
          emailSentAt: new Date(),
          emailStatus: emailRes.success ? "SENT" : "FAILED",
        },
      });

      dispatchResults.push({
        employee: emp.name,
        email: emp.email,
        adminRecipient: targetAdminEmail,
        result: emailRes,
        reportId: record.id,
      });
    }

    const failureCount = dispatchResults.filter((d) => !d.result?.success).length;
    const failureMessages = dispatchResults
      .filter((d) => !d.result?.success)
      .map((d) => d.result?.message || "Unknown error");

    const allFailed = failureCount === dispatchResults.length && dispatchResults.length > 0;
    const someFailed = failureCount > 0;

    return NextResponse.json({
      success: !allFailed,
      warning: someFailed && !allFailed,
      message: allFailed
        ? (failureMessages[0] || "Failed to dispatch EOD report via Gmail.")
        : someFailed
        ? `EOD reports sent with warnings: ${failureMessages.join("; ")}`
        : `EOD reports successfully dispatched to ${targetAdminEmail} for ${dispatchResults.length} employee(s).`,
      dispatches: dispatchResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatDurationSecs(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
