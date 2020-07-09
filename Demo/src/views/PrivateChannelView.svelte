<script>
  import {
    FreighterPrivateChannel,
    Freighter,
    FreighterPolling
  } from "freighter";

  import { onDestroy } from 'svelte';
  import { push } from "svelte-spa-router";
  import { iota } from "../Singleton.js";
  let keyPair;
  let privateChannel = null;
  let channelAddr = "";
  let nickname = "";
  let channels = [];
  let loading = false;
  let privateKey = null;

  async function generateKeypair() {
    var privateKey_ = new Uint32Array(32);
    window.crypto.getRandomValues(privateKey_)
    privateKey = Buffer.from(privateKey_)
    keyPair = await FreighterPrivateChannel.generatePrivateChannel(privateKey)
    privateChannel = new FreighterPrivateChannel(
      Freighter,
      FreighterPolling,
      iota.instance,
      keyPair.privateKey
    )
    privateChannel.mwm = iota.mwm
    await privateChannel.openChannel()
    privateChannel.on('dial', (obj) => {
        channels.push({ key: obj.channelKey.toString('hex'), name: obj.metadata.toString('ascii') })
        channels = channels
    })
  }

  async function talkTo() {
    loading = true
    nickname = nickname.trim()
    channelAddr = channelAddr.trim()
    try {
        var channelKey = await FreighterPrivateChannel.dial(iota.instance, Freighter, Buffer.from(channelAddr, 'hex'), Buffer.from(nickname, 'ascii'), iota.mwm)
        push(`/channel/default/${channelKey.toString('hex')}`)
    }
    catch (e) {
        alert("Error trying to find channel: " + e.message)
    }
    loading = false
  }

  onDestroy(() => {
      if(privateChannel !== null) {
          privateChannel.destroy()
          privateChannel = null
      }
  })
</script>

<style lang="stylus">
  .privKey,.pubKey {
    font-family: "Courier New", Courier, monospace;
  }
</style>

<main>
  <h1>Freighter Private Channel</h1>
  <p>
    In Private Channels (FRPC), a public channel ID is made that allows any participant
    to talk to the owner of said ID in private completely on the Tangle, very much like a decentralized email-adress. Generation happens differently
    from normal Freighter channels: Instead of having a single key, you end up
    with a
    <b>private key</b>
    and a public 
    <b>address</b>
    .
    <br />
    <br />
    FRPC is quantum-secure, using
    <i>SIKEp503</i>
    -based cryptography.
  </p>
  {#if loading}
    <img src="loading.gif" alt="Loading" width="32" /> <span class="loading-text">Loading...</span>  
  {:else}
  {#if keyPair}
    <p>
      Share the address with someone else or paste it in another tab to open a private channel.
    </p>
    <div>
    {#if channels.length > 0}
    <b>Private channels:</b><br />
    {#each channels as channel}
    <a target="_blank" href="#/channel/default/{channel.key}">{channel.name}: {channel.key.substring(0, 10)}...</a>
    <br />
    {/each}
    <img src="loading.gif" alt="Loading" width="32" /> <span class="loading-text">Polling for more...</span>  
    {:else}
    <img src="loading.gif" alt="Loading" width="32" /> <span class="loading-text">Waiting for new peers...</span>  
    {/if}
    <br />
    </div>
    <b>Channel Address</b>
    (to be shared publicly):
    <br />
    <div class="pubKey">
      {keyPair.address.toString('hex')}
      <br />
    </div>
    <b>Private key (keep this a secret!):</b>
    <div class="privKey">{privateKey.toString('hex')}</div>
    <br />
  {:else}
    <input type="button" on:click={generateKeypair} value="Generate keypair" />
    <br />
    Or talk to someone:
    <br />
    <form on:submit|preventDefault={talkTo}>
      <input type="text" bind:value="{nickname}" placeholder="Nickname (Can be anything)" /> <br />
      <input type="text" bind:value="{channelAddr}" placeholder="Channel address" /> <br />
      <input type="submit" value="Start" />
    </form>
  {/if}
  {/if}  
</main>
