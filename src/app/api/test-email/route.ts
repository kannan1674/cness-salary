import { NextResponse } from "next/server";
import { getEmailConfig, sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const config = getEmailConfig();
    if (!config) {
      return NextResponse.json(
        { error: "SMTP not configured in .env.local" },
        { status: 400 }
      );
    }

    await sendTestEmail();
    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${config.user}. Check inbox and spam folder.`,
    });
  } catch (e) {
    console.error("Test email failed:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
