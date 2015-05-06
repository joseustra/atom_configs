(function() {
  var Dispatch, Emitter, Environment, Executor, GoExecutable, Gobuild, Gocover, Gofmt, Golint, Gopath, Govet, LineMessageView, MessagePanelView, PlainMessageView, SplicerSplitter, Subscriber, async, os, path, _, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  Gofmt = require('./gofmt');

  Govet = require('./govet');

  Golint = require('./golint');

  Gopath = require('./gopath');

  Gobuild = require('./gobuild');

  Gocover = require('./gocover');

  Executor = require('./executor');

  Environment = require('./environment');

  GoExecutable = require('./goexecutable');

  SplicerSplitter = require('./util/splicersplitter');

  _ = require('underscore-plus');

  _ref1 = require('atom-message-panel'), MessagePanelView = _ref1.MessagePanelView, LineMessageView = _ref1.LineMessageView, PlainMessageView = _ref1.PlainMessageView;

  path = require('path');

  os = require('os');

  async = require('async');

  module.exports = Dispatch = (function() {
    Subscriber.includeInto(Dispatch);

    Emitter.includeInto(Dispatch);

    function Dispatch() {
      this.gettools = __bind(this.gettools, this);
      this.displayGoInfo = __bind(this.displayGoInfo, this);
      this.emitReady = __bind(this.emitReady, this);
      this.displayMessages = __bind(this.displayMessages, this);
      this.resetAndDisplayMessages = __bind(this.resetAndDisplayMessages, this);
      this.detect = __bind(this.detect, this);
      this.handleEvents = __bind(this.handleEvents, this);
      this.subscribeToAtomEvents = __bind(this.subscribeToAtomEvents, this);
      this.destroy = __bind(this.destroy, this);
      var gobuildsubscription, gocoversubscription, gofmtsubscription, golintsubscription, gopathsubscription, govetsubscription;
      this.activated = false;
      this.dispatching = false;
      this.ready = false;
      this.messages = [];
      this.items = [];
      this.environment = new Environment(process.env);
      this.executor = new Executor(this.environment.Clone());
      this.splicersplitter = new SplicerSplitter();
      this.goexecutable = new GoExecutable(this.env());
      this.gofmt = new Gofmt(this);
      this.govet = new Govet(this);
      this.golint = new Golint(this);
      this.gopath = new Gopath(this);
      this.gobuild = new Gobuild(this);
      this.gocover = new Gocover(this);
      if (this.messagepanel == null) {
        this.messagepanel = new MessagePanelView({
          title: '<span class="icon-diff-added"></span> go-plus',
          rawTitle: true
        });
      }
      gofmtsubscription = this.gofmt.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      golintsubscription = this.golint.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      govetsubscription = this.govet.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      gopathsubscription = this.gopath.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      gobuildsubscription = this.gobuild.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      gocoversubscription = this.gocover.on('reset', (function(_this) {
        return function(editor) {
          return _this.resetState(editor);
        };
      })(this));
      this.subscribe(gofmtsubscription);
      this.subscribe(golintsubscription);
      this.subscribe(govetsubscription);
      this.subscribe(gopathsubscription);
      this.subscribe(gobuildsubscription);
      this.subscribe(gocoversubscription);
      this.on('dispatch-complete', (function(_this) {
        return function(editor) {
          return _this.displayMessages(editor);
        };
      })(this));
      this.subscribeToAtomEvents();
      this.detect();
    }

    Dispatch.prototype.destroy = function() {
      var _ref2;
      this.destroyItems();
      this.unsubscribe();
      this.resetPanel();
      if ((_ref2 = this.messagepanel) != null) {
        _ref2.remove();
      }
      this.messagepanel = null;
      this.gocover.destroy();
      this.gobuild.destroy();
      this.golint.destroy();
      this.govet.destroy();
      this.gopath.destroy();
      this.gofmt.destroy();
      this.gocover = null;
      this.gobuild = null;
      this.golint = null;
      this.govet = null;
      this.gopath = null;
      this.gofmt = null;
      this.ready = false;
      this.activated = false;
      return this.emit('destroyed');
    };

    Dispatch.prototype.addItem = function(item) {
      if (__indexOf.call(this.items, item) >= 0) {
        return;
      }
      if (typeof item.on === 'function') {
        this.subscribe(item, 'destroyed', (function(_this) {
          return function() {
            return _this.removeItem(item);
          };
        })(this));
      }
      return this.items.splice(0, 0, item);
    };

    Dispatch.prototype.removeItem = function(item) {
      var index;
      index = this.items.indexOf(item);
      if (index === -1) {
        return;
      }
      if (typeof item.on === 'function') {
        this.unsubscribe(item);
      }
      return this.items.splice(index, 1);
    };

    Dispatch.prototype.destroyItems = function() {
      var item, _i, _len, _ref2, _results;
      if (!(this.items && _.size(this.items) > 0)) {
        return;
      }
      _ref2 = this.items;
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        item = _ref2[_i];
        _results.push(item.dispose());
      }
      return _results;
    };

    Dispatch.prototype.subscribeToAtomEvents = function() {
      this.addItem(atom.workspace.observeTextEditors((function(_this) {
        return function(editor) {
          return _this.handleEvents(editor);
        };
      })(this)));
      this.addItem(atom.workspace.onDidChangeActivePaneItem((function(_this) {
        return function(event) {
          return _this.resetPanel();
        };
      })(this)));
      this.addItem(atom.config.observe('go-plus.getMissingTools', (function(_this) {
        return function() {
          if ((atom.config.get('go-plus.getMissingTools') != null) && atom.config.get('go-plus.getMissingTools') && _this.ready) {
            return _this.gettools(false);
          }
        };
      })(this)));
      this.addItem(atom.config.observe('go-plus.formatTool', (function(_this) {
        return function() {
          if (_this.ready) {
            return _this.displayGoInfo(true);
          }
        };
      })(this)));
      this.addItem(atom.config.observe('go-plus.goPath', (function(_this) {
        return function() {
          if (_this.ready) {
            return _this.displayGoInfo(true);
          }
        };
      })(this)));
      this.addItem(atom.config.observe('go-plus.environmentOverridesConfiguration', (function(_this) {
        return function() {
          if (_this.ready) {
            return _this.displayGoInfo(true);
          }
        };
      })(this)));
      this.addItem(atom.config.observe('go-plus.goInstallation', (function(_this) {
        return function() {
          if (_this.ready) {
            return _this.detect();
          }
        };
      })(this)));
      atom.commands.add('atom-workspace', {
        'golang:goinfo': (function(_this) {
          return function() {
            if (_this.ready && _this.activated) {
              return _this.displayGoInfo(true);
            }
          };
        })(this)
      });
      atom.commands.add('atom-workspace', {
        'golang:getmissingtools': (function(_this) {
          return function() {
            if (_this.activated) {
              return _this.gettools(false);
            }
          };
        })(this)
      });
      atom.commands.add('atom-workspace', {
        'golang:updatetools': (function(_this) {
          return function() {
            if (_this.activated) {
              return _this.gettools(true);
            }
          };
        })(this)
      });
      return this.activated = true;
    };

    Dispatch.prototype.handleEvents = function(editor) {
      var buffer, destroyedsubscription, modifiedsubscription, savedsubscription;
      buffer = editor != null ? editor.getBuffer() : void 0;
      if (buffer == null) {
        return;
      }
      this.updateGutter(editor, this.messages);
      modifiedsubscription = buffer.onDidStopChanging((function(_this) {
        return function() {
          if (!_this.activated) {
            return;
          }
          return _this.handleBufferChanged(editor);
        };
      })(this));
      savedsubscription = buffer.onDidSave((function(_this) {
        return function() {
          if (!_this.activated) {
            return;
          }
          if (!!_this.dispatching) {
            return;
          }
          return _this.handleBufferSave(editor, true);
        };
      })(this));
      destroyedsubscription = buffer.onDidDestroy((function(_this) {
        return function() {
          if (savedsubscription != null) {
            savedsubscription.dispose();
          }
          if (savedsubscription != null) {
            _this.removeItem(savedsubscription);
          }
          if (modifiedsubscription != null) {
            modifiedsubscription.dispose();
          }
          if (modifiedsubscription != null) {
            return _this.removeItem(modifiedsubscription);
          }
        };
      })(this));
      this.addItem(modifiedsubscription);
      this.addItem(savedsubscription);
      return this.addItem(destroyedsubscription);
    };

    Dispatch.prototype.detect = function() {
      this.ready = false;
      return this.goexecutable.detect().then((function(_this) {
        return function(gos) {
          if ((atom.config.get('go-plus.getMissingTools') != null) && atom.config.get('go-plus.getMissingTools')) {
            _this.gettools(false);
          }
          _this.displayGoInfo(false);
          return _this.emitReady();
        };
      })(this));
    };

    Dispatch.prototype.resetAndDisplayMessages = function(editor, msgs) {
      if (!this.isValidEditor(editor)) {
        return;
      }
      this.resetState(editor);
      this.collectMessages(msgs);
      return this.displayMessages(editor);
    };

    Dispatch.prototype.displayMessages = function(editor) {
      this.updatePane(editor, this.messages);
      this.updateGutter(editor, this.messages);
      this.dispatching = false;
      return this.emit('display-complete');
    };

    Dispatch.prototype.emitReady = function() {
      this.ready = true;
      return this.emit('ready');
    };

    Dispatch.prototype.displayGoInfo = function(force) {
      var editor, go, gopath, thepath, _ref2, _ref3, _ref4;
      editor = (_ref2 = atom.workspace) != null ? _ref2.getActiveTextEditor() : void 0;
      if (!force) {
        if (!this.isValidEditor(editor)) {
          return;
        }
      }
      this.resetPanel();
      go = this.goexecutable.current();
      if ((go != null) && (go.executable != null) && go.executable.trim() !== '') {
        this.messagepanel.add(new PlainMessageView({
          raw: true,
          message: '<b>Go:</b> ' + go.name + ' (@' + go.executable + ')',
          className: 'text-info'
        }));
        gopath = go.buildgopath();
        if ((gopath != null) && gopath.trim() !== '') {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>GOPATH:</b> ' + gopath,
            className: 'text-highlight'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>GOPATH:</b> Not Set (You Should Try Launching Atom Using The Shell Commands...)',
            className: 'text-error'
          }));
        }
        if ((go.cover() != null) && go.cover() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Cover Tool:</b> ' + go.cover(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Cover Tool:</b> Not Found (Is Mercurial Installed?)',
            className: 'text-error'
          }));
        }
        if ((go.vet() != null) && go.vet() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Vet Tool:</b> ' + go.vet(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Vet Tool:</b> Not Found (Is Mercurial Installed?)',
            className: 'text-error'
          }));
        }
        if ((go.format() != null) && go.format() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Format Tool:</b> ' + go.format(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Format Tool (' + atom.config.get('go-plus.formatTool') + '):</b> Not Found',
            className: 'text-error'
          }));
        }
        if ((go.golint() != null) && go.golint() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Lint Tool:</b> ' + go.golint(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Lint Tool:</b> Not Found',
            className: 'text-error'
          }));
        }
        if ((go.gocode() != null) && go.gocode() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Gocode Tool:</b> ' + go.gocode(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Gocode Tool:</b> Not Found',
            className: 'text-error'
          }));
        }
        if (_.contains(atom.packages.getAvailablePackageNames(), 'autocomplete-plus')) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Gocode Status:</b> Enabled',
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Gocode Status:</b> Not Enabled (autocomplete-plus needs to be installed and active; install it and restart)',
            className: 'text-warning'
          }));
        }
        if ((go.oracle() != null) && go.oracle() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Oracle Tool: ' + go.oracle(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Oracle Tool: Not Found',
            className: 'text-error'
          }));
        }
        if ((go.git() != null) && go.git() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Git:</b> ' + go.git(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Git:</b> Not Found',
            className: 'text-warning'
          }));
        }
        if ((go.hg() != null) && go.hg() !== false) {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Mercurial:</b> ' + go.hg(),
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>Mercurial:</b> Not Found',
            className: 'text-warning'
          }));
        }
        thepath = os.platform() === 'win32' ? (_ref3 = this.env()) != null ? _ref3.Path : void 0 : (_ref4 = this.env()) != null ? _ref4.PATH : void 0;
        if ((thepath != null) && thepath.trim() !== '') {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>PATH:</b> ' + thepath,
            className: 'text-subtle'
          }));
        } else {
          this.messagepanel.add(new PlainMessageView({
            raw: true,
            message: '<b>PATH:</b> Not Set',
            className: 'text-error'
          }));
        }
      } else {
        this.messagepanel.add(new PlainMessageView({
          raw: true,
          message: 'No Go Installations Were Found',
          className: 'text-error'
        }));
      }
      this.messagepanel.add(new PlainMessageView({
        raw: true,
        message: '<b>Atom:</b> ' + atom.appVersion + ' (' + os.platform() + ' ' + os.arch() + ' ' + os.release() + ')',
        className: 'text-info'
      }));
      return this.messagepanel.attach();
    };

    Dispatch.prototype.collectMessages = function(messages) {
      if ((messages != null) && _.size(messages) > 0) {
        messages = _.flatten(messages);
      }
      messages = _.filter(messages, function(element, index, list) {
        return element != null;
      });
      if (messages == null) {
        return;
      }
      messages = _.filter(messages, function(message) {
        return message != null;
      });
      this.messages = _.union(this.messages, messages);
      this.messages = _.uniq(this.messages, function(element, index, list) {
        return (element != null ? element.line : void 0) + ':' + (element != null ? element.column : void 0) + ':' + (element != null ? element.msg : void 0);
      });
      return this.emit('messages-collected', _.size(this.messages));
    };

    Dispatch.prototype.triggerPipeline = function(editor, saving) {
      var go;
      this.dispatching = true;
      go = this.goexecutable.current();
      if (!((go != null) && (go.executable != null) && go.executable.trim() !== '')) {
        this.displayGoInfo(false);
        this.dispatching = false;
        return;
      }
      async.series([
        (function(_this) {
          return function(callback) {
            return _this.gofmt.formatBuffer(editor, saving, callback);
          };
        })(this)
      ], (function(_this) {
        return function(err, modifymessages) {
          _this.collectMessages(modifymessages);
          return async.parallel([
            function(callback) {
              return _this.govet.checkBuffer(editor, saving, callback);
            }, function(callback) {
              return _this.golint.checkBuffer(editor, saving, callback);
            }, function(callback) {
              return _this.gopath.check(editor, saving, callback);
            }, function(callback) {
              return _this.gobuild.checkBuffer(editor, saving, callback);
            }
          ], function(err, checkmessages) {
            _this.collectMessages(checkmessages);
            return _this.emit('dispatch-complete', editor);
          });
        };
      })(this));
      return async.series([
        (function(_this) {
          return function(callback) {
            return _this.gocover.runCoverage(editor, saving, callback);
          };
        })(this)
      ], (function(_this) {
        return function(err, modifymessages) {
          return _this.emit('coverage-complete');
        };
      })(this));
    };

    Dispatch.prototype.handleBufferSave = function(editor, saving) {
      if (!(this.ready && this.activated)) {
        return;
      }
      if (!this.isValidEditor(editor)) {
        return;
      }
      this.resetState(editor);
      return this.triggerPipeline(editor, saving);
    };

    Dispatch.prototype.handleBufferChanged = function(editor) {
      if (!(this.ready && this.activated)) {
        return;
      }
      if (!this.isValidEditor(editor)) {

      }
    };

    Dispatch.prototype.resetState = function(editor) {
      this.messages = [];
      this.resetGutter(editor);
      return this.resetPanel();
    };

    Dispatch.prototype.resetGutter = function(editor) {
      var marker, markers, _i, _len, _ref2, _results;
      if (!this.isValidEditor(editor)) {
        return;
      }
      markers = editor != null ? (_ref2 = editor.getBuffer()) != null ? _ref2.findMarkers({
        "class": 'go-plus'
      }) : void 0 : void 0;
      if (!((markers != null) && _.size(markers) > 0)) {
        return;
      }
      _results = [];
      for (_i = 0, _len = markers.length; _i < _len; _i++) {
        marker = markers[_i];
        _results.push(marker.destroy());
      }
      return _results;
    };

    Dispatch.prototype.updateGutter = function(editor, messages) {
      var buffer, error, marker, message, skip, _i, _len, _results;
      this.resetGutter(editor);
      if (!this.isValidEditor(editor)) {
        return;
      }
      if (!((messages != null) && messages.length > 0)) {
        return;
      }
      buffer = editor != null ? editor.getBuffer() : void 0;
      if (buffer == null) {
        return;
      }
      _results = [];
      for (_i = 0, _len = messages.length; _i < _len; _i++) {
        message = messages[_i];
        skip = false;
        if (((message != null ? message.file : void 0) != null) && message.file !== '') {
          skip = message.file !== (buffer != null ? buffer.getPath() : void 0);
        }
        if (!skip) {
          if (((message != null ? message.line : void 0) != null) && message.line !== false && message.line >= 0) {
            try {
              marker = buffer != null ? buffer.markPosition([message.line - 1, 0], {
                "class": 'go-plus',
                invalidate: 'touch'
              }) : void 0;
              _results.push(editor != null ? editor.decorateMarker(marker, {
                type: 'line-number',
                "class": 'goplus-' + message.type
              }) : void 0);
            } catch (_error) {
              error = _error;
              _results.push(console.log(error));
            }
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Dispatch.prototype.resetPanel = function() {
      var _ref2, _ref3;
      if ((_ref2 = this.messagepanel) != null) {
        _ref2.close();
      }
      return (_ref3 = this.messagepanel) != null ? _ref3.clear() : void 0;
    };

    Dispatch.prototype.updatePane = function(editor, messages) {
      var className, column, file, line, message, sortedMessages, _i, _len;
      this.resetPanel;
      if (messages == null) {
        return;
      }
      if (messages.length <= 0 && atom.config.get('go-plus.showPanelWhenNoIssuesExist')) {
        this.messagepanel.add(new PlainMessageView({
          message: 'No Issues',
          className: 'text-success'
        }));
        this.messagepanel.attach();
        return;
      }
      if (!(messages.length > 0)) {
        return;
      }
      if (!atom.config.get('go-plus.showPanel')) {
        return;
      }
      sortedMessages = _.sortBy(this.messages, function(element, index, list) {
        return parseInt(element.line, 10);
      });
      for (_i = 0, _len = sortedMessages.length; _i < _len; _i++) {
        message = sortedMessages[_i];
        className = (function() {
          switch (message.type) {
            case 'error':
              return 'text-error';
            case 'warning':
              return 'text-warning';
            default:
              return 'text-info';
          }
        })();
        file = (message.file != null) && message.file.trim() !== '' ? message.file : null;
        if ((file != null) && file !== '' && ((typeof atom !== "undefined" && atom !== null ? atom.project : void 0) != null)) {
          file = atom.project.relativize(file);
        }
        column = (message.column != null) && message.column !== '' && message.column !== false ? message.column : null;
        line = (message.line != null) && message.line !== '' && message.line !== false ? message.line : null;
        if (file === null && column === null && line === null) {
          this.messagepanel.add(new PlainMessageView({
            message: message.msg,
            className: className
          }));
        } else {
          this.messagepanel.add(new LineMessageView({
            file: file,
            line: line,
            character: column,
            message: message.msg,
            className: className
          }));
        }
      }
      if ((typeof atom !== "undefined" && atom !== null ? atom.workspace : void 0) != null) {
        return this.messagepanel.attach();
      }
    };

    Dispatch.prototype.isValidEditor = function(editor) {
      var _ref2;
      return (editor != null ? (_ref2 = editor.getGrammar()) != null ? _ref2.scopeName : void 0 : void 0) === 'source.go';
    };

    Dispatch.prototype.env = function() {
      return this.environment.Clone();
    };

    Dispatch.prototype.gettools = function(updateExistingTools) {
      var thego;
      updateExistingTools = (updateExistingTools != null) && updateExistingTools;
      this.ready = false;
      thego = this.goexecutable.current();
      if (!((thego != null) && (thego.executable != null) && thego.executable.trim() !== '')) {
        this.displayGoInfo(false);
        return;
      }
      if (!(thego.toolsAreMissing() || updateExistingTools)) {
        this.emitReady();
        return;
      }
      this.resetPanel();
      this.messagepanel.add(new PlainMessageView({
        message: 'Running `go get -u` to get required tools...',
        className: 'text-success'
      }));
      this.messagepanel.attach();
      this.goexecutable.on('gettools-complete', (function(_this) {
        return function() {
          _this.displayGoInfo(true);
          return _this.emitReady();
        };
      })(this));
      return this.goexecutable.gettools(thego, updateExistingTools);
    };

    return Dispatch;

  })();

}).call(this);
