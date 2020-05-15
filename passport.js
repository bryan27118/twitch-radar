// config/passport.js
var https = require('https');

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var TwitchStrategy = require("passport-twitch.js").Strategy;

var RecommendationEngineSingleton = require('./services/recommendation-engine-service.js');
var RecommendationEngine = new RecommendationEngineSingleton().getInstance();

//Load Config
var env = process.env.NODE_ENV || "development";
var config = require('./config/' + env + '.js');
var utils = require("./routes/controllers/utilities.js");

const TWITCH_CLIENT_ID = config.strategies.twitch.clientID;
const TWITCH_CLIENT_SECRET = config.strategies.twitch.clientSecret;
const TWITCH_CALLBACK_URL = config.strategies.twitch.callbackURL;

var Logger = require('./services/logging-service.js');
var logger = new Logger().getInstance();

// load up the user model
var User = require('./models/User.js');
var bcrypt = require('bcrypt-nodejs');

// expose this function to our app using module.exports
module.exports = function(passport) {
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        logger.log('debug',"Serialized " + user.name, user);
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        User.findOne({
            _id: id
        }, function(err, user) {
            if (user != null) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {
            User.findOne({
                $or: [{
                    'name': username
                }, {
                    'email': req.body.email
                }]
            }, function(err, user) {
                //User already exists
                if (user != null) {
                    logger.log('debug'," Failed user create - username " + user.name + ' already exists');
                    return done(null, false);
                } else {
                    logger.log('info'," Creating user " + user.name);
                    var salt = bcrypt.genSaltSync(10);
                    var token = bcrypt.genSaltSync(10);
                    password = bcrypt.hashSync(password,salt);
                    //create
                    User.create({
                        name: username,
                        password: password,
                        email: req.body.email,
                        token: token,
                        allowEmail: true
                    }, function(err, newUser) {
                        utils.sendEmailtoUser(newUser._id, "Verify your email address - MEAN", "Thanks for signing up! Click the following link to verify your email address: " + config.hostname + "/verify?token=" + token + "");
                        return done(null, newUser);
                    });
                }
            });
        }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
    },
    function(req, username, password, done) {
        User.findOne({
            'name': username
        }, function(err, user) {
            if (user) {
                return user.checkPassword(password, done);
            } else {
                logger.log('debug'," Failed user login - unknown username " + user.name);
                return done(null, false);
            }
        });
    }));

    // =========================================================================
    // Twitch LOGIN/SIGNUP =============================================================
    // =========================================================================
    passport.use('twitch-login', new TwitchStrategy({
        clientID: TWITCH_CLIENT_ID,
        clientSecret: TWITCH_CLIENT_SECRET,
        callbackURL: TWITCH_CALLBACK_URL,
        scope: "user_read",
        passReqToCallback : true
      },
      function(req, accessToken, refreshToken, profile, done) {
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;

        logger.log('verbose','Twitch login attempt by: ' + profile.login);
        logger.log('verbose','Profile: ' + JSON.stringify(profile, null, 2));
        logger.log('verbose','accessToken: ' + JSON.stringify(accessToken, null, 2));
        logger.log('verbose','refreshToken: ' + JSON.stringify(refreshToken, null, 2));

        User.findOne({
            'twitchId': profile.id
        }, function(err, user) {
            if (user) {
                logger.log('verbose','User Logged In: ' + profile.login);
                return done(err, user);
            } else {
                logger.log('verbose','Creating New User: ' + profile.login);
                User.create({
                    name: profile.login,
                    twitchId: profile.id
                }, function(err, newUser) {
                    //Populate Graph data
                    RecommendationEngine.CreateUserChannelNodes(profile.login)
                    .then(function(res)
                    {
                        return done(err, newUser);
                    });
                });
            }
        });
      }
    ));

};