<script>
import { channelKey } from "./Singleton.js"
import Intro from "./views/Intro.svelte"
import ChannelView from "./views/ChannelView.svelte"
</script>

<style>
main {
	text-align: center;
	padding: 1em;
	max-width: 240px;
	margin: 0 auto;
}
h1 {
	color: #ff3e00;
	text-transform: uppercase;
	font-size: 4em;
	font-weight: 100;
}
@media (min-width: 640px) {
	main {
		max-width: none;
	}
}
</style>

<main>
{#if $channelKey === null}
<Intro />
{:else}
<ChannelView />
{/if}
</main>