import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import sharp from 'sharp'

import type { HttpClient } from './http'
import type { ImageResponse, VectorSize } from './types'

type ImageSize = '256x256' | '512x512' | '1024x1024'

/**
 * JSON payload forwarded to the image generation endpoint.
 */
type ImageGenerationRequest = {
  prompt: string
  n: number
  response_format: string
  size: ImageSize
  user?: string
}

/**
 * Converts a VectorSize enum to an API-ready `widthxheight` string.
 *
 * @param size - Vector size alias (0,1,2) matching the helper defaults.
 */
const imageSize = (size: VectorSize): ImageSize => {
  switch (size) {
    case 1:
      return '512x512'
    case 2:
      return '1024x1024'
    case 0:
    default:
      return '256x256'
  }
}

/**
 * Parses a `widthxheight` size string into numeric dimensions.
 *
 * @param size - Image size string such as `512x512`.
 */
const sizeToDimensions = (size: ImageSize): { width: number; height: number } => {
  const [widthString, heightString] = size.split('x')
  const width = Number.parseInt(widthString, 10)
  const height = Number.parseInt(heightString, 10)
  return { width, height }
}

/**
 * Resizes an image to the requested dimensions and stores a temporary PNG.
 *
 * @param sourcePath - Original asset path.
 * @param size - Requested API size string.
 * @returns Absolute path to the resized temporary PNG file.
 */
const createPng = async (sourcePath: string, size: ImageSize): Promise<string> => {
  const absoluteSource = path.resolve(sourcePath)
  const { width, height } = sizeToDimensions(size)
  const temporaryImage = path.join(os.tmpdir(), `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.png`)
  await sharp(absoluteSource)
    .resize(width, height, { fit: 'contain' })
    .png()
    .toFile(temporaryImage)
  return temporaryImage
}

/**
 * Creates helper utilities for OpenAI image generation/edit APIs.
 */
const createImageClient = (http: HttpClient) => {
  /**
   * Generates new images from a prompt via `/v1/images/generations`.
   *
   * @param prompt - Natural language description for the desired image.
   * @param resultCount - Number of alternate renders (clamped 1-10).
   * @param size - Convenience vector size enum for resizing.
   * @param responseFormat - Response transport (`url`, `b64_json`, `file`).
   * @param user - Optional user identifier forwarded to the API.
   */
  const generateImage = (
    prompt: string,
    resultCount = 1,
    size: VectorSize = 0,
    responseFormat: 'url' | 'b64_json' | 'file' = 'url',
    user?: string
  ): Promise<ImageResponse> => {
    const payload: ImageGenerationRequest = {
      prompt,
      n: Math.max(1, Math.min(10, resultCount)),
      response_format: responseFormat === 'file' ? 'url' : responseFormat,
      size: imageSize(size),
      user
    }
    return http.post<ImageResponse, ImageGenerationRequest>('/v1/images/generations', payload)
  }

  /**
   * Edits an existing image using prompt and optional mask.
   *
   * @param imagePath - Path to the base image used as the starting point.
   * @param prompt - Instructions for the edit.
   * @param mask - Optional mask file path (non-transparent areas are replaced).
   * @param resultCount - Number of variations to return.
   * @param size - Desired output size alias.
   * @param responseFormat - Response transport (`url`, `b64_json`, `file`).
   * @param user - Optional user identifier forwarded to the API.
   */
  const editImage = async (
    imagePath: string,
    prompt: string,
    mask?: string | null,
    resultCount = 1,
    size: VectorSize = 0,
    responseFormat: 'url' | 'b64_json' | 'file' = 'url',
    user?: string
  ): Promise<ImageResponse> => {
    const derivedSize = imageSize(size)
    const temporaryImage = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize)
    const temporaryMask = mask ? await createPng(path.isAbsolute(mask) ? mask : path.resolve(mask), derivedSize) : null
    const form = http.createFormData()
    form.append('prompt', prompt)
    form.append('image', fs.createReadStream(temporaryImage))
    if (temporaryMask) {
      form.append('mask', fs.createReadStream(temporaryMask))
    }
    form.append('n', Math.max(1, Math.min(10, resultCount)))
    form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
    form.append('size', derivedSize)
    if (user) {
      form.append('user', user)
    }
    try {
      return await http.postForm<ImageResponse>('/v1/images/edits', form, raw => JSON.parse(raw) as ImageResponse)
    } finally {
      try {
        if (fs.existsSync(temporaryImage)) fs.unlinkSync(temporaryImage)
      } catch {
      }
      if (temporaryMask) {
        try {
          if (fs.existsSync(temporaryMask)) fs.unlinkSync(temporaryMask)
        } catch {
        }
      }
    }
  }

  /**
   * Requests image variations for an existing asset.
   *
   * @param imagePath - Base image path to generate variations from.
   * @param resultCount - Number of variations to request.
   * @param size - Desired size alias for resizing before upload.
   * @param responseFormat - Response transport (`url`, `b64_json`, `file`).
   * @param user - Optional user identifier forwarded to the API.
   */
  const getImageVariations = async (
    imagePath: string,
    resultCount = 1,
    size: VectorSize = 0,
    responseFormat: 'url' | 'b64_json' | 'file' = 'url',
    user?: string
  ): Promise<ImageResponse> => {
    const derivedSize = imageSize(size)
    const temporaryImage = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize)
    const form = http.createFormData()
    form.append('image', fs.createReadStream(temporaryImage))
    form.append('n', Math.max(1, Math.min(10, resultCount)))
    form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
    form.append('size', derivedSize)
    if (user) {
      form.append('user', user)
    }
    try {
      return await http.postForm<ImageResponse>('/v1/images/variations', form, raw => JSON.parse(raw) as ImageResponse)
    } finally {
      try {
        if (fs.existsSync(temporaryImage)) fs.unlinkSync(temporaryImage)
      } catch {
      }
    }
  }

  /**
   * Image helper surface exposing generation, edit, and variation helpers.
   */
  return {
    generateImage,
    editImage,
    getImageVariations
  }
}

export { createImageClient }
