<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['back'])

const tab = ref('universities')
const error = ref('')

// ── Confirm dialog ────────────────────────────────────────────
const confirm = ref({ show: false, title: '', message: '', resolve: null })

function askConfirm(title, message) {
  return new Promise(resolve => {
    confirm.value = { show: true, title, message, resolve }
  })
}
function confirmYes() { confirm.value.resolve(true);  confirm.value.show = false }
function confirmNo()  { confirm.value.resolve(false); confirm.value.show = false }

// ── Universities ──────────────────────────────────────────────
const universities = ref([])
const uniLoading = ref(false)
const showUniForm = ref(false)
const editingUni = ref(null)
const uniForm = ref(emptyUniForm())

function emptyUniForm() {
  return { name: '', location: '', country: '', website: '', description: '', ranking: '', ranking_world: '', image_url: '' }
}

async function loadUniversities() {
  uniLoading.value = true
  error.value = ''
  try {
    universities.value = await api.admin.universities.list()
  } catch (e) {
    error.value = e.message
  } finally {
    uniLoading.value = false
  }
}

function openAddUni() {
  editingUni.value = null
  uniForm.value = emptyUniForm()
  showUniForm.value = true
}

function openEditUni(uni) {
  editingUni.value = uni
  uniForm.value = {
    name: uni.name,
    location: uni.location,
    country: uni.country,
    website: uni.website || '',
    description: uni.description || '',
    ranking: uni.ranking ?? '',
    ranking_world: uni.ranking_world ?? '',
    image_url: uni.image_url ?? '',
  }
  showUniForm.value = true
}

function closeUniForm() {
  showUniForm.value = false
  editingUni.value = null
}

async function submitUniForm() {
  error.value = ''
  const data = {
    ...uniForm.value,
    ranking: uniForm.value.ranking !== '' ? Number(uniForm.value.ranking) : null,
    ranking_world: uniForm.value.ranking_world !== '' ? Number(uniForm.value.ranking_world) : null,
    image_url: uniForm.value.image_url || null,
  }
  try {
    if (editingUni.value) {
      await api.admin.universities.update(editingUni.value.id, data)
    } else {
      await api.admin.universities.create(data)
    }
    closeUniForm()
    await loadUniversities()
  } catch (e) {
    error.value = e.message
  }
}

async function deleteUni(id, name) {
  const ok = await askConfirm(
    'Dzēst universitāti?',
    `Vai tiešām vēlaties dzēst "${name}"? Tiks dzēstas arī visas tās programmas. Šo darbību nevar atsaukt.`
  )
  if (!ok) return
  error.value = ''
  try {
    await api.admin.universities.delete(id)
    await loadUniversities()
  } catch (e) {
    error.value = e.message
  }
}

// ── Users ─────────────────────────────────────────────────────
const users = ref([])
const usersLoading = ref(false)
const savingRole = ref(null)
const pendingExpertUni = ref({})

async function loadUsers() {
  usersLoading.value = true
  error.value = ''
  try {
    users.value = await api.admin.users.list()
    users.value.forEach(u => {
      pendingExpertUni.value[u.id] = u.expert_university_id ?? ''
    })
  } catch (e) {
    error.value = e.message
  } finally {
    usersLoading.value = false
  }
}

async function changeRole(user, role) {
  if (role === 'expert') {
    user.role = 'expert'
    return
  }
  savingRole.value = user.id
  error.value = ''
  try {
    const res = await api.admin.users.setRole(user.id, role, null)
    user.role = res.role
    user.expert_university_id = null
    pendingExpertUni.value[user.id] = ''
  } catch (e) {
    error.value = e.message
  } finally {
    savingRole.value = null
  }
}

async function assignExpert(user) {
  const uniId = Number(pendingExpertUni.value[user.id])
  if (!uniId) { error.value = 'Izvēlieties universitāti.'; return }
  savingRole.value = user.id
  error.value = ''
  try {
    const res = await api.admin.users.setRole(user.id, 'expert', uniId)
    user.role = res.role
    user.expert_university_id = res.expert_university_id
  } catch (e) {
    error.value = e.message
  } finally {
    savingRole.value = null
  }
}

async function deleteUser(id, name) {
  const ok = await askConfirm(
    'Dzēst lietotāju?',
    `Vai tiešām vēlaties dzēst lietotāju "${name}"? Šo darbību nevar atsaukt.`
  )
  if (!ok) return
  error.value = ''
  try {
    await api.admin.users.delete(id)
    await loadUsers()
  } catch (e) {
    error.value = e.message
  }
}

function switchTab(t) {
  tab.value = t
  error.value = ''
  if (t === 'universities') loadUniversities()
  else { loadUsers(); if (!universities.value.length) loadUniversities() }
}

onMounted(() => loadUniversities())
</script>

<template>
  <div class="admin-page">

    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-inner">
        <button class="back-btn" @click="emit('back')">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M9 1L3 7l6 6"/>
          </svg>
          Atpakaļ
        </button>
        <div class="page-title-group">
          <h1 class="page-title">Administrācijas panelis</h1>
          <p class="page-subtitle">Pārvaldiet universitātes un lietotājus</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="page-body">

      <div class="admin-card">
        <div class="admin-tabs">
          <button :class="['atab', tab === 'universities' && 'active']" @click="switchTab('universities')">
            Universitātes
          </button>
          <button :class="['atab', tab === 'users' && 'active']" @click="switchTab('users')">
            Lietotāji
          </button>
        </div>

        <div v-if="error" class="admin-error">{{ error }}</div>

        <!-- ── Universities tab ── -->
        <div v-if="tab === 'universities'" class="tab-body">
          <div class="tab-toolbar">
            <span class="count">{{ universities.length }} ieraksti</span>
            <button class="btn btn-primary" @click="openAddUni">+ Pievienot universitāti</button>
          </div>

          <div v-if="showUniForm" class="inline-form">
            <h3>{{ editingUni ? 'Rediģēt universitāti' : 'Jauna universitāte' }}</h3>
            <form @submit.prevent="submitUniForm" class="uni-grid">
              <label>Nosaukums *
                <input v-model="uniForm.name" required placeholder="piem. Latvijas Universitāte" />
              </label>
              <label>Pilsēta *
                <input v-model="uniForm.location" required placeholder="piem. Rīga" />
              </label>
              <label>Valsts *
                <input v-model="uniForm.country" required placeholder="piem. Latvija" />
              </label>
              <label>Mājaslapa
                <input v-model="uniForm.website" placeholder="https://..." />
              </label>
              <label class="span2">Attēla URL
                <input v-model="uniForm.image_url" placeholder="https://... (saite uz universitātes attēlu)" />
              </label>
              <label>Reitings Latvijā
                <input v-model="uniForm.ranking" type="number" min="1" placeholder="piem. 3" />
              </label>
              <label>Reitings pasaulē
                <input v-model="uniForm.ranking_world" type="number" min="1" placeholder="piem. 800" />
              </label>
              <label class="span2">Apraksts
                <textarea v-model="uniForm.description" rows="2" placeholder="Īss apraksts..."></textarea>
              </label>
              <div class="form-actions span2">
                <button type="submit" class="btn btn-primary">
                  {{ editingUni ? 'Saglabāt' : 'Pievienot' }}
                </button>
                <button type="button" class="btn btn-secondary" @click="closeUniForm">Atcelt</button>
              </div>
            </form>
          </div>

          <div v-if="uniLoading" class="loading">Ielādē...</div>
          <table v-else-if="universities.length" class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nosaukums</th>
                <th>Atrašanās vieta</th>
                <th>Valsts</th>
                <th>Reitings</th>
                <th>Darbības</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="uni in universities" :key="uni.id">
                <td class="muted">{{ uni.id }}</td>
                <td class="bold">{{ uni.name }}</td>
                <td>{{ uni.location }}</td>
                <td>{{ uni.country }}</td>
                <td>{{ uni.ranking ?? '—' }}</td>
                <td class="actions">
                  <button class="btn btn-edit" @click="openEditUni(uni)">Rediģēt</button>
                  <button class="btn btn-danger btn-sm" @click="deleteUni(uni.id, uni.name)">Dzēst</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">Nav universitāšu.</div>
        </div>

        <!-- ── Users tab ── -->
        <div v-if="tab === 'users'" class="tab-body">
          <div class="tab-toolbar">
            <span class="count">{{ users.length }} lietotāji</span>
          </div>

          <div v-if="usersLoading" class="loading">Ielādē...</div>
          <table v-else-if="users.length" class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vārds</th>
                <th>E-pasts</th>
                <th>Loma</th>
                <th>Universitāte (ekspertam)</th>
                <th>Reģistrēts</th>
                <th>Darbības</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="muted">{{ user.id }}</td>
                <td class="bold">{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <select
                    :value="user.role"
                    @change="changeRole(user, $event.target.value)"
                    :disabled="savingRole === user.id"
                    :class="['role-select', `role-${user.role}`]"
                  >
                    <option value="user">Lietotājs</option>
                    <option value="expert">Eksperts</option>
                    <option value="admin">Administrators</option>
                  </select>
                </td>
                <td>
                  <div v-if="user.role === 'expert'" class="expert-assign">
                    <select v-model="pendingExpertUni[user.id]" class="uni-select" :disabled="savingRole === user.id">
                      <option value="">— izvēlieties —</option>
                      <option v-for="u in universities" :key="u.id" :value="u.id">{{ u.name }}</option>
                    </select>
                    <button class="btn btn-edit btn-sm" :disabled="savingRole === user.id" @click="assignExpert(user)">
                      Saglabāt
                    </button>
                  </div>
                  <span v-else class="muted">—</span>
                </td>
                <td class="muted">{{ new Date(user.created_at).toLocaleDateString('lv-LV') }}</td>
                <td class="actions">
                  <button class="btn btn-danger btn-sm" @click="deleteUser(user.id, user.name)">Dzēst</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">Nav lietotāju.</div>
        </div>
      </div>

    </div>

    <!-- Confirm dialog -->
    <Teleport to="body">
      <div v-if="confirm.show" class="confirm-backdrop">
        <div class="confirm-box">
          <div class="confirm-icon">⚠️</div>
          <h3 class="confirm-title">{{ confirm.title }}</h3>
          <p class="confirm-msg">{{ confirm.message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-danger" @click="confirmYes">Jā, dzēst</button>
            <button class="btn btn-secondary" @click="confirmNo">Atcelt</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f4f0;
  display: flex;
  flex-direction: column;
}

/* Page header */
.page-header {
  background: #1a1a1a;
  border-bottom: 3px solid #0d9488;
  padding: 1.25rem 2rem;
  flex-shrink: 0;
}
.page-header-inner {
  max-width: 1100px;
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
.page-title-group { display: flex; flex-direction: column; gap: 2px; }
.page-title { font-size: 1.15rem; font-weight: 800; color: white; letter-spacing: -0.02em; }
.page-subtitle { font-size: 0.78rem; color: rgba(255,255,255,0.45); }

/* Body */
.page-body {
  flex: 1;
  padding: 2rem;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

/* Admin card */
.admin-card {
  background: #fdfcfa;
  border-radius: 10px;
  border: 1px solid #d4d0c8;
  overflow: hidden;
}

.admin-tabs {
  display: flex;
  border-bottom: 1px solid #d4d0c8;
  background: #f5f4f0;
}
.atab {
  padding: 0.7rem 1.4rem;
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
.atab:hover { color: #444; }
.atab.active {
  color: #0d9488;
  border-bottom-color: #0d9488;
  background: #fdfcfa;
}

.admin-error {
  background: #fef2f2;
  color: #b91c1c;
  border-bottom: 1px solid #fecaca;
  padding: 0.6rem 1.5rem;
  font-size: 0.85rem;
}

.tab-body {
  padding: 1.5rem;
  overflow-x: auto;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.count { font-size: 0.8rem; color: #888; font-weight: 500; }

/* Inline form */
.inline-form {
  background: white;
  border: 1px solid #d4d0c8;
  border-top: 3px solid #0d9488;
  border-radius: 8px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 1.25rem;
}
.inline-form h3 { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; margin-bottom: 0.85rem; }
.uni-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.uni-grid label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.uni-grid input, .uni-grid textarea {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d4d0c8;
  border-radius: 5px;
  font-size: 0.875rem;
  font-family: inherit;
  background: #f5f4f0;
  outline: none;
  transition: border-color 0.15s;
  font-weight: 400;
}
.uni-grid input:focus, .uni-grid textarea:focus {
  border-color: #0d9488;
  background: white;
  box-shadow: 0 0 0 3px rgba(13,148,136,0.12);
}
.span2 { grid-column: span 2; }
.form-actions { display: flex; gap: 0.5rem; }

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  border: 1px solid #d4d0c8;
  border-radius: 8px;
  overflow: hidden;
}
.data-table th {
  text-align: left;
  padding: 0.6rem 0.9rem;
  background: #f5f4f0;
  color: #555;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  border-bottom: 1px solid #d4d0c8;
  white-space: nowrap;
}
.data-table td {
  padding: 0.65rem 0.9rem;
  border-top: 1px solid #ede9e2;
  vertical-align: middle;
  background: white;
}
.data-table tr:hover td { background: #f9f8f5; }
.bold { font-weight: 600; }
.muted { color: #999; font-size: 0.8rem; }
.actions { display: flex; gap: 0.4rem; white-space: nowrap; }

/* Buttons */
.btn {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-primary { background: #0d9488; color: white; }
.btn-primary:hover { background: #0f766e; }
.btn-secondary { background: #f5f4f0; color: #444; border: 1px solid #d4d0c8; }
.btn-secondary:hover { background: #e8e5dd; }
.btn-edit { background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; }
.btn-edit:hover { background: #ccfbf1; }
.btn-danger { background: #b91c1c; color: white; }
.btn-danger:hover { background: #991b1b; }
.btn-sm { padding: 0.22rem 0.55rem; font-size: 0.78rem; }

/* Role select */
.role-select {
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  border: 1px solid #d4d0c8;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  background: #f5f4f0;
}
.role-admin { background: #f0fdfa; color: #0f766e; border-color: #99f6e4; font-weight: 700; }
.role-user { background: #f5f4f0; color: #555; }
.role-expert { background: #fef3c7; color: #92400e; border-color: #fcd34d; font-weight: 700; }

.expert-assign { display: flex; gap: 0.4rem; align-items: center; }
.uni-select { padding: 0.3rem 0.4rem; border: 1px solid #d4d0c8; border-radius: 5px; font-size: 0.78rem; max-width: 200px; background: #f5f4f0; font-family: inherit; }

.loading, .empty-state { color: #999; padding: 1.5rem 0; font-size: 0.9rem; text-align: center; }

/* Confirm dialog */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
}
.confirm-box {
  background: #fdfcfa;
  border-radius: 10px;
  padding: 2rem 2rem 1.75rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
  border: 1px solid #d4d0c8;
  border-top: 4px solid #b91c1c;
}
.confirm-icon { font-size: 2rem; margin-bottom: 0.6rem; }
.confirm-title { font-size: 1.05rem; font-weight: 800; margin-bottom: 0.5rem; color: #1a1a1a; }
.confirm-msg { font-size: 0.875rem; color: #555; line-height: 1.55; margin-bottom: 1.5rem; }
.confirm-actions { display: flex; gap: 0.75rem; justify-content: center; }
.confirm-actions .btn { padding: 0.55rem 1.25rem; font-size: 0.875rem; }
</style>
