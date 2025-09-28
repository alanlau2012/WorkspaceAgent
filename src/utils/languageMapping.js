// 支持的扩展名 -> Prism 语言标识
export const extensionToLanguage = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  json: 'json', md: 'markdown', html: 'html',
  css: 'css', scss: 'scss', less: 'less',
  xml: 'markup', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php', sh: 'bash', bash: 'bash',
  txt: 'text', log: 'text', csv: 'text'
}

export const imageExtensions = ['jpg','jpeg','png','gif','bmp','webp','svg']
export const textLikeExtensions = ['txt','md','log','csv','ini','toml']

export function getExt(name='') {
  const idx = name.lastIndexOf('.')
  return idx > -1 ? name.slice(idx + 1).toLowerCase() : ''
}

export function isImage(name) { 
  return imageExtensions.includes(getExt(name)) 
}

export function isCode(name) { 
  const ext = getExt(name)
  return !!extensionToLanguage[ext] && !isImage(name) && !textLikeExtensions.includes(ext)
}

export function isText(name) {
  const ext = getExt(name)
  return textLikeExtensions.includes(ext)
}

export function languageOf(name) { 
  return extensionToLanguage[getExt(name)] || 'text' 
}