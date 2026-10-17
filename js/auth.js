import { supabase, getCurrentUser } from './supabase.js';

// Dashboard and profile destinations based on account role
const ROLE_ROUTES = {
    client:    '/pages/client-dashboard.html',
    jobseeker: '/pages/jobseeker-dashboard.html',
};

const PROFILE_ROUTES = {
    client:    '/pages/client-profile.html',
    jobseeker: '/pages/profile.html',
};

// REGISTER A NEW ACCOUNT
export async function registerUser({ email, password, fullName, role }) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    role:      role
                }
            }
        });

        if (error) throw error;

        if (!data.user) {
            throw new Error('Supabase did not return a user. Please try again.');
        }

        // Email confirmation required — no active session yet
        if (!data.session) {
            alert(
                'Registration successful!\n\n' +
                'Please check your email for a confirmation link before logging in.'
            );
            window.location.href = '/pages/login.html';
            return;
        }

        // Session exists — send to profile setup so they can complete their info
        alert('Account created! Please complete your profile to get started.');

        const profileDest = PROFILE_ROUTES[role] || PROFILE_ROUTES.jobseeker;
        window.location.href = profileDest;

    } catch (err) {
        console.error('Registration failed:', err);
        alert('Registration failed: ' + (err.message || 'An unexpected error occurred.'));
    }
}

// LOGIN AN EXISTING ACCOUNT
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) throw error;

        const user = await getCurrentUser();
        const role = user?.role || data.user?.user_metadata?.role || 'jobseeker';

        redirectToDashboard(role);

    } catch (err) {
        console.error('Login failed:', err);
        alert('Login failed: ' + (err.message || 'An unexpected error occurred.'));
    }
}

// REDIRECT BASED ON ACCOUNT ROLE
export function redirectToDashboard(role) {
    const destination = ROLE_ROUTES[role] || ROLE_ROUTES.jobseeker;
    window.location.href = destination;
}

// LOG OUT THE CURRENT USER
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.replace('/pages/login.html');
    } catch (err) {
        console.error('Logout failed:', err);
        alert('Logout failed: ' + (err.message || 'An unexpected error occurred.'));
    }
}
