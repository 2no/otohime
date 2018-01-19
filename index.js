'use strict';

const tessel = require('tessel');
const ambientlib = require('ambient-attx4');
const ambient = ambientlib.use(tessel.port['A']);

ambient.on('error', console.error);

ambient.on('ready', () => {
  const config = require('./config.json');
  const Slack = require('pico-slack');

  Slack.connect(config.slack.token)
    .then(() => {
      let currentPresence = 'away';

      setInterval(() => {
        ambient.getLightLevel((err, lightData) => {
          if (err) {
            console.error(err);
            process.exit(1);
          }
    
          const lightLevel = lightData.toFixed(8);
          console.log(`Light level: ${lightLevel}`);
    
          const presence = lightLevel >= config.lightLevel.threshold ? 'auto' : 'away';
          if (currentPresence !== presence) {
            currentPresence = presence;
            Slack.api('users.setPresence', {presence})
              .then(console.log).catch(console.error);
          }
        });
      }, config.lightLevel.checkInterval);
    })
    .catch(console.error);
});
