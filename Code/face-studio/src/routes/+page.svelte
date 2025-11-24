<script lang="ts">
  import { browser } from '$app/environment';
  import LeftRail from '$lib/components/LeftRail.svelte';
  import TitleCard from '$lib/components/TitleCard.svelte';
  import StackedDeck from '$lib/components/StackedDeck.svelte';
  import RightRail from '$lib/components/RightRail.svelte';
  import { page } from '$app/stores';

  type JobStatus = {
    processed: number;
    total: number;
    message: string;
    state: string;
    logs?: string[];
  } | null;

  let step1Status: JobStatus = null;
  let step2Status: JobStatus = null;
  let cropStatus: JobStatus = null;
  let combinedLogs: string[] = [];
  const MAX_LOGS = 12;

  const anchors = [
    { label: 'Face 1', min: 0.5663, strict: 0.5773 },
    { label: 'Face 2', min: 0.5721, strict: 0.5851 },
    { label: 'Face 3', min: 0.5611, strict: 0.5744 }
  ];

  const systemNotes = [
    'GPU mode uses InsightFace r100 via ONNX CUDA.',
    'Logs mirror the FastAPI job manager; adapters arriving next sprint.',
    'Right rail updates live as the SvelteKit job poller streams state.'
  ];

  const tip =
    'While InsightFace jobs are simulated right now, the UI already enforces the exact payloads the scripts expect (folders, thresholds, calibration CSVs).';

  const postStatusToParent = () => {
    if (!browser || !isEmbedded) return;
    window.parent?.postMessage(
      {
        type: 'face-status',
        payload: {
          step1Status,
          step2Status,
          cropStatus,
          recentLogs: combinedLogs
        }
      },
      '*'
    );
  };

  const handleStatus = (
    event: CustomEvent<{ step: 'step1' | 'step2' | 'crop'; status: JobStatus; logs: string[] }>
  ) => {
    const { step, status, logs } = event.detail;
    if (step === 'step1') step1Status = status;
    if (step === 'step2') step2Status = status;
    if (step === 'crop') cropStatus = status;
    if (Array.isArray(logs) && logs.length) {
      combinedLogs = [...logs, ...combinedLogs].slice(0, MAX_LOGS);
    }
    postStatusToParent();
  };

  $: isEmbedded = $page.url.searchParams.has('embed');
  $: if (isEmbedded) {
    postStatusToParent();
  }
</script>

{#if !isEmbedded}
  <div class="nebula-shell">
    <div class="grid-overlay" />
    <div class="relative z-10 px-4 lg:px-10 py-10 text-white">
      <div class="max-w-[1600px] mx-auto flex flex-col gap-8">
        <div class="flex gap-6">
          <LeftRail />
          <div class="flex-1 flex flex-col gap-6">
            <TitleCard />
            <div class="flex flex-col lg:flex-row gap-6">
              <div class="flex-1 flex flex-col gap-6">
                <StackedDeck on:status={handleStatus} />
              </div>
              <RightRail
                {anchors}
                {systemNotes}
                tip={tip}
                recentLogs={combinedLogs}
                {step1Status}
                {step2Status}
                {cropStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="embedded-shell">
    <div class="embed-main-card">
      <StackedDeck on:status={handleStatus} />
    </div>
  </div>
{/if}
