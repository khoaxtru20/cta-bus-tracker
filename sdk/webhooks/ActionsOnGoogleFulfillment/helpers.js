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
            name.split(" ").reverse().join(" "),
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

function sayDoesNotExist(prop, name){
    let thing = "";
    switch(prop){
        case "rt":
        case "rtnm":
            thing = "Route";
            break;
        case "stpnm":
            thing = "Stop";
            break;
    }
    return `${thing} "${name}" does not exist`;
}
/**
 * 
 * @param {Object} myObj - object to pass index by reference
 * @prop {Number} myObj.index - the index of the object in the objects array
 * @param {Object[]} stops - array of objects
 * @param {String} name - name of object requested by user
 */
exports.getIndex = function(myObj, objects, name, prop) {
    for (var i = 0; i < objects.length; ++i){
        if(objects[i][prop] === name){
            myObj.index = i;
            return;
        }
    }
    throw new Error(sayDoesNotExist(prop,name));
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

/**
 * 
 * @param {String} name of bus stop
 * @returns {String} Capitalized bus stop with "&" replaced if it exists. Needed for user input from global intent. \
 * **Note:** User input must exactly match stop name or search will fail and Action will reprompt.
 */
exports.formatBusStop = function(name){
    let _replaced = name.replace(/and/gi, "&").split(" ");
    let _capitalized = [];
    _replaced.forEach(word => {
        _capitalized.push(word.charAt(0).toUpperCase() + word.slice(1));
    });
    return _capitalized.join(" ");
}