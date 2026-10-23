# CarePlus ? Supabase edition

No PHP or build step. Upload this folder's contents to GitHub Pages. The original project and CarePlus-static are unchanged.

## Setup

1. In your Supabase project SQL Editor, run `supabase/schema.sql`. Use a new project or review existing profiles tables first.
2. Enter the Project URL and publishable key (or legacy anon key) in `supabase-config.js`. Never enter a secret or service_role key.
3. Enable Email authentication in Supabase. Set Authentication Site URL to your Pages URL, such as https://USERNAME.github.io/REPO/ . Add exact redirect URLs for `patient.html` and `resetPassword.html` under that URL. For local testing also allow http://localhost:8080/patient.html and http://localhost:8080/resetPassword.html .
4. Run `python -m http.server 8080` inside this folder. Open http://localhost:8080/login.html and click Check Supabase connection. Do not use file:// for authentication.
5. Register, confirm your email when required, sign in, and test password recovery. Supabase email delivery settings and limits apply.
6. Upload this folder's contents including .nojekyll to your GitHub repository. Enable Settings > Pages > Deploy from a branch > main > / (root).

## Included

Email/password registration and login, email confirmation redirect, password recovery, persisted sessions, logout, connection checking, and own-profile reads with Row Level Security. The SDK loads from jsDelivr and requires internet access.

All new users receive the patient role. Metadata submitted by the browser cannot assign a staff role. Only the project owner should run role updates in the SQL Editor, using an actual account UUID:

```sql
update public.profiles set role = 'doctor' where id = 'ACCOUNT-UUID';
-- Assign admin only to an authorized administrator.
```

RLS permits users to read only their own profile; anonymous profile reads return no rows. Browser profile writes are not granted. Portal routing is a convenience check; database access is enforced by RLS.

## Remaining work

Appointments, billing, prescriptions, medical records and doctor listings remain sample content. Contact forms do not send messages. The inherited public security/privacy descriptions concern the original PHP project and require revision before production use. No original SQL dumps, uploads or real patient records are included.

Project URL and public publishable key are configured. CLI login and project linking succeeded. Migration 20261024000100_create_profiles.sql is applied remotely. Live Auth and profiles endpoints both return HTTP 200; anonymous profiles reads return no rows. Real-account signup, email confirmation, sign-in and password recovery have not yet been tested. Configure your GitHub Pages Site URL and redirect allowlist before testing email flows.
