<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['authenticated', 'close'])

const tab = ref('login')
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
    error.value = 'Paroles nesakrīt.'
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
  <div class="auth-backdrop" @click.self="emit('close')">
    <div class="auth-card">
      <div class="auth-logo">
        <h1>UniversityCompare</h1>
        <p>Atrodiet un salīdziniet universitātes visā pasaulē</p>
      </div>

      <div class="auth-tabs">
        <button :class="['tab-btn', tab === 'login' && 'active']" @click="switchTab('login')">Pieslēgties</button>
        <button :class="['tab-btn', tab === 'register' && 'active']" @click="switchTab('register')">Reģistrēties</button>
      </div>

      <div v-if="error" class="auth-error">{{ error }}</div>

      <!-- Login Form -->
      <form v-if="tab === 'login'" class="auth-form" @submit.prevent="handleLogin">
        <div class="field">
          <label>E-pasts</label>
          <input v-model="loginForm.email" type="email" placeholder="jūs@piemers.lv" required autocomplete="email" />
        </div>
        <div class="field">
          <label>Parole</label>
          <input v-model="loginForm.password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Piesakās...' : 'Pieslēgties' }}
        </button>
        <p class="switch-hint">Nav konta? <span @click="switchTab('register')">Reģistrējieties šeit</span></p>
      </form>

      <!-- Register Form -->
      <form v-if="tab === 'register'" class="auth-form" @submit.prevent="handleRegister">
        <div class="field">
          <label>Pilns vārds</label>
          <input v-model="registerForm.name" type="text" placeholder="Jānis Bērziņš" required autocomplete="name" />
        </div>
        <div class="field">
          <label>E-pasts</label>
          <input v-model="registerForm.email" type="email" placeholder="jūs@piemers.lv" required autocomplete="email" />
        </div>
        <div class="field">
          <label>Parole</label>
          <input v-model="registerForm.password" type="password" placeholder="Vismaz 6 rakstzīmes" required autocomplete="new-password" />
        </div>
        <div class="field">
          <label>Apstiprināt paroli</label>
          <input v-model="registerForm.confirm" type="password" placeholder="Atkārtojiet paroli" required autocomplete="new-password" />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Izveido kontu...' : 'Izveidot kontu' }}
        </button>
        <p class="switch-hint">Jau ir konts? <span @click="switchTab('login')">Pieslēgties</span></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-backdrop {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a56db 0%, #0f3a99 100%);
  padding: 1rem;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}

.auth-logo {
  text-align: center;
  margin-bottom: 1.5rem;
}
.auth-logo h1 {
  font-size: 1.5rem;
  color: #1a56db;
  margin-bottom: 0.25rem;
}
.auth-logo p {
  color: #666;
  font-size: 0.85rem;
}

.auth-tabs {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
}
.tab-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  background: #f7fafc;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  transition: background 0.2s, color 0.2s;
}
.tab-btn.active {
  background: #1a56db;
  color: white;
}

.auth-error {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
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
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: #1a56db;
  box-shadow: 0 0 0 3px rgba(26,86,219,0.15);
}

.submit-btn {
  padding: 0.7rem;
  background: #1a56db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.25rem;
  transition: background 0.2s;
}
.submit-btn:hover:not(:disabled) {
  background: #1648c0;
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
  color: #1a56db;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
}
</style>
