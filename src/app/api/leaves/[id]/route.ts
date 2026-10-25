import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leaveId = params.id;
    const body = await request.json();
    const {
      status,
      reviewNotes,
      reviewerId,
      startDate,
      endDate,
      leaveType,
      reason,
      daysCount,
    } = body;

    if (!leaveId) {
      return NextResponse.json({ error: "Leave ID is required." }, { status: 400 });
    }

    const existingLeave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { user: true },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const newStatus = status || existingLeave.status;
    const newStartDate = startDate || existingLeave.startDate;
    const newEndDate = endDate || existingLeave.endDate;
    const newType = leaveType || existingLeave.leaveType;
    const newReason = reason !== undefined ? reason : existingLeave.reason;

    let calculatedDays = daysCount;
    if (calculatedDays === undefined || calculatedDays === null) {
      if (newType === "HALF_DAY") {
        calculatedDays = 0.5;
      } else {
        const s = new Date(newStartDate).getTime();
        const e = new Date(newEndDate).getTime();
        calculatedDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
      }
    }

    // If previously approved and dates or status change, clean up old attendance on-leave records
    if (existingLeave.status === "APPROVED" && (newStatus !== "APPROVED" || newStartDate !== existingLeave.startDate || newEndDate !== existingLeave.endDate)) {
      try {
        const oldStart = new Date(existingLeave.startDate);
        const oldEnd = new Date(existingLeave.endDate);
        const oldCur = new Date(oldStart);
        while (oldCur <= oldEnd) {
          const dateStr = oldCur.toISOString().slice(0, 10);
          await prisma.attendance.updateMany({
            where: {
              userId: existingLeave.userId,
              date: dateStr,
              status: "ON_LEAVE",
            },
            data: {
              status: "PRESENT",
              notes: "Leave adjusted by Admin",
            },
          });
          oldCur.setDate(oldCur.getDate() + 1);
        }
      } catch (cleanErr) {
        console.error("Error cleaning up previous leave attendance:", cleanErr);
      }
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: newStatus,
        startDate: newStartDate,
        endDate: newEndDate,
        leaveType: newType,
        reason: newReason,
        daysCount: calculatedDays,
        reviewNotes: reviewNotes !== undefined ? (reviewNotes?.trim() || null) : existingLeave.reviewNotes,
        reviewedById: reviewerId || existingLeave.reviewedById,
        reviewedAt: newStatus !== existingLeave.status ? new Date() : existingLeave.reviewedAt,
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
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If APPROVED, reflect in Attendance records for that date range
    if (status === "APPROVED") {
      try {
        const start = new Date(existingLeave.startDate);
        const end = new Date(existingLeave.endDate);

        const cur = new Date(start);
        while (cur <= end) {
          const dateStr = cur.toISOString().slice(0, 10);
          await prisma.attendance.upsert({
            where: {
              userId_date: {
                userId: existingLeave.userId,
                date: dateStr,
              },
            },
            create: {
              userId: existingLeave.userId,
              date: dateStr,
              status: "ON_LEAVE",
              workDurationSeconds: 0,
              notes: `Approved Leave: ${existingLeave.leaveType} - ${existingLeave.reason}`,
            },
            update: {
              status: "ON_LEAVE",
              notes: `Approved Leave: ${existingLeave.leaveType} - ${existingLeave.reason}`,
            },
          });
          cur.setDate(cur.getDate() + 1);
        }
      } catch (attErr) {
        console.error("Error updating attendance for approved leave:", attErr);
      }
    }

    return NextResponse.json({
      success: true,
      leave: updatedLeave,
      message: `Leave request has been ${status.toLowerCase()}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leaveId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role") || "EMPLOYEE";

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    // Authorization: Employee can only cancel their own PENDING leaves
    if (role === "EMPLOYEE") {
      if (leave.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      if (leave.status !== "PENDING") {
        return NextResponse.json(
          { error: "Cannot cancel a leave request that has already been reviewed." },
          { status: 400 }
        );
      }
    }

    await prisma.leaveRequest.delete({
      where: { id: leaveId },
    });

    return NextResponse.json({
      success: true,
      message: "Leave request deleted/cancelled successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
