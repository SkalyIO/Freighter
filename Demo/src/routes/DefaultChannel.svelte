<script>
    import Intro from "root/views/Intro.svelte"
    import ChannelView from "root/views/ChannelView.svelte"
    export let params = {}
</script>
<main>
{#if !('key' in params)}
<Intro />
{:else}
<ChannelView channelKey={params.key} />
{/if}
</main>