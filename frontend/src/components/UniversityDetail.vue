<script setup>
import { ref, watch } from 'vue'
import { api } from '../api.js'

const props = defineProps({ id: Number })
const emit = defineEmits(['close', 'updated'])

const university = ref(null)
const error = ref('')
const showAddProgram = ref(false)
const newProgram = ref({ name: '', degree: 'BSc', duration_years: 3, tuition_per_year: '', language: 'English' })

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
  newProgram.value = { name: '', degree: 'BSc', duration_years: 3, tuition_per_year: '', language: 'English' }
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
          <span v-if="university.ranking"> · Rank #{{ university.ranking }}</span>
        </p>
        <a v-if="university.website" :href="university.website" target="_blank" class="website-link">
          {{ university.website }}
        </a>
      </div>
      <button class="btn btn-secondary" @click="emit('close')">Close</button>
    </div>

    <p v-if="university.description" class="description">{{ university.description }}</p>

    <div class="programs-section">
      <div class="programs-header">
        <h3>Programs</h3>
        <button class="btn btn-primary" @click="showAddProgram = !showAddProgram">+ Add Program</button>
      </div>

      <form v-if="showAddProgram" class="add-program-form" @submit.prevent="addProgram">
        <input v-model="newProgram.name" placeholder="Program name" required />
        <select v-model="newProgram.degree">
          <option>BSc</option><option>BA</option><option>MSc</option><option>MA</option><option>PhD</option>
        </select>
        <input v-model.number="newProgram.duration_years" type="number" step="0.5" min="1" placeholder="Duration (years)" required />
        <input v-model.number="newProgram.tuition_per_year" type="number" placeholder="Tuition/year (optional)" />
        <input v-model="newProgram.language" placeholder="Language" />
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Add</button>
          <button type="button" class="btn btn-secondary" @click="showAddProgram = false">Cancel</button>
        </div>
      </form>

      <div v-if="university.programs?.length === 0" class="empty">No programs yet.</div>
      <table v-else class="programs-table">
        <thead>
          <tr><th>Name</th><th>Degree</th><th>Duration</th><th>Tuition/yr</th><th>Language</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in university.programs" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.degree }}</td>
            <td>{{ p.duration_years }}y</td>
            <td>{{ p.tuition_per_year ? `$${p.tuition_per_year.toLocaleString()}` : '—' }}</td>
            <td>{{ p.language }}</td>
            <td><button class="btn btn-danger btn-sm" @click="deleteProgram(p.id)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="detail-loading">Loading...</div>
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
.btn-sm { padding: 0.2rem 0.5rem; font-size: 0.78rem; }
</style>
