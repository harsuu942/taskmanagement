import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "User ID, current password, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, user.password);

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect. Please verify and try again." },
        { status: 400 }
      );
    }

    // Hash new password and save
    const hashedPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
