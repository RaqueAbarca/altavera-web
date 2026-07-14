import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Creamos el cliente de Supabase optimizado para SSR usando cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificamos si hay un usuario logueado de forma segura
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si intenta acceder a /admin/dashboard y no está autenticado, lo echamos a /admin
  if (request.nextUrl.pathname.startsWith('/admin/dashboard') && !user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

// Indicamos que solo se ejecute al intentar entrar a las rutas del dashboard admin
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de solicitud excepto las que empiezan por:
     * - _next/static (archivos estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico (icono del sitio)
     * - public (si tienes archivos ahí)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};