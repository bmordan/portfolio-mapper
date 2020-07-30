require('dotenv').config()
const express = require('express')
const session = require('express-session')
const Sequelize = require('sequelize')
const fetch = require('node-fetch')
const {OAuth2Client} = require('google-auth-library')
const md = require('markdown-it')()
const app = express()
const User = require('./lib/User')
const createModels = require('./lib/Models')
const createMapping = require('./lib/createMapping')
const {version} = require('./package.json')

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    NODE_ENV,
    MYSQL_DATABASE,
    MYSQL_USER,
    MYSQL_PASSWORD
} = process.env


const session_settings = {
    secret: GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: true
}

const sequelize_settings_prod = {
    host: 'mariadb',
    dialect: 'mariadb',
    dialectOptions: {
        timezone: 'Etc/GMT0'
    },
    pool: {
        min: 0,
        max: 2,
        idle: 10000
    }
}

const sequelize_settings_dev = {
    dialect: 'sqlite',
    storage: './db.sqlite'
}

const sequelize_settings = NODE_ENV === 'development' ? sequelize_settings_dev : sequelize_settings_prod

const datastore = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, sequelize_settings)

const {
    Standard,
    Competency,
    Cohort,
    Apprentice
} = createModels(datastore)

app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))
app.use(session(session_settings))

async function getGoogleUser(token) {
    let payload
    if (NODE_ENV === "development") {
        const ticket = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)
            .then(res => res.json())
            .then(payload => payload)
            .catch(console.err)
        payload = ticket
    } else {
        const gapi = new OAuth2Client(GOOGLE_CLIENT_ID)
        const ticket = await gapi.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        })
        payload = ticket.getPayload()
    }

    const { error, iss, aud, exp, hd } = payload
    return !error
        && (iss === "https://accounts.google.com" || iss === "accounts.google.com")
        && aud === GOOGLE_CLIENT_ID
        && Number(exp) > Math.floor(new Date().getTime()/1000)
        && hd === "whitehat.org.uk"
        && payload
}

function getProgress(mapping) {
    const tags = Object.keys(mapping)
    const competencyScore = 100 / tags.length
    return tags.reduce((progress, tag) => {
        return mapping[tag].length ? progress : progress - competencyScore
    }, 100)
}

function protect (req, res, next) {
    !req.session.user ? res.redirect('/') : next()
}

app.get('/', (req, res) => {
    req.session.user
        ? res.redirect('/cohorts')
        : res.render('login', {client_id: GOOGLE_CLIENT_ID, version})
})

app.get('/help', (req, res) => {
    res.render('help', {client_id: GOOGLE_CLIENT_ID, version})
})

app.get('/cohorts/:id_token', async (req, res) => {
    try {
        const googleUser = await getGoogleUser(req.params.id_token)
        req.session.user = new User(googleUser)
        const standards = await Standard.findAll()
        !standards.length ? res.redirect('/standards') : res.redirect('/cohorts') 
    } catch(error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, version})
    }
})

app.post('/standards', protect, async (req, res) => {
    try {
        const standard = await Standard.create(req.body)
        res.render('standard', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            standard: standard,
            competencies: []
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
}) 

app.get('/standards/:id/delete', protect, async (req, res) => {
    try {
        const standard = await Standard.findByPk(req.params.id)
        await standard.destroy()
        const standards = await Standard.findAll()
        res.render('standards', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            version: version,
            standards: standards
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get(['/standards/:id', '/standards/:id/competencies'], protect, async (req, res) => {
    try {
        const standard = await Standard.findByPk(req.params.id)
        const competencies = await standard.getCompetencies()
        res.render('standard', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            standard: standard,
            version: version,
            competencies: competencies,
            md: md
        }) 
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/standards', protect, async (req, res) => {
    try {
        const standards = await Standard.findAll()
        res.render('standards', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            version: version,
            standards: standards
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.post('/standards/:id/competencies', async (req, res) => {
    try {
        const standard = await Standard.findByPk(req.params.id)
        const competency = await Competency.create(req.body)
        await standard.addCompetency(competency)
        res.redirect(`/standards/${req.params.id}`)
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/standards/:standard_id/competencies/:comptency_id/delete', protect, async (req, res) => {
    try {
        const competency = await Competency.findByPk(req.params.comptency_id)
        await competency.destroy()
        const standard = await Standard.findByPk(req.params.standard_id)
        const competencies = await standard.getCompetencies()
        res.render('standard', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            version: version,
            standard: standard,
            competencies: competencies
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.post('/standards/:standard_id/competencies/:comptency_id/update', protect, async (req, res) => {
    try {
        const competency = await Competency.findByPk(req.params.comptency_id)
        await competency.update(req.body)
        res.redirect(`/standards/${req.params.standard_id}`)
    } catch(error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/cohorts', protect, async (req, res) => {
    try {
        const _cohorts = await Cohort.findAll({where: {coach: req.session.user.email}})
        const standards = await Standard.findAll()
        const cohorts = await Promise.all(_cohorts.map(async cohort => {
            cohort.apprentices = await cohort.getApprentices()
            cohort.apprentices = cohort.apprentices.flat()
            return cohort
        }))
        res.render('cohorts', {
            user: req.session.user,
            client_id: GOOGLE_CLIENT_ID,
            version: version,
            cohorts: cohorts,
            standards: standards,
            md: md
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/cohorts/:cohort_id/apprentices/:apprentice_id', async (req, res) => {
    try {
        const apprentice = await Apprentice.findByPk(req.params.apprentice_id)
        const cohort = await Cohort.findByPk(req.params.cohort_id)
        const standard = await cohort.getStandard()
        const competencies = await standard.getCompetencies()
        const mapping = await createMapping(competencies, apprentice.fileId)
        await apprentice.update({progress: getProgress(mapping)})
        res.render('apprentice', {
            user: req.session.user || {name: false},
            client_id: GOOGLE_CLIENT_ID,
            version: version,
            apprentice: apprentice,
            standard: standard,
            competencies: competencies,
            mapping: mapping,
            md: md
        })
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user || {name: false}, version})
    }
})

app.get('/apprentices/:apprentice_id/epa-mocks', async (req, res) => {
    try {
        const {mock, status, cohort} = req.query
        const apprentice = await Apprentice.findByPk(req.params.apprentice_id)
        if (mock === '1') {
            apprentice.mocks = status === 'true' ? 1 : 0
        } else if (mock === '2' && apprentice.mocks > 0) {
            apprentice.mocks = status === 'true' ? 2 : 1
        }
        await apprentice.save()
        res.redirect(`/cohorts#nav-${cohort}`)
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user || {name: false}, version})
    }
})

app.post('/cohorts', protect, async (req, res) => {
    try {
        const standard = await Standard.findByPk(req.body.standard_id)
        const cohort = await Cohort.create({title: req.body.title, coach: req.session.user.email})
        await standard.addCohort(cohort)
        res.redirect(`/cohorts#nav-${req.body.title.split(' ').join('-')}`)
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.post('/cohorts/:id/apprentices', protect, async (req, res) => {
    try {
        const cohort = await Cohort.findByPk(req.params.id)
        const apprentice = await Apprentice.create({
            name: req.body.name,
            fileId: req.body.fileId,
            progress: 0,
            mapping: "{}"
        })
        await cohort.addApprentice(apprentice)
        res.redirect(`/cohorts#nav-${cohort.title.split(' ').join('-')}`)
    } catch (error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.post('/cohorts/:cohort_id/apprentices/:apprentice_id/update', protect, async (req, res) => {
    try {
        const cohort = await Cohort.findByPk(req.params.cohort_id)
        const apprentice = await Apprentice.findByPk(req.params.apprentice_id)
        await apprentice.update({fileId: req.body.fileId})
        res.redirect(`/cohorts#nav-${cohort.title.split(' ').join('-')}`)
    } catch(error) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/cohorts/:cohort_id/apprentices/:apprentice_id/delete', protect, async (req, res) => {
    try {
        const cohort = await Cohort.findByPk(req.params.cohort_id)
        const apprentice = await Apprentice.findByPk(req.params.apprentice_id)
        await apprentice.destroy()
        res.redirect(`/cohorts#nav-${cohort.title.split(' ').join('-')}`)
    } catch (err) {
        res.render('error', {error, client_id: GOOGLE_CLIENT_ID, user: req.session.user, version})
    }
})

app.get('/logout', (req, res) => {
    req.session.user = undefined
    console.log('user logged out')
    res.send('logged out')
})

datastore.sync().then(() => {
    const PORT = NODE_ENV === 'development' ? 3000 : 3030
    app.listen(PORT, () => {
        console.log(`Papper v${version} running on ${PORT}`)
    })
})