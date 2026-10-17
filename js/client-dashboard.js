/**
 * KAYA – Client Dashboard
 * Features inspired by Jobstreet PH employer portal:
 *  - Post a new job (modal form)
 *  - Manage job listings with status & applicant count
 *  - Applicant pipeline (Kanban-style overview)
 *  - Applicants list with filtering by job post
 *  - Candidate search (talent tab)
 *  - Recommended candidates sidebar
 *  - Overview stats
 *  - Tab navigation
 */

import { getCurrentUser } from './supabase.js';

/* ── Sample data (replace with Supabase queries later) ──────── */

let JOB_LISTINGS = [
    {
        id: 1,
        title: 'Frontend Web Developer',
        category: 'Web Development',
        type: 'Full-time',
        location: 'Cebu City',
        budget: '₱25,000 – ₱35,000',
        description: 'Build and maintain responsive web interfaces.',
        skills: ['HTML', 'CSS', 'JavaScript', 'React'],
        status: 'active',
        postedDate: '2026-10-12',
        applicants: 8,
    },
    {
        id: 2,
        title: 'Brand Identity Designer',
        category: 'Graphic Design',
        type: 'Freelance / Project',
        location: 'Remote',
        budget: '₱15,000 – ₱20,000',
        description: 'Design logos, color palettes, and brand guidelines.',
        skills: ['Photoshop', 'Illustrator', 'Figma'],
        status: 'active',
        postedDate: '2026-10-08',
        applicants: 5,
    },
    {
        id: 3,
        title: 'SEO Content Writer',
        category: 'Content Writing',
        type: 'Part-time',
        location: 'Remote',
        budget: '₱10,000 – ₱15,000',
        description: 'Write SEO-optimized articles for our blog.',
        skills: ['SEO', 'Copywriting', 'WordPress'],
        status: 'closed',
        postedDate: '2026-09-25',
        applicants: 5,
    },
];

const SAMPLE_APPLICANTS = [
    { id: 1, jobId: 1, name: 'Ana Reyes',    skill: 'React Developer',   stage: 'interview',  appliedDate: '2026-10-13', rating: 4.9 },
    { id: 2, jobId: 1, name: 'Ben Morales',  skill: 'Vue Developer',     stage: 'shortlisted', appliedDate: '2026-10-12', rating: 4.7 },
    { id: 3, jobId: 1, name: 'Carlos Tan',   skill: 'Web Developer',     stage: 'applied',    appliedDate: '2026-10-11', rating: 4.5 },
    { id: 4, jobId: 1, name: 'Diana Cruz',   skill: 'Frontend Engineer', stage: 'applied',    appliedDate: '2026-10-10', rating: 4.6 },
    { id: 5, jobId: 2, name: 'Eva Santos',   skill: 'Brand Designer',    stage: 'viewed',     appliedDate: '2026-10-09', rating: 4.8 },
    { id: 6, jobId: 2, name: 'Frank Go',     skill: 'Graphic Designer',  stage: 'applied',    appliedDate: '2026-10-08', rating: 4.4 },
    { id: 7, jobId: 3, name: 'Grace Uy',     skill: 'Content Writer',    stage: 'shortlisted', appliedDate: '2026-09-26', rating: 4.9 },
    { id: 8, jobId: 3, name: 'Hans Lim',     skill: 'SEO Specialist',    stage: 'viewed',     appliedDate: '2026-09-25', rating: 4.6 },
];

const SAMPLE_CANDIDATES = [
    { id: 1, name: 'Juan Dela Cruz', skill: 'Graphic Designer',   location: 'Cebu City', rating: 4.9 },
    { id: 2, name: 'Ana Marie',      skill: 'Web Developer',      location: 'Mandaue',   rating: 4.8 },
    { id: 3, name: 'Rico Cruz',      skill: 'Electrician',        location: 'Cebu City', rating: 4.7 },
    { id: 4, name: 'Mark Santos',    skill: 'Photographer',       location: 'Lapu-Lapu', rating: 4.9 },
    { id: 5, name: 'Liza Reyes',     skill: 'Content Writer',     location: 'Remote',    rating: 4.8 },
];

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

function stageBadge(stage) {
    const map = {
        applied:     ['badge-pending', 'Applied'],
        viewed:      ['badge-viewed',  'Viewed'],
        shortlisted: ['badge-active',  'Shortlisted'],
        interview:   ['badge-hired',   'Interview'],
        hired:       ['badge-hired',   'Hired'],
        rejected:    ['badge-rejected','Rejected'],
    };
    const [cls, label] = map[stage] || ['badge-pending', stage];
    return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Tab switching ──────────────────────────────────────────── */
function switchTab(tabId) {
    document.querySelectorAll('.dash-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    if (tabId === 'listings')   renderFullListings();
    if (tabId === 'applicants') renderFullApplicants();
    if (tabId === 'search')     renderTalentSearch('');
}

window.switchTab = switchTab;

/* ── Stats ──────────────────────────────────────────────────── */
function updateStats() {
    const active     = JOB_LISTINGS.filter(j => j.status === 'active').length;
    const totalApps  = SAMPLE_APPLICANTS.length;
    const hired      = SAMPLE_APPLICANTS.filter(a => a.stage === 'hired').length;
    const thisWeek   = SAMPLE_APPLICANTS.filter(a => {
        const d = new Date(a.appliedDate);
        const now = new Date();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7;
    }).length;

    setText('statPosts',      active);
    setText('statApplicants', totalApps);
    setText('statHired',      hired);
    setText('statNew',        thisWeek);
}

/* ── Active listings snapshot (Overview) ────────────────────── */
function renderActiveListings() {
    const container = document.getElementById('activeListingsList');
    if (!container) return;

    const active = JOB_LISTINGS.filter(j => j.status === 'active');

    if (active.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No active job posts</h3>
                <p>Click "+ Post a New Job" to get started.</p>
            </div>`;
        return;
    }

    container.innerHTML = active.map(job => `
        <div class="listing-item">
            <div class="listing-top">
                <h3>${job.title}</h3>
                <span class="badge badge-active">Active</span>
            </div>
            <div class="listing-meta">
                <span>📂 ${job.category}</span>
                <span>⏱ ${job.type}</span>
                <span>📍 ${job.location}</span>
                <span>💰 ${job.budget}</span>
                <span>👥 ${job.applicants} applicant${job.applicants !== 1 ? 's' : ''}</span>
            </div>
            <div class="listing-actions">
                <button class="btn btn-primary btn-sm" onclick="switchTab('applicants')">Review Applicants</button>
                <button class="btn btn-ghost btn-sm" onclick="closeJob(${job.id})">Close Job</button>
            </div>
        </div>
    `).join('');
}

/* ── Pipeline overview (Overview) ───────────────────────────── */
function renderPipelineOverview() {
    const container = document.getElementById('pipelineView');
    if (!container) return;

    const stages = ['applied', 'viewed', 'shortlisted', 'interview'];
    const labels = { applied: 'Applied', viewed: 'Viewed', shortlisted: 'Shortlisted', interview: 'Interview' };

    container.innerHTML = stages.map(stage => {
        const inStage = SAMPLE_APPLICANTS.filter(a => a.stage === stage);
        const cards   = inStage.slice(0, 3).map(a => `
            <div class="pipeline-card">
                <h4>${a.name}</h4>
                <p>${a.skill}</p>
            </div>`).join('');
        const more = inStage.length > 3 ? `<p class="text-muted" style="font-size:0.72rem;padding:0.3rem 0;">+${inStage.length - 3} more</p>` : '';

        return `
            <div class="pipeline-col">
                <div class="pipeline-col-header">
                    ${labels[stage]}
                    <span class="count">${inStage.length}</span>
                </div>
                ${cards}${more}
            </div>`;
    }).join('');
}

/* ── Recommended candidates (sidebar) ───────────────────────── */
function renderRecommendedCandidates() {
    const container = document.getElementById('recommendedCandidates');
    if (!container) return;

    container.innerHTML = SAMPLE_CANDIDATES.map(c => `
        <div class="candidate-item">
            <div class="candidate-avatar">${getInitials(c.name)}</div>
            <div class="candidate-info">
                <h3>${c.name}</h3>
                <p>${c.skill} &bull; ${c.location}</p>
            </div>
            <span class="candidate-rating">★ ${c.rating}</span>
        </div>
    `).join('');
}

/* ── Full listings (Listings tab) ───────────────────────────── */
function renderFullListings() {
    const container = document.getElementById('fullListingsList');
    if (!container) return;

    const filter = document.getElementById('listingStatusFilter')?.value || 'all';
    const list   = filter === 'all'
        ? JOB_LISTINGS
        : JOB_LISTINGS.filter(j => j.status === filter);

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No listings found</h3></div>`;
        return;
    }

    container.innerHTML = list.map(job => `
        <div class="listing-item" id="listing-${job.id}">
            <div class="listing-top">
                <h3>${job.title}</h3>
                <span class="badge ${job.status === 'active' ? 'badge-active' : 'badge-closed'}">${job.status === 'active' ? 'Active' : 'Closed'}</span>
            </div>
            <div class="listing-meta">
                <span>📂 ${job.category}</span>
                <span>⏱ ${job.type}</span>
                <span>📍 ${job.location}</span>
                <span>💰 ${job.budget}</span>
                <span>📅 Posted ${formatDate(job.postedDate)}</span>
                <span>👥 ${job.applicants} applicant${job.applicants !== 1 ? 's' : ''}</span>
            </div>
            <div class="listing-actions">
                ${job.status === 'active'
                    ? `<button class="btn btn-primary btn-sm" onclick="switchTab('applicants')">View Applicants</button>
                       <button class="btn btn-ghost btn-sm" onclick="closeJob(${job.id})">Close Job</button>`
                    : `<button class="btn btn-ghost btn-sm" onclick="reopenJob(${job.id})">Reopen</button>`}
                <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);border-color:var(--color-danger);" onclick="deleteJob(${job.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

/* ── Full applicants (Applicants tab) ───────────────────────── */
function renderFullApplicants() {
    const container = document.getElementById('fullApplicantsList');
    if (!container) return;

    // Populate job filter dropdown
    const jobFilter = document.getElementById('applicantJobFilter');
    if (jobFilter && jobFilter.options.length === 1) {
        JOB_LISTINGS.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.id;
            opt.textContent = job.title;
            jobFilter.appendChild(opt);
        });
        jobFilter.addEventListener('change', renderFullApplicants);
    }

    const selectedJob = jobFilter?.value || 'all';
    const list = selectedJob === 'all'
        ? SAMPLE_APPLICANTS
        : SAMPLE_APPLICANTS.filter(a => a.jobId === Number(selectedJob));

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No applicants yet</h3>
                <p>Applicants will appear here when they apply to your job posts.</p>
            </div>`;
        return;
    }

    const jobMap = {};
    JOB_LISTINGS.forEach(j => jobMap[j.id] = j.title);

    container.innerHTML = `
        <div class="application-list">
            ${list.map(applicant => `
                <div class="application-item">
                    <div class="app-company-logo">${getInitials(applicant.name)}</div>
                    <div class="app-info">
                        <h3>${applicant.name}</h3>
                        <p>${applicant.skill} &bull; Applied for: <strong>${jobMap[applicant.jobId] || 'Unknown'}</strong></p>
                    </div>
                    <div class="app-meta">
                        ${stageBadge(applicant.stage)}
                        <time>${formatDate(applicant.appliedDate)}</time>
                        <span style="color:var(--color-warning);font-size:0.78rem;font-weight:700;">★ ${applicant.rating}</span>
                    </div>
                    <div style="display:flex;gap:0.4rem;margin-left:0.5rem;">
                        <button class="btn btn-primary btn-sm">View</button>
                        <button class="btn btn-ghost btn-sm">Message</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

/* ── Talent search (Search tab) ─────────────────────────────── */
function renderTalentSearch(query) {
    const container = document.getElementById('talentSearchResults');
    if (!container) return;

    const q = query.toLowerCase().trim();
    const results = q
        ? SAMPLE_CANDIDATES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.skill.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q)
          )
        : SAMPLE_CANDIDATES;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No candidates found</h3>
                <p>Try different keywords or location.</p>
            </div>`;
        return;
    }

    container.innerHTML = results.map(c => `
        <div class="candidate-item" style="padding:1rem 1.4rem;">
            <div class="candidate-avatar" style="width:46px;height:46px;font-size:0.85rem;">${getInitials(c.name)}</div>
            <div class="candidate-info">
                <h3>${c.name}</h3>
                <p>${c.skill} &bull; ${c.location}</p>
            </div>
            <span class="candidate-rating">★ ${c.rating}</span>
            <div style="display:flex;gap:0.4rem;margin-left:0.5rem;">
                <a href="profile.html" class="btn btn-primary btn-sm">View</a>
                <button class="btn btn-ghost btn-sm">Contact</button>
            </div>
        </div>
    `).join('');
}

/* ── Client profile completeness banner ──────────────────────── */
// Maps missing fields to the right tab + field on client-profile.html
const CLIENT_FIELDS = [
    {
        key:     'avatar',
        label:   'Company logo',
        tab:     'company',
        fieldId: 'avatarFileInput',
        icon:    '🏢',
        reason:  'Builds trust with job seekers.',
        why:     'A company logo makes your job posts look professional and trustworthy. Job seekers are more likely to apply to companies with a recognizable logo.',
        check:   (p) => p?.avatar_url,
    },
    {
        key:     'company_name',
        label:   'Company name',
        tab:     'company',
        fieldId: 'companyNameInput',
        icon:    '📋',
        reason:  'Required before posting jobs.',
        why:     'Your company name appears on every job post. Without it, your listings look incomplete and job seekers may not apply.',
        check:   (p) => p?.company_name,
    },
    {
        key:     'industry',
        label:   'Industry',
        tab:     'company',
        fieldId: 'industryInput',
        icon:    '🏭',
        reason:  'Helps seekers find your company.',
        why:     'Setting your industry helps job seekers filter relevant opportunities and understand what your company does.',
        check:   (p) => p?.industry,
    },
    {
        key:     'barangay',
        label:   'Office barangay',
        tab:     'company',
        fieldId: 'officeBarangayInput',
        icon:    '📍',
        reason:  'Required for residency verification.',
        why:     'KAYA verifies that businesses operate within Minglanilla. Your barangay is needed for admin to approve your account.',
        check:   (p) => p?.barangay,
    },
    {
        key:     'bio',
        label:   'Company description',
        tab:     'company',
        fieldId: 'companyDescInput',
        icon:    '📝',
        reason:  'Job seekers read this before applying.',
        why:     'A compelling company description helps attract better candidates. Listings with a description get significantly more applicants.',
        check:   (p) => p?.bio,
    },
    {
        key:     'phone',
        label:   'Contact phone',
        tab:     'contact',
        fieldId: 'contactPhoneInput',
        icon:    '📞',
        reason:  'How seekers and admins reach you.',
        why:     'A contact number is required for KAYA admins to verify your account, and for job seekers to reach you directly.',
        check:   (_p, user) => user?.phone,
    },
    {
        key:     'id_proof',
        label:   'Business document uploaded',
        tab:     'company',
        fieldId: 'idProofInput',
        icon:    '🪪',
        reason:  'Needed to activate your account.',
        why:     'Your account stays inactive until an admin verifies your business location. Upload your business permit or Mayor\'s Permit to proceed.',
        check:   (p) => p?.id_proof_url || p?.id_proof_filename,
    },
];

function buildClientProfileUrl(tab, fieldId) {
    return `/pages/client-profile.html?goto=${tab}&field=${fieldId}`;
}

function renderClientCompleteness(user) {
    const container = document.getElementById('clientCompletenessCard');
    if (!container) return;

    const p = user.profile || {};
    const missing = CLIENT_FIELDS.filter(f => !f.check(p, user));

    if (missing.length === 0) {
        container.style.display = 'none';
        return;
    }

    const total = CLIENT_FIELDS.length;
    const done  = total - missing.length;
    const pct   = Math.round((done / total) * 100);

    container.style.display = 'block';
    container.innerHTML = `
        <div class="dash-card-header">
            <h2>Complete Your Profile</h2>
            <span style="font-size:0.8rem;color:var(--color-text-muted);">${pct}% complete</span>
        </div>
        <div style="padding:0 1.4rem 0.5rem;">
            <div class="progress-bar-track" style="margin:0.75rem 0;">
                <div class="progress-bar-fill" style="width:${pct}%;"></div>
            </div>
        </div>
        <div style="padding:0 1.4rem 1.25rem;">
            <p style="font-size:0.82rem;color:var(--color-text-secondary);margin-bottom:1rem;">
                Your profile is incomplete. Fill in the missing details to activate your account and start posting jobs.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${missing.map(f => `
                    <a href="${buildClientProfileUrl(f.tab, f.fieldId)}"
                       class="completeness-missing-row"
                       title="${f.why}">
                        <span class="missing-row-icon">${f.icon}</span>
                        <span class="missing-row-label">${f.label}</span>
                        <span class="missing-row-reason">${f.reason}</span>
                        <span class="missing-row-arrow">→</span>
                    </a>`).join('')}
            </div>
        </div>`;
}

/* ── Job actions ─────────────────────────────────────────────── */
function closeJob(id) {
    const job = JOB_LISTINGS.find(j => j.id === id);
    if (job) { job.status = 'closed'; }
    renderActiveListings();
    renderPipelineOverview();
    renderFullListings();
    updateStats();
}

function reopenJob(id) {
    const job = JOB_LISTINGS.find(j => j.id === id);
    if (job) { job.status = 'active'; }
    renderActiveListings();
    renderFullListings();
    updateStats();
}

function deleteJob(id) {
    if (!confirm('Delete this job post? This cannot be undone.')) return;
    JOB_LISTINGS = JOB_LISTINGS.filter(j => j.id !== id);
    renderFullListings();
    renderActiveListings();
    updateStats();
}

window.closeJob  = closeJob;
window.reopenJob = reopenJob;
window.deleteJob = deleteJob;

/* ── Post job modal ──────────────────────────────────────────── */
function initPostJobModal() {
    const modal       = document.getElementById('postJobModal');
    const openBtns    = [document.getElementById('postJobBtn'), document.getElementById('postJobBtn2')];
    const closeBtn    = document.getElementById('closePostJobModal');
    const cancelBtn   = document.getElementById('cancelPostJob');
    const form        = document.getElementById('postJobForm');

    if (!modal) return;

    const open  = () => modal.classList.add('open');
    const close = () => { modal.classList.remove('open'); form?.reset(); };

    openBtns.forEach(btn => btn?.addEventListener('click', open));
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();

        const title    = document.getElementById('jobTitle').value.trim();
        const category = document.getElementById('jobCategory').value;
        const type     = document.getElementById('jobType').value;
        const location = document.getElementById('jobLocation').value.trim() || 'Remote';
        const budget   = document.getElementById('jobBudget').value.trim() || 'Negotiable';
        const desc     = document.getElementById('jobDesc').value.trim();
        const skillsRaw = document.getElementById('jobSkills').value.trim();
        const skills   = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        const newJob = {
            id:          Date.now(),
            title,
            category,
            type,
            location,
            budget,
            description: desc,
            skills,
            status:      'active',
            postedDate:  new Date().toISOString().slice(0, 10),
            applicants:  0,
        };

        JOB_LISTINGS.unshift(newJob);

        close();
        updateStats();
        renderActiveListings();
        renderFullListings();
        renderPipelineOverview();

        // Switch to listings tab to show the new post
        switchTab('listings');
    });
}

/* ── Quick search (Overview sidebar) ────────────────────────── */
function initQuickSearch() {
    const form = document.getElementById('quickSearchForm');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = document.getElementById('quickSkillInput').value.trim();
        switchTab('search');
        const talentInput = document.getElementById('talentSkillInput');
        if (talentInput) { talentInput.value = q; renderTalentSearch(q); }
    });

    const talentForm = document.getElementById('talentSearchForm');
    talentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const skill    = document.getElementById('talentSkillInput').value.trim();
        const location = document.getElementById('talentLocationInput').value.trim();
        renderTalentSearch(skill + ' ' + location);
    });
}

/* ── Tab init ────────────────────────────────────────────────── */
function initTabs() {
    document.querySelectorAll('.dash-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const listingFilter = document.getElementById('listingStatusFilter');
    if (listingFilter) listingFilter.addEventListener('change', renderFullListings);
}

/* ── Main init ──────────────────────────────────────────────── */
async function loadClientDashboard() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        if (user.role !== 'client') {
            window.location.href = 'jobseeker-dashboard.html';
            return;
        }

        const name = user.fullName?.trim() || 'Client';

        setText('navbarUserName', name);
        setText('welcomeName',    name);

        updateStats();
        renderActiveListings();
        renderPipelineOverview();
        renderRecommendedCandidates();
        renderClientCompleteness(user);
        renderSavedJobs(); // not used in client, harmless

        initTabs();
        initPostJobModal();
        initQuickSearch();

    } catch (err) {
        console.error('Client dashboard error:', err);
    }
}

// Placeholder – not used on client side but avoids a JS error
function renderSavedJobs() {}

loadClientDashboard();
