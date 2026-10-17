/**
 * KAYA – Admin Approvals Dashboard
 * Handles:
 *  - Section navigation (dashboard / seekers / clients / id-verif / log)
 *  - Sample queue data (replace with Supabase queries in production)
 *  - ID review modal: view uploaded ID image, approve / reject with reason
 *  - Live badge counts and activity log
 */

/* ── Sample data ─────────────────────────────────────────────── */
// In production, fetch these from Supabase `profiles` table
// filtered by verification_status = 'id_pending' | 'pending' | 'approved' | 'rejected'

let QUEUE = [
    {
        id: 1, role: 'jobseeker', name: 'Ana Reyes',
        email: 'ana.reyes@example.com', phone: '09171234567',
        barangay: 'Poblacion Ward I', skill: 'Web Developer',
        submittedDate: '2026-10-14', verificationStatus: 'id_pending',
        idUrl: null, idFilename: 'ana_reyes_philsys.jpg',
        avatarUrl: null,
    },
    {
        id: 2, role: 'jobseeker', name: 'Ben Morales',
        email: 'ben.morales@example.com', phone: '09281234567',
        barangay: 'Tungkop', skill: 'Graphic Designer',
        submittedDate: '2026-10-13', verificationStatus: 'id_pending',
        idUrl: null, idFilename: 'ben_morales_voters_id.jpg',
        avatarUrl: null,
    },
    {
        id: 3, role: 'jobseeker', name: 'Liza Santos',
        email: 'liza.santos@example.com', phone: '09391234567',
        barangay: 'Linao', skill: 'Content Writer',
        submittedDate: '2026-10-12', verificationStatus: 'pending',
        idUrl: null, idFilename: null,
        avatarUrl: null,
    },
    {
        id: 4, role: 'client', name: 'TechGrow Inc.',
        email: 'hr@techgrow.com', phone: '09221234567',
        barangay: 'Cuanos', skill: 'Technology',
        submittedDate: '2026-10-14', verificationStatus: 'id_pending',
        idUrl: null, idFilename: 'techgrow_bizpermit.jpg',
        avatarUrl: null,
    },
    {
        id: 5, role: 'client', name: 'Noodle Dojo',
        email: 'owner@noodledojo.com', phone: '09451234567',
        barangay: 'Tunghaan', skill: 'Food & Beverage',
        submittedDate: '2026-10-11', verificationStatus: 'pending',
        idUrl: null, idFilename: null,
        avatarUrl: null,
    },
    {
        id: 6, role: 'jobseeker', name: 'Pedro Lim',
        email: 'pedro.lim@example.com', phone: '09561234567',
        barangay: 'Tubod', skill: 'Carpenter',
        submittedDate: '2026-10-10', verificationStatus: 'approved',
        idUrl: null, idFilename: 'pedro_lim_barangay_cert.jpg',
        avatarUrl: null,
    },
];

// Action log
let ACTION_LOG = [
    { timestamp: '2026-10-14T10:23:00', action: 'approved', name: 'Pedro Lim', role: 'Job Seeker', note: 'ID clearly shows Tubod, Minglanilla address.' },
    { timestamp: '2026-10-14T09:45:00', action: 'approved', name: 'MedCore Solutions', role: 'Client', note: 'Business permit verified.' },
    { timestamp: '2026-10-13T15:10:00', action: 'rejected', name: 'Unknown Account', role: 'Job Seeker', note: 'ID address does not match Minglanilla.' },
];

let currentReviewId = null;
let approvedToday   = 1;
let rejectedToday   = 0;

/* ── Helpers ─────────────────────────────────────────────────── */
function getInitials(name) {
    return (name || '??')
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

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
}

function statusBadge(status) {
    const map = {
        pending:    ['badge-pending',   '⏳ Pending'],
        id_pending: ['badge-id-pending','🪪 ID Uploaded'],
        approved:   ['badge-active',    '✔ Approved'],
        rejected:   ['badge-rejected',  '✘ Rejected'],
    };
    const [cls, label] = map[status] || ['badge-pending', status];
    return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Section navigation ──────────────────────────────────────── */
const SECTIONS = ['dashboard', 'seekers', 'clients', 'idverif', 'listings', 'log'];

function showSection(name) {
    SECTIONS.forEach(s => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.style.display = s === name ? 'block' : 'none';
    });

    // Sidebar active state
    const sidebarMap = {
        dashboard: 'sidebarDashboard',
        seekers:   'sidebarSeekers',
        clients:   'sidebarClients',
        idverif:   'sidebarIdVerif',
        listings:  'sidebarJobListings',
        log:       'sidebarLog',
    };

    Object.values(sidebarMap).forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const activeId = sidebarMap[name];
    if (activeId) document.getElementById(activeId)?.classList.add('active');

    // Render the relevant list
    if (name === 'seekers')  renderSeekerList();
    if (name === 'clients')  renderClientList();
    if (name === 'idverif')  renderIdVerifList();
    if (name === 'log')      renderFullLog();
}

window.showSection = showSection;

/* ── Counts & stats ─────────────────────────────────────────── */
function updateStats() {
    const pendingSeekers = QUEUE.filter(u => u.role === 'jobseeker' && u.verificationStatus !== 'approved' && u.verificationStatus !== 'rejected').length;
    const pendingClients = QUEUE.filter(u => u.role === 'client'    && u.verificationStatus !== 'approved' && u.verificationStatus !== 'rejected').length;
    const idPending      = QUEUE.filter(u => u.verificationStatus === 'id_pending').length;

    setText('statPendingSeekers', pendingSeekers);
    setText('statPendingClients', pendingClients);
    setText('statApprovedToday',  approvedToday);
    setText('statRejectedToday',  rejectedToday);

    // Sidebar counts
    ['seekerCount', 'clientCount', 'idVerifCount'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = id === 'seekerCount' ? pendingSeekers
                  : id === 'clientCount' ? pendingClients
                  : idPending;
        el.textContent = val;
        el.classList.toggle('visible', val > 0);
    });

    // Badges
    setText('seekerBadge',  `${pendingSeekers} Pending`);
    setText('clientBadge',  `${pendingClients} Pending`);
    setText('idVerifBadge', `${idPending} Pending`);
}

/* ── Approval card HTML factory ─────────────────────────────── */
function buildApprovalCard(user) {
    const hasId  = !!user.idFilename;
    const idBadge = hasId
        ? `<span class="badge badge-id-pending">🪪 ID Uploaded</span>`
        : `<span class="badge badge-no-id">No ID yet</span>`;

    return `
        <div class="approval-card" id="card-${user.id}">
            <div class="approval-card-info">
                <div class="approval-avatar">${getInitials(user.name)}</div>
                <div class="approval-card-meta">
                    <h3>${user.name}</h3>
                    <p>
                        ${user.skill || user.role}
                        &bull; Submitted ${formatDate(user.submittedDate)}
                    </p>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.35rem;align-items:center;">
                        <span class="approval-barangay">📍 ${user.barangay}</span>
                        ${idBadge}
                        ${statusBadge(user.verificationStatus)}
                    </div>
                </div>
            </div>
            <div class="approval-card-actions">
                <button class="btn btn-secondary btn-icon"
                    style="width:auto;padding:0 0.9rem;"
                    onclick="openReviewModal(${user.id})">
                    🪪 Review ID
                </button>
                <button class="btn btn-icon btn-approve"
                    style="width:auto;padding:0 0.9rem;"
                    onclick="quickApprove(${user.id})">
                    ✔ Approve
                </button>
                <button class="btn btn-icon btn-reject"
                    style="width:auto;padding:0 0.9rem;"
                    onclick="quickReject(${user.id})">
                    ✘ Reject
                </button>
            </div>
        </div>`;
}

/* ── Render lists ────────────────────────────────────────────── */
function renderSeekerList() {
    const container = document.getElementById('seekerApprovalList');
    if (!container) return;

    const search   = document.getElementById('seekerSearch')?.value.toLowerCase() || '';
    const barangay = document.getElementById('seekerBarangayFilter')?.value || '';
    const status   = document.getElementById('seekerStatusFilter')?.value || 'pending';

    let list = QUEUE.filter(u => u.role === 'jobseeker');
    if (status !== 'all') list = list.filter(u => u.verificationStatus === status || (status === 'pending' && u.verificationStatus === 'id_pending'));
    if (barangay) list = list.filter(u => u.barangay === barangay);
    if (search)   list = list.filter(u => u.name.toLowerCase().includes(search) || u.barangay.toLowerCase().includes(search));

    container.innerHTML = list.length
        ? list.map(buildApprovalCard).join('')
        : `<div class="empty-admin-state"><span>👷</span><p>No job seekers match the current filter.</p></div>`;
}

function renderClientList() {
    const container = document.getElementById('clientApprovalList');
    if (!container) return;

    const search   = document.getElementById('clientSearch')?.value.toLowerCase() || '';
    const barangay = document.getElementById('clientBarangayFilter')?.value || '';
    const status   = document.getElementById('clientStatusFilter')?.value || 'pending';

    let list = QUEUE.filter(u => u.role === 'client');
    if (status !== 'all') list = list.filter(u => u.verificationStatus === status || (status === 'pending' && u.verificationStatus === 'id_pending'));
    if (barangay) list = list.filter(u => u.barangay === barangay);
    if (search)   list = list.filter(u => u.name.toLowerCase().includes(search) || u.barangay.toLowerCase().includes(search));

    container.innerHTML = list.length
        ? list.map(buildApprovalCard).join('')
        : `<div class="empty-admin-state"><span>🏢</span><p>No clients match the current filter.</p></div>`;
}

function renderIdVerifList() {
    const container = document.getElementById('idVerifList');
    if (!container) return;

    const search    = document.getElementById('idVerifSearch')?.value.toLowerCase() || '';
    const roleF     = document.getElementById('idVerifTypeFilter')?.value || 'all';
    const statusF   = document.getElementById('idVerifStatusFilter')?.value || 'id_pending';

    let list = QUEUE.filter(u => u.idFilename); // only those with uploaded ID
    if (statusF !== 'all') list = list.filter(u => u.verificationStatus === statusF);
    if (roleF   !== 'all') list = list.filter(u => u.role === roleF);
    if (search)            list = list.filter(u => u.name.toLowerCase().includes(search) || u.barangay.toLowerCase().includes(search));

    container.innerHTML = list.length
        ? list.map(buildApprovalCard).join('')
        : `<div class="empty-admin-state"><span>🪪</span><p>No IDs pending verification.</p></div>`;
}

function renderQuickIdQueue() {
    const container = document.getElementById('quickIdQueue');
    if (!container) return;

    const pending = QUEUE.filter(u => u.verificationStatus === 'id_pending').slice(0, 5);

    container.innerHTML = pending.length
        ? pending.map(buildApprovalCard).join('')
        : `<div class="empty-admin-state"><span>✅</span><p>No IDs pending — all clear!</p></div>`;
}

/* ── Activity Log ────────────────────────────────────────────── */
function renderRecentLog() {
    const container = document.getElementById('recentLogList');
    if (!container) return;
    renderLogInto(container, ACTION_LOG.slice(0, 5));
}

function renderFullLog() {
    const container = document.getElementById('fullLogList');
    if (!container) return;
    renderLogInto(container, ACTION_LOG);
}

function renderLogInto(container, log) {
    if (!log.length) {
        container.innerHTML = `<div class="empty-admin-state"><span>📋</span><p>No actions logged yet.</p></div>`;
        return;
    }
    container.innerHTML = log.map(entry => `
        <div class="activity-item">
            <div class="activity-dot ${entry.action === 'approved' ? 'dot-success' : 'dot-danger'}"></div>
            <span class="activity-text">
                <strong>${entry.action === 'approved' ? 'Approved' : 'Rejected'}</strong>
                — ${entry.name} (${entry.role})
                ${entry.note ? `<br><span style="font-size:0.75rem;color:var(--color-text-muted);">${entry.note}</span>` : ''}
            </span>
            <span class="activity-time">${formatDateTime(entry.timestamp)}</span>
        </div>
    `).join('');
}

/* ── Review Modal ────────────────────────────────────────────── */
function openReviewModal(userId) {
    const user = QUEUE.find(u => u.id === userId);
    if (!user) return;

    currentReviewId = userId;

    // Populate modal
    document.getElementById('reviewModalTitle').textContent =
        `Review: ${user.name}`;

    const avatarEl = document.getElementById('reviewAvatarEl');
    if (user.avatarUrl) {
        avatarEl.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name}">`;
    } else {
        avatarEl.textContent = getInitials(user.name);
        avatarEl.style.fontSize = '1rem';
    }

    setText('reviewName',          user.name);
    setText('reviewRole',          user.role === 'jobseeker' ? `Job Seeker · ${user.skill}` : `Client · ${user.skill}`);
    setText('reviewEmail',         user.email);
    setText('reviewPhone',         user.phone);
    setText('reviewBarangay',      user.barangay);
    setText('reviewSubmitted',     formatDate(user.submittedDate));
    setText('reviewCurrentStatus', user.verificationStatus.replace('_', ' ').toUpperCase());

    // ID image
    const container  = document.getElementById('reviewIdContainer');
    const downloadEl = document.getElementById('reviewIdDownload');
    const filenameEl = document.getElementById('reviewIdFilename');

    if (user.idUrl) {
        container.innerHTML = `<img class="review-id-image" src="${user.idUrl}" alt="Submitted ID">`;
        downloadEl.href     = user.idUrl;
        downloadEl.style.display = 'flex';
    } else if (user.idFilename) {
        // File name on record but no public URL yet (mock state)
        container.innerHTML = `
            <div class="review-id-placeholder">
                <span style="font-size:2rem;">🪪</span>
                <span>ID on record — stored in secure storage</span>
                <span style="font-size:0.72rem;margin-top:0.25rem;">${user.idFilename}</span>
            </div>`;
        downloadEl.style.display = 'none';
    } else {
        container.innerHTML = `
            <div class="review-id-placeholder">
                <span style="font-size:2rem;">⚠️</span>
                <span>No ID uploaded yet by this user</span>
            </div>`;
        downloadEl.style.display = 'none';
    }

    if (filenameEl) filenameEl.textContent = user.idFilename || '';

    // Pre-fill reason if previously reviewed
    document.getElementById('reviewReasonInput').value = '';

    // Disable buttons if already resolved
    const isDone = user.verificationStatus === 'approved' || user.verificationStatus === 'rejected';
    document.getElementById('approveBtn').disabled = isDone;
    document.getElementById('rejectBtn').disabled  = isDone;

    document.getElementById('reviewModal').classList.add('open');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('open');
    currentReviewId = null;
}

window.openReviewModal  = openReviewModal;
window.closeReviewModal = closeReviewModal;

// Close on backdrop click
document.getElementById('reviewModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('reviewModal')) closeReviewModal();
});

/* ── Verdict submission ──────────────────────────────────────── */
function submitVerdict(verdict) {
    if (currentReviewId === null) return;

    const reason = document.getElementById('reviewReasonInput').value.trim();

    if (verdict === 'rejected' && !reason) {
        document.getElementById('reviewReasonInput').focus();
        document.getElementById('reviewReasonInput').style.borderColor = 'var(--color-danger)';
        document.getElementById('reviewReasonInput').placeholder = '⚠️ A reason is required when rejecting.';
        return;
    }

    const user = QUEUE.find(u => u.id === currentReviewId);
    if (!user) return;

    // Update status in data
    user.verificationStatus = verdict;

    // Log the action
    ACTION_LOG.unshift({
        timestamp: new Date().toISOString(),
        action:    verdict,
        name:      user.name,
        role:      user.role === 'jobseeker' ? 'Job Seeker' : 'Client',
        note:      reason,
    });

    if (verdict === 'approved') approvedToday++;
    else                        rejectedToday++;

    closeReviewModal();
    updateStats();
    renderQuickIdQueue();
    renderRecentLog();

    // Re-render whichever section is visible
    renderSeekerList();
    renderClientList();
    renderIdVerifList();

    alert(`${user.name} has been ${verdict}.${reason ? '\n\nNote: ' + reason : ''}`);
}

window.submitVerdict = submitVerdict;

/* ── Quick approve / reject (without opening modal) ─────────── */
function quickApprove(userId) {
    currentReviewId = userId;
    document.getElementById('reviewReasonInput').value = 'Approved via quick action.';
    submitVerdict('approved');
}

function quickReject(userId) {
    // Force full modal for rejections so a reason is always recorded
    openReviewModal(userId);
    setTimeout(() => {
        document.getElementById('reviewReasonInput').focus();
        document.getElementById('reviewReasonInput').placeholder = 'Required: reason for rejection…';
    }, 100);
}

window.quickApprove = quickApprove;
window.quickReject  = quickReject;

/* ── Export log ──────────────────────────────────────────────── */
function exportLog() {
    const rows = [
        ['Timestamp', 'Action', 'Name', 'Role', 'Note'],
        ...ACTION_LOG.map(e => [e.timestamp, e.action, e.name, e.role, e.note || '']),
    ];
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `kaya_approval_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

window.exportLog = exportLog;

/* ── Wire search/filter inputs ───────────────────────────────── */
function initFilters() {
    [
        ['seekerSearch', renderSeekerList],
        ['seekerBarangayFilter', renderSeekerList],
        ['seekerStatusFilter', renderSeekerList],
        ['clientSearch', renderClientList],
        ['clientBarangayFilter', renderClientList],
        ['clientStatusFilter', renderClientList],
        ['idVerifSearch', renderIdVerifList],
        ['idVerifTypeFilter', renderIdVerifList],
        ['idVerifStatusFilter', renderIdVerifList],
    ].forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('input',  fn);
        document.getElementById(id)?.addEventListener('change', fn);
    });
}

/* ── Boot ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    renderQuickIdQueue();
    renderRecentLog();
    initFilters();
});
