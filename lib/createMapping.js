const {google} = require('googleapis')
const atob = require('atob')
const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
]
const auth = new google.auth.JWT(process.env.DRIVE_CLIENT_EMAIL, null, atob(process.env.DRIVE_PRIVATE_KEY), scopes)
const drive = google.drive({version: 'v3', auth})
const fields = '*'
module.exports = async function (competencies, fileId) {
    try {
        const comments = await drive.comments.list({fileId, fields})
        const mapping = competencies.reduce((memo, competency) => {
            memo[competency.tag] = []
            return memo
        }, {})
        console.log(JSON.stringify(comments.data.comments, null, 2))
        Object.keys(mapping).forEach(competencyTag => {
            const tag = new RegExp(`tag`.replace('tag', competencyTag))
            mapping[competencyTag] = comments.data.comments.filter(c => c.content.match(tag))

                // what about the comments not made by the coach?
        })
        return mapping
    } catch (err) {
        console.error(err)
        return err
    }
}