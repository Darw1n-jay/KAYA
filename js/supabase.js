
import {
  createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL =
  'https://tjqogirsbqqxkiegzxbf.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_Oln0JL7lS3uBPEm2x-dMhA_VphyBdCX';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/**
 * Retrieves the authenticated user and their KAYA profile.
 */
export async function getCurrentUser() {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  const authUser = session.user;

  const {
    data: profile,
    error: profileError
  } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      phone,
      location,
      primary_skill,
      bio,
      avatar_url,
      profile_completed
    `)
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      'Unable to load KAYA profile:',
      profileError.message
    );
  }

  const fullName =
    profile?.full_name ||
    authUser.user_metadata?.full_name ||
    '';

  return {
    ...authUser,

    // Account information
    role:
      profile?.role ||
      authUser.user_metadata?.role ||
      'jobseeker',

    fullName,

    // Complete profile record
    profile: profile || null,

    // Individual profile fields
    phone: profile?.phone || '',
    location: profile?.location || '',
    primarySkill: profile?.primary_skill || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatar_url || '',

    // Only true when the database explicitly says so
    profileCompleted:
      profile?.profile_completed === true
  };
}
