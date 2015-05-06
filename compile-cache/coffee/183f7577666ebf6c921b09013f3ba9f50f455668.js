(function() {
  var Emitter, Gopath, Subscriber, fs, path, _, _ref;

  path = require('path');

  fs = require('fs-plus');

  _ = require('underscore-plus');

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  module.exports = Gopath = (function() {
    Subscriber.includeInto(Gopath);

    Emitter.includeInto(Gopath);

    function Gopath(dispatch) {
      this.dispatch = dispatch;
      this.name = 'gopath';
    }

    Gopath.prototype.destroy = function() {
      this.unsubscribe();
      return this.dispatch = null;
    };

    Gopath.prototype.reset = function(editor) {
      return this.emit('reset', editor);
    };

    Gopath.prototype.check = function(editor, saving, callback) {
      var filepath, found, gopath, gopaths, message, messages, _i, _j, _k, _len, _len1, _len2;
      if (callback == null) {
        callback = function() {};
      }
      if (!this.dispatch.isValidEditor(editor)) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (!atom.config.get('go-plus.syntaxCheckOnSave')) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      gopaths = this.dispatch.goexecutable.current().splitgopath();
      messages = [];
      if (!((gopaths != null) && _.size(gopaths) > 0)) {
        message = {
          line: false,
          column: false,
          msg: 'Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences',
          type: 'warning',
          source: 'gopath'
        };
        messages.push(message);
      }
      if ((messages != null) && _.size(messages) === 0) {
        for (_i = 0, _len = gopaths.length; _i < _len; _i++) {
          gopath = gopaths[_i];
          if (!fs.existsSync(gopath)) {
            message = {
              line: false,
              column: false,
              msg: 'Warning: GOPATH [' + gopath + '] does not exist',
              type: 'warning',
              source: 'gopath'
            };
            messages.push(message);
          }
        }
      }
      if ((messages != null) && _.size(messages) === 0) {
        for (_j = 0, _len1 = gopaths.length; _j < _len1; _j++) {
          gopath = gopaths[_j];
          if (!fs.existsSync(path.join(gopath, 'src'))) {
            message = {
              line: false,
              column: false,
              msg: 'Warning: GOPATH [' + gopath + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces',
              type: 'warning',
              source: 'gopath'
            };
            messages.push(message);
          }
        }
      }
      if ((messages != null) && _.size(messages) === 0) {
        filepath = editor != null ? editor.getPath() : void 0;
        if ((filepath != null) && filepath !== '' && fs.existsSync(filepath)) {
          filepath = fs.realpathSync(filepath);
          found = false;
          for (_k = 0, _len2 = gopaths.length; _k < _len2; _k++) {
            gopath = gopaths[_k];
            if (fs.existsSync(gopath)) {
              gopath = fs.realpathSync(gopath);
              if (filepath.toLowerCase().startsWith(path.join(gopath, 'src').toLowerCase())) {
                found = true;
              }
            }
          }
          if (!found) {
            message = {
              line: false,
              column: false,
              msg: 'Warning: File [' + filepath + '] does not reside within a "src" directory in your GOPATH [' + gopaths + '] - please review http://golang.org/doc/code.html#Workspaces',
              type: 'warning',
              source: 'gopath'
            };
            messages.push(message);
          }
        }
      }
      if ((messages != null) && _.size(messages) > 0) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null, messages);
        return;
      }
      this.emit(this.name + '-complete', editor, saving);
      callback(null);
    };

    return Gopath;

  })();

}).call(this);
