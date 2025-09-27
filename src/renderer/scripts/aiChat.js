// AI 聊天类
class AIChat {
  constructor(app) {
    this.app = app;
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-message');
    this.isVisible = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 发送按钮点击事件
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // 输入框回车事件
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 输入框内容变化事件
    this.chatInput.addEventListener('input', () => {
      this.updateSendButton();
    });
  }

  updateSendButton() {
    const hasText = this.chatInput.value.trim().length > 0;
    this.sendButton.disabled = !hasText;
    this.sendButton.style.opacity = hasText ? '1' : '0.5';
  }

  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    // 清空输入框
    this.chatInput.value = '';
    this.updateSendButton();

    // 添加用户消息
    this.addMessage(message, 'user');

    // 显示加载状态
    const loadingId = this.addLoadingMessage();

    try {
      // 模拟 AI 响应（实际实现中这里会调用真实的 AI API）
      const response = await this.getAIResponse(message);
      
      // 移除加载状态
      this.removeMessage(loadingId);
      
      // 添加 AI 响应
      this.addMessage(response, 'ai');
      
    } catch (error) {
      console.error('AI response error:', error);
      
      // 移除加载状态
      this.removeMessage(loadingId);
      
      // 添加错误消息
      this.addMessage('抱歉，AI 助手暂时无法响应，请稍后再试。', 'ai', true);
    }
  }

  addMessage(content, type, isError = false) {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.id = messageId;
    
    if (isError) {
      messageDiv.classList.add('error');
    }
    
    messageDiv.innerHTML = `
      <div class="message-content">${this.formatMessage(content)}</div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
    
    return messageId;
  }

  addLoadingMessage() {
    const loadingId = 'loading_' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message loading';
    loadingDiv.id = loadingId;
    
    loadingDiv.innerHTML = `
      <div class="message-content">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        AI 正在思考中...
      </div>
    `;
    
    this.chatMessages.appendChild(loadingDiv);
    this.scrollToBottom();
    
    return loadingId;
  }

  removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
      message.remove();
    }
  }

  formatMessage(content) {
    // 简单的消息格式化
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async getAIResponse(message) {
    // 模拟 AI 响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // 简单的响应逻辑（实际实现中这里会调用真实的 AI API）
    const responses = [
      `我理解您的问题："${message}"。这是一个很好的问题，让我来帮您分析一下。`,
      `关于"${message}"，我建议您可以考虑以下几个方面：\n\n1. 首先检查代码的语法和逻辑\n2. 查看相关的文档和示例\n3. 考虑使用调试工具来定位问题`,
      `您提到的"${message}"确实是一个常见的问题。根据我的经验，通常的解决方案包括：\n\n- 检查依赖项是否正确安装\n- 确认配置文件是否正确\n- 查看控制台错误信息`,
      `对于"${message}"这个问题，我建议您：\n\n1. 先查看官方文档\n2. 搜索相关的 Stack Overflow 问题\n3. 如果问题仍然存在，可以提供更多详细信息`,
      `我注意到您询问的是"${message}"。这让我想到几个可能的解决方案：\n\n- 使用浏览器开发者工具进行调试\n- 检查网络请求是否正常\n- 确认服务器端配置是否正确`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 处理代码相关的 AI 请求
  async handleCodeRequest(message, fileContent = null) {
    const codeContext = fileContent ? `\n\n当前文件内容：\n\`\`\`\n${fileContent}\n\`\`\`` : '';
    const fullMessage = message + codeContext;
    
    return await this.getAIResponse(fullMessage);
  }

  // 清空聊天记录
  clearChat() {
    this.chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="message-content">
          聊天记录已清空。有什么我可以帮助您的吗？
        </div>
      </div>
    `;
  }

  // 导出聊天记录
  exportChat() {
    const messages = Array.from(this.chatMessages.querySelectorAll('.message')).map(msg => {
      const content = msg.querySelector('.message-content').textContent;
      const type = msg.classList.contains('user-message') ? '用户' : 'AI';
      return `[${type}] ${content}`;
    }).join('\n\n');
    
    const blob = new Blob([messages], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 显示欢迎消息
  showWelcomeMessage() {
    this.addMessage('欢迎使用 WorkspaceAgent AI 助手！我可以帮助您：\n\n• 分析代码问题\n• 提供编程建议\n• 解释技术概念\n• 协助调试和优化\n\n请告诉我您需要什么帮助。', 'ai');
  }

  // 处理文件选择事件
  onFileSelected(fileInfo) {
    if (fileInfo && fileInfo.isDirectory) {
      this.addMessage(`您选择了文件夹：${fileInfo.name}\n\n我可以帮您分析这个文件夹中的代码结构，或者您可以打开具体的文件让我查看。`, 'ai');
    } else if (fileInfo) {
      this.addMessage(`您打开了文件：${fileInfo.name}\n\n我可以帮您分析这个文件的内容，或者回答关于这个文件的问题。`, 'ai');
    }
  }

  // 处理代码变化事件
  onCodeChanged(fileInfo) {
    if (fileInfo && fileInfo.modified) {
      // 可以在这里添加自动代码分析功能
      console.log('Code changed, could trigger auto-analysis');
    }
  }
}