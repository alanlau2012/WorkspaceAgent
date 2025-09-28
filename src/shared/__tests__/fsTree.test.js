/**
 * @jest-environment node
 */

const mockFs = {
  readdir: jest.fn(),
  lstat: jest.fn()
}

jest.mock('fs/promises', () => mockFs)

function makeStat({ isDir = false, isFile = false, isSymlink = false } = {}) {
  return {
    isDirectory: () => isDir,
    isFile: () => isFile,
    isSymbolicLink: () => isSymlink
  }
}

describe('buildFSTree', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    // 默认不抛错
    mockFs.readdir.mockImplementation(async (dirPath) => {
      if (dirPath === '/root') return ['.git', 'src', 'README.md', 'linkToNowhere']
      if (dirPath === '/root/src') return ['index.js', 'lib']
      if (dirPath === '/root/src/lib') return ['util.js']
      if (dirPath === '/root/protected') {
        const err = new Error('EACCES: permission denied')
        err.code = 'EACCES'
        throw err
      }
      return []
    })

    mockFs.lstat.mockImplementation(async (p) => {
      switch (p) {
        case '/root/.git':
          return makeStat({ isDir: true })
        case '/root/src':
          return makeStat({ isDir: true })
        case '/root/README.md':
          return makeStat({ isFile: true })
        case '/root/linkToNowhere':
          return makeStat({ isSymlink: true })
        case '/root/src/index.js':
          return makeStat({ isFile: true })
        case '/root/src/lib':
          return makeStat({ isDir: true })
        case '/root/src/lib/util.js':
          return makeStat({ isFile: true })
        case '/root/protected':
          return makeStat({ isDir: true })
        default:
          return makeStat({ isFile: true })
      }
    })
  })

  it('构建嵌套目录树，忽略隐藏文件与符号链接', async () => {
    const { buildFSTree } = require('../fsTree')

    const result = await buildFSTree('/root')

    // 只应包含 src 与 README.md
    const names = result.map(n => n.name).sort()
    expect(names).toEqual(['README.md', 'src'])

    const src = result.find(n => n.name === 'src')
    expect(src.type).toBe('directory')
    expect(src.children.map(c => c.name).sort()).toEqual(['index.js', 'lib'])

    const lib = src.children.find(n => n.name === 'lib')
    expect(lib.type).toBe('directory')
    expect(lib.children.map(c => c.name)).toEqual(['util.js'])
  })

  it('支持 maxDepth 限制', async () => {
    const { buildFSTree } = require('../fsTree')

    const result = await buildFSTree('/root', { maxDepth: 1 })
    const src = result.find(n => n.name === 'src')

    // depth=1 时不应深入到 src/lib
    expect(src.children.map(c => c.name)).toEqual(['index.js', 'lib'])
    const lib = src.children.find(n => n.name === 'lib')
    expect(lib.children).toEqual([])
  })

  it('允许关闭隐藏文件过滤', async () => {
    const { buildFSTree } = require('../fsTree')
    const result = await buildFSTree('/root', { ignoreHidden: false })
    const names = result.map(n => n.name).sort()
    expect(names).toEqual(['.git', 'README.md', 'src'])
  })

  it('权限异常应当抛错，由上层处理', async () => {
    const { buildFSTree } = require('../fsTree')
    await expect(buildFSTree('/root/protected')).rejects.toThrow('EACCES')
  })
})

