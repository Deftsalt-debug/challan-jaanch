import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://challan-jaanch.deftsalt.chatgpt.site'),
  title: 'Challan Jaanch — See the mismatch. Show the proof.',
  description: 'A private trust preflight for incorrect Indian eChallans and suspicious challan messages.',
  applicationName: 'Challan Jaanch',
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
