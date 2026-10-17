/**
 * KAYA – Client Profile
 * Handles: company logo upload, company info, contact person,
 *          account settings (password change), danger zone
 */

import { supabase, getCurrentUser } from './supabase.js';

const LOGIN_URL = '/pages/login.html';

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
    return (name || 'CO')
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
const CLIENT_FIELD_GUIDANCE = {
    avatarFileInput:      { title: 'Upload your company logo',     icon: '🏢', why: 'A company logo makes your job posts look professional. Job seekers are more likely to apply to companies with a recognizable identity.' },
    companyNameInput:     { title: 'Add your company name',        icon: '📋', why: 'Your company name appears on every job post. Without it, listings look incomplete and applicants may not apply.' },
    industryInput:        { title: 'Set your industry',            icon: '🏭', why: 'Setting your industry helps job seekers filter relevant opportunities and understand your business.' },
    officeBarangayInput:  { title: 'Select your office barangay',  icon: '📍', why: 'KAYA verifies that businesses operate within Minglanilla. Your barangay is needed for admin to approve your account.' },
    companyDescInput:     { title: 'Write a company description',  icon: '📝', why: 'Job seekers read your company description before applying. A compelling bio attracts significantly more and better candidates.' },
    contactPhoneInput:    { title: 'Add a contact phone number',   icon: '📞', why: 'A contact number is required for KAYA admins to verify your account, and for job seekers to reach you directly.' },
    idProofInput:         { title: 'Upload your business document',icon: '🪪', why: 'Your account stays inactive until an admin verifies your business location in Minglanilla. Upload your business permit to proceed.' },
    contactFirstNameInput:{ title: 'Add contact person name',      icon: '👤', why: 'KAYA needs to know who manages this account for administrative and verification purposes.' },
    contactEmailInput:    { title: 'Add a contact email',          icon: '📧', why: 'A contact email is used for account notifications and is required for KAYA support to reach you.' },
};

function switchToTab(tabId) {
    document.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b.dataset.ptab === tabId));
    document.querySelectorAll('.profile-tab-panel').forEach(p => p.classList.toggle('active', p.id === `ptab-${tabId}`));
}

function showGuidanceBanner(fieldId, formCardEl) {
    const guidance = CLIENT_FIELD_GUIDANCE[fieldId];
    if (!guidance || !formCardEl) return;

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

    const title = formCardEl.querySelector('.profile-section-title');
    if (title) title.insertAdjacentElement('afterend', banner);
    else formCardEl.prepend(banner);
}

function highlightField(fieldEl) {
    if (!fieldEl) return;
    fieldEl.classList.remove('field-highlight', 'field-missing');
    void fieldEl.offsetWidth;
    fieldEl.classList.add('field-highlight', 'field-missing');
    fieldEl.focus();
    fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    fieldEl.addEventListener('input', () => {
        if (fieldEl.value.trim()) fieldEl.classList.remove('field-highlight', 'field-missing');
    }, { once: true });

    setTimeout(() => fieldEl.classList.remove('field-highlight'), 2000);
}

function handleUrlGuidance() {
    const params  = new URLSearchParams(window.location.search);
    const gotoTab = params.get('goto');
    const fieldId = params.get('field');

    if (!gotoTab && !fieldId) return;

    if (gotoTab) switchToTab(gotoTab);
    if (!fieldId) return;

    setTimeout(() => {
        const fieldEl = document.getElementById(fieldId);
        if (!fieldEl) return;

        const card = fieldEl.closest('.profile-form-card');
        showGuidanceBanner(fieldId, card);
        highlightField(fieldEl);

        if (fieldEl.type === 'file') {
            const area = document.getElementById('idUploadArea') || document.getElementById('avatarWrapper');
            if (area) {
                area.style.borderColor = 'var(--color-gold)';
                area.style.background  = 'rgba(212,167,44,0.04)';
                area.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 120);
}

/* ── Logo / avatar upload ─────────────────────────────────────── */
function initAvatarUpload(userId) {
    const input   = document.getElementById('avatarFileInput');
    const preview = document.querySelector('.avatar-preview');
    if (!input || !preview) return;

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { alert('Image must be smaller than 5 MB.'); return; }

        // Optimistic local preview
        const reader = new FileReader();
        reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" alt="Company logo">`; };
        reader.readAsDataURL(file);

        document.getElementById('profileSaveStatus').textContent = 'Uploading logo…';

        try {
            const ext      = file.name.split('.').pop();
            const filePath = `avatars/${userId}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            document.getElementById('profileSaveStatus').textContent = 'Logo updated ✓';
            setTimeout(() => setText('profileSaveStatus', ''), 3000);

        } catch (err) {
            console.error('Logo upload failed:', err);
            document.getElementById('profileSaveStatus').textContent = 'Upload failed. Try again.';
        }
    });
}

/* ── Company Info form ────────────────────────────────────────── */
function initCompanyForm(userId) {
    const form    = document.getElementById('clientProfileForm');
    const saveBtn = document.getElementById('saveClientProfileButton');
    const descInput = document.getElementById('companyDescInput');
    const descCount = document.getElementById('descCharCount');

    if (descInput && descCount) {
        const update = () => descCount.textContent = descInput.value.length;
        descInput.addEventListener('input', update);
        update();
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage('clientProfileMessage');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        try {
            const payload = {
                id:             userId,
                company_name:   document.getElementById('companyNameInput')?.value.trim(),
                industry:       document.getElementById('industryInput')?.value,
                company_size:   document.getElementById('companySizeInput')?.value,
                founded_year:   document.getElementById('foundedInput')?.value || null,
                website:        document.getElementById('websiteInput')?.value.trim(),
                bio:            document.getElementById('companyDescInput')?.value.trim(),
                office_address: document.getElementById('officeAddressInput')?.value.trim(),
                barangay:       document.getElementById('officeBarangayInput')?.value,
                location:       'Minglanilla',
                province:       'Cebu',
                work_setup:     document.getElementById('workSetupInput')?.value,
                profile_completed: true,
            };

            const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
            if (error) throw error;

            showMessage('clientProfileMessage', 'Company info saved successfully! ✓', 'success');
            setTimeout(() => hideMessage('clientProfileMessage'), 3000);

            // Update banner name
            const cname = payload.company_name || '';
            setText('profileName', cname);
            setText('profileInitials', getInitials(cname));

        } catch (err) {
            console.error('Save company info failed:', err);
            showMessage('clientProfileMessage', 'Failed to save: ' + (err.message || 'Please try again.'), 'error');
        } finally {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Save Company Info';
        }
    });
}

/* ── Contact Person form ──────────────────────────────────────── */
function initContactForm(userId) {
    const form    = document.getElementById('contactForm');
    const saveBtn = document.getElementById('saveContactButton');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage('contactMessage');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        try {
            const firstName = document.getElementById('contactFirstNameInput')?.value.trim();
            const lastName  = document.getElementById('contactLastNameInput')?.value.trim();

            const payload = {
                id:               userId,
                full_name:        `${firstName} ${lastName}`.trim(),
                contact_position: document.getElementById('contactPositionInput')?.value.trim(),
                phone:            document.getElementById('contactPhoneInput')?.value.trim(),
                contact_email:    document.getElementById('contactEmailInput')?.value.trim(),
                gender:           document.getElementById('contactGenderInput')?.value,
                date_of_birth:    document.getElementById('contactDobInput')?.value || null,
            };

            const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
            if (error) throw error;

            showMessage('contactMessage', 'Contact info saved successfully! ✓', 'success');
            setTimeout(() => hideMessage('contactMessage'), 3000);

        } catch (err) {
            console.error('Save contact info failed:', err);
            showMessage('contactMessage', 'Failed to save: ' + (err.message || 'Please try again.'), 'error');
        } finally {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Save Contact Info';
        }
    });
}

/* ── Account settings (password) ─────────────────────────────── */
function initAccountSettings() {
    const saveBtn = document.getElementById('savePasswordBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        const newPass  = document.getElementById('newPasswordInput')?.value;
        const confirm  = document.getElementById('confirmNewPasswordInput')?.value;

        hideMessage('accountMessage');

        if (!newPass) { showMessage('accountMessage', 'Enter a new password.', 'error'); return; }
        if (newPass.length < 8) { showMessage('accountMessage', 'Password must be at least 8 characters.', 'error'); return; }
        if (newPass !== confirm) { showMessage('accountMessage', 'Passwords do not match.', 'error'); return; }

        saveBtn.disabled    = true;
        saveBtn.textContent = 'Updating…';

        try {
            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (error) throw error;

            showMessage('accountMessage', 'Password updated successfully! ✓', 'success');
            setValue('newPasswordInput', '');
            setValue('confirmNewPasswordInput', '');

        } catch (err) {
            console.error('Password update failed:', err);
            showMessage('accountMessage', 'Failed: ' + (err.message || 'Please try again.'), 'error');
        } finally {
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Update Password';
        }
    });

    /* Danger zone – delete account */
    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
        const confirmed = confirm(
            'Are you sure you want to permanently delete your KAYA account?\n\n' +
            'All your data, job posts, and history will be removed. This cannot be undone.'
        );
        if (!confirmed) return;

        try {
            // Mark account for deletion (admin-level deletion handled via Supabase function/admin)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({ account_deleted: true }).eq('id', user.id);
            }
            await supabase.auth.signOut();
            alert('Your account has been marked for deletion. You have been signed out.');
            window.location.replace(LOGIN_URL);
        } catch (err) {
            console.error('Delete account failed:', err);
            alert('Failed to delete account. Please contact support@kaya.ph');
        }
    });
}

/* ── ID / Business Document upload ───────────────────────────── */
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

    // Show existing status
    if (statusEl && currentStatus) {
        statusEl.style.display = 'block';
        const statusMap = {
            id_pending: { cls: 'vs-pending',  icon: '⏳', msg: 'Your document is uploaded and waiting for admin review.' },
            approved:   { cls: 'vs-approved', icon: '✅', msg: 'Your business location has been verified! Your account is fully active.' },
            rejected:   { cls: 'vs-rejected', icon: '❌', msg: 'Your document was rejected. Please upload a valid business permit or certificate showing a Minglanilla address.' },
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

    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleIdFile(e.dataTransfer.files[0]);
    });

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
        if (file.size > 10 * 1024 * 1024) { alert('File must be smaller than 10 MB.'); return; }

        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.type)) { alert('Only JPG, PNG, WebP, or PDF files are accepted.'); return; }

        placeholder.style.display = 'none';
        preview.style.display     = 'flex';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = ev => { previewImg.src = ev.target.result; previewImg.style.display = 'block'; };
            reader.readAsDataURL(file);
        } else {
            if (previewImg) previewImg.style.display = 'none';
        }

        if (fileInfo) {
            fileInfo.innerHTML = `<strong>${file.name}</strong> ${(file.size / 1024).toFixed(0)} KB`;
        }

        const statusText = document.getElementById('profileSaveStatus');
        if (statusText) statusText.textContent = 'Uploading document…';

        try {
            const ext      = file.name.split('.').pop();
            const filePath = `id_proofs/${userId}_client.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('id-proofs')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('id-proofs').getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    id_proof_url:        data.publicUrl,
                    id_proof_filename:   file.name,
                    verification_status: 'id_pending',
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            if (statusText) statusText.textContent = 'Document uploaded — pending admin review ✓';
            setTimeout(() => { if (statusText) statusText.textContent = ''; }, 4000);

            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerHTML = `
                    <div class="verification-status vs-pending">
                        <span class="vs-icon">⏳</span>
                        <span>Your document has been uploaded and is waiting for admin review.</span>
                    </div>`;
            }

        } catch (err) {
            console.error('Document upload failed:', err);
            if (statusText) statusText.textContent = 'Upload failed. Try again.';
        }
    }
}

/* ── Main init ────────────────────────────────────────────────── */
async function initClientProfile() {
    try {
        const user = await getCurrentUser();
        if (!user) { window.location.replace(LOGIN_URL); return; }
        if (user.role !== 'client') { window.location.replace('/pages/profile.html'); return; }

        const p    = user.profile || {};
        const name = p.company_name || user.fullName?.trim() || '';

        /* Banner */
        setText('navbarUserName', user.fullName?.trim() || 'Client');
        setText('profileName',    name || 'Your Company');
        setText('profileEmail',   user.email || '');
        setText('profileInitials', getInitials(name));
        setText('sidebarMemberSince', formatDate(user.created_at));

        /* Restore logo */
        if (p.avatar_url) {
            const preview = document.querySelector('.avatar-preview');
            if (preview) preview.innerHTML = `<img src="${p.avatar_url}" alt="Company logo">`;
        }

        /* Company Info */
        setValue('companyNameInput',    p.company_name   || '');
        setValue('industryInput',       p.industry       || '');
        setValue('companySizeInput',    p.company_size   || '');
        setValue('foundedInput',        p.founded_year   || '');
        setValue('websiteInput',        p.website        || '');
        setValue('companyDescInput',    p.bio            || '');
        setValue('officeAddressInput',  p.office_address || '');
        setValue('officeBarangayInput', p.barangay       || '');
        setValue('workSetupInput',      p.work_setup     || '');

        /* Contact Person */
        const nameParts = (user.fullName || '').split(' ');
        setValue('contactFirstNameInput', nameParts[0] || '');
        setValue('contactLastNameInput',  nameParts.slice(1).join(' ') || '');
        setValue('contactPositionInput',  p.contact_position || '');
        setValue('contactPhoneInput',     user.phone         || '');
        setValue('contactEmailInput',     p.contact_email    || user.email || '');
        setValue('contactGenderInput',    p.gender           || '');
        setValue('contactDobInput',       p.date_of_birth    || '');

        /* Account settings */
        setValue('accountEmailDisplay', user.email || '');

        /* Init */
        initProfileTabs();
        initAvatarUpload(user.id);
        initIdProofUpload(user.id, p.verification_status || null);
        initCompanyForm(user.id);
        initContactForm(user.id);
        initAccountSettings();

        // Handle URL params: ?goto=tab&field=fieldId (from dashboard missing-field links)
        handleUrlGuidance();

    } catch (err) {
        console.error('Client profile init failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', initClientProfile);
