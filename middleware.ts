import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/links",
  "/posts",
  "/analytics",
  "/revenue",
  "/connect",
  "/settings",
];
const AUTH_PAGES = ["/auth/login"];
// Only the bare root — NOT the whole marketing site. Logged-in users
// can still reach /pricing anchors, /terms, /privacy, a future /blog,
// etc.; there's just no reason to show them the hero/signup CTA again
// once they're already signed in and land on "/" specifically.
const HOME = "/";

export async function middleware(request: NextRequest, response: NextResponse) {
  
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );


  const {data: {user} } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some(p => path.startsWith(p))
  const isAuthPage = AUTH_PAGES.some(p => path.startsWith(p))
  const isHome = path === HOME

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (isHome && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse


}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api|.*\\.(?:svg|png|jpg|ico|js|css)).*)",
  ],
};