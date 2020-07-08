const EventEmitter = require('events')
const sidh = require('./crypto/sidh.js')
const crypto = require('crypto')

const checksumLength   = 2;
const privateKeyLength = 434;
const publicKeyLength = 378;

class FreighterPrivateChannel extends EventEmitter {
    constructor(Freighter, FreighterPolling, iota, privateKey) {
        super()
        this.Freighter = Freighter
        this.iota = iota
        this.mwm = 14
        this.keyPair = {
            private: privateKey.slice(0, privateKeyLength),
            public: privateKey.slice(privateKeyLength, privateKey.length)
        }
        this.keyPair.address = FreighterPrivateChannel.hash(this.keyPair.public)
        this.freighter = new Freighter(iota, this.keyPair.address)
        this.polling = new FreighterPolling(Freighter, iota, this.freighter.getAddressSeed())
        const _this = this
        this.polling.on('messages', async (newMsgs) => {
            for(var msg of newMsgs) {
                try {
                    await _this.processMessage(msg)
                }
                catch (e) {
                    console.warn('processMessage error (ignored)', e)
                }
            }
        })
        this.polling.startPolling()
    }

    destroy() {
        this.polling.stopPolling()
    }

    async processMessage(msg) {
        var decrypted = await sidh.decrypt(msg.message, this.keyPair.private)
        decrypted = Buffer.from(decrypted) // uint8 to Buffer
        const checksum = decrypted.slice(0, checksumLength)
        const end = decrypted.slice(checksumLength, decrypted.length)
        const channelKey = end.slice(0, 32)
        const metadata = end.slice(32, end.length)
        
        if(FreighterPrivateChannel.hash(end).slice(0, checksumLength).equals(checksum)) {
            // We're good to go
            this.emit('dial', { channelKey, metadata })
        }
    }

    static async dialChannelKey(iota, Freighter, channelAddress, channelKey, metadata = null, mwm = 14) {
        if(!(channelAddress.length == 32)) {
            throw new Error("channelAddress has to be a Buffer of length 32!")
        }
        var handshake = channelKey
        if(metadata != null) {
            handshake = Buffer.concat([handshake, metadata])
        }
        var checksum = FreighterPrivateChannel.hash(handshake).slice(0, checksumLength)
        handshake = Buffer.concat([checksum, handshake])
        var freighter = new Freighter(iota, channelAddress)
        var historyIndex = -1;
        var success = false;
        async function loadHistory() {
            const historyMessages = await Freighter.getChannelHistory(iota, freighter.getAddressSeed(), historyIndex, 15)
            if(historyMessages !== null && historyMessages.length > 0) {
                historyIndex = historyMessages[0].index
                for(var m of historyMessages) {
                    const publicKey = m.message
                    if(publicKey.length === publicKeyLength) {
                        const hash = FreighterPrivateChannel.hash(publicKey)
                        if(hash.equals(channelAddress)) {
                            // We got the right public key, we can stop here.
                            const encrypted = await sidh.encrypt(handshake, publicKey)
                            await freighter.sendMessage(Freighter.randomTrytes(crypto.randomBytes(32), 27), encrypted, mwm)
                            success = true;
                            return;
                        }
                    }
                }
                if(historyIndex > 0) {
                    await loadHistory()
                }
            }
        }
        await loadHistory()
        if(!success) {
            throw new Error("public key not found, has the owner opened the channel already?")
        }
        return channelKey;
    }

    static async dial(iota, Freighter, channelAddress, metadata = null, mwm = 14) {
        const channelKey = crypto.randomBytes(32)
        await FreighterPrivateChannel.dialChannelKey(iota, Freighter, channelAddress, channelKey, metadata, mwm)
        return channelKey
    }
    
    static hash(pubKey) {
        // Secret is a nothing up my sleeve number chosen to make sure we have unique SHA256 hashes
        const secret = 'https://freighter.skaly.io'
        return crypto.createHmac('sha256', secret)
            .update(pubKey)
            .digest()
    }
    
    async openChannel() {
        await this.freighter.sendMessage(this.Freighter.randomTrytes(crypto.randomBytes(27)), this.keyPair.public, this.mwm)
    }

    static async generatePrivateChannel(seed) {
        if(!(seed.length == 32)) {
            throw new Error("seed has to be a Buffer of length 32!")
        }
        var sidhKeyPair = await sidh.keyPairFromSeed(seed)
        return {
            address: FreighterPrivateChannel.hash(sidhKeyPair.publicKey),
            privateKey: Buffer.concat([Buffer.from(sidhKeyPair.privateKey), Buffer.from(sidhKeyPair.publicKey)])
        }
    }   
}

FreighterPrivateChannel.sidh = sidh

export default FreighterPrivateChannel