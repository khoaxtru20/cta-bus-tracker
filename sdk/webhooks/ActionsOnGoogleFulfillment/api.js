const axios = require('axios');
axios.defaults.baseURL = 'http://www.ctabustracker.com/bustime/api/v2';

/**
 * Helper API function to extract route IDs from the /getroutes request
 * @param {Object[]} data - An array of route objects
 * @prop {String} data.rt - Route ID 
 * @returns {String[]} A string array of route IDs
 */
function createRouteList(data) {
    let _routes =  [];
    data.forEach(rt => {
        _routes.push(rt['rt']);
    });
    return _routes;
}

/**
 * Calls /getroutes
 * @param {Object[]} routes Array to save the routes
 * @param {String} path GET path
 * @throws {Error} If promise is rejected
 * @throws {Error} If promise is resolved but there is an API error message
 */
exports.getRoutes = function(routes,path){
    return axios.get(path)
        .then(response => {
            if('error' in response.data['bustime-response']){
                throw new Error(response.data['bustime-response'].error[0].msg);
            } 
            routes.push.apply(routes, createRouteList(response.data['bustime-response']['routes']));
        }).catch((error) => {
            throw new Error(`/getroutes promise rejected: ${error.message}`);
        });
}

/**
 * Helper API function to extract route directions from the /getdirections request
 * @param {Object[]} data An array of route directions
 * @prop {String} data.dir A direction
 * @returns {Object[]} The two directions of the route
 */
function createRouteDirections(data){
    let _route_directions =  [];
    data.forEach(dir => {
      _route_directions.push(dir['dir']);
    });
    return _route_directions;
}

/**
 * 
 * @param {*} directions 
 * @param {*} path 
 */
exports.getRouteDirections = function(directions,path){
    return axios.get(path)
        .then(response => {
            if('error' in response.data['bustime-response']){
                throw new Error(response.data['bustime-response'].error[0].msg);
            }
            directions.push.apply(directions, createRouteDirections(response.data['bustime-response']['directions']));
        }).catch((error) => {
            throw new Error(`/getdirections promise rejected: ${error.message}`);
        });

}
exports.getPredictions = function(path){
    return axios.get(path)
    .then(response => {
        if('error' in response.data['bustime-response']){
            return response.data['bustime-response'].error[0];
        }
        return response.data['bustime-response']['prd'];
    }).catch(() => {
        return new Error('External API call rejected while getting predictions.');
    });
}
exports.getStops = function(stops,path){
    return axios.get(path)
        .then(response => {
            if('error' in response.data['bustime-response']){
                throw new Error(response.data['bustime-response'].error[0].msg);
            }
            stops.push.apply(stops,response.data['bustime-response'].stops);
        }).catch((error) => {
            throw new Error(`/getstops promise rejected: ${error.message}`);
        });
}