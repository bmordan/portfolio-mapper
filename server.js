require('dotenv').config()
const express = require('express')
const session = require('express-session')
const Sequelize = require('sequelize')
const fetch = require('node-fetch')
const app = express()
const User = require('./lib/User')
const createModels = require('./lib/Models')

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

const sequelize_settings = {
    host: 'localhost',
    dialect: 'mariadb'
}

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

function protect (req, res, next) {
    !req.session.user ? res.redirect('/') : next()
}

app.get('/', (req, res) => {
    req.session.user
        ? res.redirect('/cohorts')
        : res.render('login', {client_id: GOOGLE_CLIENT_ID})
})

app.get('/cohorts/:id_token', async (req, res) => {
    try {
        const googleUser = await getGoogleUser(req.params.id_token)
        req.session.user = new User(googleUser)
        res.redirect('/cohorts') 
    } catch(err) {
        res.send(err)
    }
})

app.post('/standards', protect, async (req, res) => {
    const standard = await Standard.create(req.body)
    res.render('standard', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standard: standard,
        competencies: []
    })
}) 

app.get('/standards/:id/delete', protect, async (req, res) => {
    const standard = await Standard.findByPk(req.params.id)
    await standard.destroy()
    const standards = await Standard.findAll()
    res.render('standards', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standards: standards
    })
})

app.get(['/standards/:id', '/standards/:id/competencies'], protect, async (req, res) => {
    const standard = await Standard.findByPk(req.params.id)
    const competencies = await standard.getCompetencies()
    res.render('standard', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standard: standard,
        competencies: competencies
    }) 
})

app.get('/standards', protect, async (req, res) => {
    const standards = await Standard.findAll()
    res.render('standards', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standards: standards
    })
})

app.post('/standards/:id/competencies', async (req, res) => {
    const standard = await Standard.findByPk(req.params.id)
    const competency = await Competency.create(req.body)
    await standard.addCompetency(competency)
    const competencies = await standard.getCompetencies()
    res.render('standard', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standard: standard,
        competencies: competencies
    })
})

app.get('/standards/:standard_id/competencies/:comptency_id/delete', protect, async (req, res) => {
    const competency = await Competency.findByPk(req.params.comptency_id)
    await competency.destroy()
    const standard = await Standard.findByPk(req.params.standard_id)
    const competencies = await standard.getCompetencies()
    res.render('standard', {
        user: req.session.user,
        client_id: GOOGLE_CLIENT_ID,
        standard: standard,
        competencies: competencies
    })
})

app.get('/cohorts', protect, async (req, res) => {
    const cohorts = await Cohort.findAll({where: {coach: req.session.user.email}})
    const standards = await Standard.findAll()
    res.render('cohorts', {user: req.session.user, client_id: GOOGLE_CLIENT_ID, cohorts, standards})
})

app.post('/cohorts', protect, async (req, res) => {
    const standard = await Standard.findByPk(req.body.standard_id)
    const cohort = await Cohort.create({title: req.body.title, coach: req.session.user.email})
    await standard.addCohort(cohort)
    const standards = await Standard.findAll()
    res.render('cohorts', {user: req.session.user, client_id: GOOGLE_CLIENT_ID, cohorts, standards})
})

app.get('/logout', (req, res) => {
    req.session.user = undefined
    res.redirect('/')
})

datastore.sync().then(() => {
    app.listen(3000, () => {
        console.log(`Portfolio Mapper running...`)
    })
})