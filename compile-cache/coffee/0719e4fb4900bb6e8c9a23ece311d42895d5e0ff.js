(function() {
  var AlertView, HipChat, HipChatInvite, InputView, _;

  InputView = require('../views/input-view');

  AlertView = require('../views/alert-view');

  HipChat = require('node-hipchat');

  _ = require('underscore');

  module.exports = HipChatInvite = {
    inviteOverHipChat: function() {
      var inviteView;
      this.getKeysFromConfig();
      if (this.missingPusherKeys()) {
        return new AlertView("Please set your Pusher keys.");
      } else if (this.missingHipChatKeys()) {
        return new AlertView("Please set your HipChat keys.");
      } else {
        inviteView = new InputView("Please enter the HipChat mention name of your pair partner:");
        inviteView.miniEditor.focus();
        return inviteView.on('core:confirm', (function(_this) {
          return function() {
            var mentionNames;
            mentionNames = inviteView.miniEditor.getText();
            _this.sendHipChatMessageTo(mentionNames);
            return inviteView.panel.hide();
          };
        })(this));
      }
    },
    sendHipChatMessageTo: function(mentionNames) {
      var collaboratorsArray, collaboratorsString, hc_client;
      collaboratorsArray = mentionNames.match(/\w+/g);
      collaboratorsString = _.map(collaboratorsArray, function(collaborator) {
        if (collaborator[0] !== "@") {
          return "@" + collaborator;
        }
      }).join(", ");
      hc_client = new HipChat(this.hc_key);
      this.generateSessionId();
      return hc_client.listRooms((function(_this) {
        return function(data) {
          var error, keyErrorView, params, room_id;
          try {
            room_id = _.findWhere(data.rooms, {
              name: _this.room_name
            }).room_id;
          } catch (_error) {
            error = _error;
            keyErrorView = new AlertView("Something went wrong. Please check your HipChat keys.");
            return;
          }
          params = {
            room: room_id,
            from: 'AtomPair',
            message: "Hello there " + collaboratorsString + ". You have been invited to a pairing session. If you haven't installed the AtomPair plugin, type \`apm install atom-pair\` into your terminal. Go onto Atom, hit 'Join a pairing session', and enter this string: " + _this.sessionId,
            message_format: 'text'
          };
          return hc_client.postMessage(params, function(data) {
            var verb;
            if (collaboratorsArray.length > 1) {
              verb = "have";
            } else {
              verb = "has";
            }
            new AlertView("" + collaboratorsString + " " + verb + " been sent an invitation. Hold tight!");
            _this.markerColour = _this.colours[0];
            return _this.pairingSetup();
          });
        };
      })(this));
    }
  };

}).call(this);
