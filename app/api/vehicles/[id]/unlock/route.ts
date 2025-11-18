import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/authSession";
import { getValidTeslaAccessToken } from "@/lib/teslaAuth";
import { unlockVehicle } from "@/lib/teslaCommands";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const sessionToken = auth.substring("Bearer ".length);
    const payload = await verifySessionToken(sessionToken);

    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    const teslaAccessToken = await getValidTeslaAccessToken(payload.userId);
    const result = await unlockVehicle(teslaAccessToken, id);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Vehicle command failed", err);
    return NextResponse.json({ error: "Vehicle command failed" }, { status: 500 });
  }
}

