// 文件系统相关类型
export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: Date;
  children?: FileItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
}

export interface FileOperation {
  type: 'create' | 'delete' | 'rename' | 'copy' | 'move';
  source: string;
  target?: string;
  newName?: string;
}

// AI聊天相关类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileItem[];
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  context?: {
    files: FileItem[];
    workspace: string;
  };
}

// 代码分析相关类型
export interface CodeAnalysisResult {
  id: string;
  filePath: string;
  language: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: DependencyInfo[];
  metrics: CodeMetrics;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  startLine: number;
  endLine: number;
  complexity: number;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  startLine: number;
  endLine: number;
  extends?: string;
  implements?: string[];
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  static: boolean;
}

export interface ImportInfo {
  source: string;
  imported: string[];
  defaultImport?: string;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'namespace';
  line: number;
}

export interface DependencyInfo {
  source: string;
  target: string;
  type: 'import' | 'require' | 'dynamic';
  line: number;
}

export interface CodeMetrics {
  linesOfCode: number;
  linesOfComments: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
}

// 配置相关类型
export interface AppConfig {
  ai: {
    provider: 'openai' | 'anthropic' | 'custom';
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
    fontSize: number;
    sidebarWidth: number;
  };
  workspace: {
    defaultPath: string;
    autoSave: boolean;
    watchFiles: boolean;
    maxFileSize: number;
  };
  features: {
    codeAnalysis: boolean;
    diagramGeneration: boolean;
    batchProcessing: boolean;
    autoComplete: boolean;
  };
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// 事件类型
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

// 状态类型
export interface AppState {
  files: {
    items: FileItem[];
    selectedItems: string[];
    expandedItems: string[];
    currentPath: string;
    isLoading: boolean;
    error: AppError | null;
  };
  chat: {
    conversations: Conversation[];
    currentConversationId: string | null;
    isTyping: boolean;
    error: AppError | null;
  };
  codeAnalysis: {
    results: CodeAnalysisResult[];
    isAnalyzing: boolean;
    error: AppError | null;
  };
  config: AppConfig;
  ui: {
    sidebarCollapsed: boolean;
    activeTab: 'files' | 'chat' | 'analysis';
    notifications: Notification[];
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}