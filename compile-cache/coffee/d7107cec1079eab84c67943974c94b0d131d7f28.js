(function() {
  var AtomConfig, path, _;

  path = require('path');

  _ = require('underscore-plus');

  AtomConfig = require('./util/atomconfig');

  describe('gocode', function() {
    var autocompleteMain, autocompleteManager, buffer, completionDelay, dispatch, editor, editorView, goplusMain, provider, workspaceElement, _ref;
    _ref = [], workspaceElement = _ref[0], editor = _ref[1], editorView = _ref[2], dispatch = _ref[3], buffer = _ref[4], completionDelay = _ref[5], goplusMain = _ref[6], autocompleteMain = _ref[7], autocompleteManager = _ref[8], provider = _ref[9];
    beforeEach(function() {
      runs(function() {
        var atomconfig, pack;
        atomconfig = new AtomConfig();
        atomconfig.allfunctionalitydisabled();
        atom.config.set('autocomplete-plus.enableAutoActivation', true);
        atom.config.set('go-plus.suppressBuiltinAutocompleteProvider', false);
        completionDelay = 100;
        atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
        completionDelay += 100;
        workspaceElement = atom.views.getView(atom.workspace);
        jasmine.attachToDOM(workspaceElement);
        pack = atom.packages.loadPackage('go-plus');
        goplusMain = pack.mainModule;
        spyOn(goplusMain, 'provide').andCallThrough();
        spyOn(goplusMain, 'setDispatch').andCallThrough();
        pack = atom.packages.loadPackage('autocomplete-plus');
        autocompleteMain = pack.mainModule;
        spyOn(autocompleteMain, 'consumeProvider').andCallThrough();
        return jasmine.unspy(window, 'setTimeout');
      });
      waitsForPromise(function() {
        return atom.workspace.open('gocode.go').then(function(e) {
          editor = e;
          return editorView = atom.views.getView(editor);
        });
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('autocomplete-plus');
      });
      waitsFor(function() {
        var _ref1;
        return (_ref1 = autocompleteMain.autocompleteManager) != null ? _ref1.ready : void 0;
      });
      runs(function() {
        autocompleteManager = autocompleteMain.getAutocompleteManager();
        spyOn(autocompleteManager, 'displaySuggestions').andCallThrough();
        spyOn(autocompleteManager, 'showSuggestionList').andCallThrough();
        return spyOn(autocompleteManager, 'hideSuggestionList').andCallThrough();
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('language-go');
      });
      runs(function() {
        expect(goplusMain.provide).not.toHaveBeenCalled();
        return expect(goplusMain.provide.calls.length).toBe(0);
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('go-plus');
      });
      waitsFor(function() {
        return goplusMain.provide.calls.length === 1;
      });
      waitsFor(function() {
        return autocompleteMain.consumeProvider.calls.length === 1;
      });
      waitsFor(function() {
        var _ref1;
        return (_ref1 = goplusMain.dispatch) != null ? _ref1.ready : void 0;
      });
      waitsFor(function() {
        return goplusMain.setDispatch.calls.length >= 1;
      });
      return runs(function() {
        expect(goplusMain.provide).toHaveBeenCalled();
        expect(goplusMain.provider).toBeDefined();
        provider = goplusMain.provider;
        spyOn(provider, 'getSuggestions').andCallThrough();
        provider.onDidInsertSuggestion = jasmine.createSpy();
        expect(_.size(autocompleteManager.providerManager.providersForScopeDescriptor('.source.go'))).toEqual(1);
        expect(autocompleteManager.providerManager.providersForScopeDescriptor('.source.go')[0]).toEqual(provider);
        buffer = editor.getBuffer();
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
        return dispatch.goexecutable.detect();
      });
    });
    afterEach(function() {
      jasmine.unspy(goplusMain, 'provide');
      jasmine.unspy(goplusMain, 'setDispatch');
      jasmine.unspy(autocompleteManager, 'displaySuggestions');
      jasmine.unspy(autocompleteMain, 'consumeProvider');
      jasmine.unspy(autocompleteManager, 'hideSuggestionList');
      jasmine.unspy(autocompleteManager, 'showSuggestionList');
      return jasmine.unspy(provider, 'getSuggestions');
    });
    return describe('when the gocode autocomplete-plus provider is enabled', function() {
      it('displays suggestions from gocode', function() {
        runs(function() {
          expect(provider).toBeDefined();
          expect(provider.getSuggestions).not.toHaveBeenCalled();
          expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled();
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorScreenPosition([5, 6]);
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 1;
        });
        runs(function() {
          editor.insertText('P');
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.showSuggestionList.calls.length === 1;
        });
        waitsFor(function() {
          return editorView.querySelector('.autocomplete-plus span.word') != null;
        });
        return runs(function() {
          expect(provider.getSuggestions).toHaveBeenCalled();
          expect(provider.getSuggestions.calls.length).toBe(1);
          expect(editorView.querySelector('.autocomplete-plus')).toExist();
          expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span>rint(<span class="snippet-completion">a ...interface{}</span>)');
          expect(editorView.querySelector('.autocomplete-plus span.left-label').innerHTML).toBe('n int, err error');
          return editor.backspace();
        });
      });
      it('confirms a suggestion when the prefix case does not match', function() {
        runs(function() {
          expect(provider).toBeDefined();
          expect(provider.getSuggestions).not.toHaveBeenCalled();
          expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled();
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorScreenPosition([7, 0]);
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 1;
        });
        runs(function() {
          editor.insertText('    fmt.');
          editor.insertText('p');
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.showSuggestionList.calls.length === 1;
        });
        waitsFor(function() {
          return editorView.querySelector('.autocomplete-plus span.word') != null;
        });
        runs(function() {
          var suggestionListView;
          expect(provider.getSuggestions).toHaveBeenCalled();
          expect(provider.getSuggestions.calls.length).toBe(1);
          expect(provider.onDidInsertSuggestion).not.toHaveBeenCalled();
          expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span>rint(<span class="snippet-completion">a ...interface{}</span>)');
          suggestionListView = editorView.querySelector('.autocomplete-plus autocomplete-suggestion-list');
          return atom.commands.dispatch(suggestionListView, 'autocomplete-plus:confirm');
        });
        waitsFor(function() {
          return provider.onDidInsertSuggestion.calls.length === 1;
        });
        return runs(function() {
          expect(provider.onDidInsertSuggestion).toHaveBeenCalled();
          return expect(buffer.getTextInRange([[7, 4], [7, 9]])).toBe('fmt.P');
        });
      });
      it('confirms a suggestion when the prefix case does not match', function() {
        runs(function() {
          expect(provider).toBeDefined();
          expect(provider.getSuggestions).not.toHaveBeenCalled();
          expect(autocompleteManager.displaySuggestions).not.toHaveBeenCalled();
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorScreenPosition([7, 0]);
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 1;
        });
        runs(function() {
          editor.insertText('    fmt.p');
          editor.insertText('r');
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.showSuggestionList.calls.length === 1;
        });
        waitsFor(function() {
          return editorView.querySelector('.autocomplete-plus span.word') != null;
        });
        runs(function() {
          var suggestionListView;
          expect(provider.getSuggestions).toHaveBeenCalled();
          expect(provider.getSuggestions.calls.length).toBe(1);
          expect(provider.onDidInsertSuggestion).not.toHaveBeenCalled();
          expect(editorView.querySelector('.autocomplete-plus span.word').innerHTML).toBe('<span class="character-match">P</span><span class="character-match">r</span>int(<span class="snippet-completion">a ...interface{}</span>)');
          suggestionListView = editorView.querySelector('.autocomplete-plus autocomplete-suggestion-list');
          return atom.commands.dispatch(suggestionListView, 'autocomplete-plus:confirm');
        });
        waitsFor(function() {
          return provider.onDidInsertSuggestion.calls.length === 1;
        });
        return runs(function() {
          expect(provider.onDidInsertSuggestion).toHaveBeenCalled();
          return expect(buffer.getTextInRange([[7, 4], [7, 10]])).toBe('fmt.Pr');
        });
      });
      xit('does not display suggestions when no gocode suggestions exist', function() {
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorScreenPosition([6, 15]);
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 1;
        });
        runs(function() {
          editor.insertText('w');
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 2;
        });
        return runs(function() {
          return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
        });
      });
      return it('does not display suggestions at the end of a line when no gocode suggestions exist', function() {
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorScreenPosition([5, 15]);
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.hideSuggestionList.calls.length === 1;
        });
        waitsFor(function() {
          return autocompleteManager.displaySuggestions.calls.length === 0;
        });
        runs(function() {
          editor.insertText(')');
          return advanceClock(completionDelay);
        });
        waitsFor(function() {
          return autocompleteManager.displaySuggestions.calls.length === 1;
        });
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          return editor.insertText(';');
        });
        waitsFor(function() {
          autocompleteManager.displaySuggestions.calls.length === 1;
          return advanceClock(completionDelay);
        });
        return runs(function() {
          return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
        });
      });
    });
  });

}).call(this);
