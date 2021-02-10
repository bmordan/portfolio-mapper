const {Sequelize} = require('sequelize')
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
const fileId = '1lXApTvk3WGMWMsVOanVgNSOm8yaCI6wfXPwt7YNZ8R4'
let Standard, Competency;

beforeAll(async () => {
    const sequelize = new Sequelize('sqlite::memory:', {logging: false})
    const models = require('./Models')(sequelize)
    Standard = models.Standard
    Competency = models.Competency
    await sequelize.sync()
})

describe('Tag', () => {
    it('calls out to google', () => {
        return createMapping(competencies, fileId)
            .then(mapping => {
                expect(mapping['#logic'].tags.length).toBe(1)
                expect(mapping['#data'].tags.length).toBe(0)
            })
    })
})

describe('granular competencies', () => {
    let testStandard
    
    beforeAll(async () => {
        testStandard = await Standard.create({title: 'Test Standard'})
        expect(testStandard.title).toBe('Test Standard')
        await testStandard.createCompetency({tag: '#logic', desc: `Apprentices can write code to achieve the desired functionality and which is easy to read and understand, with good naming, indentation and commenting, and applying the fundamentals of good coding:

        * development paradigms (where this is object-oriented programming this must include inheritance, abstractions, encapsulation, polymorphism);
        * software programming languages;
        * software development tools (IDEs);
        * writing programs and methods;
        * language-specific idioms;
        * logic and flow-of-control.`})
        await testStandard.createCompetency({tag: '#testers', desc: `Can interact with testers to optimise the user interface.`})
    })

    test('mapping object has 2 properties', async () => {
        const competencies = await testStandard.getCompetencies()
        const mapping = await createMapping(competencies, fileId)
        expect(Object.keys(mapping).length).toBe(2)
        expect(Array.isArray(mapping['#logic'].tags)).toBe(true)
        expect(mapping['#logic'].progress.percentageOfStandard).toBe(50)
        expect(mapping['#logic'].progress.percentageOfCompetency).toBe(16.66667)
        expect(mapping['#testers'].progress.percentageOfStandard).toBe(50)
        expect(mapping['#testers'].progress.percentageOfCompetency).toBe(100)
    })
})
