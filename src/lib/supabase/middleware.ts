import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  '/login',
  '/auth',
  '/devis/public',
  '/factures/public',
  '/api/public-settings',
]

// Routes qui ne nécessitent pas de vérification de setup
const SETUP_EXEMPT_ROUTES = [
  '/setup',
  '/api/settings',
  '/api/settings/upload-logo',
  '/login',
  '/auth',
  '/devis/public',
  '/factures/public',
  '/api/public-settings',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

function isSetupExemptRoute(pathname: string): boolean {
  return SETUP_EXEMPT_ROUTES.some((route) => pathname.startsWith(route))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Proteger les routes admin (tout sauf les routes publiques)
  if (!user && !isPublicRoute(pathname)) {
    // Pour les routes API, retourner 401 au lieu de rediriger
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Vérifier si l'application est configurée (seulement pour les utilisateurs connectés)
  // et pour les routes non-exemptées
  if (user && !isSetupExemptRoute(pathname) && !pathname.startsWith('/api/')) {
    try {
      // Utiliser une requête interne pour vérifier isConfigured
      // On utilise un cookie pour éviter de faire une requête DB à chaque requête
      const setupChecked = request.cookies.get('setup-checked')?.value

      if (!setupChecked) {
        // Faire une requête à l'API settings pour vérifier
        const settingsUrl = new URL('/api/settings', request.url)
        const settingsRes = await fetch(settingsUrl.toString(), {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        })

        if (settingsRes.ok) {
          const settings = await settingsRes.json()

          if (!settings.isConfigured) {
            const url = request.nextUrl.clone()
            url.pathname = '/setup'
            return NextResponse.redirect(url)
          }

          // Marquer le setup comme vérifié pour cette session
          supabaseResponse.cookies.set('setup-checked', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 heure
          })
        }
      }
    } catch (error) {
      // En cas d'erreur, continuer sans redirection
      console.error('Error checking setup status:', error)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
