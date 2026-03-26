# ReadLog

Personal article knowledge base. Save URLs → AI summarizes → searchable library + knowledge outline.

## Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local` with:
- **Supabase**: Create a project at [supabase.com](https://supabase.com), then copy the Project URL and anon key from **Settings → API**
- **Anthropic**: Create an API key at [console.anthropic.com](https://console.anthropic.com)

### 3. Set up the database
In your Supabase project, go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.

### 4. Enable Google Auth in Supabase
Go to **Authentication → Providers → Google** and enable it.
Add the redirect URL: `http://localhost:3000/auth/callback`

### 5. Run the development server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add the same environment variables in Vercel project settings
4. Add your production URL as a redirect URL in Supabase Auth settings

## Tech stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — Postgres + Row Level Security + Google SSO
- **Anthropic Claude** — article summarization and knowledge synthesis
- **@mozilla/readability** — article text extraction
- **@hello-pangea/dnd** — drag-and-drop bullet reordering
