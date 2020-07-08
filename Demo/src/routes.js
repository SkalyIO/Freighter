import NotFound from './routes/NotFound.svelte'
import DefaultChannel from './routes/DefaultChannel.svelte'
import PrivateChannel from './routes/PrivateChannel.svelte'

export default {
    '/channel/default/:key': DefaultChannel,
    '/channel/default': DefaultChannel,
    '/channel/private': PrivateChannel,
    '/': DefaultChannel,
    // Catch-all
    '*': NotFound,
}