import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "./api-auth";
import { isProviderEnabled } from "./provider-cache";

export async function validateProviderAccess(
  request: NextRequest,
  providerName: string
): Promise<{ valid: boolean; error?: string; userId?: string }> {
  // Bypassed API validation for free main platform usage
  return {
    valid: true,
    userId: "admin_override",
  };
}

export function createProviderErrorResponse(error: string) {
  return NextResponse.json(
    { error },
    { status: 403 }
  );
}
