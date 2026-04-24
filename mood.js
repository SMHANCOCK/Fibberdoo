(function () {
  function getStreakPressureLevel(streak) {
    if (streak >= 5) return 'Boss Target';
    if (streak >= 3) return 'Hot Streak';
    if (streak >= 2) return 'On a Streak';
    return 'None';
  }
  function updatePlayerMood(player) {
    if (player.eliminated) return player.mood = player.spectator ? 'spectator' : 'eliminated';
    if (player.diceCount <= 1) return player.mood = 'nervous';
    if ((player.events.lostDie || 0) >= 2) return player.mood = 'annoyed';
    if ((player.events.failedDudo || 0) > (player.events.successfulDudo || 0)) return player.mood = 'sad';
    if ((player.events.successfulDudo || 0) >= 2) return player.mood = 'cocky';
    return player.mood = 'calm';
  }
  function recordPlayerEvent(player, eventName) {
    player.events = player.events || {};
    player.events[eventName] = (player.events[eventName] || 0) + 1;
    updatePlayerMood(player);
  }
  window.PerudoMood = { updatePlayerMood: updatePlayerMood, recordPlayerEvent: recordPlayerEvent, getStreakPressureLevel: getStreakPressureLevel };
  window.updatePlayerMood = updatePlayerMood;
  window.recordPlayerEvent = recordPlayerEvent;
  window.getStreakPressureLevel = getStreakPressureLevel;
})();
