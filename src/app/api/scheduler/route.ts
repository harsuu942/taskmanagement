import { NextResponse } from "next/server";
import { processRecurringTasks, checkAndProcessAbsentEmployees } from "@/lib/scheduler";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // List all recurring templates
    const templates = await prisma.task.findMany({
      where: { isRecurringTemplate: true },
      include: { assignedTo: true, createdBy: true, client: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "all";

    let taskResults = null;
    let absentResults = null;

    if (action === "all" || action === "recurrence") {
      taskResults = await processRecurringTasks();
    }

    if (action === "all" || action === "attendance") {
      absentResults = await checkAndProcessAbsentEmployees();
    }

    return NextResponse.json({
      success: true,
      message: "Scheduler cycle executed successfully.",
      taskResults,
      absentResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
