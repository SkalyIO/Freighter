<script>
import {push} from 'svelte-spa-router'
import { link } from "svelte-spa-router";
let channelKeyInput = ''

function handleSubmit() {
    if(channelKeyInput.length < 16) {
        alert("You need to have at least 16 characters in the channel key!")
        return
    }
    push('/channel/default/' + channelKeyInput)
}

function randomKey() {
    var array = new Uint32Array(64);
    window.crypto.getRandomValues(array);
    const ALPHABET = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890"
    channelKeyInput = ""
    for(var i = 0; i < array.length; i++) {
        channelKeyInput += ALPHABET.charAt(array[i] % ALPHABET.length)
    }
}
</script>

<main>
    <h1>Freighter Channels</h1>
    <p>
    In a Freighter channel, both the subscriber and the sender share a single key, allowing them to read or write messages on said channel.
    <br /><br />
    Since Freighter channels are 100% open to anyone posessing the channel key, channel keys are often exchanged between peers in secret.
    In order to have multiple random nodes connect securely to a private channel made by a certain owner, see <a use:link href="/channel/private">Private channels</a>
  </p>

    <form on:submit|preventDefault={handleSubmit}>
        <input type="text" bind:value={channelKeyInput} /> <input on:click={randomKey} type="button" value="Random key"/>
        <br />
        <input type="submit" />
    </form>
</main>

<style>
	
</style>