import * as fs from 'fs'
import * as path from 'path'

import type { HttpClient } from './http'
import type { DeleteResponse, FileListResponse, FileObject, JsonValue } from './types'

/**
 * Creates helper functions for the Files API (`/v1/files`).
 *
 * @param http - HTTP client used for REST and multipart methods.
 */
const createFileClient = (http: HttpClient) => {
  /**
   * Lists all uploaded files visible to the API key.
   */
  const getFiles = (): Promise<FileListResponse> => {
    return http.get<FileListResponse>('/v1/files')
  }

  /**
   * Retrieves metadata for a single uploaded file.
   *
   * @param id - File identifier returned from previous uploads/list calls.
   */
  const getFile = (id: string): Promise<FileObject> => {
    return http.get<FileObject>(`/v1/files/${id}`)
  }

  /**
   * Downloads a file's content and returns a UTF-8 string.
   *
   * @param id - File identifier to fetch from `/content` endpoint.
   */
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

  /**
   * Uploads a file for fine-tuning or other OpenAI workloads.
   *
   * @param file - Path to the file on disk (relative or absolute).
   * @param purpose - API purpose string (defaults to `fine-tune`).
   */
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

  /**
   * Deletes a file from the Files API.
   *
   * @param id - File identifier to delete.
   */
  const deleteFile = (id: string): Promise<DeleteResponse> => {
    return http.del<DeleteResponse>(`/v1/files/${id}`)
  }

  /**
   * Files helper surface exposing CRUD helpers.
   */
  return {
    getFiles,
    getFile,
    getFileContent,
    uploadFile,
    deleteFile
  }
}

export { createFileClient }
