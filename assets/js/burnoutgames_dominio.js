(function() {
  'use strict';

  var activeTeam = '';
  var counters = {
    red: 0,
    yellow: 0
  };
  var timerId = null;
  var pauseTimerId = null;
  var isPaused = false;

  document.addEventListener('DOMContentLoaded', function() {
    bindControls();
    updateDisplay();
  });

  function bindControls() {
    document.querySelectorAll('[data-team]').forEach(function(button) {
      button.addEventListener('click', function() {
        setActiveTeam(button.getAttribute('data-team') || '');
      });
    });

    var counter = document.getElementById('dominioCounter');

    if (counter) {
      counter.addEventListener('pointerdown', startPauseHold);
      counter.addEventListener('pointerup', cancelPauseHold);
      counter.addEventListener('pointerleave', cancelPauseHold);
      counter.addEventListener('pointercancel', cancelPauseHold);
    }
  }

  function setActiveTeam(team) {
    if (team !== 'red' && team !== 'yellow') {
      return;
    }

    activeTeam = team;

    if (!isPaused) {
      startCounter();
    }

    updateDisplay();
  }

  function startCounter() {
    if (timerId) {
      return;
    }

    timerId = window.setInterval(function() {
      if (activeTeam === 'red' || activeTeam === 'yellow') {
        counters[activeTeam] += 1;
      }

      updateDisplay();
    }, 1000);
  }

  function stopCounter() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startPauseHold() {
    cancelPauseHold();

    if (isPaused || !activeTeam) {
      return;
    }

    pauseTimerId = window.setTimeout(function() {
      pauseTimerId = null;
      pauseGame();
    }, 3000);
  }

  function cancelPauseHold() {
    if (pauseTimerId) {
      window.clearTimeout(pauseTimerId);
      pauseTimerId = null;
    }
  }

  function pauseGame() {
    if (isPaused) {
      return;
    }

    isPaused = true;
    stopCounter();
    updateDisplay();
  }

  function updateDisplay() {
    var page = document.querySelector('.dominio-page');
    var counter = document.getElementById('dominioCounter');

    if (!page || !counter) {
      return;
    }

    page.classList.remove('is-red', 'is-yellow', 'is-paused');

    if (activeTeam) {
      page.classList.add('is-' + activeTeam);
    }

    if (isPaused) {
      page.classList.add('is-paused');
    }

    counter.textContent = formatTime(activeTeam ? counters[activeTeam] : 0);
  }

  function formatTime(seconds) {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;

    return String(minutes).padStart(2, '0') + ':' + String(remainingSeconds).padStart(2, '0');
  }
})();
