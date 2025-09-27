// 主应用程序类
class WorkspaceAgent {
  constructor() {
    this.currentWorkspace = null;
    this.openFiles = new Map();
    this.activeFile = null;
    this.fileManager = null;
    this.codeEditor = null;
    this.aiChat = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeComponents();
    this.setupIPC();
  }

  setupEventListeners() {
    // 工具栏按钮事件
    document.getElementById('open-workspace').addEventListener('click', () => {
      this.openWorkspace();
    });

    document.getElementById('new-file').addEventListener('click', () => {
      this.createNewFile();
    });

    document.getElementById('toggle-ai').addEventListener('click', () => {
      this.toggleAIPanel();
    });

    document.getElementById('close-ai').addEventListener('click', () => {
      this.toggleAIPanel();
    });

    document.getElementById('get-started').addEventListener('click', () => {
      this.openWorkspace();
    });

    document.getElementById('refresh-files').addEventListener('click', () => {
      this.refreshFileTree();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o':
            e.preventDefault();
            this.openWorkspace();
            break;
          case 'n':
            e.preventDefault();
            this.createNewFile();
            break;
          case 's':
            e.preventDefault();
            this.saveCurrentFile();
            break;
        }
      }
    });
  }

  initializeComponents() {
    this.fileManager = new FileManager(this);
    this.codeEditor = new CodeEditor(this);
    this.aiChat = new AIChat(this);
  }

  setupIPC() {
    // 监听来自主进程的消息
    window.electronAPI.onWorkspaceOpened((event, workspacePath) => {
      this.loadWorkspace(workspacePath);
    });

    window.electronAPI.onMenuNewFile(() => {
      this.createNewFile();
    });
  }

  async openWorkspace() {
    try {
      // 这里会触发主进程的对话框
      // 实际的文件选择在主进程中处理
      console.log('Opening workspace dialog...');
    } catch (error) {
      console.error('Error opening workspace:', error);
      this.showError('无法打开工作空间');
    }
  }

  async loadWorkspace(workspacePath) {
    try {
      this.currentWorkspace = workspacePath;
      document.getElementById('workspace-path').textContent = workspacePath;
      
      // 加载文件树
      await this.fileManager.loadWorkspace(workspacePath);
      
      // 隐藏欢迎屏幕
      document.getElementById('welcome-screen').style.display = 'none';
      
      // 显示侧边栏
      document.getElementById('sidebar').style.display = 'flex';
      
      this.updateStatus(`工作空间已加载: ${workspacePath}`);
    } catch (error) {
      console.error('Error loading workspace:', error);
      this.showError('无法加载工作空间');
    }
  }

  async createNewFile() {
    if (!this.currentWorkspace) {
      this.showError('请先选择一个工作空间');
      return;
    }

    const fileName = prompt('请输入文件名:', 'untitled.txt');
    if (!fileName) return;

    const filePath = `${this.currentWorkspace}/${fileName}`;
    
    try {
      await window.electronAPI.writeFile(filePath, '');
      await this.fileManager.refreshFileTree();
      await this.openFile(filePath);
      this.updateStatus(`已创建文件: ${fileName}`);
    } catch (error) {
      console.error('Error creating file:', error);
      this.showError('无法创建文件');
    }
  }

  async openFile(filePath) {
    try {
      // 检查文件是否已经打开
      if (this.openFiles.has(filePath)) {
        this.switchToFile(filePath);
        return;
      }

      // 读取文件内容
      const content = await window.electronAPI.readFile(filePath);
      
      // 添加到打开的文件列表
      this.openFiles.set(filePath, {
        path: filePath,
        name: filePath.split('/').pop(),
        content: content,
        modified: false
      });

      // 创建标签页
      this.createTab(filePath);
      
      // 切换到该文件
      this.switchToFile(filePath);
      
      this.updateStatus(`已打开文件: ${filePath.split('/').pop()}`);
    } catch (error) {
      console.error('Error opening file:', error);
      this.showError('无法打开文件');
    }
  }

  createTab(filePath) {
    const fileInfo = this.openFiles.get(filePath);
    const tabBar = document.getElementById('tab-bar');
    
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.filePath = filePath;
    
    tab.innerHTML = `
      <span class="name">${fileInfo.name}</span>
      <span class="close" title="关闭">×</span>
    `;
    
    // 添加事件监听器
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('close')) {
        this.closeFile(filePath);
      } else {
        this.switchToFile(filePath);
      }
    });
    
    tabBar.appendChild(tab);
  }

  switchToFile(filePath) {
    // 更新标签页状态
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-file-path="${filePath}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // 更新编辑器内容
    const fileInfo = this.openFiles.get(filePath);
    if (fileInfo) {
      this.codeEditor.loadFile(fileInfo);
      this.activeFile = filePath;
      this.updateFileInfo(fileInfo);
    }
  }

  closeFile(filePath) {
    const fileInfo = this.openFiles.get(filePath);
    
    // 检查文件是否有未保存的更改
    if (fileInfo && fileInfo.modified) {
      if (!confirm('文件有未保存的更改，确定要关闭吗？')) {
        return;
      }
    }
    
    // 从打开的文件列表中移除
    this.openFiles.delete(filePath);
    
    // 移除标签页
    const tab = document.querySelector(`[data-file-path="${filePath}"]`);
    if (tab) {
      tab.remove();
    }
    
    // 如果关闭的是当前活动文件，切换到其他文件
    if (this.activeFile === filePath) {
      const remainingFiles = Array.from(this.openFiles.keys());
      if (remainingFiles.length > 0) {
        this.switchToFile(remainingFiles[0]);
      } else {
        this.showWelcomeScreen();
      }
    }
  }

  async saveCurrentFile() {
    if (!this.activeFile) return;
    
    const fileInfo = this.openFiles.get(this.activeFile);
    if (!fileInfo) return;
    
    try {
      const content = this.codeEditor.getContent();
      await window.electronAPI.writeFile(this.activeFile, content);
      
      fileInfo.content = content;
      fileInfo.modified = false;
      
      this.updateStatus(`已保存文件: ${fileInfo.name}`);
    } catch (error) {
      console.error('Error saving file:', error);
      this.showError('无法保存文件');
    }
  }

  showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'flex';
    document.getElementById('sidebar').style.display = 'none';
    this.activeFile = null;
  }

  toggleAIPanel() {
    const aiPanel = document.getElementById('ai-panel');
    aiPanel.classList.toggle('show');
  }

  async refreshFileTree() {
    if (this.currentWorkspace) {
      await this.fileManager.loadWorkspace(this.currentWorkspace);
    }
  }

  updateStatus(message) {
    document.getElementById('file-info').textContent = message;
  }

  updateFileInfo(fileInfo) {
    const lines = fileInfo.content.split('\n').length;
    const columns = fileInfo.content.split('\n')[lines - 1].length + 1;
    document.getElementById('line-info').textContent = `行: ${lines}, 列: ${columns}`;
  }

  showError(message) {
    // 简单的错误提示，可以后续改进为更好的通知系统
    alert(message);
  }
}

// 当 DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.workspaceAgent = new WorkspaceAgent();
});