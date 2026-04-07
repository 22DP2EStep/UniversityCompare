<script setup>
import { ref } from 'vue'

const emit = defineEmits(['submit', 'cancel'])
const form = ref({ name: '', location: '', country: '', website: '', description: '', ranking: '' })

function submit() {
  const data = { ...form.value, ranking: form.value.ranking ? Number(form.value.ranking) : null }
  emit('submit', data)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal">
      <h2>Add University</h2>
      <form @submit.prevent="submit" class="uni-form">
        <label>Name *
          <input v-model="form.name" required placeholder="e.g. Stanford University" />
        </label>
        <label>Location *
          <input v-model="form.location" required placeholder="e.g. Stanford, CA" />
        </label>
        <label>Country *
          <input v-model="form.country" required placeholder="e.g. USA" />
        </label>
        <label>Website
          <input v-model="form.website" placeholder="https://..." />
        </label>
        <label>World Ranking
          <input v-model="form.ranking" type="number" min="1" placeholder="e.g. 3" />
        </label>
        <label class="full-width">Description
          <textarea v-model="form.description" rows="3" placeholder="Brief description..."></textarea>
        </label>
        <div class="form-actions full-width">
          <button type="submit" class="btn btn-primary">Add University</button>
          <button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  width: 480px;
  max-width: 95vw;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}
.modal h2 { margin-bottom: 1.25rem; font-size: 1.2rem; }
.uni-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.uni-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; font-weight: 500; color: #444; }
.uni-form input, .uni-form textarea {
  padding: 0.45rem 0.65rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
}
.full-width { grid-column: span 2; }
.form-actions { display: flex; gap: 0.5rem; }
</style>
