import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Not logged in — redirect to login unless already on login/signup/portal
  if (!user) {
    if (pathname.startsWith('/portal') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return response
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in — check if this user is a tenant (exists in tenants table by email)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', user.email)
    .single()

  const isTenant = !!tenant

  // Tenants can only access /portal
  if (isTenant && !pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Non-tenants (owners/managers) should not access /portal
  if (!isTenant && pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
