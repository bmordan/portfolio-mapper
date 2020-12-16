const fetch = require('node-fetch')

module.exports = async (apprentice) => {
    const {fileId} = apprentice
    if (!fileId) return 'document'
    const doctypes = {
        document: await fetch(`https://docs.google.com/document/d/${fileId}/`).then(res => res.status),
        presentation: await fetch(`https://docs.google.com/presentation/d/${fileId}/`).then(res => res.status),
        spreadsheets: await fetch(`https://docs.google.com/spreadsheets/d/${fileId}/`).then(res => res.status)
    }
    const [doctype] = Object.keys(doctypes).filter(type => doctypes[type] === 200)
    apprentice.doctype = doctype || 'document'
    await apprentice.save()
}