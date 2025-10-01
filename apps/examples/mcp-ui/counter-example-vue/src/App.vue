<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue';
import { initUIMessenger } from '@fractal-mcp/server-ui';

const data = ref<Record<string, unknown> | null>(null);

onMounted(async () => {
  const client = await initUIMessenger();
  data.value = client.getRenderData();
});

const defaultValue = computed(() => {
  const initial = (data.value && typeof (data.value as any).count === 'number') ? (data.value as any).count as number : 0;
  return initial;
});

const count = ref(0);

watchEffect(() => {
  count.value = defaultValue.value;
});

function decrement() {
  count.value = Math.max(0, count.value - 1);
}

function increment() {
  count.value = count.value + 1;
}

function reset() {
  count.value = defaultValue.value;
}
</script>

<template>
  <div
    style="
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      width: 240px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      border: 1px solid #e5e7eb;
    "
  >
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #1f2937; font-weight: 600;">Counter Widget</h2>
      <div
        style="
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 24px;
          font-weight: bold;
          display: inline-block;
          min-width: 50px;
        "
      >
        {{ count }}
      </div>
    </div>

    <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;">
      <button
        @click="decrement"
        :disabled="count === 0"
        :style="{
          background: count === 0 ? '#9ca3af' : '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '18px',
          cursor: count === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 500
        }"
      >
        −
      </button>
      <button
        @click="increment"
        style="
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 18px;
          cursor: pointer;
          font-weight: 500;
        "
      >
        +
      </button>
    </div>

    <button
      v-if="count > 0"
      @click="reset"
      style="
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
        font-weight: 500;
      "
    >
      Reset
    </button>
  </div>
  
</template>

<style>
/* Scoped component styles can go here if needed */
</style>


