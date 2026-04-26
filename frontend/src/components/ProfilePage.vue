<script setup>
import { ref, computed } from 'vue'
import { api } from '../api.js'
import { lang, toggleLang, t } from '../i18n.js'

const props = defineProps({ user: Object })
const emit = defineEmits(['back', 'updated'])

const tab = ref('info')
const error = ref('')
const success = ref('')
const saving = ref(false)

const nameForm = ref({ name: props.user.name })
const passForm = ref({ current: '', newPass: '', confirm: '' })

const ROLE_LABELS = computed(() => ({ user: t('roleUser'), expert: t('roleExpert'), admin: t('roleAdmin') }))
const ROLE_COLORS = { user: '#555', expert: '#92400e', admin: '#7a1f32' }
const ROLE_BG    = { user: '#f5f4f0', expert: '#fef3c7', admin: '#fdf0f2' }

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

async function saveName() {
  if (!nameForm.value.name.trim()) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await api.profile.updateName({ name: nameForm.value.name.trim() })
    localStorage.setItem('uc_user', JSON.stringify(res.user))
    emit('updated', res.user)
    success.value = t('nameUpdated')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  error.value = ''
  success.value = ''
  if (passForm.value.newPass !== passForm.value.confirm) {
    error.value = t('newPasswordMismatch')
    return
  }
  if (passForm.value.newPass.length < 6) {
    error.value = t('passwordTooShort')
    return
  }
  saving.value = true
  try {
    await api.profile.updatePassword({
      current_password: passForm.value.current,
      new_password: passForm.value.newPass,
    })
    passForm.value = { current: '', newPass: '', confirm: '' }
    success.value = t('passwordChanged')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function switchTab(t) {
  tab.value = t
  error.value = ''
  success.value = ''
}
</script>

<template>
  <div class="profile-page">

    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-inner">
        <button class="back-btn" @click="emit('back')">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M9 1L3 7l6 6"/>
          </svg>
          {{ t('back') }}
        </button>
        <div class="page-title-group">
          <h1 class="page-title">{{ t('profileTitle') }}</h1>
          <p class="page-subtitle">{{ t('profileSubtitle') }}</p>
        </div>
        <button class="btn-lang" @click="toggleLang" :title="lang === 'lv' ? 'Switch to English' : 'Pārslēgt uz latviešu'">
          <span :class="{ 'lang-active': lang === 'lv' }">LV</span>
          <span class="lang-sep">|</span>
          <span :class="{ 'lang-active': lang === 'en' }">EN</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="page-body">
      <div class="profile-card">

        <!-- Identity card -->
        <div class="identity-card">
          <div class="identity-avatar">{{ initials(user.name) }}</div>
          <div class="identity-info">
            <div class="identity-name">{{ user.name }}</div>
            <div class="identity-email">{{ user.email }}</div>
            <span
              class="role-badge"
              :style="{ background: ROLE_BG[user.role], color: ROLE_COLORS[user.role] }"
            >
              {{ ROLE_LABELS[user.role] || user.role }}
            </span>
          </div>
          <div v-if="user.role === 'expert' && user.expert_university_id" class="identity-expert-note">
            {{ t('expertAssigned') }}{{ user.expert_university_id }}
          </div>
        </div>

        <!-- Tabs -->
        <div class="profile-tabs">
          <button :class="['ptab', tab === 'info' && 'active']" @click="switchTab('info')">{{ t('tabInfo') }}</button>
          <button :class="['ptab', tab === 'password' && 'active']" @click="switchTab('password')">{{ t('tabPassword') }}</button>
        </div>

        <!-- Messages -->
        <div v-if="error" class="msg msg-error">{{ error }}</div>
        <div v-if="success" class="msg msg-success">{{ success }}</div>

        <!-- Info tab -->
        <div v-if="tab === 'info'" class="tab-content">
          <div class="section-label">{{ t('editName') }}</div>
          <div class="field-row">
            <input
              v-model="nameForm.name"
              class="field-input"
              :placeholder="t('fullName')"
              @keyup.enter="saveName"
            />
            <button class="btn btn-primary" :disabled="saving" @click="saveName">
              {{ saving ? t('saving') : t('save') }}
            </button>
          </div>

          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">{{ t('emailReadonly') }}</span>
              <span class="info-value">{{ user.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('roleLabel') }}</span>
              <span
                class="role-badge"
                :style="{ background: ROLE_BG[user.role], color: ROLE_COLORS[user.role] }"
              >{{ ROLE_LABELS[user.role] || user.role }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ t('accountCreated') }}</span>
              <span class="info-value">{{ user.created_at ? new Date(user.created_at).toLocaleDateString('lv-LV') : '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Password tab -->
        <div v-if="tab === 'password'" class="tab-content">
          <div class="section-label">{{ t('changePasswordTitle') }}</div>
          <div class="pass-form">
            <label class="field-label">{{ t('currentPassword') }}
              <input v-model="passForm.current" type="password" class="field-input" placeholder="••••••••" />
            </label>
            <label class="field-label">{{ t('newPassword') }}
              <input v-model="passForm.newPass" type="password" class="field-input" :placeholder="t('passwordPlaceholder')" />
            </label>
            <label class="field-label">{{ t('confirmNewPassword') }}
              <input v-model="passForm.confirm" type="password" class="field-input" :placeholder="t('repeatPlaceholder')" />
            </label>
            <button class="btn btn-primary btn-full" :disabled="saving" @click="savePassword">
              {{ saving ? t('saving') : t('changePasswordBtn') }}
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f4f0;
  display: flex;
  flex-direction: column;
}

/* Page header */
.page-header {
  background: #0f172a;
  border-bottom: 3px solid #a83248;
  padding: 1.25rem 2rem;
  flex-shrink: 0;
}
.page-header-inner {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid #2e2e2e;
  color: rgba(255,255,255,0.75);
  border-radius: 6px;
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.back-btn:hover { background: rgba(255,255,255,0.15); color: white; }
.btn-lang {
  display: flex; align-items: center; gap: 5px;
  background: transparent; border: 1px solid #3a3a3a; border-radius: 6px;
  color: rgba(255,255,255,0.45); padding: 0.42rem 0.85rem;
  font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: all 0.15s; letter-spacing: 0.06em; margin-left: auto;
}
.btn-lang:hover { border-color: #555; color: rgba(255,255,255,0.65); }
.lang-sep { color: #3a3a3a; font-size: 0.65rem; }
.lang-active { color: white; }
.page-title-group { display: flex; flex-direction: column; gap: 2px; }
.page-title { font-size: 1.15rem; font-weight: 800; color: white; letter-spacing: -0.02em; }
.page-subtitle { font-size: 0.78rem; color: rgba(255,255,255,0.45); }

/* Body */
.page-body {
  flex: 1;
  padding: 2rem;
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
}

/* Profile card */
.profile-card {
  background: #fdfcfa;
  border-radius: 10px;
  border: 1px solid #d4d0c8;
  overflow: hidden;
}

/* Identity card */
.identity-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: #f5f4f0;
  border-bottom: 1px solid #e8e5dd;
  flex-wrap: wrap;
}
.identity-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #a83248;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  flex-shrink: 0;
  letter-spacing: -0.03em;
}
.identity-info { display: flex; flex-direction: column; gap: 3px; }
.identity-name { font-size: 1rem; font-weight: 700; color: #1a1a1a; }
.identity-email { font-size: 0.82rem; color: #888; }
.identity-expert-note { width: 100%; font-size: 0.78rem; color: #92400e; background: #fef3c7; padding: 0.3rem 0.6rem; border-radius: 5px; margin-top: 0.25rem; }

.role-badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 700;
  width: fit-content;
}

/* Tabs */
.profile-tabs {
  display: flex;
  border-bottom: 1px solid #d4d0c8;
  background: #f5f4f0;
}
.ptab {
  padding: 0.65rem 1.4rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #888;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  font-family: inherit;
}
.ptab:hover { color: #444; }
.ptab.active {
  color: #a83248;
  border-bottom-color: #a83248;
  background: #fdfcfa;
}

/* Messages */
.msg {
  padding: 0.65rem 1.5rem;
  font-size: 0.85rem;
  border-bottom: 1px solid;
}
.msg-error { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.msg-success { background: #fdf0f2; color: #7a1f32; border-color: #f8d4d8; }

/* Tab content */
.tab-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }

.section-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: -0.4rem;
}

.field-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.field-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d4d0c8;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  background: #f5f4f0;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-input:focus {
  border-color: #a83248;
  background: #f5f4f0;
  box-shadow: 0 0 0 3px rgba(168,50,72,0.12);
}

.info-grid { display: flex; flex-direction: column; border: 1px solid #d4d0c8; border-radius: 7px; overflow: hidden; }
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  background: #f5f4f0;
  border-top: 1px solid #ede9e2;
  gap: 1rem;
}
.info-row:first-child { border-top: none; }
.info-label { font-size: 0.8rem; color: #888; font-weight: 500; }
.info-value { font-size: 0.875rem; color: #1a1a1a; font-weight: 500; }

.pass-form { display: flex; flex-direction: column; gap: 0.75rem; }
.field-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-primary { background: #a83248; color: white; }
.btn-primary:hover { background: #7a1f32; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-full { width: 100%; justify-content: center; padding: 0.6rem; }
</style>
