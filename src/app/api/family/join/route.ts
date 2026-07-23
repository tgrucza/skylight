import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { claimPendingInvite } from "@/lib/family";

const bodySchema = z.object({
  confirmTransfer: z.boolean().optional(),
});

/**
 * Claim a pending invite matched to the signed-in user's Google email.
 * Handles both first-time join and transfer out of an empty solo family
 * the user accidentally created during onboarding.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await claimPendingInvite(session.user.id, session.user.email, {
    confirmTransfer: parsed.data.confirmTransfer,
  });

  switch (result.status) {
    case "joined":
    case "already_member":
      return NextResponse.json({
        status: result.status,
        familyId: result.membership.familyId,
        familyName: result.familyName,
      });
    case "confirm_transfer":
      return NextResponse.json({
        status: "confirm_transfer",
        currentFamilyName: result.currentFamilyName,
        invitedFamilyName: result.invitedFamilyName,
      });
    case "cannot_transfer":
      return NextResponse.json(
        {
          status: "cannot_transfer",
          error: result.reason,
          currentFamilyName: result.currentFamilyName,
          invitedFamilyName: result.invitedFamilyName,
        },
        { status: 409 }
      );
    case "no_invite":
    default:
      return NextResponse.json(
        {
          status: "no_invite",
          error:
            "No pending invite matches your Google email. Ask an adult in the family to Invite / Add you with this exact address, then try again.",
          email: session.user.email,
        },
        { status: 404 }
      );
  }
}
