(function() {
  var AutocompleteManager, CompositeDisposable, Disposable, ProviderManager, Range, SuggestionList, SuggestionListElement, TextEditor, minimatch, path, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ref = require('atom'), Range = _ref.Range, TextEditor = _ref.TextEditor, CompositeDisposable = _ref.CompositeDisposable, Disposable = _ref.Disposable;

  _ = require('underscore-plus');

  path = require('path');

  ProviderManager = require('./provider-manager');

  SuggestionList = require('./suggestion-list');

  SuggestionListElement = require('./suggestion-list-element');

  minimatch = null;

  module.exports = AutocompleteManager = (function() {
    AutocompleteManager.prototype.autosaveEnabled = false;

    AutocompleteManager.prototype.backspaceTriggersAutocomplete = true;

    AutocompleteManager.prototype.buffer = null;

    AutocompleteManager.prototype.compositionInProgress = false;

    AutocompleteManager.prototype.disposed = false;

    AutocompleteManager.prototype.editor = null;

    AutocompleteManager.prototype.editorSubscriptions = null;

    AutocompleteManager.prototype.editorView = null;

    AutocompleteManager.prototype.providerManager = null;

    AutocompleteManager.prototype.ready = false;

    AutocompleteManager.prototype.subscriptions = null;

    AutocompleteManager.prototype.suggestionDelay = 50;

    AutocompleteManager.prototype.suggestionList = null;

    AutocompleteManager.prototype.shouldDisplaySuggestions = false;

    function AutocompleteManager() {
      this.dispose = __bind(this.dispose, this);
      this.bufferChanged = __bind(this.bufferChanged, this);
      this.bufferSaved = __bind(this.bufferSaved, this);
      this.cursorMoved = __bind(this.cursorMoved, this);
      this.requestNewSuggestions = __bind(this.requestNewSuggestions, this);
      this.isCurrentFileBlackListed = __bind(this.isCurrentFileBlackListed, this);
      this.replaceTextWithMatch = __bind(this.replaceTextWithMatch, this);
      this.hideSuggestionList = __bind(this.hideSuggestionList, this);
      this.confirm = __bind(this.confirm, this);
      this.prefixForCursor = __bind(this.prefixForCursor, this);
      this.displaySuggestions = __bind(this.displaySuggestions, this);
      this.getSuggestionsFromProviders = __bind(this.getSuggestionsFromProviders, this);
      this.findSuggestions = __bind(this.findSuggestions, this);
      this.handleCommands = __bind(this.handleCommands, this);
      this.handleEvents = __bind(this.handleEvents, this);
      this.updateCurrentEditor = __bind(this.updateCurrentEditor, this);
      this.subscriptions = new CompositeDisposable;
      this.providerManager = new ProviderManager;
      this.suggestionList = new SuggestionList;
      this.subscriptions.add(this.providerManager);
      this.subscriptions.add(atom.views.addViewProvider(SuggestionList, function(model) {
        return new SuggestionListElement().initialize(model);
      }));
      this.handleEvents();
      this.handleCommands();
      this.subscriptions.add(this.suggestionList);
      this.ready = true;
    }

    AutocompleteManager.prototype.setSnippetsManager = function(snippetsManager) {
      this.snippetsManager = snippetsManager;
    };

    AutocompleteManager.prototype.updateCurrentEditor = function(currentPaneItem) {
      var compositionEnd, compositionStart, _ref1;
      if ((currentPaneItem == null) || currentPaneItem === this.editor) {
        return;
      }
      if ((_ref1 = this.editorSubscriptions) != null) {
        _ref1.dispose();
      }
      this.editorSubscriptions = null;
      this.editor = null;
      this.editorView = null;
      this.buffer = null;
      if (!this.paneItemIsValid(currentPaneItem)) {
        return;
      }
      this.editor = currentPaneItem;
      this.editorView = atom.views.getView(this.editor);
      this.buffer = this.editor.getBuffer();
      this.editorSubscriptions = new CompositeDisposable;
      this.editorSubscriptions.add(this.buffer.onDidSave(this.bufferSaved));
      this.editorSubscriptions.add(this.buffer.onDidChange(this.bufferChanged));
      compositionStart = (function(_this) {
        return function() {
          return _this.compositionInProgress = true;
        };
      })(this);
      compositionEnd = (function(_this) {
        return function() {
          return _this.compositionInProgress = false;
        };
      })(this);
      this.editorView.addEventListener('compositionstart', compositionStart);
      this.editorView.addEventListener('compositionend', compositionEnd);
      this.editorSubscriptions.add(new Disposable(function() {
        var _ref2, _ref3;
        if ((_ref2 = this.editorView) != null) {
          _ref2.removeEventListener('compositionstart', compositionStart);
        }
        return (_ref3 = this.editorView) != null ? _ref3.removeEventListener('compositionend', compositionEnd) : void 0;
      }));
      return this.editorSubscriptions.add(this.editor.onDidChangeCursorPosition(this.cursorMoved));
    };

    AutocompleteManager.prototype.paneItemIsValid = function(paneItem) {
      if (paneItem == null) {
        return false;
      }
      return paneItem instanceof TextEditor;
    };

    AutocompleteManager.prototype.handleEvents = function() {
      this.subscriptions.add(atom.workspace.observeActivePaneItem(this.updateCurrentEditor));
      this.subscriptions.add(atom.config.observe('autosave.enabled', (function(_this) {
        return function(value) {
          return _this.autosaveEnabled = value;
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('autocomplete-plus.backspaceTriggersAutocomplete', (function(_this) {
        return function(value) {
          return _this.backspaceTriggersAutocomplete = value;
        };
      })(this)));
      this.subscriptions.add(this.suggestionList.onDidConfirm(this.confirm));
      return this.subscriptions.add(this.suggestionList.onDidCancel(this.hideSuggestionList));
    };

    AutocompleteManager.prototype.handleCommands = function() {
      return this.subscriptions.add(atom.commands.add('atom-text-editor', {
        'autocomplete-plus:activate': (function(_this) {
          return function() {
            _this.shouldDisplaySuggestions = true;
            return _this.findSuggestions();
          };
        })(this)
      }));
    };

    AutocompleteManager.prototype.findSuggestions = function() {
      var currentScope, currentScopeChain, cursor, cursorPosition, options;
      if (this.disposed) {
        return;
      }
      if (!((this.providerManager != null) && (this.editor != null) && (this.buffer != null))) {
        return;
      }
      if (this.isCurrentFileBlackListed()) {
        return;
      }
      cursor = this.editor.getLastCursor();
      if (cursor == null) {
        return;
      }
      cursorPosition = cursor.getBufferPosition();
      currentScope = cursor.getScopeDescriptor();
      if (currentScope == null) {
        return;
      }
      currentScopeChain = currentScope.getScopeChain();
      if (currentScopeChain == null) {
        return;
      }
      options = {
        editor: this.editor,
        buffer: this.buffer,
        cursor: cursor,
        position: cursorPosition,
        scope: currentScope,
        scopeChain: currentScopeChain,
        prefix: this.prefixForCursor(cursor)
      };
      return this.getSuggestionsFromProviders(options);
    };

    AutocompleteManager.prototype.getSuggestionsFromProviders = function(options) {
      var providerPromises, providers, suggestionsPromise;
      providers = this.providerManager.providersForScopeChain(options.scopeChain);
      providerPromises = providers != null ? providers.map(function(provider) {
        return provider != null ? provider.requestHandler(options) : void 0;
      }) : void 0;
      if (!(providerPromises != null ? providerPromises.length : void 0)) {
        return;
      }
      return this.currentSuggestionsPromise = suggestionsPromise = Promise.all(providerPromises).then(this.mergeSuggestionsFromProviders).then((function(_this) {
        return function(suggestions) {
          if (_this.currentSuggestionsPromise === suggestionsPromise) {
            return _this.displaySuggestions(suggestions, options);
          }
        };
      })(this));
    };

    AutocompleteManager.prototype.mergeSuggestionsFromProviders = function(providerSuggestions) {
      return providerSuggestions.reduce(function(suggestions, providerSuggestions) {
        if (providerSuggestions != null ? providerSuggestions.length : void 0) {
          suggestions = suggestions.concat(providerSuggestions);
        }
        return suggestions;
      }, []);
    };

    AutocompleteManager.prototype.displaySuggestions = function(suggestions, options) {
      suggestions = _.uniq(suggestions, function(s) {
        return s.word;
      });
      if (this.shouldDisplaySuggestions && suggestions.length) {
        return this.showSuggestionList(suggestions);
      } else {
        return this.hideSuggestionList();
      }
    };

    AutocompleteManager.prototype.prefixForCursor = function(cursor) {
      var end, start;
      if (!((this.buffer != null) && (cursor != null))) {
        return '';
      }
      start = cursor.getBeginningOfCurrentWordBufferPosition();
      end = cursor.getBufferPosition();
      if (!((start != null) && (end != null))) {
        return '';
      }
      return this.buffer.getTextInRange(new Range(start, end));
    };

    AutocompleteManager.prototype.confirm = function(match) {
      var _ref1;
      if (!((this.editor != null) && (match != null) && !this.disposed)) {
        return;
      }
      if (typeof match.onWillConfirm === "function") {
        match.onWillConfirm();
      }
      if ((_ref1 = this.editor.getSelections()) != null) {
        _ref1.forEach(function(selection) {
          return selection != null ? selection.clear() : void 0;
        });
      }
      this.hideSuggestionList();
      this.replaceTextWithMatch(match);
      if (match.isSnippet) {
        setTimeout((function(_this) {
          return function() {
            return atom.commands.dispatch(atom.views.getView(_this.editor), 'snippets:expand');
          };
        })(this), 1);
      }
      return typeof match.onDidConfirm === "function" ? match.onDidConfirm() : void 0;
    };

    AutocompleteManager.prototype.showSuggestionList = function(suggestions) {
      if (this.disposed) {
        return;
      }
      this.suggestionList.changeItems(suggestions);
      return this.suggestionList.show(this.editor);
    };

    AutocompleteManager.prototype.hideSuggestionList = function() {
      if (this.disposed) {
        return;
      }
      this.suggestionList.hide();
      return this.shouldDisplaySuggestions = false;
    };

    AutocompleteManager.prototype.requestHideSuggestionList = function(command) {
      this.hideTimeout = setTimeout(this.hideSuggestionList, 0);
      return this.shouldDisplaySuggestions = false;
    };

    AutocompleteManager.prototype.cancelHideSuggestionListRequest = function() {
      return clearTimeout(this.hideTimeout);
    };

    AutocompleteManager.prototype.replaceTextWithMatch = function(match) {
      var newSelectedBufferRanges, selections;
      if (this.editor == null) {
        return;
      }
      newSelectedBufferRanges = [];
      selections = this.editor.getSelections();
      if (selections == null) {
        return;
      }
      return this.editor.transact((function(_this) {
        return function() {
          var _ref1, _ref2;
          if (((_ref1 = match.prefix) != null ? _ref1.length : void 0) > 0) {
            _this.editor.selectLeft(match.prefix.length);
            _this.editor["delete"]();
          }
          if ((match.snippet != null) && (_this.snippetsManager != null)) {
            return _this.snippetsManager.insertSnippet(match.snippet, _this.editor);
          } else {
            return _this.editor.insertText((_ref2 = match.word) != null ? _ref2 : match.snippet);
          }
        };
      })(this));
    };

    AutocompleteManager.prototype.isCurrentFileBlackListed = function() {
      var blacklist, blacklistGlob, fileName, _i, _len, _ref1;
      blacklist = (_ref1 = atom.config.get('autocomplete-plus.fileBlacklist')) != null ? _ref1.map(function(s) {
        return s.trim();
      }) : void 0;
      if (!((blacklist != null ? blacklist.length : void 0) > 0)) {
        return false;
      }
      if (minimatch == null) {
        minimatch = require('minimatch');
      }
      fileName = path.basename(this.buffer.getPath());
      for (_i = 0, _len = blacklist.length; _i < _len; _i++) {
        blacklistGlob = blacklist[_i];
        if (minimatch(fileName, blacklistGlob)) {
          return true;
        }
      }
      return false;
    };

    AutocompleteManager.prototype.requestNewSuggestions = function() {
      var delay;
      delay = atom.config.get('autocomplete-plus.autoActivationDelay');
      clearTimeout(this.delayTimeout);
      if (this.suggestionList.isActive()) {
        delay = this.suggestionDelay;
      }
      this.delayTimeout = setTimeout(this.findSuggestions, delay);
      return this.shouldDisplaySuggestions = true;
    };

    AutocompleteManager.prototype.cancelNewSuggestionsRequest = function() {
      clearTimeout(this.delayTimeout);
      return this.shouldDisplaySuggestions = false;
    };

    AutocompleteManager.prototype.cursorMoved = function(_arg) {
      var textChanged;
      textChanged = _arg.textChanged;
      if (!textChanged) {
        return this.requestHideSuggestionList();
      }
    };

    AutocompleteManager.prototype.bufferSaved = function() {
      if (!this.autosaveEnabled) {
        return this.hideSuggestionList();
      }
    };

    AutocompleteManager.prototype.bufferChanged = function(_arg) {
      var autoActivationEnabled, newText, oldText, wouldAutoActivate;
      newText = _arg.newText, oldText = _arg.oldText;
      if (this.disposed) {
        return;
      }
      if (this.compositionInProgress) {
        return this.hideSuggestionList();
      }
      autoActivationEnabled = atom.config.get('autocomplete-plus.enableAutoActivation');
      wouldAutoActivate = newText.trim().length === 1 || ((this.backspaceTriggersAutocomplete || this.suggestionList.isActive()) && oldText.trim().length === 1);
      if (autoActivationEnabled && wouldAutoActivate) {
        this.cancelHideSuggestionListRequest();
        return this.requestNewSuggestions();
      } else {
        this.cancelNewSuggestionsRequest();
        return this.hideSuggestionList();
      }
    };

    AutocompleteManager.prototype.dispose = function() {
      var _ref1, _ref2;
      this.hideSuggestionList();
      this.disposed = true;
      this.ready = false;
      if ((_ref1 = this.editorSubscriptions) != null) {
        _ref1.dispose();
      }
      this.editorSubscriptions = null;
      if ((_ref2 = this.subscriptions) != null) {
        _ref2.dispose();
      }
      this.subscriptions = null;
      this.suggestionList = null;
      return this.providerManager = null;
    };

    return AutocompleteManager;

  })();

}).call(this);
