var express = require('express');
var util = require('util')
var router = express.Router();
var env = process.env.NODE_ENV || "development";
var config = require('../../config/' + env + '.js');

var TwitchApi = require('../../services/twitch-api-service.js');

router.get('/GetBroadcasterClips', function(req, res, next) {
    TwitchApi.GetBroadcasterClips(req.body.broadcasterId, req.body.optionalParams)
    .then(function (response) {
        res.send(util.inspect(response.data.data));
    })
    .catch(function (error) {
        next(error);
    });
});

module.exports = router;