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
  } | null;

  const dispatch = createEventDispatcher();

  let inputDir = '';
  let outputDir = '';
  let marginPct = 0.45;
  let minConfidence = 0.4;
  let minFaceSize = 80;
  let cropStatus: JobStatus = null;
  let cropLogs: string[] = [];
  let poller: ReturnType<typeof setTimeout> | null = null;
  let errorMsg = '';

  const pollJob = (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE}/faces/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        cropStatus = data;
        cropLogs = data.logs?.slice(-8) ?? [];
        dispatch('status', { step: 'crop', status: cropStatus, logs: cropLogs });
        if (data.state === 'running' || data.state === 'pending') {
          poller = setTimeout(tick, 1200);
        }
      } catch (err) {
        console.error('Crop polling error', err);
      }
    };
    tick();
  };

  const runCropper = async () => {
    errorMsg = '';
    if (!inputDir.trim() || !outputDir.trim()) {
      errorMsg = 'Enter both input and output folders.';
      return;
    }
    const payload = {
      input_dir: inputDir.trim(),
      output_dir: outputDir.trim(),
      margin_pct: marginPct,
      min_confidence: minConfidence,
      min_face_size: minFaceSize
    };
    try {
      const res = await fetch(`${API_BASE}/faces/crop/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Cropper request failed');
      }
      const data = await res.json();
      if (poller) clearTimeout(poller);
      pollJob(data.job_id);
    } catch (err) {
      console.error(err);
      errorMsg = 'Run failed. Check backend logs.';
    }
  };

  onDestroy(() => {
    if (poller) clearTimeout(poller);
  });
</script>

<div class="crop-deck">
  <section class="crop-form">
    <div>
      <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Input folder</label>
      <input class="spark-input" type="text" bind:value={inputDir} placeholder="D:\\FaceStudio\\raw" />
    </div>
    <div>
      <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Output folder</label>
      <input class="spark-input" type="text" bind:value={outputDir} placeholder="D:\\FaceStudio\\cropped" />
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Margin %</label>
        <input class="spark-input" type="number" step="0.05" min="0.1" max="0.8" bind:value={marginPct} />
      </div>
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Min conf.</label>
        <input class="spark-input" type="number" step="0.05" min="0.1" max="1" bind:value={minConfidence} />
      </div>
      <div>
        <label class="text-[12px] tracking-[0.25em] uppercase text-parchment/50">Min px</label>
        <input class="spark-input" type="number" min="32" max="512" bind:value={minFaceSize} />
      </div>
    </div>
    {#if errorMsg}
      <p class="text-xs text-ember">{errorMsg}</p>
    {/if}
    <div class="form-actions">
      <button class="spark-button-primary" type="button" on:click={runCropper}>Run Cropper</button>
      <button
        class="spark-button-secondary"
        type="button"
        on:click={() => {
          inputDir = '';
          outputDir = '';
        }}
      >
        Reset
      </button>
    </div>
  </section>

  <div class="crop-divider" aria-hidden="true" />

  <section class="crop-telemetry">
    <SparkProgress status={cropStatus} />
    <div class="stat-grid">
      <div class="stat-card">
        <p class="stat-label">Processed</p>
        <p class="stat-value">{cropStatus ? cropStatus.processed : 0}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Total</p>
        <p class="stat-value">{cropStatus ? cropStatus.total : 0}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">State</p>
        <p class="stat-value text-base">{cropStatus ? cropStatus.state : 'idle'}</p>
      </div>
    </div>
    <div class="log-block">
      {#if cropLogs.length === 0}
        <p class="text-parchment/40">Skip stats + headshot notes appear here.</p>
      {:else}
        {#each cropLogs as line}
          <p>{line}</p>
        {/each}
      {/if}
    </div>
  </section>
</div>

<style>
  .crop-deck {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 1024px) {
    .crop-deck {
      flex-direction: row;
      align-items: stretch;
      gap: 2rem;
    }

    .crop-divider {
      width: 1px;
      background: linear-gradient(180deg, transparent, rgba(255, 244, 230, 0.4), transparent);
      opacity: 0.4;
    }
  }

  .crop-form,
  .crop-telemetry {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.8rem;
  }

  .stat-card {
    border: 1px solid rgba(255, 244, 230, 0.12);
    border-radius: 18px;
    padding: 0.9rem;
    text-align: center;
    background: rgba(15, 9, 7, 0.4);
  }

  .stat-label {
    font-size: 0.65rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255, 244, 230, 0.6);
  }

  .stat-value {
    margin-top: 0.35rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff4e6;
  }

  .log-block {
    border-radius: 18px;
    border: 1px solid rgba(255, 244, 230, 0.12);
    background: rgba(15, 9, 7, 0.35);
    min-height: 100px;
    padding: 0.85rem 1rem;
    font-size: 0.78rem;
    color: rgba(255, 244, 230, 0.8);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow-y: auto;
  }

  .crop-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 244, 230, 0.4), transparent);
    opacity: 0.35;
  }
</style>
