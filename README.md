# CarePlus - Supabase

CarePlus now runs as HTML/CSS/JavaScript on static hosting, with Supabase Auth, PostgreSQL and private Storage. PHP, MySQL, Apache and XAMPP are not required by this version. The original PHP project is retained outside this repository.

## Run locally

Run `python -m http.server 8080` in this folder, then open http://localhost:8080/ . Authentication needs HTTP(S), not file://. The Supabase browser SDK loads from jsDelivr.

## Deploy to GitHub Pages

Repository: https://github.com/PeiYing040830/CarePlus

Enable Settings > Pages > Deploy from a branch > main > / (root). Website: https://peiying040830.github.io/CarePlus/ .

In Supabase Authentication URL Configuration, set Site URL to `https://peiying040830.github.io/CarePlus/` and allow:

- `https://peiying040830.github.io/CarePlus/patient.html`
- `https://peiying040830.github.io/CarePlus/resetPassword.html`
- `http://localhost:8080/patient.html`
- `http://localhost:8080/resetPassword.html`

Email signup/confirmation and recovery use Supabase email delivery settings and limits.

## Features

- Email/password registration, sign-in, recovery, persistent sessions and sign-out.
- Patient, doctor and administrator portals using real database records.
- Booking, conflict checking, rescheduling, confirmation, cancellation, staff check-in and completion. Times use Asia/Kuala_Lumpur. Slots are 30 minutes, within the next 180 days, 09:00-16:30 and the doctor's configured working days/hours.
- Assigned doctors add medical records and prescriptions. Patients read their own records.
- Administrators record payments verified outside this application. Receipt printing supports the browser's Save as PDF. This application does not charge cards or move money.
- Accounts, doctor setup/approval, contact inbox, catalog, notifications, reviews, profile updates and private profile-image uploads.
- Clinic information assistant using imported knowledge rules; patient symptom journaling. No AI diagnosis or medical triage is performed.
- Search, count summaries and CSV reports. Lists and reports currently include up to 1,000 rows per module, stated in the UI.

The interface has been rebuilt for static hosting. It is not a pixel-identical conversion of every original PHP screen. Camera QR scanning, scheduled reminders/automatic appointment expiry, online payment processing, generated server PDFs and the former AI symptom analysis are not implemented. Imported QR references/logs, symptom history and payment records are retained.

## Database and permissions

Apply migrations with an authorized CLI account:

```sh
supabase login
supabase link --project-ref guvhmilltpgoloqkvnmj
supabase db push --dry-run
supabase db push
```

Use `supabase/migrations/` for a new installation; the older `supabase/schema.sql` only represents the initial profile-only prototype.

Business tables retain the original integer IDs. `profiles.id` is the Supabase Auth UUID, mapped to the original `users.user_id` via `legacy_user_id`. Public users rows contain no password hashes or security answers. New accounts receive patient access; an administrator can authorize an existing account as a doctor. A project's first administrator must be provisioned through trusted database access (the legacy administrator is preserved on this project).

RLS restricts reads. Clinical and financial writes run through permission-checked transactional functions. Browser clients cannot directly update tables or assign administrator roles. Disabled accounts lose application access even with an existing session. Profile images are private; short-lived signed URLs are issued only to authorized sessions.

The frontend uses only the public publishable key in `supabase-config.js`. Never add service_role keys, secrets, database passwords, original dumps, uploads or CLI tokens to this repository.

## Legacy import

The user-authorized legacy data was imported from the local phpMyAdmin data dump. Data files and source images remain outside Git. Reusable tools accept a local dump path:

```sh
python tools/mysql_dump.py "../clinic_management (data).sql"
python tools/import_legacy.py "../clinic_management (data).sql" --apply
python tools/import_uploads.py "../clinic_management (data).sql" --apply
```

The importer uses Supabase Auth admin endpoints to retain bcrypt password hashes. Admin credentials stay in process memory. Conflicting pre-existing emails stop the import rather than being overwritten. Imported active accounts retain their old passwords. Suspended/inactive accounts remain blocked. Deprecated security-question answers are deliberately excluded; password recovery uses email.

For a first-time legacy installation, import accounts and rows after migrations 001/002 and before applying migration 003, which changes the signup trigger to allocate business rows. This project has already completed that sequence. Do not rerun an old dump over a live database with newer records; preserve a backup and review conflicts first. The importer rejects first-time account imports after the live signup workflow is installed.

## Tests

Install isolated local test dependencies outside this repository:

```sh
npm install --prefix ../.careplus-test-tools --no-save --ignore-scripts @electric-sql/pglite jsdom
node tools/test_database.cjs
node tools/test_portal.cjs
```

Database tests compile and execute migrations in isolated PostgreSQL/WASM with synthetic users, testing ownership, doctor assignment, denied privilege escalation, booking conflicts, financial permissions, account suspension and private uploads. DOM tests cover all three portal navigations, booking forms, slot loading and safe database-text rendering. Hosted email delivery and real-user password entry still require a manual end-to-end check.

See MIGRATION.md for the deployment/import status.
