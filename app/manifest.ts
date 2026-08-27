import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Challan Jaanch · चालान जाँच',
    short_name: 'Challan Jaanch',
    description: 'Independent evidence and scam preflight for Indian eChallans.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f1ec',
    theme_color: '#172a33',
    icons: [{ src: '/favicon.png', sizes: '128x128', type: 'image/png' }],
  };
}
