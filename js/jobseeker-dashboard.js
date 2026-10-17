/**
 * KAYA – Jobseeker Dashboard
 * Features inspired by Jobstreet PH:
 *  - Profile completeness widget
 *  - Application tracker with pipeline stages
 *  - Saved jobs with toggle
 *  - Job alerts (create / toggle / delete)
 *  - Recommended opportunities
 *  - Tab navigation
 */

import { getCurrentUser } from './supabase.js';

/* ── Sample data (replace with Supabase queries later) ──────── */

const SAMPLE_APPLICATIONS = [
    {
        id: 1,
        title: 'Frontend Web Developer',
        company: 'TechGrow Inc.',
        location: 'Cebu City',
        type: 'Full-time',
        appliedDate: '2026-10-10',
        status: 'active', // active = interview stage
        pipeline: ['applied', 'viewed', 'shortlisted', 'interview'],
        currentStage: 3,
    },
    {
        id: 2,
        title: 'UI/UX Designer',
        company: 'Pixel Studio',
        location: 'Remote',
        type: 'Freelance',
        appliedDate: '2026-10-08',
        status: 'viewed',
        pipeline: ['applied', 'viewed', 'shortlisted', 'interview'],
        currentStage: 1,
    },
    {
        id: 3,
        title: 'WordPress Developer',
        company: 'Agency PH',
        location: 'Mandaue City',
        type: 'Part-time',
        appliedDate: '2026-10-03',
        status: 'rejected',
        pipeline: ['applied', 'viewed', 'shortlisted', 'interview'],
        currentStage: 1,
    },
    {
        id: 4,
        title: 'Junior Software Engineer',
        company: 'Softserve Corp.',
        location: 'Cebu City',
        type: 'Full-time',
        appliedDate: '2026-09-28',
        status: 'pending',
        pipeline: ['applied', 'viewed', 'shortlisted', 'interview'],
        currentStage: 0,
    },
];

const SAMPLE_SAVED_JOBS = [
    {
        id: 10,
        title: 'React Developer',
        company: 'CloudPH',
        location: 'Remote',
        type: 'Full-time',
        tags: ['React', 'TypeScript', 'Node.js'],
        postedDate: '2026-10-12',
    },
    {
        id: 11,
        title: 'Graphic Designer',
        company: 'Branding Co.',
        location: 'Cebu City',
        type: 'Freelance',
        tags: ['Photoshop', 'Illustrator', 'Figma'],
        postedDate: '2026-10-11',
    },
    {
        id: 12,
        title: 'Content Writer',
        company: 'MediaPH',
        location: 'Cebu City',
        type: 'Part-time',
        tags: ['SEO', 'Copywriting', 'WordPress'],
        postedDate: '2026-10-09',
    },
];

const SAMPLE_ALERTS = [
    { id: 1, keyword: 'Web Developer', location: 'Cebu City', frequency: 'daily', active: true },
    { id: 2, keyword: 'Graphic Designer', location: 'Remote', frequency: 'weekly', active: false },
];

const SAMPLE_RECOMMENDED = [
    {
        id: 20,
        title: 'Full Stack Developer',
        company: 'StartupXYZ',
        location: 'Cebu City',
        type: 'Full-time',
        category: 'Web Development',
        salary: '₱30k–₱50k',
    },
    {
        id: 21,
        title: 'Mobile App Developer',
        company: 'AppHive PH',
        location: 'Remote',
        type: 'Full-time',
        category: 'Mobile Development',
        salary: '₱25k–₱45k',
    },
    {
        id: 22,
        title: 'Digital Marketing Specialist',
        company: 'Growthly PH',
        location: 'Mandaue City',
        type: 'Full-time',
        category: 'Marketing',
        salary: '₱18k–₱28k',
    },
];

/* ── State ──────────────────────────────────────────────────── */
let savedJobs    = [...SAMPLE_SAVED_JOBS];
let alerts       = [...SAMPLE_ALERTS];
let applications = [...SAMPLE_APPLICATIONS];

/* ── Helpers ────────────────────────────────────────────────── */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getInitials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function statusBadge(status) {
    const map = {
        pending:  'badge-pending',
        viewed:   'badge-viewed',
        active:   'badge-active',
        rejected: 'badge-rejected',
    };
    const labels = {
        pending:  'Pending',
        viewed:   'Viewed',
        active:   'Interview',
        rejected: 'Rejected',
    };
    return `<span class="badge ${map[status] || 'badge-pending'}">${labels[status] || status}</span>`;
}

/* ── Tab switching ──────────────────────────────────────────── */
function switchTab(tabId) {
    document.querySelectorAll('.dash-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Re-render when switching to certain tabs
    if (tabId === 'applications') renderAllApplications();
    if (tabId === 'saved')        renderSavedJobs();
    if (tabId === 'alerts')       renderAlerts();
}

// Expose for inline onclick in HTML
window.switchTab = switchTab;

/* ── Profile completeness ───────────────────────────────────── */
// Each field maps to: which profile tab to open, which field element to focus,
// and WHY it matters so the user understands the reason.
const COMPLETENESS_FIELDS = [
    {
        id:       'ci-name',
        label:    'Full name',
        tab:      'personal',
        fieldId:  'fullNameInput',
        icon:     '👤',
        reason:   'Required so clients can identify you.',
        why:      'Your full name appears on every application and your public profile. Clients need to know who they are hiring.',
    },
    {
        id:       'ci-photo',
        label:    'Profile photo',
        tab:      'personal',
        fieldId:  'avatarFileInput',
        icon:     '📸',
        reason:   'Profiles with photos get 3× more views.',
        why:      'A profile photo builds trust. Clients are significantly more likely to contact someone with a clear, professional photo.',
    },
    {
        id:       'ci-phone',
        label:    'Phone number',
        tab:      'personal',
        fieldId:  'phoneInput',
        icon:     '📞',
        reason:   'Clients need a way to contact you.',
        why:      'Many clients prefer to call or message before hiring. Missing a phone number can cause you to miss opportunities.',
    },
    {
        id:       'ci-barangay',
        label:    'Barangay',
        tab:      'personal',
        fieldId:  'barangayInput',
        icon:     '📍',
        reason:   'Required to verify Minglanilla residency.',
        why:      'KAYA is exclusive to Minglanilla residents. Your barangay is used to verify your residency during account approval.',
    },
    {
        id:       'ci-skill',
        label:    'Primary skill',
        tab:      'professional',
        fieldId:  'primarySkillInput',
        icon:     '🔧',
        reason:   'Helps clients find you in search.',
        why:      'Your primary skill is the first thing shown in search results. Without it, you will not appear when clients search for workers.',
    },
    {
        id:       'ci-bio',
        label:    'Professional summary',
        tab:      'professional',
        fieldId:  'bioInput',
        icon:     '📝',
        reason:   'The first thing clients read on your profile.',
        why:      'A clear bio explains your experience and services. Profiles without a bio have much lower application success rates.',
    },
    {
        id:       'ci-id',
        label:    'ID proof uploaded',
        tab:      'personal',
        fieldId:  'idProofInput',
        icon:     '🪪',
        reason:   'Needed for admin to activate your account.',
        why:      'Your account stays inactive until an admin verifies your Minglanilla residency ID. Without this, you cannot receive job offers.',
    },
];

function buildProfileUrl(tab, fieldId) {
    return `/pages/profile.html?goto=${tab}&field=${fieldId}`;
}

function renderCompleteness(user) {
    // Determine what is filled
    const p = user.profile || {};
    const fieldValues = {
        'ci-name':     user.fullName,
        'ci-photo':    p.avatar_url,
        'ci-phone':    user.phone,
        'ci-barangay': p.barangay,
        'ci-skill':    user.primarySkill,
        'ci-bio':      user.bio,
        'ci-id':       p.id_proof_url || p.id_proof_filename,
    };

    const done  = Object.values(fieldValues).filter(v => v && String(v).trim()).length;
    const total = COMPLETENESS_FIELDS.length;
    const pct   = Math.round((done / total) * 100);

    setText('completenessPercent', `${pct}%`);
    const bar = document.getElementById('completenessBar');
    if (bar) bar.style.width = `${pct}%`;

    COMPLETENESS_FIELDS.forEach(f => {
        const el  = document.getElementById(f.id);
        if (!el) return;

        const filled = !!(fieldValues[f.id] && String(fieldValues[f.id]).trim());
        el.classList.toggle('done',    filled);
        el.classList.toggle('missing', !filled);

        if (filled) {
            // Completed item — plain text
            el.innerHTML = `
                <span class="check-icon">✓</span>
                ${f.label}
                <span class="item-reason" style="color:var(--color-success);font-style:normal;">Done</span>`;
        } else {
            // Missing item — clickable link with reason
            el.innerHTML = `
                <a href="${buildProfileUrl(f.tab, f.fieldId)}"
                   title="Go fill in: ${f.label}">
                    <span class="check-icon">!</span>
                    ${f.icon} ${f.label}
                    <span class="item-reason">${f.reason}</span>
                </a>`;
        }
    });
}

/* ── Recent applications (Overview tab) ─────────────────────── */
function renderRecentApplications() {
    const container = document.getElementById('recentAppsList');
    if (!container) return;

    const recent = applications.slice(0, 3);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No applications yet</h3>
                <p>Start applying to jobs and they will appear here.</p>
            </div>`;
        return;
    }

    container.innerHTML = recent.map(app => `
        <div class="application-item">
            <div class="app-company-logo">${getInitials(app.company)}</div>
            <div class="app-info">
                <h3>${app.title}</h3>
                <p>${app.company} &bull; ${app.location} &bull; ${app.type}</p>
            </div>
            <div class="app-meta">
                ${statusBadge(app.status)}
                <time>${formatDate(app.appliedDate)}</time>
            </div>
        </div>
    `).join('');
}

/* ── All applications with pipeline (Applications tab) ──────── */
function renderAllApplications() {
    const container = document.getElementById('applicationsList');
    if (!container) return;

    const filter = document.getElementById('appStatusFilter')?.value || 'all';
    const list   = filter === 'all'
        ? applications
        : applications.filter(a => a.status === filter);

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No applications found</h3>
                <p>Try adjusting the filter above.</p>
            </div>`;
        return;
    }

    const STAGES = ['Applied', 'Viewed', 'Shortlisted', 'Interview'];

    container.innerHTML = list.map(app => {
        const pipeline = STAGES.map((label, idx) => {
            let cls = '';
            if (idx < app.currentStage)  cls = 'done';
            if (idx === app.currentStage) cls = app.status === 'rejected' ? '' : 'active';
            return `
                <div class="pipe-step ${cls}">
                    <div class="pipe-dot">${idx < app.currentStage ? '✓' : idx + 1}</div>
                    <span class="pipe-label">${label}</span>
                </div>`;
        }).join('');

        return `
            <div class="application-item" style="flex-direction:column;align-items:stretch;padding-bottom:0;">
                <div style="display:flex;align-items:center;gap:1rem;padding-bottom:0.75rem;">
                    <div class="app-company-logo">${getInitials(app.company)}</div>
                    <div class="app-info">
                        <h3>${app.title}</h3>
                        <p>${app.company} &bull; ${app.location} &bull; ${app.type}</p>
                    </div>
                    <div class="app-meta">
                        ${statusBadge(app.status)}
                        <time>${formatDate(app.appliedDate)}</time>
                    </div>
                </div>
                <div class="app-pipeline">${pipeline}</div>
            </div>`;
    }).join('');
}

/* ── Saved jobs ─────────────────────────────────────────────── */
function renderSavedJobs() {
    const container  = document.getElementById('savedJobsList');
    const countEl    = document.getElementById('savedCount');
    const statEl     = document.getElementById('statSaved');
    if (!container) return;

    if (countEl) countEl.textContent = `${savedJobs.length} job${savedJobs.length !== 1 ? 's' : ''} saved`;
    if (statEl)  statEl.textContent  = savedJobs.length;

    if (savedJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔖</div>
                <h3>No saved jobs</h3>
                <p>Bookmark jobs from the search page and find them here.</p>
            </div>`;
        return;
    }

    container.innerHTML = savedJobs.map(job => `
        <div class="saved-job-item" id="saved-${job.id}">
            <div class="saved-job-logo">${getInitials(job.company)}</div>
            <div class="saved-job-info">
                <h3>${job.title}</h3>
                <p>${job.company} &bull; ${job.location} &bull; ${job.type}</p>
                <div class="job-tags">
                    ${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;">
                <button class="btn btn-primary btn-sm">Apply</button>
                <button class="btn-unsave saved" title="Remove from saved" data-id="${job.id}">🔖</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-unsave').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            savedJobs = savedJobs.filter(j => j.id !== id);
            renderSavedJobs();
            updateStats();
        });
    });
}

/* ── Job alerts ─────────────────────────────────────────────── */
function renderAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔔</div>
                <h3>No job alerts</h3>
                <p>Create an alert and get notified when matching jobs appear.</p>
            </div>`;
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-card" id="alert-${alert.id}">
            <span class="alert-icon">🔔</span>
            <div class="alert-card-info">
                <h3>${alert.keyword}</h3>
                <p>${alert.location || 'Any location'} &bull; ${alert.frequency}</p>
            </div>
            <label class="alert-toggle" title="${alert.active ? 'Disable alert' : 'Enable alert'}">
                <input type="checkbox" ${alert.active ? 'checked' : ''} data-id="${alert.id}">
                <span class="toggle-slider"></span>
            </label>
            <button class="btn-unsave" title="Delete alert" data-id="${alert.id}" style="font-size:0.85rem;">✕</button>
        </div>
    `).join('');

    // Toggle active
    container.querySelectorAll('.alert-toggle input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const id   = Number(checkbox.dataset.id);
            const idx  = alerts.findIndex(a => a.id === id);
            if (idx >= 0) alerts[idx].active = checkbox.checked;
        });
    });

    // Delete alert
    container.querySelectorAll('.btn-unsave').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            alerts = alerts.filter(a => a.id !== id);
            renderAlerts();
        });
    });
}

/* ── Recommended opportunities ──────────────────────────────── */
function renderRecommended() {
    const container = document.getElementById('recommendedList');
    if (!container) return;

    container.innerHTML = SAMPLE_RECOMMENDED.map(job => `
        <div class="opportunity">
            <div class="opportunity-logo">${getInitials(job.company)}</div>
            <div class="opportunity-body">
                <span class="opportunity-category">${job.category}</span>
                <h3>${job.title}</h3>
                <p>${job.company} &bull; ${job.location}</p>
                <div class="job-tags">
                    <span class="job-tag">${job.type}</span>
                    <span class="job-tag">${job.salary}</span>
                </div>
            </div>
            <div class="opportunity-actions">
                <button class="btn btn-primary btn-sm">Apply</button>
                <button class="btn-unsave" title="Save job" data-job-id="${job.id}">🔖</button>
            </div>
        </div>
    `).join('');

    // Quick save from recommended
    container.querySelectorAll('.btn-unsave').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = Number(btn.dataset.jobId);
            const job  = SAMPLE_RECOMMENDED.find(j => j.id === id);
            const already = savedJobs.find(j => j.id === id);
            if (job && !already) {
                savedJobs.push({ ...job, tags: [job.type, job.category], postedDate: new Date().toISOString().slice(0,10) });
                btn.classList.add('saved');
                btn.title = 'Saved!';
                updateStats();
            }
        });
    });
}

/* ── Stats ──────────────────────────────────────────────────── */
function updateStats() {
    setText('statApps',   applications.length);
    setText('statSaved',  savedJobs.length);
    setText('statViews',  '—');
    // Update saved count display in saved tab if visible
    const countEl = document.getElementById('savedCount');
    if (countEl) countEl.textContent = `${savedJobs.length} job${savedJobs.length !== 1 ? 's' : ''} saved`;
}

/* ── Alert form ─────────────────────────────────────────────── */
function initAlertForm() {
    const newBtn      = document.getElementById('newAlertBtn');
    const formPanel   = document.getElementById('alertFormPanel');
    const closeBtn    = document.getElementById('closeAlertForm');
    const form        = document.getElementById('alertForm');

    if (!newBtn || !formPanel || !form) return;

    newBtn.addEventListener('click', () => {
        formPanel.style.display = 'block';
    });

    closeBtn?.addEventListener('click', () => {
        formPanel.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword  = document.getElementById('alertKeyword').value.trim();
        const location = document.getElementById('alertLocation').value.trim();
        const freq     = document.getElementById('alertFreq').value;
        if (!keyword) return;

        alerts.push({
            id:        Date.now(),
            keyword,
            location:  location || 'Any location',
            frequency: freq,
            active:    true,
        });

        form.reset();
        formPanel.style.display = 'none';
        renderAlerts();
    });
}

/* ── Tab buttons wiring ─────────────────────────────────────── */
function initTabs() {
    document.querySelectorAll('.dash-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Wire filter change in applications tab
    const appFilter = document.getElementById('appStatusFilter');
    if (appFilter) appFilter.addEventListener('change', renderAllApplications);
}

/* ── Main init ──────────────────────────────────────────────── */
async function loadJobseekerDashboard() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        if (user.role !== 'jobseeker') {
            window.location.href = 'client-dashboard.html';
            return;
        }

        const name = user.fullName?.trim() || 'Job Seeker';

        // Navbar / welcome heading
        setText('navbarUserName', name);
        setText('welcomeName',    name);

        // Profile sidebar card
        setText('profileCardName',     name);
        setText('profileCardSkill',    user.primarySkill || 'No skill added');
        setText('profileCardLocation', user.location     || 'Location not set');
        setText('memberSince', formatDate(user.created_at));
        setText('profileViews', '—');

        const initEl = document.getElementById('profileInitialsLg');
        if (initEl) initEl.textContent = getInitials(name);

        // Profile completeness
        renderCompleteness(user);

        // Stats
        updateStats();

        // Render sections
        renderRecentApplications();
        renderRecommended();
        renderSavedJobs();
        renderAlerts();

        // Init interactions
        initTabs();
        initAlertForm();

    } catch (err) {
        console.error('Jobseeker dashboard error:', err);
    }
}

loadJobseekerDashboard();
