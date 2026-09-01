import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        }
      }
    }
  );

  const pathname = request.nextUrl.pathname;

  // /admin es el formulario de login.
  // Todo lo que esté debajo de /admin/* sí está protegido.
  if (
    pathname.startsWith("/admin/") &&
    pathname !== "/admin"
  ) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }

    const {
      data: isAdmin,
      error
    } = await supabase.rpc("is_admin");

    if (error || isAdmin !== true) {
      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*"
  ]
};