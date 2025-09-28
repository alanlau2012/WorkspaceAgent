const fs = require('fs/promises')
const path = require('path')

/**
 * 构建从 rootPath 开始的文件系统树
 * @param {string} rootPath 根路径
 * @param {object} options 选项
 * @param {number} [options.maxDepth=Infinity] 最大递归深度（0 表示仅列出 rootPath 直接子项）
 * @param {boolean} [options.ignoreHidden=true] 是否忽略以点开头的隐藏文件/目录
 * @returns {Promise<Array>} 目录树数组
 */
async function buildFSTree(rootPath, options = {}) {
  const { maxDepth = Infinity, ignoreHidden = true } = options

  async function walk(dir, depth) {
    const entries = await fs.readdir(dir)
    const children = []

    for (const name of entries) {
      if (ignoreHidden && name.startsWith('.')) continue
      const fullPath = path.join(dir, name)
      const stat = await fs.lstat(fullPath)

      // 忽略符号链接
      if (stat.isSymbolicLink()) continue

      if (stat.isDirectory()) {
        let nested = []
        if (depth < maxDepth) {
          nested = await walk(fullPath, depth + 1)
        }
        children.push({
          name,
          type: 'directory',
          path: fullPath,
          children: nested
        })
      } else if (stat.isFile()) {
        children.push({
          name,
          type: 'file',
          path: fullPath
        })
      }
    }

    return children
  }

  return walk(rootPath, 0)
}

module.exports = {
  buildFSTree
}

