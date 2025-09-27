import { create } from 'zustand';
import { FileItem, FileOperation } from '@/types';

interface FileState {
  items: FileItem[];
  selectedItems: string[];
  expandedItems: string[];
  currentPath: string;
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  filteredItems: FileItem[];
}

interface FileActions {
  loadFolder: (path: string) => Promise<void>;
  selectItem: (id: string) => void;
  toggleExpanded: (id: string) => void;
  createFile: (name: string, parentPath?: string) => Promise<void>;
  createFolder: (name: string, parentPath?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  renameItem: (id: string, newName: string) => Promise<void>;
  copyItem: (id: string, targetPath: string) => Promise<void>;
  moveItem: (id: string, targetPath: string) => Promise<void>;
  searchFiles: (query: string) => void;
  refreshFolder: () => Promise<void>;
  clearError: () => void;
}

type FileStore = FileState & FileActions;

export const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  items: [],
  selectedItems: [],
  expandedItems: [],
  currentPath: '',
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredItems: [],

  // Actions
  loadFolder: async (path: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      const mockItems: FileItem[] = [
        {
          id: '1',
          name: 'src',
          path: `${path}/src`,
          type: 'folder',
          children: [
            {
              id: '2',
              name: 'main.js',
              path: `${path}/src/main.js`,
              type: 'file',
              size: 1024,
              lastModified: new Date()
            }
          ],
          isExpanded: false
        }
      ];
      
      set({ 
        items: mockItems, 
        currentPath: path, 
        isLoading: false,
        filteredItems: mockItems
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  selectItem: (id: string) => {
    const { selectedItems } = get();
    const newSelectedItems = selectedItems.includes(id)
      ? selectedItems.filter(item => item !== id)
      : [...selectedItems, id];
    
    set({ selectedItems: newSelectedItems });
  },

  toggleExpanded: (id: string) => {
    const { expandedItems } = get();
    const newExpandedItems = expandedItems.includes(id)
      ? expandedItems.filter(item => item !== id)
      : [...expandedItems, id];
    
    set({ expandedItems: newExpandedItems });
  },

  createFile: async (name: string, parentPath?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      const newFile: FileItem = {
        id: Date.now().toString(),
        name,
        path: parentPath ? `${parentPath}/${name}` : `${get().currentPath}/${name}`,
        type: 'file',
        size: 0,
        lastModified: new Date()
      };
      
      const { items } = get();
      set({ 
        items: [...items, newFile], 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  createFolder: async (name: string, parentPath?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      const newFolder: FileItem = {
        id: Date.now().toString(),
        name,
        path: parentPath ? `${parentPath}/${name}` : `${get().currentPath}/${name}`,
        type: 'folder',
        children: [],
        isExpanded: false
      };
      
      const { items } = get();
      set({ 
        items: [...items, newFolder], 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      const { items } = get();
      const newItems = items.filter(item => item.id !== id);
      
      set({ 
        items: newItems, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  renameItem: async (id: string, newName: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      const { items } = get();
      const newItems = items.map(item => 
        item.id === id ? { ...item, name: newName } : item
      );
      
      set({ 
        items: newItems, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  copyItem: async (id: string, targetPath: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  moveItem: async (id: string, targetPath: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock implementation - in real app, this would call Electron API
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  },

  searchFiles: (query: string) => {
    set({ searchQuery: query });
    
    if (!query) {
      set({ filteredItems: get().items });
      return;
    }
    
    const { items } = get();
    const filteredItems = items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    set({ filteredItems });
  },

  refreshFolder: async () => {
    const { currentPath } = get();
    if (currentPath) {
      await get().loadFolder(currentPath);
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));