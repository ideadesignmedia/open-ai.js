require('@ideadesignmedia/config.js')
const args = require('@ideadesignmedia/arguments.js')
let { OPEN_AI_SECRET, OPEN_AI_ORGANIZATION } = args
if (!OPEN_AI_SECRET) OPEN_AI_SECRET = process.env.OPEN_AI_SECRET
if (!OPEN_AI_ORGANIZATION) OPEN_AI_ORGANIZATION = process.env.OPEN_AI_ORGANIZATION
const { OPEN_AI_ENDPOINT = 'https://api.openai.com' } = process.env
const { request, download } = require('@ideadesignmedia/helpers')
const http = require('http'), https = require('https'), { URL } = require('url'), EventEmitter = require('events'), FormData = require('form-data'), fs = require('fs'), path = require('path'), os = require('os')
const { exec } = require('child_process')
const sharp = require('sharp')
const parse = d => {
    let o
    try {
        o = JSON.parse(d)
    } catch (e) {
        return d
    }
    return o
}
class ResponseStream {
    constructor(stream) {
        this.stream = stream
        this.emitter = new EventEmitter()
        this.d = ''
        this.results = []
        this.stream.on('data', l => {
            this.d += l
            let r = this.d.replace(/^data: /g, '').split('\n').map(json => parse(json))
            this.d = ''
            for (let i = 0; i < r.length; i++) {
                if (!r[i]) continue
                let t = parse(r[i])
                if (typeof t === 'object') {
                    const choices = t.choices.filter(({ delta }) => !delta.role).map(({ delta: { content } }) => content)
                    this.results.push(choices)
                    this.emitter.emit('data', choices)
                } else {
                    this.d += t + (i != r.length - 1 ? '\n' : '')
                }
            }
        })
        this.stream.on('end', () => {
            if (this.d) {
                let r = parse(this.d)
                if (typeof r === 'object') {
                    results.push(r)
                }
            }
            const reduced = this.results.reduce((a, b) => {
                for (let z = 0; z < b.length; z++) {
                    if (!a[z]) a[z] = ''
                    a[z] += b[z]
                }
                return a
            }, [])
            this.emitter.emit('complete', reduced)
        })
        this.emitter.on('data', d => {
            if (typeof this.onData === 'function') this.onData(d)
        })
        this.emitter.on('complete', d => {
            if (typeof this.onComplete === 'function') this.onComplete(d)
        })
    }
}
const streamResponses = (url = '', options = {}, data = '') => {
    return new Promise((res, rej) => {
        let link = new URL(url)
        let provider = link.protocol === 'https:' ? https : http
        let req = provider.request(link, options, resp => {
            return res(new ResponseStream(resp))
        })
        req.on('error', e => rej(e))
        if (data) req.write(data)
        req.end()
    })
}
const post = (path, data) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'POST', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } }, JSON.stringify(data))
const postStream = (path, data) => streamResponses(`${OPEN_AI_ENDPOINT}${path}`, { method: 'POST', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } }, JSON.stringify(data))
const postForm = (path, form) => new Promise((res, rej) => {
    const link = new URL(`${OPEN_AI_ENDPOINT}${path}`)
    const provider = link.protocol === 'https:' ? https : http
    const req = provider.request(link, {
        method: 'post',
        headers: { ...form.getHeaders(), 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION }
    });
    req.on('error', e => rej(e))
    req.on('response', resp => {
        let d = ''
        resp.on('data', l => d += l)
        resp.on('end', () => {
            let o
            try {
                o = JSON.parse(d)
            } catch (e) {
                return res(d)
            }
            return res(o)
        })
    })
    form.pipe(req);
})
const uploadFileCurl = (pathname, filePath, purpose) => new Promise((res, rej) => {
    exec(`curl ${OPEN_AI_ENDPOINT}${pathname} \
    -H "Authorization: Bearer ${OPEN_AI_SECRET}" \
    -F purpose="${purpose}" \
    -F file="@${path.resolve(filePath)}"`, (err, stdout, stderr) => {
        if (err) return rej(err)
        if (stderr) return rej(stderr)
        try {
            return res(JSON.parse(stdout))
        } catch (e) {
            return rej(e)
        }
    })
})
const get = (path) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'GET', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } })
const del = (path) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } })

const Message = (content, role = 'assistant') => ({ // system, user, assistant
    role,
    content
})
const imageSize = (size) => {
    switch (size) {
        case 0: return '256x256'
        case 1: return '512x512'
        case 2: return '1024x1024'
        default: return '256x256'
    }
}
const createPng = (imagePath, size) => new Promise((res, rej) => {
    const [width, height] = size.split('x').map(a => parseInt(a))
    try {
        const tempFilePath = `${os.tmpdir()}/${new Date().getTime()}-${Math.floor(Math.random()*1000000)}.png`
        const fileStream = fs.createReadStream(imagePath)
        const image = sharp().resize(width, height, {
            fit: 'fill',
        }).png()
        const tempStream = fs.createWriteStream(tempFilePath)
        fileStream.pipe(image).pipe(tempStream)
        tempStream.on('close', () => {
            return res(tempFilePath)
        })
    } catch (e) {
        return rej(e)
    }
})
const completion = (messages = [], resultCount = 1, stop, options = {
    model: 'gpt-3.5-turbo'
}) => post(`/v1/completions`, {
    messages,
    n: resultCount,
    stop: stop || undefined,
    ...options
})
const chatCompletion = (messages = [], resultCount = 1, stop, options = {
    model: 'gpt-3.5-turbo'
}) => post(`/v1/chat/completions`, {
    messages,
    n: resultCount,
    stop: stop || undefined,
    ...options
})

const completionStream = (messages = [], resultCount = 1, stop, options = {
    model: 'gpt-3.5-turbo'
}) => postStream(`/v1/completions`, {
    messages,
    n: resultCount,
    stream: true,
    stop: stop || undefined,
    ...options
})
const chatCompletionStream = (messages = [], resultCount = 1, stop, options = {
    model: 'gpt-3.5-turbo'
}) => postStream(`/v1/chat/completions`, {
    messages,
    n: resultCount,
    stream: true,
    stop: stop || undefined,
    ...options
})

const getFineTunedModels = () => get(`/v1/fine-tunes`)
const getFineTunedModel = (id) => get(`/v1/fine-tunes/${id}`)
const createFineTunedModel = (trainingFile, validationFile, model, epochs, batchSize, learningRate, promptLoss, computeClassificationMetrics, classificationClasses, classificationBetas, suffix) => post(`/v1/fine-tunes`, {
    training_file: trainingFile,
    validationFile: validationFile,
    model: model,
    n_epochs: epochs,
    batch_size: batchSize,
    learning_rate_multiplier: learningRate,
    prompt_loss_weight: promptLoss,
    compute_classification_metrics: computeClassificationMetrics,
    classification_n_classes: classificationClasses,
    classification_betas: classificationBetas,
    suffix
})
const cancelFineTune = (id) => post(`/v1/fine-tunes/${id}/cancel`)
const getFineTuneEvents = (id) => get(`/v1/fine-tunes/${id}/events`)
const deleteFineTune = model => del(`/v1/models/${model}`)
const generateImage = (prompt, resultCount = 1, size = 0, responseFormat = 'url', user) => post(`/v1/images/generations`, { //b64_json
    n: Math.max(1, Math.min(10, resultCount)),
    prompt,
    response_format: responseFormat === 'file' ? 'url' : responseFormat,
    size: imageSize(size),
    user
}).then(async result => {
    if (responseFormat !== file) return result
    let data = result.result.data
    let images = await Promise.allSettled(data.map(async ({ url }) => {
        const tempDownload = `${os.tmpdir()}/${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}.png`
        let file = await download(url, tempDownload)
        let buffer = fs.readFileSync(file)
        fs.unlinkSync(tempDownload)
        return buffer
    }))
    return images.map(({ value, status, reason }, i) => {
        if (status === 'fulfilled') return { error: false, result: value, url: data[i].url }
        return { error: true, message: reason, url: data[i].url }
    })
})
const editImage = (imagePath,prompt, mask, resultCount = 1, size = 0, responseFormat = 'url', user) => new Promise(async (res, rej) => {
    let fileCreationError
    const derivedSize = imageSize(size)
    const tempFilePath = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize).catch(e => {
        fileCreationError = e
        return null
    })
    if (fileCreationError) return rej(fileCreationError)
    const tempMaskPath = mask ? await createPng(path.isAbsolute(mask) ? mask : path.resolve(mask), derivedSize).catch(e => {
        fileCreationError = e
        return null
    }) : null
    if (fileCreationError) return rej(fileCreationError)
    const form = new FormData();
    try {
        form.append('prompt', prompt)
        form.append('image', fs.createReadStream(tempFilePath))
        if (tempMaskPath) form.append('mask', fs.createReadStream(tempMaskPath))
        form.append('n', Math.max(Math.min(10, resultCount), 1))
        form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
        form.append('size', imageSize(size))
        if (user) form.append('user', user)
    } catch (e) {
        return rej(e)
    }
    postForm('/v1/images/edits', form).then(async result => {
        if (responseFormat !== 'file') return res(result)
        let data = result.result.data
        let images = await Promise.allSettled(data.map(async ({url}) => {
            const tempDownload = `${os.tmpdir()}/${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}.png`
            let file = await download(url, tempDownload)
            let buffer = fs.readFileSync(file)
            fs.unlinkSync(tempDownload)
            return buffer
        })).catch(e => {
            return rej(e)
        })
        return res(images.map(({value, status, reason}, i) => {
            if (status === 'fulfilled') return {error: false, result: value, url: data[i].url}
            return {error: true, message: reason, url: data[i].url}
        }))
    }).catch(rej).finally(() => {
        try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
        } catch { }
    })
})

const getImageVariations = (imagePath, resultCount = 1, size = 0, responseFormat = 'url', user) => new Promise(async (res, rej) => {
    let fileCreationError
    const derivedSize = imageSize(size)
    const tempFilePath = await createPng(path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath), derivedSize).catch(e => {
        fileCreationError = e
        return null
    })
    if (fileCreationError) return rej(fileCreationError)
    const form = new FormData();
    try {
        form.append('image', fs.createReadStream(tempFilePath))
        form.append('n', Math.max(1, Math.min(10, resultCount)))
        form.append('response_format', responseFormat === 'file' ? 'url' : responseFormat)
        form.append('size', derivedSize)
        if (user) form.append('user', user)
    } catch (e) {
        return rej(e)
    }
    postForm('/v1/images/variations', form).then(async result => {
        if (responseFormat !== 'file') return res(result)
        let data = result.result.data
        let images = await Promise.allSettled(data.map(async ({url}) => {
            const tempDownload = `${os.tmpdir()}/${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}.png`
            let file = await download(url, tempDownload)
            let buffer = fs.readFileSync(file)
            fs.unlinkSync(tempDownload)
            return buffer
        })).catch(e => {
            return rej(e)
        })
        return res(images.map(({value, status, reason}, i) => {
            if (status === 'fulfilled') return {error: false, result: value, url: data[i].url}
            return {error: true, message: reason, url: data[i].url}
        }))
    }).catch(rej).finally(() => {
        try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
        } catch { }
    })
})
const getEmbedding = (input, model = 'text-embedding-ada-002', user) => post('/v1/embeddings', {
    model,
    input,
    user
})
const getTranscription = async (file, prompt = '', language = 'en', responseFormat = 'json', temperature = 0) => { // text, srt, verbose_json, or vtt.
    const form = new FormData();
    if (prompt) form.append('prompt', prompt);
    if (temperature) form.append('temperature', temperature);
    if (language) form.append('language', language);
    if (response_format) form.append('response_format', responseFormat);
    form.append('model', 'whisper-1')
    form.append('file', fs.createReadStream(file));
    return await postForm('/v1/audio/transcriptions', form)
}
const getTranslation = async (file, prompt, responseFormat, temperature) => {
    const form = new FormData();
    if (prompt) form.append('prompt', prompt);
    if (temperature) form.append('temperature', temperature);
    if (response_format) form.append('response_format', responseFormat);
    form.append('model', 'whisper-1');
    form.append('file', fs.createReadStream(file));
    return await postForm('/v1/audio/translations', form)
}
const getFiles = () => get('/v1/files')
const getFile = (id) => get(`/v1/files/${id}`)
const getFileContent = (id) => get(`/v1/files/${id}/content`)
const uploadFile = (file, purpose = 'fine-tune') => uploadFileCurl('/v1/files', file, purpose)
const deleteFile = (id) => del(`/v1/files/${id}`)
const moderation = (input, model = 'text-moderation-stable') => post('/v1/moderations', { //text-moderation-latest 
    input,
    model
})
const edit = (instruction, input, numberOfEdits, options = { model: 'text-davinci-edit-001' }) => post('/v1/edits', { // code-davinci-edit-001
    instruction,
    input,
    n: numberOfEdits,
    ...options
})
const getModels = () => get('/v1/models')
const getModel = (model) => get(`/v1/models/${model}`)
module.exports = {
    get,
    post,
    del,
    postForm,
    postStream,
    Message,
    getModel,
    getModels,
    edit,
    completion,
    completionStream,
    chatCompletion,
    chatCompletionStream,
    getFineTunedModels,
    getFineTunedModel,
    createFineTunedModel,
    cancelFineTune,
    deleteFineTune,
    getFineTuneEvents,
    generateImage,
    editImage,
    getImageVariations,
    getEmbedding,
    getTranscription,
    getTranslation,
    getFiles,
    getFile,
    getFileContent,
    uploadFile,
    deleteFile,
    moderation
}