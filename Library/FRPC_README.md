# Freighter Private Channels

FRPC is an extension to Freighter that allows users to set up a fixed, public "channel address" along with a private key.

Anyone who "dials" this public address, will be able to talk to the owner of the private key in a new Freighter channel.

One of the major advantages of FRPC is that the owner of the channel does not have to be online in order for someone to talk to them, even when there's no channel made yet! You can simply post your channel address and "log in" later to see the messages.

This process is fully quantum-secure.

## How the crypto works

### Assumptions

Let Alice be the channel owner, and Bob the subscriber.

- Alice makes a `SIKEp503`-private/public keypair and hashes the public key to become a readable IOTA address.
- Alice posts the public key on the address she just hashed from the public key.
- Alice posts the address on any public and untrusted channel (i.e social media). This is effectively her decentralized email address.
- Bob dials Alice's address and posts a handshake on Alice's channel address. 
  - This handshake contains a randomly generated Freighter channel key, encrypted using a key derived from Alice's public key.
- Alice reads the handshake whenever she's online again, and decrypts the channel key that Bob made.
- Both Alice and Bob can now talk over this new private channel, where they both have the key for.

### In depth

In the background, we use `SIKEp503` which is a configuration of supersingular isogeny which is secure against quantum computers and practical even with key reuse.

On top of `SIKEp503` we also use [ChaCha20Poly1305](https://cryptopp.com/wiki/ChaCha20Poly1305) to encrypt the data using the exchanged keys.

This is to make sure any potential weak bits from `SIKEp503` are removed and since `ChaCha20Poly1305` is a [authenticated encryption algorithm](https://en.wikipedia.org/wiki/Authenticated_encryption), it also prevents [chosen-ciphertext attack](https://en.wikipedia.org/wiki/Chosen-ciphertext_attack), which is when an attacker learns about your private key by sending false or broken ciphertext.

When someone sends a handshake not (correctly) encrypted using `ChaCha20Poly1305`, it will be rejected before it ever touches your private key, effectively making FRPC "CCA-Secure".

# Example

## Open a private channel

```js
async function openChannel() {
    var privateKey_ = new Uint32Array(32);
    window.crypto.getRandomValues(privateKey_)
    privateKey = Buffer.from(privateKey_)
    keyPair = await FreighterPrivateChannel.generatePrivateChannel(privateKey)
    // keyPair.address contains your public channel address
    privateChannel = new FreighterPrivateChannel(
        Freighter,
        FreighterPolling,
        IOTAInstance,
        keyPair.privateKey
    )
    await privateChannel.openChannel()
    privateChannel.on('dial', (obj) => {
        // obj.channelKey contains the channel key
    })
}
```

## Dial a private channel

```js
async function talkTo() {
    nickname = "The Peter"
    channelAddr = Buffer.from('800855', 'hex')
    try {
        var channelKey = await FreighterPrivateChannel.dial(IOTAInstance, Freighter, channelAddr, Buffer.from(nickname, 'ascii'), 14)
        // channelKey is where your Freighter channel with the receiver will be.
    }
    catch (e) {
        alert("Error trying to find channel: " + e.message)
    }
    loading = false
}
```
