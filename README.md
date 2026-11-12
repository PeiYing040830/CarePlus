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
- `http://127.0.0.1:8080/resetPassword.html`

Email signup/confirmation and recovery use Supabase email delivery settings and limits.

## Features

- Email/password registration, sign-in, recovery, persistent sessions and sign-out.
- Patient, doctor and administrator portals using real database records.
- Booking, conflict checking, rescheduling, confirmation, cancellation, staff check-in and completion. Times use Asia/Kuala_Lumpur. Slots are 30 minutes, within the next 180 days, 09:00-16:30 and the doctor's configured working days/hours.
- Assigned doctors add medical records and prescriptions. Patients read their own records.
- Administrators record payments verified outside this application. Receipt printing supports the browser's Save as PDF. This application does not charge cards or move money.
- Accounts, doctor setup/approval, contact inbox, catalog, notifications, reviews, profile updates and private profile-image uploads.
- Clinic information assistant using imported knowledge rules; prototype symptom-rule screening plus a searchable ICD-10-CM reference. No AI diagnosis or clinically validated triage is provided.
- Search, count summaries and CSV reports. Lists and reports currently include up to 1,000 rows per module, stated in the UI.

The 41 original PHP page layouts are compiled into browser view functions in `original-design/views.js`. Original page CSS, markup, navigation and page scripts are retained instead of the replacement generic portal design. `original-design/bridge.js` connects supported original requests and forms to the existing Supabase API. No PHP server is required. Browser screenshot comparison across every page and viewport has not yet been completed. Camera QR scanning, scheduled reminders/automatic appointment expiry, online payment processing, generated server PDFs and the former AI symptom analysis are not implemented. Imported QR references/logs, symptom history and payment records are retained.

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

Database tests compile and execute migrations in isolated PostgreSQL/WASM with synthetic users, testing ownership, doctor assignment, denied privilege escalation, booking conflicts, financial permissions, account suspension and private uploads. DOM tests render all 41 original templates with empty and populated synthetic data, compare page CSS with the local legacy source when available, check local styles/scripts and inline JavaScript syntax, and exercise booking, slot loading and record-detail adapters. Hosted email delivery and real-user password entry still require a manual end-to-end check.

See MIGRATION.md for the deployment/import status.

## Maintaining the original design

Run `node tools/test_portal.cjs` to check the current original-design frontend. The previous generic `portal.js` is retained as migration reference; it is not loaded by the restored pages.

To regenerate the views, keep the original PHP source in the parent directory, install `php-parser` in `../.careplus-test-tools`, then run `node tools/restore_design.cjs`. This compiles view markup only, copies the original CSS/JS assets, and converts PHP links to HTML. Backend PHP, credentials, and database dumps are excluded. Keep Supabase adaptations in `original-design/bridge.js`, `context.js`, and `bootstrap.js` so regeneration preserves them.

The Supabase bridge now implements notification deletion, prescription editing/cancellation and logging, staff profile fields, admin profile editing, appointment rescheduling/check-in, and billing review/refund workflows. Account removal deactivates access while retaining visit and payment history; it does not physically delete accounts. Sign-in email and role changes require Auth/account provisioning rather than editing profile-only fields. Patient symptom rules are read-only. Staff self-registration remains restricted, and password recovery uses email in the original recovery layout.

Password recovery uses standalone `forgotPassword.html`, `resetPassword.html`, and `password-recovery.js`. It calls Supabase Auth directly and does not load legacy recovery scripts, security questions, or profile/database queries. Allow the exact local test origin in Supabase Authentication > URL Configuration; localhost and 127.0.0.1 are separate origins. Run `node tools/test_password_recovery.cjs` for mocked recovery checks. Actual email delivery and redirect allowlist settings still require an end-to-end check.

Doctor directory photos are restored by migration `20261113000100_doctor_directory_photos.sql` and `original-design/photos.js`. Active doctors' directory portraits can be read through short-lived signed Storage URLs, matching the original public directory. The uploads bucket remains private; this policy does not grant access to patient/admin photos. The remote image was verified with anonymous access and HTTP 200.

## Symptom screening and condition reference

`careplus_analyse_symptoms` restores server-side matching against the 49 legacy `symptom_scope` rules and emergency phrase overrides. It stores the matched rule IDs, emergency phrase matches, engine version, submitted age, screening level, and response. Rule matching returns emergency/urgent/routine when a rule matches; unmatched input stays unassessed. Old journal entries remain unassessed because they were never screened. No existing patient records were rewritten.

The English phrase matcher includes limited negation and history handling. It is an unvalidated prototype: ambiguous wording, omissions, languages other than English, and complex clinical presentations can produce incorrect results. Routine is a rule label, not reassurance that a condition is safe. Clinical review and a validated pathway are required before real-care use. The database's old symptom-to-condition associations are not presented as confirmed diagnoses, and no medication recommendations are generated.

`condition_catalog` contains **74,879 valid ICD-10-CM FY2027 code descriptions**, imported from the [CDC official archive](https://ftp.cdc.gov/pub/health_statistics/nchs/publications/ICD10CM/2027/). These include diseases, symptoms, injuries and other coding concepts, not 74,879 distinct diseases or a claim of 99% coverage. The patient-facing Condition Reference search was removed at the user's request. Catalog records and the authenticated backend search remain stored separately from symptom screening; adding a code does not create a screening rule. Source release, URL and archive SHA256 are stored on every record.

Archive: `icd10cm-code-descriptions-2027.zip`
SHA256: `93e3ad6004badf470c55bfe679b748ae88fd9b2b421851e409eec382c7713b9a`
Reference date range: October 1, 2026?September 30, 2027. This is a US coding vocabulary; it is not a Malaysia clinical pathway.

The emergency phrase reference is the [London Ambulance Service emergency guidance](https://www.londonambulance.nhs.uk/our-services/emergency-care/calling-999/); legacy severity labels are retained from the local source, with conservative emergency overrides. This reference does not clinically validate the application's free-text matcher.

Run `python tools/import_condition_catalog.py` to verify/download the pinned public source without database writes, or add `--apply` to apply the migration and resume/upsert import batches using the existing authorized management login. Completed batches are repeatable and do not overwrite clinical tables. Imported data lives in Supabase; only the importer and schema are in Git.

Checks: `node tools/test_database.cjs`, `node tools/test_portal.cjs`, `node tools/test_symptom_checker.cjs`. These verify software behavior and access control, not clinical accuracy.

Frontend consistency: `node tools/restore_design.cjs` now also generates `original-design/app-core.js` (runtime, context, views, photos and bootstrap in one atomic resource) and content-based asset versions for entry points and dynamically rendered page assets. Do not edit `app-core.js` directly; regenerate after changing source scripts/styles. Run `node tools/test_bootstrap.cjs` to exercise the actual dashboard HTML bootstrap with a birth date and stale prior globals.

Patient Payment adapters now join appointment status, actual payment rows and the patient's reviews, so paid/pending/refunded states, ratings and eligible action buttons render from stored records. Receipt adapters provide line items. Migration `20261113000400_payment_reviews.sql` adds ownership-checked review creation/editing; it has been deployed and recorded. Counter payment instructions do not collect money or mark a payment complete. Verify with `node tools/test_payment_page.cjs`.

Appointment medical-record details now expand every matching prescription into medication rows, including both JSON strings/arrays and legacy medication/quantity field names. Medication values render as text. Verify with `node tools/test_appointment_record.cjs`.

Profile image compatibility is shared across portal templates and dynamic dialogs through `CarePlusViewPHP.photoUrl`. Filesystem-prefixed signed URLs are normalized consistently, including photo data attributes. Doctor prescription details receive patient age calculated from the stored birth date, alongside consistent patient/doctor photo and medication aliases. Checks: `node tools/test_doctor_prescription.cjs`, `node tools/test_prescription_photos.cjs`, and `node tools/test_bootstrap.cjs`. Existing photos are used; absent uploads retain default avatars.

Profile Save now uploads a selected avatar into the signed-in user's private Storage folder and persists the path through the existing permission-checked `avatar` operation for Patient, Doctor and Admin. It does not publish patient images. Run `node tools/test_profile_photo_upload.cjs` for mocked upload/path/type checks. Actual image delivery still depends on the account's existing Storage read permissions.

Admin Activity now aggregates existing appointment-created and doctor/patient-registration records, matching the legacy page. It restores latest-first ordering, 20-item pagination, type/name/Malaysia-date filters, authorized detail dialogs and dashboard recent activity. This is a feed derived from current records, not an immutable audit trail of every edit/delete/view. Checks: `node tools/test_activity_page.cjs`.

Admin Reports & Analytics now builds its statistics, daily chart arrays, status distribution and top-doctor appointment counts from the selected appointment-date range. Distinct patients count patients with appointments in that range. Initial dates cover available loaded history; empty periods show an explicit message. Calendar shortcuts use the supplied Malaysia date, Monday-start weeks and calendar months. Authorized rows are loaded in stable batches, including records beyond the first 1,000. Check: `node tools/test_reports_page.cjs` exercises the full HTML/bootstrap flow, chart datasets and data used by exports.


## November portal audit

Migrations `20261113000400` through `20261113000900` are deployed. They add review editing, complete profile persistence without overwriting identity names, registration demographics, own notification deletion, staff QR check-in, prescription amendments/cancellation and private logs, admin profile/photo editing, checked billing workflows, rating aggregates, assigned-doctor patient contacts, and medical-record treatment fields. Billing validates item totals, prevents duplicate active bills, synchronizes appointment status and keeps payment events. Completed payments retain their amount and identity; the refund action records an externally verified refund, and does not itself move money.

Prescription logs start when the migration is installed. Historical create/view/print events were not fabricated. Admin Activity remains the legacy appointment/registration feed. Missing actual uploads retain placeholders; the application does not invent photos. Patient QR view renders its existing check-in token locally with the same QR library used by the appointment page.

Additional checks: `node tools/test_all_pages.cjs`, `node tools/test_portal_actions.cjs`, `node tools/test_data_pagination.cjs`. Together with the existing tests these check all 30 portal HTML entries, 41 original view templates, action payloads, ownership, uploads, ages, visits, filters, charts, financial validation and data pagination. Browser DOM tests use synthetic accounts and mocked external libraries; actual camera permission/scanning and email confirmation/recovery delivery still need a real-browser check. `python tools/verify_portal_fixes.py` verifies deployed functions using read-only aggregates.
