import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alexandria',
    short_name: 'Alexandria',
    description: 'Your personal reading library',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F0E8',
    theme_color: '#2C2926',
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
