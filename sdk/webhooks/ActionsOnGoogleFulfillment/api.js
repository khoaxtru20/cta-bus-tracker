const axios = require('axios');
axios.defaults.baseURL = 'http://www.ctabustracker.com/bustime/api/v2';

function createRouteList(data) {
    let _routes =  [];
    data.forEach(rt => {
        _routes.push(rt['rt']);
    });
    return _routes;
}
exports.getRoutes = function(path){
return axios.get(path)
    .then(response => {
    if('error' in response.data['bustime-response']){
        return response.data['bustime-response'].error[0];
    } 
    return createRouteList(response.data['bustime-response']['routes']);
    }).catch(() => {
    return new Error('External API call rejected while getting routes.');
    });
}
function createRouteDirections(data){
    let _route_directions =  [];
    data.forEach(dir => {
      _route_directions.push(dir['dir']);
    });
    return _route_directions;
  }
exports.getRouteDirections = function(path){
    return axios.get(path)
    .then(response => {
        if('error' in response.data['bustime-response']){
        return response.data['bustime-response'].error[0];
        }
        return createRouteDirections(response.data['bustime-response']['directions']);
    }).catch(() => {
        return new Error('External API call rejected while getting route directions.');
    });
}