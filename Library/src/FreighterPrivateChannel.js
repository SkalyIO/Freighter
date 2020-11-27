const EventEmitter = require('events')
const sidh = require('./crypto/sidh.js')
const crypto = require('crypto')

const checksumLength   = 2;
const privateKeyLength = 434;
const publicKeyLength = 378;
const FRPCVersion = 0;
const versionBytes = Buffer.from([FRPCVersion])

class FreighterPrivateChannel extends EventEmitter {
    constructor(Freighter, FreighterPolling, iota, keyPair) {
        super()
        this.Freighter = Freighter
        this.iota = iota
        this.mwm = 14
        this.historyIndex = -1
        this.keyPair = keyPair
        this.freighter = new Freighter(iota, keyPair.address)
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
        console.log(`FRPC Protocol v${FRPCVersion} started...`);
    }

    async loadPreviousDials() {
        const historyMessages = await this.Freighter.getChannelHistory(this.iota, this.freighter.getAddressSeed(), this.historyIndex, 15)
        if(historyMessages !== null && historyMessages.length > 0) {
            this.historyIndex = historyMessages[0].index
            for(var msg of historyMessages) {
                try {
                    await this.processMessage(msg)
                    await this.Freighter.sleep(250)
                }
                catch(e) {
                    console.warn("processMessage Error (ignored)", e)
                }
            }
            if(this.historyIndex > 0) {
                await this.loadPreviousDials()
            }
        }
    }

    destroy() {
        this.polling.stopPolling()
    }

    async processMessage(msg) {
        const stateFreighterKey = msg.message
        if(stateFreighterKey.length !== 32) {
            throw new Error("[processMessage] Random channel key should be 32 bytes!")
        }
        const stateFreighter = new this.Freighter(this.iota, stateFreighterKey)
        const firstMessage = await this.Freighter.getDataList(this.iota, stateFreighter.getAddressSeed(), 0)
        if(firstMessage.length > 0) {
            var decrypted = await sidh.decrypt(firstMessage[0].message, this.keyPair.privateKey)
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
    }

    static async dialChannelKey(iota, Freighter, channelAddress, channelKey, metadata = null, mwm = 14, stateFreighterKey) {
        console.log(`[dialChannelKey] FRPC Protocol v${FRPCVersion} started...`);
        var handshake = channelKey
        if(metadata != null) {
            handshake = Buffer.concat([handshake, metadata])
        }
        var checksum = FreighterPrivateChannel.hash(handshake).slice(0, checksumLength)
        handshake = Buffer.concat([checksum, handshake])
        stateFreighterKey = crypto.createHmac('sha256', channelAddress)
            .update(stateFreighterKey)
            .digest()
        const ownerFreighter = new Freighter(iota, channelAddress)
        const stateFreighter = new Freighter(iota, stateFreighterKey)
        const firstMessage = await Freighter.getDataList(iota, stateFreighter.getAddressSeed(), 0)
        
        if(firstMessage.length > 0) {
            // TODO: Check if first message is the handshake
            return 'E_STATE_CHANNEL_COLLISION'
        }

        const publicKey = channelAddress.slice(versionBytes.length, channelAddress.length - checksumLength)
        const encrypted = await sidh.encrypt(handshake, publicKey)
        await stateFreighter.sendMessage(Freighter.randomTrytes(crypto.randomBytes(32), 27), encrypted, mwm)
        await ownerFreighter.sendMessage(Freighter.randomTrytes(crypto.randomBytes(32), 27), stateFreighterKey, mwm)

        return null
    }

    static async dial(iota, Freighter, channelAddress, metadata = null, mwm = 14, stateFreighterKey = crypto.randomBytes(32)) {
        const channelKey = crypto.randomBytes(32)
        const res = await FreighterPrivateChannel.dialChannelKey(iota, Freighter, channelAddress, channelKey, metadata, mwm, stateFreighterKey)
        return res === null ? channelKey : res
    }
    
    static hash(bytes) {
        // Secret is a nothing up my sleeve number chosen to make sure we have unique SHA256 hashes
        const secret = 'https://freighter.skaly.io'
        return crypto.createHmac('sha256', secret)
            .update(bytes)
            .digest()
    }

    static async generatePrivateChannel(seed) {
        if(seed.length != 32) {
            throw new Error("seed has to be a Buffer of length 32!")
        }
        var sidhKeyPair = await sidh.keyPairFromSeed(seed)
        var address = Buffer.concat([versionBytes, Buffer.from(sidhKeyPair.publicKey)])
        address = Buffer.concat([address, FreighterPrivateChannel.hash(address).slice(0, checksumLength)])
        return {
            address,
            privateKey: sidhKeyPair.privateKey
        }
    }   
}

FreighterPrivateChannel.sidh = sidh

export default FreighterPrivateChannel