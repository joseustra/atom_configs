(function() {
  var Emitter, Gocover, GocoverParser, Subscriber, areas, fs, path, spawn, temp, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  spawn = require('child_process').spawn;

  temp = require('temp');

  path = require('path');

  fs = require('fs-plus');

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  GocoverParser = require('./gocover/gocover-parser');

  _ = require('underscore-plus');

  areas = [];

  module.exports = Gocover = (function() {
    Subscriber.includeInto(Gocover);

    Emitter.includeInto(Gocover);

    function Gocover(dispatch) {
      this.runCoverage = __bind(this.runCoverage, this);
      this.runCoverageForCurrentEditor = __bind(this.runCoverageForCurrentEditor, this);
      this.createCoverageFile = __bind(this.createCoverageFile, this);
      this.removeCoverageFile = __bind(this.removeCoverageFile, this);
      this.addMarkersToEditor = __bind(this.addMarkersToEditor, this);
      this.clearMarkersFromEditors = __bind(this.clearMarkersFromEditors, this);
      this.addMarkersToEditors = __bind(this.addMarkersToEditors, this);
      this.dispatch = dispatch;
      this.name = 'gocover';
      this.covering = false;
      this.parser = new GocoverParser();
      this.coverageFile = false;
      this.ranges = false;
      atom.commands.add('atom-workspace', {
        'golang:gocover': (function(_this) {
          return function() {
            return _this.runCoverageForCurrentEditor();
          };
        })(this)
      });
      atom.commands.add('atom-workspace', {
        'golang:cleargocover': (function(_this) {
          return function() {
            return _this.clearMarkersFromEditors();
          };
        })(this)
      });
      atom.workspace.observeTextEditors((function(_this) {
        return function(editor) {
          return _this.addMarkersToEditor(editor);
        };
      })(this));
    }

    Gocover.prototype.destroy = function() {
      this.unsubscribe();
      this.dispatch = null;
      this.parser = null;
      return this.removeCoverageFile();
    };

    Gocover.prototype.addMarkersToEditors = function() {
      var editor, editors, _i, _len, _results;
      editors = atom.workspace.getTextEditors();
      _results = [];
      for (_i = 0, _len = editors.length; _i < _len; _i++) {
        editor = editors[_i];
        _results.push(this.addMarkersToEditor(editor));
      }
      return _results;
    };

    Gocover.prototype.clearMarkersFromEditors = function() {
      var editor, editors, _i, _len, _results;
      this.removeCoverageFile();
      editors = atom.workspace.getTextEditors();
      _results = [];
      for (_i = 0, _len = editors.length; _i < _len; _i++) {
        editor = editors[_i];
        _results.push(this.clearMarkers(editor));
      }
      return _results;
    };

    Gocover.prototype.addMarkersToEditor = function(editor) {
      var buffer, clazz, editorRanges, error, file, marker, range, _i, _len, _ref1, _results;
      if ((editor != null ? (_ref1 = editor.getGrammar()) != null ? _ref1.scopeName : void 0 : void 0) !== 'source.go') {
        return;
      }
      file = editor != null ? editor.getPath() : void 0;
      buffer = editor != null ? editor.getBuffer() : void 0;
      if (!((file != null) && (buffer != null))) {
        return;
      }
      this.clearMarkers(editor);
      if (!((this.ranges != null) && this.ranges && _.size(this.ranges) > 0)) {
        return;
      }
      editorRanges = _.filter(this.ranges, function(r) {
        return _.endsWith(file, r.file);
      });
      try {
        _results = [];
        for (_i = 0, _len = editorRanges.length; _i < _len; _i++) {
          range = editorRanges[_i];
          marker = buffer.markRange(range.range, {
            "class": 'gocover',
            gocovercount: range.count,
            invalidate: 'touch'
          });
          clazz = range.count > 0 ? 'covered' : 'uncovered';
          _results.push(editor.decorateMarker(marker, {
            type: 'highlight',
            "class": clazz,
            onlyNonEmpty: true
          }));
        }
        return _results;
      } catch (_error) {
        error = _error;
        return console.log(error);
      }
    };

    Gocover.prototype.clearMarkers = function(editor) {
      var error, marker, markers, _i, _len, _ref1, _ref2, _results;
      if ((editor != null ? (_ref1 = editor.getGrammar()) != null ? _ref1.scopeName : void 0 : void 0) !== 'source.go') {
        return;
      }
      try {
        markers = editor != null ? (_ref2 = editor.getBuffer()) != null ? _ref2.findMarkers({
          "class": 'gocover'
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
      } catch (_error) {
        error = _error;
        return console.log(error);
      }
    };

    Gocover.prototype.reset = function(editor) {
      return this.emit('reset', editor);
    };

    Gocover.prototype.removeCoverageFile = function() {
      this.ranges = [];
      if (this.coverageFile) {
        try {
          return fs.unlinkSync(this.coverageFile);
        } catch (_error) {

        }
      }
    };

    Gocover.prototype.createCoverageFile = function() {
      var tempDir;
      this.removeCoverageFile();
      tempDir = temp.mkdirSync();
      return this.coverageFile = path.join(tempDir, 'coverage.out');
    };

    Gocover.prototype.runCoverageForCurrentEditor = function() {
      var editor, _ref1;
      editor = typeof atom !== "undefined" && atom !== null ? (_ref1 = atom.workspace) != null ? _ref1.getActiveTextEditor() : void 0 : void 0;
      if (editor == null) {
        return;
      }
      this.reset(editor);
      return this.runCoverage(editor, false);
    };

    Gocover.prototype.runCoverage = function(editor, saving, callback) {
      var args, buffer, cmd, cover, cwd, done, env, go, gopath, message, re, tempFile;
      if (callback == null) {
        callback = function() {};
      }
      if (!this.dispatch.isValidEditor(editor)) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (saving && !atom.config.get('go-plus.runCoverageOnSave')) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      buffer = editor != null ? editor.getBuffer() : void 0;
      if (buffer == null) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (this.covering) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      this.covering = true;
      this.clearMarkersFromEditors();
      tempFile = this.createCoverageFile();
      go = this.dispatch.goexecutable.current();
      gopath = go.buildgopath();
      if ((gopath == null) || gopath === '') {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      env = this.dispatch.env();
      env['GOPATH'] = gopath;
      re = new RegExp(buffer.getBaseName() + '$');
      go = this.dispatch.goexecutable.current();
      cover = go.cover();
      if (cover === false) {
        message = {
          line: false,
          column: false,
          msg: 'Cover Tool Missing',
          type: 'error',
          source: this.name
        };
        this.covering = false;
        callback(null, [message]);
        return;
      }
      cwd = buffer.getPath().replace(re, '');
      cmd = this.dispatch.goexecutable.current().executable;
      args = ['test', "-coverprofile=" + tempFile];
      done = (function(_this) {
        return function(exitcode, stdout, stderr, messages) {
          if (exitcode === 0) {
            _this.ranges = _this.parser.ranges(tempFile);
            _this.addMarkersToEditors();
          }
          _this.covering = false;
          _this.emit(_this.name + '-complete', editor, saving);
          return callback(null, messages);
        };
      })(this);
      return this.dispatch.executor.exec(cmd, cwd, env, done, args);
    };

    return Gocover;

  })();

}).call(this);
