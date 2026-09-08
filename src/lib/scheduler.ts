import prisma from "./prisma";

export async function processRecurringTasks() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const dayOfMonth = now.getDate();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  console.log(`[Scheduler] Running recurring task check for ${todayStr}...`);

  // Find all recurring template tasks
  const recurringTemplates = await prisma.task.findMany({
    where: {
      isRecurringTemplate: true,
    },
    include: {
      assignedTo: true,
      taskClients: true,
      assignees: true,
    },
  });

  const generatedTasks: any[] = [];

  for (const tpl of recurringTemplates) {
    let shouldGenerateToday = false;
    const lastGen = tpl.lastGeneratedDate ? new Date(tpl.lastGeneratedDate) : null;

    if (tpl.recurrence === "DAILY") {
      // Generate if not generated today
      if (!lastGen || lastGen.toISOString().slice(0, 10) !== todayStr) {
        shouldGenerateToday = true;
      }
    } else if (tpl.recurrence === "WEEKLY") {
      // Check if not generated today and matches weekday (default Monday=1 or creation day)
      const targetDay = tpl.monthlyDay ? tpl.monthlyDay % 7 : 1;
      if (dayOfWeek === targetDay && (!lastGen || lastGen.toISOString().slice(0, 10) !== todayStr)) {
        shouldGenerateToday = true;
      }
    } else if (tpl.recurrence === "MONTHLY") {
      // Check if today matches monthlyDay (e.g. 1st, 15th)
      const targetDate = tpl.monthlyDay || 1;
      if (dayOfMonth === targetDate) {
        const lastGenMonth = lastGen ? lastGen.getMonth() : -1;
        const lastGenYear = lastGen ? lastGen.getFullYear() : -1;
        if (lastGenMonth !== currentMonth || lastGenYear !== currentYear) {
          shouldGenerateToday = true;
        }
      }
    } else if (tpl.recurrence === "QUARTERLY") {
      const targetDate = tpl.monthlyDay || 1;
      if (dayOfMonth === targetDate && [0, 3, 6, 9].includes(currentMonth)) {
        const diffMonths = lastGen ? (currentYear - lastGen.getFullYear()) * 12 + (currentMonth - lastGen.getMonth()) : 99;
        if (diffMonths >= 3) {
          shouldGenerateToday = true;
        }
      }
    } else if (tpl.recurrence === "HALF_YEARLY") {
      const targetDate = tpl.monthlyDay || 1;
      if (dayOfMonth === targetDate && [0, 6].includes(currentMonth)) {
        const diffMonths = lastGen ? (currentYear - lastGen.getFullYear()) * 12 + (currentMonth - lastGen.getMonth()) : 99;
        if (diffMonths >= 6) {
          shouldGenerateToday = true;
        }
      }
    } else if (tpl.recurrence === "YEARLY") {
      const targetDate = tpl.monthlyDay || 1;
      if (dayOfMonth === targetDate && currentMonth === 0) {
        if (!lastGen || lastGen.getFullYear() !== currentYear) {
          shouldGenerateToday = true;
        }
      }
    }

    if (shouldGenerateToday) {
      // Calculate due date based on template or end of day/week
      const startDate = new Date();
      startDate.setHours(7, 0, 0, 0); // Start at 7:00 AM every morning

      const dueDate = new Date(startDate);
      if (tpl.recurrence === "DAILY") {
        dueDate.setHours(19, 0, 0, 0);
      } else if (tpl.recurrence === "WEEKLY") {
        dueDate.setDate(dueDate.getDate() + 6);
      } else if (tpl.recurrence === "MONTHLY") {
        dueDate.setDate(dueDate.getDate() + 14); // 2 weeks default for monthly milestone
      } else {
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const newTask = await prisma.task.create({
        data: {
          title: tpl.title,
          description: tpl.description,
          recurrence: tpl.recurrence,
          monthlyDay: tpl.monthlyDay,
          priority: tpl.priority,
          startDate: startDate,
          dueDate: dueDate,
          employeeStatus: "TODO",
          adminStatus: "NOT_SUBMITTED",
          assignedToId: tpl.assignedToId,
          clientId: tpl.clientId,
          billableHours: tpl.billableHours,
          createdById: tpl.createdById,
          parentRecurringId: tpl.id,
          isRecurringTemplate: false,
          taskClients: tpl.taskClients?.length
            ? {
                create: tpl.taskClients.map((tc: any) => ({ clientId: tc.clientId })),
              }
            : undefined,
          assignees: tpl.assignees?.length
            ? {
                create: tpl.assignees.map((ta: any) => ({ userId: ta.userId })),
              }
            : undefined,
        },
      });

      // Update template lastGeneratedDate
      await prisma.task.update({
        where: { id: tpl.id },
        data: { lastGeneratedDate: now },
      });

      generatedTasks.push(newTask);
      console.log(`[Scheduler] Spawned task "${newTask.title}" for ${todayStr} (Assignee: ${tpl.assignedTo?.name || 'Unassigned'})`);
    }
  }

  return {
    processedAt: now,
    generatedCount: generatedTasks.length,
    tasks: generatedTasks,
  };
}

export async function checkAndProcessAbsentEmployees() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
  });

  const absentFlags: any[] = [];

  for (const emp of employees) {
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: emp.id,
          date: todayStr,
        },
      },
    });

    // If no record exists, register as ABSENT_LEAVE
    if (!existing) {
      const record = await prisma.attendance.create({
        data: {
          userId: emp.id,
          date: todayStr,
          status: "ABSENT_LEAVE",
          notes: "Auto-flagged: No check-in recorded for today.",
        },
      });
      absentFlags.push(record);
    }
  }

  return {
    date: todayStr,
    flaggedAbsentCount: absentFlags.length,
  };
}
