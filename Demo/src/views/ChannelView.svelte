<script>
import { channelKey, iota } from "../Singleton.js"
import { get } from 'svelte/store'
import { onMount } from 'svelte';
import { Freighter, FreighterCrypto, FreighterPolling } from 'freighter'
import { composeAPI } from '@iota/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

var polling, freighter;
var historyIndex = -1;
var messages = [];
var msgToSend;
var sendingMsg = false;

async function loadHistory() {
    const historyMessages = await Freighter.getChannelHistory(iota.instance, freighter.getAddressSeed(), historyIndex, 15)
    if(historyMessages !== null && historyMessages.length > 0) {
        messages = messages.concat(historyMessages)
        historyIndex = historyMessages[0].index - 1
        
        if(historyIndex > -1) {
            await loadHistory()
        }
    }
}

async function handleSubmit() {
    if(msgToSend.length === 0) {
        return alert("Message cannot be empty!")
    }
    sendingMsg = true
    try {
        await freighter.sendMessage("FREIGHTER9DEMO", msgToSend)
    }
    catch(e) {
        alert(`Error: ${e.message}`)
    }
    msgToSend = ""
    sendingMsg = false
}

function randomMessage() {
    const randomFirst = ["Hugs", "Waves"]
    const randomSecond = ["Peter", "Dominik", "David", "CfB", "Skaly"]
    
    msgToSend = `${randomFirst[Math.random()*randomFirst.length>>0]} from ${randomSecond[Math.random()*randomSecond.length>>0]}`
}

function preview(msg, count) {
    return msg.substring(0, count) + '...'
}

onMount(() => {
    iota.instance = composeAPI({
      provider: 'https://nodes.thetangle.org:443'
    })
    iota.instance.getNodeInfo()
      .then(info => console.log(info))
      .catch(error => {
          console.log(`Request error: ${error.message}`)
      })
    
    freighter = new Freighter(iota.instance, get(channelKey))
    polling = new FreighterPolling(Freighter, iota.instance, freighter.getAddressSeed())
    polling.on('messages', (newMsgs) => {
        messages = messages.concat(newMsgs)
    })
    polling.startPolling()
    loadHistory().then()
})
</script>

<main>
    <p>Viewing Channel: {$channelKey}</p>
    <h2>Type new message</h2>
    <form on:submit|preventDefault={handleSubmit}>
        <input type="text" disabled={sendingMsg} bind:value={msgToSend} /> <input on:click={randomMessage} type="button" value="Make a message for me!"/>
        <br />
        <input type="submit" disabled={sendingMsg} />
    </form>
    <h2>Messages ({ messages.length })</h2>
    <img src="loading.gif" alt="Loading" width="32" /> <span class="loading-text">Polling for new messages...</span> 
    {#each messages as message}
		<li>{ message.message } ({ dayjs(message.date).fromNow() }) (<a href="https://thetangle.org/transaction/{message.hash}" target="_blank">{preview(message.hash, 10)}</a>)</li>
	{/each}
</main>

<style lang="stylus">
</style>