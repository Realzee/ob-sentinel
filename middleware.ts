// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { UserRole } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Define protected routes and required roles
  const protectedRoutes = {
    '/dashboard': ['admin', 'moderator', 'controller', 'responder', 'user'],
    '/control-room': ['admin', 'moderator', 'controller'],
    '/admin': ['admin'],
    '/responder': ['responder'],
    '/controller': ['controller'],
  }

  const currentPath = request.nextUrl.pathname

  // Check if route is protected
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (currentPath.startsWith(route)) {
      // User not authenticated
      if (!session) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Get user role from metadata
      const userRole = session.user.user_metadata?.role as UserRole || 'user'
      
      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        // Redirect to dashboard if they don't have access
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // For company-specific routes, verify company access
      if (['/control-room', '/responder', '/controller'].includes(route)) {
        const userCompanyId = session.user.user_metadata?.company_id
        
        // Add company ID to request headers for use in components
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-company-id', userCompanyId || '')
        requestHeaders.set('x-user-role', userRole)
        
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }

      break
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - auth (auth pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|auth).*)',
  ],
}