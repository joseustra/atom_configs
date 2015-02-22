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
        spyOn(autocompleteMain, 'consumeProviders').andCallThrough();
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
        autocompleteManager = autocompleteMain.autocompleteManager;
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
        return autocompleteMain.consumeProviders.calls.length === 1;
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
        spyOn(provider, 'requestHandler').andCallThrough();
        expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.go'))).toEqual(2);
        expect(autocompleteManager.providerManager.providersForScopeChain('.source.go')[0]).toEqual(provider);
        buffer = editor.getBuffer();
        dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
        return dispatch.goexecutable.detect();
      });
    });
    afterEach(function() {
      jasmine.unspy(goplusMain, 'provide');
      jasmine.unspy(goplusMain, 'setDispatch');
      jasmine.unspy(autocompleteManager, 'displaySuggestions');
      jasmine.unspy(autocompleteMain, 'consumeProviders');
      jasmine.unspy(autocompleteManager, 'hideSuggestionList');
      jasmine.unspy(autocompleteManager, 'showSuggestionList');
      return jasmine.unspy(provider, 'requestHandler');
    });
    return describe('when the gocode autocomplete-plus provider is enabled', function() {
      it('displays suggestions from gocode', function() {
        runs(function() {
          expect(provider).toBeDefined();
          expect(provider.requestHandler).not.toHaveBeenCalled();
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
          return autocompleteManager.displaySuggestions.calls.length === 1;
        });
        return runs(function() {
          expect(provider.requestHandler).toHaveBeenCalled();
          expect(provider.requestHandler.calls.length).toBe(1);
          expect(editorView.querySelector('.autocomplete-plus')).toExist();
          expect(editorView.querySelector('.autocomplete-plus span.word')).toHaveText('Print(');
          expect(editorView.querySelector('.autocomplete-plus span.completion-label')).toHaveText('func(a ...interface{}) (n int, err error)');
          return editor.backspace();
        });
      });
      it('does not display suggestions when no gocode suggestions exist', function() {
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
        runs(function() {
          editor.backspace();
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
          autocompleteManager.displaySuggestions.calls.length === 2;
          return advanceClock(completionDelay);
        });
        return runs(function() {
          return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
        });
      });
    });
  });

}).call(this);
