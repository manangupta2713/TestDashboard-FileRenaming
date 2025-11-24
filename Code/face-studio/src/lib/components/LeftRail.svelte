<script lang="ts">
  const dashboards = [
    {
      label: 'Smart Renamer',
      hint: 'React · Tailwind',
      state: 'Live',
      active: false
    },
    {
      label: 'Dataset Actions',
      hint: 'React · Chakra',
      state: 'Polish',
      active: false
    },
    {
      label: 'Face Studio',
      hint: 'SvelteKit · Uno · Houdini',
      state: 'Design sprint',
      active: true
    }
  ];
</script>

<aside class="glass-card hidden lg:flex w-72 shrink-0 flex-col p-6 space-y-6 text-parchment">
  <div>
    <p class="pill-label">Dashboards</p>
    <p class="text-sm text-parchment/70 mt-1">Multi-stack experimentation lab</p>
  </div>
  <div class="space-y-3">
    {#each dashboards as dash}
      <button
        type="button"
        class={`w-full rounded-2xl px-4 py-4 text-left transition-all duration-300 ${
          dash.active
            ? 'bg-gradient-to-br from-parchment to-amber/60 text-dune shadow-ember'
            : 'bg-transparent border border-parchment/20 hover:border-amber/60'
        }`}
      >
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{dash.label}</p>
          <span class="text-[11px] uppercase tracking-[0.25em] text-parchment/60">{dash.state}</span>
        </div>
        <p class={`text-xs mt-1 ${dash.active ? 'text-ink/70' : 'text-parchment/60'}`}>{dash.hint}</p>
      </button>
    {/each}
  </div>
  <div class="mt-auto rounded-2xl border border-parchment/20 bg-gradient-to-br from-amber/15 to-ember/20 px-4 py-5 shadow-ember/60">
    <p class="pill-label text-ember">Experiment Charter</p>
    <p class="text-sm text-parchment mt-2">
      Each dashboard is free to choose the stack that best expresses its interactions. DB3 is our SvelteKit canvas.
    </p>
  </div>
</aside>
