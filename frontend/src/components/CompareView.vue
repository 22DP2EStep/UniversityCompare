<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'
import { t, tDegree } from '../i18n.js'

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
        <div>
          <h2>{{ t('compareTitle') }}</h2>
          <p class="compare-sub">{{ ids.length }} {{ t('universitiesSelected') }}</p>
        </div>
        <button class="close-btn" @click="emit('close')">&#10005;</button>
      </div>

      <div v-if="loading" class="state-msg">{{ t('loading') }}</div>
      <div v-else-if="error" class="state-msg error">{{ error }}</div>

      <div v-else class="compare-body">
        <div class="compare-grid" :style="{ gridTemplateColumns: `180px repeat(${universities.length}, 1fr)` }">

          <!-- Header row -->
          <div class="cell label-col"></div>
          <div v-for="uni in universities" :key="uni.id" class="cell uni-header">
            <div class="uni-title">{{ uni.name }}</div>
            <div class="uni-sub">{{ uni.location }}, {{ uni.country }}</div>
          </div>

          <!-- Latvia ranking -->
          <div class="cell row-label">{{ t('rankLatvia') }}</div>
          <div v-for="uni in universities" :key="uni.id + '-rlv'" class="cell">
            <span v-if="uni.ranking" class="badge badge-rank-lv">#{{ uni.ranking }} {{ t('inLatvia') }}</span>
            <span v-else class="muted">—</span>
          </div>

          <!-- Website -->
          <div class="cell row-label">{{ t('website') }}</div>
          <div v-for="uni in universities" :key="uni.id + '-w'" class="cell">
            <a v-if="uni.website" :href="uni.website" target="_blank" class="website-link">
              {{ t('openWebsite') }}
            </a>
            <span v-else class="muted">—</span>
          </div>

          <!-- Description -->
          <div class="cell row-label">{{ t('description') }}</div>
          <div v-for="uni in universities" :key="uni.id + '-d'" class="cell desc">
            {{ uni.description || '—' }}
          </div>

          <!-- Programs count -->
          <div class="cell row-label">{{ t('programs') }}</div>
          <div v-for="uni in universities" :key="uni.id + '-pc'" class="cell">
            <span class="badge">{{ uni.programs?.length ?? 0 }} {{ t('progAbbr') }}</span>
          </div>

          <!-- Programs list -->
          <div class="cell row-label top">{{ t('programsList') }}</div>
          <div v-for="uni in universities" :key="uni.id + '-pl'" class="cell programs-cell">
            <div v-if="!uni.programs?.length" class="muted">{{ t('noProgramsList') }}</div>
            <div v-for="p in uni.programs" :key="p.id" class="program-row">
              <div class="prog-name">{{ p.name }}</div>
              <div class="prog-meta">
                <span class="badge badge-degree">{{ tDegree(p.degree) }}</span>
                <span>{{ p.duration_years }}{{ t('yearAbbr') }}</span>
                <span>{{ formatTuition(p.tuition_per_year) }}/{{ t('yearAbbr') }}</span>
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
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 300;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.compare-panel {
  background: #fdfcfa;
  border-radius: 10px;
  width: 100%;
  max-width: 1100px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d4d0c8;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #1a1a1a;
  color: white;
  flex-shrink: 0;
  border-bottom: 3px solid #0d9488;
}
.compare-header h2 { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
.compare-sub { font-size: 0.75rem; color: rgba(255,255,255,0.45); margin-top: 2px; }

.close-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid #2e2e2e;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  border-radius: 5px;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.close-btn:hover { background: rgba(255,255,255,0.15); color: white; }

.state-msg {
  padding: 2rem;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}
.state-msg.error { color: #b91c1c; }

.compare-body {
  overflow: auto;
  padding: 1.25rem;
  background: #fdfcfa;
}

.compare-grid {
  display: grid;
  gap: 0;
  border: 1px solid #d4d0c8;
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ede9e2;
  border-right: 1px solid #ede9e2;
  font-size: 0.875rem;
  vertical-align: top;
}
.cell:last-child { border-right: none; }

/* University name header */
.uni-header {
  background: #f0fdfa;
}
.uni-title { font-size: 0.925rem; font-weight: 700; color: #0d9488; line-height: 1.3; }
.uni-sub { font-size: 0.75rem; color: #888; margin-top: 3px; }

/* Row labels */
.label-col { background: #f5f4f0; }
.row-label {
  background: #f5f4f0;
  font-weight: 700;
  font-size: 0.72rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.row-label.top { vertical-align: top; }

/* Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #f0fdfa;
  color: #0d9488;
}
.badge-rank { background: #fef3c7; color: #92400e; }
.badge-rank-lv { background: #f0fdfa; color: #0f766e; }
.badge-degree { background: #f0fdfa; color: #0d9488; }

.muted { color: #aaa; font-size: 0.82rem; }
.desc { color: #555; font-size: 0.82rem; line-height: 1.55; }

.website-link { color: #0d9488; font-size: 0.82rem; text-decoration: none; font-weight: 600; }
.website-link:hover { text-decoration: underline; }

/* Programs */
.programs-cell { display: flex; flex-direction: column; gap: 0.6rem; }
.program-row {
  padding: 0.5rem 0.65rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #ede9e2;
}
.prog-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; color: #1a1a1a; }
.prog-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.78rem; color: #666; }
</style>
