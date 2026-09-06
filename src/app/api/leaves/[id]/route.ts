import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leaveId = params.id;
    const body = await request.json();
    const { status, reviewNotes, reviewerId } = body;

    if (!leaveId) {
      return NextResponse.json({ error: "Leave ID is required." }, { status: 400 });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED or REJECTED." },
        { status: 400 }
      );
    }

    const existingLeave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { user: true },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewNotes: reviewNotes?.trim() || null,
        reviewedById: reviewerId || null,
        reviewedAt: new Date(),
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
