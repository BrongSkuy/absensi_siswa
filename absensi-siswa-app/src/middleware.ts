import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and API routes
  if (
    pathname === "/login" ||
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses 'better-auth.session_token')
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value;

  if (!sessionToken) {
    // No session → redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate session by calling Better Auth's getSession endpoint
  try {
    const sessionRes = await fetch(
      `${request.nextUrl.origin}/api/auth/get-session`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!sessionRes.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await sessionRes.json();
    const appRole = session?.user?.appRole as string | undefined;

    // RBAC: check if user has access to the requested route
    if (pathname.startsWith("/admin") && appRole !== "ADMIN") {
      // Redirect to their correct dashboard
      const redirectPath = appRole === "GURU" ? "/guru" : "/siswa";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (pathname.startsWith("/guru") && appRole !== "GURU") {
      const redirectPath = appRole === "ADMIN" ? "/admin" : "/siswa";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (pathname.startsWith("/siswa") && appRole !== "SISWA") {
      const redirectPath = appRole === "ADMIN" ? "/admin" : "/guru";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    return NextResponse.next();
  } catch {
    // If session validation fails, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
