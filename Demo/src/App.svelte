<script>
  import routes from "./routes";
  import Router from "svelte-spa-router";
  import { link } from "svelte-spa-router";
  import { iota } from "./Singleton.js";
  import { composeAPI } from '@iota/core'
  import {onMount} from 'svelte'

  let iotaLoaded = false

  onMount(() => {
    iota.instance = composeAPI({
      provider: iota.node
    });
    iota.instance
      .getNodeInfo()
      .then(info => console.log(info))
      .catch(error => {
        console.log(`Request error: ${error.message}`);
      });
	iotaLoaded = true
  });
</script>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>

<main>
  <a use:link href="/channel/default">Normal</a>
  |
  <a use:link href="/channel/private">Private</a>

  {#if iotaLoaded}
  <Router {routes} />
  {/if}
</main>
