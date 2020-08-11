/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const {conversation} = require('@assistant/conversation');
const functions = require('firebase-functions');
const axios = require('axios');
const api = require('./api.js');
const helpers = require('./helpers.js');

const app = conversation({debug: false});
const API_KEY = '/?key=' + functions.config().ctabustracker.key;
const JSON_FORMAT = '&format=json';
axios.defaults.baseURL = 'http://www.ctabustracker.com/bustime/api/v2';

app.handle('override_bus_ID_type', async (conv) => {
  let temp_routes = await api.getRoutes('/getroutes' + API_KEY + JSON_FORMAT);
  if('msg' in temp_routes){
    conv.add(temp_routes.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    return;
  }
  conv.session.params.routes = temp_routes;

  conv.session.typeOverrides = [{
    name: 'bus_ID',
    mode: 'TYPE_REPLACE',
    synonym: {
      entries: helpers.createRouteEntries(temp_routes)
      }
  }];
})
app.handle('validate_bus_num', (conv) => {
/* 
  if(!('routes' in conv.session.params)) {
    let temp_routes = await api.getRoutes('/getroutes' + API_KEY + JSON_FORMAT);
    if('msg' in temp_routes){
      conv.add(temp_routes.msg + '. Please try again later.');
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
      return;
    }
    conv.session.params.routes = temp_routes;
  }
  conv.overwrite = false;
  if(!(conv.session.params.routes.includes((conv.scene.slots['bus_num'].value).toString()))){
    if(conv.session.params.routes.includes(conv.intent.params['bus_num'].original)){
      conv.session.params.bus_name = conv.intent.params['bus_num'].original;
      conv.scene.next.name = 'RequestBusDirection';
    } else {
      conv.add('Route ' + conv.scene.slots['bus_num'].value + ' does not exist. Please try another number.');
      conv.scene.slots['bus_num'].status = 'INVALID';
    }
  }
*/
  if(helpers.getRouteIndex(conv.session.params.routes, conv.scene.slots['bus_ID'].value) < 0){
    conv.add('Route ' + conv.scene.slots['bus_ID'].value + ' does not exist. Please try another number.');
    conv.scene.slots['bus_ID'].status = 'INVALID';
  }
})

app.handle('get_route_directions', async (conv) => {
  if(!('route_directions' in conv.session.params)){
    let ROUTE = '&rt=' + conv.session.params['bus_num'];
    let API_PATH = '/getdirections' + API_KEY + ROUTE + JSON_FORMAT;
    let temp_route_directions = await api.getRouteDirections(API_PATH);
    if('msg' in temp_route_directions){
      conv.add(temp_route_directions.msg + '. Please try again later.');
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
      return;
    }
    conv.session.params.route_directions = temp_route_directions;
  }
  conv.overwrite = false;
});

app.handle('validate_bus_dir', (conv) => {
  conv.overwrite = false;
  if(!(conv.session.params['route_directions'].includes(conv.scene.slots['bus_dir'].value))){
    conv.add('Your request for the ' + conv.scene.slots['bus_dir'].value + ' ' + conv.session.params['bus_num'] + ' is not valid. Please try another direction.');
    conv.scene.slots['bus_dir'].status = 'INVALID';
  }
})

app.handle('override_bus_stop_type', async (conv) => {
  let ROUTE = '&rt=' + conv.session.params['bus_num'];
  let DIRECTION = '&dir=' + conv.session.params['bus_dir'];

  conv.overwrite = false;
  let temp_stops = await api.getStops('/getstops' + API_KEY + ROUTE + DIRECTION + JSON_FORMAT);
  if('msg' in temp_stops){
    conv.add(temp_stops.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    return;
  }
  conv.session.typeOverrides = [{
    name: 'bus_stop',
    mode: 'TYPE_REPLACE',
    synonym: {
      entries: helpers.createStopEntries(temp_stops)
      }
  }];
  conv.session.params.stops = temp_stops;
});
app.handle('validate_bus_stop', (conv) => {
  /*
  if(!('bus_num' in conv.session.params)){
    conv.scene.next.name = 'RequestBusNumber';
  } else if(!('bus_dir' in conv.session.params)){
    conv.scene.next.name = 'RequestBusDirection';
  }
  */
  conv.overwrite = false;
  //if(conv.scene.slots['bus_stop'].updated == true){
    let index = helpers.getStopIndex(conv.session.params.stops, conv.scene.slots['bus_stop'].value);
    if(index < 0){
      conv.add('The stop ' + conv.scene.slots['bus_stop'].value + ' does not exist. Let\'s try to find your stop by intersection.');
      conv.scene.slots['bus_stop'].status = 'INVALID';
    }
    conv.session.params.stopIndex = index;
  //}
});

app.handle('predict_number', async (conv) =>{
  conv.overwrite = false;
  let STPID = '&stpid=' + conv.session.params.stops[conv.session.params.stopIndex].stpid;
  let message = "";
  let predictions = await api.getPredictions('/getpredictions' + API_KEY + STPID + JSON_FORMAT);
  if('msg' in predictions){
    conv.add(predictions.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    return;
  }
  if(predictions[0].dly === false){
    message += 'There are no delays. ';
  }else{
    message += 'There is a delay. ';
  }
  message += 'The next bus is due ';
  if(predictions[0].prdctdn === 'DUE'){
    message += 'now ';
  } else {
    message += 'in about ' + predictions[0].prdctdn + ' minutes ';
  }
  message += 'at ' + helpers.formatTime(predictions[0].prdtm) + '.';

  conv.add(message);
});

app.handle('predict_number_from_intent', async (conv) =>{
  conv.overwrite = false;
  if(!('bus_dir' in conv.intent.params)){
    conv.scene.next.name = 'RequestBusDirection';
    return;
  } else { //bus_dir exists
    conv.session.params['bus_dir'] = conv.intent.params['bus_dir'].resolved;
    if(!('bus_stop' in conv.intent.params)){
      conv.scene.next.name = 'RequestBusStop';
      return;
    } else{ //bus_stop exists
      conv.session.params['bus_stop'] = conv.intent.params['bus_stop'].resolved;
    }
  }
  let ROUTE = conv.session.params.bus_num;
  let DIRECTION = conv.intent.params['bus_dir'].resolved;
  let stops = await api.getStops('/getstops' + API_KEY + ROUTE + DIRECTION + JSON_FORMAT);
  //Format stop name to "Street & Street";
  let stopIndex = await api.getStopIndex(stops, stop);
  //Find stop in stops and get stpid
  //Get predictions with stpid
  //Print predictions
  conv.add('You are looking for the ' + conv.intent.params['bus_dir'].resolved + ' ' + conv.intent.params['bus_num'].resolved + ' at ' + conv.intent.params['bus_stop'].resolved);
});
exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
