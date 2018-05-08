'use strict';

//=============================================================================
// Variables
//-----------------------------------------------------------------------------

const config    = require('./config.json');
const tessel    = require('tessel');
const tesselAV  = require('tessel-av');
const ambient   = require('ambient-attx4').use(tessel.port['A']);
const soundFile = require('path').join(__dirname, 'sound.mp3');
const Slack     = require('pico-slack');

const SlackUserPresence = {
  AWAY: 'away',
  AUTO: 'auto',
};

let currentPresence = SlackUserPresence.AWAY;
let player          = null;
let sojournTime     = 0;


//=============================================================================
// Functions
//-----------------------------------------------------------------------------

function handleAmbientReady() {
  Slack.connect(config.slack.token)
    .catch(console.error)
    .then(handleSlackConnect);
}

function handleAmbientLightLebel(error, lightData) {
  if (error) {
    Slack.error(error);
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
  if (presence === SlackUserPresence.AUTO) {
    player !== null && player.play([soundFile, '-r']);
    Slack.info('入室しました。');
    sojournTime = new Date();
  } else {
    player !== null && player.pause();
    Slack.info(`退室しました。 滞在時間(${(Date.now() - sojournTime) / 1000}s)`);
    sojournTime = 0;
  }

  setSlackUpserPresence(presence);
}

function handleSlackConnect() {
  Slack.info('音姫起動');
  setSlackUpserPresence(currentPresence);

  try {
    player = new tesselAV.Player();
    Slack.info('スピーカー接続成功');
  } catch (e) {
    Slack.warn('スピーカー接続失敗');
  }

  const interval = config.lightLevel.checkInterval;
  setInterval(() => ambient.getLightLevel(handleAmbientLightLebel), interval);
}

function handleProcessExit() {
  Slack.info('音姫停止');
}

function setSlackUpserPresence(presence) {
  Slack.api('users.setPresence', {presence})
    .catch(console.error)
    .then(console.log);
}


//=============================================================================
// Process
//-----------------------------------------------------------------------------

process.on('exit', handleProcessExit);

Slack.log_channel = config.slack.logChannel;

ambient.on('error', console.error).on('ready', handleAmbientReady);

