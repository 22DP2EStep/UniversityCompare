<script setup>
import { ref, watch, computed } from 'vue'
import { api } from '../api.js'
import { t, tDegree } from '../i18n.js'

const props = defineProps({
  id: Number,
  currentUser: Object,
})
const emit = defineEmits(['close', 'updated'])

const university = ref(null)
const error = ref('')
const editing = ref(false)
const saving = ref(false)
const progError = ref('')

// Edit form state
const form = ref({})

// New program form
const showProgForm = ref(false)
const progForm = ref(emptyProg())

function emptyProg() {
  return { name: '', degree: '', duration_years: '', tuition_per_year: '', language: '' }
}

const mapUrl = computed(() => {
  if (!university.value) return ''
  const q = encodeURIComponent(`${university.value.name}, ${university.value.location}, ${university.value.country}`)
  return `https://www.google.com/maps?q=${q}&output=embed&z=15`
})

const canEdit = computed(() => {
  if (!props.currentUser || !university.value) return false
  if (props.currentUser.role === 'admin') return true
  return props.currentUser.role === 'expert' && props.currentUser.expert_university_id === university.value.id
})

async function load() {
  editing.value = false
  error.value = ''
  try {
    university.value = await api.universities.get(props.id)
  } catch (e) {
    error.value = e.message
  }
}

function startEdit() {
  form.value = {
    name: university.value.name,
    location: university.value.location,
    country: university.value.country,
    website: university.value.website || '',
    description: university.value.description || '',
    ranking: university.value.ranking ?? '',
    ranking_world: university.value.ranking_world ?? '',
    image_url: university.value.image_url || '',
  }
  editing.value = true
  error.value = ''
}

function cancelEdit() {
  editing.value = false
  error.value = ''
}

async function saveEdit() {
  saving.value = true
  error.value = ''
  try {
    const data = {
      ...form.value,
      ranking: form.value.ranking !== '' ? Number(form.value.ranking) : null,
      ranking_world: form.value.ranking_world !== '' ? Number(form.value.ranking_world) : null,
      image_url: form.value.image_url || null,
    }
    await api.universities.update(university.value.id, data)
    await load()
    emit('updated')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function deleteProgram(id) {
  progError.value = ''
  try {
    await api.programs.delete(id)
    university.value.programs = university.value.programs.filter(p => p.id !== id)
    emit('updated')
  } catch (e) {
    progError.value = e.message
  }
}

async function addProgram() {
  progError.value = ''
  if (!progForm.value.name || !progForm.value.degree || !progForm.value.duration_years) {
    progError.value = t('colName') + ', ' + t('colDegree') + ', ' + t('durationYears')
    return
  }
  try {
    const created = await api.programs.create({
      university_id: university.value.id,
      name: progForm.value.name,
      degree: progForm.value.degree,
      duration_years: Number(progForm.value.duration_years),
      tuition_per_year: progForm.value.tuition_per_year ? Number(progForm.value.tuition_per_year) : null,
      language: progForm.value.language || 'English',
    })
    university.value.programs = [...(university.value.programs || []), created]
    progForm.value = emptyProg()
    showProgForm.value = false
    emit('updated')
  } catch (e) {
    progError.value = e.message
  }
}

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="detail" v-if="university">
    <div v-if="university.image_url" class="detail-image-banner">
      <img :src="university.image_url" :alt="university.name" class="detail-img" />
    </div>

    <!-- ── View mode header ── -->
    <div v-if="!editing" class="detail-header">
      <div>
        <h2>{{ university.name }}</h2>
        <p class="detail-meta">{{ university.location }}, {{ university.country }}</p>
        <div class="ranking-badges">
          <span v-if="university.ranking" class="rank-badge rank-lv">#{{ university.ranking }} {{ t('inLatvia') }}</span>
          <span v-if="university.ranking_world" class="rank-badge rank-world">&#9733; #{{ university.ranking_world }} {{ t('inWorld') }}</span>
        </div>
        <a v-if="university.website" :href="university.website" target="_blank" class="website-link">
          {{ university.website }}
        </a>
      </div>
      <div class="header-actions">
        <button v-if="canEdit" class="btn btn-edit-uni" @click="startEdit">&#9998; {{ t('editUniversity') }}</button>
        <button class="btn btn-secondary" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>

    <!-- ── Edit mode header ── -->
    <div v-else class="edit-section">
      <div class="edit-section-title">&#9998; {{ t('editUniversity') }}</div>
      <div v-if="error" class="inline-error">{{ error }}</div>
      <div class="edit-grid">
        <label class="edit-label">{{ t('nameField') }}
          <input v-model="form.name" class="edit-input" required />
        </label>
        <label class="edit-label">{{ t('cityField') }}
          <input v-model="form.location" class="edit-input" required />
        </label>
        <label class="edit-label">{{ t('countryField') }}
          <input v-model="form.country" class="edit-input" required />
        </label>
        <label class="edit-label">{{ t('websiteField') }}
          <input v-model="form.website" class="edit-input" placeholder="https://..." />
        </label>
        <label class="edit-label">{{ t('imageUrlField') }}
          <input v-model="form.image_url" class="edit-input" placeholder="https://..." />
        </label>
        <label class="edit-label">{{ t('rankingLatviaField') }}
          <input v-model="form.ranking" class="edit-input" type="number" min="1" />
        </label>
        <label class="edit-label">{{ t('rankingWorldField') }}
          <input v-model="form.ranking_world" class="edit-input" type="number" min="1" />
        </label>
        <label class="edit-label span2">{{ t('descriptionField') }}
          <textarea v-model="form.description" class="edit-input" rows="3"></textarea>
        </label>
      </div>
      <div class="edit-actions">
        <button class="btn btn-primary" :disabled="saving" @click="saveEdit">
          {{ saving ? t('saving') : t('saveChanges') }}
        </button>
        <button class="btn btn-secondary" @click="cancelEdit">{{ t('cancel') }}</button>
      </div>
    </div>

    <div v-if="error && !editing" class="inline-error mx">{{ error }}</div>

    <p v-if="university.description && !editing" class="description">{{ university.description }}</p>

    <!-- ── Programs section ── -->
    <div class="programs-section">
      <div class="programs-header">
        <h3>{{ t('programs') }}</h3>
        <button v-if="canEdit" class="btn btn-add-prog" @click="showProgForm = !showProgForm">
          {{ t('addProgram') }}
        </button>
      </div>

      <!-- Add program form -->
      <div v-if="showProgForm && canEdit" class="prog-form">
        <div v-if="progError" class="inline-error">{{ progError }}</div>
        <div class="prog-form-grid">
          <label class="edit-label">{{ t('colName') }} *
            <input v-model="progForm.name" class="edit-input" />
          </label>
          <label class="edit-label">{{ t('colDegree') }} *
            <input v-model="progForm.degree" class="edit-input" placeholder="Bachelor, Master..." />
          </label>
          <label class="edit-label">{{ t('durationYears') }} *
            <input v-model="progForm.duration_years" class="edit-input" type="number" min="1" />
          </label>
          <label class="edit-label">{{ t('tuitionYear') }}
            <input v-model="progForm.tuition_per_year" class="edit-input" type="number" min="0" />
          </label>
          <label class="edit-label">{{ t('colLanguage') }}
            <input v-model="progForm.language" class="edit-input" placeholder="English, Latvian..." />
          </label>
        </div>
        <div class="edit-actions">
          <button class="btn btn-primary" @click="addProgram">{{ t('add') }}</button>
          <button class="btn btn-secondary" @click="showProgForm = false; progForm = emptyProg()">{{ t('cancel') }}</button>
        </div>
      </div>

      <div v-if="!university.programs?.length" class="empty">{{ t('noPrograms') }}</div>
      <table v-else class="programs-table">
        <thead>
          <tr>
            <th>{{ t('colName') }}</th>
            <th>{{ t('colDegree') }}</th>
            <th>{{ t('colDuration') }}</th>
            <th>{{ t('colFee') }}</th>
            <th>{{ t('colLanguage') }}</th>
            <th v-if="canEdit"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in university.programs" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ tDegree(p.degree) }}</td>
            <td>{{ p.duration_years }}{{ t('yearAbbr') }}</td>
            <td>{{ p.tuition_per_year ? `€${p.tuition_per_year.toLocaleString()}` : '—' }}</td>
            <td>{{ p.language }}</td>
            <td v-if="canEdit">
              <button class="btn-del-prog" @click="deleteProgram(p.id)" :title="t('delete')">&#10005;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Map section -->
    <div class="map-section">
      <div class="map-header">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M8 1C5.24 1 3 3.24 3 6c0 4.25 5 9 5 9s5-4.75 5-9c0-2.76-2.24-5-5-5z"/>
          <circle cx="8" cy="6" r="1.5"/>
        </svg>
        {{ university.location }}, {{ university.country }}
      </div>
      <div class="map-frame">
        <iframe
          :src="mapUrl"
          class="map-iframe"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      </div>
    </div>

  </div>
  <div v-else class="detail-loading">{{ t('loading') }}</div>
</template>

<style scoped>
.detail {
  flex: 1;
  overflow-y: auto;
  background: white;
  max-height: 85vh;
}
.detail-image-banner {
  width: 100%;
  height: 200px;
  overflow: hidden;
  flex-shrink: 0;
}
.detail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.detail-header {
  padding: 1.75rem 2rem 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}
.detail-header h2 { font-size: 1.4rem; font-weight: 800; color: #1a1a1a; letter-spacing: -0.02em; }
.detail-meta { color: #666; font-size: 0.9rem; margin-top: 4px; }

.header-actions { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; flex-shrink: 0; }

.ranking-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 5px; margin-bottom: 6px; }
.rank-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 10px;
  font-size: 0.75rem; font-weight: 700;
}
.rank-lv { background: #f0fdfa; color: #0f766e; }
.rank-world { background: #fef3c7; color: #92400e; }

.website-link { font-size: 0.85rem; color: #0d9488; text-decoration: none; }
.website-link:hover { text-decoration: underline; }

/* Edit section */
.edit-section {
  margin: 1.5rem 2rem 0;
  background: #f9f8f5;
  border: 1px solid #d4d0c8;
  border-top: 3px solid #0d9488;
  border-radius: 8px;
  padding: 1.1rem 1.25rem 1.25rem;
}
.edit-section-title {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0d9488;
  margin-bottom: 0.9rem;
}
.edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.edit-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.span2 { grid-column: span 2; }
.edit-input {
  padding: 0.42rem 0.6rem;
  border: 1px solid #d4d0c8;
  border-radius: 5px;
  font-size: 0.875rem;
  font-family: inherit;
  background: white;
  outline: none;
  font-weight: 400;
  transition: border-color 0.15s;
}
.edit-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13,148,136,0.12);
}
textarea.edit-input { resize: vertical; }
.edit-actions { display: flex; gap: 0.5rem; margin-top: 0.85rem; }

/* Add program form */
.prog-form {
  background: #f9f8f5;
  border: 1px solid #d4d0c8;
  border-top: 3px solid #2563eb;
  border-radius: 8px;
  padding: 1rem 1.1rem 1.1rem;
  margin-bottom: 1rem;
}
.prog-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.inline-error {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.inline-error.mx { margin: 0 2rem 1rem; }

.description { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.6; padding: 0 2rem; }

.programs-section { margin-top: 1.5rem; padding: 0 2rem; }
.programs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.programs-header h3 { font-size: 1rem; font-weight: 700; color: #1a1a1a; }

.programs-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d4d0c8;
  border-radius: 8px;
  overflow: hidden;
}
.programs-table th {
  background: #f5f4f0;
  text-align: left;
  padding: 0.6rem 0.75rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #555;
  font-weight: 700;
  border-bottom: 1px solid #d4d0c8;
}
.programs-table td {
  padding: 0.6rem 0.75rem;
  font-size: 0.875rem;
  border-top: 1px solid #ede9e2;
  background: white;
  color: #1a1a1a;
}
.programs-table tr:hover td { background: #f9f8f5; }

.empty { color: #999; font-size: 0.9rem; padding: 0.5rem 0; }
.detail-loading { flex: 1; padding: 2rem; color: #999; }

/* Map */
.map-section {
  margin-top: 1.75rem;
  padding: 0 2rem 2rem;
}
.map-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 0.65rem;
}
.map-frame {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #d4d0c8;
  height: 260px;
}
.map-iframe {
  width: 100%;
  height: 100%;
  display: block;
  border: none;
}

/* Buttons */
.btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}
.btn-secondary { background: #f5f4f0; color: #444; border: 1px solid #d4d0c8; }
.btn-secondary:hover { background: #e8e5dd; }
.btn-primary { background: #0d9488; color: white; }
.btn-primary:hover { background: #0f766e; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-edit-uni { background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; font-size: 0.82rem; }
.btn-edit-uni:hover { background: #ccfbf1; }
.btn-add-prog { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 0.8rem; padding: 0.3rem 0.7rem; }
.btn-add-prog:hover { background: #dbeafe; }
.btn-del-prog {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.btn-del-prog:hover { color: #b91c1c; background: #fef2f2; }
</style>
