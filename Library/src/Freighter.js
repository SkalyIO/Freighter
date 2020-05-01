const crypto = require('crypto')
import {
    addChecksum
} from '@iota/checksum'
import { Buffer } from 'buffer';

const TRYTE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9"
const CHECKSUM_LENGTH = 2
const RANDOM_MASK_BYTE_LENGTH = 2
const tryteCoder = require('base-x')(TRYTE_CHARSET)

export default class Freighter {
    #seed = null;
    #currentIndex = 0;
    static version = "0.15.4"

    constructor(iota, seed) {
        this.#seed = seed
        this.#currentIndex = 0
        this.iota = iota
    }

    static getKey(seed, purpose) {
        const seedHash = crypto.createHmac('sha256', seed)
            .update(purpose)
            .digest()
        return seedHash
    }

    static randomTrytes(seed, length) {
        var result = ""
        var randomBuf = null
        var randomBufIdx = 0
        var seedIndex = 0

        // Max length where modulo will not generate any bias
        const maxBiasFreeLength = TRYTE_CHARSET.length * 9

        function takeRandomByte() {
            if (randomBuf === null || randomBufIdx === randomBuf.length) {
                // We need new random data
                randomBuf = crypto.createHmac('sha256', seed)
                    .update(`randomTrytes_${seedIndex}`)
                    .digest()
                randomBufIdx = 0
                seedIndex++
            }
            return randomBuf[randomBufIdx++]
        }

        while (result.length < length) {
            var randomTryte = null
            while (randomTryte === null) {
                var tmpByte = takeRandomByte()
                if (tmpByte < maxBiasFreeLength) {
                    randomTryte = TRYTE_CHARSET[tmpByte % TRYTE_CHARSET.length]
                }
            }
            result += randomTryte
        }

        return result
    }

    static randomBytes(seed, length) {
        var result = Buffer.alloc(length)
        var randomBuf = null
        var randomBufIdx = 0
        var seedIndex = 0
        function takeRandomByte() {
            if (randomBuf === null || randomBufIdx === randomBuf.length) {
                // We need new random data
                randomBuf = crypto.createHmac('sha256', seed)
                    .update(`randomBytes_${seedIndex}`)
                    .digest()
                randomBufIdx = 0
                seedIndex++
            }
            return randomBuf[randomBufIdx++]
        }
        for(var i = 0; i < length; i++) {
            result[i] = takeRandomByte()
        }
        return result
    }

    static async getDataListFromIndexes(iota, addrSeed, indexes) {
        const addressToIndexMap = new Map(indexes.map((idx) => {
            return [Freighter.randomTrytes(Freighter.getKey(addrSeed, `address_${idx}`), 81), idx]
        }))
        const addresses = [... addressToIndexMap.keys()]
        var searchValues = {
            addresses
        }
        var txs = await iota.findTransactionObjects(searchValues)
        var bundles = {}
        for(var tx of txs) {
            if(bundles[tx.bundle]) {
                bundles[tx.bundle].push(tx)
            }
            else {
                bundles[tx.bundle] = [tx]
            }
        }
        var ret = [];
        for(const bundleKey in bundles) {
            const bundle = bundles[bundleKey]
            bundle.sort((a, b) => {
                if(a.currentIndex < b.currentIndex) {
                    return -1;
                }
                if(a.currentIndex > b.currentIndex) {
                    return 1;
                }
                return 0;
            })
            try {
                const index = addressToIndexMap.get(bundle[0].address)
                var msgPart = ""
                for(var i = 0; i < bundle.length; i++) {
                    var tx = bundle[i]
                    var frag = tx.signatureMessageFragment
                    if(i === (bundle.length - 1)) {
                        // Strip off all 9's (at the end of the message only) + remove the end marker
                        frag = frag.replace(/9+$/g, "").slice(0, -1)
                    }
                    msgPart += frag
                }
                const buf = tryteCoder.decode(msgPart);
                const unlockedMessage = Freighter.unlockMessage(addrSeed, buf, index) 
                
                ret.push({
                    message: unlockedMessage,
                    date: new Date(tx.attachmentTimestamp),
                    address: tx.address,
                    hash: tx.hash,
                    index
                })
            } catch (e) {
                console.error('Message decode error (ignored)', e);
            }
        }
        ret.sort((a, b) => {
            if (a.date > b.date) {
                return 1
            }
            if (a.date < b.date) {
                return -1
            }
            return 0
        })
        return ret
    }

    static async getDataList(iota, addrSeed, start = 0, length = 1) {
        var indexes = Array.from({ length }, (v, i) => start + i)
        return await Freighter.getDataListFromIndexes(iota, addrSeed, indexes)
    }

    // Goes over the channel backwards and return the first page, as to which later new pages can be added...
    // Due to the way it's working, it can happen that more than itemsPerPage can be returned in 1 result, but never less than itemsPerPage
    static async getChannelHistory(iota, addrSeed, currentIndex = -1, itemsPerPage = 15) {
        // Find the current index first.
        if(currentIndex === -1) {
            currentIndex = await Freighter.findChannelIndex(iota, addrSeed, 0)
        }

        // Set currentIndex to right page
        currentIndex = currentIndex - itemsPerPage
        if(currentIndex < 0) {
            itemsPerPage = (itemsPerPage + currentIndex)
            currentIndex = 0
        }
        var result = []
        while(result.length < itemsPerPage) {
            const data = await Freighter.getDataList(iota, addrSeed, currentIndex, itemsPerPage)
            result = data.concat(result)
            if(currentIndex <= 0) {
                break
            }
            currentIndex -= itemsPerPage
        }
        return result
    }

    static randomEndingTryte() {
        // We can't use 9 at the end as all messages are padded with 9's
        return TRYTE_CHARSET.charAt(Math.random() * (TRYTE_CHARSET.length - 1) >> 0)
    }

    getAddressSeed() {
        return Freighter.getKey(this.#seed, "address_seed")
    }

    static getInjectionBytePosition(addrSeed, msgLength, purpose) {
        // Use a "modulo function" to locate a random position to inject the bytes
        const key = Freighter.getKey(addrSeed, `byte_pos_${purpose}`)
        var pos = 0
        for(var byte of key) {
            pos = (pos + byte) % msgLength
        }
        return pos
    }

    static injectBytes(message, bytes, position) {
        // Split the message to inject bytes
        const leftMessage = message.slice(0, position)
        const rightMessage = message.slice(position, message.length)

        // Return new message with injected bytes
        return Buffer.concat([leftMessage, bytes, rightMessage])
    }

    static takeInjectedBytes(message, bytePosition, byteLength) {
        const leftMessage = message.slice(0, bytePosition)
        const takenBytes = message.slice(bytePosition, bytePosition + byteLength)
        const rightMessage = message.slice(bytePosition + byteLength, message.length)
        const originalMessage = Buffer.concat([leftMessage, rightMessage])

        return { originalMessage, takenBytes }
    }

    static lockMessage(addrSeed, message, index) {
        const bytePositionChk = Freighter.getInjectionBytePosition(addrSeed, message.length, `msg_chk_${index}`)

        // Create checksum (we just use HMAC here and take the first 2 bytes)
        const chk = Freighter.getKey(addrSeed, message).slice(0, CHECKSUM_LENGTH)
        const checksummedMessage = Freighter.injectBytes(message, chk, bytePositionChk)

        // Create random mask byte (this will be used to randomize the mask)
        const rndBytes = crypto.randomBytes(RANDOM_MASK_BYTE_LENGTH)
        const bytePositionRndMask = Freighter.getInjectionBytePosition(addrSeed, checksummedMessage.length, `msg_rnd_mask_${index}`)        
        const full = Freighter.injectBytes(checksummedMessage, rndBytes, bytePositionRndMask)

        // Mask the full message using XOR skipping the 2 random bytes
        const mask = Freighter.randomBytes(Freighter.getKey(addrSeed, `random_bytes_lockMessage_${index}_${rndBytes.toString('hex')}`), full.length)
        for(var i = 0; i < full.length; i++) {
            if(i >= bytePositionRndMask && i < bytePositionRndMask + RANDOM_MASK_BYTE_LENGTH) {
                continue
            }
            full[i] = full[i] ^ mask[i]
        }
        return full
    }

    static unlockMessage(addrSeed, message, index) {
        var tmpBuf = Buffer.allocUnsafe(message.length)
        message.copy(tmpBuf)
        message = tmpBuf
        
        // Find the random byte position
        const bytePositionRndMask = Freighter.getInjectionBytePosition(addrSeed, message.length - RANDOM_MASK_BYTE_LENGTH, `msg_rnd_mask_${index}`)

        // We copy so the random bytes won't get modified.
        const rndBytes = Buffer.allocUnsafe(RANDOM_MASK_BYTE_LENGTH)
        message.copy(rndBytes, 0, bytePositionRndMask, bytePositionRndMask + RANDOM_MASK_BYTE_LENGTH)
        
        // Unmask the message first, revealing the original contents
        const mask = Freighter.randomBytes(Freighter.getKey(addrSeed, `random_bytes_lockMessage_${index}_${rndBytes.toString('hex')}`), message.length)
        for(var i = 0; i < message.length; i++) {
            message[i] = message[i] ^ mask[i]
        }

        // Take out the random bytes so we have original message without the random bytes stuck betweem them
        message = Freighter.takeInjectedBytes(message, bytePositionRndMask, RANDOM_MASK_BYTE_LENGTH).originalMessage
        
        // Get the checksum from the message
        const bytePositionChk = Freighter.getInjectionBytePosition(addrSeed, message.length - CHECKSUM_LENGTH, `msg_chk_${index}`)

        // Split the message to separate the checksum from the message
        const splittedBytes = Freighter.takeInjectedBytes(message, bytePositionChk, CHECKSUM_LENGTH)
        const originalMessage = splittedBytes.originalMessage
        const chkMessage = splittedBytes.takenBytes

        // Create checksum (we just use HMAC here and take the first 2 bytes)
        const chk = Freighter.getKey(addrSeed, originalMessage).slice(0, CHECKSUM_LENGTH)

        // Double check the checksum
        if(chk.equals(chkMessage)) {
            return originalMessage
        }
        else {
            throw new Error(`unlockMessage checksum is incorrect... ${chk.toString('hex')} vs ${chkMessage.toString('hex')} originalMessage: ${originalMessage}`)
        }
    }

    static async sleep(ms) {
        return new Promise((resolve, _) => {
            setTimeout(resolve, ms)
        })
    }

    static EmptyChannelIndexFilter(txs) {
        return txs.length === 0
    }

    static async findChannelIndex(iota, addrSeed, fromIdx, filter = Freighter.EmptyChannelIndexFilter) {
        if(fromIdx > 0) {
            // Check if there is still a message at the beginning.
            // If it's suddenly empty, we have been past a snapshot and have to start over.
            const address = addChecksum(Freighter.randomTrytes(Freighter.getKey(addrSeed, 'address_0'), 81))
            try {
                const txs = await iota.findTransactionObjects({
                    addresses: [address]
                })
                if(txs.length === 0) {
                    console.log('Snapshot must have happened while sending messages, go back to 0');
                    return 0
                }
            }
            catch (e) {
                console.warn(`Error while fetching transactions from ${address} (ignored).`)
            }
        }
        
        var currentIndex = fromIdx;
        var increaseTries = -5;
        while(true) {
            const address = addChecksum(Freighter.randomTrytes(Freighter.getKey(addrSeed, `address_${currentIndex}`), 81))
            try {
                const txs = await iota.findTransactionObjects({
                    addresses: [address]
                })
                if(filter(txs)) {
                    // Going backwards until we find the first address that doesnt apply to filter
                    const backwardsPackets = 10
                    const addreses = []

                    // We don't do a backwards search unless increaseTries is bigger than 1.
                    // Otherwise we would never have missed any and a backwards search would be unnesecary.
                    if(increaseTries > 1) {
                        while(currentIndex > 0) {
                            addreses.length = 0
                            const addressCount = Math.min(currentIndex + 1, backwardsPackets)
                            var indexes = Array.from({ length: addressCount }, (v, i) => currentIndex - i)
                            
                            const addressToIndexMap = new Map(indexes.map((idx) => {
                                return [Freighter.randomTrytes(Freighter.getKey(addrSeed, `address_${idx}`), 81), idx]
                            }))
                            const addresses = [... addressToIndexMap.keys()]                
                            const txs2 = await iota.findTransactionObjects({
                                addresses
                            })    
                            for(var addr of addresses) {
                                var txsForAddress = []
                                for(var tx of txs2) {
                                    if(tx.address === addr) {
                                        txsForAddress.push(tx)
                                    }
                                }
                                if(!filter(txsForAddress)) {
                                    // Found the first address with that is not applying to filter
                                    return addressToIndexMap.get(addr) + 1;
                                }
                            }  
                            currentIndex -= addressCount                
                            
                            // Making sure we don't spam
                            await Freighter.sleep(1000)
                        }
                    }
                    // This is an empty address in the channel address tree, so we will use this one to send our messages from.
                    return currentIndex;
                }
            }
            catch (e) {
                console.warn(`Error while fetching transactions from ${address} (ignored).`, e)
            }
            // Making sure we don't spam
            await Freighter.sleep(1000)
            const skip = Math.max(1, increaseTries++ * 10)
            console.log(`Skipping ${skip} addresses`)
            currentIndex += skip            
        }
    }

    async sendMessage(tag, data, mwm = 14) {
        if (!Buffer.isBuffer(data)) { 
            // We assume data is a plain string
            data = Buffer.from(data, 'ascii')
        }

        const addrSeed = this.getAddressSeed()
        this.#currentIndex = await Freighter.findChannelIndex(this.iota, addrSeed, this.#currentIndex)
        const _index = this.#currentIndex // To avoid race condition should sendMessage be called twice or more in parallel
        
        const address = addChecksum(Freighter.randomTrytes(Freighter.getKey(addrSeed, `address_${_index}`), 81))
        const lockedData = Freighter.lockMessage(addrSeed, data, _index)
        const dataTrytes = tryteCoder.encode(lockedData) + Freighter.randomEndingTryte()

        var transfers = [{
            tag,
            address,
            value: 0,
            message: dataTrytes
        }]

        try {
            const trytes = await this.iota.prepareTransfers('9'.repeat(81), transfers)
            const bundle = await this.iota.sendTrytes(trytes, 4, mwm)
            this.#currentIndex++;
            return bundle
        } catch (e) {
            console.error('prepareTransfers or sendTrytes error!', transfers, e);
            return null
        }
    }
}