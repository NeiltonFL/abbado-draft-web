# Abbado Draft — Web Application

Document automation platform frontend. Next.js + TypeScript + Tailwind CSS.

## Pages

- `/` — Dashboard with stats, recent matters, quick actions
- `/login` — Authentication
- `/matters` — List and create matters
- `/matters/[id]` — Matter detail with documents, variables, activity
- `/matters/[id]/interview` — Multi-step interview runner with validation
- `/workflows` — List and create workflows
- `/workflows/[id]` — Workflow detail with templates, variables, interview config
- `/workflows/new` — Create new workflow
- `/templates` — Upload and manage .docx templates with parsed schema display
- `/settings` — Users, storage adapters, organization settings

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Deployment

Deployed to Vercel. Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` — Railway API URL
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
