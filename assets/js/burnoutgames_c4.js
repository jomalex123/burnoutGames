(function() {
  'use strict';

  var ACCESS_CODE = '5539852';
  var MAX_CODE_LENGTH = 8;
  var MAX_TIME_DIGITS = 4;
  var WRONG_CODE_PENALTY = 15;
  var WRONG_CODE_LOCK_MS = 3000;

  var timerId = null;
  var beepTimerId = null;
  var alarmTimerId = null;
  var armingTimerId = null;
  var holdTimerId = null;
  var wrongCodeTimerId = null;
  var audioContext = null;
  var lastClearAt = 0;
  var submitHoldHandled = false;
  var isInputLocked = false;
  var endTime = 0;
  var configuredSeconds = 300;
  var remainingSeconds = 300;
  var state = 'setup-time';
  var entry = '';

  document.addEventListener('DOMContentLoaded', function() {
    bindBomb();
    resetBomb();
  });

  function bindBomb() {
    document.querySelectorAll('[data-bomb-key]').forEach(function(button) {
      button.addEventListener('click', function() {
        if (isInputLocked) {
          return;
        }

        ensureAudioContext();
        pressKey(button.getAttribute('data-bomb-key'));
      });
    });

    document.querySelectorAll('[data-bomb-action]').forEach(function(button) {
      button.addEventListener('click', function() {
        var action = button.getAttribute('data-bomb-action');

        if (isInputLocked) {
          return;
        }

        ensureAudioContext();

        if (action === 'clear') {
          handleClear();
        }

        if (action === 'submit' && submitHoldHandled && !entry) {
          submitHoldHandled = false;
          return;
        }

        if (action === 'submit') {
          submitEntry();
        }

        submitHoldHandled = false;
      });

      if (button.getAttribute('data-bomb-action') === 'submit') {
        button.addEventListener('pointerdown', startSubmitHold);
        button.addEventListener('pointerup', stopSubmitHold);
        button.addEventListener('pointerleave', stopSubmitHold);
        button.addEventListener('pointercancel', stopSubmitHold);
      }
    });
  }

  function pressKey(key) {
    if (isInputLocked) {
      return;
    }

    lastClearAt = 0;

    if (state === 'setup-time') {
      if (entry.length >= MAX_TIME_DIGITS) {
        return;
      }

      entry += key;
      setMessage('INTRODUCE TIEMPO');
      updateDisplay();
      return;
    }

    if (state === 'setup-code' || state === 'armed') {
      if (entry.length >= MAX_CODE_LENGTH) {
        return;
      }

      entry += key;
      setMessage(state === 'armed' ? 'INTRODUCIENDO CODIGO' : 'INTRODUCE CODIGO');
      updateDisplay();
      return;
    }

    if (state === 'ready') {
      setReadyMessage();
      return;
    }

    if (state === 'arming-device') {
      setMessage('ARMANDO DISPOSITIVO');
    }
  }

  function submitEntry() {
    if (isInputLocked) {
      return;
    }

    lastClearAt = 0;

    if (state === 'setup-time') {
      submitTime();
      return;
    }

    if (state === 'setup-code') {
      submitSetupCode();
      return;
    }

    if (state === 'armed') {
      submitDefuseCode();
      return;
    }

    if (state === 'ready') {
      setReadyMessage();
      return;
    }

    if (state === 'arming-device') {
      setMessage('ARMANDO DISPOSITIVO');
    }
  }

  function submitTime() {
    var timeParts = parseTimeEntry(entry);

    if (entry.length < MAX_TIME_DIGITS) {
      setMessage('COMPLETA TIEMPO');
      return;
    }

    if (!timeParts || timeParts.totalSeconds <= 0 || timeParts.seconds > 59) {
      setMessage('TIEMPO INVALIDO');
      return;
    }

    configuredSeconds = timeParts.totalSeconds;
    remainingSeconds = configuredSeconds;
    entry = '';
    state = 'setup-code';
    setMessage('INTRODUCE CODIGO ACTIVACION');
    updateDisplay();
  }

  function submitSetupCode() {
    if (!entry) {
      setMessage('INTRODUCE CODIGO');
      return;
    }

    if (entry !== ACCESS_CODE) {
      showWrongCodeLockout();
      return;
    }

    entry = '';
    state = 'arming-device';
    setMessage('ARMANDO DISPOSITIVO');
    updateDisplay();
    startArmingSequence();
  }

  function submitDefuseCode() {
    if (!entry) {
      setMessage('INTRODUCE CODIGO');
      return;
    }

    if (entry === ACCESS_CODE) {
      defuseBomb();
      return;
    }

    applyWrongDefusePenalty();
    showWrongCodeLockout();
  }

  function applyWrongDefusePenalty() {
    remainingSeconds = Math.max(0, remainingSeconds - WRONG_CODE_PENALTY);
    endTime = Date.now() + remainingSeconds * 1000;

    if (remainingSeconds <= 0) {
      explodeBomb();
    }
  }

  function showWrongCodeLockout() {
    if (state === 'exploded') {
      return;
    }

    entry = '';
    isInputLocked = true;
    stopSubmitHold();
    setMessage('CODIGO ERRONEO');
    updateDisplay();

    if (wrongCodeTimerId) {
      window.clearTimeout(wrongCodeTimerId);
    }

    wrongCodeTimerId = window.setTimeout(function() {
      wrongCodeTimerId = null;
      isInputLocked = false;

      if (state === 'setup-code') {
        setMessage('INTRODUCE CODIGO ACTIVACION');
      } else if (state === 'armed') {
        setMessage('INTRODUCE CODIGO');
      } else {
        restoreStateMessage();
      }

      updateDisplay();
    }, WRONG_CODE_LOCK_MS);
  }

  function handleClear() {
    if (isInputLocked) {
      return;
    }

    var now = Date.now();

    if (state !== 'armed' && now - lastClearAt <= 900) {
      lastClearAt = 0;
      resetBomb();
      return;
    }

    lastClearAt = now;
    clearEntry();
  }

  function clearEntry() {
    entry = '';

    if (state === 'setup-time') {
      setMessage('INTRODUCE TIEMPO');
    } else if (state === 'setup-code') {
      setMessage('INTRODUCE CODIGO ACTIVACION');
    } else if (state === 'ready') {
      setReadyMessage();
    } else if (state === 'arming-device') {
      setMessage('ARMANDO DISPOSITIVO');
    }

    updateDisplay();
  }

  function armBomb() {
    if (state === 'armed') {
      return;
    }

    if (state === 'setup-time') {
      setMessage('CONFIRMA TIEMPO');
      return;
    }

    if (state === 'setup-code') {
      setMessage('CONFIRMA CODIGO');
      return;
    }

    if (state === 'arming-device') {
      setMessage('ARMANDO DISPOSITIVO');
      return;
    }

    if (state !== 'ready') {
      return;
    }

    remainingSeconds = configuredSeconds;
    endTime = Date.now() + remainingSeconds * 1000;
    entry = '';
    state = 'armed';
    stopCountdownTimers();
    timerId = window.setInterval(tick, 250);
    scheduleNextBeep(0);
    setMessage('BOMBA ACTIVADA');
    updateDisplay();
  }

  function startSubmitHold() {
    stopSubmitHold();
    ensureAudioContext();

    if (isInputLocked || state !== 'ready') {
      return;
    }

    submitHoldHandled = false;
    holdTimerId = window.setTimeout(function() {
      holdTimerId = null;
      submitHoldHandled = true;
      armBomb();
    }, 850);
  }

  function stopSubmitHold() {
    if (holdTimerId) {
      window.clearTimeout(holdTimerId);
      holdTimerId = null;
    }
  }

  function resetBomb() {
    stopAllTimers();
    stopSubmitHold();
    configuredSeconds = 300;
    remainingSeconds = configuredSeconds;
    isInputLocked = false;
    state = 'setup-time';
    entry = '';
    setMessage('INTRODUCE TIEMPO');
    updateDisplay();
  }

  function defuseBomb() {
    stopAllTimers();
    state = 'defused';
    entry = '';
    setMessage('BOMBA DESACTIVADA');
    updateDisplay();
  }

  function explodeBomb() {
    stopAllTimers();
    state = 'exploded';
    remainingSeconds = 0;
    entry = '';
    setMessage('OBJETIVO ELIMINADO');
    updateDisplay();
    playExplosionAlarm();
  }

  function tick() {
    remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

    if (remainingSeconds <= 0) {
      explodeBomb();
      return;
    }

    updateDisplay();
  }

  function updateDisplay() {
    var device = document.querySelector('.bomb-device');
    var time = document.getElementById('bombTime');
    var mode = document.getElementById('bombMode');
    var signal = document.getElementById('bombSignal');
    var entryDisplay = document.getElementById('bombEntry');

    if (!device || !time || !mode || !signal || !entryDisplay) {
      return;
    }

    device.classList.remove('is-standby', 'is-arming', 'is-ready', 'is-armed', 'is-defused', 'is-exploded', 'is-input-locked', 'is-wrong-code');
    device.classList.add(getDeviceClass());

    if (isInputLocked) {
      device.classList.add('is-input-locked', 'is-wrong-code');
    }

    time.textContent = getTimeText();
    entryDisplay.textContent = getEntryText();
    mode.textContent = getModeText();
    signal.textContent = getSignalText();
  }

  function getTimeText() {
    if (state === 'setup-time') {
      return formatSetupTime(entry);
    }

    return formatTime(remainingSeconds);
  }

  function getEntryText() {
    if (state === 'setup-time') {
      return '';
    }

    if (!entry) {
      return '_';
    }

    return maskEntry(entry);
  }

  function getDeviceClass() {
    if (state === 'armed') {
      return 'is-armed';
    }

    if (state === 'arming-device') {
      return 'is-arming';
    }

    if (state === 'ready') {
      return 'is-ready';
    }

    if (state === 'defused') {
      return 'is-defused';
    }

    if (state === 'exploded') {
      return 'is-exploded';
    }

    return 'is-standby';
  }

  function setMessage(message) {
    var messageNode = document.getElementById('bombMessage');

    if (messageNode) {
      messageNode.textContent = message;
    }
  }

  function setReadyMessage() {
    setMessage('MANTENER PRESIONADO PARA ARMAR');
  }

  function restoreStateMessage() {
    if (state === 'setup-time') {
      setMessage('INTRODUCE TIEMPO');
    } else if (state === 'setup-code') {
      setMessage('INTRODUCE CODIGO ACTIVACION');
    } else if (state === 'ready') {
      setReadyMessage();
    } else if (state === 'arming-device') {
      setMessage('ARMANDO DISPOSITIVO');
    }
  }

  function getModeText() {
    if (state === 'setup-time') {
      return 'TIME';
    }

    if (state === 'setup-code') {
      return 'CODE';
    }

    if (state === 'ready') {
      return 'READY';
    }

    if (state === 'arming-device') {
      return 'ARMING';
    }

    if (state === 'armed') {
      return 'ARMED';
    }

    if (state === 'defused') {
      return 'DEFUSED';
    }

    if (state === 'exploded') {
      return 'FAILED';
    }

    return 'STANDBY';
  }

  function getSignalText() {
    if (state === 'arming-device') {
      return 'LINK WAIT';
    }

    if (state === 'ready' || state === 'defused') {
      return 'LINK OK';
    }

    if (state === 'armed') {
      return 'LIVE';
    }

    return 'LINK OFF';
  }

  function startArmingSequence() {
    stopArmingTimer();
    armingTimerId = window.setTimeout(function() {
      armingTimerId = null;

      if (state !== 'arming-device') {
        return;
      }

      state = 'ready';
      setReadyMessage();
      updateDisplay();
    }, 5000);
  }

  function maskEntry(value) {
    return value.replace(/./g, '*');
  }

  function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function formatSetupTime(value) {
    var digits = value.padEnd(MAX_TIME_DIGITS, '-');

    return digits.slice(0, 2) + ':' + digits.slice(2, 4);
  }

  function parseTimeEntry(value) {
    var minutes = parseInt(value.slice(0, 2), 10);
    var seconds = parseInt(value.slice(2, 4), 10);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }

    return {
      minutes: minutes,
      seconds: seconds,
      totalSeconds: minutes * 60 + seconds
    };
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function stopBeepTimer() {
    if (beepTimerId) {
      window.clearTimeout(beepTimerId);
      beepTimerId = null;
    }
  }

  function stopAlarmTimer() {
    if (alarmTimerId) {
      window.clearTimeout(alarmTimerId);
      alarmTimerId = null;
    }
  }

  function stopCountdownTimers() {
    stopTimer();
    stopBeepTimer();
  }

  function stopArmingTimer() {
    if (armingTimerId) {
      window.clearTimeout(armingTimerId);
      armingTimerId = null;
    }
  }

  function stopAllTimers() {
    stopCountdownTimers();
    stopArmingTimer();
    stopSubmitHold();
    stopAlarmTimer();
    stopWrongCodeTimer();
  }

  function stopWrongCodeTimer() {
    if (wrongCodeTimerId) {
      window.clearTimeout(wrongCodeTimerId);
      wrongCodeTimerId = null;
    }
  }

  function scheduleNextBeep(delay) {
    stopBeepTimer();

    if (state !== 'armed') {
      return;
    }

    beepTimerId = window.setTimeout(function() {
      var secondsLeft = Math.max(0, (endTime - Date.now()) / 1000);

      beepTimerId = null;

      if (state !== 'armed' || secondsLeft <= 0) {
        return;
      }

      playCountdownBeep(secondsLeft <= 10);
      scheduleNextBeep(getBeepInterval(secondsLeft));
    }, delay);
  }

  function getBeepInterval(secondsLeft) {
    if (secondsLeft <= 10) {
      return 200;
    }

    if (secondsLeft <= 30) {
      return 500;
    }

    return 1000;
  }

  function ensureAudioContext() {
    var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextConstructor();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    return audioContext;
  }

  function playCountdownBeep(isVeryFast) {
    var context = ensureAudioContext();
    var oscillator;
    var gain;
    var startAt;
    var stopAt;

    if (!context) {
      return;
    }

    startAt = context.currentTime;
    stopAt = startAt + (isVeryFast ? 0.045 : 0.07);
    oscillator = context.createOscillator();
    gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(isVeryFast ? 1320 : 980, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(isVeryFast ? 0.075 : 0.065, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.01);
  }

  function playExplosionAlarm() {
    var context = ensureAudioContext();
    var oscillator;
    var gain;
    var startAt;
    var stopAt;

    if (!context) {
      return;
    }

    startAt = context.currentTime;
    stopAt = startAt + 10;
    oscillator = context.createOscillator();
    gain = context.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(360, startAt);
    oscillator.frequency.linearRampToValueAtTime(820, startAt + 1.1);
    oscillator.frequency.linearRampToValueAtTime(360, startAt + 2.2);
    oscillator.frequency.linearRampToValueAtTime(820, startAt + 3.3);
    oscillator.frequency.linearRampToValueAtTime(360, startAt + 4.4);
    oscillator.frequency.linearRampToValueAtTime(820, startAt + 5.5);
    oscillator.frequency.linearRampToValueAtTime(360, startAt + 6.6);
    oscillator.frequency.linearRampToValueAtTime(820, startAt + 7.7);
    oscillator.frequency.linearRampToValueAtTime(360, startAt + 8.8);
    oscillator.frequency.linearRampToValueAtTime(820, startAt + 10);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.08);
    gain.gain.setValueAtTime(0.14, stopAt - 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);

    alarmTimerId = window.setTimeout(function() {
      alarmTimerId = null;
    }, 10000);
  }
})();
