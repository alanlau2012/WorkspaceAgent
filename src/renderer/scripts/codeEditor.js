// 代码编辑器类
class CodeEditor {
  constructor(app) {
    this.app = app;
    this.editorContainer = document.getElementById('editor-container');
    this.currentFile = null;
    this.editor = null;
    
    this.init();
  }

  init() {
    this.createEditor();
    this.setupEventListeners();
  }

  createEditor() {
    // 创建编辑器元素
    this.editor = document.createElement('textarea');
    this.editor.className = 'code-editor';
    this.editor.placeholder = '开始编写代码...';
    
    // 添加到容器
    this.editorContainer.appendChild(this.editor);
    
    // 初始时隐藏编辑器
    this.editor.style.display = 'none';
  }

  setupEventListeners() {
    // 监听内容变化
    this.editor.addEventListener('input', () => {
      this.onContentChange();
    });

    // 监听光标位置变化
    this.editor.addEventListener('keyup', () => {
      this.updateCursorPosition();
    });

    this.editor.addEventListener('click', () => {
      this.updateCursorPosition();
    });

    // 监听键盘快捷键
    this.editor.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
  }

  loadFile(fileInfo) {
    this.currentFile = fileInfo;
    this.editor.value = fileInfo.content;
    this.editor.style.display = 'block';
    
    // 隐藏欢迎屏幕
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
    
    // 设置语法高亮
    this.setLanguage(fileInfo.name);
    
    // 重置修改状态
    this.updateFileModified(false);
    
    // 聚焦到编辑器
    this.editor.focus();
  }

  setLanguage(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // 根据文件扩展名设置不同的样式和行为
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'less': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql'
    };

    const language = languageMap[extension] || 'text';
    this.editor.dataset.language = language;
    
    // 可以在这里添加语法高亮逻辑
    this.applySyntaxHighlighting(language);
  }

  applySyntaxHighlighting(language) {
    // 简单的语法高亮实现
    // 这里可以使用更高级的语法高亮库，如 Prism.js 或 CodeMirror
    
    if (language === 'javascript' || language === 'typescript') {
      this.editor.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
    } else if (language === 'html') {
      this.editor.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
    } else if (language === 'css') {
      this.editor.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
    }
  }

  getContent() {
    return this.editor.value;
  }

  setContent(content) {
    this.editor.value = content;
    this.onContentChange();
  }

  onContentChange() {
    if (this.currentFile) {
      // 标记文件为已修改
      this.currentFile.modified = true;
      this.updateFileModified(true);
      
      // 更新标签页显示（添加修改标记）
      this.updateTabModified();
    }
  }

  updateFileModified(modified) {
    if (this.currentFile) {
      this.currentFile.modified = modified;
    }
  }

  updateTabModified() {
    if (this.currentFile) {
      const tab = document.querySelector(`[data-file-path="${this.currentFile.path}"]`);
      if (tab) {
        const nameElement = tab.querySelector('.name');
        if (this.currentFile.modified && !nameElement.textContent.endsWith('*')) {
          nameElement.textContent += '*';
        } else if (!this.currentFile.modified && nameElement.textContent.endsWith('*')) {
          nameElement.textContent = nameElement.textContent.slice(0, -1);
        }
      }
    }
  }

  updateCursorPosition() {
    const text = this.editor.value;
    const cursorPos = this.editor.selectionStart;
    
    // 计算行号和列号
    const textBeforeCursor = text.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;
    
    // 更新状态栏
    document.getElementById('line-info').textContent = `行: ${lineNumber}, 列: ${columnNumber}`;
  }

  handleKeyDown(e) {
    // 处理 Tab 键
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertTab();
    }
    
    // 处理 Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.app.saveCurrentFile();
    }
    
    // 处理自动缩进
    if (e.key === 'Enter') {
      this.handleAutoIndent();
    }
  }

  insertTab() {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const value = this.editor.value;
    
    // 插入制表符或空格
    const tab = '  '; // 使用2个空格代替制表符
    this.editor.value = value.substring(0, start) + tab + value.substring(end);
    
    // 设置光标位置
    this.editor.selectionStart = this.editor.selectionEnd = start + tab.length;
  }

  handleAutoIndent() {
    const start = this.editor.selectionStart;
    const value = this.editor.value;
    const textBeforeCursor = value.substring(0, start);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // 计算当前行的缩进
    const indent = currentLine.match(/^(\s*)/)[1];
    
    // 如果当前行以 { 结尾，增加缩进
    if (currentLine.trim().endsWith('{')) {
      const newIndent = indent + '  ';
      setTimeout(() => {
        const newStart = this.editor.selectionStart;
        this.editor.value = value.substring(0, newStart) + newIndent + value.substring(newStart);
        this.editor.selectionStart = this.editor.selectionEnd = newStart + newIndent.length;
      }, 0);
    }
  }

  // 查找和替换功能
  findText(searchText, caseSensitive = false) {
    const text = this.editor.value;
    const searchRegex = new RegExp(
      searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    );
    
    const matches = [];
    let match;
    while ((match = searchRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
    
    return matches;
  }

  replaceText(searchText, replaceText, caseSensitive = false) {
    const text = this.editor.value;
    const searchRegex = new RegExp(
      searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    );
    
    const newText = text.replace(searchRegex, replaceText);
    this.editor.value = newText;
    
    return newText !== text;
  }

  // 跳转到指定行
  goToLine(lineNumber) {
    const text = this.editor.value;
    const lines = text.split('\n');
    
    if (lineNumber < 1 || lineNumber > lines.length) {
      return false;
    }
    
    // 计算目标位置
    let position = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    this.editor.focus();
    this.editor.setSelectionRange(position, position);
    this.editor.scrollTop = this.editor.scrollHeight * (lineNumber / lines.length);
    
    return true;
  }

  // 获取选中文本
  getSelectedText() {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    return this.editor.value.substring(start, end);
  }

  // 替换选中文本
  replaceSelectedText(newText) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const value = this.editor.value;
    
    this.editor.value = value.substring(0, start) + newText + value.substring(end);
    this.editor.selectionStart = this.editor.selectionEnd = start + newText.length;
  }

  // 格式化代码（简单实现）
  formatCode() {
    if (!this.currentFile) return;
    
    const language = this.editor.dataset.language;
    const content = this.editor.value;
    
    // 简单的格式化逻辑
    if (language === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2);
        this.editor.value = formatted;
        this.onContentChange();
      } catch (error) {
        console.error('JSON formatting error:', error);
      }
    }
    // 可以添加其他语言的格式化逻辑
  }
}