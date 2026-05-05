import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/pending')
  const isPortal = pathname.startsWith('/portal')

  // Logged-in users should not see auth pages — send them home
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Not logged in — only allow auth pages and portal (portal redirects to login itself)
  if (!user) {
    if (isAuthPage || isPortal) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in — check if tenant (exists in tenants table by email)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', user.email)
    .single()

  const isTenant = !!tenant

  // Tenants can only access /portal
  if (isTenant && !isPortal) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Owners/managers cannot access /portal
  if (!isTenant && isPortal) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
