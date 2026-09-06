import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        avatar: true,
        createdAt: true,
        assignedTasks: {
          select: {
            id: true,
            title: true,
            employeeStatus: true,
            adminStatus: true,
            priority: true,
            totalDurationSeconds: true,
          },
        },
        attendances: {
          take: 5,
          orderBy: { date: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ employees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, designation, role = "EMPLOYEE", userId, password } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Gmail address are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUserId = userId ? userId.trim() : cleanEmail.split("@")[0];
    const initialPassword = password && password.trim() ? password.trim() : "employee123";

    // 1. Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: `An account with email "${cleanEmail}" already exists.` },
        { status: 400 }
      );
    }

    // 2. Check if custom User ID already exists
    if (cleanUserId) {
      const existingUserId = await prisma.user.findFirst({
        where: {
          OR: [
            { userId: cleanUserId },
            { userId: cleanUserId.toLowerCase() },
          ],
        },
      });

      if (existingUserId) {
        return NextResponse.json(
          { error: `User ID "${cleanUserId}" is already assigned to another team member.` },
          { status: 400 }
        );
      }
    }

    const hashedPassword = hashPassword(initialPassword);

    const employee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        userId: cleanUserId,
        password: hashedPassword,
        designation: designation?.trim() || "Team Member",
        role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, designation, role, userId, password } = body;

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Gmail address are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUserId = userId ? userId.trim() : cleanEmail.split("@")[0];

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    // Check if new email is used by another user
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: { id },
      },
    });

    if (emailConflict) {
      return NextResponse.json(
        { error: `An account with email "${cleanEmail}" already exists.` },
        { status: 400 }
      );
    }

    // Check if new userId is used by another user
    if (cleanUserId) {
      const userIdConflict = await prisma.user.findFirst({
        where: {
          OR: [
            { userId: cleanUserId },
            { userId: cleanUserId.toLowerCase() },
          ],
          NOT: { id },
        },
      });

      if (userIdConflict) {
        return NextResponse.json(
          { error: `User ID "${cleanUserId}" is already assigned to another team member.` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name: name.trim(),
      email: cleanEmail,
      userId: cleanUserId,
      designation: designation?.trim() || "Team Member",
      role: role || existingUser.role,
    };

    if (password && password.trim()) {
      updateData.password = hashPassword(password.trim());
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

