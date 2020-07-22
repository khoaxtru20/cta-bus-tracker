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

const app = conversation({debug: true});
const API_KEY = '/?key=' + functions.config().ctabustracker.key;

axios.defaults.baseURL = 'http://www.ctabustracker.com/bustime/api/v2';

app.handle('lookup_bus_dir', (conv) => {
  let ROUTE = '&rt=' + conv.scene.slots['bus_num']['value'];
  let API_PATH = '/getdirections' + API_KEY + ROUTE +'&format=json';

  return axios.get(API_PATH)
  .then(response => {
    let directions = response.data['bustime-response'];
    if (directions['error']){
      conv.add('Route ' + directions['error'][0]['rt'] + ' does not exist. Let\'s start over and try another number.');
      conv.scene.next.name= 'Start';
      return Promise.resolve(response);
    }
    conv.overwrite = false;
    conv.add('Are you ' + directions['directions'][0]['dir'] + ' or ' + directions['directions'][1]['dir'] + '?');
    return Promise.resolve(response);
    
  }).catch(() => {
    return Promise.reject(new Error('External API call rejected while handling lookup_bus_dir.'));
  });
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
