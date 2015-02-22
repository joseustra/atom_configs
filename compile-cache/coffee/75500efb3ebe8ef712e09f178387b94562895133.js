(function() {
  var GocodeProvider, path, _;

  _ = require('underscore-plus');

  path = require('path');

  module.exports = GocodeProvider = (function() {
    GocodeProvider.prototype.id = 'go-plus-gocodeprovider';

    GocodeProvider.prototype.selector = '.source.go';

    function GocodeProvider() {
      this.blacklist = atom.config.get('go-plus.autocompleteBlacklist');
      if (atom.config.get('go-plus.suppressBuiltinAutocompleteProvider')) {
        this.providerblacklist = {
          'autocomplete-plus-fuzzyprovider': '.source.go'
        };
      }
    }

    GocodeProvider.prototype.setDispatch = function(dispatch) {
      return this.dispatch = dispatch;
    };

    GocodeProvider.prototype.requestHandler = function(options) {
      return new Promise((function(_this) {
        return function(resolve) {
          var args, cmd, configArgs, cwd, done, env, go, gopath, index, message, offset, quotedRange, text, _ref;
          if (options == null) {
            return resolve();
          }
          if (!((_ref = _this.dispatch) != null ? _ref.isValidEditor(options.editor) : void 0)) {
            return resolve();
          }
          if (options.buffer == null) {
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
          if (!options.position) {
            return resolve();
          }
          index = options.buffer.characterIndexForPosition(options.position);
          offset = 'c' + index.toString();
          text = options.editor.getText();
          if (text[index - 1] === ')' || text[index - 1] === ';') {
            return resolve();
          }
          quotedRange = options.editor.displayBuffer.bufferRangeForScopeAtPosition('.string.quoted', options.position);
          if (quotedRange) {
            return resolve();
          }
          env = _this.dispatch.env();
          env['GOPATH'] = gopath;
          cwd = path.dirname(options.buffer.getPath());
          args = ['-f=json', 'autocomplete', options.buffer.getPath(), offset];
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
          prefix: c.name.substring(0, numPrefix),
          word: c.name,
          label: c.type || c["class"]
        };
        if (c["class"] === 'func' && text[index] !== '(') {
          suggestion.word += '(';
        }
        suggestions.push(suggestion);
      }
      return suggestions;
    };

    GocodeProvider.prototype.dispose = function() {
      return this.dispatch = null;
    };

    return GocodeProvider;

  })();

}).call(this);
