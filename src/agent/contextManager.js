const crypto = require('crypto');

function createContextManager(options = {}) {
  const {
    maxTotalBytes = 64 * 1024, // 64KB 默认上限
    redactionPatterns = [/api[_-]?key/iu, /token/iu, /secret/iu],
  } = options;

  const selectedPathToSummary = new Map();

  function redactContent(content) {
    let redacted = content;
    for (const pattern of redactionPatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }

  function summarizeContent(content, limit = 2048) {
    const truncated = content.slice(0, limit);
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    return {
      preview: truncated,
      hash,
      bytes: Buffer.byteLength(content, 'utf8'),
    };
  }

  function addFile(path, content) {
    if (typeof path !== 'string' || path.length === 0) throw new Error('path is required');
    if (typeof content !== 'string') throw new Error('content must be string');
    const redacted = redactContent(content);
    const summary = summarizeContent(redacted);
    selectedPathToSummary.set(path, summary);
  }

  function removeFile(path) {
    selectedPathToSummary.delete(path);
  }

  function clear() {
    selectedPathToSummary.clear();
  }

  function getContextBundle() {
    // 先按 bytes 从小到大，尽量塞满上限
    const entries = [...selectedPathToSummary.entries()].sort((a, b) => a[1].bytes - b[1].bytes);
    const picked = [];
    let total = 0;
    for (const [path, summary] of entries) {
      if (total + summary.bytes > maxTotalBytes) continue;
      picked.push({ path, ...summary });
      total += summary.bytes;
    }
    return { totalBytes: total, files: picked };
  }

  return {
    addFile,
    removeFile,
    clear,
    getContextBundle,
  };
}

module.exports = { createContextManager };

