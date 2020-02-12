const crypto = require('crypto');
const IV_LENGTH = 16; // For AES, this is always 16

export default {
    encrypt(key, buf) {
        if(key.length !== 32) {
            throw new TypeError("Key needs to be 32 bytes in length!")
        }
        let iv = crypto.randomBytes(IV_LENGTH);
        let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(buf);
        return Buffer.concat([iv, encrypted, cipher.final()])
    },
    decrypt(key, encrypted) {
        if(key.length !== 32) {
            throw new TypeError("Key needs to be 32 bytes in length!")
        }
        let iv = encrypted.slice(0, IV_LENGTH)
        let encryptedText = encrypted.slice(IV_LENGTH, encrypted.length)
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        return Buffer.concat([decrypted, decipher.final()]);
    }
}