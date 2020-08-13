/**
 * 
 * @param {string} dir 
 * @return {string} direction with the first letter capitalized.
 */
exports.dirToUpperCase = (dir) => {
    return dir.charAt(0).toUpperCase() + dir.slice(1);
}

/**
 * 
 * @param {string} name 
 * @return {object} entry object with @prop name @prop synonyms
 */
function createStopEntry(name){
    var _name = name.replace(/&/gi, "and");
    var entry = {
        name: name,
        synonyms: [
            name,
            _name,
            _name.split(" ").reverse().join(" ")
        ]
    }
    return entry;
}
function createRouteEntry(routeObj){
    var entry = {
        name: routeObj.rt,
        synonyms: [
            routeObj.rt,
            routeObj.rtnm,
            routeObj.rtnm.replace(/[^\w\s]/gi, " ").replace(/\s{2}/gi, " ") //replace all punctuation with a space then remove any double spaces
        ]
    }
    return entry;
}
/**
 * 
 * @param {Object[]} stops
 * @return {Object[]} entries for type override.
 * 
 */
exports.createStopEntries = (stops) => {
    var _stops = [];
    stops.forEach(stop => {
        _stops.push(createStopEntry(stop.stpnm));
    })
    return _stops;
}

exports.createRouteEntries = (routes) => {
    var _routes = [];
    routes.forEach(route => {
        _routes.push(createRouteEntry(route));
    })
    return _routes;
}
/**
 * 
 * @param {Object[]} stops 
 * @param {String} name
 * @return {int} index of the stop in the stop array or -1 if it does not exist.
 */
exports.getStopIndex = function(stops, name) {
    for (var i = 0; i < stops.length; ++i){
        if(stops[i].stpnm === name){
            return i;
        }
    }
    return -1;
}

exports.getRouteIndex = function(routes, name) {
    for (var i = 0; i < routes.length; ++i){
        if(routes[i].rt === name){
            return i;
        }
    }
    return -1;
}
/**
 * 
 * @param {String} time e.g. "20200731 11:34"
 * @return {String} 24H string formated to 12H 
 */
exports.formatTime = function(time){
    let _time = time.split(" ")[1];             //"11:34"
    let [_hour, _minu] = _time.split(":");      //_hour = 11, _minu = 34
    let _meri = "AM";
    switch(_hour <= 12){
        case true:
            if(_hour === 12){ _meri = "PM"; }
            break;
        case false:
            _hour -= 12;
            _meri = "PM";
            break;
    }
    return _hour + ':' + _minu + ' ' + _meri;
}
exports.isError = function(response){
    
}