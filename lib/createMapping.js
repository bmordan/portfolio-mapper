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
const thisTag = (tag, comment) => {
    return comment.match(new RegExp(`^${tag.substring(1)}`))
}
const addBadges = (tag, comment) => {
    const matchablePartials = comment.content.split('#').filter(thisTag.bind(null, tag))
    return {...comment, badges: matchablePartials && matchablePartials[0].match(/\d.?of.?\d/g) || []}
}

const getPercentageOfCompetency = (competency, tags) => {
    const bulletPoints = competency.desc.match(/\*/g)
    if (!bulletPoints) return 100
    
    const tagged = tags.reduce((memo, comment) => {
        const matchablePartials = comment.content.split('#').filter(comment => thisTag(competency.tag, comment))
        if (matchablePartials) {
            const partials = matchablePartials[0].match(/\d.?of.?\d/g)
            if (partials) {
                partials.forEach(partial => {
                    memo.add(Number(partial[0]))
                })
            }
        }
        return memo
    }, new Set())
    // say you have '2 of 3' and '1 of 3' thats 66.66667% of a single competency
    return Number(((100 / bulletPoints.length) * tagged.size).toFixed(3)) || 100
}

module.exports = async function (competencies, fileId) {
    try {
        const comments = await getComments({fileId, fields: "*", includeDeleted: false})
        return competencies.reduce((memo, competency) => {
            const tag = new RegExp(`tag\\b`.replace('tag', competency.tag))
            const tags = comments.filter(commentsFilter.bind(null, tag)).map(addBadges.bind(null, competency.tag))
            const progress = {
                percentageOfStandard: Math.round(100 / competencies.length),
                percentageOfCompetency: getPercentageOfCompetency(competency, tags)
            }
            memo[competency.tag] = {tags, progress}
            return memo
        }, {})
    } catch (err) {
        console.error(err)
        return err
    }
}