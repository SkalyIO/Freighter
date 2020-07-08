<script>
import { iota } from "../Singleton.js"
import { get } from 'svelte/store'
import { onMount, onDestroy } from 'svelte';
import { Freighter, FreighterCrypto, FreighterPolling } from 'freighter'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export let channelKey

var polling = null, freighter;
var historyIndex = -1;
var messages = [];
var msgToSend = "";
var sendingMsg = false;
const spamAmount = 100;

const freighterVersion = Freighter.version

async function loadHistory() {
    const historyMessages = await Freighter.getChannelHistory(iota.instance, freighter.getAddressSeed(), historyIndex, 15)
    if(historyMessages !== null && historyMessages.length > 0) {
        historyIndex = historyMessages[0].index
        messages = messages.concat(historyMessages.reverse())
        
        if(historyIndex > 0) {
            await loadHistory()
        }
    }
}

async function sendSpam() {
    if(msgToSend.length === 0) {
        return alert("Message cannot be empty!")
    }
    sendingMsg = true
    try {
        for(var i = 0; i < spamAmount; i++) {
            await freighter.sendMessage("FREIGHTER9DEMO", `${msgToSend}_${i + 1}`, iota.mwm)
        }
    }
    catch(e) {
        alert(`Error: ${e.message}`)
    }
    msgToSend = ""
    sendingMsg = false
}

async function handleSubmit() {
    if(msgToSend.length === 0) {
        return alert("Message cannot be empty!")
    }
    sendingMsg = true
    try {
        await freighter.sendMessage("FREIGHTER9DEMO", msgToSend, iota.mwm)
    }
    catch(e) {
        alert(`Error: ${e.message}`)
    }
    msgToSend = ""
    sendingMsg = false
}

function randomMessage() {
    const randomFirst = ["Hugs", "Waves"]
    const randomSecond = ["Peter", "Dominik", "David", "Skaly"]
    
    msgToSend = `${randomFirst[Math.random()*randomFirst.length>>0]} from ${randomSecond[Math.random()*randomSecond.length>>0]}`
}

function preview(msg, count) {
    return msg.substring(0, count) + '...'
}

onMount(() => {
    freighter = new Freighter(iota.instance, channelKey)
    polling = new FreighterPolling(Freighter, iota.instance, freighter.getAddressSeed())
    polling.on('messages', (newMsgs) => {
        newMsgs.reverse()
        messages = newMsgs.concat(messages)
    })
    polling.startPolling()
    loadHistory().then()
})

onDestroy(() => {
    if(polling !== null) {
        polling.stopPolling()
        polling = null
    } 
})
</script>

<main>
    <p>Viewing Channel: {channelKey} using Freighter v{freighterVersion}</p>
    <h2>Type new message</h2>
    <form on:submit|preventDefault={handleSubmit}>
        <input type="text" disabled={sendingMsg} bind:value={msgToSend} /> <input disabled={sendingMsg} on:click={randomMessage} type="button" value="Make a message for me!"/>
        <br />
        <input type="button" value="Send {spamAmount} messages" on:click="{sendSpam}" disabled={sendingMsg} />
        <input type="submit" value="Send message" disabled={sendingMsg} />
    </form>
    <h2>Messages ({ messages.length })</h2>
    <img src="loading.gif" alt="Loading" width="32" /> <span class="loading-text">Polling for new messages...</span> 
    {#each messages as message}
		<li>{ message.message } ({ dayjs(message.date).fromNow() }) (<a href="https://thetangle.org/transaction/{message.hash}" target="_blank">{preview(message.hash, 10)}</a>)</li>
	{/each}
</main>

<style lang="stylus">
</style>