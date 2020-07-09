# Freighter JS Library

The JS library is a module that allows you to use the Freighter Library and the FreighterCrypto (for production-ready `AES256-CBC` encryption), FreighterPolling (real-time data streams) and Freighter Private Channels (open a trusted private channel) extensions.

# How to install and run

**Note:** Currently our library doesn't work with NodeJS due to issues with module exports. This is a todo and input from the community is welcome.

For this reason, please head to our [demo folder](../Demo) which uses Webpack, and see how to run the demo instead, and you can use the library according to it's docs here.

# Getting started

First thing you need is a key called a **channel key**. This key is the only thing needed to create or read channels. A channel key can be any random string or Buffer. Recommended is to create a 64-character secure random string.

Importing Freighter can be done like so:

```js
import { Freighter, FreighterCrypto, FreighterPolling } from 'freighter'
import { composeAPI } from '@iota/core'
```

Freighter has no direct dependency to IOTA, so you need to reference IOTA yourself.

```js
const iota = composeAPI({
    provider: "<node address>"
})

const freighter = new Freighter(iota, "MySecretChannelKey")
```

Now you're ready to send messages.

```js
const message = "Hey IOTA! Greets from Skaly"
await freighter.sendMessage("FREIGHTER9EXAMPLE", message)
```

Receiving them can be done easily by using Freighter's history function: 

Freighter.getChannelHistory(`IOTA`, `AdressSeed`, `History index (should be -1)`, `amount of items per page`)

```js
var historyIndex = -1;
var messages = [];

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
```