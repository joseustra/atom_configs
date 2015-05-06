(function() {
  var AlertView, InputView, Slack, SlackInvite, _;

  InputView = require('../views/input-view');

  AlertView = require('../views/alert-view');

  Slack = require('slack-node');

  _ = require('underscore');

  module.exports = SlackInvite = {
    inviteOverSlack: function() {
      var inviteView;
      this.getKeysFromConfig();
      if (this.missingPusherKeys()) {
        return new AlertView("Please set your Pusher keys.");
      } else if (this.missingSlackWebHook()) {
        return new AlertView("Please set your Slack Incoming WebHook");
      } else {
        inviteView = new InputView("Please enter the Slack name of your pair partner (or channel name):");
        inviteView.miniEditor.focus();
        return inviteView.on('core:confirm', (function(_this) {
          return function() {
            var messageRcpt;
            messageRcpt = inviteView.miniEditor.getText();
            _this.sendSlackMessageTo(messageRcpt);
            return inviteView.panel.hide();
          };
        })(this));
      }
    },
    sendSlackMessageTo: function(messageRcpt) {
      var params, slack;
      slack = new Slack();
      slack.setWebhook(this.slack_url);
      this.generateSessionId();
      params = {
        text: "Hello there " + messageRcpt + ". You have been invited to a pairing session. If you haven't installed the AtomPair plugin, type \`apm install atom-pair\` into your terminal. Go onto Atom, hit 'Join a pairing session', and enter this string: " + this.sessionId,
        channel: messageRcpt,
        username: 'AtomPair',
        icon_emoji: ':couple_with_heart:'
      };
      return slack.webhook(params, (function(_this) {
        return function(err, response) {
          new AlertView("" + messageRcpt + " has been sent an invitation. Hold tight!");
          _this.markerColour = _this.colours[0];
          _this.pairingSetup();
        };
      })(this));
    }
  };

}).call(this);
