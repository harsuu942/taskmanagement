import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: [
        { company: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, email, phone, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Client contact name is required." },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        company: company?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, company, email, phone, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Client ID is required for updating." },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Client contact name is required." },
        { status: 400 }
      );
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: name.trim(),
        company: company?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

