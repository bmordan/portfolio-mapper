const {Sequelize} = require('sequelize')
const createMapping = require('./createMapping')
const competencies = [
    {
        tag: '#logic',
        desc: `Apprentices can write code to achieve the desired functionality and which is easy to read and understand, with good naming, indentation and commenting, and applying the fundamentals of good coding:

        * development paradigms (where this is object-oriented programming this must include inheritance, abstractions, encapsulation, polymorphism);
        * software programming languages;
        * software development tools (IDEs);
        * writing programs and methods;
        * language-specific idioms;
        * logic and flow-of-control.`
    },
    {
        tag: '#testers',
        desc: `Can interact with testers to optimise the user interface.`
    },
    {
        tag: '#business',
        desc: `Aware of a business context: 
        * as a driver for change
        * as a component of teams
        * some other thing that has not been evidenced`
    },
    {
        tag: '#UI',
        desc: `Can create:
        * Amazing UI
        * Awesome UI
        * Absolute UI
        * Asymmetric UI`
    },
    {
        tag: '#data',
        desc: 'The data competencies (not included in test)'
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
        return await Promise.all(competencies.map(competency => testStandard.createCompetency(competency)))
    })

    test('mapping object has 2 properties', async () => {
        const competencies = await testStandard.getCompetencies()
        const mapping = await createMapping(competencies, fileId)
        expect(Object.keys(mapping).length).toBe(competencies.length)
        expect(Array.isArray(mapping['#logic'].tags)).toBe(true)
        expect(mapping['#logic'].progress.percentageOfStandard).toBe(100/competencies.length)
        expect(mapping['#logic'].progress.percentageOfCompetency).toBe(100)
        expect(mapping['#testers'].progress.percentageOfStandard).toBe(100/competencies.length)
        expect(mapping['#testers'].progress.percentageOfCompetency).toBe(100)
    })

    test('partially met competencies are a thing', async () => {
        const competencies = await testStandard.getCompetencies()
        const mapping = await createMapping(competencies, fileId)
        expect(mapping['#business'].progress.percentageOfCompetency).toBe(66.667)
    })
})
