import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  manifest: '/manifest.json',
  metadataBase: new URL('https://afvnerja.vercel.app'),
  title: 'A.F.V. Nerja — Veteranos',
  description: 'Web oficial de la Asociación de Fútbol Veteranos de Nerja',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'A.F.V. Nerja — Veteranos',
    description: 'Asociación de Fútbol Veteranos de Nerja · Axarquía · Costa del Sol',
    images: ['/logo-cfv.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}