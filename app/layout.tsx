import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://challan-jaanch.deftsalt.chatgpt.site'),
  title: 'Challan Jaanch — See the mismatch. Show the proof.',
  description: 'A private trust preflight for incorrect Indian eChallans and suspicious challan messages.',
  applicationName: 'Challan Jaanch',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '128x128' }],
    shortcut: '/favicon.png',
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: 'Challan Jaanch — See the mismatch. Show the proof.',
    description: 'Evidence checks and local scam protection for Indian eChallans.',
    images: [
      {
        url: '/og-release.png',
        width: 1200,
        height: 630,
        alt: 'Challan Jaanch evidence and scam trust preflight',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Challan Jaanch — See the mismatch. Show the proof.',
    description: 'Evidence checks and local scam protection for Indian eChallans.',
    images: ['/og-release.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#172a33',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">Skip to main content · मुख्य सामग्री पर जाएँ</a>
        {children}
      </body>
    </html>
  );
}
