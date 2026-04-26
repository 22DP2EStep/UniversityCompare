<script setup>
import { ref } from 'vue'
import { api } from '../api.js'
import { lang, toggleLang, t } from '../i18n.js'

const props = defineProps({ initialTab: { type: String, default: 'login' } })
const emit = defineEmits(['authenticated', 'close'])

const tab = ref(props.initialTab)
const error = ref('')
const loading = ref(false)

const loginForm = ref({ email: '', password: '' })
const registerForm = ref({ name: '', email: '', password: '', confirm: '' })

function switchTab(t) {
  tab.value = t
  error.value = ''
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await api.auth.login({ email: loginForm.value.email, password: loginForm.value.password })
    localStorage.setItem('uc_token', res.token)
    localStorage.setItem('uc_user', JSON.stringify(res.user))
    emit('authenticated', res.user)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  if (registerForm.value.password !== registerForm.value.confirm) {
    error.value = t('passwordsMismatch')
    return
  }
  loading.value = true
  try {
    const res = await api.auth.register({
      name: registerForm.value.name,
      email: registerForm.value.email,
      password: registerForm.value.password,
    })
    localStorage.setItem('uc_token', res.token)
    localStorage.setItem('uc_user', JSON.stringify(res.user))
    emit('authenticated', res.user)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- Header -->
    <header class="app-header">
      <div class="header-brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <div class="brand-name">UniversityCompare</div>
      </div>
      <nav class="header-nav">
        <button class="btn-lang" @click="toggleLang" :title="lang === 'lv' ? 'Switch to English' : 'Pārslēgt uz latviešu'">
          <span :class="{ 'lang-active': lang === 'lv' }">LV</span>
          <span class="lang-sep">|</span>
          <span :class="{ 'lang-active': lang === 'en' }">EN</span>
        </button>
        <button class="btn btn-back" @click="emit('close')">&#8592; {{ t('back') }}</button>
      </nav>
    </header>

    <!-- Content -->
    <div class="auth-content">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <h1>UniversityCompare</h1>
          <p>{{ t('authTagline') }}</p>
        </div>

        <div class="auth-tabs">
          <button :class="['tab-btn', tab === 'login' && 'active']" @click="switchTab('login')">{{ t('login') }}</button>
          <button :class="['tab-btn', tab === 'register' && 'active']" @click="switchTab('register')">{{ t('register') }}</button>
        </div>

        <div v-if="error" class="auth-error">{{ error }}</div>

        <!-- Login Form -->
        <form v-if="tab === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <div class="field">
            <label>{{ t('emailLabel') }}</label>
            <input v-model="loginForm.email" type="email" :placeholder="t('emailPlaceholder')" required autocomplete="email" />
          </div>
          <div class="field">
            <label>{{ t('passwordLabel') }}</label>
            <input v-model="loginForm.password" type="password" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? t('signingIn') : t('login') }}
          </button>
          <p class="switch-hint">{{ t('noAccount') }} <span @click="switchTab('register')">{{ t('registerHere') }}</span></p>
        </form>

        <!-- Register Form -->
        <form v-if="tab === 'register'" class="auth-form" @submit.prevent="handleRegister">
          <div class="field">
            <label>{{ t('fullName') }}</label>
            <input v-model="registerForm.name" type="text" :placeholder="t('namePlaceholder')" required autocomplete="name" />
          </div>
          <div class="field">
            <label>{{ t('emailLabel') }}</label>
            <input v-model="registerForm.email" type="email" :placeholder="t('emailPlaceholder')" required autocomplete="email" />
          </div>
          <div class="field">
            <label>{{ t('passwordLabel') }}</label>
            <input v-model="registerForm.password" type="password" :placeholder="t('passwordPlaceholder')" required autocomplete="new-password" />
          </div>
          <div class="field">
            <label>{{ t('confirmPassword') }}</label>
            <input v-model="registerForm.confirm" type="password" :placeholder="t('repeatPlaceholder')" required autocomplete="new-password" />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? t('creatingAccount') : t('createAccount') }}
          </button>
          <p class="switch-hint">{{ t('alreadyHaveAccount') }} <span @click="switchTab('login')">{{ t('signInLink') }}</span></p>
        </form>
      </div>
    </div>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-left">
        <div class="footer-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <span><strong>UniversityCompare</strong></span>
      </div>
      <div class="footer-right">&copy; {{ new Date().getFullYear() }} UniversityCompare</div>
    </footer>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f4f0;
}

/* ── Header (mirrors App.vue) ── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 58px;
  background: #1a1a1a;
  color: white;
  flex-shrink: 0;
  border-bottom: 1px solid #2e2e2e;
}
.header-brand { display: flex; align-items: center; gap: 0.75rem; }
.brand-logo {
  width: 32px; height: 32px;
  border-radius: 6px;
  background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 800; color: white; letter-spacing: -0.03em;
  flex-shrink: 0;
}
.brand-name { font-size: 0.95rem; font-weight: 700; color: white; letter-spacing: -0.01em; }
.header-nav { display: flex; align-items: center; gap: 0.5rem; }
.btn-lang {
  display: flex; align-items: center; gap: 5px;
  background: transparent; border: 1px solid #3a3a3a; border-radius: 6px;
  color: rgba(255,255,255,0.45); padding: 0.42rem 0.85rem;
  font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: all 0.15s; letter-spacing: 0.06em;
}
.btn-lang:hover { border-color: #555; color: rgba(255,255,255,0.65); }
.lang-sep { color: #3a3a3a; font-size: 0.65rem; }
.lang-active { color: white; }
.btn { padding: 0.42rem 0.9rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; font-family: inherit; transition: all 0.15s; }
.btn-back { background: transparent; color: rgba(255,255,255,0.7); border: 1px solid #3a3a3a; }
.btn-back:hover { background: #2a2a2a; color: white; }

/* ── Content ── */
.auth-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
}

.auth-card {
  background: #f5f4f0;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  border-top: 3px solid #a83248;
}

.auth-logo {
  text-align: center;
  margin-bottom: 1.75rem;
}
.auth-logo-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; font-weight: 800; color: white; letter-spacing: -0.03em;
  margin: 0 auto 0.75rem;
}
.auth-logo h1 {
  font-size: 1.4rem;
  color: #1a1a1a;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}
.auth-logo p {
  color: #666;
  font-size: 0.85rem;
}

/* ── Footer (mirrors App.vue) ── */
.app-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.8rem 2rem;
  background: #1a1a1a;
  border-top: 1px solid #2e2e2e;
  flex-shrink: 0;
}
.footer-left { display: flex; align-items: center; gap: 0.55rem; font-size: 0.76rem; color: rgba(255,255,255,0.35); }
.footer-left strong { color: rgba(255,255,255,0.55); }
.footer-logo {
  width: 22px; height: 22px; border-radius: 4px;
  background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.52rem; font-weight: 800; color: white; flex-shrink: 0;
}
.footer-right { font-size: 0.72rem; color: rgba(255,255,255,0.22); }

.auth-tabs {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d4d0c8;
  margin-bottom: 1.25rem;
}
.tab-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  background: #f5f4f0;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
}
.tab-btn.active {
  background: #a83248;
  color: white;
}

.auth-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
}
.field input {
  padding: 0.55rem 0.75rem;
  border: 1px solid #d4d0c8;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: #a83248;
  box-shadow: 0 0 0 3px rgba(168,50,72,0.15);
}

.submit-btn {
  padding: 0.7rem;
  background: #a83248;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  margin-top: 0.25rem;
  transition: background 0.2s;
}
.submit-btn:hover:not(:disabled) {
  background: #7a1f32;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-hint {
  text-align: center;
  font-size: 0.82rem;
  color: #666;
}
.switch-hint span {
  color: #a83248;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
}
</style>
