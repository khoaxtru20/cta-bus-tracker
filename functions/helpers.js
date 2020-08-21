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
    let truncatedName = name.substr(0,25);
    let replacedAnd = name.replace(/&/gi, "and");
    let formattedName = replacedAnd.replace(/[^\w\s]/gi, " ").replace(/\s{2,}/gi, " ")
    .replace(/\bn\b/gi, "North")
    .replace(/\bs\b/gi, "South")
    .replace(/\be\b/gi, "East")
    .replace(/\bw\b/gi, "West")
    .replace(/\bu\b/gi, "University")
    .replace(/\bhwy\b/gi, "Highway")
    .replace(/\brd\b/gi, "Road")
    .replace(/\bblvd\b/gi, "Boulevard")
    .replace(/\bbldg\b/gi, "Building");
    let reversedName = formattedName.split(" and ").reverse().join(" and ");
    let uniqueSet = new Set([
        name,
        replacedAnd,
        formattedName,
        reversedName,
        truncatedName
    ]);

    let entry = {
        name: name,
        synonyms: Array.from(uniqueSet)
    }
    return entry;
}

function createRouteEntry(routeObj){
    let truncatedName = routeObj.rtnm.substr(0,25);
     //replace all punctuation with a space then remove any double spaces (does not account for spaces at end of string)
    let formattedName = routeObj.rtnm.replace(/[^\w\s]/gi, " ").replace(/\s{2}/gi, " ")
    .replace(/\bu\b/gi, "University")
    .replace(/\bblvd\b/gi, "Boulevard");
    let uniqueSet = new Set([
        routeObj.rt,
        routeObj.rtnm,
        formattedName,
        truncatedName
    ])
    let entry = {
        name: routeObj.rt,
        synonyms: Array.from(uniqueSet)
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
    switch(_hour <= 12){ //use mod instead of this
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