import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const supabaseUrl = "https://kubdkgtxaabkdakopytu.supabase.co";
const supabasePublishableKey = "sb_publishable_bNXTAnaQJVsXB64uXLRZqw_Ig2SjIgD";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
    }
});
