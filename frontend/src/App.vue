<script setup>
import { ref, onMounted } from 'vue'
import { api } from './api.js'
import UniversityList from './components/UniversityList.vue'
import UniversityDetail from './components/UniversityDetail.vue'
import UniversityForm from './components/UniversityForm.vue'

const universities = ref([])
const selectedId = ref(null)
const showForm = ref(false)
const search = ref('')
const error = ref('')

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

async function handleDelete(id) {
  await api.universities.delete(id)
  if (selectedId.value === id) selectedId.value = null
  await loadUniversities()
}

onMounted(loadUniversities)
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>UniversityCompare</h1>
      <div class="header-actions">
        <input
          v-model="search"
          @input="loadUniversities"
          placeholder="Search universities..."
          class="search-input"
        />
        <button class="btn btn-primary" @click="showForm = true">+ Add University</button>
      </div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <main class="app-body">
      <UniversityList
        :universities="universities"
        :selectedId="selectedId"
        @select="selectedId = $event"
        @delete="handleDelete"
      />
      <UniversityDetail
        v-if="selectedId"
        :id="selectedId"
        @close="selectedId = null"
        @updated="loadUniversities"
      />
      <div v-else class="detail-placeholder">
        <p>Select a university to view details</p>
      </div>
    </main>

    <UniversityForm
      v-if="showForm"
      @submit="handleCreate"
      @cancel="showForm = false"
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

.error-banner {
  background: #fed7d7;
  color: #c53030;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.detail-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
</style>
