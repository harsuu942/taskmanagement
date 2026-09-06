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
          return {
            date: startDate,
            employee: emp,
            record,
            status: record.status,
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime,
            workDurationSeconds: record.workDurationSeconds,
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

      roster = attendances.map((rec) => ({
        date: rec.date,
        employee: rec.user,
        record: rec,
        status: rec.status,
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
        workDurationSeconds: rec.workDurationSeconds,
      }));
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
            workDurationSeconds: todayRecord.workDurationSeconds,
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

      // If re-checking in after checking out (e.g. accidental checkout recovery or resuming workday)
      if (existing && existing.status === "CHECKED_OUT") {
        const record = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: "PRESENT",
            checkOutTime: null,
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
          status: "PRESENT",
          notes: notes || "Standard check-in",
        },
        update: {
          checkInTime: now,
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

    if (action === "check-out") {
      if (!existing || !existing.checkInTime) {
        return NextResponse.json(
          { error: "Cannot check out without checking in first." },
          { status: 400 }
        );
      }

      const checkInDate = new Date(existing.checkInTime);
      const totalSeconds = Math.max(0, Math.floor((now.getTime() - checkInDate.getTime()) / 1000));

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          workDurationSeconds: totalSeconds,
          status: "CHECKED_OUT",
          notes: notes ? `${existing.notes || ''} | ${notes}` : existing.notes,
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        message: `Check-out recorded at ${now.toLocaleTimeString()}. Total shift duration: ${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`,
        record,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use check-in or check-out." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
