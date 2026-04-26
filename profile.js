(function () {
  var KEY = 'perudoPlayerProfile';
  var EMOJI_AVATARS = '😀 😎 🤖 👻 🧙 🧑‍🚀 🧛 🧑‍🎤 🧑‍🔬 🧑‍🚒 🧑‍🍳 🧑‍💻 😈 👿 🤡 🥷 🧟 🐶 🐺 🦊 🐱 🦁 🐯 🐻 🐼 🐸 🐵 🦄 🐲 🦉 🐧 🐙 🐢 🦖 🐍 🐬 🦈 🦦 🦥 🦩'.split(' ');
  var EMOJI_ANIMAL_TYPES = { '😈': 'devil', '👿': 'devil', '🐶': 'dog', '🐺': 'wolf', '🦊': 'fox', '🤖': 'robot', '🦥': 'sloth', '🦈': 'shark', '🦄': 'unicorn', '🐻': 'bear', '🐼': 'bear', '🐱': 'cat', '🦁': 'cat', '🐯': 'cat', '🦉': 'owl', '🐸': 'frog', '🐵': 'monkey', '🐲': 'dragon', '🐧': 'penguin', '🐙': 'octopus', '🐢': 'turtle', '🦖': 'dinosaur', '🐍': 'snake', '🐬': 'dolphin', '🦦': 'otter', '🦩': 'flamingo' };
  var CUSTOM_AVATARS = [
    { id: 'custom-ant-bunny', type: 'customImage', name: 'Ant Bunny', label: 'Ant Bunny', imageSrc: './Assets/Custom Avatars/Ant Bunny.png', animalType: 'custom', defaultPersonality: { type: 'Custom Menace', bluffing: 6, caution: 5, aggression: 6, luck: 6, flavourLine: 'New face, same suspicious cup.' } },
    { id: 'custom-matt-hammock', type: 'customImage', name: 'Matt Hammock', label: 'Matt Hammock', imageSrc: './Assets/Custom Avatars/Matt Hammock.png', animalType: 'custom', defaultPersonality: { type: 'Hammock Hustler', bluffing: 7, caution: 5, aggression: 5, luck: 6, flavourLine: 'Looks relaxed. Probably lying.' } },
    { id: 'custom-pete-socks', type: 'customImage', name: 'Pete Socks', label: 'Pete Socks', imageSrc: './Assets/Custom Avatars/Pete Socks.png', animalType: 'custom', defaultPersonality: { type: 'Sock Drawer Schemer', bluffing: 6, caution: 6, aggression: 5, luck: 7, flavourLine: 'Odd socks, odder bids.' } },
    { id: 'custom-steve-hammock', type: 'customImage', name: 'Steve Hammock', label: 'Steve Hammock', imageSrc: './Assets/Custom Avatars/Steve Hammock.png', animalType: 'custom', defaultPersonality: { type: 'Hammock Bluffer', bluffing: 7, caution: 6, aggression: 5, luck: 6, flavourLine: 'Suspiciously comfortable under pressure.' } }
  ];
  var EMOJI_AVATAR_ENTRIES = EMOJI_AVATARS.map(function (emoji) {
    return { id: emoji, type: 'emoji', name: emoji, label: emoji, emoji: emoji, animalType: EMOJI_ANIMAL_TYPES[emoji] || 'player' };
  });
  var AVATAR_REGISTRY = EMOJI_AVATAR_ENTRIES.concat(CUSTOM_AVATARS);

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAvatarEntry(value) {
    var raw = value && typeof value === 'object' ? (value.avatarId || value.id || value.avatar || value.emoji) : value;
    if (!raw) return EMOJI_AVATAR_ENTRIES[0];
    var found = AVATAR_REGISTRY.find(function (entry) {
      return entry.id === raw || entry.emoji === raw || entry.imageSrc === raw;
    });
    return found || (typeof raw === 'string' && raw.length <= 4 ? { id: raw, type: 'emoji', name: raw, label: raw, emoji: raw, animalType: EMOJI_ANIMAL_TYPES[raw] || 'player' } : EMOJI_AVATAR_ENTRIES[0]);
  }

  function getAvatarDisplayText(value) {
    var entry = getAvatarEntry(value);
    return entry.type === 'customImage' ? entry.name : entry.emoji;
  }

  function renderAvatar(value, extraClass) {
    var entry = getAvatarEntry(value);
    var classes = 'avatar avatar-icon ' + (entry.type === 'customImage' ? 'custom-avatar' : 'emoji-avatar') + (extraClass ? ' ' + extraClass : '');
    if (entry.type === 'customImage') {
      return '<span class="' + escapeHtml(classes) + '" data-avatar-id="' + escapeHtml(entry.id) + '">' +
        '<img src="' + escapeHtml(entry.imageSrc) + '" alt="' + escapeHtml(entry.name) + '" class="avatar-img" data-avatar-src="' + escapeHtml(entry.imageSrc) + '" onerror="window.handleAvatarImageError && window.handleAvatarImageError(this)" />' +
        '</span>';
    }
    return '<span class="' + escapeHtml(classes) + '" data-avatar-id="' + escapeHtml(entry.id) + '">' + escapeHtml(entry.emoji) + '</span>';
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
      fallback.textContent = '🎲';
      img.parentNode.appendChild(fallback);
    }
  }

  function normalizeProfile(profile) {
    profile = profile || {};
    var entry = getAvatarEntry(profile.avatarId || profile.avatar);
    return {
      name: profile.name || 'Player',
      avatar: entry.type === 'emoji' ? entry.emoji : entry.id,
      avatarId: entry.id,
      avatarType: entry.type,
      avatarImageSrc: entry.imageSrc || '',
      avatarName: entry.name,
      animalType: entry.animalType || 'player',
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
    if (entry.type === 'customImage') {
      return '<img src="' + escapeHtml(entry.imageSrc) + '" alt="' + escapeHtml(entry.name) + '" class="avatar-preview-img" data-avatar-src="' + escapeHtml(entry.imageSrc) + '" onerror="window.handleAvatarImageError && window.handleAvatarImageError(this)" />';
    }
    return '<span class="avatar-preview-emoji">' + escapeHtml(entry.emoji) + '</span>';
  }

  function renderAvatarPreview() {
    var select = document.getElementById('avatarSelect');
    if (!select) return;
    var preview = document.getElementById('avatarPreview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'avatarPreview';
      preview.className = 'avatar-picker-preview';
      if (select.parentNode) select.parentNode.insertAdjacentElement('afterend', preview);
    }
    var entry = getAvatarEntry(select.value);
    preview.innerHTML = renderSelectedAvatarPreview(entry) + '<span>' + escapeHtml(entry.type === 'customImage' ? entry.name : 'Emoji avatar') + '</span>';
  }

  function renderProfile() {
    var select = document.getElementById('avatarSelect');
    if (select && !select.options.length) {
      select.innerHTML = AVATAR_REGISTRY.map(function (entry) {
        return '<option value="' + escapeHtml(entry.id) + '">' + escapeHtml(entry.type === 'customImage' ? entry.name : entry.emoji) + '</option>';
      }).join('');
      select.addEventListener('change', renderAvatarPreview);
    }
    var saved = loadProfile();
    if (saved) {
      if (document.getElementById('playerName')) document.getElementById('playerName').value = saved.name;
      if (select) select.value = getAvatarEntry(saved.avatarId || saved.avatar).id;
      if (document.getElementById('cupColour')) document.getElementById('cupColour').value = saved.cupColour;
    }
    renderAvatarPreview();
  }

  function validateAvatarSystem() {
    var originalProfile = localStorage.getItem(KEY);
    try {
      var custom = getAvatarEntry('custom-ant-bunny');
      var saved = saveProfile({ name: 'Avatar Test', avatarId: 'custom-ant-bunny', cupColour: '#123456' });
      var picker = document.getElementById('avatarSelect');
      var pickerHasCustom = !picker || !picker.options.length || Array.from(picker.options).some(function (option) { return option.value === 'custom-ant-bunny'; });
      var renderedCustom = renderAvatar(saved).indexOf('avatar-img') !== -1 && renderAvatar(saved).indexOf('Ant Bunny.png') !== -1;
      var renderedEmoji = renderAvatar(EMOJI_AVATARS[1]).indexOf(EMOJI_AVATARS[1]) !== -1;
      var customPreview = renderSelectedAvatarPreview(custom);
      var emojiPreview = renderSelectedAvatarPreview(EMOJI_AVATARS[1]);
      var labelsClean = !picker || Array.from(picker.options).filter(function (option) { return option.value.indexOf('custom-') === 0; }).every(function (option) { return option.text.indexOf('Image -') === -1; });
      return {
        customAvatarsRegistered: CUSTOM_AVATARS.length === 4 && !!custom,
        customAvatarPathResolves: custom.imageSrc === './Assets/Custom Avatars/Ant Bunny.png',
        avatarPickerIncludesCustom: pickerHasCustom,
        selectedCustomAvatarSaves: loadProfile().avatarId === 'custom-ant-bunny',
        selectedCustomAvatarRenders: renderedCustom,
        emojiAvatarsStillRender: renderedEmoji,
        customAvatarPreviewRenders: customPreview.indexOf('avatar-preview-img') !== -1 && customPreview.indexOf(custom.imageSrc) !== -1,
        emojiAvatarPreviewStillWorks: emojiPreview.indexOf('avatar-preview-emoji') !== -1,
        customAvatarLabelsClean: labelsClean,
        missingImageFallsBackSafely: typeof handleAvatarImageError === 'function'
      };
    } finally {
      if (originalProfile === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, originalProfile);
    }
  }

  window.PerudoProfile = {
    AVATARS: EMOJI_AVATARS,
    EMOJI_AVATARS: EMOJI_AVATARS,
    CUSTOM_AVATARS: CUSTOM_AVATARS,
    AVATAR_REGISTRY: AVATAR_REGISTRY,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    clearProfile: clearProfile,
    renderProfile: renderProfile,
    renderAvatar: renderAvatar,
    renderSelectedAvatarPreview: renderSelectedAvatarPreview,
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
