(function() {
  var Emitter, Gobuild, Subscriber, fs, glob, path, spawn, temp, _, _ref;

  spawn = require('child_process').spawn;

  fs = require('fs-plus');

  glob = require('glob');

  path = require('path');

  temp = require('temp');

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  _ = require('underscore-plus');

  module.exports = Gobuild = (function() {
    Subscriber.includeInto(Gobuild);

    Emitter.includeInto(Gobuild);

    function Gobuild(dispatch) {
      this.dispatch = dispatch;
      atom.commands.add('atom-workspace', {
        'golang:gobuild': (function(_this) {
          return function() {
            return _this.checkCurrentBuffer();
          };
        })(this)
      });
      this.name = 'syntaxcheck';
    }

    Gobuild.prototype.destroy = function() {
      this.unsubscribe();
      return this.dispatch = null;
    };

    Gobuild.prototype.reset = function(editor) {
      return this.emit('reset', editor);
    };

    Gobuild.prototype.checkCurrentBuffer = function() {
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

    Gobuild.prototype.checkBuffer = function(editor, saving, callback) {
      var args, buffer, cmd, cwd, done, env, fileDir, files, go, gopath, match, output, outputPath, pre, splitgopath, testPackage;
      if (callback == null) {
        callback = function() {};
      }
      if (!this.dispatch.isValidEditor(editor)) {
        this.emit(this.name + '-complete', editor, saving);
        callback(null);
        return;
      }
      if (saving && !atom.config.get('go-plus.syntaxCheckOnSave')) {
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
      splitgopath = go.splitgopath();
      env = this.dispatch.env();
      env['GOPATH'] = gopath;
      cwd = path.dirname(buffer.getPath());
      output = '';
      outputPath = '';
      files = [];
      fileDir = path.dirname(buffer.getPath());
      args = [];
      this.tempDir = temp.mkdirSync();
      if (buffer.getPath().match(/_test.go$/i)) {
        pre = /^\w*package ([\d\w]+){1}\w*$/img;
        match = pre.exec(buffer.getText());
        testPackage = (match != null) && match.length > 0 ? match[1] : '';
        testPackage = testPackage.replace(/_test$/i, '');
        output = testPackage + '.test' + go.exe;
        outputPath = this.tempDir;
        args = ['test', '-copybinary', '-o', outputPath, '-c', '.'];
        files = fs.readdirSync(fileDir);
      } else {
        output = '.go-plus-syntax-check';
        outputPath = path.normalize(path.join(this.tempDir, output + go.exe));
        args = ['build', '-o', outputPath, '.'];
      }
      cmd = go.executable;
      done = (function(_this) {
        return function(exitcode, stdout, stderr, messages) {
          var file, pattern, updatedFiles, _i, _len;
          if ((stdout != null) && stdout.trim() !== '') {
            console.log(_this.name + ' - stdout: ' + stdout);
          }
          if ((stderr != null) && stderr !== '') {
            messages = _this.mapMessages(stderr, cwd, splitgopath);
          }
          if (fs.existsSync(outputPath)) {
            if (fs.lstatSync(outputPath).isDirectory()) {
              fs.rmdirSync(outputPath);
            } else {
              fs.unlinkSync(outputPath);
            }
          }
          updatedFiles = _.difference(fs.readdirSync(fileDir), files);
          if ((updatedFiles != null) && _.size(updatedFiles) > 0) {
            for (_i = 0, _len = updatedFiles.length; _i < _len; _i++) {
              file = updatedFiles[_i];
              if (_.endsWith(file, '.test' + go.exe)) {
                fs.unlinkSync(path.join(fileDir, file));
              }
            }
          }
          pattern = cwd + '/*' + output;
          glob(pattern, {
            mark: false
          }, function(er, files) {
            var _j, _len1, _results;
            _results = [];
            for (_j = 0, _len1 = files.length; _j < _len1; _j++) {
              file = files[_j];
              _results.push((function(file) {
                return fs.unlinkSync(file);
              })(file));
            }
            return _results;
          });
          _this.emit(_this.name + '-complete', editor, saving);
          return callback(null, messages);
        };
      })(this);
      return this.dispatch.executor.exec(cmd, cwd, env, done, args);
    };

    Gobuild.prototype.mapMessages = function(data, cwd, splitgopath) {
      var extract, match, messages, pattern, pkg;
      pattern = /^((#)\s(.*)?)|((.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?))/img;
      messages = [];
      pkg = '';
      extract = function(matchLine) {
        var file, message;
        if (matchLine == null) {
          return;
        }
        if ((matchLine[2] != null) && matchLine[2] === '#') {

        } else {
          file = null;
          if ((matchLine[5] != null) && matchLine[5] !== '') {
            if (path.isAbsolute(matchLine[5])) {
              file = matchLine[5];
            } else {
              file = path.join(cwd, matchLine[5]);
            }
          }
          message = (function() {
            switch (false) {
              case matchLine[8] == null:
                return {
                  file: file,
                  line: matchLine[6],
                  column: matchLine[8],
                  msg: matchLine[9],
                  type: 'error',
                  source: 'syntaxcheck'
                };
              default:
                return {
                  file: file,
                  line: matchLine[6],
                  column: false,
                  msg: matchLine[9],
                  type: 'error',
                  source: 'syntaxcheck'
                };
            }
          })();
          return messages.push(message);
        }
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

    Gobuild.prototype.absolutePathForPackage = function(pkg, splitgopath) {
      var combinedpath, gopath, _i, _len;
      for (_i = 0, _len = splitgopath.length; _i < _len; _i++) {
        gopath = splitgopath[_i];
        combinedpath = path.join(gopath, 'src', pkg);
        if (fs.existsSync(combinedpath)) {
          return fs.realpathSync(combinedpath);
        }
      }
      return null;
    };

    return Gobuild;

  })();

}).call(this);
