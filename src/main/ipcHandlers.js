const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')
const mime = require('mime-types')

const MAX_TEXT_BYTES = 1024 * 1024 // 1MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

function isImageExt(ext) {
  return ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg'].includes(ext.toLowerCase())
}

function toEntry(root, name, isDir) {
  const p = path.join(root, name)
  return isDir ? { name, type: 'directory', path: p } : { name, type: 'file', path: p }
}

async function listDir(dir) {
  const names = await fs.readdir(dir, { withFileTypes: true })
  const entries = await Promise.all(names.map(async d => {
    const isDir = d.isDirectory()
    const e = toEntry(dir, d.name, isDir)
    if (isDir) e.children = await listDir(e.path) // 简化：递归全量
    return e
  }))
  return entries
}

function registerIpcHandlers() {
  ipcMain.handle('read-file', async (_event, filePath, options = {}) => {
    try {
      const ext = path.extname(filePath).toLowerCase()
      const stat = await fs.stat(filePath)

      if (isImageExt(ext)) {
        if (stat.size > MAX_IMAGE_BYTES) {
          return { error: 'IMAGE_TOO_LARGE', size: stat.size }
        }
        const buf = await fs.readFile(filePath)
        const base64 = buf.toString('base64')
        const mimeType = mime.lookup(ext) || 'application/octet-stream'
        return { type: 'image', content: `data:${mimeType};base64,${base64}`, size: stat.size }
      }

      // 文本/代码：默认 utf-8
      if (stat.size > MAX_TEXT_BYTES) {
        // 只读取前 ~1MB，用于预览
        const fh = await fs.open(filePath, 'r')
        const buf = Buffer.alloc(MAX_TEXT_BYTES)
        const { bytesRead } = await fh.read(buf, 0, MAX_TEXT_BYTES, 0)
        await fh.close()
        return { type: 'text', content: buf.subarray(0, bytesRead).toString('utf-8'), truncated: true, size: stat.size }
      }

      const encoding = options.encoding ?? 'utf-8'
      const content = await fs.readFile(filePath, encoding)
      return { type: 'text', content, size: stat.size }
    } catch (error) {
      throw error
    }
  })
  
  ipcMain.handle('write-file', async (_e, filePath, content) => {
    await fs.writeFile(filePath, content ?? '')
    return true
  })
  
  ipcMain.handle('create-folder', async (_e, dirPath) => {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  })
  
  ipcMain.handle('rename-path', async (_e, oldPath, newName) => {
    const newPath = path.join(path.dirname(oldPath), newName)
    await fs.rename(oldPath, newPath)
    return true
  })
  
  ipcMain.handle('delete-path', async (_e, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  })
  
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled || !filePaths?.[0]) return []
    const rootPath = filePaths[0]
    const entries = await listDir(rootPath)
    return { rootPath, entries }
  })
  
  ipcMain.handle('read-directory', async (_e, dirPath) => listDir(dirPath))
}

module.exports = {
  registerIpcHandlers
}
