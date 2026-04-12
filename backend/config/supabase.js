const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

module.exports = {
  supabase,
  hasSupabaseConfig,
  supabaseBucket: process.env.SUPABASE_BUCKET || "passport-photos",
};
