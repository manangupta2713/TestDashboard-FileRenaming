<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SimilarityDeck from './SimilarityDeck.svelte';
  import CropDeck from './CropDeck.svelte';

  const dispatch = createEventDispatcher();
  let active = 'mdb1';

  const forward = (event: CustomEvent<any>) => {
    dispatch('status', event.detail);
  };
</script>

<div class="mdb-stack">
  <div class="mdb-tabs">
    <button
      type="button"
      class={`mdb-tab ${active === 'mdb1' ? 'is-active' : ''}`}
      on:click={() => (active = 'mdb1')}
    >
      <div class="tab-heading">
        <span class="tab-index text-amber">#1</span>
        <div>
          <p class="tab-title">Similarity Sweeps</p>
          <p class="tab-sub">InsightFace · Step 1 + Step 2</p>
        </div>
      </div>
    </button>
    <button
      type="button"
      class={`mdb-tab ${active === 'mdb2' ? 'is-active' : ''}`}
      on:click={() => (active = 'mdb2')}
    >
      <div class="tab-heading">
        <span class="tab-index text-ember">#2</span>
        <div>
          <p class="tab-title">Headshot Cropper</p>
          <p class="tab-sub">CPU-friendly · Nitara workflow</p>
        </div>
      </div>
    </button>
  </div>

  <div class="mdb-panels">
    <div class={`panel ${active === 'mdb1' ? 'is-active' : 'is-inactive'}`} aria-hidden={active !== 'mdb1'}>
      <SimilarityDeck on:status={forward} />
    </div>
    <div class={`panel ${active === 'mdb2' ? 'is-active' : 'is-inactive'}`} aria-hidden={active !== 'mdb2'}>
      <CropDeck on:status={forward} />
    </div>
  </div>
</div>

<style>
  .mdb-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 0.4rem;
  }

  .mdb-tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    position: relative;
    padding: 0.9rem 0.6rem 0.6rem;
    border-radius: 999px;
    background: rgba(255, 244, 230, 0.08);
    border: 1px solid rgba(255, 244, 230, 0.15);
  }

  @media (min-width: 720px) {
    .mdb-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .mdb-tab {
    border: none;
    border-radius: 999px;
    padding: 0.7rem 1.2rem;
    background: transparent;
    color: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    transition: transform 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;
    cursor: pointer;
    position: relative;
  }

  .mdb-tab::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35), transparent 55%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .mdb-tab.is-active {
    background: linear-gradient(135deg, rgba(255, 149, 105, 0.55), rgba(104, 18, 25, 0.9));
    box-shadow: 0 20px 45px rgba(9, 2, 2, 0.55);
    transform: translateY(-6px);
  }

  .mdb-tab.is-active::after {
    opacity: 0.35;
  }

  .tab-heading {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .tab-index {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.35em;
    text-transform: uppercase;
  }

  .tab-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff4e6;
  }

  .tab-sub {
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255, 244, 230, 0.65);
  }

  .mdb-panels {
    position: relative;
    display: grid;
    padding: clamp(0.75rem, 1.6vw, 1.4rem) clamp(0.6rem, 1.2vw, 1.2rem);
  }

  .panel {
    grid-area: 1 / 1;
    min-height: 100%;
    transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, filter 0.4s ease;
  }

  .panel.is-active {
    transform: translateY(0) scale(1);
    opacity: 1;
    z-index: 2;
  }

  .panel.is-inactive {
    transform: translateY(60px) scale(0.95);
    opacity: 0;
    pointer-events: none;
    filter: blur(1px);
  }
</style>
