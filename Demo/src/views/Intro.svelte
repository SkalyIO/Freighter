<script>
import { channelKey } from "../Singleton.js"

let channelKeyInput = ''

function handleSubmit() {
    if(channelKeyInput.length < 16) {
        alert("You need to have at least 16 characters in the channel key!")
        return
    }
    channelKey.set(channelKeyInput)
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
    <h1>Make a channel key</h1>
    <form on:submit|preventDefault={handleSubmit}>
        <input type="text" bind:value={channelKeyInput} /> <input on:click={randomKey} type="button" value="Random key"/>
        <br />
        <input type="submit" />
    </form>
</main>

<style>
	
</style>