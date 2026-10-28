# Jadeite Systems · Sales portal (Figma Make)

Clickable prototype of the **Sales portal** for Jadeite Glazing (windows, doors, bifolds, orangeries) — the salesperson's side of the same platform as the Office Admin.
React 19 + Vite + TypeScript, running inside Figma Make. It uses exactly the same design system, components and customer records as the Office Admin, so keep the look the same.

The demo is signed in as **Mike Harris** (salesperson). He only sees his own customers.

## Development server
A Vite dev server is already running on `$PORT` (default 8443). Changes hot-reload in the preview.

## Structure
- `src/main.tsx` – entry: HashRouter → StoreProvider → ToastProvider → App. Imports Sora font, `src/index.css`, `src/styles/app.css`.
- `src/App.tsx` – routes: login, welcome tour, My day, My pipeline, customer record (`/enquiries/:id`), Calendar & tasks, My customers, Quotes (Framepoint), Won jobs, Messages, My performance, Settings.
- `src/components/Layout.tsx` – sales sidebar, header (⌘K search of my customers, notifications, profile menu), footer.
- `src/components/sales.tsx` – what is "mine", whose turn it is, and the sales-only pop-ups (add an enquiry, follow-up call, task, reopen).
- `src/components/Journey.tsx` – the whole customer journey and one pop-up per step (shared with Office Admin). `src/components/Lifecycle.tsx` – contact, appointment, Framepoint survey & quote, send quote, reply, Won, Lost.
- `src/components/ui.tsx` – shared UI: Card, Tag, Avatar, Tabs, Modal, Drawer, Field, Switch, Toast…
- `src/data/mock.ts` and `src/data/lifecycle.ts` – sample data (Mike's deals cover every sales stage); `src/data/store.tsx` – shared demo state (saved in sessionStorage; "Reset demo data" in the profile menu clears it). Demo "today" is 16 Oct 2026.
- `public/images` – property photos and the Jadeite J logo (use relative paths like `images/house.jpg`).

## Sales flow (matches the agreed flow)
Office assigns enquiry → Contact customer (email or call) → Qualification → Book appointment (in the salesperson's Outlook; one customer = one salesperson, changing it needs a reason) → Appointment done, add notes → Add Framepoint survey & quote (from Framepoint or survey report PDF) → Send quote for review (follow-up task made) → Customer replied → new quote version if needed → Mark as Won (deposit checked in Xero) or Lost (reason) → the office takes over; the salesperson follows the job in Won jobs and only acts if the final survey changes a size (Revise quote in Framepoint). Lost deals can be reopened.

## Design system (do not drift)
- Font: Sora (400–700). Plain CSS tokens in `src/styles/app.css` — reuse its classes (`card`, `tag`, `btn`, `input`, `list`, `grid-2`, `hstack`, `vstack`, `between`, `muted`…).
- Colours: primary `#00c7a1`, primary-dark `#0b6e5c`, deep `#0b1f1b`, tint `#ebf7f3`, page `#f6f8f7`, border `#e3e9e7`, text `#0f1414` / `#3a4a4a` / `#6b7a78`, ok `#1f9d5b`, warn `#e0a100`, error `#d64545` (use red sparingly).
- Calm, simple, jargon-free wording. Real property photos where they help.
- Tailwind utilities are available, but Tailwind's base reset is intentionally not loaded.

## Demo sign-in
Any email · security code **482193** (3 wrong codes locks the account).

## Code quality
- Use double quotes for strings containing apostrophes, or escape them.
- Keep JSX balanced; pages export components used in `App.tsx`.
