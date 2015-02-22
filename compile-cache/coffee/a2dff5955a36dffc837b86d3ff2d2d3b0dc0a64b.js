(function() {
  var $, $$, AutocompleteView, BufferedProcess, Range, SelectListView, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore-plus');

  _ref = require('atom'), $ = _ref.$, $$ = _ref.$$, Range = _ref.Range, SelectListView = _ref.SelectListView, BufferedProcess = _ref.BufferedProcess;

  module.exports = AutocompleteView = (function(_super) {
    __extends(AutocompleteView, _super);

    function AutocompleteView() {
      return AutocompleteView.__super__.constructor.apply(this, arguments);
    }

    AutocompleteView.prototype.currentBuffer = null;

    AutocompleteView.prototype.wordList = null;

    AutocompleteView.prototype.wordRegex = /\w+/g;

    AutocompleteView.prototype.originalSelectionBufferRanges = null;

    AutocompleteView.prototype.originalCursorPosition = null;

    AutocompleteView.prototype.aboveCursor = false;

    AutocompleteView.prototype.candidates = [];

    AutocompleteView.prototype.numPrefix = 0;

    AutocompleteView.prototype.initialize = function(editorView) {
      this.editorView = editorView;
      AutocompleteView.__super__.initialize.apply(this, arguments);
      this.addClass('autocomplete popover-list gocode');
      this.editor = this.editorView.editor;
      this.handleEvents();
      return this.setCurrentBuffer(this.editor.getBuffer());
    };

    AutocompleteView.prototype.getFilterKey = function() {
      return 'word';
    };

    AutocompleteView.prototype.viewForItem = function(_arg) {
      var word;
      word = _arg.word;
      return $$(function() {
        return this.li((function(_this) {
          return function() {
            return _this.span(word);
          };
        })(this));
      });
    };

    AutocompleteView.prototype.handleEvents = function() {
      this.list.on('mousewheel', function(event) {
        return event.stopPropagation();
      });
      this.editorView.on('editor:path-changed', (function(_this) {
        return function() {
          return _this.setCurrentBuffer(_this.editor.getBuffer());
        };
      })(this));
      this.editorView.command('gocode:toggle', (function(_this) {
        return function() {
          if (_this.hasParent()) {
            return _this.cancel();
          } else {
            return _this.attach();
          }
        };
      })(this));
      this.editorView.command('gocode:next', (function(_this) {
        return function() {
          return _this.selectNextItemView();
        };
      })(this));
      this.editorView.command('gocode:previous', (function(_this) {
        return function() {
          return _this.selectPreviousItemView();
        };
      })(this));
      return this.filterEditorView.preempt('textInput', (function(_this) {
        return function(_arg) {
          var originalEvent, text;
          originalEvent = _arg.originalEvent;
          text = originalEvent.data;
          if (!text.match(_this.wordRegex)) {
            _this.confirmSelection();
            _this.editor.insertText(text);
            return false;
          }
        };
      })(this));
    };

    AutocompleteView.prototype.setCurrentBuffer = function(currentBuffer) {
      this.currentBuffer = currentBuffer;
    };

    AutocompleteView.prototype.selectItemView = function(item) {
      var match;
      AutocompleteView.__super__.selectItemView.apply(this, arguments);
      if (match = this.getSelectedItem()) {
        return this.replaceSelectedTextWithMatch(match);
      }
    };

    AutocompleteView.prototype.selectNextItemView = function() {
      AutocompleteView.__super__.selectNextItemView.apply(this, arguments);
      return false;
    };

    AutocompleteView.prototype.selectPreviousItemView = function() {
      AutocompleteView.__super__.selectPreviousItemView.apply(this, arguments);
      return false;
    };

    AutocompleteView.prototype.getCompletionsForCursorScope = function() {
      var completions, cursorScope;
      cursorScope = this.editor.scopesForBufferPosition(this.editor.getCursorBufferPosition());
      completions = atom.syntax.propertiesForScope(cursorScope, 'editor.completions');
      completions = completions.map(function(properties) {
        return _.valueForKeyPath(properties, 'editor.completions');
      });
      return _.uniq(_.flatten(completions));
    };

    AutocompleteView.prototype.confirmed = function(match) {
      this.editor.getSelections().forEach(function(selection) {
        return selection.clear();
      });
      this.cancel();
      if (!match) {
        return;
      }
      this.replaceSelectedTextWithMatch(match);
      return this.editor.getCursors().forEach(function(cursor) {
        var position;
        position = cursor.getBufferPosition();
        return cursor.setBufferPosition([position.row, position.column + match.suffix.length]);
      });
    };

    AutocompleteView.prototype.cancelled = function() {
      AutocompleteView.__super__.cancelled.apply(this, arguments);
      this.editor.abortTransaction();
      this.editor.setSelectedBufferRanges(this.originalSelectionBufferRanges);
      return this.editorView.focus();
    };

    AutocompleteView.prototype.attach = function() {
      var cursor, offset, out, process;
      this.editor.beginTransaction();
      this.aboveCursor = false;
      this.originalSelectionBufferRanges = this.editor.getSelections().map(function(selection) {
        return selection.getBufferRange();
      });
      this.originalCursorPosition = this.editor.getCursorScreenPosition();
      if (!this.allPrefixAndSuffixOfSelectionsMatch()) {
        return this.cancel();
      }
      this.numPrefix = 0;
      this.candidates = [];
      cursor = this.editor.getCursorBufferPosition();
      offset = this.editor.getBuffer().characterIndexForPosition(cursor);
      out = "";
      process = new BufferedProcess({
        command: "gocode",
        args: ["-f=json", "autocomplete", offset],
        options: {
          stdio: "pipe"
        },
        stdout: function(o) {
          return out += o;
        },
        stderr: function(o) {
          return console.log(o);
        },
        exit: (function(_this) {
          return function(code) {
            var c, items, prefix, res, _i, _len, _ref1;
            if (code || !out) {
              return console.log("gocode exited status:", code);
            } else {
              res = JSON.parse(out);
              _this.numPrefix = res[0];
              _this.candidates = res[1];
              if (!_this.candidates) {
                return;
              }
              items = [];
              _ref1 = _this.candidates;
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                c = _ref1[_i];
                prefix = c.name.substring(0, _this.numPrefix);
                items.push({
                  word: c.name,
                  prefix: prefix,
                  suffix: ""
                });
              }
              _this.setItems(items);
              if (items.length === 1) {
                return _this.confirmSelection();
              } else {
                _this.editorView.appendToLinesView(_this);
                _this.setPosition();
                return _this.focusFilterEditor();
              }
            }
          };
        })(this)
      });
      process.process.stdin.write(atom.workspace.activePaneItem.buffer.cachedText);
      return process.process.stdin.end();
    };

    AutocompleteView.prototype.setPosition = function() {
      var height, left, parentWidth, potentialBottom, potentialTop, top, width, _ref1;
      _ref1 = this.editorView.pixelPositionForScreenPosition(this.originalCursorPosition), left = _ref1.left, top = _ref1.top;
      height = this.outerHeight();
      width = this.outerWidth();
      potentialTop = top + this.editorView.lineHeight;
      potentialBottom = potentialTop - this.editorView.scrollTop() + height;
      parentWidth = this.parent().width();
      if (left + width > parentWidth) {
        left = parentWidth - width;
      }
      if (this.aboveCursor || potentialBottom > this.editorView.outerHeight()) {
        this.aboveCursor = true;
        return this.css({
          left: left,
          top: top - height,
          bottom: 'inherit'
        });
      } else {
        return this.css({
          left: left,
          top: potentialTop,
          bottom: 'inherit'
        });
      }
    };

    AutocompleteView.prototype.replaceSelectedTextWithMatch = function(match) {
      var newSelectedBufferRanges, selections;
      newSelectedBufferRanges = [];
      selections = this.editor.getSelections();
      selections.forEach((function(_this) {
        return function(selection, i) {
          var buffer, cursorPosition, infixLength, startPosition;
          startPosition = selection.getBufferRange().start;
          buffer = _this.editor.getBuffer();
          selection.deleteSelectedText();
          cursorPosition = _this.editor.getCursors()[i].getBufferPosition();
          buffer["delete"](Range.fromPointWithDelta(cursorPosition, 0, match.suffix.length));
          buffer["delete"](Range.fromPointWithDelta(cursorPosition, 0, -match.prefix.length));
          infixLength = match.word.length - match.prefix.length - match.suffix.length;
          return newSelectedBufferRanges.push([startPosition, [startPosition.row, startPosition.column + infixLength]]);
        };
      })(this));
      this.editor.insertText(match.word);
      return this.editor.setSelectedBufferRanges(newSelectedBufferRanges);
    };

    AutocompleteView.prototype.prefixAndSuffixOfSelection = function(selection) {
      var lineRange, prefix, selectionRange, suffix, _ref1;
      selectionRange = selection.getBufferRange();
      lineRange = [[selectionRange.start.row, 0], [selectionRange.end.row, this.editor.lineLengthForBufferRow(selectionRange.end.row)]];
      _ref1 = ["", ""], prefix = _ref1[0], suffix = _ref1[1];
      this.currentBuffer.scanInRange(this.wordRegex, lineRange, function(_arg) {
        var match, prefixOffset, range, stop, suffixOffset;
        match = _arg.match, range = _arg.range, stop = _arg.stop;
        if (range.start.isGreaterThan(selectionRange.end)) {
          stop();
        }
        if (range.intersectsWith(selectionRange)) {
          prefixOffset = selectionRange.start.column - range.start.column;
          suffixOffset = selectionRange.end.column - range.end.column;
          if (range.start.isLessThan(selectionRange.start)) {
            prefix = match[0].slice(0, prefixOffset);
          }
          if (range.end.isGreaterThan(selectionRange.end)) {
            return suffix = match[0].slice(suffixOffset);
          }
        }
      });
      return {
        prefix: prefix,
        suffix: suffix
      };
    };

    AutocompleteView.prototype.allPrefixAndSuffixOfSelectionsMatch = function() {
      var prefix, suffix, _ref1;
      _ref1 = {}, prefix = _ref1.prefix, suffix = _ref1.suffix;
      return this.editor.getSelections().every((function(_this) {
        return function(selection) {
          var previousPrefix, previousSuffix, _ref2, _ref3;
          _ref2 = [prefix, suffix], previousPrefix = _ref2[0], previousSuffix = _ref2[1];
          _ref3 = _this.prefixAndSuffixOfSelection(selection), prefix = _ref3.prefix, suffix = _ref3.suffix;
          if (!((previousPrefix != null) && (previousSuffix != null))) {
            return true;
          }
          return prefix === previousPrefix && suffix === previousSuffix;
        };
      })(this));
    };

    AutocompleteView.prototype.afterAttach = function(onDom) {
      var widestCompletion;
      if (onDom) {
        widestCompletion = parseInt(this.css('min-width')) || 0;
        this.list.find('span').each(function() {
          return widestCompletion = Math.max(widestCompletion, $(this).outerWidth());
        });
        this.list.width(widestCompletion);
        return this.width(this.list.outerWidth());
      }
    };

    AutocompleteView.prototype.populateList = function() {
      AutocompleteView.__super__.populateList.apply(this, arguments);
      return this.setPosition();
    };

    return AutocompleteView;

  })(SelectListView);

}).call(this);
