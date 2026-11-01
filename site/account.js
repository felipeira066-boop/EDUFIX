import { supabase } from "./supabase-client.js";

export async function getCurrentProfile() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        throw sessionError;
    }
    if (!sessionData.session) {
        return null;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        throw userError;
    }
    if (!user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, grade_band, has_study_pass")
        .eq("user_id", user.id)
        .single();

    if (profileError) {
        throw profileError;
    }

    return { user, profile };
}

export async function requireProfile({ planRequired = false } = {}) {
    const account = await getCurrentProfile();
    if (!account) {
        window.location.replace("/login.html");
        return null;
    }

    if (planRequired && !account.profile.grade_band) {
        window.location.replace("/plano.html");
        return null;
    }

    return account;
}

export async function redirectToJourney() {
    const account = await getCurrentProfile();
    if (!account) {
        window.location.replace("/login.html");
        return;
    }

    window.location.replace(account.profile.grade_band ? "/materias.html" : "/plano.html");
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw error;
    }
    window.location.assign("/");
}
