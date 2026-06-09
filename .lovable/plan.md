
# Personal Task Assistant

A task management app with a built-in AI assistant ("Coach") you can chat with. The assistant knows your tasks, gives you a morning briefing, calls out what you've been neglecting, and cheers you on when you're crushing it.

## Core Features

1. **Auth** — Email/password + Google sign-in (Lovable Cloud).
2. **Tasks**
   - Create, edit, complete, delete tasks
   - Fields: title, notes, due date, priority (low/med/high), status (todo/done), recurrence (none/daily/weekly), created_at, completed_at
   - Views: Today, Upcoming, Overdue, All, Completed
3. **Morning briefing** — On first visit each day, the assistant greets you with: overdue items, what's due today, what you've neglected (incomplete >3 days), and a tone-appropriate pep talk or stern nudge.
4. **AI Assistant Chat ("Coach")**
   - Multiple conversation threads (sidebar with new/select/delete, each with its own URL like `/chat/$threadId`)
   - Streaming responses via AI SDK + Lovable AI (`google/gemini-3-flash-preview`)
   - Tools the assistant can use: `list_tasks`, `create_task`, `complete_task`, `update_task`, `delete_task`, `get_briefing` — so you can say "add buy groceries tomorrow" or "what should I focus on?" and it acts
   - **Personality**: cheerful and encouraging when you're on top of things; firm/strict when you have multiple overdue or neglected tasks. Driven by system prompt that receives live task stats.
5. **Notifications**
   - In-app: bell icon with unread count, briefing card on dashboard
   - Browser push: Web Notifications API (permission prompt, fires for due-today + overdue at chosen time)
   - Email reminders: daily digest via Resend (requires `RESEND_API_KEY` secret — I'll ask once Cloud is enabled)
6. **Settings** — Notification preferences (push time, email on/off), tone override.

## Layout

- Sidebar: Dashboard, Tasks, Chat (with thread list), Settings
- Dashboard = today's briefing + quick task list + "Chat with Coach" CTA
- Chat page: thread sidebar + AI Elements chat surface

## Technical

- **Stack**: TanStack Start, Lovable Cloud (Supabase), AI SDK + AI Elements, shadcn sidebar
- **DB tables** (all RLS-scoped to `auth.uid()`):
  - `profiles` (id, display_name, tone_preference, push_time, email_enabled)
  - `tasks` (id, user_id, title, notes, due_at, priority, status, recurrence, created_at, completed_at)
  - `chat_threads` (id, user_id, title, created_at, updated_at)
  - `chat_messages` (id, thread_id, role, parts jsonb, created_at) — stores AI SDK `UIMessage` shape
- **Routes**:
  - `/auth` — sign in/up
  - `/_authenticated/` — dashboard (briefing + today)
  - `/_authenticated/tasks` — task list/board
  - `/_authenticated/chat/$threadId` — chat thread (real URL per thread)
  - `/_authenticated/settings`
  - `/api/chat` — streaming server route with task tools
  - `/api/public/cron/daily-email` — scheduled email digest endpoint
- **Server fns**: task CRUD, briefing computation, thread CRUD, message persistence (saved in `onFinish` of stream)
- **Push notifications**: in-browser scheduler that checks task list and fires `Notification` at user's chosen time while tab is open (background push would need service worker + VAPID — out of scope for v1; I'll note that)
- **Email**: edge-scheduled trigger calling `/api/public/cron/daily-email` with HMAC signature; sends per-user digest via Resend

## Open items I'll handle as we go

- Enable Lovable Cloud first (auto)
- Ask for `RESEND_API_KEY` once we're ready to wire email
- Generate a friendly Coach avatar/logo (not Sparkles)

## Out of scope (v1)

- Mobile background push (needs service worker + VAPID server)
- Team/shared tasks
- Calendar sync

Ready to build when you approve.
