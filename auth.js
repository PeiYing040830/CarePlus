document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('auth-status');
  const show = message => { if (status) status.textContent = message; };
  const route = async client => {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Please sign in first.');
    const result = await client.from('profiles').select('role,display_name,legacy_user_id').eq('id', user.id).single();
    if (result.error) throw new Error('Profile unavailable. Run supabase/schema.sql in your project and check your profile.');
    if (!['patient', 'doctor', 'admin'].includes(result.data.role)) throw new Error('Unknown account role.');
    return { user, profile: result.data };
  };
  const run = async (button, work) => {
    button.disabled = true;
    show('Please wait…');
    try { await work(window.getCarePlusClient()); }
    catch (error) { show(error.message || 'Unable to connect. Please try again.'); }
    finally { button.disabled = false; }
  };
  const check = document.getElementById('check-connection');
  if (check) check.addEventListener('click', () => run(check, async client => {
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) throw error;
    show('Connected to Supabase. Database profile table is available.');
  }));
  const form = document.querySelector('[data-auth-form]');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(form);
    const action = form.dataset.authForm;
    run(form.querySelector('button[type="submit"]'), async client => {
      const email = String(fields.get('email') || '').trim();
      const password = String(fields.get('password') || '');
      const patientUrl = new URL('patient.html', location.href).href;
      if (action === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password,
          options: { emailRedirectTo: patientUrl, data: { display_name: String(fields.get('display_name') || '').trim() } }
        });
        if (error) throw error;
        if (data.session) location.assign('patient.html');
        else show('Check your email to confirm your account, then sign in.');
      } else if (action === 'login') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { profile } = await route(client);
        location.assign(profile.role + '.html');
      } else if (action === 'recover') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: new URL('resetPassword.html', location.href).href });
        if (error) throw error;
        show('If an account exists, a password reset email will be sent.');
      } else if (action === 'reset') {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        show('Password updated. You can now sign in.');
      }
    });
  });
  const portal = document.querySelector('[data-portal]');
  if (portal) {
    portal.hidden = true;
    (async () => {
      try {
        const client = window.getCarePlusClient();
        const { user, profile } = await route(client);
        if (profile.role !== portal.dataset.portal) { location.replace(profile.role + '.html'); return; }
        document.getElementById('account-name').textContent = profile.display_name || user.email;
        portal.hidden = false;
        const active = await client.rpc('careplus_role');
        if (active.error) throw active.error;
        if (!active.data) { portal.hidden = true; throw new Error('Your account is pending approval or inactive.'); }
        show('Connected to the clinic database.');
        window.dispatchEvent(new CustomEvent('careplus-ready', { detail: { client, user, profile } }));
        client.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { portal.hidden = true; location.replace('login.html'); } });
      } catch (error) {
        show(error.message + ' Use the Login link to continue.');
      }
    })();
  }
  const logout = document.getElementById('logout');
  if (logout) logout.addEventListener('click', () => run(logout, async client => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    location.replace('login.html');
  }));
});
