import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ROLE_PATHS } from "@/lib/constants";
import type { Role } from "@/lib/types";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/login", "/registro-cliente", "/registro-conductor"];

const PRIVATE_BY_ROLE: Record<Role, string[]> = {
  customer: ["/app"],
  driver: ["/driver"],
  admin: ["/admin"],
};

function getDefaultPath(role?: Role | null) {
  if (!role) return "/login";
  return ROLE_PATHS[role] ?? "/login";
}

function isPublicPath(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing in deployment, avoid taking down every route.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  const { supabase, response } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: Role | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    role = (profile?.role as Role | undefined) ?? null;
  }

  const isPublic = isPublicPath(pathname);

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublic && pathname !== "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultPath(role);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role) {
    const allowedRoots = PRIVATE_BY_ROLE[role];
    const privateRoot = Object.values(PRIVATE_BY_ROLE).flat().some((root) => pathname.startsWith(root));

    if (privateRoot && !allowedRoots.some((root) => pathname.startsWith(root))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getDefaultPath(role);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
