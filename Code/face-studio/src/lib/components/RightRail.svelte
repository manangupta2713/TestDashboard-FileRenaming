<script lang="ts">
  export type Threshold = { label: string; min: number; strict: number };

  export let anchors: Threshold[] = [];
  export let systemNotes: string[] = [];
  export let tip: string = '';
  export let recentLogs: string[] = [];
  export let step1Status: any = null;
  export let step2Status: any = null;
  export let cropStatus: any = null;

  const stateTone = (status) => {
    if (!status) return 'text-parchment/60';
    if (status.state === 'completed') return 'text-jade';
    if (status.state === 'running') return 'text-amber';
    if (status.state === 'failed' || status.error) return 'text-ember';
    return 'text-parchment/70';
  };
</script>

<aside class="glass-card w-full md:w-80 shrink-0 space-y-5 p-6 relative z-10 border-parchment/20">
  <section class="space-y-2">
    <p class="pill-label">Anchor thresholds</p>
    <div class="space-y-3">
      {#each anchors as anchor}
        <div class="flex items-center justify-between rounded-2xl border border-parchment/20 bg-[rgba(39,26,22,0.7)] px-3 py-2">
          <div>
            <p class="text-sm font-semibold text-parchment">{anchor.label}</p>
            <p class="text-[11px] text-parchment/60 mt-0.5">MIN {anchor.min} · STRICT {anchor.strict}</p>
          </div>
          <div class="spark-chip text-dune bg-gradient-to-r from-amber to-parchment border-parchment/30">
            <span class="text-[11px]">Calibrated</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <div class="card-divider" />

  <section class="space-y-3">
    <p class="pill-label">Live jobs</p>
    <div class="space-y-2 text-[13px] text-parchment/80">
      <div class="flex justify-between">
        <span>Step 1</span>
        <span class={stateTone(step1Status)}>{step1Status ? step1Status.state : 'idle'}</span>
      </div>
      <div class="flex justify-between">
        <span>Step 2</span>
        <span class={stateTone(step2Status)}>{step2Status ? step2Status.state : 'idle'}</span>
      </div>
      <div class="flex justify-between">
        <span>Cropper</span>
        <span class={stateTone(cropStatus)}>{cropStatus ? cropStatus.state : 'idle'}</span>
      </div>
    </div>
  </section>

  <div class="card-divider" />

  <section class="space-y-3">
    <p class="pill-label">System brief</p>
    <ul class="space-y-2 text-[13px] text-parchment/80">
      {#each systemNotes as note}
        <li class="flex gap-2">
          <span class="text-amber">•</span>
          <span>{note}</span>
        </li>
      {/each}
    </ul>
    <div class="rounded-2xl bg-[rgba(39,26,22,0.7)] border border-parchment/20 px-4 py-3 text-[12px] text-parchment/80">
      {tip}
    </div>
  </section>

  <div class="card-divider" />

  <section class="space-y-3">
    <p class="pill-label">Recent logs</p>
    <div class="max-h-40 overflow-y-auto pr-1 text-[12px] text-parchment/80 space-y-2">
      {#if recentLogs.length === 0}
        <p class="text-parchment/40">Runs will stream log lines here.</p>
      {:else}
        {#each recentLogs as line, index}
          <p class="border-l border-amber/40 pl-2 leading-snug">{recentLogs.length - index}. {line}</p>
        {/each}
      {/if}
    </div>
  </section>
</aside>
