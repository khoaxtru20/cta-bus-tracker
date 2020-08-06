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

const app = conversation({debug: true});
const API_KEY = '/?key=' + functions.config().ctabustracker.key;
const JSON_FORMAT = '&format=json';


app.handle('validate_bus_num', async (conv) => {
  conv.overwrite = false;

  let _routes = [];
  //If session param doesn't exist, make it exist
  if(!('routes' in conv.session.params)) {
    try{
      //External API call
      await api.getRoutes(_routes, `/getroutes${API_KEY}${JSON_FORMAT}`);
      //Create session param
      conv.session.params.routes = _routes;
    } catch (error) {
      //If call returns error, print error message
      conv.add(`${error.message}. Please try again later.`);
      conv.scene.next.name = 'actions.scene.END_CONVERSATION';
      return;
    }
  }
  //Check that slot value exists in session param
  if(!(conv.session.params.routes.includes((conv.scene.slots['bus_num'].value).toString()))){
    conv.add(`Route ${conv.scene.slots['bus_num'].value} does not exist. Please try another number.`);
    conv.scene.slots['bus_num'].status = 'INVALID';
  }
})

app.handle('get_route_directions', async (conv) => {
  conv.overwrite = false;

  let _directions = [];
  if(!('route_directions' in conv.session.params)){
    try{
      let ROUTE = `&rt=${conv.session.params['bus_num']}`;
      await api.getRouteDirections(_directions, `/getdirections${API_KEY}${ROUTE}${JSON_FORMAT}`);
      conv.session.params.route_directions = _directions;
    } catch (error) {
        conv.add(`${error.message}. Please try again later.`);
        conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    }
  }
});

app.handle('validate_bus_dir', (conv) => {
  conv.overwrite = false;

  if(!(conv.session.params['route_directions'].includes(conv.scene.slots['bus_dir'].value))){
    conv.add(
      
`Your request for the ${conv.scene.slots['bus_dir'].value} ${conv.session.params['bus_num']} is not valid. \
Please try another direction.`

    );
    conv.scene.slots['bus_dir'].status = 'INVALID';
  }
})

app.handle('override_bus_stop_type', async (conv) => {
  conv.overwrite = false;

  let _stops = [];
  try{
    let ROUTE = `&rt=${conv.session.params['bus_num']}`;
    let DIRECTION = `&dir=${conv.session.params['bus_dir']}`;
    await api.getStops(_stops, `/getstops${API_KEY}${ROUTE}${DIRECTION}${JSON_FORMAT}`);
    conv.session.params.stops = _stops;
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
      return;
  }
});

app.handle('get_bus_stop', (conv) => {
  if('bus_stop' in conv.session.params){ //if entering scene from intent, set bus_stop slot value
    conv.scene.slots['bus_stop'].value = conv.session.params['bus_stop'];
  }
});

app.handle('validate_bus_stop', (conv) => {
  conv.overwrite = false;
  
  let index = {is: 0};
  //if slot value exists and stop index has not been set yet...
  if('value' in conv.scene.slots['bus_stop'] && !('stopIndex' in conv.session.params)){
    try{
      helpers.getStopIndex(index, conv.session.params.stops, conv.scene.slots['bus_stop'].value);
      conv.session.params.stopIndex = index.is;
    } catch (error) {
      conv.add(
        `${error.message}. Please try again.`
      );
      conv.scene.slots['bus_stop'].status = 'INVALID'; //reprompt for bus_stop
      conv.session.params['bus_stop'] = null; //remove session param bus_stop
      conv.session.params['stopIndex'] = null; //remove session param stopIndex
    }
  }
});

app.handle('predict_number', async (conv) =>{
  conv.overwrite = false;

  let STPID = `&stpid=${conv.session.params.stops[conv.session.params.stopIndex].stpid}`;
  let predictions = await api.getPredictions(`/getpredictions${API_KEY}${STPID}${JSON_FORMAT}`);
  if('msg' in predictions){
    conv.add(`${predictions.msg}. Please try again later.`);
    conv.scene.next.name = 'actions.scene.END_CONVERSATION';
    return;
  }
  conv.add(

`There ${predictions[0].dly === false ? `are no delays.`: `is a delay.`} The next bus is due \
${predictions[0].prdctdn === 'DUE' ? `now` : `in about ${predictions[0].prdctdn} minutes`} \
at ${helpers.formatTime(predictions[0].prdtm)}.`

  );
});

app.handle('predict_number_from_intent', (conv) =>{
  conv.overwrite = false;
  if('bus_num' in conv.intent.params){ //bus_num exists
    conv.session.params['bus_num'] = conv.intent.params['bus_num'].resolved;
    if('bus_dir' in conv.intent.params){ //bus_dir exists
      conv.session.params['bus_dir'] = conv.intent.params['bus_dir'].resolved;
      if('bus_stop' in conv.intent.params){ //bus_stop exists
        conv.session.params.bus_stop = conv.intent.params['bus_stop'].resolved;
      }
      conv.scene.next.name = 'RequestBusStop';
    }
  } else{
    conv.scene.next.name = 'RequestBusNumber';
  }
});
exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);

