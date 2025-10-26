const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

const ensureClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured.');
  }

  cachedClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
};

const getSupabaseClient = async ({ accessToken } = {}) => {
  const client = ensureClient();

  if (accessToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: null,
    });
  }

  return client;
};

const getSupabaseUser = async (accessToken) => {
  if (!accessToken) {
    return null;
  }

  const client = ensureClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error) {
    const err = new Error('Failed to retrieve Supabase user');
    err.cause = error;
    throw err;
  }

  return data?.user ?? null;
};

module.exports = {
  getSupabaseClient,
  getSupabaseUser,
};
