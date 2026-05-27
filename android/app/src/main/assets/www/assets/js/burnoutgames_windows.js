(function() {
  'use strict';

  var LOGIN_USER = 'burnout';
  var LOGIN_PASSWORD = 'pruebapiloto';
  var ACCESS_CODE = '1234';
  var maxAttempts = 3;
  var attempts = 0;
  var topZIndex = 50;
  var matrixTimer = null;
  var matrixInterval = null;

  var loginScreen = document.getElementById('loginScreen');
  var loginForm = document.getElementById('loginForm');
  var loginUser = document.getElementById('loginUser');
  var loginPassword = document.getElementById('loginPassword');
  var loginError = document.getElementById('loginError');
  var cmdWindowTitle = document.getElementById('cmdWindowTitle');
  var cmdTitle = document.getElementById('cmdTitle');
  var cmdContext = document.getElementById('cmdContext');
  var cmdCodeFields = document.getElementById('cmdCodeFields');
  var cmdIdleFields = document.getElementById('cmdIdleFields');
  var cmdAuthFields = document.getElementById('cmdAuthFields');
  var cmdUserFields = document.getElementById('cmdUserFields');
  var cmdPasswordFields = document.getElementById('cmdPasswordFields');
  var computerWindowTitle = document.getElementById('computerWindowTitle');
  var computerAddress = document.getElementById('computerAddress');
  var computerContent = document.getElementById('computerContent');
  var computerStatusCount = document.getElementById('computerStatusCount');
  var mapWindowTitle = document.getElementById('mapWindowTitle');
  var computerLevels = ['root', 'c', 'documents'];
  var computerLevelIndex = 0;
  var computerView = 'root';
  var activeDocumentKey = null;
  var documentAuthStep = 'user';
  var documentUserAttempts = 0;
  var documentPasswordAttempts = 0;

  var protectedDocuments = {
    topSecret: {
      label: 'TOP_SECRET.doc',
      user: 'agente_47',
      password: '12345',
      action: 'message'
    },
    inventory: {
      label: 'inventario.doc',
      user: 'dimitri',
      password: 'tarkof',
      action: 'message'
    },
    radio: {
      label: 'radio_codes.txt',
      user: 'burnout',
      password: 'P@ssw0rd',
      action: 'radio'
    },
    operations: {
      label: 'zona_operaciones.doc',
      user: 'agente_47',
      password: 'Re3ZKuG7',
      action: 'operations'
    }
  };

  var computerViews = {
    root: {
      title: 'Mi Ordenador',
      address: 'Mi Ordenador',
      status: '4 objeto(s)',
      items: [
        {
          label: 'Disco local (C:)',
          icon: 'hard_disk_drive_cool-0.png',
          target: 'c'
        },
        {
          label: 'Unidad de disquete (A:)',
          icon: 'floppy_drive_3_5-0.png'
        },
        {
          label: 'Entorno de red',
          icon: 'network_drive_cool-0.png'
        },
        {
          label: 'Unidad CD (G:)',
          icon: 'cd_drive-0.png'
        }
      ]
    },
    c: {
      title: 'Disco local (C:)',
      address: 'C:\\',
      status: '8 objeto(s)',
      items: [
        'Archivos de programa',
        'Mis Documentos',
        'Users',
        'Windows',
        'Temp',
        'System',
        'Juegos',
        'Burnout'
      ].map(function(label) {
        return {
          label: label,
          icon: 'directory_open_file_mydocs-4.png',
          folder: true,
          target: label === 'Mis Documentos' ? 'documents' : null
        };
      })
    },
    documents: {
      title: 'Mis Documentos',
      address: 'C:\\Mis Documentos',
      status: '4 objeto(s)',
      items: [
        protectedDocuments.topSecret,
        protectedDocuments.inventory,
        protectedDocuments.radio,
        protectedDocuments.operations
      ].map(function(documentConfig) {
        return {
          label: documentConfig.label,
          file: true,
          documentKey: Object.keys(protectedDocuments).find(function(key) {
            return protectedDocuments[key] === documentConfig;
          })
        };
      })
    }
  };

  function requestFullscreen() {
    var element = document.documentElement;

    if (element.requestFullscreen) {
      element.requestFullscreen().catch(function() {});
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  function clearLogin() {
    loginUser.value = '';
    loginPassword.value = '';
    loginError.textContent = '';
    loginUser.focus();
  }

  function unlockDesktop() {
    loginScreen.classList.add('is-hidden');
    requestFullscreen();
  }

  function openWindow(id) {
    var windowElement = document.getElementById(id);

    if (!windowElement) {
      return;
    }

    windowElement.classList.add('is-open');
    activateWindow(windowElement);

    if (id === 'cmdWindow') {
      setTimeout(function() {
        var input = document.getElementById('cmdIdleInput');

        if (activeDocumentKey) {
          input = document.getElementById(documentAuthStep === 'password' ? 'cmdPasswordInput' : 'cmdUserInput');
        }

        if (input) {
          input.focus();
        }
      }, 80);
    }
  }

  function closeWindow(id) {
    var windowElement = document.getElementById(id);

    if (windowElement) {
      windowElement.classList.remove('is-open', 'is-active');
    }
  }

  function activateWindow(windowElement) {
    document.querySelectorAll('.app-window.is-active').forEach(function(activeWindow) {
      activeWindow.classList.remove('is-active');
    });

    topZIndex += 1;
    windowElement.style.zIndex = topZIndex;
    windowElement.classList.add('is-active');
  }

  function renderComputerView(viewName) {
    var view = computerViews[viewName];
    var levelIndex = computerLevels.indexOf(viewName);

    if (!view) {
      return;
    }

    if (levelIndex !== -1) {
      computerLevelIndex = levelIndex;
    }

    computerView = viewName;
    computerWindowTitle.textContent = view.title;
    computerAddress.value = view.address;
    computerStatusCount.textContent = view.status;
    computerContent.innerHTML = '';

    view.items.forEach(function(item) {
      var button = document.createElement('button');
      var image = document.createElement('img');
      var label = document.createElement('span');

      button.className = 'pc-icon' + (item.folder ? ' pc-icon--folder' : '') + (item.file ? ' pc-icon--file' : '');
      button.type = 'button';

      if (item.target) {
        button.dataset.computerOpen = item.target;
      }

      if (item.documentKey) {
        button.dataset.documentKey = item.documentKey;
      }

      if (item.file) {
        image.setAttribute('aria-hidden', 'true');
      } else {
        image.src = 'images/resources/windows/' + item.icon;
        image.alt = '';
      }
      label.textContent = item.label;

      if (item.file) {
        button.appendChild(document.createElement('i'));
      } else {
        button.appendChild(image);
      }
      button.appendChild(label);
      computerContent.appendChild(button);
    });
  }

  function goBackComputer() {
    if (computerLevelIndex > 0) {
      computerLevelIndex -= 1;
      renderComputerView(computerLevels[computerLevelIndex]);
    }
  }

  function goForwardComputer() {
    if (computerLevelIndex < computerLevels.length - 1) {
      computerLevelIndex += 1;
      renderComputerView(computerLevels[computerLevelIndex]);
    }
  }

  function setCmdActivationMode() {
    var codeInput = document.getElementById('codeInput');
    var cmdError = document.getElementById('cmdError');

    activeDocumentKey = null;
    documentAuthStep = 'user';
    documentUserAttempts = 0;
    documentPasswordAttempts = 0;
    cmdWindowTitle.textContent = 'CMD.EXE';
    cmdTitle.hidden = true;
    cmdContext.hidden = true;
    cmdCodeFields.hidden = true;
    cmdIdleFields.hidden = false;
    cmdAuthFields.hidden = true;
    cmdUserFields.hidden = false;
    cmdPasswordFields.hidden = true;
    cmdError.textContent = '';

    if (codeInput) {
      codeInput.value = '';
    }

    document.getElementById('cmdIdleInput').value = '';
  }

  function setCmdDocumentMode(documentKey) {
    var documentConfig = protectedDocuments[documentKey];
    var userInput = document.getElementById('cmdUserInput');
    var passwordInput = document.getElementById('cmdPasswordInput');
    var cmdError = document.getElementById('cmdError');

    if (!documentConfig) {
      return;
    }

    activeDocumentKey = documentKey;
    documentAuthStep = 'user';
    documentUserAttempts = 0;
    documentPasswordAttempts = 0;
    cmdWindowTitle.textContent = 'SISTEMA ACCESO RESTRINGIDO';
    cmdTitle.hidden = false;
    cmdContext.hidden = false;
    cmdTitle.textContent = '*** DOCUMENTO PROTEGIDO ***';
    cmdContext.textContent = 'Archivo: ' + documentConfig.label;
    cmdCodeFields.hidden = true;
    cmdIdleFields.hidden = true;
    cmdAuthFields.hidden = false;
    cmdUserFields.hidden = false;
    cmdPasswordFields.hidden = true;
    cmdError.textContent = '';
    userInput.value = '';
    userInput.readOnly = false;
    passwordInput.value = '';
  }

  function submitCode() {
    var codeInput = document.getElementById('codeInput');
    var cmdError = document.getElementById('cmdError');
    var value = codeInput.value.trim();

    if (value === ACCESS_CODE) {
      attempts = 0;
      cmdError.textContent = '>> Codigo aceptado. Red desbloqueada.';
      codeInput.value = '';
      mapWindowTitle.textContent = 'Coordenadas Secretas';
      openWindow('mapWindow');
      return;
    }

    attempts += 1;
    codeInput.value = '';
    cmdError.textContent = '>> ERROR: Codigo invalido. Intento ' + attempts + '/' + maxAttempts;

    if (attempts >= maxAttempts) {
      startDestructionProtocol();
    }
  }

  function submitDocumentAuth() {
    var documentConfig = protectedDocuments[activeDocumentKey];
    var userInput = document.getElementById('cmdUserInput');
    var passwordInput = document.getElementById('cmdPasswordInput');
    var cmdError = document.getElementById('cmdError');

    if (!documentConfig) {
      return;
    }

    if (documentAuthStep === 'user') {
      if (userInput.value.trim() !== documentConfig.user) {
        documentUserAttempts += 1;
        cmdError.textContent = '>> ERROR: usuario incorrecto. Intento ' + documentUserAttempts + '/' + maxAttempts;
        userInput.value = '';

        if (documentUserAttempts >= maxAttempts) {
          startDestructionProtocol();
          return;
        }

        userInput.focus();
        return;
      }

      documentUserAttempts = 0;
      documentAuthStep = 'password';
      cmdUserFields.hidden = true;
      userInput.readOnly = true;
      cmdPasswordFields.hidden = false;
      cmdError.textContent = '';
      passwordInput.focus();
      return;
    }

    if (passwordInput.value !== documentConfig.password) {
      documentPasswordAttempts += 1;
      cmdError.textContent = '>> ERROR: contrasena incorrecta. Intento ' + documentPasswordAttempts + '/' + maxAttempts;
      passwordInput.value = '';

      if (documentPasswordAttempts >= maxAttempts) {
        startDestructionProtocol();
        return;
      }

      passwordInput.focus();
      return;
    }

    documentPasswordAttempts = 0;
    cmdError.textContent = '>> Codigo aceptado, documento desbloqueado.';
    cmdPasswordFields.hidden = true;
    passwordInput.value = '';

    if (documentConfig.action === 'radio') {
      openWindow('radioWindow');
    }

    if (documentConfig.action === 'operations') {
      mapWindowTitle.textContent = 'zona_operaciones';
      openWindow('mapWindow');
    }
  }

  function startDestructionProtocol() {
    document.body.innerHTML = '<main class="destruction-screen">' +
      '<div>ACCESO DENEGADO</div>' +
      '<div id="destructionCountdown"></div>' +
      '<div class="destruction-alert" id="destructionAlert" hidden>ACTIVANDO PROTOCOLO DE DESTRUCCION</div>' +
      '</main>';

    var countdown = document.getElementById('destructionCountdown');
    var seconds = 5;

    var countdownInterval = setInterval(function() {
      countdown.textContent = 'Autodestruccion en ' + seconds + '...';
      seconds -= 1;

      if (seconds < 0) {
        clearInterval(countdownInterval);
        document.getElementById('destructionAlert').hidden = false;
        matrixTimer = setTimeout(startMatrixEffect, 3500);
      }
    }, 1000);
  }

  function startMatrixEffect() {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var fontSize = 16;
    var letters = '01';
    var drops;

    canvas.className = 'matrix-canvas';
    document.body.innerHTML = '';
    document.body.appendChild(canvas);

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drops = Array(Math.ceil(canvas.width / fontSize)).fill(1);
    }

    function draw() {
      context.fillStyle = 'rgba(0, 0, 0, 0.06)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#00ff00';
      context.font = fontSize + 'px monospace';

      drops.forEach(function(drop, index) {
        var text = letters.charAt(Math.floor(Math.random() * letters.length));
        context.fillText(text, index * fontSize, drop * fontSize);

        if (drop * fontSize > canvas.height && Math.random() > 0.975) {
          drops[index] = 0;
        }

        drops[index] += 1;
      });
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    matrixInterval = setInterval(draw, 33);

    setTimeout(function() {
      clearInterval(matrixInterval);
      window.removeEventListener('resize', resizeCanvas);
      document.body.innerHTML = '';
      document.body.style.background = '#000';
    }, 10000);
  }

  function showMapPopup(point) {
    var panel = document.getElementById('mapPanel');
    var previousPopup = panel.querySelector('.map-popup');
    var popup = document.createElement('div');

    if (previousPopup) {
      previousPopup.remove();
    }

    popup.className = 'map-popup';
    popup.textContent = point.dataset.message;
    popup.style.left = point.style.left;
    popup.style.top = point.style.top;
    panel.appendChild(popup);

    setTimeout(function() {
      popup.remove();
    }, 2600);
  }

  function makeDraggable(windowElement) {
    var handle = windowElement.querySelector('[data-drag-handle]');
    var dragState = null;

    if (!handle) {
      return;
    }

    handle.addEventListener('pointerdown', function(event) {
      if (event.target.closest('button')) {
        return;
      }

      activateWindow(windowElement);
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: windowElement.offsetLeft,
        startTop: windowElement.offsetTop
      };

      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener('pointermove', function(event) {
      var maxLeft;
      var maxTop;
      var nextLeft;
      var nextTop;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      maxLeft = window.innerWidth - windowElement.offsetWidth;
      maxTop = window.innerHeight - windowElement.offsetHeight;
      nextLeft = dragState.startLeft + event.clientX - dragState.startX;
      nextTop = dragState.startTop + event.clientY - dragState.startY;

      windowElement.style.left = Math.max(0, Math.min(maxLeft, nextLeft)) + 'px';
      windowElement.style.top = Math.max(0, Math.min(maxTop, nextTop)) + 'px';
    });

    handle.addEventListener('pointerup', function(event) {
      if (dragState && dragState.pointerId === event.pointerId) {
        dragState = null;
      }
    });
  }

  loginForm.addEventListener('submit', function(event) {
    event.preventDefault();

    if (loginUser.value.trim() === LOGIN_USER && loginPassword.value.trim() === LOGIN_PASSWORD) {
      unlockDesktop();
      return;
    }

    loginError.textContent = 'Usuario o contrasena incorrectos.';
    loginPassword.value = '';
    loginPassword.focus();
  });

  document.addEventListener('click', function(event) {
    var icon = event.target.closest('[data-window]');
    var computerShortcut = event.target.closest('[data-computer-shortcut]');
    var closeButton = event.target.closest('[data-close]');
    var actionButton = event.target.closest('[data-action]');
    var computerItem = event.target.closest('[data-computer-open]');
    var documentItem = event.target.closest('[data-document-key]');
    var point = event.target.closest('.map-point');
    var appWindow = event.target.closest('.app-window');

    if (icon) {
      if (icon.dataset.window === 'cmdWindow') {
        setCmdActivationMode();
      }

      if (icon.dataset.window === 'mapWindow') {
        mapWindowTitle.textContent = 'Coordenadas Secretas';
      }

      openWindow(icon.dataset.window);

      if (icon.dataset.window === 'computerWindow') {
        renderComputerView('root');
      }

      return;
    }

    if (computerShortcut) {
      openWindow('computerWindow');
      renderComputerView(computerShortcut.dataset.computerShortcut);
      return;
    }

    if (closeButton) {
      closeWindow(closeButton.dataset.close);
      return;
    }

    if (actionButton && actionButton.dataset.action === 'clear-login') {
      clearLogin();
      return;
    }

    if (actionButton && actionButton.dataset.action === 'submit-code') {
      submitCode();
      return;
    }

    if (actionButton && actionButton.dataset.action === 'submit-document-auth') {
      submitDocumentAuth();
      return;
    }

    if (actionButton && actionButton.dataset.action === 'computer-back') {
      goBackComputer();
      return;
    }

    if (actionButton && actionButton.dataset.action === 'computer-forward') {
      goForwardComputer();
      return;
    }

    if (actionButton && actionButton.dataset.action === 'minimize') {
      closeWindow(actionButton.closest('.app-window').id);
      return;
    }

    if (computerItem) {
      renderComputerView(computerItem.dataset.computerOpen);
      return;
    }

    if (documentItem) {
      setCmdDocumentMode(documentItem.dataset.documentKey);
      openWindow('cmdWindow');
      return;
    }

    if (point) {
      showMapPopup(point);
      return;
    }

    if (appWindow) {
      activateWindow(appWindow);
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && document.activeElement === document.getElementById('codeInput')) {
      submitCode();
    }

    if (event.key === 'Enter' && cmdAuthFields.contains(document.activeElement)) {
      submitDocumentAuth();
    }
  });

  document.querySelectorAll('.app-window').forEach(makeDraggable);
  document.querySelectorAll('.map-point').forEach(function(point) {
    point.addEventListener('pointerenter', function() {
      showMapPopup(point);
    });
  });

  renderComputerView('root');
  loginUser.focus();

  window.addEventListener('beforeunload', function() {
    clearTimeout(matrixTimer);
    clearInterval(matrixInterval);
  });
})();
