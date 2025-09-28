import React, { createContext, useContext } from 'react'
import { useFileManager } from '../hooks/useFileManager'

const FileManagerContext = createContext(null)

export const FileManagerProvider = ({ children }) => {
  const value = useFileManager()
  return (
    <FileManagerContext.Provider value={value}>
      {children}
    </FileManagerContext.Provider>
  )
}

export const useFileManagerCtx = () => {
  const context = useContext(FileManagerContext)
  if (!context) {
    throw new Error('useFileManagerCtx must be used within FileManagerProvider')
  }
  return context
}

export default FileManagerContext