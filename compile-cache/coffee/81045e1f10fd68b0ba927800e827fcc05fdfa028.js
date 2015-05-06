(function() {
  var Point, buildIMECompositionEvent, buildTextInputEvent, suggestionForWord, triggerAutocompletion, _, _ref;

  Point = require('atom').Point;

  _ref = require('./spec-helper'), triggerAutocompletion = _ref.triggerAutocompletion, buildIMECompositionEvent = _ref.buildIMECompositionEvent, buildTextInputEvent = _ref.buildTextInputEvent;

  _ = require('underscore-plus');

  suggestionForWord = function(suggestionList, word) {
    return suggestionList.getSymbol(word);
  };

  describe('SymbolProvider', function() {
    var autocompleteManager, completionDelay, editor, editorView, mainModule, provider, _ref1;
    _ref1 = [], completionDelay = _ref1[0], editorView = _ref1[1], editor = _ref1[2], mainModule = _ref1[3], autocompleteManager = _ref1[4], provider = _ref1[5];
    beforeEach(function() {
      return runs(function() {
        var workspaceElement;
        atom.config.set('autocomplete-plus.enableAutoActivation', true);
        atom.config.set('autocomplete-plus.defaultProvider', 'Symbol');
        completionDelay = 100;
        atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
        completionDelay += 100;
        workspaceElement = atom.views.getView(atom.workspace);
        return jasmine.attachToDOM(workspaceElement);
      });
    });
    afterEach(function() {
      return atom.config.set('autocomplete-plus.defaultProvider', 'Fuzzy');
    });
    describe("when completing with the default configuration", function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set("autocomplete-plus.enableAutoActivation", true);
        });
        waitsForPromise(function() {
          return atom.workspace.open("sample.coffee").then(function(e) {
            return editor = e;
          });
        });
        waitsForPromise(function() {
          return atom.packages.activatePackage("language-coffee-script").then(function() {
            return atom.packages.activatePackage("autocomplete-plus").then(function(a) {
              return mainModule = a.mainModule;
            });
          });
        });
        return runs(function() {
          autocompleteManager = mainModule.autocompleteManager;
          advanceClock(1);
          editorView = atom.views.getView(editor);
          return provider = autocompleteManager.providerManager.fuzzyProvider;
        });
      });
      return it("does not output suggestions from the other buffer", function() {
        var results;
        results = null;
        waitsForPromise(function() {
          var promise;
          promise = provider.getSuggestions({
            editor: editor,
            prefix: 'item',
            bufferPosition: new Point(7, 0)
          });
          advanceClock(1);
          return promise.then(function(r) {
            return results = r;
          });
        });
        return runs(function() {
          return expect(results).toHaveLength(0);
        });
      });
    });
    return describe("when auto-activation is enabled", function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set('autocomplete-plus.enableAutoActivation', true);
        });
        waitsForPromise(function() {
          return atom.workspace.open('sample.js').then(function(e) {
            return editor = e;
          });
        });
        waitsForPromise(function() {
          return atom.packages.activatePackage("language-javascript").then(function() {
            return atom.packages.activatePackage("autocomplete-plus").then(function(a) {
              return mainModule = a.mainModule;
            });
          });
        });
        return runs(function() {
          autocompleteManager = mainModule.autocompleteManager;
          advanceClock(1);
          editorView = atom.views.getView(editor);
          return provider = autocompleteManager.providerManager.fuzzyProvider;
        });
      });
      it("runs a completion ", function() {
        return expect(suggestionForWord(provider.symbolStore, 'quicksort')).toBeTruthy();
      });
      it("adds words to the symbol list after they have been written", function() {
        expect(suggestionForWord(provider.symbolStore, 'aNewFunction')).toBeFalsy();
        editor.insertText('function aNewFunction(){};');
        editor.insertText(' ');
        advanceClock(provider.changeUpdateDelay);
        return expect(suggestionForWord(provider.symbolStore, 'aNewFunction')).toBeTruthy();
      });
      it("removes words from the symbol list when they do not exist in the buffer", function() {
        editor.moveToBottom();
        editor.moveToBeginningOfLine();
        expect(suggestionForWord(provider.symbolStore, 'aNewFunction')).toBeFalsy();
        editor.insertText('function aNewFunction(){};');
        advanceClock(provider.changeUpdateDelay);
        expect(suggestionForWord(provider.symbolStore, 'aNewFunction')).toBeTruthy();
        editor.setCursorBufferPosition([13, 21]);
        editor.backspace();
        advanceClock(provider.changeUpdateDelay);
        expect(suggestionForWord(provider.symbolStore, 'aNewFunctio')).toBeTruthy();
        return expect(suggestionForWord(provider.symbolStore, 'aNewFunction')).toBeFalsy();
      });
      it("correctly tracks the buffer row associated with symbols as they change", function() {
        var suggestion;
        editor.setText('');
        advanceClock(provider.changeUpdateDelay);
        editor.setText('function abc(){}\nfunction abc(){}');
        advanceClock(provider.changeUpdateDelay);
        suggestion = suggestionForWord(provider.symbolStore, 'abc');
        expect(suggestion.bufferRowsForEditorPath(editor.getPath())).toEqual([0, 1]);
        editor.setCursorBufferPosition([2, 100]);
        editor.insertText('\n\nfunction omg(){}; function omg(){}');
        advanceClock(provider.changeUpdateDelay);
        suggestion = suggestionForWord(provider.symbolStore, 'omg');
        expect(suggestion.bufferRowsForEditorPath(editor.getPath())).toEqual([3, 3]);
        editor.selectLeft(16);
        editor.backspace();
        advanceClock(provider.changeUpdateDelay);
        suggestion = suggestionForWord(provider.symbolStore, 'omg');
        expect(suggestion.bufferRowsForEditorPath(editor.getPath())).toEqual([3]);
        editor.insertText('\nfunction omg(){}');
        advanceClock(provider.changeUpdateDelay);
        suggestion = suggestionForWord(provider.symbolStore, 'omg');
        expect(suggestion.bufferRowsForEditorPath(editor.getPath())).toEqual([3, 4]);
        editor.setText('');
        advanceClock(provider.changeUpdateDelay);
        expect(suggestionForWord(provider.symbolStore, 'abc')).toBeUndefined();
        expect(suggestionForWord(provider.symbolStore, 'omg')).toBeUndefined();
        editor.setText('function abc(){}\nfunction abc(){}');
        editor.setCursorBufferPosition([0, 0]);
        editor.insertText('\n');
        editor.setCursorBufferPosition([2, 100]);
        editor.insertText('\nfunction abc(){}');
        advanceClock(provider.changeUpdateDelay);
        suggestion = suggestionForWord(provider.symbolStore, 'abc');
        return expect(suggestion.bufferRowsForEditorPath(editor.getPath())).toContain(3);
      });
      describe("when includeCompletionsFromAllBuffers is enabled", function() {
        beforeEach(function() {
          atom.config.set('autocomplete-plus.includeCompletionsFromAllBuffers', true);
          waitsForPromise(function() {
            return atom.packages.activatePackage("language-coffee-script").then(function() {
              return atom.workspace.open("sample.coffee").then(function(e) {
                return editor = e;
              });
            });
          });
          return runs(function() {
            return provider = autocompleteManager.providerManager.fuzzyProvider;
          });
        });
        afterEach(function() {
          return atom.config.set('autocomplete-plus.includeCompletionsFromAllBuffers', false);
        });
        it("outputs unique suggestions", function() {
          var results;
          results = null;
          waitsForPromise(function() {
            var promise;
            promise = provider.getSuggestions({
              editor: editor,
              prefix: 'qu',
              bufferPosition: new Point(7, 0)
            });
            advanceClock(1);
            return promise.then(function(r) {
              return results = r;
            });
          });
          return runs(function() {
            return expect(results).toHaveLength(1);
          });
        });
        return it("outputs suggestions from the other buffer", function() {
          var results;
          results = null;
          waitsForPromise(function() {
            var promise;
            promise = provider.getSuggestions({
              editor: editor,
              prefix: 'item',
              bufferPosition: new Point(7, 0)
            });
            advanceClock(1);
            return promise.then(function(r) {
              return results = r;
            });
          });
          return runs(function() {
            return expect(results[0].text).toBe('items');
          });
        });
      });
      return xit('adds words to the wordlist with unicode characters', function() {
        expect(provider.symbolStore.indexOf('somēthingNew')).toBeFalsy();
        editor.insertText('somēthingNew');
        editor.insertText(' ');
        return expect(provider.symbolStore.indexOf('somēthingNew')).toBeTruthy();
      });
    });
  });

}).call(this);
