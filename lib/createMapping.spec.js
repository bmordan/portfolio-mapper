const createMapping = require('./createMapping')
const competencies = [
    {
        tag: '#logic',
        desc: 'writes logical code'
    },
    {
        tag: '#data',
        desc: 'can connect to databases'
    }
]
const fileId = '11RA7rRU5hGLf5B43hgJdcRSjSlH-54w1p9wPXA7UmPs'

describe("Tag", () => {
    it('calls out to google', () => {
        return createMapping(competencies, fileId)
            .then(mapping => {
                expect(mapping['#logic'].length).toBe(1)
                expect(mapping['#data'].length).toBe(0)
            })
    })
})
