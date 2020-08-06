/**
 * 
 * @param {String} name - of stop
 * @return {Object} Entry
 * @prop Entry.name - name of stop
 * @prop Entry.synonyms - alternate versions of the stop name
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
 * @return {Object[]} Entries - array of entries for type override.
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
 * @param {Object} index - object to pass stop index by reference
 * @prop {Number} index.is - the index of the stop in the stops array
 * @param {Object[]} stops - array of stops
 * @param {String} name - name of stop requested by user
 */
exports.getStopIndex = function(index, stops, name) {
    for (var i = 0; i < stops.length; ++i){
        if(stops[i].stpnm === name){
            index.is = i;
            return;
        }
    }
    throw new Error(`The stop "${name}" does not exist`);
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