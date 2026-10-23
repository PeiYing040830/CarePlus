(() => {
  'use strict';
  let client;
  window.getCarePlusClient = () => {
    if (client) return client;
    const config = window.CAREPLUS_SUPABASE || {};
    if (!config.url || !config.publishableKey) {
      throw new Error('Add your Supabase URL and publishable key to supabase-config.js first.');
    }
    const url = new URL(config.url);
    if (url.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
    const key = config.publishableKey;
    if (key.startsWith('sb_secret_')) throw new Error('Secret keys cannot be used in the browser.');
    if (key.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role !== 'anon') throw new Error('Use the anon key, never a service_role key.');
      } catch (error) {
        throw new Error('Invalid public key. Use a publishable key or legacy anon key.');
      }
    } else if (!key.startsWith('sb_publishable_')) {
      throw new Error('Use a Supabase publishable key or legacy anon key.');
    }
    if (!window.supabase) throw new Error('Supabase library could not load. Check your internet connection and reload.');
    client = window.supabase.createClient(url.href, key);
    return client;
  };
})();
