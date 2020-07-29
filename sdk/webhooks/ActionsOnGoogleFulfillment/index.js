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

const app = conversation({debug: true});
const API_KEY = '/?key=' + functions.config().ctabustracker.key;
const JSON_FORMAT = '&format=json';
axios.defaults.baseURL = 'http://www.ctabustracker.com/bustime/api/v2';

app.handle('validate_bus_num', async (conv) => {
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
    conv.add('Route ' + conv.scene.slots['bus_num'].value + ' does not exist. Please try another number.');
    conv.scene.slots['bus_num'].status = 'INVALID';
  }
})

app.handle('get_route_directions', async (conv) => {
  let ROUTE = '&rt=' + conv.session.params.bus_num;
  let API_PATH = '/getdirections' + API_KEY + ROUTE + JSON_FORMAT;

  if(!('route_directions' in conv.session.params)){
    let temp_route_directions = await api.getRouteDirections(API_PATH);
    if('msg' in temp_route_directions){
      conv.add(temp_route_directions.msg + '. Please try again later.');
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
      return;
    }
    conv.session.params.route_directions = temp_route_directions;
  }
  conv.overwrite = false;
  conv.add('Are you ' + conv.session.params.route_directions[0] + ' or ' + conv.session.params.route_directions[1] + '?');
});

app.handle('validate_bus_dir', (conv) => {
  conv.overwrite = false;
  if(!(conv.session.params.route_directions.includes(conv.scene.slots['bus_dir'].value))){
    conv.add('Your request for the ' + conv.scene.slots['bus_dir'].value + ' ' + conv.session.params.bus_num + ' is not valid. Please try another direction.');
    conv.scene.slots['bus_dir'].status = 'INVALID';
  }
})

app.handle('override_bus_stop_type', (conv) => {
  let ROUTE = '&rt=' + conv.session.params.bus_num;
  let DIRECTION = '&dir=' + conv.session.params.bus_dir;
  let API_PATH = '/getstops' + API_KEY + ROUTE + DIRECTION + JSON_FORMAT;

  return axios.get(API_PATH)
  .then(response => {
    conv.overwrite = false;
    conv.session.params.stops = response.data['bustime-response'].stops;
    return conv.session.params.stops;
  }).catch(() => {
    return new Error('External API call rejected while handling override_bus_stop_type:setting session.params.stops');
  }).then(stops =>{
    conv.session.typeOverrides = [{
      name: 'bus_stop',
      mode: 'TYPE_REPLACE',
      synonym: {
        entries: helpers.createEntries(stops)
        }
    }];
  }).catch(() => {
    return new Error('External API call rejected while handling override_bus_stop_type:setting session.typeOverrides');
  });
});
app.handle('validate_bus_stop', (conv) => {
  let index = helpers.getStopIndex(conv.session.params.stops, conv.scene.slots['bus_stop'].value);
  if(index < 0){
    conv.add('The stop ' + conv.session.params.bus_stop + ' does not exist. Let\'s try to find your stop by intersection.');
    conv.scene.slots['bus_stop'].status = 'INVALID';
  }
  conv.session.params.stopIndex = index;
});

app.handle('predict_number', (conv) =>{  

  conv.add('You are looking for the stop ' + conv.session.params.bus_stop);
  conv.add('It is at the index ' + conv.session.params.stopIndex);
  //use stop index to get stop id (conv.session.params.stopIndex) and make another request for predictions

});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
