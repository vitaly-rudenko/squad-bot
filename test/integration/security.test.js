import chai, { expect } from 'chai'
import { TEST_API_URL, createReceipt, createUser, doesPhotoExist, getPhoto, getReceipts, receiptPhotoBuffer } from './helpers.js'

describe('[security]', () => {
  describe('GET /photos', () => {
    it('does not list photos', async () => {
      expect((await fetch(`${TEST_API_URL}/photos`)).status).to.equal(404)
      expect(
        (await fetch(`${TEST_API_URL}/photos/index.html`)).status
      ).to.equal(404)
      expect((await fetch(`${TEST_API_URL}/photos/invalid`)).status).to.equal(
        404
      )
      expect(
        (await fetch(`${TEST_API_URL}/photos/invalid.jpg`)).status
      ).to.equal(404)
      expect(
        (await fetch(`${TEST_API_URL}/photos/invalid.png`)).status
      ).to.equal(404)
    })

    it('sends proper headers', async () => {
      const user = await createUser()

      const receipt = await createReceipt(user.id, {
        [user.id]: 1,
      }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const response = await fetch(`${TEST_API_URL}/photos/${receipt.photoFilename}`)

      expect(response.status).to.eq(200)

      const { date, etag, 'content-length': contentLength, ...headers } = Object.fromEntries([...response.headers.entries()])

      expect(date).to.be.string
      expect(etag).to.be.string
      expect(contentLength).to.be.string
      expect(headers).to.deep.eq({
        'cache-control': 'public, max-age=31536000, immutable',
        'connection': 'keep-alive',
        'content-security-policy':
          "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
        'content-type': 'image/png',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'keep-alive': 'timeout=5',
        'origin-agent-cluster': '?1',
        'referrer-policy': 'no-referrer',
        'strict-transport-security': 'max-age=15552000; includeSubDomains',
        'vary': 'Origin',
        'x-content-type-options': 'nosniff',
        'x-dns-prefetch-control': 'off',
        'x-download-options': 'noopen',
        'x-frame-options': 'SAMEORIGIN',
        'x-permitted-cross-domain-policies': 'none',
        'x-xss-protection': '0',
      })
    })
  })

  describe('GET /bot', () => {
    it('sends proper headers', async () => {
      const response = await fetch(`${TEST_API_URL}/bot`)

      const { date, etag, 'content-length': contentLength, ...headers } = Object.fromEntries([...response.headers.entries()])

      expect(date).to.be.string
      expect(etag).to.be.string
      expect(contentLength).to.be.string
      expect(headers).to.deep.eq({
        'connection': 'keep-alive',
        'content-security-policy':
          "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
        'content-type': 'application/json; charset=utf-8',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'keep-alive': 'timeout=5',
        'origin-agent-cluster': '?1',
        'referrer-policy': 'no-referrer',
        'strict-transport-security': 'max-age=15552000; includeSubDomains',
        'vary': 'Origin',
        'x-content-type-options': 'nosniff',
        'x-dns-prefetch-control': 'off',
        'x-download-options': 'noopen',
        'x-frame-options': 'SAMEORIGIN',
        'x-permitted-cross-domain-policies': 'none',
        'x-xss-protection': '0',
      })
    })
  })
})
