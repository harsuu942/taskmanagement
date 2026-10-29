import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role") || "EMPLOYEE";
    const status = searchParams.get("status") || "ALL";
    const employeeId = searchParams.get("employeeId") || "ALL";
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const todayStr = new Date().toISOString().slice(0, 10);

    // Build Prisma query condition
    const where: any = {};

    if (role === "EMPLOYEE") {
      // Employees only see their own leave requests
      if (!userId) {
        return NextResponse.json({ error: "User ID required for employee view" }, { status: 400 });
      }
      where.userId = userId;
    } else {
      // Admin view: Can filter by specific employee
      if (employeeId && employeeId !== "ALL") {
        where.userId = employeeId;
      }
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            role: true,
            userId: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    // Client-side text search filter if needed
    const filteredLeaves = search
      ? leaves.filter(
          (l) =>
            l.user.name.toLowerCase().includes(search) ||
            l.user.email.toLowerCase().includes(search) ||
            l.reason.toLowerCase().includes(search) ||
            l.leaveType.toLowerCase().includes(search)
        )
      : leaves;

    // Calculate metrics & statistics
    const allLeavesForStats = await prisma.leaveRequest.findMany({
      where: role === "EMPLOYEE" && userId ? { userId } : {},
    });

    const pendingCount = allLeavesForStats.filter((l) => l.status === "PENDING").length;
    const approvedCount = allLeavesForStats.filter((l) => l.status === "APPROVED").length;
    const rejectedCount = allLeavesForStats.filter((l) => l.status === "REJECTED").length;

    // Staff currently on approved leave today
    const onLeaveTodayLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: todayStr },
        endDate: { gte: todayStr },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
          },
        },
      },
    });

    const stats = {
      totalLeaves: allLeavesForStats.length,
      pendingCount,
      approvedCount,
      rejectedCount,
      onLeaveTodayCount: onLeaveTodayLeaves.length,
      onLeaveTodayStaff: onLeaveTodayLeaves.map((l) => ({
        id: l.user.id,
        name: l.user.name,
        leaveType: l.leaveType,
        endDate: l.endDate,
      })),
    };

    // Calculate Leave Available - Leave Taken - Balance summary (18 days annual quota, 1.5 days/month Earned Leave)
    const approvedUserLeaves = allLeavesForStats.filter((l) => l.status === "APPROVED");
    const casualTaken = approvedUserLeaves
      .filter((l) => l.leaveType === "CASUAL" || l.leaveType === "HALF_DAY" || l.leaveType === "HOURLY")
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);
    const sickTaken = approvedUserLeaves
      .filter((l) => l.leaveType === "SICK")
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);
    const earnedTaken = approvedUserLeaves
      .filter((l) => l.leaveType === "EARNED")
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);
    const unpaidTaken = approvedUserLeaves
      .filter((l) => l.leaveType === "UNPAID")
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);

    const totalPaidTaken = parseFloat((casualTaken + sickTaken + earnedTaken).toFixed(2));
    const totalAnnualQuota = 18;
    const totalBalance = parseFloat(Math.max(0, totalAnnualQuota - totalPaidTaken).toFixed(2));

    const leaveSummary = [
      {
        leaveType: "EARNED",
        label: "Earned Leave (EL)",
        totalAvailable: 18, // 1.5 days per month * 12 months = 18 days
        taken: parseFloat(earnedTaken.toFixed(2)),
        balance: parseFloat(Math.max(0, 18 - earnedTaken).toFixed(2)),
      },
      {
        leaveType: "CASUAL",
        label: "Casual Leave",
        totalAvailable: 0,
        taken: parseFloat(casualTaken.toFixed(2)),
        balance: totalBalance,
      },
      {
        leaveType: "SICK",
        label: "Sick Leave",
        totalAvailable: 0,
        taken: parseFloat(sickTaken.toFixed(2)),
        balance: totalBalance,
      },
      {
        leaveType: "UNPAID",
        label: "Unpaid / LWP",
        totalAvailable: 0,
        taken: parseFloat(unpaidTaken.toFixed(2)),
        balance: 0,
      },
      {
        leaveType: "TOTAL",
        label: "Total Annual Quota",
        totalAvailable: 18,
        taken: totalPaidTaken,
        balance: totalBalance,
      },
    ];

    return NextResponse.json({
      leaves: filteredLeaves,
      stats,
      leaveSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Admin Bulk Import from Excel / CSV / PDF
    if (body.leaves && Array.isArray(body.leaves)) {
      const imported: any[] = [];
      const standardHours = 8;

      for (const item of body.leaves) {
        let user = null;
        if (item.userId) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { id: item.userId },
                { userId: item.userId },
                { email: item.userId.toLowerCase() },
              ],
            },
          });
        }
        if (!user && item.email) {
          user = await prisma.user.findUnique({
            where: { email: item.email.toLowerCase().trim() },
          });
        }
        if (!user && item.name) {
          user = await prisma.user.findFirst({
            where: { name: { contains: item.name.trim() } },
          });
        }

        if (!user) continue;

        const sDate = item.startDate?.trim();
        const eDate = (item.endDate?.trim()) || sDate;
        if (!sDate) continue;

        const lType = (item.leaveType?.toUpperCase() || "CASUAL").replace(/\s+/g, "_");
        const hours = item.durationHours ? parseFloat(item.durationHours) : null;
        let dCount = item.daysCount ? parseFloat(item.daysCount) : 1;
        if (hours && !item.daysCount) {
          dCount = parseFloat((hours / standardHours).toFixed(2));
        }

        const stat = item.status?.toUpperCase() === "PENDING" ? "PENDING" : "APPROVED";

        const leave = await prisma.leaveRequest.create({
          data: {
            userId: user.id,
            leaveType: lType,
            startDate: sDate,
            endDate: eDate,
            daysCount: dCount,
            durationHours: hours,
            isHourly: !!hours,
            reason: item.reason?.trim() || "Imported leave record",
            status: stat,
            reviewedAt: stat === "APPROVED" ? new Date() : null,
            reviewNotes: item.notes || "Admin batch import",
          },
        });
        imported.push(leave);

        // If approved, sync ON_LEAVE to attendance
        if (stat === "APPROVED") {
          const startT = new Date(sDate).getTime();
          const endT = new Date(eDate).getTime();
          const oneDay = 24 * 3600 * 1000;
          for (let t = startT; t <= endT; t += oneDay) {
            const dateStr = new Date(t).toISOString().slice(0, 10);
            await prisma.attendance.upsert({
              where: { userId_date: { userId: user.id, date: dateStr } },
              update: { status: "ON_LEAVE", notes: `Approved Leave (${lType})` },
              create: {
                userId: user.id,
                date: dateStr,
                status: "ON_LEAVE",
                workDurationSeconds: 0,
                breakDurationSeconds: 0,
                notes: `Approved Leave (${lType})`,
              },
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        count: imported.length,
        message: `Successfully imported ${imported.length} leave records.`,
      });
    }

    // 2. Single Leave Application
    const { userId, leaveType, startDate, endDate, reason, daysCount, durationHours, isHourly } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (!leaveType) {
      return NextResponse.json({ error: "Leave type is required." }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and End date are required." }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason for leave is required." }, { status: 400 });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: "Start date cannot be after end date." }, { status: 400 });
    }

    // Guard: Employee cannot apply leave on a Public Holiday
    const overlappingHolidays = await prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    if (overlappingHolidays.length > 0) {
      const holidayNames = overlappingHolidays.map((h) => `${h.date}: ${h.name}`).join(", ");
      return NextResponse.json(
        {
          error: `Cannot apply leave on official Public Holiday (${holidayNames}). Public holidays are recognized non-working days.`,
        },
        { status: 400 }
      );
    }

    // Calculate day count & duration
    const standardDailyHours = 8;
    let finalDaysCount = 1;
    let finalHours: number | null = durationHours ? parseFloat(durationHours) : null;

    if (isHourly || leaveType === "HOURLY") {
      finalHours = durationHours ? parseFloat(durationHours) : 4;
      finalDaysCount = parseFloat((finalHours / standardDailyHours).toFixed(2));
    } else if (leaveType === "HALF_DAY") {
      finalDaysCount = 0.5;
      finalHours = standardDailyHours / 2;
    } else {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const diffDays = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
      finalDaysCount = daysCount ? parseFloat(daysCount) : Math.max(1, diffDays);
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate,
        endDate,
        daysCount: finalDaysCount,
        durationHours: finalHours,
        isHourly: !!(isHourly || leaveType === "HOURLY"),
        reason: reason.trim(),
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
