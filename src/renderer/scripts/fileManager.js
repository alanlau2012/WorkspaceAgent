// 文件管理器类
class FileManager {
  constructor(app) {
    this.app = app;
    this.fileTree = document.getElementById('file-tree');
    this.currentPath = null;
  }

  async loadWorkspace(workspacePath) {
    try {
      this.currentPath = workspacePath;
      await this.loadDirectory(workspacePath, this.fileTree);
    } catch (error) {
      console.error('Error loading workspace:', error);
      throw error;
    }
  }

  async loadDirectory(dirPath, container) {
    try {
      const items = await window.electronAPI.readDirectory(dirPath);
      
      // 清空容器
      container.innerHTML = '';
      
      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>文件夹为空</p></div>';
        return;
      }

      // 排序：文件夹在前，文件在后
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // 创建文件项
      items.forEach(item => {
        const fileItem = this.createFileItem(item);
        container.appendChild(fileItem);
      });
    } catch (error) {
      console.error('Error loading directory:', error);
      container.innerHTML = '<div class="empty-state"><p>无法加载文件夹</p></div>';
    }
  }

  createFileItem(item) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.path = item.path;
    fileItem.dataset.isDirectory = item.isDirectory;

    const icon = this.getFileIcon(item);
    const name = item.name;

    fileItem.innerHTML = `
      <span class="icon">${icon}</span>
      <span class="name">${name}</span>
    `;

    // 添加事件监听器
    fileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleFileClick(item);
    });

    // 添加双击事件
    fileItem.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.handleFileDoubleClick(item);
    });

    return fileItem;
  }

  getFileIcon(item) {
    if (item.isDirectory) {
      return '📁';
    }

    const extension = item.name.split('.').pop().toLowerCase();
    const iconMap = {
      // 代码文件
      'js': '📄',
      'ts': '📄',
      'jsx': '⚛️',
      'tsx': '⚛️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'less': '🎨',
      'json': '📋',
      'xml': '📄',
      'yaml': '📄',
      'yml': '📄',
      
      // 配置文件
      'md': '📝',
      'txt': '📄',
      'log': '📋',
      'env': '⚙️',
      'gitignore': '⚙️',
      'dockerfile': '🐳',
      
      // 图片文件
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'ico': '🖼️',
      
      // 其他
      'pdf': '📕',
      'zip': '📦',
      'rar': '📦',
      'tar': '📦',
      'gz': '📦'
    };

    return iconMap[extension] || '📄';
  }

  handleFileClick(item) {
    // 移除之前选中的文件
    document.querySelectorAll('.file-item').forEach(el => {
      el.classList.remove('selected');
    });

    // 选中当前文件
    const fileItem = document.querySelector(`[data-path="${item.path}"]`);
    if (fileItem) {
      fileItem.classList.add('selected');
    }
  }

  handleFileDoubleClick(item) {
    if (item.isDirectory) {
      this.toggleDirectory(item);
    } else {
      this.app.openFile(item.path);
    }
  }

  async toggleDirectory(item) {
    const fileItem = document.querySelector(`[data-path="${item.path}"]`);
    if (!fileItem) return;

    // 检查是否已经展开
    const isExpanded = fileItem.dataset.expanded === 'true';
    
    if (isExpanded) {
      // 收起目录
      this.collapseDirectory(fileItem);
    } else {
      // 展开目录
      await this.expandDirectory(fileItem, item.path);
    }
  }

  async expandDirectory(fileItem, dirPath) {
    try {
      // 创建子容器
      const subContainer = document.createElement('div');
      subContainer.className = 'sub-directory';
      subContainer.style.display = 'none';
      
      // 添加加载指示器
      subContainer.innerHTML = '<div class="loading">加载中...</div>';
      
      // 插入到当前项后面
      fileItem.parentNode.insertBefore(subContainer, fileItem.nextSibling);
      
      // 加载目录内容
      await this.loadDirectory(dirPath, subContainer);
      
      // 显示子容器
      subContainer.style.display = 'block';
      
      // 更新图标和状态
      fileItem.querySelector('.icon').textContent = '📂';
      fileItem.dataset.expanded = 'true';
      
    } catch (error) {
      console.error('Error expanding directory:', error);
      // 移除加载失败的子容器
      const subContainer = fileItem.nextSibling;
      if (subContainer && subContainer.classList.contains('sub-directory')) {
        subContainer.remove();
      }
    }
  }

  collapseDirectory(fileItem) {
    // 找到并移除子容器
    let nextSibling = fileItem.nextSibling;
    while (nextSibling && nextSibling.classList.contains('sub-directory')) {
      const toRemove = nextSibling;
      nextSibling = nextSibling.nextSibling;
      toRemove.remove();
    }
    
    // 更新图标和状态
    fileItem.querySelector('.icon').textContent = '📁';
    fileItem.dataset.expanded = 'false';
  }

  async refreshFileTree() {
    if (this.currentPath) {
      await this.loadWorkspace(this.currentPath);
    }
  }

  // 根据文件路径查找并展开到该文件
  async expandToFile(filePath) {
    if (!this.currentPath) return;
    
    const relativePath = filePath.replace(this.currentPath + '/', '');
    const pathParts = relativePath.split('/');
    
    let currentPath = this.currentPath;
    let currentContainer = this.fileTree;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += '/' + pathParts[i];
      
      // 查找对应的文件项
      const fileItem = document.querySelector(`[data-path="${currentPath}"]`);
      if (fileItem && fileItem.dataset.isDirectory === 'true') {
        // 如果目录未展开，先展开它
        if (fileItem.dataset.expanded !== 'true') {
          await this.expandDirectory(fileItem, currentPath);
        }
        
        // 更新当前容器为子容器
        currentContainer = fileItem.nextSibling;
      }
    }
  }
}