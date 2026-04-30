<script setup>
import { t } from '../i18n.js'

const props = defineProps({
  universities: Array,
  selectedId: Number,
  compareIds: { type: Array, default: () => [] },
  canCompare: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'toggle-compare'])

const COLORS = [
  '#a83248', '#7a1f32', '#b45309', '#7c3aed',
  '#be123c', '#6b2737', '#065f46', '#9a3412',
]
function accentColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
</script>

<template>
  <div>
    <div v-if="universities.length === 0" class="empty-state">
      <p>{{ t('noResults') }}</p>
    </div>

    <div class="grid" v-else>
      <div
        v-for="uni in universities"
        :key="uni.id"
        class="card"
        :class="{ 'is-compare': compareIds.includes(uni.id) }"
        @click="emit('select', uni.id)"
      >
        <!-- Image or colored banner -->
        <div class="card-banner" :style="uni.image_url ? '' : `background: ${accentColor(uni.name)}`">
          <img v-if="uni.image_url" :src="uni.image_url" :alt="uni.name" class="card-img" />
          <div v-else class="card-banner-initials">{{ initials(uni.name) }}</div>

          <button
            v-if="canCompare"
            class="compare-btn"
            :class="{ active: compareIds.includes(uni.id) }"
            :title="compareIds.includes(uni.id) ? t('removeCompare') : t('addCompare')"
            @click.stop="emit('toggle-compare', uni.id)"
          >
            <svg v-if="compareIds.includes(uni.id)" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M1 5l3.5 4L11 1"/>
            </svg>
            <svg v-else viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14">
              <path d="M6 1v10M1 6h10"/>
            </svg>
          </button>
        </div>

        <div class="card-inner">
          <!-- Name -->
          <h3 class="card-name">{{ uni.name }}</h3>

          <!-- Location -->
          <div class="card-location">
            <svg viewBox="0 0 12 14" fill="none" stroke="currentColor" stroke-width="1.3" width="11" height="11" style="flex-shrink:0">
              <path d="M6 1C3.79 1 2 2.79 2 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke-linejoin="round"/>
              <circle cx="6" cy="5" r="1.3"/>
            </svg>
            {{ uni.location }}, {{ uni.country }}
          </div>

          <!-- Tags row -->
          <div class="card-tags">
            <span v-if="uni.ranking" class="tag tag-rank-lv">
              #{{ uni.ranking }} {{ t('inLatvia') }}
            </span>
          </div>

          <!-- Action -->
          <button class="card-cta">
            {{ t('viewDetails') }}
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
              <path d="M1 7h12M7 1l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 4rem 1rem;
  font-size: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

/* ── Card ── */
.card {
  background: #f5f4f0;
  border-radius: 10px;
  border: 1.5px solid #e0ddd6;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
  display: flex;
  flex-direction: column;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.09);
  border-color: #b8b4aa;
}
.card.is-compare {
  border-color: #a83248;
  box-shadow: 0 0 0 3px rgba(168,50,72,0.15);
}

/* Banner (image or colored) */
.card-banner {
  position: relative;
  height: 140px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-banner-initials {
  font-size: 2rem;
  font-weight: 900;
  color: rgba(255,255,255,0.85);
  letter-spacing: -0.04em;
  user-select: none;
}

.card-inner {
  padding: 1rem 1.15rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

/* University name */
.card-name {
  font-size: 0.975rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Location */
.card-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tags */
.card-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-height: 20px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
}
.tag-rank-lv { background: #fdf0f2; color: #7a1f32; }
.tag-rank-world { background: #fef3c7; color: #92400e; }

/* CTA button */
.card-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.75rem;
  padding-bottom: 0;
  border: none;
  background: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: #a83248;
  cursor: pointer;
  font-family: inherit;
  border-top: 1px solid #ede9e2;
  width: 100%;
  transition: color 0.15s;
}
.card:hover .card-cta { color: #7a1f32; }

/* Compare toggle button — floats on the banner */
.compare-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: none;
  background: rgba(255,255,255,0.92);
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.compare-btn:hover {
  background: #f5f4f0;
  color: #a83248;
}
.compare-btn.active {
  background: #a83248;
  color: white;
}
</style>
