<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { API_BASE } from '$lib/config';
  import SparkProgress from './SparkProgress.svelte';

  type JobStatus = {
    processed: number;
    total: number;
    message: string;
    state: string;
    logs?: string[];
    error?: string;
  } | null;

  const dispatch = createEventDispatcher();

  let step1Folder = '';
  let moveMode = 'copy';
  let qualityGate = true;
  let dryRun = false;
  let calibrationCsv = '';
  let anchorsDir = '';

  let step2Folder = '';
  let detectionThreshold = 0.6;
  let destinationFolder = '';

  let step1Status: JobStatus = null;
  let step2Status: JobStatus = null;
  let step1Logs: string[] = [];
  let step2Logs: string[] = [];
  let errorStep1 = '';
  let errorStep2 = '';
  let poller1: ReturnType<typeof setTimeout> | null = null;
  let poller2: ReturnType<typeof setTimeout> | null = null;

  const dispatchStatus = (step: 'step1' | 'step2', status: JobStatus, logs: string[]) => {
    dispatch('status', { step, status, logs });
  };

  const pollJob = (jobId: string, step: 'step1' | 'step2') => {
    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE}/faces/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (step === 'step1') {
          step1Status = data;
          step1Logs = data.logs?.slice(-8) ?? [];
          dispatchStatus('step1', step1Status, step1Logs);
        } else {
          step2Status = data;
          step2Logs = data.logs?.slice(-8) ?? [];
          dispatchStatus('step2', step2Status, step2Logs);
        }

        if (data.state === 'running' || data.state === 'pending') {
          const handle = setTimeout(tick, 1200);
          if (step === 'step1') poller1 = handle;
          else poller2 = handle;
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    };
    tick();
  };

  const runStep1 = async () => {
    errorStep1 = '';
    if (!step1Folder.trim()) {
      errorStep1 = 'Enter an input folder.';
      return;
    }
    const payload = {
      folder: step1Folder.trim(),
      move_mode: moveMode,
      enable_quality_gate: qualityGate,
      calibration_csv: calibrationCsv.trim() || null,
      anchors_dir: anchorsDir.trim() || null
    };

    try {
      const res = await fetch(`${API_BASE}/faces/step1/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Step 1 request failed');
      }
      const data = await res.json();
      if (poller1) clearTimeout(poller1);
      pollJob(data.job_id, 'step1');
    } catch (err) {
      console.error(err);
      errorStep1 = 'Run failed. Check backend logs.';
    }
  };

  const runStep2 = async () => {
    errorStep2 = '';
    if (!step2Folder.trim()) {
      errorStep2 = 'Enter the multi-female folder.';
      return;
    }
    const payload = {
      folder: step2Folder.trim(),
      detection_threshold: detectionThreshold,
      destination: destinationFolder.trim() || null
    };
    try {
      const res = await fetch(`${API_BASE}/faces/step2/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Step 2 request failed');
      }
      const data = await res.json();
      if (poller2) clearTimeout(poller2);
      pollJob(data.job_id, 'step2');
    } catch (err) {
      console.error(err);
      errorStep2 = 'Run failed. Check backend logs.';
    }
  };

  onDestroy(() => {
    if (poller1) clearTimeout(poller1);
    if (poller2) clearTimeout(poller2);
  });
</script>

<div class="similarity-deck">
  <section class="step-section">
    <div class="section-heading">
      <div class="step-title">
        <span class="step-index text-amber">STEP 1</span>
        <h3 class="text-lg font-semibold text-parchment">Anchor Similarity Sweep</h3>
      </div>
      <span class="spark-chip text-dune bg-gradient-to-r from-amber to-parchment text-[10px]">GPU</span>
    </div>

    <div class="space-y-3">
      <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Input folder</label>
      <input class="spark-input" type="text" bind:value={step1Folder} placeholder="D:\\datasets\\clientA\\batch-07" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Move mode</label>
        <select class="spark-input" bind:value={moveMode}>
          <option value="copy">Copy</option>
          <option value="move">Move</option>
          <option value="hardlink">Hardlink</option>
        </select>
      </div>
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Dry run</label>
        <button
          class={`spark-button-secondary px-0 text-center ${dryRun ? 'border-amber/60 text-amber' : ''}`}
          type="button"
          on:click={() => (dryRun = !dryRun)}
        >
          {dryRun ? 'Enabled' : 'Disabled'}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Calibration CSV</label>
        <input class="spark-input" type="text" bind:value={calibrationCsv} placeholder="E:\\calibration\\anchors.csv" />
      </div>
      <div class="space-y-2">
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Anchors dir</label>
        <input class="spark-input" type="text" bind:value={anchorsDir} placeholder="E:\\calibration\\anchor-shots" />
      </div>
    </div>

    <div class="flex items-center gap-4 text-sm text-parchment/80 flex-wrap">
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={qualityGate} class="accent-amber" />
        Quality gate
      </label>
      <label class="flex items-center gap-2 opacity-60 cursor-not-allowed" title="Coming soon">
        <input type="checkbox" bind:checked={dryRun} disabled class="accent-amber" />
        Snapshot only (soon)
      </label>
    </div>

    {#if errorStep1}
      <p class="text-xs text-ember">{errorStep1}</p>
    {/if}

    <div class="action-row">
      <button class="spark-button-primary" type="button" on:click={runStep1}>Run Step 1</button>
      <SparkProgress status={step1Status} />
    </div>

    <div class="log-block">
      {#if step1Logs.length === 0}
        <p class="text-parchment/40">Logs will stream here after the job begins.</p>
      {:else}
        {#each step1Logs as line}
          <p>{line}</p>
        {/each}
      {/if}
    </div>
  </section>

  <div class="section-divider" aria-hidden="true" />

  <section class="step-section">
    <div class="section-heading">
      <div class="step-title">
        <span class="step-index text-ember">STEP 2</span>
        <h3 class="text-lg font-semibold text-parchment">Multi-female recheck</h3>
      </div>
      <span class="spark-chip text-dune bg-gradient-to-r from-ember to-jade text-[10px]">GPU + Crops</span>
    </div>

    <div class="space-y-3">
      <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Source folder</label>
      <input class="spark-input" type="text" bind:value={step2Folder} placeholder="E:\\FaceStudio\\multi-female" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Threshold</label>
        <input class="spark-input" type="number" step="0.05" min="0" max="1" bind:value={detectionThreshold} />
      </div>
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Destination</label>
        <input class="spark-input" type="text" bind:value={destinationFolder} placeholder="E:\\FaceStudio\\outcomes" />
      </div>
    </div>

    {#if errorStep2}
      <p class="text-xs text-ember">{errorStep2}</p>
    {/if}

    <div class="action-row">
      <button class="spark-button-primary" type="button" on:click={runStep2}>Run Step 2</button>
      <SparkProgress status={step2Status} />
    </div>

    <div class="log-block">
      {#if step2Logs.length === 0}
        <p class="text-parchment/40">Cropped face previews + metadata will appear here.</p>
      {:else}
        {#each step2Logs as line}
          <p>{line}</p>
        {/each}
      {/if}
    </div>
  </section>
</div>

<style>
  .similarity-deck {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .step-section {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .step-index {
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-transform: uppercase;
  }

  .section-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 244, 230, 0.4), transparent);
    opacity: 0.35;
  }

  .action-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .action-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .log-block {
    border-radius: 20px;
    border: 1px solid rgba(255, 244, 230, 0.12);
    background: rgba(15, 9, 7, 0.35);
    min-height: 90px;
    padding: 0.85rem 1rem;
    font-size: 0.78rem;
    color: rgba(255, 244, 230, 0.8);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow-y: auto;
  }

  @media (min-width: 900px) {
    .similarity-deck {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
    }

    .section-divider {
      display: none;
    }
  }
</style>
