<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'

const props = defineProps({ ids: Array })
const emit = defineEmits(['close'])

const universities = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const results = await Promise.all(props.ids.map(id => api.universities.get(id)))
    universities.value = results
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function formatTuition(val) {
  if (!val) return '—'
  return '$' + Number(val).toLocaleString()
}
</script>

<template>
  <div class="compare-backdrop" @click.self="emit('close')">
    <div class="compare-panel">

      <div class="compare-header">
        <h2>Universitāšu salīdzinājums</h2>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div v-if="loading" class="state-msg">Ielādē...</div>
      <div v-else-if="error" class="state-msg error">{{ error }}</div>

      <div v-else class="compare-body">
        <div class="compare-grid" :style="{ gridTemplateColumns: `160px repeat(${universities.length}, 1fr)` }">

          <!-- Header row: university names -->
          <div class="cell label-col"></div>
          <div v-for="uni in universities" :key="uni.id" class="cell uni-header">
            <div class="uni-title">{{ uni.name }}</div>
            <div class="uni-sub">{{ uni.location }}, {{ uni.country }}</div>
          </div>

          <!-- Ranking -->
          <div class="cell row-label">Reitings</div>
          <div v-for="uni in universities" :key="uni.id + '-r'" class="cell">
            <span v-if="uni.ranking" class="badge rank">#{{ uni.ranking }}</span>
            <span v-else class="muted">—</span>
          </div>

          <!-- Website -->
          <div class="cell row-label">Mājaslapa</div>
          <div v-for="uni in universities" :key="uni.id + '-w'" class="cell">
            <a v-if="uni.website" :href="uni.website" target="_blank" class="website-link">
              Atvērt ↗
            </a>
            <span v-else class="muted">—</span>
          </div>

          <!-- Description -->
          <div class="cell row-label">Apraksts</div>
          <div v-for="uni in universities" :key="uni.id + '-d'" class="cell desc">
            {{ uni.description || '—' }}
          </div>

          <!-- Programs count -->
          <div class="cell row-label">Programmas</div>
          <div v-for="uni in universities" :key="uni.id + '-pc'" class="cell">
            <span class="badge">{{ uni.programs?.length ?? 0 }} progr.</span>
          </div>

          <!-- Programs detail -->
          <div class="cell row-label top">Programmu saraksts</div>
          <div v-for="uni in universities" :key="uni.id + '-pl'" class="cell programs-cell">
            <div v-if="!uni.programs?.length" class="muted">Nav programmu</div>
            <div v-for="p in uni.programs" :key="p.id" class="program-row">
              <div class="prog-name">{{ p.name }}</div>
              <div class="prog-meta">
                <span class="badge degree">{{ p.degree }}</span>
                <span>{{ p.duration_years }}g.</span>
                <span>{{ formatTuition(p.tuition_per_year) }}/g.</span>
                <span class="muted">{{ p.language }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.compare-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 300;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.compare-panel {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1100px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  background: #1a56db;
  color: white;
  flex-shrink: 0;
}
.compare-header h2 { font-size: 1.1rem; }
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

.state-msg {
  padding: 2rem;
  text-align: center;
  color: #999;
}
.state-msg.error { color: #c53030; }

.compare-body {
  overflow: auto;
  padding: 1.25rem;
}

.compare-grid {
  display: grid;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  font-size: 0.875rem;
  vertical-align: top;
}
.cell:last-child { border-right: none; }

/* University name header */
.uni-header {
  background: #f0f4ff;
  font-weight: 600;
}
.uni-title { font-size: 1rem; font-weight: 700; color: #1a56db; }
.uni-sub { font-size: 0.78rem; color: #666; margin-top: 2px; }

/* Row labels */
.label-col { background: #f7f8fa; }
.row-label {
  background: #f7f8fa;
  font-weight: 600;
  font-size: 0.8rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.row-label.top { vertical-align: top; }

/* Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #edf2ff;
  color: #1a56db;
}
.badge.rank { background: #fef3c7; color: #92400e; }
.badge.degree { background: #e0f2fe; color: #0369a1; }

.muted { color: #aaa; font-size: 0.82rem; }
.desc { color: #555; font-size: 0.82rem; line-height: 1.5; }
.website-link { color: #1a56db; font-size: 0.82rem; text-decoration: none; }
.website-link:hover { text-decoration: underline; }

/* Programs */
.programs-cell { display: flex; flex-direction: column; gap: 0.6rem; }
.program-row { padding: 0.5rem; background: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0; }
.prog-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; }
.prog-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.78rem; color: #555; }
</style>
