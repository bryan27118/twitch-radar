'use strict';

var env = process.env.NODE_ENV || "development";
var config = require('../config/' + env + '.js');

const CLIENT_ID = config.strategies.twitch.clientID;
const CLIENT_SECRET = config.strategies.twitch.clientSecret;
const BASE_URL = config.strategies.twitch.baseURL;

const AxiosHandler = require('./axios-service.js');
const AxiosInstance = new AxiosHandler(BASE_URL, {'Client-ID': CLIENT_ID});

class TwitchApi {
    constructor()
    {
        console.log('Initialize Twitch Api');
    }

    /**
     * GetBroadcasterClips
     *
     * @alias GetBroadcasterClips
     * @param {type}   id               Broadcaster Id
     * @param {Object} optionalParams   Optional. Add additional optional query parameters Full list here: https://dev.twitch.tv/docs/api/reference#get-clips

     * @return {JSON} Returns a json list of clip data
     */
    GetBroadcasterClips(id, optionalParams = {})
    {
        let url = 'clips?broadcaster_id=' + id;

        if(optionalParams != {}){
            var i;
            for (i = 0; i < Object.keys(optionalParams).length; i++) {
                let paramKey = Object.keys(optionalParams)[i];
                let paramValue = Object.values(optionalParams)[i];
                url = url + '&' + paramKey + '=' + paramValue;
            }
        }

        return new Promise(function(resolve, reject){
            AxiosInstance.MakeAxiosGetRequest(url)
            .then(function (response) {
                resolve(response);
            })
            .catch(function (error) {
                reject(error);
            });
        });
    }
};

module.exports = new TwitchApi();