import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processRecurringTasks } from "@/lib/scheduler";

export async function GET(request: Request) {
  try {
    // Auto-process any pending recurring tasks for today
    try {
      await processRecurringTasks();
    } catch (schedErr) {
      console.error("[Tasks API] Scheduler auto-run warning:", schedErr);
    }

    const { searchParams } = new URL(request.url);
    const assignedToId = searchParams.get("assignedToId");
    const clientId = searchParams.get("clientId");
    const recurrence = searchParams.get("recurrence");
    const employeeStatus = searchParams.get("employeeStatus");
    const adminStatus = searchParams.get("adminStatus");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const showTemplates = searchParams.get("showTemplates") === "true";
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    const where: any = {};
    const andConditions: any[] = [];

    if (!showTemplates) {
      where.isRecurringTemplate = false;
    }

    // Role-based isolation: Employees see tasks assigned directly, multi-assigned, or created by them
    if (role === "EMPLOYEE" && userId) {
      andConditions.push({
        OR: [
          { assignedToId: userId },
          { assignees: { some: { userId: userId } } },
          { createdById: userId },
        ],
      });
    } else if (assignedToId && assignedToId !== "ALL") {
      andConditions.push({
        OR: [
          { assignedToId: assignedToId },
          { assignees: { some: { userId: assignedToId } } },
        ],
      });
    }

    if (clientId && clientId !== "ALL") {
      andConditions.push({
        OR: [
          { clientId: clientId },
          { taskClients: { some: { clientId: clientId } } },
        ],
      });
    }

    if (recurrence && recurrence !== "ALL") {
      where.recurrence = recurrence;
    }

    if (employeeStatus && employeeStatus !== "ALL") {
      where.employeeStatus = employeeStatus;
    }

    if (adminStatus && adminStatus !== "ALL") {
      where.adminStatus = adminStatus;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: true,
        createdBy: true,
        client: true,
        taskClients: {
          include: {
            client: true,
          },
        },
        assignees: {
          include: {
            user: true,
          },
        },
        timeLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        proofs: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      recurrence = "ONE_TIME",
      monthlyDay,
      weeklyDay,
      startDate,
      dueDate,
      priority = "MEDIUM",
      assignedToId,
      assigneeIds,
      createdById,
      clientId,
      clientIds,
      billableHours = 0,
    } = body;

    if (!title || !createdById) {
      return NextResponse.json(
        { error: "Title and Creator are required." },
        { status: 400 }
      );
    }

    // Check creator role for permission enforcement
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
    });

    let effectiveAssignedToId = assignedToId || null;
    let effectiveAssigneeIds: string[] = Array.isArray(assigneeIds) ? assigneeIds : [];

    // Strict Rule: Employees can only create tasks for themselves and cannot assign to any other employee
    if (creator?.role === "EMPLOYEE") {
      effectiveAssignedToId = createdById;
      effectiveAssigneeIds = [createdById];
    } else {
      // Admin: ensure primary assignedToId and assigneeIds sync
      if (!effectiveAssignedToId && effectiveAssigneeIds.length > 0) {
        effectiveAssignedToId = effectiveAssigneeIds[0];
      }
      if (effectiveAssignedToId && !effectiveAssigneeIds.includes(effectiveAssignedToId)) {
        effectiveAssigneeIds = [effectiveAssignedToId, ...effectiveAssigneeIds];
      }
    }

    let effectiveClientId = clientId || null;
    let effectiveClientIds: string[] = Array.isArray(clientIds) ? clientIds : [];
    if (!effectiveClientId && effectiveClientIds.length > 0) {
      effectiveClientId = effectiveClientIds[0];
    }
    if (effectiveClientId && !effectiveClientIds.includes(effectiveClientId)) {
      effectiveClientIds = [effectiveClientId, ...effectiveClientIds];
    }

    const isRecurring = recurrence !== "ONE_TIME";
    const numericBillableHours = billableHours ? parseFloat(billableHours) : 0;

    // 1. Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        recurrence,
        monthlyDay: monthlyDay ? parseInt(monthlyDay, 10) : null,
        weeklyDay: weeklyDay || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        employeeStatus: "TODO",
        adminStatus: "NOT_SUBMITTED",
        assignedToId: effectiveAssignedToId,
        clientId: effectiveClientId,
        billableHours: numericBillableHours,
        createdById,
        isRecurringTemplate: false,
        taskClients: effectiveClientIds.length > 0 ? {
          create: effectiveClientIds.map((cid) => ({ clientId: cid })),
        } : undefined,
        assignees: effectiveAssigneeIds.length > 0 ? {
          create: effectiveAssigneeIds.map((uid) => ({ userId: uid })),
        } : undefined,
      },
      include: {
        assignedTo: true,
        createdBy: true,
        client: true,
        taskClients: {
          include: {
            client: true,
          },
        },
        assignees: {
          include: {
            user: true,
          },
        },
      },
    });

    // 2. If recurring, also create a template record so the scheduler can spawn it
    if (isRecurring) {
      await prisma.task.create({
        data: {
          title,
          description,
          recurrence,
          monthlyDay: monthlyDay ? parseInt(monthlyDay, 10) : null,
          weeklyDay: weeklyDay || null,
          startDate: startDate ? new Date(startDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          priority,
          employeeStatus: "TODO",
          adminStatus: "NOT_SUBMITTED",
          assignedToId: effectiveAssignedToId,
          clientId: effectiveClientId,
          billableHours: numericBillableHours,
          createdById,
          isRecurringTemplate: true,
          lastGeneratedDate: new Date(),
          taskClients: effectiveClientIds.length > 0 ? {
            create: effectiveClientIds.map((cid) => ({ clientId: cid })),
          } : undefined,
          assignees: effectiveAssigneeIds.length > 0 ? {
            create: effectiveAssigneeIds.map((uid) => ({ userId: uid })),
          } : undefined,
        },
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk Actions: Batch Approve
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskIds, action, userId, role } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "No tasks provided." }, { status: 400 });
    }

    let userRole = role;
    if (userId && !userRole) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) userRole = u.role;
    }

    if (action === "approve") {
      if (userRole !== "ADMIN") {
        return NextResponse.json({ error: "Only Admins can approve tasks." }, { status: 403 });
      }

      const updateResult = await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: {
          adminStatus: "FINAL_COMPLETED",
          employeeStatus: "COMPLETED",
          isTimerRunning: false,
          currentTimerStartedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        count: updateResult.count,
        message: `Successfully approved ${updateResult.count} tasks.`,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk Actions: Batch Delete
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { taskIds, userId, role } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "No tasks provided for deletion." }, { status: 400 });
    }

    let userRole = role;
    if (userId && !userRole) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) userRole = u.role;
    }

    const isAdmin = userRole === "ADMIN";

    // Where filter: Admin can delete any; Employee can only delete their own
    const deleteWhere: any = {
      id: { in: taskIds },
    };
    if (!isAdmin) {
      deleteWhere.createdById = userId;
    }

    const deleteResult = await prisma.task.deleteMany({
      where: deleteWhere,
    });

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} tasks.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
