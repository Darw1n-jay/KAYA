/**
 * KAYA – Job Seeker Profile
 * Handles: avatar upload, personal info, professional info,
 *          skills tags, portfolio links, experience, education
 */

import { supabase, getCurrentUser } from './supabase.js';

const DASHBOARD_URL = '/pages/jobseeker-dashboard.html';
const LOGIN_URL     = '/pages/login.html';

/* ── Helpers ─────────────────────────────────────────────────── */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '';
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function showMessage(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent  = text;
    el.dataset.type = type;
    el.classList.add('visible');
}

function hideMessage(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
}

function getInitials(name) {
    return (name || 'JS')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Tab switching ────────────────────────────────────────────── */
function initProfileTabs() {
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.ptab;
            document.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.profile-tab-panel').forEach(p => {
                p.classList.toggle('active', p.id === `ptab-${tab}`);
            });
        });
    });
}

/* ── Field guidance: URL param handling ──────────────────────── */
// Triggered when user clicks a missing-field link from the dashboard.
// URL format: profile.html?goto=<tabName>&field=<fieldId>
//
// Per-field "why it matters" messages shown in the banner:
const FIELD_GUIDANCE = {
    fullNameInput:      { title: 'Add your full name',           icon: '👤', why: 'Your full name appears on every application and your public profile. Clients need this to identify you.' },
    avatarFileInput:    { title: 'Upload a profile photo',       icon: '📸', why: 'Profiles with a photo get 3× more views from clients. A clear, professional photo builds trust.' },
    phoneInput:         { title: 'Add your phone number',        icon: '📞', why: 'Many clients prefer to call or message before hiring. A phone number keeps you reachable.' },
    barangayInput:      { title: 'Select your barangay',         icon: '📍', why: 'KAYA is exclusive to Minglanilla residents. Your barangay is required to verify your residency.' },
    primarySkillInput:  { title: 'Add your primary skill',       icon: '🔧', why: 'Your primary skill is the first thing shown in search results. Without it you won\'t appear in searches.' },
    bioInput:           { title: 'Write a professional summary', icon: '📝', why: 'Your bio is the first thing clients read. A clear summary significantly increases your chances of getting hired.' },
    idProofInput:       { title: 'Upload your residency ID',     icon: '🪪', why: 'Your account stays pending until an admin verifies your Minglanilla residency. This is required to go active.' },
    dobInput:           { title: 'Add your date of birth',       icon: '📅', why: 'Your date of birth is required to confirm you meet the 18+ age requirement for using KAYA.' },
    genderInput:        { title: 'Set your gender',              icon: '🪪', why: 'Gender is used to complete your profile and helps clients understand who they are hiring.' },
};

function switchToTab(tabId) {
    document.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b.dataset.ptab === tabId));
    document.querySelectorAll('.profile-tab-panel').forEach(p => p.classList.toggle('active', p.id === `ptab-${tabId}`));
}

function showGuidanceBanner(fieldId, formCardEl) {
    const guidance = FIELD_GUIDANCE[fieldId];
    if (!guidance || !formCardEl) return;

    // Remove any existing banner
    formCardEl.querySelectorAll('.field-guidance-banner').forEach(b => b.remove());

    const banner = document.createElement('div');
    banner.className = 'field-guidance-banner visible';
    banner.innerHTML = `
        <span class="banner-icon">${guidance.icon}</span>
        <div class="banner-body">
            <strong>${guidance.title}</strong>
            <p>${guidance.why}</p>
        </div>
        <button class="banner-dismiss" title="Dismiss" aria-label="Dismiss">✕</button>`;

    banner.querySelector('.banner-dismiss').addEventListener('click', () => {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 300);
    });

    // Insert at top of the card, after the section title
    const title = formCardEl.querySelector('.profile-section-title');
    if (title) title.insertAdjacentElement('afterend', banner);
    else formCardEl.prepend(banner);
}

function highlightField(fieldEl) {
    if (!fieldEl) return;
    // Remove class first in case it was already highlighted (re-trigger animation)
    fieldEl.classList.remove('field-highlight', 'field-missing');
    void fieldEl.offsetWidth; // force reflow

    fieldEl.classList.add('field-highlight', 'field-missing');
    fieldEl.focus();
    fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight class after animation ends but keep missing border until user fills it
    fieldEl.addEventListener('input', () => {
        if (fieldEl.value.trim()) {
            fieldEl.classList.remove('field-highlight', 'field-missing');
        }
    }, { once: true });

    // Remove the shake after 2s regardless
    setTimeout(() => fieldEl.classList.remove('field-highlight'), 2000);
}

function handleUrlGuidance() {
    const params  = new URLSearchParams(window.location.search);
    const gotoTab = params.get('goto');
    const fieldId = params.get('field');

    if (!gotoTab && !fieldId) return;

    // Switch to the right tab
    if (gotoTab) {
        switchToTab(gotoTab);
    }

    if (!fieldId) return;

    // Short delay to let the tab render
    setTimeout(() => {
        const fieldEl = document.getElementById(fieldId);
        if (!fieldEl) return;

        // Find the closest profile-form-card ancestor
        const card = fieldEl.closest('.profile-form-card');

        // Show banner with explanation
        showGuidanceBanner(fieldId, card);

        // Highlight + focus the field
        highlightField(fieldEl);

        // For file inputs, highlight the upload area wrapper instead
        if (fieldEl.type === 'file') {
            const area = document.getElementById('idUploadArea') || document.getElementById('avatarWrapper');
            if (area) {
                area.style.borderColor   = 'var(--color-gold)';
                area.style.background    = 'rgba(212,167,44,0.04)';
                area.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 120);
}

/* ── Avatar upload ────────────────────────────────────────────── */
function initAvatarUpload(userId) {
    const input   = document.getElementById('avatarFileInput');
    const preview = document.querySelector('.avatar-preview');

    if (!input || !preview) return;

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;

        // 5 MB limit
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5 MB.');
            return;
        }

        // Optimistic local preview
        const reader = new FileReader();
        reader.onload = e => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Profile photo">`;
        };
        reader.readAsDataURL(file);

        document.getElementById('profileSaveStatus').textContent = 'Uploading photo…';

        try {
            const ext      = file.name.split('.').pop();
            const filePath = `avatars/${userId}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            document.getElementById('profileSaveStatus').textContent = 'Photo updated ✓';
            setTimeout(() => setText('profileSaveStatus', ''), 3000);

        } catch (err) {
            console.error('Avatar upload failed:', err);
            document.getElementById('profileSaveStatus').textContent = 'Upload failed. Try again.';
        }
    });
}

/* ── ID Proof upload ──────────────────────────────────────────── */
function initIdProofUpload(userId, currentStatus) {
    const input       = document.getElementById('idProofInput');
    const area        = document.getElementById('idUploadArea');
    const placeholder = document.getElementById('idUploadPlaceholder');
    const preview     = document.getElementById('idUploadPreview');
    const previewImg  = document.getElementById('idPreviewImg');
    const fileInfo    = document.getElementById('idFileInfo');
    const removeBtn   = document.getElementById('removeIdBtn');
    const statusEl    = document.getElementById('idVerificationStatus');

    if (!input) return;

    // Show existing verification status
    if (statusEl && currentStatus) {
        statusEl.style.display = 'block';
        const statusMap = {
            id_pending: { cls: 'vs-pending',  icon: '⏳', msg: 'Your ID is uploaded and waiting for admin review. You will be notified once verified.' },
            approved:   { cls: 'vs-approved', icon: '✅', msg: 'Your residency has been verified! Your account is fully active.' },
            rejected:   { cls: 'vs-rejected', icon: '❌', msg: 'Your ID verification was rejected. Please upload a clearer or correct document.' },
        };
        const s = statusMap[currentStatus];
        if (s) {
            statusEl.innerHTML = `
                <div class="verification-status ${s.cls}">
                    <span class="vs-icon">${s.icon}</span>
                    <span>${s.msg}</span>
                </div>`;
        }
    }

    // Drag-and-drop
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleIdFile(file);
    });

    // Click to browse
    placeholder?.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') input.click();
    });

    input.addEventListener('change', () => {
        if (input.files[0]) handleIdFile(input.files[0]);
    });

    removeBtn?.addEventListener('click', () => {
        input.value = '';
        placeholder.style.display = 'flex';
        preview.style.display     = 'none';
        if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
    });

    async function handleIdFile(file) {
        // 10 MB limit
        if (file.size > 10 * 1024 * 1024) {
            alert('File must be smaller than 10 MB.');
            return;
        }

        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.type)) {
            alert('Only JPG, PNG, WebP, or PDF files are accepted.');
            return;
        }

        // Show preview
        placeholder.style.display = 'none';
        preview.style.display     = 'flex';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = ev => {
                previewImg.src          = ev.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.style.display = 'none';
        }

        if (fileInfo) {
            fileInfo.innerHTML = `
                <strong>${file.name}</strong>
                ${(file.size / 1024).toFixed(0)} KB · ${file.type.split('/')[1].toUpperCase()}`;
        }

        // Upload to Supabase storage
        const statusText = document.getElementById('profileSaveStatus');
        if (statusText) statusText.textContent = 'Uploading ID…';

        try {
            const ext      = file.name.split('.').pop();
            const filePath = `id_proofs/${userId}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('id-proofs')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('id-proofs').getPublicUrl(filePath);

            // Mark profile as id_pending
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    id_proof_url:        data.publicUrl,
                    id_proof_filename:   file.name,
                    verification_status: 'id_pending',
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            if (statusText) statusText.textContent = 'ID uploaded — pending admin review ✓';
            setTimeout(() => { if (statusText) statusText.textContent = ''; }, 4000);

            // Update status display
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerHTML = `
                    <div class="verification-status vs-pending">
                        <span class="vs-icon">⏳</span>
                        <span>Your ID has been uploaded and is waiting for admin review.</span>
                    </div>`;
            }

        } catch (err) {
            console.error('ID upload failed:', err);
            if (statusText) statusText.textContent = 'ID upload failed. Try again.';
        }
    }
}

/* ── Skills tags input ────────────────────────────────────────── */
let skillTags = [];

function renderSkillTags() {
    const wrapper = document.getElementById('skillsTagWrapper');
    const input   = document.getElementById('skillsTagInput');
    const hidden  = document.getElementById('skillsHidden');
    if (!wrapper || !input) return;

    // Remove existing tags (keep the input)
    wrapper.querySelectorAll('.skill-tag').forEach(t => t.remove());

    skillTags.forEach((tag, idx) => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.innerHTML = `${tag}<button type="button" aria-label="Remove ${tag}" data-idx="${idx}">✕</button>`;
        wrapper.insertBefore(span, input);
    });

    if (hidden) hidden.value = skillTags.join(',');

    wrapper.querySelectorAll('.skill-tag button').forEach(btn => {
        btn.addEventListener('click', () => {
            skillTags.splice(Number(btn.dataset.idx), 1);
            renderSkillTags();
        });
    });
}

function initSkillTags(initialSkills = []) {
    skillTags = [...initialSkills];
    renderSkillTags();

    const input = document.getElementById('skillsTagInput');
    if (!input) return;

    input.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
            e.preventDefault();
            const tag = input.value.trim().replace(/,$/, '');
            if (tag && !skillTags.includes(tag)) {
                skillTags.push(tag);
                renderSkillTags();
            }
            input.value = '';
        }
        if (e.key === 'Backspace' && !input.value && skillTags.length) {
            skillTags.pop();
            renderSkillTags();
        }
    });
}

/* ── Portfolio links ──────────────────────────────────────────── */
let portfolioLinks = [];

function renderPortfolioLinks() {
    const container = document.getElementById('portfolioLinks');
    if (!container) return;
    container.innerHTML = '';

    portfolioLinks.forEach((url, idx) => {
        const row = document.createElement('div');
        row.className = 'link-row';
        row.innerHTML = `
            <input type="url" class="form-input" placeholder="https://…" value="${url}" data-link-idx="${idx}">
            <button type="button" class="btn-remove-link" data-remove-idx="${idx}" title="Remove">✕</button>`;
        container.appendChild(row);
    });

    // Sync edits back to array
    container.querySelectorAll('input[data-link-idx]').forEach(inp => {
        inp.addEventListener('input', () => {
            portfolioLinks[Number(inp.dataset.linkIdx)] = inp.value.trim();
        });
    });

    container.querySelectorAll('.btn-remove-link').forEach(btn => {
        btn.addEventListener('click', () => {
            portfolioLinks.splice(Number(btn.dataset.removeIdx), 1);
            renderPortfolioLinks();
        });
    });
}

function initPortfolioLinks(initial = []) {
    portfolioLinks = [...initial];
    if (portfolioLinks.length === 0) portfolioLinks.push('');
    renderPortfolioLinks();

    document.getElementById('addLinkBtn')?.addEventListener('click', () => {
        portfolioLinks.push('');
        renderPortfolioLinks();
    });
}

/* ── Work Experience ──────────────────────────────────────────── */
let experiences = [];

function renderExperiences() {
    const list = document.getElementById('expList');
    if (!list) return;

    if (experiences.length === 0) {
        list.innerHTML = `<p class="text-muted" style="font-size:0.85rem;padding:0.5rem 0;">No work experience added yet.</p>`;
        return;
    }

    list.innerHTML = experiences.map((exp, idx) => `
        <div class="exp-card">
            <div class="exp-card-body">
                <h4>${exp.title}</h4>
                <p>${exp.company}</p>
                <p class="exp-period">${exp.from} – ${exp.to || 'Present'}</p>
                ${exp.desc ? `<p style="font-size:0.78rem;color:var(--color-text-muted);margin-top:0.3rem;">${exp.desc}</p>` : ''}
            </div>
            <button class="btn-remove-exp" data-exp-idx="${idx}" title="Remove">✕</button>
        </div>
    `).join('');

    list.querySelectorAll('.btn-remove-exp').forEach(btn => {
        btn.addEventListener('click', () => {
            experiences.splice(Number(btn.dataset.expIdx), 1);
            renderExperiences();
        });
    });
}

function initExperience() {
    const addBtn    = document.getElementById('addExpBtn');
    const form      = document.getElementById('addExpForm');
    const saveBtn   = document.getElementById('saveExpBtn');
    const cancelBtn = document.getElementById('cancelExpBtn');

    addBtn?.addEventListener('click', () => { form.style.display = 'block'; addBtn.style.display = 'none'; });
    cancelBtn?.addEventListener('click', () => { form.style.display = 'none'; addBtn.style.display = ''; clearExpForm(); });

    saveBtn?.addEventListener('click', () => {
        const title   = document.getElementById('expTitle')?.value.trim();
        const company = document.getElementById('expCompany')?.value.trim();
        const from    = document.getElementById('expFrom')?.value;
        const to      = document.getElementById('expTo')?.value;
        const desc    = document.getElementById('expDesc')?.value.trim();

        if (!title || !company || !from) { alert('Please fill in job title, company, and start date.'); return; }

        experiences.push({ title, company, from, to, desc });
        renderExperiences();
        form.style.display = 'none';
        addBtn.style.display = '';
        clearExpForm();
    });
}

function clearExpForm() {
    ['expTitle','expCompany','expFrom','expTo','expDesc'].forEach(id => setValue(id, ''));
}

/* ── Education ────────────────────────────────────────────────── */
let educations = [];

function renderEducations() {
    const list = document.getElementById('eduList');
    if (!list) return;

    if (educations.length === 0) {
        list.innerHTML = `<p class="text-muted" style="font-size:0.85rem;padding:0.5rem 0;">No education added yet.</p>`;
        return;
    }

    list.innerHTML = educations.map((edu, idx) => `
        <div class="exp-card">
            <div class="exp-card-body">
                <h4>${edu.degree}</h4>
                <p>${edu.school}</p>
                <p class="exp-period">${edu.from || '—'} – ${edu.to || 'Present'}</p>
            </div>
            <button class="btn-remove-exp" data-edu-idx="${idx}" title="Remove">✕</button>
        </div>
    `).join('');

    list.querySelectorAll('.btn-remove-exp').forEach(btn => {
        btn.addEventListener('click', () => {
            educations.splice(Number(btn.dataset.eduIdx), 1);
            renderEducations();
        });
    });
}

function initEducation() {
    const addBtn    = document.getElementById('addEduBtn');
    const form      = document.getElementById('addEduForm');
    const saveBtn   = document.getElementById('saveEduBtn');
    const cancelBtn = document.getElementById('cancelEduBtn');

    addBtn?.addEventListener('click', () => { form.style.display = 'block'; addBtn.style.display = 'none'; });
    cancelBtn?.addEventListener('click', () => { form.style.display = 'none'; addBtn.style.display = ''; clearEduForm(); });

    saveBtn?.addEventListener('click', () => {
        const degree = document.getElementById('eduDegree')?.value.trim();
        const school = document.getElementById('eduSchool')?.value.trim();
        const from   = document.getElementById('eduFrom')?.value;
        const to     = document.getElementById('eduTo')?.value;

        if (!degree || !school) { alert('Please fill in degree and school.'); return; }

        educations.push({ degree, school, from, to });
        renderEducations();
        form.style.display = 'none';
        addBtn.style.display = '';
        clearEduForm();
    });
}

function clearEduForm() {
    ['eduDegree','eduSchool','eduFrom','eduTo'].forEach(id => setValue(id, ''));
}

/* ── Bio char counter ─────────────────────────────────────────── */
function initBioCounter() {
    const bio = document.getElementById('bioInput');
    const ctr = document.getElementById('bioCharCount');
    if (!bio || !ctr) return;
    const update = () => ctr.textContent = bio.value.length;
    bio.addEventListener('input', update);
    update();
}

/* ── Personal Info form save ──────────────────────────────────── */
function initPersonalForm(userId) {
    const form    = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveProfileButton');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage('profileMessage');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        try {
            const barangay = document.getElementById('barangayInput')?.value;
            if (!barangay) {
                showMessage('profileMessage', 'Please select your barangay.', 'error');
                saveBtn.disabled    = false;
                saveBtn.textContent = 'Save Personal Info';
                return;
            }

            const payload = {
                id:            userId,
                full_name:     document.getElementById('fullNameInput')?.value.trim(),
                nickname:      document.getElementById('nicknameInput')?.value.trim(),
                date_of_birth: document.getElementById('dobInput')?.value || null,
                gender:        document.getElementById('genderInput')?.value,
                civil_status:  document.getElementById('civilStatusInput')?.value,
                nationality:   document.getElementById('nationalityInput')?.value.trim(),
                phone:         document.getElementById('phoneInput')?.value.trim(),
                alt_phone:     document.getElementById('altPhoneInput')?.value.trim(),
                location:      'Minglanilla, Cebu',
                barangay:      barangay,
                address:       document.getElementById('addressInput')?.value.trim(),
                profile_completed: true,
            };

            const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
            if (error) throw error;

            showMessage('profileMessage', 'Personal info saved successfully! ✓', 'success');
            setTimeout(() => hideMessage('profileMessage'), 3000);

        } catch (err) {
            console.error('Save personal info failed:', err);
            showMessage('profileMessage', 'Failed to save: ' + (err.message || 'Please try again.'), 'error');
        } finally {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Save Personal Info';
        }
    });
}

/* ── Professional Info form save ──────────────────────────────── */
function initProfessionalForm(userId) {
    const form    = document.getElementById('professionalForm');
    const saveBtn = document.getElementById('saveProfessionalButton');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage('professionalMessage');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        try {
            // Collect current link values
            const links = portfolioLinks.filter(l => l.trim());

            const payload = {
                id:                userId,
                bio:               document.getElementById('bioInput')?.value.trim(),
                primary_skill:     document.getElementById('primarySkillInput')?.value.trim(),
                skills:            skillTags.join(','),
                experience_level:  document.getElementById('experienceLevelInput')?.value,
                hourly_rate:       document.getElementById('hourlyRateInput')?.value.trim(),
                availability:      document.getElementById('availabilityInput')?.value,
                portfolio_links:   JSON.stringify(links),
            };

            const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
            if (error) throw error;

            showMessage('professionalMessage', 'Professional info saved successfully! ✓', 'success');
            setTimeout(() => hideMessage('professionalMessage'), 3000);

        } catch (err) {
            console.error('Save professional info failed:', err);
            showMessage('professionalMessage', 'Failed to save: ' + (err.message || 'Please try again.'), 'error');
        } finally {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Save Professional Info';
        }
    });
}

/* ── Profile strength helper ──────────────────────────────────── */
function calcStrength(user) {
    const checks = [
        user.fullName,
        user.phone,
        user.location,
        user.primarySkill,
        user.bio,
        user.profile?.avatar_url,
        user.profile?.date_of_birth,
        user.profile?.gender,
        skillTags.length > 0,
        experiences.length > 0,
    ];
    const done = checks.filter(Boolean).length;
    const pct  = Math.round((done / checks.length) * 100);
    return `${pct}%`;
}

/* ── Main init ────────────────────────────────────────────────── */
async function initProfile() {
    try {
        const user = await getCurrentUser();
        if (!user) { window.location.replace(LOGIN_URL); return; }
        if (user.role !== 'jobseeker') { window.location.replace('/pages/client-profile.html'); return; }

        const name = user.fullName?.trim() || '';
        const p    = user.profile || {};

        /* Banner */
        setText('navbarUserName', name || 'Job Seeker');
        setText('profileName',    name || 'Your Name');
        setText('profileEmail',   user.email || '');
        setText('profileInitials', getInitials(name));
        setText('sidebarMemberSince', formatDate(user.created_at));

        /* Restore avatar if already uploaded */
        if (p.avatar_url) {
            const preview = document.querySelector('.avatar-preview');
            if (preview) preview.innerHTML = `<img src="${p.avatar_url}" alt="Profile photo">`;
        }

        /* Personal Info fields */
        setValue('fullNameInput',    name);
        setValue('nicknameInput',    p.nickname   || '');
        setValue('dobInput',         p.date_of_birth || '');
        setValue('genderInput',      p.gender     || '');
        setValue('civilStatusInput', p.civil_status || '');
        setValue('nationalityInput', p.nationality || '');
        setValue('phoneInput',       user.phone   || '');
        setValue('altPhoneInput',    p.alt_phone  || '');
        setValue('barangayInput',    p.barangay   || '');
        setValue('addressInput',     p.address    || '');

        /* Professional Info fields */
        setValue('primarySkillInput',    user.primarySkill || '');
        setValue('bioInput',             user.bio          || '');
        setValue('experienceLevelInput', p.experience_level || '');
        setValue('hourlyRateInput',      p.hourly_rate     || '');
        setValue('availabilityInput',    p.availability    || '');

        /* Skills tags */
        const savedSkills = p.skills ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
        initSkillTags(savedSkills);

        /* Portfolio links */
        const savedLinks = p.portfolio_links ? JSON.parse(p.portfolio_links) : [];
        initPortfolioLinks(savedLinks);

        /* Experience & Education */
        experiences = p.work_experience ? JSON.parse(p.work_experience) : [];
        educations  = p.education       ? JSON.parse(p.education)       : [];
        renderExperiences();
        renderEducations();

        /* Sidebar strength */
        setText('sidebarStrength', calcStrength(user));

        /* Init all interactive pieces */
        initProfileTabs();
        initAvatarUpload(user.id);
        initIdProofUpload(user.id, p.verification_status || null);
        initBioCounter();
        initPersonalForm(user.id);
        initProfessionalForm(user.id);
        initExperience();
        initEducation();

        // Handle URL params: ?goto=tab&field=fieldId (from dashboard missing-field links)
        handleUrlGuidance();

    } catch (err) {
        console.error('Profile init failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', initProfile);
