import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId") || searchParams.get("userId");

    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = startDateParam || dateParam || todayStr;
    const endDate = endDateParam || dateParam || todayStr;
    const isRange = startDate !== endDate;

    // Fetch all active employees for roster dropdown & matching
    const allEmployees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { name: "asc" },
    });

    let roster: any[] = [];

    const now = new Date();

    if (!isRange) {
      // Single-day view: show all employees (or filtered employee) including absent/leave
      const attendances = await prisma.attendance.findMany({
        where: { date: startDate },
        include: { user: true },
      });

      const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));

      const targetEmployees = employeeId && employeeId !== "ALL"
        ? allEmployees.filter((e) => e.id === employeeId)
        : allEmployees;

      roster = targetEmployees.map((emp) => {
        const record = attendanceMap.get(emp.id);
        if (record) {
          const liveActiveWork = record.status === "PRESENT" && record.checkInTime
            ? (record.workDurationSeconds || 0) + Math.max(0, Math.floor((now.getTime() - new Date(record.lastCheckInTime || record.checkInTime).getTime()) / 1000) - (record.sessionBreakDurationSeconds || 0))
            : record.workDurationSeconds;

          return {
            date: startDate,
            employee: emp,
            record,
            status: record.status,
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime,
            workDurationSeconds: liveActiveWork,
            breakDurationSeconds: record.breakDurationSeconds || 0,
            isOnBreak: record.isOnBreak || false,
            currentBreakStartedAt: record.currentBreakStartedAt,
            lastCheckInTime: record.lastCheckInTime,
            sessionBreakDurationSeconds: record.sessionBreakDurationSeconds || 0,
          };
        } else {
          return {
            date: startDate,
            employee: emp,
            record: null,
            status: "ABSENT_LEAVE",
            checkInTime: null,
            checkOutTime: null,
            workDurationSeconds: 0,
            breakDurationSeconds: 0,
            isOnBreak: false,
            currentBreakStartedAt: null,
            lastCheckInTime: null,
            sessionBreakDurationSeconds: 0,
          };
        }
      });
    } else {
      // Date range view: fetch all recorded attendances in [startDate, endDate]
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (employeeId && employeeId !== "ALL") {
        whereClause.userId = employeeId;
      }

      const attendances = await prisma.attendance.findMany({
        where: whereClause,
        include: { user: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });

      roster = attendances.map((rec) => {
        const liveActiveWork = rec.status === "PRESENT" && rec.checkInTime && rec.date === todayStr
          ? (rec.workDurationSeconds || 0) + Math.max(0, Math.floor((now.getTime() - new Date(rec.lastCheckInTime || rec.checkInTime).getTime()) / 1000) - (rec.sessionBreakDurationSeconds || 0))
          : rec.workDurationSeconds;

        return {
          date: rec.date,
          employee: rec.user,
          record: rec,
          status: rec.status,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          workDurationSeconds: liveActiveWork,
          breakDurationSeconds: rec.breakDurationSeconds || 0,
          isOnBreak: rec.isOnBreak || false,
          currentBreakStartedAt: rec.currentBreakStartedAt,
          lastCheckInTime: rec.lastCheckInTime,
          sessionBreakDurationSeconds: rec.sessionBreakDurationSeconds || 0,
        };
      });
    }

    // Current user status for today's punch card
    const todayRecord = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: searchParams.get("userId") || "",
          date: todayStr,
        },
      },
      include: { user: true },
    });

    const totalWorkDuration = roster.reduce((acc, r) => acc + (r.workDurationSeconds || 0), 0);

    const currentUserLiveWork = todayRecord
      ? (todayRecord.status === "PRESENT" && todayRecord.checkInTime
          ? (todayRecord.workDurationSeconds || 0) + Math.max(0, Math.floor((now.getTime() - new Date(todayRecord.lastCheckInTime || todayRecord.checkInTime).getTime()) / 1000) - (todayRecord.sessionBreakDurationSeconds || 0))
          : todayRecord.workDurationSeconds)
      : 0;

    return NextResponse.json({
      isRange,
      startDate,
      endDate,
      date: startDate,
      allEmployees,
      roster,
      currentUserAttendance: todayRecord
        ? {
            employee: todayRecord.user,
            record: todayRecord,
            status: todayRecord.status,
            checkInTime: todayRecord.checkInTime,
            checkOutTime: todayRecord.checkOutTime,
            workDurationSeconds: currentUserLiveWork,
            breakDurationSeconds: todayRecord.breakDurationSeconds || 0,
            isOnBreak: todayRecord.isOnBreak || false,
            currentBreakStartedAt: todayRecord.currentBreakStartedAt,
            lastCheckInTime: todayRecord.lastCheckInTime,
            sessionBreakDurationSeconds: todayRecord.sessionBreakDurationSeconds || 0,
          }
        : null,
      summary: {
        totalRecords: roster.length,
        totalEmployees: allEmployees.length,
        present: roster.filter((r) => r.status === "PRESENT").length,
        checkedOut: roster.filter((r) => r.status === "CHECKED_OUT").length,
        absentOrLeave: roster.filter((r) => r.status === "ABSENT_LEAVE").length,
        totalWorkDurationSeconds: totalWorkDuration,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, notes } = body; // action: "check-in" | "check-out"
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "User ID and action (check-in / check-out) are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayStr,
        },
      },
    });

    if (action === "check-in") {
      // If already present (checked in), inform them
      if (existing && existing.status === "PRESENT") {
        return NextResponse.json(
          { message: "You are currently checked in.", record: existing },
          { status: 200 }
        );
      }

      // If re-checking in after checking out (e.g. returning from break/lunch or resuming workday)
      if (existing && existing.status === "CHECKED_OUT") {
        const record = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: "PRESENT",
            checkOutTime: null,
            lastCheckInTime: now,
            sessionBreakDurationSeconds: 0,
            isOnBreak: false,
            currentBreakStartedAt: null,
            notes: notes ? `${existing.notes || ''} | Resumed check-in` : existing.notes,
          },
          include: { user: true },
        });

        return NextResponse.json({
          success: true,
          message: `Workday resumed / re-checked in at ${now.toLocaleTimeString()}`,
          record,
        });
      }

      // Initial check-in for the day
      const record = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId,
            date: todayStr,
          },
        },
        create: {
          userId,
          date: todayStr,
          checkInTime: now,
          lastCheckInTime: now,
          sessionBreakDurationSeconds: 0,
          workDurationSeconds: 0,
          breakDurationSeconds: 0,
          status: "PRESENT",
          notes: notes || "Standard check-in",
        },
        update: {
          checkInTime: existing?.checkInTime || now,
          lastCheckInTime: now,
          sessionBreakDurationSeconds: 0,
          status: "PRESENT",
          checkOutTime: null,
          notes: notes || existing?.notes,
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        message: `Check-in recorded at ${now.toLocaleTimeString()}`,
        record,
      });
    }

    if (action === "break") {
      if (!existing || existing.status === "CHECKED_OUT") {
        return NextResponse.json(
          { error: "Must be actively checked in to take a break." },
          { status: 400 }
        );
      }

      if (existing.isOnBreak) {
        return NextResponse.json(
          { message: "You are already on break.", record: existing },
          { status: 200 }
        );
      }

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: "ON_BREAK",
          isOnBreak: true,
          currentBreakStartedAt: now,
          notes: notes ? `${existing.notes || ''} | Break: ${notes}` : existing.notes,
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        message: `Break started at ${now.toLocaleTimeString()}`,
        record,
      });
    }

    if (action === "resume-break") {
      if (!existing || !existing.isOnBreak) {
        return NextResponse.json(
          { message: "You are not currently on break.", record: existing },
          { status: 200 }
        );
      }

      const breakSecs = existing.currentBreakStartedAt
        ? Math.max(0, Math.floor((now.getTime() - new Date(existing.currentBreakStartedAt).getTime()) / 1000))
        : 0;
      const totalBreakSeconds = (existing.breakDurationSeconds || 0) + breakSecs;
      const totalSessionBreakSeconds = (existing.sessionBreakDurationSeconds || 0) + breakSecs;

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: "PRESENT",
          isOnBreak: false,
          currentBreakStartedAt: null,
          breakDurationSeconds: totalBreakSeconds,
          sessionBreakDurationSeconds: totalSessionBreakSeconds,
          notes: notes ? `${existing.notes || ''} | Resumed work` : existing.notes,
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        message: `Work resumed at ${now.toLocaleTimeString()} (Break: ${Math.floor(breakSecs / 60)}m)`,
        record,
      });
    }

    if (action === "check-out") {
      if (!existing || !existing.checkInTime) {
        return NextResponse.json(
          { error: "Cannot check out without checking in first." },
          { status: 400 }
        );
      }

      // If checking out while on break, close the break session
      let finalBreakSeconds = existing.breakDurationSeconds || 0;
      let finalSessionBreakSeconds = existing.sessionBreakDurationSeconds || 0;
      if (existing.isOnBreak && existing.currentBreakStartedAt) {
        const extraBreak = Math.max(0, Math.floor((now.getTime() - new Date(existing.currentBreakStartedAt).getTime()) / 1000));
        finalBreakSeconds += extraBreak;
        finalSessionBreakSeconds += extraBreak;
      }

      // Determine the start time for the current active work session
      const sessionStart = existing.lastCheckInTime 
        ? new Date(existing.lastCheckInTime) 
        : (existing.checkInTime ? new Date(existing.checkInTime) : now);

      const sessionGrossSeconds = Math.max(0, Math.floor((now.getTime() - sessionStart.getTime()) / 1000));
      const sessionNetSeconds = Math.max(0, sessionGrossSeconds - finalSessionBreakSeconds);

      // Total work duration = previously recorded completed work duration + current session's net work duration
      const totalNetWorkSeconds = (existing.workDurationSeconds || 0) + sessionNetSeconds;

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          workDurationSeconds: totalNetWorkSeconds,
          breakDurationSeconds: finalBreakSeconds,
          sessionBreakDurationSeconds: finalSessionBreakSeconds,
          isOnBreak: false,
          currentBreakStartedAt: null,
          status: "CHECKED_OUT",
          notes: notes ? `${existing.notes || ''} | ${notes}` : existing.notes,
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        message: `Check-out recorded at ${now.toLocaleTimeString()}. Net work duration: ${Math.floor(totalNetWorkSeconds / 3600)}h ${Math.floor((totalNetWorkSeconds % 3600) / 60)}m (Break: ${Math.floor(finalBreakSeconds / 60)}m)`,
        record,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use check-in, check-out, break, or resume-break." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      userId,
      date,
      checkInTime,
      checkOutTime,
      breakDurationSeconds,
      workDurationSeconds,
      status,
      notes,
    } = body;

    let targetAttendance;
    if (id) {
      targetAttendance = await prisma.attendance.findUnique({ where: { id } });
    } else if (userId && date) {
      targetAttendance = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date } },
      });
    }

    if (!targetAttendance) {
      if (!userId || !date) {
        return NextResponse.json({ error: "Attendance ID or userId and date required." }, { status: 400 });
      }
      // Create new attendance record if none exists
      const newRec = await prisma.attendance.create({
        data: {
          userId,
          date,
          checkInTime: checkInTime ? new Date(checkInTime) : null,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          breakDurationSeconds: breakDurationSeconds ?? 0,
          workDurationSeconds: workDurationSeconds ?? 0,
          status: status || "PRESENT",
          notes: notes || "Adjusted by Admin",
        },
        include: { user: true },
      });
      return NextResponse.json({ success: true, record: newRec });
    }

    // Auto calculate workDurationSeconds if not explicitly provided and both check in and check out exist
    let calculatedWorkSecs = workDurationSeconds;
    if (calculatedWorkSecs === undefined && checkInTime && checkOutTime) {
      const gross = Math.max(0, Math.floor((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 1000));
      calculatedWorkSecs = Math.max(0, gross - (breakDurationSeconds ?? targetAttendance.breakDurationSeconds ?? 0));
    }

    const updated = await prisma.attendance.update({
      where: { id: targetAttendance.id },
      data: {
        ...(checkInTime !== undefined && { checkInTime: checkInTime ? new Date(checkInTime) : null }),
        ...(checkOutTime !== undefined && { checkOutTime: checkOutTime ? new Date(checkOutTime) : null }),
        ...(breakDurationSeconds !== undefined && { breakDurationSeconds: Number(breakDurationSeconds) }),
        ...(calculatedWorkSecs !== undefined && { workDurationSeconds: Number(calculatedWorkSecs) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: { user: true },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record updated successfully.",
      record: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
