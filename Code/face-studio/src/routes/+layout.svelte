<script>
  import '../app.css';
  import 'uno.css';
  import { onMount } from 'svelte';

  onMount(() => {
    if ('paintWorklet' in CSS) {
      CSS.paintWorklet
        .addModule('/houdini/orbital-noise.js')
        .catch((err) => console.error('Houdini worklet failed to load', err));
    }
  });
</script>

<svelte:head>
  <title>NeuraMax Face Studio</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<slot />
