function createWorkspaceStore(initial = {}) {
  const state = {
    currentRoot: initial.currentRoot || '',
    selectedFiles: new Set(initial.selectedFiles || []),
  };

  return {
    getState: () => ({
      currentRoot: state.currentRoot,
      selectedFiles: new Set(state.selectedFiles),
    }),
    setRoot: (root) => {
      state.currentRoot = root || '';
    },
    addSelected: (path) => {
      if (typeof path === 'string' && path) state.selectedFiles.add(path);
    },
    removeSelected: (path) => {
      state.selectedFiles.delete(path);
    },
    clearSelected: () => {
      state.selectedFiles.clear();
    },
  };
}

module.exports = { createWorkspaceStore };

