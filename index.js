require('@ideadesignmedia/config.js')
const args = require('@ideadesignmedia/arguments.js')
let { OPEN_AI_SECRET, OPEN_AI_ORGANIZATION } = args
if (!OPEN_AI_SECRET) OPEN_AI_SECRET = process.env.OPEN_AI_SECRET
if (!OPEN_AI_ORGANIZATION) OPEN_AI_ORGANIZATION = process.env.OPEN_AI_ORGANIZATION
const { OPEN_AI_ENDPOINT = 'https://api.openai.com' } = process.env
const { request } = require('@ideadesignmedia/helpers')
const http = require('http'), https = require('https'), { URL } = require('url'), EventEmitter = require('events')
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
const get = (path) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'GET', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } })

const Message = (content, role = 'assistant') => ({ // system, user, assistant
    role,
    content
})
const imageSize = (size) => {
    switch(size) {
        case 0: return '256x256'
        case 1: return '512x512'
        case 2: return '1024x1024'
        default: return '256x256'
    }
}

const completion = (messages = [], model = 'gpt-3.5-turbo', resultCount = 1, temperature = 1, topP = 1,) => post(`/v1/chat/completions`, {
    model,
    messages,
    temperature,
    top_p: topP,
    n: resultCount
})

const completionStream = (model = 'gpt-3.5-turbo', messages = [], resultCount = 1, temperature = 1, topP = 1,) => postStream(`/v1/chat/completions`, {
    model,
    messages,
    temperature,
    top_p: topP,
    n: resultCount,
    stream: true
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
const generateImage = (prompt, resultCount, responseFormat = 'url', size = 0, user) => post(`/v1/images/generations`, { //b64_json
    n: Math.min(10, resultCount),
    prompt,
    response_format: responseFormat,
    size: imageSize(size),
    user
})
const editImage = (image, prompt, mask, resultCount, size, responseFormat, user) => post(`/v1/images/edits`, {
    n: Math.min(10, resultCount),
    prompt,
    image,
    mask,
    response_format: responseFormat,
    size: imageSize(size),
    user
})
const getImageVariations = (image, resultCount, size, responseFormat, user) => post(`/v1/images/edits`, {
    n: Math.min(10, resultCount),
    image,
    response_format: responseFormat,
    size: imageSize(size),
    user
})
module.exports = {
    Message,
    completion,
    completionStream,
    get,
    post,
    getFineTunedModels,
    getFineTunedModel,
    createFineTunedModel,
    cancelFineTune,
    getFineTuneEvents,
    generateImage,
    editImage,
    getImageVariations
}