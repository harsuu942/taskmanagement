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

    return NextResponse.json({
      leaves: filteredLeaves,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, leaveType, startDate, endDate, reason, daysCount } = body;

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

    // Calculate day count
    let calculatedDays = 1;
    if (leaveType === "HALF_DAY") {
      calculatedDays = 1;
    } else {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const diffDays = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
      calculatedDays = Math.max(1, diffDays);
    }

    const finalDaysCount = daysCount ? parseInt(daysCount, 10) : calculatedDays;

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate,
        endDate,
        daysCount: finalDaysCount,
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
