import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "User ID / Email and Password are required." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();

    // Look up user by email or userId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier.toLowerCase() },
          { userId: cleanIdentifier },
          { userId: cleanIdentifier.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid User ID or Password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid User ID or Password." },
        { status: 401 }
      );
    }

    // Return authenticated user profile (excluding password)
    const safeUser = {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
