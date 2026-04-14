<script setup>
import { ref, onMounted } from 'vue'
import { api } from './api.js'
import LoginRegister from './components/LoginRegister.vue'
import UniversityList from './components/UniversityList.vue'
import UniversityDetail from './components/UniversityDetail.vue'
import AdminPage from './components/AdminPage.vue'
import CompareView from './components/CompareView.vue'
import ProfilePage from './components/ProfilePage.vue'

const currentUser = ref(null)
const universities = ref([])
const selectedId = ref(null)
const showAuthModal = ref(false)
const search = ref('')
const error = ref('')

// 'home' | 'admin' | 'profile'
const currentPage = ref('home')

const compareIds = ref([])
const showCompare = ref(false)

function toggleCompare(id) {
  const idx = compareIds.value.indexOf(id)
  if (idx === -1) {
    if (compareIds.value.length < 4) compareIds.value.push(id)
  } else {
    compareIds.value.splice(idx, 1)
  }
}

onMounted(() => {
  const stored = localStorage.getItem('uc_user')
  if (stored) currentUser.value = JSON.parse(stored)
  loadUniversities()
})

function handleAuthenticated(user) {
  currentUser.value = user
  showAuthModal.value = false
}

function handleLogout() {
  localStorage.removeItem('uc_token')
  localStorage.removeItem('uc_user')
  currentUser.value = null
  currentPage.value = 'home'
  compareIds.value = []
  showCompare.value = false
}

async function loadUniversities() {
  try {
    const params = {}
    if (search.value) params.search = search.value
    universities.value = await api.universities.list(params)
  } catch (e) {
    error.value = e.message
  }
}


</script>

<template>
  <div class="app">

    <!-- ══ ADMIN PAGE ══ -->
    <AdminPage
      v-if="currentPage === 'admin'"
      @back="currentPage = 'home'; loadUniversities()"
    />

    <!-- ══ PROFILE PAGE ══ -->
    <ProfilePage
      v-else-if="currentPage === 'profile' && currentUser"
      :user="currentUser"
      @back="currentPage = 'home'"
      @updated="u => { currentUser = u; currentPage = 'home' }"
    />

    <!-- ══ MAIN / HOME ══ -->
    <template v-else>

      <!-- ── Header ── -->
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-logo">UC</div>
          <div>
            <div class="brand-name">UniversityCompare</div>
            <div class="brand-sub">Jūsu ceļvedis augstākajā izglītībā</div>
          </div>
        </div>

        <nav class="header-nav">
          <template v-if="currentUser">
            <button v-if="currentUser.role === 'admin'" class="btn btn-admin" @click="currentPage = 'admin'">&#9881; Admin</button>
            <div class="user-menu">
              <div class="user-avatar" @click="currentPage = 'profile'" title="Skatīt profilu">{{ currentUser.name.charAt(0).toUpperCase() }}</div>
              <span class="user-name" @click="currentPage = 'profile'" style="cursor:pointer">{{ currentUser.name }}</span>
              <button class="btn btn-logout" @click="handleLogout">Iziet</button>
            </div>
          </template>
          <template v-else>
            <button class="btn btn-login" @click="showAuthModal = true">Pieslēgties</button>
            <button class="btn btn-register" @click="showAuthModal = true">Reģistrēties</button>
          </template>
        </nav>
      </header>

      <!-- ── Hero search bar ── -->
      <div class="hero">
        <h2 class="hero-title">Atrodiet savu universitāti</h2>
        <p class="hero-sub">Pārlūkojiet un salīdziniet universitātes no visas pasaules</p>
        <div class="hero-search">
          <svg viewBox="0 0 20 20" fill="currentColor" class="hero-search-ico">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
          </svg>
          <input
            v-model="search"
            @input="loadUniversities"
            placeholder="Meklēt pēc nosaukuma, pilsētas vai valsts..."
            class="hero-search-input"
          />
        </div>
      </div>

      <!-- ── Error banner ── -->
      <div v-if="error" class="error-banner">{{ error }}</div>

      <!-- ── Compare bar ── -->
      <div v-if="currentUser && compareIds.length >= 2" class="compare-bar">
        <span><strong>{{ compareIds.length }}</strong> universitātes izvēlētas</span>
        <div class="compare-bar-actions">
          <button class="btn btn-compare" @click="showCompare = true">Salīdzināt ({{ compareIds.length }})</button>
          <button class="btn btn-compare-clear" @click="compareIds = []">Notīrīt</button>
        </div>
      </div>

      <!-- ── Card grid ── -->
      <main class="main-content">
        <UniversityList
          :universities="universities"
          :selectedId="selectedId"
          :compareIds="compareIds"
          :canCompare="!!currentUser"
          @select="selectedId = $event"
          @toggle-compare="toggleCompare"
        />
      </main>

      <!-- ── Footer ── -->
      <footer class="app-footer">
        <div class="footer-left">
          <div class="footer-logo">UC</div>
          <span><strong>UniversityCompare</strong> &mdash; Atrodiet un salīdziniet labākās universitātes pasaulē</span>
        </div>
        <div class="footer-right">&copy; {{ new Date().getFullYear() }} UniversityCompare</div>
      </footer>

      <!-- ── Detail modal overlay ── -->
      <div v-if="selectedId" class="detail-overlay" @click.self="selectedId = null">
        <div class="detail-modal">
          <UniversityDetail
            :id="selectedId"
            :currentUser="currentUser"
            @close="selectedId = null"
            @updated="loadUniversities"
          />
        </div>
      </div>

      <!-- ── Other modals ── -->
      <LoginRegister v-if="showAuthModal" @authenticated="handleAuthenticated" @close="showAuthModal = false" />
      <CompareView v-if="showCompare" :ids="compareIds" @close="showCompare = false" />

    </template>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #f5f4f0;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ══ HEADER ══ */
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
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-brand { display: flex; align-items: center; gap: 0.75rem; }
.brand-logo {
  width: 32px; height: 32px;
  border-radius: 6px;
  background: #0d9488;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 800; color: white; letter-spacing: -0.03em;
  flex-shrink: 0;
}
.brand-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
}
.brand-sub { display: none; }

.header-nav { display: flex; align-items: center; gap: 0.5rem; }

.btn {
  padding: 0.42rem 0.9rem;
  border: none; border-radius: 6px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600;
  font-family: inherit; transition: all 0.15s; white-space: nowrap;
}
.btn-add { background: #0d9488; color: white; }
.btn-add:hover { background: #0f766e; }
.btn-admin { background: #92400e; color: white; }
.btn-admin:hover { background: #78350f; }
.btn-login { background: transparent; color: rgba(255,255,255,0.7); border: 1px solid #3a3a3a; }
.btn-login:hover { background: #2a2a2a; color: white; }
.btn-register { background: #0d9488; color: white; }
.btn-register:hover { background: #0f766e; }
.btn-logout { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid #2e2e2e; font-size: 0.78rem; padding: 0.3rem 0.65rem; }
.btn-logout:hover { background: #2a2a2a; color: white; }
.btn-primary { background: #0d9488; color: white; }
.btn-primary:hover { background: #0f766e; }
.btn-secondary { background: #f5f4f0; color: #444; border: 1px solid #d4d0c8; }
.btn-secondary:hover { background: #e8e5dd; }
.btn-danger { background: #b91c1c; color: white; }
.btn-danger:hover { background: #991b1b; }

.user-menu {
  display: flex; align-items: center; gap: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid #2e2e2e;
  margin-left: 0.25rem;
}
.user-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #0d9488;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 700; color: white; flex-shrink: 0;
  cursor: pointer;
}
.user-name { font-size: 0.82rem; color: rgba(255,255,255,0.8); font-weight: 500; }

/* ══ HERO ══ */
.hero {
  background: #1a1a1a;
  padding: 3.5rem 2rem 3rem;
  text-align: center;
  color: white;
  border-bottom: 3px solid #0d9488;
}
.hero-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0.5rem;
}
.hero-sub {
  font-size: 1rem;
  color: rgba(255,255,255,0.65);
  margin-bottom: 1.75rem;
}
.hero-search {
  position: relative;
  max-width: 560px;
  margin: 0 auto;
}
.hero-search-ico {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px; height: 18px;
  color: #94a3b8;
  pointer-events: none;
}
.hero-search-input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.85rem;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: white;
  color: #0f172a;
  outline: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25);
  transition: box-shadow 0.2s;
}
.hero-search-input:focus { box-shadow: 0 4px 28px rgba(13,148,136,0.3); }
.hero-search-input::placeholder { color: #9ca3af; }

/* ══ ERROR / COMPARE BAR ══ */
.error-banner {
  background: #fef2f2; color: #b91c1c;
  padding: 0.6rem 2rem; font-size: 0.875rem;
  border-bottom: 1px solid #fecaca;
}
.compare-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 2rem;
  background: #134e4a;
  color: white; font-size: 0.85rem;
}
.compare-bar strong { font-weight: 800; }
.compare-bar-actions { display: flex; gap: 0.5rem; }
.btn-compare {
  background: #0d9488; color: white;
  font-weight: 700; border: none; border-radius: 6px;
  padding: 0.38rem 0.85rem; font-size: 0.85rem; cursor: pointer; font-family: inherit;
}
.btn-compare:hover { background: #0f766e; }
.btn-compare-clear {
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
  padding: 0.38rem 0.75rem; font-size: 0.82rem; cursor: pointer; font-family: inherit;
}
.btn-compare-clear:hover { background: rgba(255,255,255,0.18); }

/* ══ MAIN CONTENT ══ */
.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* ══ FOOTER ══ */
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
  background: #0d9488;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.52rem; font-weight: 800; color: white;
  flex-shrink: 0;
}
.footer-right { font-size: 0.72rem; color: rgba(255,255,255,0.22); }

/* ══ DETAIL MODAL OVERLAY ══ */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}
.detail-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 860px;
  min-height: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
