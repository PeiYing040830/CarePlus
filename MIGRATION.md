# XAMPP to Supabase migration

## Completed remotely

- Linked project: guvhmilltpgoloqkvnmj.
- Applied migrations 20261024000100 and 20261024000200.
- Imported 5 accounts through Supabase Auth, preserving their bcrypt hashes and legacy roles.
- Imported 17 business tables from the local data dump: 6 appointments, 2 patients, 2 doctors, 2 medical records, 3 prescriptions, 2 payments, 22 notifications, 2 reviews, 2 symptom checks, 15 QR event logs, 3 chatbot logs, 1 administrator, 1 contact submission, 31 knowledge rules, 124 catalog rows and 49 symptom rules.
- Original IDs, record relationships and Malaysia-time timestamps are preserved. Data is stored in Supabase, not committed to GitHub.

## Deployed and verified

Migration `20261024000300_live_workflows.sql` is deployed with the user's explicit approval. It enables role-based reads, validated writes, patient signup business records, public doctor directory, private Storage and live portal workflows.

All 4 referenced legacy profile images were found and migrated to private Storage; source files remain unchanged. All source record IDs across 17 tables and all 5 account roles/password hashes were compared successfully. The public directory responds successfully; anonymous patient, clinical, payment and booking requests are denied. Supabase's database linter reports no schema errors.

The frontend passed JavaScript checks and DOM simulation of all three portals. The actual migrations and authorization workflows passed isolated PostgreSQL/WASM tests with synthetic users.

## Retained sources and behavior changes

The original PHP/MySQL files and images remain unchanged in the parent workspace. This repository contains no patient data dump, password hash export, real image files or administrative keys. Existing security-question answers are not imported; Supabase email recovery replaces that method.

New appointments use explicit staff completion rather than automatically marking visits complete. Camera scanning, scheduled reminders, automatic expiry, AI symptom analysis and an online payment gateway still require separate implementation; check-in references, imported histories, journal entries and externally verified payment recording are supported.

## Deployment verification

All three migrations are recorded remotely. Auth Site URL and the confirmation/recovery redirect allowlist have been configured and verified for GitHub Pages and localhost:8080; unrelated Auth settings were preserved. A real user should verify sign-in with their old password and email recovery; no plaintext passwords were needed for migration.
