import { defineConfig, presetIcons, presetTypography, presetUno } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      dune: '#15100e',
      ember: '#ff5a5f',
      amber: '#ffb347',
      jade: '#0ec19a',
      parchment: '#fff4e6',
      ink: '#271a16'
    },
    boxShadow: {
      float: '0 30px 90px rgba(12, 8, 6, 0.85)',
      ember: '0 25px 80px rgba(255, 90, 95, 0.35)'
    }
  },
  rules: [
    [
      'bg-aurora-field',
      {
        background:
          'radial-gradient(circle at 15% 25%, rgba(255, 181, 71, 0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(255, 90, 95, 0.25), transparent 50%), radial-gradient(circle at 70% 80%, rgba(14,193,154,0.18), transparent 40%), radial-gradient(circle at -10% 80%, rgba(255, 244, 230, 0.25), transparent 35%)'
      }
    ]
  ],
  shortcuts: [
    ['glass-card', 'rounded-[36px] border border-parchment/15 bg-[rgba(21,16,14,0.92)] backdrop-blur-[28px] shadow-float'],
    ['pill-label', 'tracking-[0.4em] uppercase text-[10px] font-semibold text-parchment/70'],
    ['spark-input', 'w-full rounded-2xl border border-parchment/15 bg-[rgba(39,26,22,0.75)] px-4 py-3 text-sm text-parchment placeholder:text-parchment/40 focus:(outline-none ring-2 ring-amber/60 border-amber/60) transition-all duration-300'],
    ['spark-button-primary', 'w-full rounded-2xl bg-gradient-to-r from-ember via-amber to-jade py-3 text-sm font-semibold text-dune shadow-ember hover:(opacity-95 translate-y-0.5) transition-all duration-200'],
    ['spark-button-secondary', 'w-full rounded-2xl border border-parchment/20 bg-transparent py-3 text-sm font-semibold text-parchment hover:(border-amber/60 text-amber) transition-all duration-200']
  ],
  safelist: [
    'text-ember',
    'text-amber',
    'text-jade',
    'bg-parchment/10',
    'bg-ink',
    'border-parchment/15',
    'border-parchment/25',
    'rounded-3xl',
    'rounded-full'
  ],
  presets: [presetUno(), presetTypography(), presetIcons()]
});
