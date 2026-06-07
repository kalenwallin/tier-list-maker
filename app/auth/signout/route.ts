import { signOut } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return await signOut({ returnTo: "/" });
}
