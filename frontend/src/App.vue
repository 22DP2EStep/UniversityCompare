<script setup>
// Galvenais lietotnes komponents — pārvalda navigāciju starp lapām un globālo stāvokli

import { ref, computed, onMounted, watch } from 'vue'
import { api } from './api.js'
import { lang, toggleLang, t, tDegree } from './i18n.js'
import LoginRegister from './components/LoginRegister.vue'
import UniversityList from './components/UniversityList.vue'
import UniversityDetail from './components/UniversityDetail.vue'
import AdminPage from './components/AdminPage.vue'
import CompareView from './components/CompareView.vue'
import ProfilePage from './components/ProfilePage.vue'
import LandingPage from './components/LandingPage.vue'

// Pieteiktā lietotāja dati (ielādēti no localStorage)
const currentUser = ref(null)
const universities = ref([])
// ID universitātei kuras detaļu modāls ir atvērts
const selectedId = ref(null)
const authTab = ref('login')
const search = ref('')
const error = ref('')
const showFilters = ref(false)

// Aktīvie filtri
const filterCity = ref('')
const filterProgram = ref('')
const filterDegree = ref('')

// Pieejamās filtrēšanas izvēles (dinamiski ielādētas no API)
const filterOptions = ref({ cities: [], programs: [], degrees: [] })

// Aktīvā lapa: 'landing' | 'home' | 'admin' | 'profile' | 'auth'
const currentPage = ref('landing')

// Universitāšu ID masīvs salīdzināšanai (maksimums 4)
const compareIds = ref([])
const showCompare = ref(false)

// Pievieno vai noņem universitāti no salīdzināšanas saraksta
function toggleCompare(id) {
  const idx = compareIds.value.indexOf(id)
  if (idx === -1) {
    if (compareIds.value.length < 4) compareIds.value.push(id)
  } else {
    compareIds.value.splice(idx, 1)
  }
}

// Atjauno filtrēšanas izvēles atbilstoši aktīvajiem filtriem
// Grādi tiek sakārtoti noteiktā secībā (bakalaurs → maģistrs → doktors)
async function refreshFilterOptions() {
  try {
    const params = {}
    if (search.value)     params.search = search.value
    if (filterCity.value) params.city   = filterCity.value
    const opts = await api.universities.filterOptions(params)
    const DEGREE_ORDER = ['Bakalaura grāds', 'Maģistra grāds', 'Doktora grāds']
    opts.programs = [...new Set(opts.programs)]
    opts.degrees  = [...new Set(opts.degrees)].sort(
      (a, b) => DEGREE_ORDER.indexOf(a) - DEGREE_ORDER.indexOf(b)
    )
    // Atceļ filtru ja izvēlētā vērtība vairs nav pieejama
    if (filterProgram.value && !opts.programs.includes(filterProgram.value)) filterProgram.value = ''
    if (filterDegree.value  && !opts.degrees.includes(filterDegree.value))   filterDegree.value  = ''
    filterOptions.value = opts
  } catch {}
}

// Ielādē saglabāto lietotāju no localStorage un ienes universitātes
onMounted(async () => {
  const stored = localStorage.getItem('uc_user')
  if (stored) currentUser.value = JSON.parse(stored)
  loadUniversities()
  refreshFilterOptions()
})

// Atjauno filtrēšanas izvēles kad mainās pilsēta vai meklēšanas teksts
watch([filterCity, search], () => {
  refreshFilterOptions()
})

// Bloķē lapas ritināšanu kamēr ir atvērts detaļu modāls
watch(selectedId, (id) => {
  document.body.style.overflow = id ? 'hidden' : ''
})

// Saglabā pieteikušos lietotāju un pāriet uz galveno lapu
function handleAuthenticated(user) {
  currentUser.value = user
  currentPage.value = 'home'
}

function goToAuth(tab) {
  authTab.value = tab
  currentPage.value = 'auth'
}

// Notīra sesijas datus un atgriežas uz sākumlapu
function handleLogout() {
  localStorage.removeItem('uc_token')
  localStorage.removeItem('uc_user')
  currentUser.value = null
  currentPage.value = 'home'
  compareIds.value = []
  showCompare.value = false
}

// Ielādē universitāšu sarakstu ar aktīvajiem filtriem
async function loadUniversities() {
  try {
    const params = {}
    if (search.value)        params.search  = search.value
    if (filterCity.value)    params.city    = filterCity.value
    if (filterProgram.value) params.program = filterProgram.value
    if (filterDegree.value)  params.degree  = filterDegree.value
    universities.value = await api.universities.list(params)
  } catch (e) {
    error.value = e.message
  }
}

// Notīra visus filtrus un atjauno pilno sarakstu
function clearFilters() {
  filterCity.value = ''
  filterProgram.value = ''
  filterDegree.value = ''
  loadUniversities()
  refreshFilterOptions()
}

// Aktīvo filtru skaits — tiek rādīts filtrēšanas pogas žetonā
const activeFilterCount = computed(() =>
  [filterCity.value, filterProgram.value, filterDegree.value].filter(Boolean).length
)
</script>

<template>
  <div class="app">

    <!-- ══ LANDING PAGE ══ -->
    <LandingPage
      v-if="currentPage === 'landing'"
      :currentUser="currentUser"
      @go-to-app="currentPage = 'home'"
      @go-to-auth="tab => { authTab = tab; currentPage = 'auth' }"
      @go-to-admin="currentPage = 'admin'"
      @go-to-profile="currentPage = 'profile'"
      @logout="handleLogout"
    />

    <!-- ══ AUTH PAGE ══ -->
    <LoginRegister
      v-else-if="currentPage === 'auth'"
      :initialTab="authTab"
      @authenticated="handleAuthenticated"
      @close="currentPage = 'home'"
    />

    <!-- ══ ADMIN PAGE ══ -->
    <AdminPage
      v-else-if="currentPage === 'admin'"
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
        <div class="header-brand" @click="currentPage = 'landing'" style="cursor:pointer">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <div>
            <div class="brand-name">UniversityCompare</div>
            <div class="brand-sub">{{ t('brandSub') }}</div>
          </div>
        </div>

        <nav class="header-nav">
          <button class="btn btn-back-home" @click="currentPage = 'landing'">{{ t('backHome') }}</button>
          <button class="btn-lang" @click="toggleLang" :title="lang === 'lv' ? 'Switch to English' : 'Pārslēgt uz latviešu'">
            <span :class="{ 'lang-active': lang === 'lv' }">LV</span>
            <span class="lang-sep">|</span>
            <span :class="{ 'lang-active': lang === 'en' }">EN</span>
          </button>

          <template v-if="currentUser">
            <button v-if="currentUser.role === 'admin'" class="btn btn-admin" @click="currentPage = 'admin'">{{ t('adminBtn') }}</button>
            <div class="user-menu">
              <div class="user-avatar" @click="currentPage = 'profile'" :title="t('viewProfile')">
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span class="user-name" @click="currentPage = 'profile'" style="cursor:pointer">{{ currentUser.name }}</span>
              <button class="btn btn-logout" @click="handleLogout">{{ t('logout') }}</button>
            </div>
          </template>
          <template v-else>
            <button class="btn btn-login" @click="goToAuth('login')">{{ t('login') }}</button>
            <button class="btn btn-register" @click="goToAuth('register')">{{ t('register') }}</button>
          </template>
        </nav>
      </header>

      <!-- ── Hero search bar ── -->
      <div class="hero">
        <h2 class="hero-title">{{ t('heroTitle') }}</h2>
        <p class="hero-sub">{{ t('heroSub') }}</p>

        <div class="hero-search-row">
          <div class="hero-search">
            <svg viewBox="0 0 20 20" fill="currentColor" class="hero-search-ico">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
            </svg>
            <input
              v-model="search"
              @input="loadUniversities"
              :placeholder="t('searchPlaceholder')"
              class="hero-search-input"
            />
          </div>
          <button class="filter-toggle-btn" @click="showFilters = !showFilters" :class="{ active: showFilters || activeFilterCount > 0 }">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm2 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd"/>
            </svg>
            {{ t('filters') }}
            <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
        </div>

        <!-- Filter panel -->
        <div v-if="showFilters" class="filter-panel">
          <div class="filter-grid">
            <div class="filter-field">
              <label>{{ t('filterCity') }}</label>
              <select v-model="filterCity" @change="loadUniversities">
                <option value="">{{ t('filterAll') }}</option>
                <option v-for="c in filterOptions.cities" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="filter-field">
              <label>{{ t('filterProgram') }}</label>
              <select v-model="filterProgram" @change="loadUniversities">
                <option value="">{{ t('filterAll') }}</option>
                <option v-for="p in filterOptions.programs" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="filter-field">
              <label>{{ t('filterDegree') }}</label>
              <select v-model="filterDegree" @change="loadUniversities">
                <option value="">{{ t('filterAll') }}</option>
                <option v-for="d in filterOptions.degrees" :key="d" :value="d">{{ tDegree(d) }}</option>
              </select>
            </div>
          </div>
          <button v-if="activeFilterCount > 0" class="filter-clear-btn" @click="clearFilters">
            {{ t('clearFilters') }}
          </button>
        </div>
      </div>

      <!-- ── Error banner ── -->
      <div v-if="error" class="error-banner">{{ error }}</div>

      <!-- ── Compare bar ── -->
      <div v-if="currentUser && compareIds.length >= 2" class="compare-bar">
        <span><strong>{{ compareIds.length }}</strong> {{ t('universitiesSelected') }}</span>
        <div class="compare-bar-actions">
          <button class="btn btn-compare" @click="showCompare = true">{{ t('compare') }} ({{ compareIds.length }})</button>
          <button class="btn btn-compare-clear" @click="compareIds = []">{{ t('clear') }}</button>
        </div>
      </div>

      <!-- ── Card grid ── -->
      <div class="main-bg">
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
      </div>

      <!-- ── Footer ── -->
      <footer class="app-footer">
        <div class="footer-left">
          <div class="footer-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <span><strong>UniversityCompare</strong> &mdash; {{ t('footerTagline') }}</span>
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

      <!-- ── Compare modal ── -->
      <CompareView v-if="showCompare" :ids="compareIds" @close="showCompare = false" />

    </template>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Roboto', system-ui, -apple-system, sans-serif;
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
  background: #0f172a;
  color: white;
  flex-shrink: 0;
  border-bottom: 1px solid #2e2e2e;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
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
.brand-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
}
.brand-sub { display: none; }

.header-nav { display: flex; align-items: center; gap: 0.5rem; }

.btn-lang {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: rgba(255,255,255,0.45);
  padding: 0.5rem 1.1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  letter-spacing: 0.06em;
}
.btn-lang:hover { border-color: #555; color: rgba(255,255,255,0.65); }
.lang-sep { color: #3a3a3a; font-size: 0.65rem; }
.lang-active { color: white; }

.btn {
  padding: 0.42rem 0.9rem;
  border: none; border-radius: 6px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600;
  font-family: inherit; transition: all 0.15s; white-space: nowrap;
}
.btn-add { background: #a83248; color: white; }
.btn-add:hover { background: #7a1f32; }
.btn-admin { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-admin:hover { color: white; background: none; }
.btn-login { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-login:hover { color: white; background: none; }
.btn-register { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-register:hover { color: white; background: none; }
.btn-logout { background: #a83248; color: white; border: none; font-size: 0.95rem; padding: 0.5rem 1.1rem; }
.btn-logout:hover { background: #7a1f32; color: white; }
.btn-back-home { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-back-home:hover { color: white; background: none; }
.btn-primary { background: #a83248; color: white; }
.btn-primary:hover { background: #7a1f32; }
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
  width: 34px; height: 34px; border-radius: 50%;
  background: #64748b;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  cursor: pointer;
}
.user-name { font-size: 0.95rem; color: rgba(255,255,255,0.8); font-weight: 500; }

/* ══ HERO ══ */
.hero {
  background: #0f172a;
  padding: 3.5rem 2rem 3rem;
  margin-top: 58px;
  text-align: center;
  color: white;
  border-bottom: 3px solid #a83248;
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
  background: #f5f4f0;
  color: #0f172a;
  outline: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25);
  transition: box-shadow 0.2s;
}
.hero-search-input:focus { box-shadow: 0 4px 28px rgba(168,50,72,0.3); }
.hero-search-input::placeholder { color: #9ca3af; }

.hero-search-row {
  display: flex;
  gap: 0.6rem;
  max-width: 620px;
  margin: 0 auto;
  align-items: stretch;
}
.hero-search-row .hero-search {
  flex: 1;
  max-width: none;
  margin: 0;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0;
  background: none;
  color: rgba(255,255,255,0.8);
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
  flex-shrink: 0;
}
.filter-toggle-btn:hover,
.filter-toggle-btn.active { background: none; color: white; }
.filter-badge {
  background: #a83248;
  color: white;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 6px;
  line-height: 1.4;
}

.filter-panel {
  max-width: 620px;
  margin: 0.85rem auto 0;
  background: #f5f4f0;
  border: 1px solid #e0ddd6;
  border-radius: 12px;
  padding: 1rem 1.1rem 0.9rem;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}
@media (min-width: 540px) {
  .filter-grid { grid-template-columns: repeat(3, 1fr); }
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.filter-field label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #5a5348;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.filter-field select {
  padding: 0.45rem 0.6rem;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.2);
  background: #a83248;
  color: white;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
.filter-field select:focus { border-color: #7a1f32; }
.filter-field select option { background: #7a1f32; color: white; }
.filter-clear-btn {
  margin-top: 0.75rem;
  padding: 0.35rem 0.85rem;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 6px;
  background: transparent;
  color: #3a3a3a;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-clear-btn:hover { background: rgba(0,0,0,0.08); color: #1a1a1a; }

/* ══ ERROR / COMPARE BAR ══ */
.error-banner {
  background: #fef2f2; color: #b91c1c;
  padding: 0.6rem 2rem; font-size: 0.875rem;
  border-bottom: 1px solid #fecaca;
}
.compare-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 2rem;
  background: #e8e5dd;
  color: #1a1a1a; font-size: 0.85rem;
}
.compare-bar strong { font-weight: 800; }
.compare-bar-actions { display: flex; gap: 0.5rem; }
.btn-compare {
  background: #a83248; color: white;
  font-weight: 700; border: none; border-radius: 6px;
  padding: 0.38rem 0.85rem; font-size: 0.85rem; cursor: pointer; font-family: inherit;
}
.btn-compare:hover { background: #7a1f32; }
.btn-compare-clear {
  background: rgba(0,0,0,0.07); color: #3a3a3a;
  border: 1px solid rgba(0,0,0,0.15); border-radius: 6px;
  padding: 0.38rem 0.75rem; font-size: 0.82rem; cursor: pointer; font-family: inherit;
}
.btn-compare-clear:hover { background: rgba(0,0,0,0.13); }

/* ══ MAIN CONTENT ══ */
.main-bg {
  background: #d9d4c7;
  flex: 1;
}
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
  background: #0f172a;
  border-top: 1px solid #2e2e2e;
  flex-shrink: 0;
}
.footer-left { display: flex; align-items: center; gap: 0.55rem; font-size: 0.76rem; color: rgba(255,255,255,0.35); }
.footer-left strong { color: rgba(255,255,255,0.55); }
.footer-logo {
  width: 22px; height: 22px; border-radius: 4px;
  background: #a83248;
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
  background: #f5f4f0;
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
