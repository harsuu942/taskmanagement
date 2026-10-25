import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const proofs = await prisma.taskProof.findMany({
      where: { taskId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ proofs });
  } catch (error: any) {
    console.error("GET /api/tasks/[id]/proofs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task proofs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { imageUrl, caption, source, userId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image data/URL is required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const targetUserId = userId || task.assignedToId || task.createdById;

    const proof = await prisma.taskProof.create({
      data: {
        taskId: params.id,
        userId: targetUserId,
        imageUrl,
        caption: caption || null,
        source: source || "WEB_CAPTURE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, proof });
  } catch (error: any) {
    console.error("POST /api/tasks/[id]/proofs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save work screenshot/proof" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const proofId = searchParams.get("proofId");

    if (!proofId) {
      return NextResponse.json(
        { error: "Proof ID is required" },
        { status: 400 }
      );
    }

    await prisma.taskProof.delete({
      where: { id: proofId },
    });

    return NextResponse.json({ success: true, message: "Proof deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[id]/proofs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete task proof" },
      { status: 500 }
    );
  }
}
