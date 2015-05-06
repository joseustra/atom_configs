(function() {
  var CompositeDisposable, Selector, SymbolProvider, SymbolStore, TextEditor, fuzzaldrin, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore-plus');

  fuzzaldrin = require('fuzzaldrin');

  _ref = require('atom'), TextEditor = _ref.TextEditor, CompositeDisposable = _ref.CompositeDisposable;

  Selector = require('selector-kit').Selector;

  SymbolStore = require('./symbol-store');

  module.exports = SymbolProvider = (function() {
    SymbolProvider.prototype.wordRegex = /\b\w*[a-zA-Z_-]+\w*\b/g;

    SymbolProvider.prototype.symbolStore = null;

    SymbolProvider.prototype.editor = null;

    SymbolProvider.prototype.buffer = null;

    SymbolProvider.prototype.changeUpdateDelay = 300;

    SymbolProvider.prototype.selector = '*';

    SymbolProvider.prototype.inclusionPriority = 0;

    SymbolProvider.prototype.suggestionPriority = 0;

    SymbolProvider.prototype.config = null;

    SymbolProvider.prototype.defaultConfig = {
      "class": {
        selector: '.class.name, .inherited-class, .instance.type',
        priority: 4
      },
      "function": {
        selector: '.function.name',
        priority: 3
      },
      variable: {
        selector: '.variable',
        priority: 2
      },
      '': {
        selector: '.source',
        priority: 1
      }
    };

    function SymbolProvider() {
      this.buildSymbolList = __bind(this.buildSymbolList, this);
      this.buildWordListOnNextTick = __bind(this.buildWordListOnNextTick, this);
      this.builtinCompletionsForCursorScope = __bind(this.builtinCompletionsForCursorScope, this);
      this.findSuggestionsForWord = __bind(this.findSuggestionsForWord, this);
      this.getSuggestions = __bind(this.getSuggestions, this);
      this.bufferDidChange = __bind(this.bufferDidChange, this);
      this.bufferWillChange = __bind(this.bufferWillChange, this);
      this.updateCurrentEditor = __bind(this.updateCurrentEditor, this);
      this.dispose = __bind(this.dispose, this);
      this.symbolStore = new SymbolStore(this.wordRegex);
      this.subscriptions = new CompositeDisposable;
      this.subscriptions.add(atom.workspace.observeActivePaneItem(this.updateCurrentEditor));
    }

    SymbolProvider.prototype.dispose = function() {
      var _ref1;
      if ((_ref1 = this.editorSubscriptions) != null) {
        _ref1.dispose();
      }
      return this.subscriptions.dispose();
    };

    SymbolProvider.prototype.updateCurrentEditor = function(currentPaneItem) {
      var _ref1;
      if (currentPaneItem == null) {
        return;
      }
      if (currentPaneItem === this.editor) {
        return;
      }
      if ((_ref1 = this.editorSubscriptions) != null) {
        _ref1.dispose();
      }
      this.editorSubscriptions = new CompositeDisposable;
      this.editor = null;
      this.buffer = null;
      if (!this.paneItemIsValid(currentPaneItem)) {
        return;
      }
      this.editor = currentPaneItem;
      this.buffer = this.editor.getBuffer();
      this.editorSubscriptions.add(this.editor.displayBuffer.onDidTokenize(this.buildWordListOnNextTick));
      this.editorSubscriptions.add(this.buffer.onDidSave(this.buildWordListOnNextTick));
      this.editorSubscriptions.add(this.buffer.onWillChange(this.bufferWillChange));
      this.editorSubscriptions.add(this.buffer.onDidChange(this.bufferDidChange));
      this.buildConfig();
      return this.buildWordListOnNextTick();
    };

    SymbolProvider.prototype.buildConfig = function() {
      var allConfig, config, options, type, _base, _base1, _base2, _i, _len;
      this.config = {};
      allConfig = this.settingsForScopeDescriptor(this.editor.getRootScopeDescriptor(), 'editor.completionSymbols');
      if (!allConfig.length) {
        allConfig.push(this.defaultConfig);
      }
      for (_i = 0, _len = allConfig.length; _i < _len; _i++) {
        config = allConfig[_i];
        for (type in config) {
          options = config[type];
          this.config[type] = _.clone(options);
          if (options.selector != null) {
            this.config[type].selectors = Selector.create(options.selector);
          }
          if ((_base = this.config[type]).selectors == null) {
            _base.selectors = [];
          }
          if ((_base1 = this.config[type]).priority == null) {
            _base1.priority = 1;
          }
          if ((_base2 = this.config[type]).wordRegex == null) {
            _base2.wordRegex = this.wordRegex;
          }
        }
      }
    };

    SymbolProvider.prototype.paneItemIsValid = function(paneItem) {
      if (paneItem == null) {
        return false;
      }
      return paneItem instanceof TextEditor;
    };

    SymbolProvider.prototype.bufferWillChange = function(_arg) {
      var oldRange;
      oldRange = _arg.oldRange;
      return this.symbolStore.removeTokensInBufferRange(this.editor, oldRange);
    };

    SymbolProvider.prototype.bufferDidChange = function(_arg) {
      var newRange;
      newRange = _arg.newRange;
      return this.symbolStore.addTokensInBufferRange(this.editor, newRange);
    };


    /*
    Section: Suggesting Completions
     */

    SymbolProvider.prototype.getSuggestions = function(options) {
      if (!options.prefix.trim().length) {
        return;
      }
      return new Promise((function(_this) {
        return function(resolve) {
          var suggestions;
          suggestions = _this.findSuggestionsForWord(options);
          return resolve(suggestions);
        };
      })(this));
    };

    SymbolProvider.prototype.findSuggestionsForWord = function(options) {
      var symbolList, word, words, _i, _len;
      if (!this.symbolStore.getLength()) {
        return;
      }
      symbolList = this.symbolStore.symbolsForConfig(this.config).concat(this.builtinCompletionsForCursorScope());
      words = atom.config.get("autocomplete-plus.strictMatching") ? symbolList.filter(function(match) {
        var _ref1;
        return ((_ref1 = match.text) != null ? _ref1.indexOf(options.prefix) : void 0) === 0;
      }) : this.fuzzyFilter(symbolList, this.editor.getPath(), options);
      for (_i = 0, _len = words.length; _i < _len; _i++) {
        word = words[_i];
        word.replacementPrefix = options.prefix;
      }
      return words;
    };

    SymbolProvider.prototype.fuzzyFilter = function(symbolList, editorPath, _arg) {
      var bufferPosition, candidates, index, locality, prefix, results, rowDifference, score, symbol, _i, _j, _len, _len1, _ref1;
      bufferPosition = _arg.bufferPosition, prefix = _arg.prefix;
      candidates = [];
      for (_i = 0, _len = symbolList.length; _i < _len; _i++) {
        symbol = symbolList[_i];
        if (symbol.text === prefix) {
          continue;
        }
        if (prefix[0].toLowerCase() !== symbol.text[0].toLowerCase()) {
          continue;
        }
        score = fuzzaldrin.score(symbol.text, prefix);
        score *= this.getLocalityScore(bufferPosition, typeof symbol.bufferRowsForEditorPath === "function" ? symbol.bufferRowsForEditorPath(editorPath) : void 0);
        if (score > 0) {
          candidates.push({
            symbol: symbol,
            score: score,
            locality: locality,
            rowDifference: rowDifference
          });
        }
      }
      candidates.sort(this.symbolSortReverseIterator);
      results = [];
      for (index = _j = 0, _len1 = candidates.length; _j < _len1; index = ++_j) {
        _ref1 = candidates[index], symbol = _ref1.symbol, score = _ref1.score, locality = _ref1.locality, rowDifference = _ref1.rowDifference;
        if (index === 20) {
          break;
        }
        results.push(symbol);
      }
      return results;
    };

    SymbolProvider.prototype.symbolSortReverseIterator = function(a, b) {
      return b.score - a.score;
    };

    SymbolProvider.prototype.getLocalityScore = function(bufferPosition, bufferRowsContainingSymbol) {
      var bufferRow, locality, rowDifference, _i, _len;
      if (bufferRowsContainingSymbol != null) {
        rowDifference = Number.MAX_VALUE;
        for (_i = 0, _len = bufferRowsContainingSymbol.length; _i < _len; _i++) {
          bufferRow = bufferRowsContainingSymbol[_i];
          rowDifference = Math.min(rowDifference, bufferRow - bufferPosition.row);
        }
        locality = this.computeLocalityModifier(rowDifference);
        return locality;
      } else {
        return 1;
      }
    };

    SymbolProvider.prototype.computeLocalityModifier = function(rowDifference) {
      rowDifference = Math.abs(rowDifference);
      return 1 + Math.max(-Math.pow(.2 * rowDifference - 3, 3) / 25 + .5, 0);
    };

    SymbolProvider.prototype.settingsForScopeDescriptor = function(scopeDescriptor, keyPath) {
      return atom.config.getAll(keyPath, {
        scope: scopeDescriptor
      });
    };

    SymbolProvider.prototype.builtinCompletionsForCursorScope = function() {
      var completions, cursorScope, properties, scopedCompletions, suggestion, suggestions, _i, _j, _len, _len1;
      cursorScope = this.editor.scopeDescriptorForBufferPosition(this.editor.getCursorBufferPosition());
      completions = this.settingsForScopeDescriptor(cursorScope, "editor.completions");
      scopedCompletions = [];
      for (_i = 0, _len = completions.length; _i < _len; _i++) {
        properties = completions[_i];
        if (suggestions = _.valueForKeyPath(properties, "editor.completions")) {
          for (_j = 0, _len1 = suggestions.length; _j < _len1; _j++) {
            suggestion = suggestions[_j];
            scopedCompletions.push({
              text: suggestion,
              type: 'builtin'
            });
          }
        }
      }
      return _.uniq(scopedCompletions, function(completion) {
        return completion.text;
      });
    };


    /*
    Section: Word List Building
     */

    SymbolProvider.prototype.buildWordListOnNextTick = function() {
      return _.defer((function(_this) {
        return function() {
          return _this.buildSymbolList();
        };
      })(this));
    };

    SymbolProvider.prototype.buildSymbolList = function() {
      var editor, minimumWordLength, _i, _len, _ref1;
      if (this.editor == null) {
        return;
      }
      this.symbolStore.clear();
      minimumWordLength = atom.config.get('autocomplete-plus.minimumWordLength');
      this.cacheSymbolsFromEditor(this.editor, minimumWordLength);
      if (atom.config.get('autocomplete-plus.includeCompletionsFromAllBuffers')) {
        _ref1 = atom.workspace.getTextEditors();
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          editor = _ref1[_i];
          this.cacheSymbolsFromEditor(editor, minimumWordLength);
        }
      }
    };

    SymbolProvider.prototype.cacheSymbolsFromEditor = function(editor, minimumWordLength, tokenizedLines) {
      var bufferRow, editorPath, token, tokens, _i, _j, _len, _len1;
      if (tokenizedLines == null) {
        tokenizedLines = this.getTokenizedLines(editor);
      }
      editorPath = editor.getPath();
      for (bufferRow = _i = 0, _len = tokenizedLines.length; _i < _len; bufferRow = ++_i) {
        tokens = tokenizedLines[bufferRow].tokens;
        for (_j = 0, _len1 = tokens.length; _j < _len1; _j++) {
          token = tokens[_j];
          this.symbolStore.addToken(token, editorPath, bufferRow, minimumWordLength);
        }
      }
    };

    SymbolProvider.prototype.getTokenizedLines = function(editor) {
      return editor.displayBuffer.tokenizedBuffer.tokenizedLines;
    };

    return SymbolProvider;

  })();

}).call(this);
