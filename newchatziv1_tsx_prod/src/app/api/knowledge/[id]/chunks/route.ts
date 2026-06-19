import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/guards";
import { permissions } from "@/server/permissions/permissions";
import { KnowledgeChunk } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";
import { Types } from "mongoose";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(permissions.knowledgeRead);
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }
    await connectToDatabase();
    const chunks = await KnowledgeChunk.find({
      tenantId: session.user.tenantId,
      documentId: new Types.ObjectId(id)
    }).sort({ chunkIndex: 1 }).lean();

    return NextResponse.json({ success: true, chunks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load chunks.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
