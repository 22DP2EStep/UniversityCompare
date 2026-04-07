<script setup>
defineProps({ universities: Array, selectedId: Number })
const emit = defineEmits(['select', 'delete'])
</script>

<template>
  <aside class="uni-list">
    <div v-if="universities.length === 0" class="empty">No universities found.</div>
    <div
      v-for="uni in universities"
      :key="uni.id"
      class="uni-item"
      :class="{ active: uni.id === selectedId }"
      @click="emit('select', uni.id)"
    >
      <div class="uni-item-info">
        <span class="uni-name">{{ uni.name }}</span>
        <span class="uni-location">{{ uni.location }}, {{ uni.country }}</span>
        <span v-if="uni.ranking" class="uni-rank">#{{ uni.ranking }}</span>
      </div>
      <button
        class="btn btn-danger btn-sm"
        @click.stop="emit('delete', uni.id)"
        title="Delete"
      >✕</button>
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
}
.empty { padding: 1rem; color: #999; font-size: 0.9rem; }
.uni-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.1s;
}
.uni-item:hover { background: #f7faff; }
.uni-item.active { background: #ebf4ff; border-left: 3px solid #1a56db; }
.uni-item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.uni-name { font-weight: 600; font-size: 0.9rem; }
.uni-location { font-size: 0.78rem; color: #666; }
.uni-rank { font-size: 0.75rem; color: #1a56db; font-weight: 500; }
.btn-sm { padding: 0.2rem 0.5rem; font-size: 0.78rem; }
</style>
