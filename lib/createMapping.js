const {google} = require('googleapis')
const credentials = require('../portfolio-mapper-509334ac8c76.json')
const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
]
const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, scopes)
const drive = google.drive({version: 'v3', auth})
const fields = '*'
module.exports = async function (competencies, fileId) {
    try {
        const comments = await drive.comments.list({fileId, fields})
        const mapping = competencies.reduce((memo, competency) => {
           memo[competency.tag] = []
           return memo
        }, {})
        Object.keys(mapping).forEach(competencyTag => {
            const tag = new RegExp(`^tag`.replace('tag', competencyTag))
            mapping[competencyTag] = comments.data.comments.filter(c => c.content.match(tag))
        })
        return mapping
    } catch (err) {
        return err
    }
}