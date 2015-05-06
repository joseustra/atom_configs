(function() {
  var AlertView, AtomPair, AtomPairConfig, CompositeDisposable, CustomPaste, GrammarSync, HipChatInvite, InputView, Marker, Range, SlackInvite, StartView, chunkString, randomstring, _, _ref;

  StartView = null;

  InputView = null;

  AlertView = null;

  require('./pusher/pusher');

  require('./pusher/pusher-js-client-auth');

  randomstring = null;

  _ = null;

  chunkString = null;

  HipChatInvite = null;

  SlackInvite = null;

  Marker = null;

  GrammarSync = null;

  AtomPairConfig = null;

  CustomPaste = null;

  _ref = require('atom'), CompositeDisposable = _ref.CompositeDisposable, Range = _ref.Range;

  module.exports = AtomPair = {
    AtomPairView: null,
    modalPanel: null,
    subscriptions: null,
    config: {
      hipchat_token: {
        type: 'string',
        description: 'HipChat admin token (optional)',
        "default": ''
      },
      hipchat_room_name: {
        type: 'string',
        description: 'HipChat room name for sending invitations (optional)',
        "default": ''
      },
      pusher_app_key: {
        type: 'string',
        description: 'Pusher App Key (sign up at http://pusher.com/signup and change for added security)',
        "default": 'd41a439c438a100756f5'
      },
      pusher_app_secret: {
        type: 'string',
        description: 'Pusher App Secret',
        "default": '4bf35003e819bb138249'
      },
      slack_url: {
        type: 'string',
        description: 'WebHook URL for Slack Incoming Webhook Integration',
        "default": ''
      }
    },
    activate: function(state) {
      StartView = require('./views/start-view');
      InputView = require('./views/input-view');
      AlertView = require('./views/alert-view');
      randomstring = require('randomstring');
      _ = require('underscore');
      chunkString = require('./helpers/chunk-string');
      HipChatInvite = require('./modules/hipchat_invite');
      SlackInvite = require('./modules/slack_invite');
      Marker = require('./modules/marker');
      GrammarSync = require('./modules/grammar_sync');
      AtomPairConfig = require('./modules/atom_pair_config');
      CustomPaste = require('./modules/custom_paste');
      this.subscriptions = new CompositeDisposable;
      this.editorListeners = new CompositeDisposable;
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:start new pairing session': (function(_this) {
          return function() {
            return _this.startSession();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:join pairing session': (function(_this) {
          return function() {
            return _this.joinSession();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:invite over hipchat': (function(_this) {
          return function() {
            return _this.inviteOverHipChat();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:invite over slack': (function(_this) {
          return function() {
            return _this.inviteOverSlack();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:custom-paste': (function(_this) {
          return function() {
            return _this.customPaste();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('.session-id', {
        'AtomPair:copyid': (function(_this) {
          return function() {
            return _this.copyId();
          };
        })(this)
      }));
      this.colours = require('./helpers/colour-list');
      this.friendColours = [];
      this.timeouts = [];
      this.events = [];
      return _.extend(this, HipChatInvite, SlackInvite, Marker, GrammarSync, AtomPairConfig, CustomPaste);
    },
    disconnect: function() {
      this.pusher.disconnect();
      this.editorListeners.dispose();
      _.each(this.friendColours, (function(_this) {
        return function(colour) {
          return _this.clearMarkers(colour);
        };
      })(this));
      atom.views.getView(this.editor).removeAttribute('id');
      return this.markerColour = null;
    },
    copyId: function() {
      return atom.clipboard.write(this.sessionId);
    },
    joinSession: function() {
      var alreadyPairing, joinView;
      if (this.markerColour) {
        alreadyPairing = new AlertView("It looks like you are already in a pairing session. Please open a new window (cmd+shift+N) to start/join a new one.");
        return;
      }
      joinView = new InputView("Enter the session ID here:");
      joinView.miniEditor.focus();
      return joinView.on('core:confirm', (function(_this) {
        return function() {
          var keys, _ref1;
          _this.sessionId = joinView.miniEditor.getText();
          keys = _this.sessionId.split("-");
          _ref1 = [keys[0], keys[1]], _this.app_key = _ref1[0], _this.app_secret = _ref1[1];
          joinView.panel.hide();
          return atom.workspace.open().then(function() {
            return _this.pairingSetup();
          });
        };
      })(this));
    },
    startSession: function() {
      this.getKeysFromConfig();
      if (this.missingPusherKeys()) {
        return new AlertView("Please set your Pusher keys.");
      } else {
        this.generateSessionId();
        new StartView(this.sessionId);
        this.markerColour = this.colours[0];
        return this.pairingSetup();
      }
    },
    generateSessionId: function() {
      return this.sessionId = "" + this.app_key + "-" + this.app_secret + "-" + (randomstring.generate(11));
    },
    pairingSetup: function() {
      if (this.editor == null) {
        this.editor = atom.workspace.getActiveTextEditor();
      }
      atom.views.getView(this.editor).setAttribute('id', 'AtomPair');
      this.connectToPusher();
      this.synchronizeColours();
      return this.subscriptions.add(atom.commands.add('atom-workspace', {
        'AtomPair:disconnect': (function(_this) {
          return function() {
            return _this.disconnect();
          };
        })(this)
      }));
    },
    connectToPusher: function() {
      this.pusher = new Pusher(this.app_key, {
        authTransport: 'client',
        clientAuth: {
          key: this.app_key,
          secret: this.app_secret,
          user_id: this.markerColour || "blank"
        }
      });
      return this.pairingChannel = this.pusher.subscribe("presence-session-" + this.sessionId);
    },
    synchronizeColours: function() {
      return this.pairingChannel.bind('pusher:subscription_succeeded', (function(_this) {
        return function(members) {
          var colours;
          _this.membersCount = members.count;
          if (!_this.markerColour) {
            return _this.resubscribe();
          }
          colours = Object.keys(members.members);
          _this.friendColours = _.without(colours, _this.markerColour);
          _.each(_this.friendColours, function(colour) {
            return _this.addMarker(0, colour);
          });
          return _this.startPairing();
        };
      })(this));
    },
    resubscribe: function() {
      this.pairingChannel.unsubscribe();
      this.markerColour = this.colours[this.membersCount - 1];
      this.connectToPusher();
      return this.synchronizeColours();
    },
    withoutTrigger: function(callback) {
      this.triggerPush = false;
      callback();
      return this.triggerPush = true;
    },
    startPairing: function() {
      var buffer;
      this.triggerPush = true;
      if (this.editor == null) {
        this.editor = atom.workspace.getActiveTextEditor();
      }
      buffer = this.buffer = this.editor.buffer;
      this.pairingChannel.bind('pusher:member_added', (function(_this) {
        return function(member) {
          var noticeView;
          noticeView = new AlertView("Your pair buddy has joined the session.");
          _this.sendGrammar();
          _this.shareCurrentFile();
          _this.friendColours.push(member.id);
          return _this.addMarker(0, member.id);
        };
      })(this));
      this.pairingChannel.bind('client-grammar-sync', (function(_this) {
        return function(syntax) {
          var grammar;
          grammar = atom.grammars.grammarForScopeName(syntax);
          return _this.editor.setGrammar(grammar);
        };
      })(this));
      this.pairingChannel.bind('client-share-whole-file', (function(_this) {
        return function(file) {
          return _this.withoutTrigger(function() {
            return buffer.setText(file);
          });
        };
      })(this));
      this.pairingChannel.bind('client-share-partial-file', (function(_this) {
        return function(chunk) {
          return _this.withoutTrigger(function() {
            return buffer.append(chunk);
          });
        };
      })(this));
      this.pairingChannel.bind('client-change', (function(_this) {
        return function(events) {
          return _.each(events, function(event) {
            if (event.eventType === 'buffer-change') {
              _this.changeBuffer(event);
            }
            if (event.eventType === 'buffer-selection') {
              return _this.updateCollaboratorMarker(event);
            }
          });
        };
      })(this));
      this.pairingChannel.bind('pusher:member_removed', (function(_this) {
        return function(member) {
          var disconnectView;
          _this.clearMarkers(member.id);
          return disconnectView = new AlertView("Your pair buddy has left the session.");
        };
      })(this));
      this.triggerEventQueue();
      this.editorListeners.add(this.listenToBufferChanges());
      this.editorListeners.add(this.syncSelectionRange());
      this.editorListeners.add(this.syncGrammars());
      return this.listenForDestruction();
    },
    listenForDestruction: function() {
      this.editorListeners.add(this.buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.disconnect();
        };
      })(this)));
      return this.editorListeners.add(this.editor.onDidDestroy((function(_this) {
        return function() {
          return _this.disconnect();
        };
      })(this)));
    },
    listenToBufferChanges: function() {
      return this.buffer.onDidChange((function(_this) {
        return function(event) {
          var changeType;
          if (!_this.triggerPush) {
            return;
          }
          if (!(event.newText === "\n") && (event.newText.length === 0)) {
            changeType = 'deletion';
            event = {
              oldRange: event.oldRange
            };
          } else if (event.oldRange.containsRange(event.newRange)) {
            changeType = 'substitution';
            event = {
              oldRange: event.oldRange,
              newRange: event.newRange,
              newText: event.newText
            };
          } else {
            changeType = 'insertion';
            event = {
              newRange: event.newRange,
              newText: event.newText
            };
          }
          event = {
            changeType: changeType,
            event: event,
            colour: _this.markerColour,
            eventType: 'buffer-change'
          };
          return _this.events.push(event);
        };
      })(this));
    },
    changeBuffer: function(data) {
      var newRange, newText, oldRange;
      if (data.event.newRange) {
        newRange = Range.fromObject(data.event.newRange);
      }
      if (data.event.oldRange) {
        oldRange = Range.fromObject(data.event.oldRange);
      }
      if (data.event.newText) {
        newText = data.event.newText;
      }
      return this.withoutTrigger((function(_this) {
        return function() {
          var actionArea;
          _this.clearMarkers(data.colour);
          switch (data.changeType) {
            case 'deletion':
              _this.buffer["delete"](oldRange);
              actionArea = oldRange.start;
              break;
            case 'substitution':
              _this.buffer.setTextInRange(oldRange, newText);
              actionArea = oldRange.start;
              break;
            default:
              _this.buffer.insert(newRange.start, newText);
              actionArea = newRange.start;
          }
          _this.editor.scrollToBufferPosition(actionArea);
          return _this.addMarker(actionArea.toArray()[0], data.colour);
        };
      })(this));
    },
    syncSelectionRange: function() {
      return this.editor.onDidChangeSelectionRange((function(_this) {
        return function(event) {
          var rows;
          rows = event.newBufferRange.getRows();
          if (!(rows.length > 1)) {
            return;
          }
          return _this.events.push({
            eventType: 'buffer-selection',
            colour: _this.markerColour,
            rows: rows
          });
        };
      })(this));
    },
    triggerEventQueue: function() {
      return this.eventInterval = setInterval((function(_this) {
        return function() {
          if (_this.events.length > 0) {
            _this.pairingChannel.trigger('client-change', _this.events);
            return _this.events = [];
          }
        };
      })(this), 120);
    },
    shareCurrentFile: function() {
      var chunks, currentFile;
      currentFile = this.buffer.getText();
      if (currentFile.length === 0) {
        return;
      }
      if (currentFile.length < 950) {
        return this.pairingChannel.trigger('client-share-whole-file', currentFile);
      } else {
        chunks = chunkString(currentFile, 950);
        return _.each(chunks, (function(_this) {
          return function(chunk, index) {
            return setTimeout((function() {
              return _this.pairingChannel.trigger('client-share-partial-file', chunk);
            }), 180 * index);
          };
        })(this));
      }
    }
  };

}).call(this);
