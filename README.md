# Pivora CRM Dashboard

A sales CRM dashboard for tracking leads, deals and customers. It has a Dashboard with KPIs and charts, a drag-and-drop Deals pipeline,
Contacts, Companies, Notes (rich text), a Calendar, Meetings, Projects with tasks, and Reports. It works out of the box in **demo mode**
(all data stays in your browser) and can be connected to **Supabase** for real sign-in, per-role access and a shared database.

**Tech stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, Supabase (Postgres, Auth, row level security), React Router, dnd-kit, TipTap, lucide-react.

**Credit:** UI design inspired by Uxerflow.

## Run it locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173  (demo mode: no setup, no login)
npm run build      # production build in dist/
npm run lint
```

To use Supabase instead of demo mode, follow [Backend setup](#backend-setup-supabase) below.

## Design tokens
`design/figma-tokens.json` holds the `crm` variable collection (colors) plus the radii, shadows and type sizes
measured from the Figma file via figma-cli. `scripts/sync-tokens.mjs` turns it into `src/theme.css`
(Tailwind `@theme` tokens) and runs automatically before `dev` and `build`. Components only use token
utilities (`bg-primary`, `rounded-lg`, `shadow-card`, ...), never raw values.

Because the Figma variables are named `text-primary` etc., the Tailwind utilities read `text-text-primary`.

## Structure
- `src/data/mock.ts`: all copy and numbers
- `src/components/ui`: NavItem, FavoriteItem, IconButton, Button, KPICard, SegmentedFilter, SegmentedTabs, EventCard, ListRow
- `src/components/charts`: BarChart, StackedBarChart, HorizontalBars, CountryMap
- `src/components/cards`, `src/components/layout`: page sections

## Backend setup (Supabase)

The app has two modes:

- **Demo mode** (default): no `.env` file, no login, all data stays in your browser. A small "Demo mode" tag shows in the sidebar footer.
- **Sign-in mode**: `.env` has your Supabase URL and anon key. You must sign in; the account menu shows your name, email and role, and every page
  reads and writes the Supabase database (deals, contacts, notes, calendar events, projects and tasks, plus each person's saved view settings).
  Row level security decides what each role can see and change.

### 1. Create the project
1. Go to <https://supabase.com/dashboard> and click **New project**. Pick a name, a database password (save it) and a region.
2. Wait until the project says it is ready.

### 2. Run the migrations (in this order)
Open **SQL Editor > New query**, paste the whole file, click **Run**, and wait for "Success". Do them one at a time, in this order:

1. `supabase/migrations/20251020000001_schema.sql`: tables, indexes, triggers (updated_at, create a profile on sign-up).
2. `supabase/migrations/20251020000002_rls.sql`: row level security, the role helper functions and every policy.
3. `supabase/migrations/20251028000001_tasks_policy.sql`: sales reps can see and update tasks assigned to them (and read the project those tasks are in).
4. `supabase/migrations/20251028000002_user_prefs.sql`: saved view settings per person (filters, views, recent searches), and lets the app keep its own "last edited" times.

If one fails, stop and read the error message; don't skip ahead. (Running a file twice fails with "already exists": that means it already worked.)

### 3. Create three test accounts (demo-only)
These are throwaway demo accounts for trying the roles, not real people. Change the passwords if the project is ever public.

**Authentication > Users > Add user > Create new user.** Tick **Auto Confirm User** so you can sign in straight away.

| Role | Email | Password (use these, or your own of 8+ characters) |
| --- | --- | --- |
| Admin | `admin@pivora.test` | `Admin-Pivora-2025` |
| Manager | `manager@pivora.test` | `Manager-Pivora-2025` |
| Sales rep | `rep@pivora.test` | `Rep-Pivora-2025` |

Everyone starts as a **sales rep**: the sign-up trigger always creates the profile with that role.

### 4. Make one an admin and one a manager
In **SQL Editor**, run:

```sql
update public.profiles set role = 'admin'   where email = 'admin@pivora.test';
update public.profiles set role = 'manager' where email = 'manager@pivora.test';
select email, role from public.profiles order by email;   -- should show admin, manager, sales_rep
```

This works from the SQL Editor because nobody is "signed in" there. Inside the app nobody can change their own role, and only an admin can change anyone else's.

### 5. Load the demo data
Run `supabase/seed.sql` in the SQL Editor (after step 4; it can be before or after migrations 3 and 4). It loads 62 contacts, 24 deals, 14 notes, 45 calendar events, 8 projects with their tasks,
the activity timelines and the links, all dated relative to the fixed demo "today" (2025-10-20), and shares ownership evenly across the profiles that exist.
You can run it again at any time: it puts the demo rows back and leaves rows you created alone. The last line of the output says how many rows were loaded.

### 6. Put the keys in `.env`
**Project Settings > API:** copy the **Project URL** and the **anon public** key.

```bash
cp .env.example .env
# then edit .env:
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Use only the anon key in `.env`: it is meant to be public, and the row level security rules decide what each person can see. Never put any other Supabase key in the app.
`.env` is in `.gitignore`.

For the password-reset email to land back in the app, add `http://localhost:5173/reset-password` under **Authentication > URL Configuration > Redirect URLs**
(and set **Site URL** to `http://localhost:5173`).

### 7. Run the app
```bash
npm install
npm run dev     # http://localhost:5173  (restart it after changing .env)
```
You are sent to `/login`. Sign in with each account and check the role badge in the sidebar (Admin, Manager, Sales rep). **Sign out** is in the account menu.
Delete or empty `.env` (and restart) to go back to demo mode.

### Who can do what (enforced by the database)
| | Sales rep | Manager | Admin |
| --- | --- | --- | --- |
| See rows | only their own | all | all |
| Create / edit rows | only their own | all, can reassign owners | all |
| Soft delete (`deleted_at`) | their own | all | all |
| Hard delete | no | no | yes |
| Profiles | read all, edit own name and avatar | same | also change other people's roles |

### Good to know (sign-in mode)
- **Soft delete:** the app deletes by setting `deleted_at`; **Restore** and **Undo** clear it. Hard delete exists only for admins, directly in the database.
- **Reassigning owners:** managers and admins can; a sales rep gets a clear message ("Only a manager or an admin can give a deal to someone else").
- **A failed save** (no permission, no connection) shows a toast and the screen goes back to what is really saved.
- **Undoing a deal move or a task change** removes the change from the screen, but the timeline entry it created stays in the database unless an admin deletes it
  (only admins may delete timeline entries).
- **Sample data:** the "Reset demo data" action on the Deals page only resets the view settings in sign-in mode; re-run `seed.sql` to restore the demo rows.
