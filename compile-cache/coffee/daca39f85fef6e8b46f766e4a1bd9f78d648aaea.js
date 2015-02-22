(function() {
  var Disposable, Provider, Suggestion, deprecate;

  Disposable = require('atom').Disposable;

  Provider = require('./provider');

  Suggestion = require('./suggestion');

  deprecate = require('grim').deprecate;

  module.exports = {
    config: {
      enableAutoActivation: {
        title: 'Show Suggestions On Keystroke',
        description: 'Suggestions will show as you type if this preference is enabled. If it is disabled, you can still see suggestions by using the keymapping for autocomplete-plus:activate (shown below).',
        type: 'boolean',
        "default": true,
        order: 1
      },
      autoActivationDelay: {
        title: 'Delay Before Suggestions Are Shown',
        description: 'This prevents suggestions from being shown too frequently. Usually, the default works well. A lower value than the default has performance implications, and is not advised.',
        type: 'integer',
        "default": 100,
        order: 2
      },
      maxSuggestions: {
        title: 'Maximum Suggestions',
        description: 'The list of suggestions will be limited to this number.',
        type: 'integer',
        "default": 10,
        order: 3
      },
      confirmCompletion: {
        title: 'Keymap For Confirming A Suggestion',
        description: 'You should use the key(s) indicated here to confirm a suggestion from the suggestion list and have it inserted into the file.',
        type: 'string',
        "default": 'tab',
        "enum": ['tab', 'enter', 'tab and enter'],
        order: 4
      },
      navigateCompletions: {
        title: 'Keymap For Navigating The Suggestion List',
        description: 'You should use the keys indicated here to select suggestions in the suggestion list (moving up or down).',
        type: 'string',
        "default": 'up,down',
        "enum": ['up,down', 'ctrl-p,ctrl-n'],
        order: 5
      },
      fileBlacklist: {
        title: 'File Blacklist',
        description: 'Suggestions will not be provided for files matching this list.',
        type: 'array',
        "default": ['.*'],
        items: {
          type: 'string'
        },
        order: 6
      },
      scopeBlacklist: {
        title: 'Scope Blacklist',
        description: 'Suggestions will not be provided for scopes matching this list. See: https://atom.io/docs/latest/advanced/scopes-and-scope-descriptors',
        type: 'array',
        "default": [],
        items: {
          type: 'string'
        },
        order: 7
      },
      includeCompletionsFromAllBuffers: {
        title: 'Include Completions From All Buffers',
        description: 'For grammars with no registered provider(s), FuzzyProvider will include completions from all buffers, instead of just the buffer you are currently editing.',
        type: 'boolean',
        "default": false,
        order: 8
      },
      strictMatching: {
        title: 'Use Strict Matching For Built-In Provider',
        description: 'Fuzzy searching is performed if this is disabled; if it is enabled, suggestions must begin with the prefix from the current word.',
        type: 'boolean',
        "default": false,
        order: 9
      },
      enableBuiltinProvider: {
        title: 'Enable Built-In Provider',
        description: 'The package comes with a built-in provider that will provide suggestions using the words in your current buffer or all open buffers. You will get better suggestions by installing additional autocomplete+ providers. To stop using the built-in provider, disable this option.',
        type: 'boolean',
        "default": true,
        order: 10
      },
      builtinProviderBlacklist: {
        title: 'Built-In Provider Blacklist',
        description: 'Don\'t use the built-in provider for these selector(s).',
        type: 'string',
        "default": '.source.gfm',
        order: 11
      },
      backspaceTriggersAutocomplete: {
        title: 'Allow Backspace To Trigger Autocomplete',
        description: 'If enabled, typing `backspace` will show the suggestion list if suggestions are available. If disabled, suggestions will not be shown while backspacing.',
        type: 'boolean',
        "default": true,
        order: 12
      },
      suggestionListFollows: {
        title: 'Suggestions List Follows',
        description: 'With "Cursor" the suggestion list appears at the cursor\'s position. With "Word" it appers at the beginning of the word that\'s being completed.',
        type: 'string',
        "default": 'Cursor',
        "enum": ['Cursor', 'Word'],
        order: 13
      }
    },
    activate: function() {
      return this.getAutocompleteManager();
    },
    deactivate: function() {
      var _ref;
      if ((_ref = this.autocompleteManager) != null) {
        _ref.dispose();
      }
      return this.autocompleteManager = null;
    },
    registerProviderForEditorView: function(provider, editorView) {
      return this.registerProviderForEditor(provider, editorView != null ? editorView.getModel() : void 0);
    },
    registerProviderForEditor: function(provider, editor) {
      var _ref, _ref1, _ref2;
      if (((_ref = this.autocompleteManager) != null ? _ref.providerManager : void 0) == null) {
        return;
      }
      if ((editor != null ? (_ref1 = editor.getGrammar()) != null ? _ref1.scopeName : void 0 : void 0) == null) {
        return;
      }
      deprecate('registerProviderForEditor and registerProviderForEditorView are no longer supported. Please switch to the new API: https://github.com/atom-community/autocomplete-plus/wiki/Provider-API');
      return this.getAutocompleteManager().providerManager.registerLegacyProvider(provider, '.' + (editor != null ? (_ref2 = editor.getGrammar()) != null ? _ref2.scopeName : void 0 : void 0));
    },
    unregisterProvider: function(provider) {
      var _ref;
      if (((_ref = this.getAutocompleteManager()) != null ? _ref.providerManager : void 0) == null) {
        return;
      }
      deprecate('unregisterProvider is no longer supported. Please switch to the new API: https://github.com/atom-community/autocomplete-plus/wiki/Provider-API');
      return this.getAutocompleteManager().providerManager.unregisterLegacyProvider(provider);
    },
    getAutocompleteManager: function() {
      var AutocompleteManager;
      if (this.activateTimeout != null) {
        clearTimeout(this.activateTimeout);
        this.activateTimeout = null;
      }
      if (this.autocompleteManager != null) {
        return this.autocompleteManager;
      }
      AutocompleteManager = require('./autocomplete-manager');
      this.autocompleteManager = new AutocompleteManager();
      return this.autocompleteManager;
    },
    Provider: Provider,
    Suggestion: Suggestion,
    consumeProvider: function(service) {
      if ((service != null ? service.provider : void 0) == null) {
        return;
      }
      service.providers = [service.provider];
      return this.consumeProviders(service);
    },
    consumeProviders: function(service) {
      var provider, registrations, _ref;
      if (!((service != null ? (_ref = service.providers) != null ? _ref.length : void 0 : void 0) > 0)) {
        return;
      }
      registrations = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = service.providers;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          provider = _ref1[_i];
          _results.push(this.getAutocompleteManager().providerManager.registerProvider(provider));
        }
        return _results;
      }).call(this);
      if ((registrations != null ? registrations.length : void 0) > 0) {
        return new Disposable(function() {
          var registration, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = registrations.length; _i < _len; _i++) {
            registration = registrations[_i];
            _results.push(registration != null ? typeof registration.dispose === "function" ? registration.dispose() : void 0 : void 0);
          }
          return _results;
        });
      }
    }
  };

}).call(this);
