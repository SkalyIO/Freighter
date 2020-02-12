# Grand-scale, stateless decentralized messaging channels

Freighter is a spin-off project that formed after the need for a more simple and performant messaging system arose during the development of [Skaly's](http://skaly.io) dashboard and SDK.

Freighter runs on top of [IOTA](https://www.iota.org) and is a second-layer protocol.

Freighter is characterized by the following design principles:

 - Library should be the absolute minimum in terms of simplicity.

 - Transactions sent using Freighter should be indistinguishable from any other IOTA transactions, even other Freighter channel's transactions.

 - A simple yet incredibly strong security model: Protect the sender and subscribers of a channel against people who don't have access, but not necessarily against each other.

 - A channel model that allows rapid parallel downloads.

 - Hardened against Denial-of-Service attacks making sure that data always loads fluidly without any waiting times.

 - Be completely stateless. This is to avoid potential bugs and other peculiarities when any participant is not keeping their state up to date.

To keep up these design principles Freighter has the following features:

 - Freighter's JS library features no encryption or features other than sending, receiving, or authenticating messages. If you want to use encryption regardless or use Freighter to poll for data real-time, you can use our extension model (FreighterCrypto and FreighterPolling are already finished).

 - Transactions sent from the library are masked by [XOR](https://www.youtube.com/watch?v=xK_SqWG9w-Y)'ing the message using a random string of data derived from the channel key. Since every channel owner has a different key, this operation will yield different results for each channel.

 - Whoever has a specific Freighter channel key can statistically tell where every message will ever be, forever in the past, and forever in the future. Anyone without the key, cannot tell this. Aside from the masking as being described in the bullet point above, we also inject every message with 2 random bytes at a random position, and 2 checksum bytes in a random position to authenticate said messages. The only way to forge a authenticated message is if the attacker somehow knows 1) where the checksum should be and 2) what the checksum is. Checksums are calculated differently for each channel, meaning that it becomes incredibly hard to impossible to forge an authenticated message. If an unauthenticated message is placed in a channel by someone who doesn't have the channel key, it'll simply be ignored. In essence, we have replaced the signature scheme with a 2-byte checksum and some game theory, making it practical and perfect to securely share immutable data between 2 or more participants.

 - Since every channel key owner knows where every message is, and where every future message is going to be, huge, parallel downloads are realistic (you could even download messages from different nodes at the same time).

 - Attackers can't know where a message is going to be without the channel key. The only way to spam a Freighter channel is by spamming random addresses in the tangle, hoping you'd slow down something. Even if you do, Freighter can simply traverse through transactions in 1 address, downloading the rest, while waiting for the other to complete.

 - Freighter needs only one thing to work and that's the channel key. The channel key remains the same for the entire lifecycle of the channel.

# Where to go from here

We currently have a library with the documentation for you to use and a working demo that you can either run from source or run in your browser.

## To integrate or try out Freighter in your own application

Go to [Library/](./Library) to read the docs and how to install.

## To try out a demo

Go to [Demo/](./Demo) to run your own demo or use our hosted demo.