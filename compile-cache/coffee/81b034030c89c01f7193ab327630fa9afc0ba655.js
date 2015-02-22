(function() {
  var KeymapManager, buildIMECompositionEvent, buildTextInputEvent, triggerAutocompletion, waitForAutocomplete, _, _ref;

  _ref = require('./spec-helper'), triggerAutocompletion = _ref.triggerAutocompletion, waitForAutocomplete = _ref.waitForAutocomplete, buildIMECompositionEvent = _ref.buildIMECompositionEvent, buildTextInputEvent = _ref.buildTextInputEvent;

  _ = require('underscore-plus');

  KeymapManager = require('atom').KeymapManager;

  describe('Autocomplete Manager', function() {
    var autocompleteManager, completionDelay, editor, editorView, mainModule, _ref1;
    _ref1 = [], completionDelay = _ref1[0], editorView = _ref1[1], editor = _ref1[2], mainModule = _ref1[3], autocompleteManager = _ref1[4], mainModule = _ref1[5];
    beforeEach(function() {
      return runs(function() {
        var workspaceElement;
        atom.config.set('autocomplete-plus.enableAutoActivation', true);
        atom.config.set('editor.fontSize', '16');
        completionDelay = 100;
        atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
        completionDelay += 100;
        workspaceElement = atom.views.getView(atom.workspace);
        return jasmine.attachToDOM(workspaceElement);
      });
    });
    describe('when opening a file without a path and using strict matching', function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set('autocomplete-plus.strictMatching', true);
        });
        waitsForPromise(function() {
          return atom.workspace.open('').then(function(e) {
            editor = e;
            return editorView = atom.views.getView(editor);
          });
        });
        waitsForPromise(function() {
          return atom.packages.activatePackage('language-text');
        });
        runs(function() {
          var workspaceElement;
          workspaceElement = atom.views.getView(atom.workspace);
          return jasmine.attachToDOM(workspaceElement);
        });
        waitsForPromise(function() {
          return atom.packages.activatePackage('autocomplete-plus').then(function(a) {
            return mainModule = a.mainModule;
          });
        });
        waitsFor(function() {
          var _ref2;
          return (_ref2 = mainModule.autocompleteManager) != null ? _ref2.ready : void 0;
        });
        return runs(function() {
          autocompleteManager = mainModule.autocompleteManager;
          spyOn(autocompleteManager, 'findSuggestions').andCallThrough();
          return spyOn(autocompleteManager, 'displaySuggestions').andCallThrough();
        });
      });
      afterEach(function() {
        jasmine.unspy(autocompleteManager, 'findSuggestions');
        return jasmine.unspy(autocompleteManager, 'displaySuggestions');
      });
      return it('does not cause issues when typing', function() {
        runs(function() {
          editor.moveToBottom();
          editor.insertText('h');
          editor.insertText('e');
          editor.insertText('l');
          editor.insertText('l');
          editor.insertText('o');
          return advanceClock(completionDelay + 1000);
        });
        return waitsFor(function() {
          return autocompleteManager.findSuggestions.calls.length === 1;
        });
      });
    });
    describe('when opening a javascript file', function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set('autocomplete-plus.enableAutoActivation', true);
        });
        waitsForPromise(function() {
          return atom.workspace.open('sample.js').then(function(e) {
            editor = e;
            return editorView = atom.views.getView(editor);
          });
        });
        waitsForPromise(function() {
          return atom.packages.activatePackage('language-javascript');
        });
        return waitsForPromise(function() {
          return atom.packages.activatePackage('autocomplete-plus').then(function(a) {
            mainModule = a.mainModule;
            return autocompleteManager = mainModule.autocompleteManager;
          });
        });
      });
      describe('when fuzzyprovider is disabled', function() {
        return it('should not show the suggestion list', function() {
          atom.config.set('autocomplete-plus.enableBuiltinProvider', false);
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          triggerAutocompletion(editor);
          return runs(function() {
            return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          });
        });
      });
      describe('when the buffer changes', function() {
        it('should show the suggestion list when suggestions are found', function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          triggerAutocompletion(editor);
          return runs(function() {
            var suggestions;
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            suggestions = ['function', 'if', 'left', 'shift'];
            return [].forEach.call(editorView.querySelectorAll('.autocomplete-plus li span.word'), function(item, index) {
              return expect(item.innerText).toEqual(suggestions[index]);
            });
          });
        });
        it('should not show the suggestion list when no suggestions are found', function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.moveToBottom();
          editor.insertText('x');
          waitForAutocomplete();
          return runs(function() {
            return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          });
        });
        it('shows the suggestion list on backspace if allowed', function() {
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            editor.moveToBottom();
            editor.insertText('f');
            editor.insertText('u');
            return waitForAutocomplete();
          });
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            editor.insertText(' ');
            return waitForAutocomplete();
          });
          runs(function() {
            var key;
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          runs(function() {
            var key;
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          return runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            return expect(editor.lineTextForBufferRow(13)).toBe('f');
          });
        });
        it('does not shows the suggestion list on backspace if disallowed', function() {
          runs(function() {
            atom.config.set('autocomplete-plus.backspaceTriggersAutocomplete', false);
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            editor.moveToBottom();
            editor.insertText('f');
            editor.insertText('u');
            return waitForAutocomplete();
          });
          runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            editor.insertText(' ');
            return waitForAutocomplete();
          });
          runs(function() {
            var key;
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          runs(function() {
            var key;
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          return runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            return expect(editor.lineTextForBufferRow(13)).toBe('f');
          });
        });
        it("keeps the suggestion list open when it's already open on backspace", function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.moveToBottom();
          editor.insertText('f');
          editor.insertText('u');
          waitForAutocomplete();
          runs(function() {
            var key;
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          return runs(function() {
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            return expect(editor.lineTextForBufferRow(13)).toBe('f');
          });
        });
        it("does not open the suggestion on backspace when it's closed", function() {
          atom.config.set('autocomplete-plus.backspaceTriggersAutocomplete', false);
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.setCursorBufferPosition([2, 39]);
          runs(function() {
            var key;
            key = atom.keymaps.constructor.buildKeydownEvent('backspace', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            return waitForAutocomplete();
          });
          return runs(function() {
            return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          });
        });
        it('should not update the suggestion list while composition is in progress', function() {
          var activeElement;
          triggerAutocompletion(editor);
          activeElement = editorView.rootElement.querySelector('input');
          runs(function() {
            spyOn(autocompleteManager.suggestionList, 'changeItems').andCallThrough();
            expect(autocompleteManager.suggestionList.changeItems).not.toHaveBeenCalled();
            activeElement.dispatchEvent(buildIMECompositionEvent('compositionstart', {
              target: activeElement
            }));
            activeElement.dispatchEvent(buildIMECompositionEvent('compositionupdate', {
              data: '~',
              target: activeElement
            }));
            return waitForAutocomplete();
          });
          return runs(function() {
            expect(autocompleteManager.suggestionList.changeItems).not.toHaveBeenCalled();
            activeElement.dispatchEvent(buildIMECompositionEvent('compositionend', {
              target: activeElement
            }));
            activeElement.dispatchEvent(buildTextInputEvent({
              data: 'ã',
              target: activeElement
            }));
            return expect(editor.lineTextForBufferRow(13)).toBe('fã');
          });
        });
        return it('does not show the suggestion list when it is triggered then no longer needed', function() {
          runs(function() {
            editor.moveToBottom();
            editor.insertText('f');
            editor.insertText('u');
            editor.insertText(' ');
            return waitForAutocomplete();
          });
          return runs(function() {
            return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          });
        });
      });
      describe("when the matched prefix is highlighted", function() {
        it('highlights the prefix of the word in the suggestion list', function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.moveToBottom();
          editor.insertText('i');
          editor.insertText('e');
          editor.insertText('m');
          waitForAutocomplete();
          return runs(function() {
            var word;
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            word = editorView.querySelector('.autocomplete-plus li span.word');
            expect(word.childNodes).toHaveLength(5);
            expect(word.childNodes[0]).toHaveClass('character-match');
            expect(word.childNodes[1]).not.toHaveClass('character-match');
            expect(word.childNodes[2]).toHaveClass('character-match');
            expect(word.childNodes[3]).toHaveClass('character-match');
            return expect(word.childNodes[4]).not.toHaveClass('character-match');
          });
        });
        return it('highlights repeated characters in the prefix', function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.moveToBottom();
          editor.insertText('a');
          editor.insertText('p');
          editor.insertText('p');
          waitForAutocomplete();
          return runs(function() {
            var word;
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            word = editorView.querySelector('.autocomplete-plus li span.word');
            expect(word.childNodes).toHaveLength(5);
            expect(word.childNodes[0]).toHaveClass('character-match');
            expect(word.childNodes[1]).toHaveClass('character-match');
            expect(word.childNodes[2]).toHaveClass('character-match');
            expect(word.childNodes[3]).not.toHaveClass('character-match');
            return expect(word.childNodes[4]).not.toHaveClass('character-match');
          });
        });
      });
      describe('accepting suggestions', function() {
        it('hides the suggestions list when a suggestion is confirmed', function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          editor.moveToBottom();
          editor.moveToBeginningOfLine();
          editor.insertText('f');
          waitForAutocomplete();
          return runs(function() {
            var suggestionListView;
            expect(editorView.querySelector('.autocomplete-plus')).toExist();
            suggestionListView = atom.views.getView(autocompleteManager.suggestionList);
            atom.commands.dispatch(suggestionListView, 'autocomplete-plus:confirm');
            return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          });
        });
        describe('when tab is used to accept suggestions', function() {
          beforeEach(function() {
            return atom.config.set('autocomplete-plus.confirmCompletion', 'tab');
          });
          it('inserts the word and moves the cursor to the end of the word', function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            triggerAutocompletion(editor);
            return runs(function() {
              var bufferPosition, key;
              key = atom.keymaps.constructor.buildKeydownEvent('tab', {
                target: document.activeElement
              });
              atom.keymaps.handleKeyboardEvent(key);
              expect(editor.getBuffer().getLastLine()).toEqual('function');
              bufferPosition = editor.getCursorBufferPosition();
              expect(bufferPosition.row).toEqual(13);
              return expect(bufferPosition.column).toEqual(8);
            });
          });
          return it('does not insert the word when enter completion not enabled', function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            triggerAutocompletion(editor);
            return runs(function() {
              var key;
              key = atom.keymaps.constructor.buildKeydownEvent('enter', {
                keyCode: 13,
                target: document.activeElement
              });
              atom.keymaps.handleKeyboardEvent(key);
              return expect(editor.getBuffer().getLastLine()).toEqual('');
            });
          });
        });
        return describe('when enter is used to accept suggestions', function() {
          beforeEach(function() {
            return atom.config.set('autocomplete-plus.confirmCompletion', 'enter');
          });
          it('inserts the word and moves the cursor to the end of the word', function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            triggerAutocompletion(editor);
            return runs(function() {
              var bufferPosition, key;
              key = atom.keymaps.constructor.buildKeydownEvent('enter', {
                target: document.activeElement
              });
              atom.keymaps.handleKeyboardEvent(key);
              expect(editor.getBuffer().getLastLine()).toEqual('function');
              bufferPosition = editor.getCursorBufferPosition();
              expect(bufferPosition.row).toEqual(13);
              return expect(bufferPosition.column).toEqual(8);
            });
          });
          return it('does not insert the word when tab completion not enabled', function() {
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            triggerAutocompletion(editor);
            return runs(function() {
              var key;
              key = atom.keymaps.constructor.buildKeydownEvent('tab', {
                target: document.activeElement
              });
              atom.keymaps.handleKeyboardEvent(key);
              return expect(editor.getBuffer().getLastLine()).toEqual('f ');
            });
          });
        });
      });
      describe('select-previous event', function() {
        it('selects the previous item in the list', function() {
          triggerAutocompletion(editor);
          return runs(function() {
            var items, suggestionListView;
            items = editorView.querySelectorAll('.autocomplete-plus li');
            expect(items[0]).toHaveClass('selected');
            expect(items[1]).not.toHaveClass('selected');
            expect(items[2]).not.toHaveClass('selected');
            expect(items[3]).not.toHaveClass('selected');
            suggestionListView = atom.views.getView(autocompleteManager.suggestionList);
            atom.commands.dispatch(suggestionListView, 'autocomplete-plus:select-previous');
            items = editorView.querySelectorAll('.autocomplete-plus li');
            expect(items[0]).not.toHaveClass('selected');
            expect(items[1]).not.toHaveClass('selected');
            expect(items[2]).not.toHaveClass('selected');
            return expect(items[3]).toHaveClass('selected');
          });
        });
        it('closes the autocomplete when up arrow pressed when only one item displayed', function() {
          triggerAutocompletion(editor, false, 'q');
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('down', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            advanceClock(1);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).not.toExist();
          });
        });
        it('does not close the autocomplete when down arrow pressed when many items', function() {
          triggerAutocompletion(editor);
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('down', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).toExist();
          });
        });
        return it('does close the autocomplete when down arrow while up,down navigation not selected', function() {
          atom.config.set('autocomplete-plus.navigateCompletions', 'ctrl-p,ctrl-n');
          triggerAutocompletion(editor, false);
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('down', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            advanceClock(1);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).not.toExist();
          });
        });
      });
      describe('select-next event', function() {
        it('selects the next item in the list', function() {
          triggerAutocompletion(editor);
          return runs(function() {
            var items, suggestionListView;
            items = editorView.querySelectorAll('.autocomplete-plus li');
            expect(items[0]).toHaveClass('selected');
            expect(items[1]).not.toHaveClass('selected');
            expect(items[2]).not.toHaveClass('selected');
            expect(items[3]).not.toHaveClass('selected');
            suggestionListView = atom.views.getView(autocompleteManager.suggestionList);
            atom.commands.dispatch(suggestionListView, 'autocomplete-plus:select-next');
            items = editorView.querySelectorAll('.autocomplete-plus li');
            expect(items[0]).not.toHaveClass('selected');
            expect(items[1]).toHaveClass('selected');
            expect(items[2]).not.toHaveClass('selected');
            return expect(items[3]).not.toHaveClass('selected');
          });
        });
        it('closes the autocomplete when up arrow pressed when only one item displayed', function() {
          triggerAutocompletion(editor, false, 'q');
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('up', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            advanceClock(1);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).not.toExist();
          });
        });
        it('does not close the autocomplete when up arrow pressed when many items', function() {
          triggerAutocompletion(editor);
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('up', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).toExist();
          });
        });
        return it('does close the autocomplete when up arrow while up,down navigation not selected', function() {
          atom.config.set('autocomplete-plus.navigateCompletions', 'ctrl-p,ctrl-n');
          triggerAutocompletion(editor);
          return runs(function() {
            var autocomplete, key;
            key = atom.keymaps.constructor.buildKeydownEvent('up', {
              target: document.activeElement
            });
            atom.keymaps.handleKeyboardEvent(key);
            advanceClock(1);
            autocomplete = editorView.querySelector('.autocomplete-plus');
            return expect(autocomplete).not.toExist();
          });
        });
      });
      describe('when a suggestion is clicked', function() {
        return it('should select the item and confirm the selection', function() {
          triggerAutocompletion(editor);
          return runs(function() {
            var item, mouse;
            item = editorView.querySelectorAll('.autocomplete-plus li')[1];
            mouse = document.createEvent('MouseEvents');
            mouse.initMouseEvent('mousedown', true, true, window);
            item.dispatchEvent(mouse);
            mouse = document.createEvent('MouseEvents');
            mouse.initMouseEvent('mouseup', true, true, window);
            item.dispatchEvent(mouse);
            expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
            return expect(editor.getBuffer().getLastLine()).toEqual(item.innerText);
          });
        });
      });
      return describe('.cancel()', function() {
        return it('unbinds autocomplete event handlers for move-up and move-down', function() {
          triggerAutocompletion(editor, false);
          autocompleteManager.hideSuggestionList();
          editorView = atom.views.getView(editor);
          atom.commands.dispatch(editorView, 'core:move-down');
          expect(editor.getCursorBufferPosition().row).toBe(1);
          atom.commands.dispatch(editorView, 'core:move-up');
          return expect(editor.getCursorBufferPosition().row).toBe(0);
        });
      });
    });
    describe('when a long completion exists', function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set('autocomplete-plus.enableAutoActivation', true);
        });
        waitsForPromise(function() {
          return atom.workspace.open('samplelong.js').then(function(e) {
            return editor = e;
          });
        });
        return waitsForPromise(function() {
          return atom.packages.activatePackage('autocomplete-plus').then(function(a) {
            mainModule = a.mainModule;
            return autocompleteManager = mainModule.autocompleteManager;
          });
        });
      });
      return it('sets the width of the view to be wide enough to contain the longest completion without scrolling', function() {
        editor.moveToBottom();
        editor.insertNewline();
        editor.insertText('t');
        waitForAutocomplete();
        return runs(function() {
          var suggestionListView;
          suggestionListView = atom.views.getView(autocompleteManager.suggestionList);
          return expect(suggestionListView.scrollWidth).toBe(suggestionListView.offsetWidth);
        });
      });
    });
    return describe('when auto-activation is disabled', function() {
      beforeEach(function() {
        runs(function() {
          return atom.config.set('autocomplete-plus.enableAutoActivation', false);
        });
        waitsForPromise(function() {
          return atom.workspace.open('sample.js').then(function(e) {
            editor = e;
            return editorView = atom.views.getView(e);
          });
        });
        return waitsForPromise(function() {
          return atom.packages.activatePackage('autocomplete-plus').then(function(a) {
            mainModule = a.mainModule;
            return autocompleteManager = mainModule.autocompleteManager;
          });
        });
      });
      it('does not show suggestions after a delay', function() {
        triggerAutocompletion(editor);
        return runs(function() {
          return expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
        });
      });
      return it('shows suggestions when explicitly triggered', function() {
        triggerAutocompletion(editor);
        runs(function() {
          expect(editorView.querySelector('.autocomplete-plus')).not.toExist();
          atom.commands.dispatch(editorView, 'autocomplete-plus:activate');
          return waitForAutocomplete();
        });
        return runs(function() {
          return expect(editorView.querySelector('.autocomplete-plus')).toExist();
        });
      });
    });
  });

}).call(this);
