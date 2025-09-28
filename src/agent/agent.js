async function handleUserMessage(input, { contextManager, llmClient, electronAPI }) {
  if (typeof input !== 'string') throw new Error('input must be string');
  if (!contextManager || !llmClient || !electronAPI) throw new Error('dependencies missing');

  const readMatch = input.match(/^\s*read\s+(.+)$/i);
  if (readMatch) {
    const path = readMatch[1].trim();
    const content = await electronAPI.readFile(path);
    return `内容(${path}):\n${content}`;
  }

  const renameMatch = input.match(/^\s*rename\s+([^\s]+)\s+to\s+([^\s]+)\s*$/i);
  if (renameMatch) {
    const oldPath = renameMatch[1];
    const newName = renameMatch[2];
    await electronAPI.renameFile({ oldPath, newName });
    return `已重命名 ${oldPath} -> ${newName}`;
  }

  const bundle = contextManager.getContextBundle();
  const reply = await llmClient.sendMessage({
    model: 'mock',
    messages: [{ role: 'user', content: input }],
    context: bundle,
  });
  return reply;
}

module.exports = { handleUserMessage };

