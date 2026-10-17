
import { supabase, getCurrentUser } from './supabase.js';

function getCurrentPage() {
    return window.location.pathname;
}

function isPublicPage(path) {
    return (
        path === '/' ||
        path.endsWith('/index.html') ||
        path.endsWith('/login.html') ||
        path.endsWith('/register.html')
    );
}

function getDashboardPath(role) {
    return role === 'client'
        ? '/pages/client-dashboard.html'
        : '/pages/jobseeker-dashboard.html';
}

function getProfilePath(role) {
    return role === 'client'
        ? '/pages/client-profile.html'
        : '/pages/profile.html';
}

async function initSessionGuard() {
    const path = getCurrentPage();

    const isClientDashboard    = path.endsWith('/client-dashboard.html');
    const isClientProfile      = path.endsWith('/client-profile.html');
    const isJobseekerDashboard = path.endsWith('/jobseeker-dashboard.html');
    const isJobseekerProfile   = path.endsWith('/profile.html');

    try {
        const user = await getCurrentUser();

        // Protect private pages from logged-out visitors.
        if (!user && !isPublicPage(path)) {
            window.location.replace('/pages/login.html');
            return;
        }

        // Redirect logged-in users away from login/register.
        if (
            user &&
            (path.endsWith('/login.html') || path.endsWith('/register.html'))
        ) {
            window.location.replace(getDashboardPath(user.role));
            return;
        }

        if (!user) {
            updateNavbarUI(null);
            return;
        }

        // Clients cannot access job-seeker pages.
        if (user.role === 'client' && (isJobseekerDashboard || isJobseekerProfile)) {
            window.location.replace('/pages/client-dashboard.html');
            return;
        }

        // Job seekers cannot access client pages.
        if (user.role !== 'client' && (isClientDashboard || isClientProfile)) {
            window.location.replace('/pages/jobseeker-dashboard.html');
            return;
        }

        // Mandatory profile completion — send new users to their profile page.
        const onProfilePage = isJobseekerProfile || isClientProfile;
        if (!user.profileCompleted && !onProfilePage) {
            window.location.replace(getProfilePath(user.role));
            return;
        }

        updateNavbarUI(user);

    } catch (error) {
        console.error('Session check failed:', error);
    }
}


function updateNavbarUI(user) {
    const authContainer =
        document.getElementById('navbarAuth');

    const dashboardLink =
        document.getElementById('dashboardNavLink');

    const profileLink =
        document.getElementById('profileNavLink');

    // Show or hide account navigation links.
    if (dashboardLink) {
        dashboardLink.hidden = !user;
    }

    if (profileLink) {
        profileLink.hidden =
            !user || user.role !== 'jobseeker';
    }

    if (user) {
        const dashboardPath = getDashboardPath(user.role);

        if (dashboardLink) {
            dashboardLink.href = dashboardPath;
        }

        if (profileLink) {
            profileLink.href = '/pages/profile.html';
        }

        if (!authContainer) return;

        // Get the actual logged-in user's name.
        const name = user.fullName?.trim() || 'User';

        authContainer.innerHTML = `
            <span id="navbarUserName"></span>

            <button
                id="navbarLogout"
                class="btn btn-outline"
                type="button"
            >
                Logout
            </button>
        `;

        // Safely display the name.
        document.getElementById('navbarUserName')
            .textContent = name;

        document
            .getElementById('navbarLogout')
            .addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();

                if (error) {
                    console.error('Logout failed:', error);
                    alert('Logout failed. Please try again.');
                    return;
                }

                window.location.replace('/pages/login.html');
            });

    } else if (authContainer) {
        authContainer.innerHTML = `
            <a href="/pages/login.html"
               class="btn btn-secondary">
                Login
            </a>

            <a href="/pages/register.html"
               class="btn btn-primary">
                Join KAYA
            </a>
        `;
    }
}


initSessionGuard();

supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        const path = getCurrentPage();

        if (!isPublicPage(path)) {
            window.location.replace('/pages/login.html');
        }
    }
});
