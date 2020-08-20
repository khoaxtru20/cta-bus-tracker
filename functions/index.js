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
const {conversation, Card, Suggestion} = require('@assistant/conversation');
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

app.handle('add_route_suggestions', (conv) => {
  let suggestions = [];
  for (let index = 0; index < 8; index++) {
    suggestions.push(new Suggestion({
      title: (conv.session.params.routes[Math.floor(Math.random() * (conv.session.params.routes.length - 1))].rtnm).substr(0,25)
    }))
  }
  conv.prompt.suggestions = suggestions;
})
app.handle('validate_bus_num', (conv) => {
  let index = helpers.getRouteIndex(conv.session.params.routes, conv.scene.slots['bus_ID'].value);
  if(index < 0){
    conv.add('Route ' + conv.scene.slots['bus_ID'].value + ' does not exist. Please try another number.');
    conv.scene.slots['bus_ID'].status = 'INVALID';
    conv.scene.next.name = 'RequestBusNumber'; //needed for entry from global intent
  } else{
    conv.session.params.bus_num = conv.session.params.routes[index];
    conv.session.params.routes = null;
  }
})

app.handle('get_route_directions', async (conv) => {
  let ROUTE = '&rt=' + conv.session.params['bus_num'].rt;
  let API_PATH = '/getdirections' + API_KEY + ROUTE + JSON_FORMAT;
  let temp_route_directions = await api.getRouteDirections(API_PATH);
  if('msg' in temp_route_directions){
    conv.add(temp_route_directions.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
  } else{
    conv.session.params.route_directions = temp_route_directions;
  }
});

app.handle('ask_for_directions', (conv) => {
  if(conv.session.params['route_directions'].length > 1){
    conv.prompt.suggestions = [
      new Suggestion({
        title: conv.session.params.route_directions[0]
      }),
      new Suggestion({
        title: conv.session.params.route_directions[1]
      })
    ];
    conv.add(`Are you ${conv.session.params['route_directions'][0]} or ${conv.session.params['route_directions'][1]}?`);
  } else{
    conv.add(`I'll assume you are ${conv.session.params['route_directions'][0]}.`);
    conv.session.params['bus_dir'] = conv.session.params['route_directions'][0];
    conv.scene.next.name = 'RequestBusStop';
  }
})
app.handle('validate_bus_dir', (conv) => {
  if(!(conv.session.params['route_directions'].includes(conv.scene.slots['bus_dir'].value))){
    conv.add('Your request for the ' + conv.scene.slots['bus_dir'].value + ' ' + conv.session.params['bus_num'].rt + ' is not valid. Please try another direction.');
    conv.scene.slots['bus_dir'].status = 'INVALID';
    conv.scene.next.name = 'RequestBusDirection'; //needed for entry from global intent
  } else{
    conv.session.params.route_directions = null;
  }
})

app.handle('override_bus_stop_type', async (conv) => {
  let ROUTE = '&rt=' + conv.session.params['bus_num'].rt;
  let DIRECTION = '&dir=' + conv.session.params['bus_dir'];

  let temp_stops = await api.getStops('/getstops' + API_KEY + ROUTE + DIRECTION + JSON_FORMAT);
  if('msg' in temp_stops){
    conv.add(temp_stops.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
  } else{
    conv.session.typeOverrides = [{
      name: 'bus_stop',
      mode: 'TYPE_REPLACE',
      synonym: {
        entries: helpers.createStopEntries(temp_stops)
      }
    }];
    conv.session.params.stops = temp_stops;
  }
});

app.handle('add_stop_suggestions', (conv) =>{
  let suggestions = [];
  for (let index = 0; index < 8; index++) {
    suggestions.push(new Suggestion({
      title: (conv.session.params.stops[Math.floor(Math.random() * (conv.session.params.stops.length - 1))].stpnm).substr(0,25)
    }))
  }
  conv.prompt.suggestions = suggestions;
});

app.handle('validate_bus_stop', (conv) => {
    let index = helpers.getStopIndex(conv.session.params.stops, conv.scene.slots['bus_stop'].value);
    if(index < 0){
      conv.add('The stop ' + conv.scene.slots['bus_stop'].value + ' does not exist. Please try another stop.');
      conv.scene.slots['bus_stop'].status = 'INVALID';
      conv.scene.next.name = 'RequestBusStop'; //needed for entry from global intent
    } else{
      conv.session.params.bus_stop = conv.session.params.stops[index];
      conv.session.params.stops = null;
    }
});

app.handle('predict_number', async (conv) =>{
  let STPID = '&stpid=' + conv.session.params.bus_stop.stpid;
  let message = "";
  let predictions = await api.getPredictions('/getpredictions' + API_KEY + STPID + JSON_FORMAT);
  if('msg' in predictions){
    conv.add(predictions.msg + '. Please try again later.');
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
  }else{
    if(predictions[0].dly === false){
      message += 'There are no delays. The next bus is due ';
    }else{
      message += 'There is a delay. The next bus should have been due ';
    }
    if(predictions[0].prdctdn === 'DUE'){
      message += 'now ';
    } else if(predictions[0].dly === false){
      message += 'in about ' + predictions[0].prdctdn + ' minutes ';
    }
    message += 'at ' + helpers.formatTime(predictions[0].prdtm) + '.';
    conv.add(message);
    conv.add(new Card({
      title: `Route ${predictions[0].rt}`,
      subtitle: `${predictions[0].stpnm}`,
      text: message
    }));
  }
});

app.handle('validate_bus_info', (conv) =>{
  if('bus_num' in conv.intent.params){
    conv.session.params['bus_num_from_intent'] = conv.intent.params['bus_num'].resolved;
  }
  if('bus_stop' in conv.intent.params){
    conv.session.params['bus_stop_from_intent'] = conv.intent.params['bus_stop'].resolved;
  }
  conv.session.params['shouldAskToSaveQuery'] = true;
});

app.handle('check_user_storage', (conv) =>{
  if('bus_num' in conv.user.params && 'bus_dir' in conv.user.params && 'bus_stop' in conv.user.params){
    conv.scene.next.name = 'AskToUseLastSearch';
  }else {
    conv.session.params['shouldAskToSaveQuery'] = true;
  }
})
app.handle('set_query', (conv) =>{
  conv.user.params['bus_num'] = conv.session.params['bus_num'];
  conv.user.params['bus_dir'] = conv.session.params['bus_dir'];
  conv.user.params['bus_stop'] = conv.session.params['bus_stop'];
})

app.handle('get_query', (conv) =>{
  conv.session.params['bus_num'] = conv.user.params['bus_num'];
  conv.session.params['bus_dir'] = conv.user.params['bus_dir'];
  conv.session.params['bus_stop'] = conv.user.params['bus_stop'];

  conv.session.params['bus_stop_from_intent'] = conv.user.params['bus_stop'].stpnm;
  conv.session.params['shouldAskToSaveQuery'] = false;
})

app.handle('clear_query', (conv) =>{  
  conv.user.params['bus_num'] = null;
  conv.user.params['bus_dir'] = null;
  conv.user.params['bus_stop'] =null;
  conv.session.params['shouldAskToSaveQuery'] = true;
})
exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
