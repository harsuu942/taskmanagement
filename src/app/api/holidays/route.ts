import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const year = searchParams.get("year");

    const where: any = {};
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (year) {
      where.date = { startsWith: year };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, holidays });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support batch import (from Excel/CSV)
    if (Array.isArray(body.holidays)) {
      const results = [];
      for (const item of body.holidays) {
        if (!item.date || !item.name) continue;
        const normalizedDate = item.date.trim().slice(0, 10);
        const holiday = await prisma.holiday.upsert({
          where: { date: normalizedDate },
          create: {
            date: normalizedDate,
            name: item.name.trim(),
            description: item.description?.trim() || null,
          },
          update: {
            name: item.name.trim(),
            description: item.description?.trim() || null,
          },
        });
        results.push(holiday);
      }
      return NextResponse.json({
        success: true,
        count: results.length,
        holidays: results,
        message: `Successfully imported ${results.length} holidays.`,
      });
    }

    // Single holiday creation
    const { date, name, description } = body;
    if (!date || !name) {
      return NextResponse.json(
        { error: "Date and Name are required for a holiday." },
        { status: 400 }
      );
    }

    const normalizedDate = date.trim().slice(0, 10);
    const holiday = await prisma.holiday.upsert({
      where: { date: normalizedDate },
      create: {
        date: normalizedDate,
        name: name.trim(),
        description: description?.trim() || null,
      },
      update: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      holiday,
      message: "Holiday saved successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (!id && !date) {
      return NextResponse.json(
        { error: "Holiday ID or Date is required to delete." },
        { status: 400 }
      );
    }

    if (id) {
      await prisma.holiday.delete({ where: { id } });
    } else if (date) {
      await prisma.holiday.delete({ where: { date } });
    }

    return NextResponse.json({
      success: true,
      message: "Holiday removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
