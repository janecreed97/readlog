import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HeaderNav from '@/components/HeaderNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ALEXANDRIA',
  description: 'Personal article knowledge base',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100`}>
        <HeaderNav />
        {children}
      </body>
    </html>
  )
}
