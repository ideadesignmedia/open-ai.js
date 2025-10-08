import * as fs from 'fs'
import * as path from 'path'

import type { HttpClient } from './http'
import type { DeleteResponse, FileListResponse, FileObject, JsonValue } from './types'

const createFileClient = (http: HttpClient) => {
  const getFiles = (): Promise<FileListResponse> => {
    return http.get<FileListResponse>('/v1/files')
  }

  const getFile = (id: string): Promise<FileObject> => {
    return http.get<FileObject>(`/v1/files/${id}`)
  }

  const getFileContent = async (id: string): Promise<string> => {
    const content = await http.get<string | Buffer | Uint8Array | JsonValue>(`/v1/files/${id}/content`)
    if (typeof content === 'string') {
      return content
    }
    if (Buffer.isBuffer(content)) {
      return content.toString('utf8')
    }
    if (content instanceof Uint8Array) {
      return Buffer.from(content).toString('utf8')
    }
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content)
    }
    throw new Error('Unexpected file content type')
  }

  const uploadFile = async (file: string, purpose = 'fine-tune'): Promise<FileObject> => {
    const absolutePath = path.isAbsolute(file) ? file : path.resolve(file)
    if (!fs.existsSync(absolutePath)) {
      throw new Error('File not found: ' + absolutePath)
    }
    const form = http.createFormData()
    form.append('purpose', purpose)
    form.append('file', fs.createReadStream(absolutePath))
    return http.postForm<FileObject>('/v1/files', form, raw => JSON.parse(raw) as FileObject)
  }

  const deleteFile = (id: string): Promise<DeleteResponse> => {
    return http.del<DeleteResponse>(`/v1/files/${id}`)
  }

  return {
    getFiles,
    getFile,
    getFileContent,
    uploadFile,
    deleteFile
  }
}

export { createFileClient }
