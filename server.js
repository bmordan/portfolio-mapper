require('dotenv').config()
const express = require('express')
const session = require('express-session')
const fetch = require('node-fetch')
const app = express()
const User = require('./lib/User')

const {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NODE_ENV} = process.env

const session_settings = {
    secret: GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: true
}

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

function protect (req, res, next) {
    next()
}

app.get('/', (req, res) => {
    res.render('login', {client_id: GOOGLE_CLIENT_ID})
})

app.get('/cohorts/:id_token', (req, res) => {
    getGoogleUser(req.params.id_token)
        .then(googleUser => {
            req.session.user = new User(googleUser)
            res.render('cohorts', {user: req.session.user, client_id: GOOGLE_CLIENT_ID})
        })
        .catch(err => {
            console.error(err)
            res.redirect('/')
        }) 
})

app.get('/cohorts', protect, (req, res) => {
    res.render('cohorts', {user: req.session.user, client_id: GOOGLE_CLIENT_ID})
})

app.get('/standards', protect, (req, res) => {
    res.render('standards', {user: req.session.user, client_id: GOOGLE_CLIENT_ID})
})

app.post('/standards', (req, res) => {
    console.log(req.body)
    res.render('standards', {user: req.session.user, client_id: GOOGLE_CLIENT_ID})
})

app.get('/logout', (req, res) => {
    req.session.user = undefined
    res.redirect('/')
})

app.listen(3000, () => {
    console.log(`Portfolio Mapper running...`)
})