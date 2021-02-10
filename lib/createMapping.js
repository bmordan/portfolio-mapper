const {google} = require('googleapis')
const atob = require('atob')
const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
]
const auth = new google.auth.JWT(process.env.DRIVE_CLIENT_EMAIL, null, atob(process.env.DRIVE_PRIVATE_KEY), scopes)
const drive = google.drive({version: 'v3', auth})

async function getComments (params) {
    let nextPageToken = true
    const comments = []
    while (nextPageToken) {
        try {
            const {data} = await drive.comments.list({...params, pageToken: nextPageToken})
            comments.push(data.comments)
            nextPageToken = data.nextPageToken
        } catch(err) {
            console.error(err)
            break;
        }
    }
    return comments.flat()
}

const commentsFilter = (tag, comment) => {
    const override = comment.replies.some(reply => {
        return reply.content && reply.content.match(tag) && reply.content.includes('not')
    }) // "not sure about #data" will override the apprentices tag
    return override ? false : comment.content.match(tag)
}

const getPercentageOfCompetency = (competency) => {
    const bulletPoints = competency.desc.match(/\*/g)
    return bulletPoints ? Number((100/bulletPoints.length).toFixed(5)) : 100
}

module.exports = async function (competencies, fileId) {
    try {
        const comments = await getComments({fileId, fields: "*", includeDeleted: false})
        return competencies.reduce((memo, competency) => {
            const tag = new RegExp(`tag\\b`.replace('tag', competency.tag))
            const tags = comments.filter(commentsFilter.bind(null, tag))
            const progress = {
                percentageOfStandard: 100 / competencies.length,
                percentageOfCompetency: getPercentageOfCompetency(competency)
            }
            memo[competency.tag] = {tags, progress}
            return memo
        }, {})
    } catch (err) {
        console.error(err)
        return err
    }
}