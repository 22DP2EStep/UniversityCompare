<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'

const emit = defineEmits(['close'])

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
const editingUni = ref(null) // null = add mode, object = edit mode
const uniForm = ref(emptyUniForm())

function emptyUniForm() {
  return { name: '', location: '', country: '', website: '', description: '', ranking: '' }
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
// track pending expert university selection per user row
const pendingExpertUni = ref({}) // { [userId]: universityId }

async function loadUsers() {
  usersLoading.value = true
  error.value = ''
  try {
    users.value = await api.admin.users.list()
    // initialise pending selections from current data
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
    // don't save yet — wait for university selection
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
  <div class="admin-backdrop" @click.self="emit('close')">
    <div class="admin-panel">

      <div class="admin-header">
        <h2>Administrācijas panelis</h2>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

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

        <!-- Add / Edit form -->
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
            <label>Pasaules reitings
              <input v-model="uniForm.ranking" type="number" min="1" placeholder="piem. 150" />
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

    <!-- ── Confirm dialog ── -->
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
.admin-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 200;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.admin-panel {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 860px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  background: #1a56db;
  color: white;
}
.admin-header h2 { font-size: 1.1rem; }
.close-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  color: white;
  font-size: 1rem;
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
}
.close-btn:hover { background: rgba(255,255,255,0.25); }

.admin-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f7fafc;
}
.atab {
  padding: 0.7rem 1.4rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.atab.active {
  color: #1a56db;
  border-bottom-color: #1a56db;
  background: white;
}

.admin-error {
  background: #fff5f5;
  color: #c53030;
  border-bottom: 1px solid #fed7d7;
  padding: 0.6rem 1.5rem;
  font-size: 0.85rem;
}

.tab-body {
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.count { font-size: 0.82rem; color: #888; }

/* Inline form */
.inline-form {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
}
.inline-form h3 { font-size: 0.95rem; margin-bottom: 0.75rem; color: #333; }
.uni-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.uni-grid label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
}
.uni-grid input, .uni-grid textarea {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 0.875rem;
  font-family: inherit;
}
.span2 { grid-column: span 2; }
.form-actions { display: flex; gap: 0.5rem; }

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.data-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: #f0f4ff;
  color: #555;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.data-table td {
  padding: 0.6rem 0.75rem;
  border-top: 1px solid #f0f0f0;
  vertical-align: middle;
}
.data-table tr:hover td { background: #fafbff; }
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
  font-weight: 500;
}
.btn-primary { background: #1a56db; color: white; }
.btn-primary:hover { background: #1648c0; }
.btn-secondary { background: #e2e8f0; color: #333; }
.btn-secondary:hover { background: #d1d9e6; }
.btn-edit { background: #edf2ff; color: #1a56db; border: 1px solid #c3d3f5; }
.btn-edit:hover { background: #dce8ff; }
.btn-danger { background: #e53e3e; color: white; }
.btn-danger:hover { background: #c53030; }
.btn-sm { padding: 0.25rem 0.55rem; font-size: 0.78rem; }

/* Role select */
.role-select {
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  border: 1px solid #ccc;
  font-size: 0.82rem;
  cursor: pointer;
}
.role-admin { background: #ebf4ff; color: #1a56db; border-color: #b3d0f7; font-weight: 600; }
.role-user { background: #f7f7f7; color: #555; }
.role-expert { background: #f0fff4; color: #276749; border-color: #9ae6b4; font-weight: 600; }

.expert-assign { display: flex; gap: 0.4rem; align-items: center; }
.uni-select { padding: 0.3rem 0.4rem; border: 1px solid #ccc; border-radius: 5px; font-size: 0.78rem; max-width: 200px; }

.loading, .empty-state { color: #999; padding: 1rem 0; font-size: 0.9rem; }

/* Confirm dialog */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
}
.confirm-box {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
}
.confirm-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.confirm-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: #1a1a1a; }
.confirm-msg { font-size: 0.875rem; color: #555; line-height: 1.5; margin-bottom: 1.5rem; }
.confirm-actions { display: flex; gap: 0.75rem; justify-content: center; }
.confirm-actions .btn { padding: 0.55rem 1.25rem; font-size: 0.9rem; }
</style>
