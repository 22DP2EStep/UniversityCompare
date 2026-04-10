<script setup>
const props = defineProps({
  universities: Array,
  selectedId: Number,
  compareIds: { type: Array, default: () => [] },
  canCompare: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'toggle-compare'])
</script>

<template>
  <aside class="uni-list">
    <div v-if="universities.length === 0" class="empty">Universitātes nav atrastas.</div>
    <div
      v-for="uni in universities"
      :key="uni.id"
      class="uni-item"
      :class="{
        active: uni.id === selectedId,
        'in-compare': compareIds.includes(uni.id),
      }"
      @click="emit('select', uni.id)"
    >
      <!-- Compare checkbox -->
      <button
        v-if="canCompare"
        class="compare-toggle"
        :class="{ checked: compareIds.includes(uni.id) }"
        :title="compareIds.includes(uni.id) ? 'Noņemt no salīdzinājuma' : 'Pievienot salīdzinājumam'"
        @click.stop="emit('toggle-compare', uni.id)"
      >
        {{ compareIds.includes(uni.id) ? '✓' : '+' }}
      </button>

      <div class="uni-item-info">
        <span class="uni-name">{{ uni.name }}</span>
        <span class="uni-location">{{ uni.location }}, {{ uni.country }}</span>
        <span v-if="uni.ranking" class="uni-rank">#{{ uni.ranking }}</span>
      </div>

    </div>
  </aside>
</template>

<style scoped>
.uni-list {
  width: 280px;
  min-width: 240px;
  background: white;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
}
.empty { padding: 1rem; color: #999; font-size: 0.9rem; }

.uni-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.1s;
}
.uni-item:hover { background: #f7faff; }
.uni-item.active { background: #ebf4ff; border-left: 3px solid #1a56db; }
.uni-item.in-compare { background: #f0fff4; border-left: 3px solid #38a169; }
.uni-item.active.in-compare { background: #e6ffed; border-left: 3px solid #38a169; }

.uni-item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.uni-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uni-location { font-size: 0.78rem; color: #666; }
.uni-rank { font-size: 0.75rem; color: #1a56db; font-weight: 500; }

.compare-toggle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #cbd5e0;
  background: white;
  color: #999;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}
.compare-toggle:hover { border-color: #38a169; color: #38a169; }
.compare-toggle.checked { border-color: #38a169; background: #38a169; color: white; }

.btn-sm { padding: 0.2rem 0.5rem; font-size: 0.78rem; flex-shrink: 0; }
</style>
