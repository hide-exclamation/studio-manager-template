import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { getSettings, DEFAULTS } from "@/lib/settings"

export async function generateMetadata(): Promise<Metadata> {
  let companyName = DEFAULTS.companyName
  let companyShortName = DEFAULTS.companyShortName

  try {
    const settings = await getSettings()
    companyName = settings.companyName || DEFAULTS.companyName
    companyShortName = settings.companyShortName || companyName.substring(0, 2).toUpperCase()
  } catch {
    // Use defaults if settings not available
  }

  return {
    title: `${companyName} - Studio Manager`,
    description: `Outil de gestion interne pour ${companyName}`,
    manifest: "/manifest.json",
    icons: {
      icon: "/icon-192.png",
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: companyShortName,
    },
    formatDetection: {
      telephone: false,
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
