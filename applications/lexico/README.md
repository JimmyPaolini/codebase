# Lexico

**Modern Latin-English dictionary with user authentication, bookmarks, and personal library management.**

Lexico is a server-side rendered web application built with TanStack Start and Supabase, providing comprehensive Latin word lookup with user accounts, bookmarking, and vocabulary tracking features.

## Features

- **Bidirectional Search**: Latin → English and English → Latin full-text search
- **User Authentication**: Sign in with Google or GitHub (OAuth via Supabase Auth)
- **Bookmarks**: Save favorite words for quick reference
- **Personal Library**: Track vocabulary with notes and proficiency levels
- **Pronunciation**: Audio playback for Latin words (AWS Polly integration)
- **Responsive Design**: Mobile-first UI with dark mode support
- **Server-Side Rendering**: Fast initial page loads, SEO-friendly

## Quick Start

### Prerequisites

- **Docker**: Required for local Supabase environment
- **pnpm**: Package manager for codebase
- **Supabase CLI**: Install with `brew install supabase/tap/supabase` (macOS)

### Local Development

```bash
# 1. Navigate to project
cd applications/lexico

# 2. Install dependencies
pnpm install

# 3. Start Supabase local environment (Docker containers)
nx run lexico:supabase:start
# Wait ~30 seconds for services to start

# 4. Apply database migrations and seed data
nx run lexico:supabase:database-reset

# 5. Generate TypeScript types from database schema
nx run lexico:supabase:generate-types

# 6. Configure environment variables
cp .env.default .env
# Edit .env with Supabase credentials (printed by previous steps)

# 7. Start development server
nx run lexico:develop
# Open http://localhost:3000
```

### Environment Variables

Create `.env` with the following (values from `supabase start` output):

```bash
# Supabase Configuration (local development)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<anon-key-from-supabase-start>

# Optional: AWS Polly for pronunciation
AWS_POLLY_ACCESS_KEY_ID=<your-aws-access-key>
AWS_POLLY_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_POLLY_REGION=us-east-1
```

## Project Structure

```text
applications/lexico/
├── src/
│   ├── routes/               # File-based routing (TanStack Router)
│   │   ├── __root.tsx        # Root layout with auth provider
│   │   ├── index.tsx         # Home page (/)
│   │   ├── search.tsx        # Dictionary search (/search)
│   │   ├── word.$id.tsx      # Word detail page (/word/:id)
│   │   ├── bookmarks.tsx     # User bookmarks (authenticated)
│   │   ├── library.tsx       # User library (authenticated)
│   │   └── settings.tsx      # User settings (authenticated)
│   ├── lib/                  # Business logic and server functions
│   │   ├── auth.ts           # Authentication (getCurrentUser, signOut)
│   │   ├── search.ts         # Search server functions
│   │   ├── bookmarks.ts      # Bookmark management
│   │   ├── library.ts        # Library management
│   │   ├── supabase.ts       # Client-side Supabase client
│   │   ├── supabase-server.ts # Server-side Supabase client
│   │   └── database.types.ts # Auto-generated from schema
│   └── components/           # React components (page-specific)
├── supabase/
│   ├── migrations/           # Database schema migrations (SQL)
│   ├── config.toml           # Supabase local configuration
│   ├── seed.sql              # Development data seeding
│   └── functions/            # Edge Functions (serverless)
├── public/                   # Static assets
├── vite.config.mts           # Vite build configuration
└── package.json              # Dependencies and scripts
```

## Development Workflows

### Running the Application

```bash
# Development server with hot reload
nx run lexico:develop

# Production build
nx run lexico:build

# Start production server (after build)
nx run lexico:start
```

### Database Management

#### Making Schema Changes

```bash
# 1. Edit schema in Supabase Studio (http://localhost:54323)
#    Or write SQL directly in a new migration file

# 2. Generate migration from local changes
nx run lexico:supabase:database-diff

# 3. Review generated migration in supabase/migrations/

# 4. Update TypeScript types
nx run lexico:supabase:generate-types

# 5. Test migration on clean database
nx run lexico:supabase:database-reset
```

#### Viewing Database

- **Supabase Studio**: http://localhost:54323 (visual table editor)
- **PostgreSQL CLI**: `supabase db shell` (direct SQL access)

### Code Quality

```bash
# Type checking (strict TypeScript)
nx run lexico:typecheck

# Type coverage analysis (target: 99.36%)
nx run lexico:type-coverage

# Linting
nx run lexico:lint

# Format checking
nx run lexico:format

# Bundle size analysis
nx run lexico:bundlesize

# All code analysis checks
nx run lexico:analyze-code
```

### Supabase Services

```bash
# Start local Supabase stack
nx run lexico:supabase:start

# Stop local Supabase stack
nx run lexico:supabase:stop

# Reset database (reapply all migrations + seed)
nx run lexico:supabase:database-reset

# Generate TypeScript types from schema
nx run lexico:supabase:generate-types
```

## Architecture

### Technology Stack

- **Frontend**: React 19, TanStack Router (file-based routing), Tailwind CSS
- **Backend**: TanStack Start (SSR), Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: [@codebase/lexico-components](../../packages/lexico-components) (shadcn/ui)
- **Type Safety**: TypeScript 5.9 with strict mode, auto-generated Supabase types
- **Build**: Vite 7, Nitro bundler for SSR

### Key Patterns

#### Server-Side Rendering (SSR)

All routes render on the server first for fast initial load:

- Server functions: Type-safe RPC calls from client to server
- Route loaders: Fetch data before rendering (runs on server)
- SSR benefits: Faster first paint, SEO-friendly, better perceived performance

#### File-Based Routing

Routes are defined by file structure in `src/routes/`:

- `src/routes/index.tsx` → `/`
- `src/routes/search.tsx` → `/search`
- `src/routes/word.$id.tsx` → `/word/:id` (dynamic parameter)

#### Authentication Flow

1. User clicks "Sign in with Google/GitHub"
2. Redirect to OAuth provider (Google/GitHub)
3. OAuth callback returns to app
4. Supabase Auth sets HTTP-only cookie
5. Server functions read cookie to get authenticated user
6. Database queries use Row-Level Security (RLS) policies

#### Database Access

- **Client-side**: Use `supabase.ts` client for OAuth redirects only
- **Server-side**: Use `supabase-server.ts` client for all data queries
- **RLS Policies**: PostgreSQL enforces data access rules based on authenticated user

### Database Schema

#### Core Tables

- `words`: Latin word entries (word, definitions, etymology, examples)
- `user_bookmarks`: User-saved words (user_id, word_id)
- `user_library`: Vocabulary tracking (user_id, word_id, notes, proficiency)
- `user_settings`: User preferences (theme, search mode, pronunciation)

**RLS Policies**: Users can only access their own bookmarks, library, and settings

See [AGENTS.md](AGENTS.md) for detailed schema documentation and migrations workflow.

## Deployment

### Production Supabase Setup

1. Create project at https://app.supabase.com
2. Link CLI: `supabase link --project-ref <project-ref>`
3. Push migrations: `supabase db push`
4. Configure OAuth providers in Supabase dashboard (Google, GitHub)
5. Set production environment variables

### Hosting Platforms

**Recommended**: Vercel, Netlify, Cloudflare Pages, or self-hosted with Node.js

```bash
# Build production bundle
nx run lexico:build

# Deploy output to hosting platform
# Output location: dist/applications/lexico/
```

#### Environment Variables (Production)

Set in hosting platform dashboard:

- `SUPABASE_URL`: Production Supabase project URL
- `SUPABASE_ANON_KEY`: Public anonymous key (safe to expose)
- `AWS_POLLY_*`: Optional, for pronunciation feature

## Troubleshooting

### Supabase Won't Start

```bash
# Verify Docker is running
docker ps

# Reset Supabase environment
supabase stop --no-backup
supabase start
```

#### Type Errors After Schema Changes

```bash
# Regenerate types from updated schema
nx run lexico:supabase:generate-types

# Restart dev server
# Press Ctrl+C and run `nx run lexico:develop` again
```

#### Authentication Not Working

1. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
2. Verify Supabase is running: `supabase status`
3. Check OAuth configuration in Supabase Studio → Authentication

#### Database Queries Return Empty

1. Verify RLS policies: May be blocking access incorrectly
2. Check authentication: `getCurrentUser()` should return user object
3. Test without RLS: `supabase db shell`, run `SELECT * FROM user_bookmarks;`

## Documentation

For in-depth architecture, development patterns, and troubleshooting:

- **[AGENTS.md](AGENTS.md)**: Complete architectural documentation
- **[lexico-components](../../packages/lexico-components)**: Shared UI components
- **[Main AGENTS.md](../../AGENTS.md)**: Codebase architecture and Nx workflows

External resources:

- [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview): SSR framework
- [Supabase](https://supabase.com/docs): Backend services
- [TanStack Router](https://tanstack.com/router/latest): Client-side routing

## License

See [LICENSE](../../LICENSE) for licensing information.
