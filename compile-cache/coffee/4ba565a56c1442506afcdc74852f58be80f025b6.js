(function() {
  var AtomPairConfig, _;

  _ = require('underscore');

  module.exports = AtomPairConfig = {
    getKeysFromConfig: function() {
      this.app_key = atom.config.get('atom-pair.pusher_app_key');
      this.app_secret = atom.config.get('atom-pair.pusher_app_secret');
      this.hc_key = atom.config.get('atom-pair.hipchat_token');
      return this.room_name = atom.config.get('atom-pair.hipchat_room_name');
    },
    missingPusherKeys: function() {
      return _.any([this.app_key, this.app_secret], this.missing);
    },
    missingHipChatKeys: function() {
      return _.any([this.hc_key, this.room_name], this.missing);
    },
    missing: function(key) {
      return key === '' || typeof key === "undefined";
    }
  };

}).call(this);
