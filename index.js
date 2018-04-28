'use strict';

const DEFAULT_CONSOLE_LEVEL = 2;

const config         = require('./config.json');
const tessel         = require('tessel');
const tesselAV       = require('tessel-av');
const ambient        = require('ambient-attx4').use(tessel.port['A']);
const Slack          = require('pico-slack');
const consoleToSlack = require('console-to-slack');
const playArgs       = [require('path').join(__dirname, 'sound.mp3'), '-r'];

const SlackUserPresence = {
  AWAY: 'away',
  AUTO: 'auto',
};

let currentPresence = SlackUserPresence.AWAY;
let player          = null;

const consoleLevel = config.console.level || DEFAULT_CONSOLE_LEVEL;
consoleToSlack.init(config.slack.webhookURL, consoleLevel);

try {
  player = new tesselAV.Player();
} catch (e) {
  console.warn('スピーカーとの接続に失敗しました。');
}

ambient.on('error', console.error).on('ready', handleAmbientReady);

function handleAmbientReady() {
  Slack.connect(config.slack.token).catch(console.error).then(() => {
    const interval = config.lightLevel.checkInterval;
    setInterval(() => ambient.getLightLevel(handleAmbientLightLebel), interval);
  });
}

function handleAmbientLightLebel(error, lightData) {
  if (error) {
    console.error(error);
    return;
  }

  const lightLevel = lightData.toFixed(8);
  console.log(`Light level: ${lightLevel}`);

  const presence = lightLevel >= config.lightLevel.threshold
    ? SlackUserPresence.AUTO : SlackUserPresence.AWAY;
  if (currentPresence === presence) {
    return;
  }

  currentPresence = presence;
  if (player !== null) {
    presence === SlackUserPresence.AUTO ? player.play(playArgs) : player.stop();
  }

  Slack.api('users.setPresence', {presence}).catch(console.error).then(console.log);
}
