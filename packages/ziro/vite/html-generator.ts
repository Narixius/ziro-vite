import { renderSSRHead } from '@unhead/ssr'
import { createHead } from 'unhead'
import { Connect, ViteDevServer } from 'vite'
import { ZiroRouter } from '../router'

export const processHTMLTags = async (router: ZiroRouter, appHtml: string, server?: ViteDevServer, req?: Connect.IncomingMessage) => {
  const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = await renderSSRHead(router.head)
  const { postBody, postHead, preBody, preHead } = await processViteAndZiroHydration(router, server, req)
  let finalHTML = `<!DOCTYPE html>${appHtml}`
  finalHTML = finalHTML.replace('<html', `<html ${htmlAttrs}`)
  finalHTML = finalHTML.replace('<head>', `<head>`)
  finalHTML = finalHTML.replace('</head>', `${preHead}${headTags}${postHead}</head>`)
  finalHTML = finalHTML.replace(/<body(.*)>/i, `<body $1 ${bodyAttrs}>${preBody}${bodyTagsOpen}`)
  finalHTML = finalHTML.replace('</body>', `${bodyTags}${postBody}</body>`)

  return finalHTML
}

export const processViteAndZiroHydration = async (router: ZiroRouter, server?: ViteDevServer, req?: Connect.IncomingMessage) => {
  let preHead = '',
    postHead = '',
    preBody = '',
    postBody = ''
  if (server && req && req.url) {
    const viteHTML = await server.transformIndexHtml(req.url, '<head><head-center /></head><body><body-center /></body>')
    const viteHead = (viteHTML.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1].split('<head-center />') || ['', '']
    preHead = viteHead[0] || ''
    postHead = viteHead[1] || ''
    const viteBody = (viteHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [])[1].split('<body-center />') || ''
    preBody = viteBody[0] || ''
    postBody = viteBody[1] || ''
  }

  const head = createHead()
  head.push({
    script: [
      {
        innerHTML: 'window.__ZIRO_DATA__ = ' + JSON.stringify(router.cache) + ';',
        tagPosition: 'bodyClose',
      },
    ],
  })
  const { bodyTags, headTags } = await renderSSRHead(head)

  postBody = bodyTags + postBody
  postHead = headTags + postHead

  return {
    preHead,
    postHead,
    preBody,
    postBody,
  }
}
