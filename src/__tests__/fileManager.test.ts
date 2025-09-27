import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileManager } from '@/components/FileManager';
import { useFileStore } from '@/store/fileStore';

// Mock the store
jest.mock('@/store/fileStore');
const mockUseFileStore = useFileStore as jest.MockedFunction<typeof useFileStore>;

describe('FileManager', () => {
  const mockFileItems: FileItem[] = [
    {
      id: '1',
      name: 'src',
      path: '/workspace/src',
      type: 'folder',
      children: [
        {
          id: '2',
          name: 'main.js',
          path: '/workspace/src/main.js',
          type: 'file',
          size: 1024,
          lastModified: new Date('2023-01-01')
        }
      ],
      isExpanded: false
    }
  ];

  const mockStore = {
    items: mockFileItems,
    selectedItems: [],
    expandedItems: [],
    currentPath: '/workspace',
    isLoading: false,
    error: null,
    loadFolder: jest.fn(),
    selectItem: jest.fn(),
    toggleExpanded: jest.fn(),
    createFile: jest.fn(),
    createFolder: jest.fn(),
    deleteItem: jest.fn(),
    renameItem: jest.fn(),
    copyItem: jest.fn(),
    moveItem: jest.fn(),
    searchFiles: jest.fn(),
    refreshFolder: jest.fn()
  };

  beforeEach(() => {
    mockUseFileStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders file tree correctly', () => {
    render(<FileManager />);
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('main.js')).toBeInTheDocument();
  });

  test('expands folder when clicked', async () => {
    render(<FileManager />);
    
    const folderElement = screen.getByText('src');
    fireEvent.click(folderElement);
    
    await waitFor(() => {
      expect(mockStore.toggleExpanded).toHaveBeenCalledWith('1');
    });
  });

  test('selects file when clicked', async () => {
    render(<FileManager />);
    
    const fileElement = screen.getByText('main.js');
    fireEvent.click(fileElement);
    
    await waitFor(() => {
      expect(mockStore.selectItem).toHaveBeenCalledWith('2');
    });
  });

  test('shows context menu on right click', async () => {
    render(<FileManager />);
    
    const fileElement = screen.getByText('main.js');
    fireEvent.contextMenu(fileElement);
    
    await waitFor(() => {
      expect(screen.getByText('重命名')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });
  });

  test('creates new file when create file button clicked', async () => {
    render(<FileManager />);
    
    const createButton = screen.getByText('新建文件');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockStore.createFile).toHaveBeenCalled();
    });
  });

  test('creates new folder when create folder button clicked', async () => {
    render(<FileManager />);
    
    const createButton = screen.getByText('新建文件夹');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockStore.createFolder).toHaveBeenCalled();
    });
  });

  test('shows loading state', () => {
    mockUseFileStore.mockReturnValue({
      ...mockStore,
      isLoading: true
    });
    
    render(<FileManager />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('shows error state', () => {
    mockUseFileStore.mockReturnValue({
      ...mockStore,
      error: {
        code: 'LOAD_ERROR',
        message: '无法加载文件夹',
        timestamp: new Date()
      }
    });
    
    render(<FileManager />);
    
    expect(screen.getByText('无法加载文件夹')).toBeInTheDocument();
  });

  test('searches files when search input changes', async () => {
    render(<FileManager />);
    
    const searchInput = screen.getByPlaceholderText('搜索文件...');
    fireEvent.change(searchInput, { target: { value: 'main' } });
    
    await waitFor(() => {
      expect(mockStore.searchFiles).toHaveBeenCalledWith('main');
    });
  });
});