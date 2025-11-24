<script lang="ts">
  export let status: {
    processed: number;
    total: number;
    message: string;
    state: string;
  } | null = null;

  $: pct = status ? Math.min(100, Math.round((status.processed / Math.max(status.total, 1)) * 100)) : 0;
</script>

<div class="space-y-1.5">
  <div class="h-2 w-full rounded-full bg-white/5 overflow-hidden">
    <div
      class="h-full w-full bg-gradient-to-r from-aurora via-cyanflare to-magenta shadow-[0_0_25px_rgba(0,245,212,0.8)] transition-all duration-700 ease-out"
      style={`width: ${status ? pct : 0}%`}
    />
  </div>
  <p class="text-xs text-slate-300/90">
    {#if status}
      {status.message} ({pct}%)
    {:else}
      Awaiting run…
    {/if}
  </p>
</div>
