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

    // Fetch dynamic leave settings configured by Admin
    const allSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "LEAVE_TYPES_CONFIG",
            "ANNUAL_LEAVE_QUOTA",
            "EARNED_LEAVE_DAYS",
            "EARNED_LEAVE_ACCRUAL",
            "CASUAL_LEAVE_DAYS",
            "SICK_LEAVE_DAYS",
            "UNPAID_LEAVE_ENABLED",
          ],
        },
      },
    });
    const sMap: Record<string, string> = {};
    allSettings.forEach((s) => {
      sMap[s.key] = s.value;
    });

    const earnedDays = parseFloat(sMap["EARNED_LEAVE_DAYS"] || sMap["ANNUAL_LEAVE_QUOTA"] || "18");
    const earnedLeaveAccrual = parseFloat(sMap["EARNED_LEAVE_ACCRUAL"] || "1.5");
    const casualDays = parseFloat(sMap["CASUAL_LEAVE_DAYS"] || "0");
    const sickDays = parseFloat(sMap["SICK_LEAVE_DAYS"] || "0");
    const unpaidEnabled = sMap["UNPAID_LEAVE_ENABLED"] === "true";

    let configuredLeaveTypes: any[] = [];
    if (sMap["LEAVE_TYPES_CONFIG"]) {
      try {
        configuredLeaveTypes = JSON.parse(sMap["LEAVE_TYPES_CONFIG"]);
      } catch (e) {}
    }
    if (!configuredLeaveTypes || !Array.isArray(configuredLeaveTypes) || configuredLeaveTypes.length === 0) {
      configuredLeaveTypes = [
        { id: "EARNED", name: "Earned Leave (EL)", annualDays: earnedDays, accrualRate: earnedLeaveAccrual, isPaid: true, isDefault: true },
        { id: "CASUAL", name: "Casual Leave (CL)", annualDays: casualDays, accrualRate: 0, isPaid: true, isDefault: true },
        { id: "SICK", name: "Sick Leave (SL)", annualDays: sickDays, accrualRate: 0, isPaid: true, isDefault: true },
        { id: "UNPAID", name: "Unpaid Leave (LWP)", annualDays: 0, accrualRate: 0, isPaid: false, isDefault: true },
      ];
    }

    const leaveSummary: any[] = [];
    let totalPaidQuota = 0;
    let totalPaidTaken = 0;

    for (const type of configuredLeaveTypes) {
      const isPaid = type.isPaid !== false;
      const annualDays = parseFloat(type.annualDays) || 0;
      const typeIdUpper = String(type.id).toUpperCase();

      // Filter approved leaves taken for this type
      const taken = approvedUserLeaves
        .filter((l) => {
          const lType = l.leaveType.toUpperCase();
          if (typeIdUpper === "CASUAL" && (lType === "HALF_DAY" || lType === "HOURLY")) {
            return true;
          }
          return lType === typeIdUpper;
        })
        .reduce((acc, l) => acc + (l.daysCount || 1), 0);

      const takenFixed = parseFloat(taken.toFixed(2));
      const balance = parseFloat(Math.max(0, annualDays - takenFixed).toFixed(2));

      if (isPaid) {
        totalPaidQuota += annualDays;
        totalPaidTaken += takenFixed;
      }

      // Only push to summary cards if annualDays > 0 (or if unpaid and either enabled or taken > 0)
      if (annualDays > 0 || (!isPaid && (unpaidEnabled || takenFixed > 0))) {
        leaveSummary.push({
          leaveType: type.id,
          label: type.name || type.id,
          totalAvailable: annualDays,
          accrualRate: type.accrualRate || undefined,
          taken: takenFixed,
          balance: isPaid ? balance : 0,
        });
      }
    }

    // Always include Total Annual Quota card
    const totalBalance = parseFloat(Math.max(0, totalPaidQuota - totalPaidTaken).toFixed(2));
    leaveSummary.push({
      leaveType: "TOTAL",
      label: "Total Annual Quota",
      totalAvailable: parseFloat(totalPaidQuota.toFixed(2)),
      taken: parseFloat(totalPaidTaken.toFixed(2)),
      balance: totalBalance,
    });

    return NextResponse.json({
      leaves: filteredLeaves,
      stats,
      leaveSummary,
      configuredLeaveTypes,
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

    // Fetch leave types configuration to verify balance
    const configSetting = await prisma.systemSetting.findUnique({
      where: { key: "LEAVE_TYPES_CONFIG" },
    });
    let leaveTypesList: any[] = [
      { id: "EARNED", name: "Earned Leave (EL)", annualDays: 18, isPaid: true },
      { id: "CASUAL", name: "Casual Leave (CL)", annualDays: 0, isPaid: true },
      { id: "SICK", name: "Sick Leave (SL)", annualDays: 0, isPaid: true },
      { id: "UNPAID", name: "Unpaid Leave (LWP)", annualDays: 0, isPaid: false },
    ];
    if (configSetting?.value) {
      try {
        leaveTypesList = JSON.parse(configSetting.value);
      } catch (e) {}
    }

    const typeIdUpper = String(leaveType).toUpperCase();
    const matchingType = leaveTypesList.find(
      (t: any) => String(t.id).toUpperCase() === typeIdUpper
    );

    let autoConvertedToUnpaid = false;
    let finalLeaveType = leaveType;
    let finalReason = reason.trim();
    let remainingPaidBalance = 0;

    // Check if employee has 0 balance for a paid leave type
    if (typeIdUpper !== "UNPAID") {
      const annualQuota = matchingType ? parseFloat(matchingType.annualDays) || 0 : 0;
      const isPaidType = matchingType ? matchingType.isPaid !== false : true;

      if (isPaidType) {
        const approvedForType = await prisma.leaveRequest.findMany({
          where: {
            userId,
            status: "APPROVED",
            OR: [
              { leaveType: typeIdUpper },
              ...(typeIdUpper === "CASUAL" ? [{ leaveType: "HALF_DAY" }, { leaveType: "HOURLY" }] : []),
            ],
          },
        });
        const taken = approvedForType.reduce((acc, l) => acc + (l.daysCount || 1), 0);
        remainingPaidBalance = Math.max(0, annualQuota - taken);

        if (remainingPaidBalance <= 0) {
          autoConvertedToUnpaid = true;
          finalLeaveType = "UNPAID";
          finalReason = `${finalReason} (Auto-applied as Unpaid Leave: Available balance was 0)`;
        }
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType: finalLeaveType,
        startDate,
        endDate,
        daysCount: finalDaysCount,
        durationHours: finalHours,
        isHourly: !!(isHourly || leaveType === "HOURLY"),
        reason: finalReason,
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

    return NextResponse.json({
      success: true,
      leave,
      autoConvertedToUnpaid,
      message: autoConvertedToUnpaid
        ? "Leave application submitted. Because your available paid leave balance was 0, it was automatically applied as Unpaid Leave (LWP)."
        : "Leave application submitted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
