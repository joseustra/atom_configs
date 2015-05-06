(function() {
  var CompositeDisposable, GocodeProvider, Range, path, _, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = require('atom'), Range = _ref.Range, CompositeDisposable = _ref.CompositeDisposable;

  _ = require('underscore-plus');

  path = require('path');

  module.exports = GocodeProvider = (function() {
    GocodeProvider.prototype.selector = '.source.go';

    GocodeProvider.prototype.inclusionPriority = 1;

    GocodeProvider.prototype.excludeLowerPriority = true;

    GocodeProvider.prototype.suppressForCharacters = [];

    function GocodeProvider() {
      this.subscriptions = new CompositeDisposable;
      this.disableForSelector = atom.config.get('go-plus.autocompleteBlacklist');
      this.subscriptions.add(atom.config.observe('go-plus.suppressAutocompleteActivationForCharacters', (function(_this) {
        return function(value) {
          _this.suppressForCharacters = _.map(value, function(c) {
            var char;
            char = (c != null ? c.trim() : void 0) || '';
            char = (function() {
              switch (false) {
                case char.toLowerCase() !== 'space':
                  return ' ';
                case char.toLowerCase() !== 'comma':
                  return ',';
              }
            })();
            return char;
          });
          return _this.suppressForCharacters = _.compact(_this.suppressForCharacters);
        };
      })(this)));
    }

    GocodeProvider.prototype.setDispatch = function(dispatch) {
      this.dispatch = dispatch;
      return this.funcRegex = /^(?:func[(]{1})([^\)]*)(?:[)]{1})(?:$|(?:\s)([^\(]*$)|(?: [(]{1})([^\)]*)(?:[)]{1}))/i;
    };

    GocodeProvider.prototype.getSuggestions = function(options) {
      return new Promise((function(_this) {
        return function(resolve) {
          var args, buffer, cmd, configArgs, cwd, done, env, go, gopath, index, message, offset, quotedRange, text, _ref1, _ref2;
          if (options == null) {
            return resolve();
          }
          if (!((_ref1 = _this.dispatch) != null ? _ref1.isValidEditor(options.editor) : void 0)) {
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
          if (_ref2 = text[index - 1], __indexOf.call(_this.suppressForCharacters, _ref2) >= 0) {
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
          leftLabel: c.type || c["class"],
          type: this.translateType(c["class"])
        };
        if (c["class"] === 'func') {
          suggestion = this.upgradeSuggestion(suggestion, c);
        } else {
          suggestion.text = c.name;
        }
        if (suggestion.type === 'package') {
          suggestion.iconHTML = '<i class="icon-package"></i>';
        }
        suggestions.push(suggestion);
      }
      return suggestions;
    };

    GocodeProvider.prototype.translateType = function(type) {
      switch (type) {
        case 'func':
          return 'function';
        case 'var':
          return 'variable';
        case 'const':
          return 'constant';
        case 'PANIC':
          return 'panic';
        default:
          return type;
      }
    };

    GocodeProvider.prototype.upgradeSuggestion = function(suggestion, c) {
      var match;
      if (!((c.type != null) && c.type !== '')) {
        return suggestion;
      }
      match = this.funcRegex.exec(c.type);
      if (!((match != null) && (match[0] != null))) {
        suggestion.snippet = c.name + '()';
        suggestion.leftLabel = '';
        return suggestion;
      }
      suggestion.leftLabel = match[2] || match[3] || '';
      suggestion.snippet = this.generateSnippet(c.name, match);
      return suggestion;
    };

    GocodeProvider.prototype.generateSnippet = function(name, match) {
      var arg, args, i, signature, _i, _len;
      signature = name;
      if (!((match[1] != null) && match[1] !== '')) {
        return signature + '()';
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
        return signature + '(${1:' + args[0] + '})';
      }
      i = 1;
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        if (i === 1) {
          signature = signature + '(${' + i + ':' + arg + '}';
        } else {
          signature = signature + ', ${' + i + ':' + arg + '}';
        }
        i = i + 1;
      }
      signature = signature + ')';
      return signature;
    };

    GocodeProvider.prototype.dispose = function() {
      var _ref1;
      if ((_ref1 = this.subscriptions) != null) {
        _ref1.dispose();
      }
      this.subscriptions = null;
      this.disableForSelector = null;
      this.suppressForCharacters = null;
      return this.dispatch = null;
    };

    return GocodeProvider;

  })();

}).call(this);
