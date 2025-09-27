import React, { useState, useEffect } from 'react';
import { Button, Input, Tree, message, Modal, Form } from 'antd';
import { 
  FolderOutlined, 
  FileOutlined, 
  PlusOutlined, 
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useFileStore } from '@/store/fileStore';
import { FileItem } from '@/types';
import './FileManager.css';

const { Search } = Input;

export const FileManager: React.FC = () => {
  const {
    items,
    selectedItems,
    expandedItems,
    currentPath,
    isLoading,
    error,
    searchQuery,
    filteredItems,
    loadFolder,
    selectItem,
    toggleExpanded,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    searchFiles,
    refreshFolder,
    clearError
  } = useFileStore();

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: FileItem | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    item: null
  });

  const [createModal, setCreateModal] = useState<{
    visible: boolean;
    type: 'file' | 'folder';
    parentPath?: string;
  }>({
    visible: false,
    type: 'file'
  });

  const [renameModal, setRenameModal] = useState<{
    visible: boolean;
    item: FileItem | null;
  }>({
    visible: false,
    item: null
  });

  const [form] = Form.useForm();

  useEffect(() => {
    // Load default folder on mount
    if (!currentPath) {
      loadFolder('/workspace');
    }
  }, [currentPath, loadFolder]);

  useEffect(() => {
    if (error) {
      message.error(error.message);
      clearError();
    }
  }, [error, clearError]);

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      toggleExpanded(item.id);
    } else {
      selectItem(item.id);
    }
  };

  const handleItemRightClick = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCreateItem = (type: 'file' | 'folder') => {
    setCreateModal({
      visible: true,
      type,
      parentPath: contextMenu.item?.path
    });
    handleContextMenuClose();
  };

  const handleRenameItem = () => {
    if (contextMenu.item) {
      setRenameModal({
        visible: true,
        item: contextMenu.item
      });
    }
    handleContextMenuClose();
  };

  const handleDeleteItem = async () => {
    if (contextMenu.item) {
      try {
        await deleteItem(contextMenu.item.id);
        message.success('删除成功');
      } catch (error) {
        message.error('删除失败');
      }
    }
    handleContextMenuClose();
  };

  const handleCreateSubmit = async (values: { name: string }) => {
    try {
      if (createModal.type === 'file') {
        await createFile(values.name, createModal.parentPath);
      } else {
        await createFolder(values.name, createModal.parentPath);
      }
      message.success(`${createModal.type === 'file' ? '文件' : '文件夹'}创建成功`);
      setCreateModal({ visible: false, type: 'file' });
      form.resetFields();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleRenameSubmit = async (values: { name: string }) => {
    if (renameModal.item) {
      try {
        await renameItem(renameModal.item.id, values.name);
        message.success('重命名成功');
        setRenameModal({ visible: false, item: null });
        form.resetFields();
      } catch (error) {
        message.error('重命名失败');
      }
    }
  };

  const renderTreeData = (items: FileItem[]): any[] => {
    return items.map(item => ({
      key: item.id,
      title: (
        <div
          className={`file-item ${selectedItems.includes(item.id) ? 'selected' : ''}`}
          onClick={() => handleItemClick(item)}
          onContextMenu={(e) => handleItemRightClick(e, item)}
        >
          {item.type === 'folder' ? <FolderOutlined /> : <FileOutlined />}
          <span className="file-name">{item.name}</span>
          {item.size && (
            <span className="file-size">
              {(item.size / 1024).toFixed(1)}KB
            </span>
          )}
        </div>
      ),
      children: item.children ? renderTreeData(item.children) : undefined,
      isLeaf: item.type === 'file'
    }));
  };

  if (isLoading) {
    return (
      <div className="file-manager">
        <div className="file-manager-header">
          <h3>文件管理器</h3>
        </div>
        <div className="file-manager-content">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h3>文件管理器</h3>
        <div className="file-manager-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModal({ visible: true, type: 'file' })}
          >
            新建文件
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setCreateModal({ visible: true, type: 'folder' })}
          >
            新建文件夹
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshFolder}
          >
            刷新
          </Button>
        </div>
      </div>

      <div className="file-manager-content">
        <div className="file-manager-search">
          <Search
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => searchFiles(e.target.value)}
            allowClear
          />
        </div>

        <div className="file-manager-tree">
          <Tree
            treeData={renderTreeData(filteredItems)}
            expandedKeys={expandedItems}
            onExpand={(keys) => {
              keys.forEach(key => {
                if (!expandedItems.includes(key as string)) {
                  toggleExpanded(key as string);
                }
              });
            }}
            showLine
            showIcon
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onClick={handleContextMenuClose}
        >
          <div className="context-menu-item" onClick={() => handleCreateItem('file')}>
            新建文件
          </div>
          <div className="context-menu-item" onClick={() => handleCreateItem('folder')}>
            新建文件夹
          </div>
          {contextMenu.item && (
            <>
              <div className="context-menu-item" onClick={handleRenameItem}>
                重命名
              </div>
              <div className="context-menu-item" onClick={handleDeleteItem}>
                删除
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        title={`新建${createModal.type === 'file' ? '文件' : '文件夹'}`}
        open={createModal.visible}
        onCancel={() => setCreateModal({ visible: false, type: 'file' })}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreateSubmit}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder={`请输入${createModal.type === 'file' ? '文件' : '文件夹'}名称`} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        title="重命名"
        open={renameModal.visible}
        onCancel={() => setRenameModal({ visible: false, item: null })}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleRenameSubmit}>
          <Form.Item
            name="name"
            label="新名称"
            initialValue={renameModal.item?.name}
            rules={[{ required: true, message: '请输入新名称' }]}
          >
            <Input placeholder="请输入新名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};