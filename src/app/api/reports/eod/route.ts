import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateReportHtml, sendEmailReport, EmployeeDailyReportData } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const employeeId = searchParams.get("employeeId");

    // Fetch employees
    const employees = await prisma.user.findMany({
      where: employeeId && employeeId !== "ALL" ? { id: employeeId, role: "EMPLOYEE" } : { role: "EMPLOYEE" },
      orderBy: { name: "asc" },
    });

    const reports: EmployeeDailyReportData[] = [];

    for (const emp of employees) {
      // 1. Fetch attendance
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

      // 2. Fetch tasks worked on or assigned
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

      // Calculate task durations strictly logged today
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

      reports.push(reportData);
    }

    // Fetch existing saved report dispatches
    const savedReports = await prisma.dailyReport.findMany({
      where: { date },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      date,
      reports,
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
      const subject = `[Daily Work Report] ${emp.name} - ${date} (${totalTasksCompleted} Completed, Shift: ${formatDurationSecs(shiftDurationSeconds)})`;

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
