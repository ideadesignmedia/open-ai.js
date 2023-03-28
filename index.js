require('@ideadesignmedia/config.js')
const args = require('@ideadesignmedia/arguments.js')
const { OPEN_AI_SECRET, OPEN_AI_ORGANIZATION } = args
const { request } = require('@ideadesignmedia/helpers')
const { OPEN_AI_ENDPOINT } = process.env

const post = (path, data) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'POST', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } }, JSON.stringify(data))
const get = (path) => request(`${OPEN_AI_ENDPOINT}${path}`, { method: 'GET', headers: { 'Authorization': `Bearer ${OPEN_AI_SECRET}`, 'OpenAI-Organization': OPEN_AI_ORGANIZATION, 'Content-Type': 'application/json' } })





module.exports = {

}