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

async function load() {
  try {
    university.value = await api.universities.get(props.id)
  } catch (e) {
    error.value = e.message
  }
}

const mapUrl = computed(() => {
  if (!university.value) return ''
  const q = encodeURIComponent(`${university.value.name}, ${university.value.location}, ${university.value.country}`)
  return `https://www.google.com/maps?q=${q}&output=embed&z=15`
})

watch(() => props.id, load, { immediate: true })
</script>

<template>
  <div class="detail" v-if="university">
    <div v-if="university.image_url" class="detail-image-banner">
      <img :src="university.image_url" :alt="university.name" class="detail-img" />
    </div>
    <div class="detail-header">
      <div>
        <h2>{{ university.name }}</h2>
        <p class="detail-meta">{{ university.location }}, {{ university.country }}</p>
        <div class="ranking-badges">
          <span v-if="university.ranking" class="rank-badge rank-lv">#{{ university.ranking }} Latvijā</span>
          <span v-if="university.ranking_world" class="rank-badge rank-world">&#9733; #{{ university.ranking_world }} pasaulē</span>
        </div>
        <a v-if="university.website" :href="university.website" target="_blank" class="website-link">
          {{ university.website }}
        </a>
      </div>
      <button class="btn btn-secondary" @click="emit('close')">Aizvērt</button>
    </div>

    <div v-if="error" class="inline-error">{{ error }}</div>

    <p v-if="university.description" class="description">{{ university.description }}</p>

    <div class="programs-section">
      <div class="programs-header">
        <h3>Programmas</h3>
      </div>

      <div v-if="!university.programs?.length" class="empty">Programmu vēl nav.</div>
      <table v-else class="programs-table">
        <thead>
          <tr>
            <th>Nosaukums</th>
            <th>Grāds</th>
            <th>Ilgums</th>
            <th>Maksa/gadā</th>
            <th>Valoda</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in university.programs" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.degree }}</td>
            <td>{{ p.duration_years }}g.</td>
            <td>{{ p.tuition_per_year ? `€${p.tuition_per_year.toLocaleString()}` : '—' }}</td>
            <td>{{ p.language }}</td>
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
  <div v-else class="detail-loading">Ielādē...</div>
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

.inline-error {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  margin: 0 2rem 1rem;
}

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
}
.btn-secondary { background: #f5f4f0; color: #444; border: 1px solid #d4d0c8; }
.btn-secondary:hover { background: #e8e5dd; }
</style>
