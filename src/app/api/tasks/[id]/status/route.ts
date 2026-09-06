import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      role, // "ADMIN" | "EMPLOYEE"
      userId,
      employeeStatus, // "TODO" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED"
      adminStatus, // "PENDING_REVIEW" | "FINAL_COMPLETED" | "REVISION_REQUESTED"
    } = body;

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

    const updateData: any = {};
    const now = new Date();

    // 1. Employee updating Employee Status
    if (employeeStatus) {
      updateData.employeeStatus = employeeStatus;

      // When employee marks COMPLETED -> Set Admin Status to PENDING_REVIEW
      if (employeeStatus === "COMPLETED") {
        updateData.adminStatus = "PENDING_REVIEW";

        // Stop any running timer for this task
        if (task.isTimerRunning) {
          updateData.isTimerRunning = false;
          updateData.currentTimerStartedAt = null;

          // Close active time log
          for (const log of task.timeLogs) {
            const start = new Date(log.startTime);
            const sessionSecs = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 1000));
            await prisma.timeLog.update({
              where: { id: log.id },
              data: {
                endTime: now,
                isRunning: false,
                durationSeconds: sessionSecs,
              },
            });
            updateData.totalDurationSeconds = (task.totalDurationSeconds || 0) + sessionSecs;
          }
        }
      }

      // If employee marks ON_HOLD -> Pause running timer
      if (employeeStatus === "ON_HOLD" && task.isTimerRunning) {
        updateData.isTimerRunning = false;
        updateData.currentTimerStartedAt = null;

        for (const log of task.timeLogs) {
          const start = new Date(log.startTime);
          const sessionSecs = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 1000));
          await prisma.timeLog.update({
            where: { id: log.id },
            data: {
              endTime: now,
              isRunning: false,
              durationSeconds: sessionSecs,
            },
          });
          updateData.totalDurationSeconds = (task.totalDurationSeconds || 0) + sessionSecs;
        }
      }

      // If employee marks IN_PROGRESS and timer was not running -> can start timer if desired
      if (employeeStatus === "IN_PROGRESS" && !task.isTimerRunning && userId) {
        updateData.isTimerRunning = true;
        updateData.currentTimerStartedAt = now;
        await prisma.timeLog.create({
          data: {
            taskId: task.id,
            userId: userId,
            startTime: now,
            isRunning: true,
          },
        });
      }
    }

    // 2. Admin updating Admin Status (Final Approval Workflow)
    if (adminStatus) {
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only Admin can approve or update Admin Status." },
          { status: 403 }
        );
      }

      updateData.adminStatus = adminStatus;

      // When Admin gives Final Approval
      if (adminStatus === "FINAL_COMPLETED") {
        updateData.employeeStatus = "COMPLETED";

        // Stop running timer if any
        if (task.isTimerRunning) {
          updateData.isTimerRunning = false;
          updateData.currentTimerStartedAt = null;

          for (const log of task.timeLogs) {
            const start = new Date(log.startTime);
            const sessionSecs = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 1000));
            await prisma.timeLog.update({
              where: { id: log.id },
              data: {
                endTime: now,
                isRunning: false,
                durationSeconds: sessionSecs,
              },
            });
            updateData.totalDurationSeconds = (task.totalDurationSeconds || 0) + sessionSecs;
          }
        }
      } else if (adminStatus === "REVISION_REQUESTED") {
        // Sends back to employee
        updateData.employeeStatus = "IN_PROGRESS";
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: true,
        timeLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: `Status successfully updated: Employee [${updatedTask.employeeStatus}], Admin [${updatedTask.adminStatus}]`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
