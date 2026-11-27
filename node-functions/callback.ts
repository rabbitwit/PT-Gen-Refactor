import {getStore} from '@edgeone/pages-blob'
import {bindEdgeOneBlob, createEdgeOneHandler} from '../src/edgeone'

bindEdgeOneBlob(getStore)

const handler = createEdgeOneHandler('callback')

/** EdgeOne Node 函数入口 */
export default handler

/** EdgeOne Pages 形态入口 */
export function onRequest(context: { request: Request; env?: unknown }) {
    bindEdgeOneBlob(getStore, context.env)
    return handler.fetch(context.request, context.env)
}
