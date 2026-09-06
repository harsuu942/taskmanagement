import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Returns current user or list of users for fast role switching
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const users = await prisma.user.findMany({
      orderBy: { role: "asc" },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { assignedTasks: true },
        },
      },
    });

    if (userId) {
      const user = users.find((u) => u.id === userId) || users[0];
      return NextResponse.json({ user, allUsers: users });
    }

    return NextResponse.json({
      currentUser: users.find((u) => u.role === "ADMIN") || users[0],
      allUsers: users,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
