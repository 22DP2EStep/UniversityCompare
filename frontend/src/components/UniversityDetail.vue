<script setup>
import { ref, watch, computed } from 'vue'
import { api } from '../api.js'

const props = defineProps({
  id: Number,
  currentUser: Object,
})
const emit = defineEmits(['close', 'updated'])

const university = ref(null)
const error = ref('')
const showAddProgram = ref(false)
const newProgram = ref({ name: '', degree: 'BSc', duration_years: 3, tuition_per_year: '', language: 'Latviešu' })

// Edit university info
const showEditUni = ref(false)
const editForm = ref({})
const saving = ref(false)

const canEdit = computed(() => {
  if (!props.currentUser || !university.value) return false
  if (props.currentUser.role === 'admin') return true
  return props.currentUser.role === 'expert' && props.currentUser.expert_university_id === university.value.id
})

function openEdit() {
  editForm.value = {
    name: university.value.name,
    location: university.value.location,
    country: university.value.country,
    website: university.value.website || '',
    description: university.value.description || '',
    ranking: university.value.ranking ?? '',
  }
  showEditUni.value = true
}

async function saveEdit() {
  saving.value = true
  error.value = ''
  try {
    await api.universities.update(props.id, {
      ...editForm.value,
      ranking: editForm.value.ranking !== '' ? Number(editForm.value.ranking) : null,
    })
    showEditUni.value = false
    await load()
    emit('updated')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function load() {
  try {
    university.value = await api.universities.get(props.id)
  } catch (e) {
    error.value = e.message
  }
}

async function addProgram() {
  await api.programs.create({ ...newProgram.value, university_id: props.id })
  showAddProgram.value = false
  newProgram.value = { name: '', degree: 'BSc', duration_years: 3, tuition_per_year: '', language: 'Latviešu' }
  await load()
}

async function deleteProgram(id) {
  await api.programs.delete(id)
  await load()
}

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="detail" v-if="university">
    <div class="detail-header">
      <div>
        <h2>{{ university.name }}</h2>
        <p class="detail-meta">{{ university.location }}, {{ university.country }}
          <span v-if="university.ranking"> · Reitings #{{ university.ranking }}</span>
        </p>
        <a v-if="university.website" :href="university.website" target="_blank" class="website-link">
          {{ university.website }}
        </a>
      </div>
      <div class="header-btns">
        <button v-if="canEdit && !showEditUni" class="btn btn-edit-uni" @click="openEdit">Rediģēt info</button>
        <button class="btn btn-secondary" @click="emit('close')">Aizvērt</button>
      </div>
    </div>

    <div v-if="error" class="inline-error">{{ error }}</div>

    <!-- Edit university info form -->
    <div v-if="showEditUni" class="edit-uni-form">
      <h3>Rediģēt universitātes informāciju</h3>
      <div class="edit-grid">
        <label>Nosaukums *
          <input v-model="editForm.name" required />
        </label>
        <label>Pilsēta *
          <input v-model="editForm.location" required />
        </label>
        <label>Valsts *
          <input v-model="editForm.country" required />
        </label>
        <label>Mājaslapa
          <input v-model="editForm.website" placeholder="https://..." />
        </label>
        <label>Reitings
          <input v-model="editForm.ranking" type="number" min="1" placeholder="piem. 3" />
        </label>
        <label class="span2">Apraksts
          <textarea v-model="editForm.description" rows="2" placeholder="Īss apraksts..."></textarea>
        </label>
        <div class="edit-actions span2">
          <button class="btn btn-primary" :disabled="saving" @click="saveEdit">
            {{ saving ? 'Saglabā...' : 'Saglabāt' }}
          </button>
          <button class="btn btn-secondary" @click="showEditUni = false">Atcelt</button>
        </div>
      </div>
    </div>

    <p v-if="university.description && !showEditUni" class="description">{{ university.description }}</p>

    <div class="programs-section">
      <div class="programs-header">
        <h3>Programmas</h3>
        <button v-if="currentUser" class="btn btn-primary" @click="showAddProgram = !showAddProgram">+ Pievienot programmu</button>
      </div>

      <form v-if="showAddProgram" class="add-program-form" @submit.prevent="addProgram">
        <input v-model="newProgram.name" placeholder="Programmas nosaukums" required />
        <select v-model="newProgram.degree">
          <option>BSc</option><option>BA</option><option>MSc</option><option>MA</option><option>PhD</option>
        </select>
        <input v-model.number="newProgram.duration_years" type="number" step="0.5" min="1" placeholder="Ilgums (gadi)" required />
        <input v-model.number="newProgram.tuition_per_year" type="number" placeholder="Mācību maksa/gadā (nav obligāti)" />
        <input v-model="newProgram.language" placeholder="Mācību valoda" />
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Pievienot</button>
          <button type="button" class="btn btn-secondary" @click="showAddProgram = false">Atcelt</button>
        </div>
      </form>

      <div v-if="university.programs?.length === 0" class="empty">Programmu vēl nav.</div>
      <table v-else class="programs-table">
        <thead>
          <tr><th>Nosaukums</th><th>Grāds</th><th>Ilgums</th><th>Maksa/gadā</th><th>Valoda</th><th v-if="currentUser"></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in university.programs" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.degree }}</td>
            <td>{{ p.duration_years }}g.</td>
            <td>{{ p.tuition_per_year ? `€${p.tuition_per_year.toLocaleString()}` : '—' }}</td>
            <td>{{ p.language }}</td>
            <td v-if="currentUser"><button class="btn btn-danger btn-sm" @click="deleteProgram(p.id)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="detail-loading">Ielādē...</div>
</template>

<style scoped>
.detail {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: #fafafa;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.detail-header h2 { font-size: 1.4rem; }
.detail-meta { color: #666; font-size: 0.9rem; margin-top: 4px; }
.website-link { font-size: 0.85rem; color: #1a56db; }
.header-btns { display: flex; gap: 0.5rem; flex-shrink: 0; }

.inline-error {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

/* Edit form */
.edit-uni-form {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
}
.edit-uni-form h3 { font-size: 0.95rem; margin-bottom: 0.75rem; color: #92400e; }
.edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.edit-grid label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
}
.edit-grid input, .edit-grid textarea {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 0.875rem;
  font-family: inherit;
}
.span2 { grid-column: span 2; }
.edit-actions { display: flex; gap: 0.5rem; }

.description { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; }

.programs-section { margin-top: 1.5rem; }
.programs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.programs-header h3 { font-size: 1rem; }

.add-program-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}
.add-program-form input,
.add-program-form select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 0.875rem;
}
.form-actions { grid-column: span 2; display: flex; gap: 0.5rem; }

.programs-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.programs-table th {
  background: #f0f4ff;
  text-align: left;
  padding: 0.6rem 0.75rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #555;
}
.programs-table td {
  padding: 0.6rem 0.75rem;
  font-size: 0.875rem;
  border-top: 1px solid #f0f0f0;
}
.empty { color: #999; font-size: 0.9rem; padding: 0.5rem 0; }
.detail-loading { flex: 1; padding: 2rem; color: #999; }

.btn { padding: 0.4rem 0.9rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.btn-primary { background: #1a56db; color: white; }
.btn-secondary { background: #e2e8f0; color: #333; }
.btn-danger { background: #e53e3e; color: white; }
.btn-edit-uni { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
.btn-edit-uni:hover { background: #fef3c7; }
.btn-sm { padding: 0.2rem 0.5rem; font-size: 0.78rem; }
</style>
