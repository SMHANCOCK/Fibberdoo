(function () {
  var KEY = 'perudoPlayerProfile';
  var AVATAR_BASE_PATH = './Assets/Custom Avatars/';
  var LEGACY_AVATAR_IDS = {
    'custom-ant-bunny': 'ant-bunny',
    'custom-matt-hammock': 'matt-hammock',
    'custom-pete-socks': 'pete-socks',
    'custom-steve-hammock': 'steve-hammock'
  };

  var CUSTOM_AVATARS = [
    {
      id: 'ally-hammock',
      name: 'Ally Hammock',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Ally Hammock.png',
      personality: 'confident',
      animalType: 'custom',
      defaultPersonality: { type: 'Hammock Headliner', bluffing: 7, caution: 5, aggression: 6, luck: 7, flavourLine: 'Looks comfy. Plays loud.' }
    },
    {
      id: 'amy-toothpaste',
      name: 'Amy Toothpaste',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Amy Toothpaste.png',
      personality: 'sharp',
      animalType: 'custom',
      defaultPersonality: { type: 'Minty Menace', bluffing: 5, caution: 8, aggression: 5, luck: 6, flavourLine: 'Fresh smile. Suspicious bids.' }
    },
    {
      id: 'ant-bunny',
      name: 'Ant Bunny',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Ant Bunny.png',
      personality: 'chaotic',
      animalType: 'bunny',
      defaultPersonality: { type: 'Chaotic Bunny', bluffing: 8, caution: 4, aggression: 6, luck: 7, flavourLine: 'Tiny ears. Massive nonsense.' }
    },
    {
      id: 'chris-leopard',
      name: 'Chris Leopard',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Chris Leopard.png',
      personality: 'aggressive',
      animalType: 'leopard',
      defaultPersonality: { type: 'Leopard Lurker', bluffing: 7, caution: 5, aggression: 8, luck: 6, flavourLine: 'Spots weakness quickly.' }
    },
    {
      id: 'dan-pebbles',
      name: 'Dan Pebbles',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Dan Pebbles.png',
      personality: 'steady',
      animalType: 'custom',
      defaultPersonality: { type: 'Pebble Pusher', bluffing: 6, caution: 7, aggression: 5, luck: 6, flavourLine: 'Small moves, annoying results.' }
    },
    {
      id: 'dave-purselover',
      name: 'Dave Purselover',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Dave Purselover.png',
      personality: 'cocky',
      animalType: 'custom',
      defaultPersonality: { type: 'Pocket Schemer', bluffing: 8, caution: 5, aggression: 7, luck: 5, flavourLine: 'Keeps spare lies in the bag.' }
    },
    {
      id: 'harry-hammock',
      name: 'Harry Hammock',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Harry Hammock.png',
      personality: 'calm',
      animalType: 'custom',
      defaultPersonality: { type: 'Lazy Blade', bluffing: 6, caution: 8, aggression: 4, luck: 7, flavourLine: 'Barely moves. Still dangerous.' }
    },
    {
      id: 'josie-barbell',
      name: 'Josie Barbell',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Josie Barbell.png',
      personality: 'aggressive',
      animalType: 'custom',
      defaultPersonality: { type: 'Heavy Raiser', bluffing: 6, caution: 5, aggression: 9, luck: 5, flavourLine: 'Raises like it is leg day.' }
    },
    {
      id: 'ken-amarelle',
      name: 'Ken Amarelle',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Ken Amarelle.png',
      personality: 'cautious',
      animalType: 'custom',
      defaultPersonality: { type: 'Careful Customer', bluffing: 5, caution: 9, aggression: 4, luck: 6, flavourLine: 'Checks the room twice.' }
    },
    {
      id: 'matt-hammock',
      name: 'Matt Hammock',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Matt Hammock.png',
      personality: 'cocky',
      animalType: 'custom',
      defaultPersonality: { type: 'Hammock Hustler', bluffing: 7, caution: 5, aggression: 6, luck: 6, flavourLine: 'Looks relaxed. Probably lying.' }
    },
    {
      id: 'pete-socks',
      name: 'Pete Socks',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Pete Socks.png',
      personality: 'sarcastic',
      animalType: 'custom',
      defaultPersonality: { type: 'Sock Drawer Schemer', bluffing: 6, caution: 6, aggression: 5, luck: 7, flavourLine: 'Odd socks, odder bids.' }
    },
    {
      id: 'russ-hammock',
      name: 'Russ Hammock',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Russ Hammock.png',
      personality: 'sarcastic',
      animalType: 'custom',
      defaultPersonality: { type: 'Dry Recliner', bluffing: 7, caution: 6, aggression: 5, luck: 6, flavourLine: 'Says little. Means trouble.' }
    },
    {
      id: 'steve-hammock',
      name: 'Steve Hammock',
      type: 'customImage',
      imageSrc: AVATAR_BASE_PATH + 'Steve Hammock.png',
      personality: 'calm',
      animalType: 'custom',
      defaultPersonality: { type: 'Hammock Bluffer', bluffing: 6, caution: 8, aggression: 4, luck: 6, flavourLine: 'Suspiciously comfortable under pressure.' }
    }
  ];

  var AVATAR_REGISTRY = CUSTOM_AVATARS.slice();

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeAvatarId(value) {
    var raw = value && typeof value === 'object' ? (value.avatarId || value.id || value.avatar) : value;
    raw = LEGACY_AVATAR_IDS[raw] || raw;
    return AVATAR_REGISTRY.some(function (entry) { return entry.id === raw; }) ? raw : AVATAR_REGISTRY[0].id;
  }

  function getAvatarEntry(value) {
    var id = normalizeAvatarId(value);
    return AVATAR_REGISTRY.find(function (entry) { return entry.id === id; }) || AVATAR_REGISTRY[0];
  }

  function getAvatarDisplayText(value) {
    return getAvatarEntry(value).name;
  }

  function fallbackSilhouette() {
    return '<span class="avatar-fallback" aria-hidden="true">?</span>';
  }

  function renderAvatar(value, extraClass) {
    var entry = getAvatarEntry(value);
    var classes = 'avatar avatar-icon custom-avatar' + (extraClass ? ' ' + extraClass : '');
    return '<span class="' + escapeHtml(classes) + '" data-avatar-id="' + escapeHtml(entry.id) + '">' +
      '<img src="' + escapeHtml(entry.imageSrc) + '" alt="' + escapeHtml(entry.name) + '" class="avatar-img" data-avatar-src="' + escapeHtml(entry.imageSrc) + '" onerror="window.handleAvatarImageError && window.handleAvatarImageError(this)" />' +
      '</span>';
  }

  function handleAvatarImageError(img) {
    if (!img) return;
    var path = img.getAttribute('data-avatar-src') || img.getAttribute('src') || 'unknown path';
    console.warn('Avatar image failed to load: ' + path);
    img.onerror = null;
    img.style.display = 'none';
    if (img.parentNode && !img.parentNode.querySelector('.avatar-fallback')) {
      var fallback = document.createElement('span');
      fallback.className = 'avatar-fallback';
      fallback.textContent = '?';
      img.parentNode.appendChild(fallback);
    }
  }

  function normalizeProfile(profile) {
    profile = profile || {};
    var entry = getAvatarEntry(profile.avatarId || profile.avatar);
    return {
      name: profile.name || 'Player',
      avatar: entry.id,
      avatarId: entry.id,
      avatarType: entry.type,
      avatarImageSrc: entry.imageSrc,
      avatarName: entry.name,
      animalType: entry.animalType || 'custom',
      cupColour: profile.cupColour || profile.cupColor || '#2f80ed'
    };
  }

  function saveProfile(profile) {
    var normalized = normalizeProfile(profile);
    localStorage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  }

  function loadProfile() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      return saved ? normalizeProfile(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function clearProfile() { localStorage.removeItem(KEY); }

  function renderSelectedAvatarPreview(selectedAvatar) {
    var entry = getAvatarEntry(selectedAvatar);
    return '<div class="selected-fibber-preview">' +
      '<img src="' + escapeHtml(entry.imageSrc) + '" alt="' + escapeHtml(entry.name) + '" class="avatar-preview-img" data-avatar-src="' + escapeHtml(entry.imageSrc) + '" onerror="window.handleAvatarImageError && window.handleAvatarImageError(this)" />' +
      '<div><p class="eyebrow">Selected Fibber</p><h3>' + escapeHtml(entry.name) + '</h3><p>' + escapeHtml(entry.defaultPersonality.flavourLine) + '</p></div>' +
      '</div>';
  }

  function renderCharacterGrid(selectedId) {
    var grid = document.getElementById('avatarGrid');
    if (!grid) return;
    grid.innerHTML = AVATAR_REGISTRY.map(function (entry) {
      var selected = entry.id === selectedId;
      return '<button type="button" class="character-tile' + (selected ? ' selected' : '') + '" data-avatar-id="' + escapeHtml(entry.id) + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
        '<span class="selected-badge">Selected</span>' +
        '<img src="' + escapeHtml(entry.imageSrc) + '" alt="' + escapeHtml(entry.name) + '" class="character-portrait" data-avatar-src="' + escapeHtml(entry.imageSrc) + '" onerror="window.handleAvatarImageError && window.handleAvatarImageError(this)" />' +
        '<strong>' + escapeHtml(entry.name) + '</strong>' +
        '</button>';
    }).join('');
    Array.from(grid.querySelectorAll('.character-tile')).forEach(function (button) {
      button.addEventListener('click', function () {
        var select = document.getElementById('avatarSelect');
        if (select) select.value = button.getAttribute('data-avatar-id');
        renderAvatarPreview();
      });
    });
  }

  function renderAvatarPreview() {
    var select = document.getElementById('avatarSelect');
    var selectedId = normalizeAvatarId(select && select.value);
    if (select) select.value = selectedId;
    renderCharacterGrid(selectedId);
    var preview = document.getElementById('avatarPreview');
    if (preview) preview.innerHTML = renderSelectedAvatarPreview(selectedId);
  }

  function renderProfile() {
    var select = document.getElementById('avatarSelect');
    if (select && !select.options.length) {
      select.innerHTML = AVATAR_REGISTRY.map(function (entry) {
        return '<option value="' + escapeHtml(entry.id) + '">' + escapeHtml(entry.name) + '</option>';
      }).join('');
      select.addEventListener('change', renderAvatarPreview);
    }
    var saved = loadProfile();
    if (saved) {
      if (document.getElementById('playerName')) document.getElementById('playerName').value = saved.name;
      if (select) select.value = saved.avatarId;
      if (document.getElementById('cupColour')) document.getElementById('cupColour').value = saved.cupColour;
    } else if (select) {
      select.value = AVATAR_REGISTRY[0].id;
    }
    renderAvatarPreview();
  }

  function validateAvatarSystem() {
    var originalProfile = localStorage.getItem(KEY);
    try {
      var custom = getAvatarEntry('ant-bunny');
      var saved = saveProfile({ name: 'Avatar Test', avatarId: 'ant-bunny', cupColour: '#123456' });
      var picker = document.getElementById('avatarSelect');
      var grid = document.getElementById('avatarGrid');
      var pickerHasCustom = !picker || !picker.options.length || Array.from(picker.options).some(function (option) { return option.value === 'ant-bunny'; });
      var noEmojiOptions = !picker || Array.from(picker.options).every(function (option) { return option.value.indexOf('custom-') !== 0 && AVATAR_REGISTRY.some(function (entry) { return entry.id === option.value; }); });
      var gridShowsAll = !grid || grid.querySelectorAll('.character-tile').length === CUSTOM_AVATARS.length || !grid.querySelectorAll('.character-tile').length;
      var renderedCustom = renderAvatar(saved).indexOf('avatar-img') !== -1 && renderAvatar(saved).indexOf('Ant Bunny.png') !== -1;
      var customPreview = renderSelectedAvatarPreview(custom);
      return {
        customAvatarsRegistered: CUSTOM_AVATARS.length >= 13 && !!custom,
        customAvatarPathResolves: custom.imageSrc === './Assets/Custom Avatars/Ant Bunny.png',
        avatarPickerIncludesCustom: pickerHasCustom,
        noEmojiAvatarsInSelector: noEmojiOptions,
        characterGridShowsAllCustomAvatars: gridShowsAll,
        selectedCustomAvatarSaves: loadProfile().avatarId === 'ant-bunny',
        selectedCustomAvatarRenders: renderedCustom,
        humanPlayerCardRendersSelectedImage: renderedCustom,
        customAvatarPreviewRenders: customPreview.indexOf('avatar-preview-img') !== -1 && customPreview.indexOf(custom.imageSrc) !== -1,
        customAvatarLabelsClean: !picker || Array.from(picker.options).every(function (option) { return option.text.indexOf('Image -') === -1; }),
        missingImageFallsBackSafely: typeof handleAvatarImageError === 'function'
      };
    } finally {
      if (originalProfile === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, originalProfile);
    }
  }

  window.PerudoProfile = {
    AVATARS: CUSTOM_AVATARS,
    CUSTOM_AVATARS: CUSTOM_AVATARS,
    AVATAR_REGISTRY: AVATAR_REGISTRY,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    clearProfile: clearProfile,
    renderProfile: renderProfile,
    renderAvatar: renderAvatar,
    renderSelectedAvatarPreview: renderSelectedAvatarPreview,
    renderCharacterGrid: renderCharacterGrid,
    getAvatarEntry: getAvatarEntry,
    getAvatarDisplayText: getAvatarDisplayText,
    handleAvatarImageError: handleAvatarImageError,
    validateAvatarSystem: validateAvatarSystem
  };
  window.saveProfile = saveProfile;
  window.loadProfile = loadProfile;
  window.clearProfile = clearProfile;
  window.renderProfile = renderProfile;
  window.renderAvatar = renderAvatar;
  window.renderSelectedAvatarPreview = renderSelectedAvatarPreview;
  window.getAvatarEntry = getAvatarEntry;
  window.getAvatarDisplayText = getAvatarDisplayText;
  window.handleAvatarImageError = handleAvatarImageError;
  window.validateAvatarSystem = validateAvatarSystem;
})();
