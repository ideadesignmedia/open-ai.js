import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import sharp from 'sharp'

import type { HttpClient } from './http'
import type { ImageResponse, VectorSize } from './types'

type ImageSize = '256x256' | '512x512' | '1024x1024'

type ImageGenerationRequest = {
  prompt: string
  n: number
  response_format: string
  size: ImageSize
  user?: string
}

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

const sizeToDimensions = (size: ImageSize): { width: number; height: number } => {
  const [widthString, heightString] = size.split('x')
  const width = Number.parseInt(widthString, 10)
  const height = Number.parseInt(heightString, 10)
  return { width, height }
}

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

const createImageClient = (http: HttpClient) => {
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

  return {
    generateImage,
    editImage,
    getImageVariations
  }
}

export { createImageClient }
