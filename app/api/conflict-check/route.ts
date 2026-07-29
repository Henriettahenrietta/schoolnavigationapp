import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkAllocation } from "@/lib/conflict/checker";
import { allocationRequestSchema } from "@/lib/validation";

// JSON endpoint powering the live conflict check on the request form. It runs the SAME
// AllocationConflictChecker used on final submit — the client is never trusted.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const parsed = allocationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      conflicts: [{ type: "policy", message: parsed.error.issues[0]?.message ?? "Invalid input." }],
      warnings: [],
      suggestions: [],
    });
  }

  // A lecturer can only check slots for themselves.
  const request = {
    ...parsed.data,
    lecturerId: user.role === "lecturer" ? user.id : parsed.data.lecturerId,
  };

  const result = await checkAllocation(request);
  return NextResponse.json(result);
}
