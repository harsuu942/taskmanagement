import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        createdBy: true,
        client: true,
        timeLogs: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      userId,
      role,
      title,
      description,
      priority,
      recurrence,
      monthlyDay,
      weeklyDay,
      dueDate,
      startDate,
      assignedToId,
      clientId,
    } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { createdBy: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Determine user role
    let userRole = role;
    if (userId && !userRole) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) userRole = user.role;
    }

    const isAdmin = userRole === "ADMIN";

    // Role-based edit permission:
    // Admin can edit any task.
    // Employees can edit tasks assigned to them OR created by them.
    if (!isAdmin) {
      const isAssignee = existingTask.assignedToId === userId;
      const isCreator = existingTask.createdById === userId;
      if (!isAssignee && !isCreator) {
        return NextResponse.json(
          { error: "Permission denied: Employees can only edit tasks assigned to them or created by them." },
          { status: 403 }
        );
      }
    }

    // Employees cannot reassign tasks to other employees; stays assigned to them
    let effectiveAssignedToId = assignedToId;
    if (!isAdmin) {
      effectiveAssignedToId = existingTask.assignedToId || existingTask.createdById;
    }

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(recurrence && { recurrence }),
        ...(monthlyDay !== undefined && { monthlyDay: monthlyDay ? parseInt(monthlyDay, 10) : null }),
        ...(weeklyDay !== undefined && { weeklyDay: weeklyDay || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(effectiveAssignedToId !== undefined && { assignedToId: effectiveAssignedToId || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
      },
      include: {
        assignedTo: true,
        createdBy: true,
        client: true,
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");

    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let userRole = role;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) userRole = user.role;
    }

    const isAdmin = userRole === "ADMIN";
    const isCreator = !!userId && existingTask.createdById === userId;

    // Role-based delete permission:
    // Admin can delete any task.
    // Employees can ONLY delete tasks they created themselves.
    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { error: "Permission denied: Employees can only delete tasks they created themselves. Tasks created by Admin can only be deleted by Admin." },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: isAdmin ? "Task successfully deleted by Admin." : "Task successfully deleted.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
