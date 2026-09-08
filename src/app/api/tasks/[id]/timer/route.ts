import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, userId, note } = body; // action: "start" | "hold" | "resume" | "stop" | "complete"

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        timeLogs: {
          where: { isRunning: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date();
    let updatedTotalSeconds = task.totalDurationSeconds || 0;

    if (action === "start" || action === "resume") {
      // If already running, do not duplicate
      if (task.isTimerRunning) {
        return NextResponse.json({
          success: true,
          task,
          message: "Timer is already active for this task.",
        });
      }

      // Start new timer session
      await prisma.timeLog.create({
        data: {
          taskId: task.id,
          userId: userId || task.assignedToId || task.createdById,
          startTime: now,
          isRunning: true,
          note: note || (action === "resume" ? "Resumed task session" : "Started task work"),
        },
      });

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          isTimerRunning: true,
          currentTimerStartedAt: now,
          employeeStatus: "IN_PROGRESS",
        },
        include: {
          assignedTo: true,
          timeLogs: { orderBy: { createdAt: "desc" } },
        },
      });

      return NextResponse.json({
        success: true,
        task: updated,
        message: "Timer started successfully.",
      });
    }

    if (action === "hold" || action === "pause") {
      // Stop running session and put task on HOLD
      if (task.isTimerRunning) {
        for (const log of task.timeLogs) {
          const start = new Date(log.startTime);
          const sessionSecs = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 1000));
          await prisma.timeLog.update({
            where: { id: log.id },
            data: {
              endTime: now,
              isRunning: false,
              durationSeconds: sessionSecs,
              note: note || "Paused / Placed on hold",
            },
          });
          updatedTotalSeconds += sessionSecs;
        }
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          isTimerRunning: false,
          currentTimerStartedAt: null,
          employeeStatus: "ON_HOLD",
          totalDurationSeconds: updatedTotalSeconds,
        },
        include: {
          assignedTo: true,
          timeLogs: { orderBy: { createdAt: "desc" } },
        },
      });

      return NextResponse.json({
        success: true,
        task: updated,
        message: "Timer paused and task placed on hold.",
      });
    }

    if (action === "stop" || action === "complete") {
      // Close running session and mark COMPLETED -> PENDING_REVIEW
      if (task.isTimerRunning) {
        for (const log of task.timeLogs) {
          const start = new Date(log.startTime);
          const sessionSecs = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 1000));
          await prisma.timeLog.update({
            where: { id: log.id },
            data: {
              endTime: now,
              isRunning: false,
              durationSeconds: sessionSecs,
              note: note || "Completed task work",
            },
          });
          updatedTotalSeconds += sessionSecs;
        }
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          isTimerRunning: false,
          currentTimerStartedAt: null,
          employeeStatus: "COMPLETED",
          adminStatus: "PENDING_REVIEW",
          totalDurationSeconds: updatedTotalSeconds,
        },
        include: {
          assignedTo: true,
          timeLogs: { orderBy: { createdAt: "desc" } },
        },
      });

      return NextResponse.json({
        success: true,
        task: updated,
        message: "Task completed! Awaiting Admin final approval.",
      });
    }

    if (action === "manual_log") {
      const { durationMinutes, durationSeconds, logDate, note } = body;
      const secs = durationSeconds
        ? parseInt(durationSeconds, 10)
        : durationMinutes
        ? Math.round(parseFloat(durationMinutes) * 60)
        : 0;
      if (secs <= 0) {
        return NextResponse.json(
          { error: "Please provide a valid positive duration." },
          { status: 400 }
        );
      }

      const logTimestamp = logDate ? new Date(logDate) : new Date();
      const endTimestamp = new Date(logTimestamp.getTime() + secs * 1000);

      await prisma.timeLog.create({
        data: {
          taskId: task.id,
          userId: userId || task.assignedToId || task.createdById,
          startTime: logTimestamp,
          endTime: endTimestamp,
          durationSeconds: secs,
          isRunning: false,
          note: note || "Manual time entry",
          createdAt: logTimestamp,
        },
      });

      const newTotal = (task.totalDurationSeconds || 0) + secs;

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          totalDurationSeconds: newTotal,
        },
        include: {
          assignedTo: true,
          taskClients: { include: { client: true } },
          assignees: { include: { user: true } },
          timeLogs: { orderBy: { createdAt: "desc" } },
        },
      });

      return NextResponse.json({
        success: true,
        task: updated,
        message: `Manually logged ${Math.round(secs / 60)} minutes to task.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use start, hold, resume, complete, or manual_log." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
