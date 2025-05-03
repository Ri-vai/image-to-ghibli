import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  
  return NextResponse.json({
    authenticated: !!session,
    user: session ? { 
      name: session.user.name,
      email: session.user.email 
    } : null
  });
} 