(function() {
  var Emitter, Golint, Subscriber, path, spawn, _, _ref;

  spawn = require('child_process').spawn;

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  _ = require('underscore-plus');

  path = require('path');

  module.exports = Golint = (function() {
    Subscriber.includeInto(Golint);

    Emitter.includeInto(Golint);

    function Golint(dispatch) {
      atom.commands.add('atom-workspace', {
        'golang:golint': (function(_this) {
          return function() {
            return _this.checkCurrentBuffer();
          };
        })(this)
      });
      this.dispatch = dispatch;
      this.name = 'lint';
    }

    Golint.prototype.destroy = function() {
      this.unsubscribe();
      return this.dispatch = null;
    };

    Golint.prototype.reset = function(editor) {
      return this.emit('reset', editor);
    };

    Golint.prototype.checkCurrentBuffer = function() {
      var done, editor, _ref1;
      editor = typeof atom !== "undefined" && atom !== null ? (_ref1 = atom.workspace) != null ? _ref1.getActiveTextEditor() : void 0 : void 0;
      if (!this.dispatch.isValidEditor(editor)) {
        return;
      }
      this.reset(editor);
      done = (function(_this) {
        return function(err, messages) {
          return _this.dispatch.resetAndDisplayMessages(editor, messages);
        };
      })(this);
      return this.checkBuffer(editor, false, done);
    };

    Golint.prototype.checkBuffer = function(editor, saving, callback) {
      var args, buffer, cmd, configArgs, cwd, done, env, go, gopath, message;
      if (callback == null) {
        callback = function() {};
      }
      if (!this.dispatch.isValidEditor(editor)) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (saving && !atom.config.get('go-plus.lintOnSave')) {
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
      go = this.dispatch.goexecutable.current();
      gopath = go.buildgopath();
      if ((gopath == null) || gopath === '') {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      env = this.dispatch.env();
      env['GOPATH'] = gopath;
      cwd = path.dirname(buffer.getPath());
      args = [buffer.getPath()];
      configArgs = this.dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.golintArgs'));
      if ((configArgs != null) && _.size(configArgs) > 0) {
        args = _.union(configArgs, args);
      }
      cmd = this.dispatch.goexecutable.current().golint();
      if (cmd === false) {
        message = {
          line: false,
          column: false,
          msg: 'Lint Tool Missing',
          type: 'error',
          source: this.name
        };
        callback(null, [message]);
        return;
      }
      done = (function(_this) {
        return function(exitcode, stdout, stderr, messages) {
          if ((stderr != null) && stderr.trim() !== '') {
            console.log(_this.name + ' - stderr: ' + stderr);
          }
          if ((stdout != null) && stdout.trim() !== '') {
            messages = _this.mapMessages(stdout, cwd);
          }
          _this.emit(_this.name + '-complete', editor, saving);
          return callback(null, messages);
        };
      })(this);
      return this.dispatch.executor.exec(cmd, cwd, env, done, args);
    };

    Golint.prototype.mapMessages = function(data, cwd) {
      var extract, match, messages, pattern;
      pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img;
      messages = [];
      extract = function(matchLine) {
        var file, message;
        if (matchLine == null) {
          return;
        }
        file = (matchLine[1] != null) && matchLine[1] !== '' ? matchLine[1] : null;
        message = (function() {
          switch (false) {
            case matchLine[4] == null:
              return {
                file: file,
                line: matchLine[2],
                column: matchLine[4],
                msg: matchLine[5],
                type: 'warning',
                source: 'lint'
              };
            default:
              return {
                file: file,
                line: matchLine[2],
                column: false,
                msg: matchLine[5],
                type: 'warning',
                source: 'lint'
              };
          }
        })();
        return messages.push(message);
      };
      while (true) {
        match = pattern.exec(data);
        extract(match);
        if (match == null) {
          break;
        }
      }
      return messages;
    };

    return Golint;

  })();

}).call(this);
