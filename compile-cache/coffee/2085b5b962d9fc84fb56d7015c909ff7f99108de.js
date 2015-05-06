(function() {
  var GocodeProvider, Range, path, _;

  Range = require('atom').Range;

  _ = require('underscore-plus');

  path = require('path');

  module.exports = GocodeProvider = (function() {
    GocodeProvider.prototype.selector = '.source.go';

    GocodeProvider.prototype.inclusionPriority = 1;

    GocodeProvider.prototype.excludeLowerPriority = true;

    function GocodeProvider() {
      this.disableForSelector = atom.config.get('go-plus.autocompleteBlacklist');
    }

    GocodeProvider.prototype.setDispatch = function(dispatch) {
      this.dispatch = dispatch;
      return this.funcRegex = /^(?:func[(]{1})([^\)]*)(?:[)]{1})(?:$|(?:\s)([^\(]*$)|(?: [(]{1})([^\)]*)(?:[)]{1}))/i;
    };

    GocodeProvider.prototype.getSuggestions = function(options) {
      return new Promise((function(_this) {
        return function(resolve) {
          var args, buffer, cmd, configArgs, cwd, done, env, go, gopath, index, message, offset, quotedRange, text, _ref;
          if (options == null) {
            return resolve();
          }
          if (!((_ref = _this.dispatch) != null ? _ref.isValidEditor(options.editor) : void 0)) {
            return resolve();
          }
          buffer = options.editor.getBuffer();
          if (buffer == null) {
            return resolve();
          }
          go = _this.dispatch.goexecutable.current();
          if (go == null) {
            return resolve();
          }
          gopath = go.buildgopath();
          if ((gopath == null) || gopath === '') {
            return resolve();
          }
          if (!options.bufferPosition) {
            return resolve();
          }
          index = buffer.characterIndexForPosition(options.bufferPosition);
          offset = 'c' + index.toString();
          text = options.editor.getText();
          if (text[index - 1] === ')' || text[index - 1] === ';') {
            return resolve();
          }
          quotedRange = options.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', options.bufferPosition);
          if (quotedRange) {
            return resolve();
          }
          env = _this.dispatch.env();
          env['GOPATH'] = gopath;
          cwd = path.dirname(buffer.getPath());
          args = ['-f=json', 'autocomplete', buffer.getPath(), offset];
          configArgs = _this.dispatch.splicersplitter.splitAndSquashToArray(' ', atom.config.get('go-plus.gocodeArgs'));
          if ((configArgs != null) && _.size(configArgs) > 0) {
            args = _.union(configArgs, args);
          }
          cmd = go.gocode();
          if (cmd === false) {
            message = {
              line: false,
              column: false,
              msg: 'gocode Tool Missing',
              type: 'error',
              source: _this.name
            };
            resolve();
            return;
          }
          done = function(exitcode, stdout, stderr, messages) {
            if ((stderr != null) && stderr.trim() !== '') {
              console.log(_this.name + ' - stderr: ' + stderr);
            }
            if ((stdout != null) && stdout.trim() !== '') {
              messages = _this.mapMessages(stdout, text, index);
            }
            if ((messages != null ? messages.length : void 0) < 1) {
              return resolve();
            }
            return resolve(messages);
          };
          return _this.dispatch.executor.exec(cmd, cwd, env, done, args, text);
        };
      })(this));
    };

    GocodeProvider.prototype.mapMessages = function(data, text, index) {
      var c, candidates, numPrefix, res, suggestion, suggestions, _i, _len;
      if (data == null) {
        return [];
      }
      res = JSON.parse(data);
      numPrefix = res[0];
      candidates = res[1];
      if (!candidates) {
        return [];
      }
      suggestions = [];
      for (_i = 0, _len = candidates.length; _i < _len; _i++) {
        c = candidates[_i];
        suggestion = {
          replacementPrefix: c.name.substring(0, numPrefix),
          rightLabel: c.type || c["class"],
          type: c["class"]
        };
        if (c["class"] === 'func') {
          suggestion.snippet = c.name + this.generateSignature(c.type);
          suggestion.rightLabel = c["class"];
        } else {
          suggestion.text = c.name;
        }
        suggestions.push(suggestion);
      }
      return suggestions;
    };

    GocodeProvider.prototype.generateSignature = function(type) {
      var arg, args, i, match, paramCount, parenCounter, scanned, signature, skipBlank, _i, _len;
      signature = "";
      skipBlank = false;
      parenCounter = 0;
      paramCount = 1;
      scanned = false;
      match = this.funcRegex.exec(type);
      if (!((match != null) && (match[0] != null))) {
        return '()';
      }
      if (!((match[1] != null) && match[1] !== '')) {
        return '()';
      }
      args = match[1].split(/, /);
      args = _.map(args, function(a) {
        if (!((a != null ? a.length : void 0) > 2)) {
          return a;
        }
        if (a.substring(a.length - 2, a.length) === '{}') {
          return a.substring(0, a.length - 2);
        }
        return a;
      });
      if (args.length === 1) {
        return '(${1:' + args[0] + '})';
      }
      i = 1;
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        if (i === 1) {
          signature = '(${' + i + ':' + arg + '}';
        } else {
          signature = signature + ', ${' + i + ':' + arg + '}';
        }
        i = i + 1;
      }
      signature = signature + ')';
      return signature;
    };

    GocodeProvider.prototype.dispose = function() {
      return this.dispatch = null;
    };

    return GocodeProvider;

  })();

}).call(this);
