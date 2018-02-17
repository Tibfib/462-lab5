const passport = require('passport');
const Account = require('./models/account');
const router = require('express').Router();
const fetch = require('node-fetch');
const request = require('request');

const secrets = require('./secrets');

const CLIENT_ID = 'BK1E4ASTTXUOCAFPL1EY3HUKEKVET5EVKSEN5RIVRU502JG2';
const CLIENT_SECRET = secrets.FOURSQUARE;
const REDIRECT_URI = 'https://lab5-foursquare-462.now.sh/foursquare_authorize';

router.get('/', function(req, res) {
    console.log('req', req.user);
    Account.find({}, '-foursquare_code').exec(function(err, users) {
        res.render('index', { user: req.user, users: users, REDIRECT_URI });
    });
});

router.get('/register', function(req, res) {
    res.render('register', {});
});

router.post('/register', function(req, res, next) {
    Account.register(new Account({ username: req.body.username }), req.body.password, function(
        err
    ) {
        if (err) {
            console.log('error while user register!', err);
            return next(err);
        }

        console.log('user registered!');

        res.redirect('/login');
    });
});

router.get('/login', function(req, res) {
    res.render('login', { user: req.user });
});

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

function getLastCheckin(foursquare_code, callback) {
    request(
        {
            url: 'https://api.foursquare.com/v2/users/self/checkins',
            method: 'GET',
            qs: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                oauth_token: foursquare_code,
                v: '20170801',
                limit: 1
            }
        },
        function(err, r, body) {
            if (err) {
                console.error(err);
                callback(null);
            } else {
                let response = JSON.parse(body).response;
                let firstCheckin = response.checkins.items[0];

                callback(firstCheckin);
            }
        }
    );
}

router.get('/profile/:id', function(req, res) {
    Account.findOne({ _id: req.params.id }).exec(function(err, user) {
        if (user.foursquare_code) {
            getLastCheckin(user.foursquare_code, checkin => {
                console.log('got checkin', checkin);
                let returned_checkin = checkin;
                if (!req.user || req.params.id != req.user._id) {
                    // it's someone else, so let's filter the checkin a bit
                    returned_checkin = {
                        partial: true,
                        shout: checkin.shout,
                        createdAt: checkin.createdAt,
                        venue: {
                            name: checkin.venue.name
                        }
                    };
                }

                res.render('profile', { profile: user, user: req.user, checkin: returned_checkin });
            });
        } else {
            res.render('profile', { profile: user, user: req.user });
        }
    });
});

router.get('/foursquare_authorize', function(req, res) {
    if (req.user && req.query.code) {
        request(
            {
                url: 'https://foursquare.com/oauth2/access_token',
                method: 'GET',
                qs: {
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: req.query.code,
                    redirect_uri: REDIRECT_URI,
                    v: '20170801'
                }
            },
            function(err, r, body) {
                if (err) {
                    console.error(err);
                } else {
                    Account.findOneAndUpdate(
                        { _id: req.user._id },
                        { foursquare_code: JSON.parse(body).access_token }
                    ).exec(function(err, user) {
                        console.log('err', err, user);
                        res.redirect('/');
                    });
                }
            }
        );
    } else {
        throw new Error('Not logged in or no code provided');
    }
});

module.exports = router;
