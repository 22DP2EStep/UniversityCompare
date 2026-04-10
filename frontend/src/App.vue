<script setup>
import { ref, onMounted } from 'vue'
import { api } from './api.js'
import LoginRegister from './components/LoginRegister.vue'
import UniversityList from './components/UniversityList.vue'
import UniversityDetail from './components/UniversityDetail.vue'
import UniversityForm from './components/UniversityForm.vue'
import AdminPage from './components/AdminPage.vue'
import CompareView from './components/CompareView.vue'

const currentUser = ref(null)
const universities = ref([])
const selectedId = ref(null)
const showForm = ref(false)
const showAdmin = ref(false)
const showAuthModal = ref(false)
const search = ref('')
const error = ref('')

// Compare
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
  showAdmin.value = false
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

async function handleCreate(data) {
  await api.universities.create(data)
  showForm.value = false
  await loadUniversities()
}

</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>UniversityCompare</h1>
      <div class="header-actions">
        <input
          v-model="search"
          @input="loadUniversities"
          placeholder="Meklēt universitātes..."
          class="search-input"
        />

        <template v-if="currentUser">
          <button class="btn btn-primary" @click="showForm = true">+ Pievienot universitāti</button>
          <button v-if="currentUser.role === 'admin'" class="btn btn-admin" @click="showAdmin = true">Admin</button>
          <div class="user-menu">
            <span class="user-name">{{ currentUser.name }}</span>
            <button class="btn btn-logout" @click="handleLogout">Iziet</button>
          </div>
        </template>

        <template v-else>
          <button class="btn btn-login" @click="showAuthModal = true">Pieslēgties / Reģistrēties</button>
        </template>
      </div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Compare bar -->
    <div v-if="currentUser && compareIds.length >= 2" class="compare-bar">
      <span>Izvēlētas {{ compareIds.length }} universitātes salīdzinājumam</span>
      <div class="compare-bar-actions">
        <button class="btn btn-compare" @click="showCompare = true">
          Salīdzināt ({{ compareIds.length }})
        </button>
        <button class="btn btn-compare-clear" @click="compareIds = []">Notīrīt</button>
      </div>
    </div>

    <main class="app-body">
      <UniversityList
        :universities="universities"
        :selectedId="selectedId"
        :compareIds="compareIds"
        :canCompare="!!currentUser"
        @select="selectedId = $event"
        @toggle-compare="toggleCompare"
      />
      <UniversityDetail
        v-if="selectedId"
        :id="selectedId"
        :currentUser="currentUser"
        @close="selectedId = null"
        @updated="loadUniversities"
      />
      <div v-else class="detail-placeholder">
        <template v-if="currentUser">
          <p>Atlasiet universitāti, lai skatītu informāciju</p>
          <p class="hint">Vai atzīmējiet vairākas un nospiediet "Salīdzināt"</p>
        </template>
        <template v-else>
          <p>Atlasiet universitāti, lai skatītu informāciju</p>
          <p class="hint"><span class="login-link" @click="showAuthModal = true">Pieslēdzieties</span>, lai salīdzinātu universitātes</p>
        </template>
      </div>
    </main>

    <UniversityForm
      v-if="showForm"
      @submit="handleCreate"
      @cancel="showForm = false"
    />

    <AdminPage
      v-if="showAdmin"
      @close="showAdmin = false; loadUniversities()"
    />

    <LoginRegister
      v-if="showAuthModal"
      @authenticated="handleAuthenticated"
      @close="showAuthModal = false"
    />

    <CompareView
      v-if="showCompare"
      :ids="compareIds"
      @close="showCompare = false"
    />

  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }

.app { display: flex; flex-direction: column; height: 100vh; }

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #1a56db;
  color: white;
  flex-shrink: 0;
}
.app-header h1 { font-size: 1.4rem; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.search-input {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  width: 220px;
}

.btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}
.btn-primary { background: white; color: #1a56db; }
.btn-danger { background: #e53e3e; color: white; }
.btn-secondary { background: #e2e8f0; color: #333; }
.btn-logout { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.4); }
.btn-logout:hover { background: rgba(255,255,255,0.25); }
.btn-admin { background: #fbbf24; color: #1a1a1a; font-weight: 600; }
.btn-admin:hover { background: #f59e0b; }
.btn-login { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.5); }
.btn-login:hover { background: rgba(255,255,255,0.25); }

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(255,255,255,0.3);
}
.user-name { font-size: 0.85rem; opacity: 0.9; }

.error-banner {
  background: #fed7d7;
  color: #c53030;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  flex-shrink: 0;
}

/* Compare bar */
.compare-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.5rem;
  background: #0f3a99;
  color: white;
  font-size: 0.88rem;
  flex-shrink: 0;
}
.compare-bar-actions { display: flex; gap: 0.5rem; }
.btn-compare { background: #fbbf24; color: #1a1a1a; font-weight: 600; }
.btn-compare:hover { background: #f59e0b; }
.btn-compare-clear { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }
.btn-compare-clear:hover { background: rgba(255,255,255,0.25); }

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.detail-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 0.4rem;
}
.hint { font-size: 0.82rem; }
.login-link { color: #1a56db; cursor: pointer; text-decoration: underline; }

</style>
