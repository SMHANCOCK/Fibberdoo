(function () {
  var KEY = 'perudoPlayerProfile';
  var AVATARS = '😀 😎 🤖 👻 🧙 🧑‍🚀 🧛 🧑‍🎤 🧑‍🔬 🧑‍🚒 🧑‍🍳 🧑‍💻 😈 👿 🤡 🥷 🧟 🐶 🐺 🦊 🐱 🦁 🐯 🐻 🐼 🐸 🐵 🦄 🐲 🦉 🐧 🐙 🐢 🦖 🐍 🐬 🦈 🦦 🦥 🦩'.split(' ');
  function saveProfile(profile) { localStorage.setItem(KEY, JSON.stringify(profile)); return profile; }
  function loadProfile() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function clearProfile() { localStorage.removeItem(KEY); }
  function renderProfile() {
    var select = document.getElementById('avatarSelect');
    if (select && !select.options.length) select.innerHTML = AVATARS.map(function (a) { return '<option value="' + a + '">' + a + '</option>'; }).join('');
    var saved = loadProfile();
    if (saved) {
      if (document.getElementById('playerName')) document.getElementById('playerName').value = saved.name;
      if (select) select.value = saved.avatar;
      if (document.getElementById('cupColour')) document.getElementById('cupColour').value = saved.cupColour;
    }
  }
  window.PerudoProfile = { AVATARS: AVATARS, saveProfile: saveProfile, loadProfile: loadProfile, clearProfile: clearProfile, renderProfile: renderProfile };
  window.saveProfile = saveProfile;
  window.loadProfile = loadProfile;
  window.clearProfile = clearProfile;
  window.renderProfile = renderProfile;
})();
