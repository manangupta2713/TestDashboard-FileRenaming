<script lang="ts">
  export let subtitle =
    'Stacked InsightFace dashboards with live telemetry, running atop FastAPI + simulated jobs until the GPU adapters land.';
  const chips = [
    { label: 'Stack', value: 'SvelteKit · UnoCSS · Houdini' },
    { label: 'Backend', value: 'FastAPI /face jobs' },
    { label: 'Status', value: 'Scaffolding → Integration' }
  ];
</script>

<div class="glass-card w-full p-6 flex flex-col gap-4 text-parchment border-parchment/20 bg-[rgba(20,14,12,0.9)]">
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <p class="pill-label">NeuraMax</p>
      <h1 class="text-3xl font-semibold mt-2 text-parchment">Face Similarity & Crop Studio</h1>
      <p class="text-sm text-parchment/80 mt-2 max-w-2xl">{subtitle}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      {#each chips as chip}
        <div class="spark-chip border-parchment/30 bg-parchment/10 text-[11px] text-parchment">
          <span class="text-parchment/60">{chip.label}</span>
          <span class="text-parchment font-semibold tracking-normal uppercase">{chip.value}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
