(function() {
  var Emitter, Gofmt, Subscriber, path, spawn, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  spawn = require('child_process').spawn;

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  _ = require('underscore-plus');

  path = require('path');

  module.exports = Gofmt = (function() {
    Subscriber.includeInto(Gofmt);

    Emitter.includeInto(Gofmt);

    function Gofmt(dispatch) {
      this.mapMessages = __bind(this.mapMessages, this);
      atom.commands.add('atom-workspace', {
        'golang:gofmt': (function(_this) {
          return function() {
            return _this.formatCurrentBuffer();
          };
        })(this)
      });
      this.dispatch = dispatch;
      this.name = 'fmt';
    }

    Gofmt.prototype.destroy = function() {
      this.unsubscribe();
      return this.dispatch = null;
    };

    Gofmt.prototype.reset = function(editor) {
      return this.emit('reset', editor);
    };

    Gofmt.prototype.formatCurrentBuffer = function() {
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
      return this.formatBuffer(editor, false, done);
    };

    Gofmt.prototype.formatBuffer = function(editor, saving, callback) {
      var args, buffer, cmd, configArgs, cwd, env, go, gopath, message, messages, stderr, stdout, _ref1;
      if (callback == null) {
        callback = function() {};
      }
      if (!this.dispatch.isValidEditor(editor)) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (saving && !atom.config.get('go-plus.formatOnSave')) {
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
      cwd = path.dirname(buffer.getPath());
      args = ['-w'];
      configArgs = this.dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.formatArgs'));
      if ((configArgs != null) && _.size(configArgs) > 0) {
        args = _.union(args, configArgs);
      }
      args = _.union(args, [buffer.getPath()]);
      go = this.dispatch.goexecutable.current();
      if (go == null) {
        callback(null);
        this.dispatch.displayGoInfo(false);
        return;
      }
      gopath = go.buildgopath();
      if ((gopath == null) || gopath === '') {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      env = this.dispatch.env();
      env['GOPATH'] = gopath;
      cmd = go.format();
      if (cmd === false) {
        message = {
          line: false,
          column: false,
          msg: 'Format Tool Missing',
          type: 'error',
          source: this.name
        };
        callback(null, [message]);
        return;
      }
      _ref1 = this.dispatch.executor.execSync(cmd, cwd, env, args), stdout = _ref1.stdout, stderr = _ref1.stderr, messages = _ref1.messages;
      if ((stdout != null) && stdout.trim() !== '') {
        console.log(this.name + ' - stdout: ' + stdout);
      }
      if ((stderr != null) && stderr.trim() !== '') {
        messages = this.mapMessages(stderr, cwd);
      }
      this.emit(this.name + '-complete', editor, saving);
      return callback(null, messages);
    };

    Gofmt.prototype.mapMessages = function(data, cwd) {
      var extract, match, messages, pattern;
      pattern = /^(.*?):(\d*?):((\d*?):)?\s(.*)$/img;
      messages = [];
      if (!((data != null) && data !== '')) {
        return messages;
      }
      extract = (function(_this) {
        return function(matchLine) {
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
                  type: 'error',
                  source: this.name
                };
              default:
                return {
                  file: file,
                  line: matchLine[2],
                  column: false,
                  msg: matchLine[5],
                  type: 'error',
                  source: this.name
                };
            }
          }).call(_this);
          return messages.push(message);
        };
      })(this);
      while (true) {
        match = pattern.exec(data);
        extract(match);
        if (match == null) {
          break;
        }
      }
      return messages;
    };

    return Gofmt;

  })();

}).call(this);
