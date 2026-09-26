import { Router } from 'express'
import { handleUpload } from '@vercel/blob/client'
import { requireAuth } from '../middleware/requireAuth.js'
import { FOLDERS, isValidKey, splitPathname } from '../lib/storage.js'

/**
 * POST /api/uploads — issues short-lived Vercel Blob client-upload tokens.
 *
 * The browser calls this (via @vercel/blob/client `upload()`) before sending
 * a file straight to Blob storage. We only hand out a token when:
 *   - the user is logged in,
 *   - the pathname is one of our folders with a fresh random key,
 *   - admin-only folders (gallery, news, documents) are requested by an admin.
 * Size and content-type limits are baked into the token, so Blob itself
 * rejects anything bigger / of a different type.
 */
const router = Router()
router.use(requireAuth)

router.post('/', async (req, res) => {
  const result = await handleUpload({
    body:    req.body,
    request: req,
    token:   process.env.BLOB_READ_WRITE_TOKEN,
    onBeforeGenerateToken: async (pathname) => {
      const { folder, key } = splitPathname(pathname)
      const rules = FOLDERS[folder]

      if (!rules || !isValidKey(folder, key)) {
        const err = new Error('Invalid upload path.')
        err.status = 400
        throw err
      }
      if (rules.adminOnly && req.user?.role !== 'ADMIN') {
        const err = new Error('Admin access required.')
        err.status = 403
        throw err
      }

      return {
        allowedContentTypes: rules.types,
        maximumSizeInBytes:  rules.maxBytes,
        addRandomSuffix:     false,
        allowOverwrite:      false,
        tokenPayload:        JSON.stringify({ userId: req.user.sub }),
      }
    },
  })

  res.json(result)
})

export default router
