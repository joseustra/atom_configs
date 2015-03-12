(function() {
  var AlertView, HipChat, HipChatInvite, InputView, _;

  InputView = require('../views/input-view');

  AlertView = require('../views/alert-view');

  HipChat = require('node-hipchat');

  _ = require('underscore');

  module.exports = HipChatInvite = {
    inviteOverHipChat: function() {
      var alertView, invitePanel, inviteView;
      this.getKeysFromConfig();
      if (this.missingPusherKeys()) {
        alertView = new AlertView("Please set your Pusher keys.");
        return atom.workspace.addModalPanel({
          item: alertView,
          visible: true
        });
      } else if (this.missingHipChatKeys()) {
        alertView = new AlertView("Please set your HipChat keys.");
        return atom.workspace.addModalPanel({
          item: alertView,
          visible: true
        });
      } else {
        inviteView = new InputView("Please enter the HipChat mention name of your pair partner:");
        invitePanel = atom.workspace.addModalPanel({
          item: inviteView,
          visible: true
        });
        return inviteView.on('core:confirm', (function(_this) {
          return function() {
            var mentionNames;
            mentionNames = inviteView.miniEditor.getText();
            _this.sendHipChatMessageTo(mentionNames);
            return invitePanel.hide();
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
            atom.workspace.addModalPanel({
              item: keyErrorView,
              visible: true
            });
            return;
          }
          params = {
            room: room_id,
            from: 'AtomPair',
            message: "Hello there " + collaboratorsString + ". You have been invited to a pairing session. If you haven't installed the AtomPair plugin, type \`apm install atom-pair\` into your terminal. Go onto Atom, hit 'Join a pairing session', and enter this string: " + _this.sessionId,
            message_format: 'text'
          };
          return hc_client.postMessage(params, function(data) {
            var alertView, verb;
            if (collaboratorsArray.length > 1) {
              verb = "have";
            } else {
              verb = "has";
            }
            alertView = new AlertView("" + collaboratorsString + " " + verb + " been sent an invitation. Hold tight!");
            atom.workspace.addModalPanel({
              item: alertView,
              visible: true
            });
            return _this.startPairing();
          });
        };
      })(this));
    }
  };

}).call(this);
