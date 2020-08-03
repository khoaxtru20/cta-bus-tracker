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
function createEntry(name){
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

/**
 * 
 * @param {Object[]} stops
 * @return {Object[]} entries for type override.
 * 
 */
exports.createEntries = (stops) => {
    var _stops = [];
    stops.forEach(stop => {
        _stops.push(createEntry(stop.stpnm));
    })
    return _stops;
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

/**
 * 
 * @param {String} time e.g. "20200731 11:34"
 * @return {String} 24H string formated to 12H 
 */
exports.formatTime = function(time){
    let _time = time.split(" ")[1];             //"11:34"
    console.log('This is the time: ' + _time);
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