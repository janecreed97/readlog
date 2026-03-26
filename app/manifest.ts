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
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: 'maskable' as any,
      },
    ],
    // Web Share Target — lets Alexandria appear in native share sheets on Android
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    share_target: {
      action: '/share',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}
