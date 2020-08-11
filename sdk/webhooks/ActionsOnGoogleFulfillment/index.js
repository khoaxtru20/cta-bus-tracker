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
const api = require('./api.js');
const helpers = require('./helpers.js');

const app = conversation({debug: false});
const API_KEY = `/?key=${functions.config().ctabustracker.key}`;
const JSON_FORMAT = '&format=json';


app.handle('validate_bus_num', async (conv) => {
  let _routes = [];
  let myRoute = {
    index: 0,
    query: (conv.scene.slots['bus_num'].value).toString(),
    prop: "rt"
  };
  //If session param doesn't exist, make it exist
  if(!('routes' in conv.session.params)) {
    try{
      //External API call
      await api.getRoutes(_routes, `/getroutes${API_KEY}${JSON_FORMAT}`);
      //Create session param
      conv.session.params['routes'] = _routes;
    } catch (error) {
      //If call returns error, print error message
      conv.add(`${error.message}. Please try again later.`);
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
      return;
    }
  }
  //Error Checking
  if(conv.intent.query === (conv.intent.params['bus_num'].resolved).toString()){ //assumes user input is strictly a number or ID (i.e. no extraneous input). Action will reprompt if not.
    try{
      helpers.getIndex(myRoute, conv.session.params['routes']);
      conv.session.params['routeIndex'] = myRoute.index;
    } catch(error) {
      conv.add(`${error.message}. Please try another bus number.`);
      conv.scene.slots['bus_num'].status = 'INVALID';
    }
  } else{ //user said bus ID instead of bus number (e.g. query: "55N" !== resolved: 55)
      try{
        myRoute.query = (conv.intent.query).toUpperCase();
        helpers.getIndex(myRoute, conv.session.params['routes']);
        conv.session.params['routeIndex'] = myRoute.index;
        conv.session.params['bus_num'] = myRoute.query;
        conv.scene.next.name = 'RequestBusDirection';
      } catch(error) {
        conv.add(`${error.message}. Please try another bus ID.`);
        conv.scene.next.name = 'RequestBusID';
      }
  }
})

app.handle('get_route_directions', async (conv) => {
  let _directions = [];
  if(!('route_directions' in conv.session.params)){
    try{
      let ROUTE = `&rt=${conv.session.params['bus_num']}`;
      await api.getRouteDirections(_directions, `/getdirections${API_KEY}${ROUTE}${JSON_FORMAT}`);
      conv.session.params['route_directions'] = _directions;
    } catch (error) {
        conv.add(`${error.message}. Please try again later.`);
        conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    }
  }
});

app.handle('validate_bus_dir', (conv) => {
  if(!(conv.session.params['route_directions'].includes(conv.scene.slots['bus_dir'].value))){
    conv.add(
      
`Your request for the ${conv.scene.slots['bus_dir'].value} ${conv.session.params['bus_num']} is not valid. \
Please try another direction.`

    );
    conv.scene.slots['bus_dir'].status = 'INVALID';
  }
})

app.handle('override_bus_stop_type', async (conv) => {
  let _stops = [];
  try{
    let ROUTE = `&rt=${conv.session.params['bus_num']}`;
    let DIRECTION = `&dir=${conv.session.params['bus_dir']}`;
    await api.getStops(_stops, `/getstops${API_KEY}${ROUTE}${DIRECTION}${JSON_FORMAT}`);
    conv.session.params['stops'] = _stops;
    conv.session.typeOverrides = [{
      name: 'bus_stop',
      mode: 'TYPE_REPLACE',
      synonym: {
        entries: helpers.createEntries(_stops)
      }
    }];
  } catch (error) {
      conv.add(`${error.message}. Please try again later.`);
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
  }
});

app.handle('validate_bus_info', (conv) =>{
  if('bus_dir' in conv.intent.params){
    if('bus_stop' in conv.intent.params){
      conv.session.params['bus_num'] = conv.intent.params['bus_num'].resolved; //assumes user input is strictly correct (i.e. input is not validated)
      conv.session.params['bus_dir'] = conv.intent.params['bus_dir'].resolved; //assumes user input is strictly correct (i.e. input is not validated)
      conv.scene.next.name = 'RequestBusStop';                                 //assumes user input is strictly correct (i.e. input is not validated)
      return;
    }
    conv.scene.next.name = 'RequestBusDirection';
  }
});

app.handle('validate_bus_stop', (conv) => {
  // if('value' in conv.scene.slots['bus_stop']){
    let myStop = {
      index: 0,
      query: helpers.formatBusStop(conv.scene.slots['bus_stop'].value),
      prop: "stpnm"
    };
    try{
      //Slot value needs to be formatted if user input is from global intent. Otherwise, slot value will be resolved by matching user input to type overrides.
      helpers.getIndex(myStop, conv.session.params['stops']); 
      conv.session.params['stopIndex'] = myStop.index;
    } catch (error) {
      conv.add(`${error.message}. Please try again.`);
      conv.scene.slots['bus_stop'].status = 'INVALID'; //reprompt for bus_stop
      conv.session.params['stopIndex'] = null; //reset session param stopIndex
    }
  // }
});

app.handle('predict_number', async (conv) =>{
  let predictions = [];
  try{
    let STPID = `&stpid=${conv.session.params['stops'][conv.session.params['stopIndex']].stpid}`;
    await api.getPredictions(predictions, `/getpredictions${API_KEY}${STPID}${JSON_FORMAT}`);
    conv.add(
  
`There ${predictions[0].dly === false ? `are no delays.`: `is a delay.`} The next bus is due \
${predictions[0].prdctdn === 'DUE' ? `now` : `in about ${predictions[0].prdctdn} minutes`} \
at ${helpers.formatTime(predictions[0].prdtm)}.`

    );
  } catch (error){
    conv.add(`${error.message}. Please try again later.`);
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
  }
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);

