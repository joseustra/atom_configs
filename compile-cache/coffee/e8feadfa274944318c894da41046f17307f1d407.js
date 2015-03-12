(function() {
  var CompositeDisposable, SuggestionListElement, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('atom').CompositeDisposable;

  _ = require('underscore-plus');

  SuggestionListElement = (function(_super) {
    __extends(SuggestionListElement, _super);

    function SuggestionListElement() {
      return SuggestionListElement.__super__.constructor.apply(this, arguments);
    }

    SuggestionListElement.prototype.maxItems = 1000;

    SuggestionListElement.prototype.snippetRegex = /\$\{[0-9]+:([^}]+)\}/g;

    SuggestionListElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      this.classList.add('popover-list', 'select-list', 'autocomplete-suggestion-list');
      return this.registerMouseHandling();
    };

    SuggestionListElement.prototype.attachedCallback = function() {
      this.parentElement.classList.add('autocomplete-plus');
      this.addActiveClassToEditor();
      if (!this.ol) {
        this.renderList();
      }
      this.calculateMaxListHeight();
      return this.itemsChanged();
    };

    SuggestionListElement.prototype.detachedCallback = function() {
      return this.removeActiveClassFromEditor();
    };

    SuggestionListElement.prototype.initialize = function(model) {
      this.model = model;
      if (model == null) {
        return;
      }
      this.subscriptions.add(this.model.onDidChangeItems(this.itemsChanged.bind(this)));
      this.subscriptions.add(this.model.onDidSelectNext(this.moveSelectionDown.bind(this)));
      this.subscriptions.add(this.model.onDidSelectPrevious(this.moveSelectionUp.bind(this)));
      this.subscriptions.add(this.model.onDidConfirmSelection(this.confirmSelection.bind(this)));
      this.subscriptions.add(this.model.onDidDispose(this.dispose.bind(this)));
      return this;
    };

    SuggestionListElement.prototype.registerMouseHandling = function() {
      this.onmousewheel = function(event) {
        return event.stopPropagation();
      };
      this.onmousedown = function(event) {
        var item, _ref, _ref1;
        item = event.target;
        while (!((_ref = item.dataset) != null ? _ref.index : void 0) && item !== this) {
          item = item.parentNode;
        }
        this.selectedIndex = (_ref1 = item.dataset) != null ? _ref1.index : void 0;
        return event.stopPropagation();
      };
      return this.onmouseup = function(event) {
        event.stopPropagation();
        return this.confirmSelection();
      };
    };

    SuggestionListElement.prototype.itemsChanged = function() {
      this.selectedIndex = 0;
      return this.renderItems();
    };

    SuggestionListElement.prototype.addActiveClassToEditor = function() {
      var editorElement, _ref;
      editorElement = atom.views.getView(atom.workspace.getActiveTextEditor());
      return editorElement != null ? (_ref = editorElement.classList) != null ? _ref.add('autocomplete-active') : void 0 : void 0;
    };

    SuggestionListElement.prototype.removeActiveClassFromEditor = function() {
      var editorElement, _ref;
      editorElement = atom.views.getView(atom.workspace.getActiveTextEditor());
      return editorElement != null ? (_ref = editorElement.classList) != null ? _ref.remove('autocomplete-active') : void 0 : void 0;
    };

    SuggestionListElement.prototype.moveSelectionUp = function() {
      if (!(this.selectedIndex <= 0)) {
        return this.setSelectedIndex(this.selectedIndex - 1);
      } else {
        return this.setSelectedIndex(this.visibleItems().length - 1);
      }
    };

    SuggestionListElement.prototype.moveSelectionDown = function() {
      if (!(this.selectedIndex >= (this.visibleItems().length - 1))) {
        return this.setSelectedIndex(this.selectedIndex + 1);
      } else {
        return this.setSelectedIndex(0);
      }
    };

    SuggestionListElement.prototype.setSelectedIndex = function(index) {
      this.selectedIndex = index;
      return this.renderItems();
    };

    SuggestionListElement.prototype.visibleItems = function() {
      var _ref, _ref1;
      return (_ref = this.model) != null ? (_ref1 = _ref.items) != null ? _ref1.slice(0, this.maxItems) : void 0 : void 0;
    };

    SuggestionListElement.prototype.getSelectedItem = function() {
      var _ref, _ref1;
      return (_ref = this.model) != null ? (_ref1 = _ref.items) != null ? _ref1[this.selectedIndex] : void 0 : void 0;
    };

    SuggestionListElement.prototype.confirmSelection = function() {
      var item;
      if (!this.model.isActive()) {
        return;
      }
      item = this.getSelectedItem();
      if (item != null) {
        return this.model.confirm(item);
      } else {
        return this.model.cancel();
      }
    };

    SuggestionListElement.prototype.renderList = function() {
      this.ol = document.createElement('ol');
      this.appendChild(this.ol);
      return this.ol.className = 'list-group';
    };

    SuggestionListElement.prototype.calculateMaxListHeight = function() {
      var itemHeight, li, maxVisibleItems;
      maxVisibleItems = atom.config.get('autocomplete-plus.maxVisibleSuggestions');
      li = document.createElement('li');
      li.textContent = 'test';
      this.ol.appendChild(li);
      itemHeight = li.offsetHeight;
      this.ol.style['max-height'] = "" + (maxVisibleItems * itemHeight) + "px";
      return li.remove();
    };

    SuggestionListElement.prototype.renderItems = function() {
      var items, li, _ref;
      items = this.visibleItems() || [];
      items.forEach((function(_this) {
        return function(_arg, index) {
          var ch, className, displayHtml, highlightedChar, i, label, labelSpan, lastWordIndex, li, preChar, prefix, renderLabelAsHtml, replacement, snippet, word, wordIndex, wordSpan, _i, _len;
          snippet = _arg.snippet, word = _arg.word, label = _arg.label, renderLabelAsHtml = _arg.renderLabelAsHtml, className = _arg.className, prefix = _arg.prefix;
          li = _this.ol.childNodes[index];
          if (!li) {
            li = document.createElement('li');
            _this.ol.appendChild(li);
            li.dataset.index = index;
          }
          li.className = '';
          if (className) {
            li.classList.add(className);
          }
          if (index === _this.selectedIndex) {
            li.classList.add('selected');
          }
          if (index === _this.selectedIndex) {
            _this.selectedLi = li;
          }
          wordSpan = li.childNodes[0];
          if (!wordSpan) {
            wordSpan = document.createElement('span');
            li.appendChild(wordSpan);
            wordSpan.className = 'word';
          }
          replacement = word;
          if (_.isString(snippet)) {
            replacement = snippet.replace(_this.snippetRegex, function(match, snippetText) {
              return "<span class=\"snippet-completion\">" + snippetText + "</span>";
            });
          }
          displayHtml = '';
          wordIndex = 0;
          lastWordIndex = 0;
          for (i = _i = 0, _len = prefix.length; _i < _len; i = ++_i) {
            ch = prefix[i];
            while (wordIndex < replacement.length && replacement[wordIndex].toLowerCase() !== ch.toLowerCase()) {
              wordIndex += 1;
            }
            preChar = replacement.substring(lastWordIndex, wordIndex);
            highlightedChar = "<span class=\"character-match\">" + replacement[wordIndex] + "</span>";
            displayHtml = "" + displayHtml + preChar + highlightedChar;
            wordIndex += 1;
            lastWordIndex = wordIndex;
          }
          displayHtml += replacement.substring(lastWordIndex);
          wordSpan.innerHTML = displayHtml;
          labelSpan = li.childNodes[1];
          if (label) {
            if (!labelSpan) {
              labelSpan = document.createElement('span');
              if (label) {
                li.appendChild(labelSpan);
              }
              labelSpan.className = 'completion-label text-smaller text-subtle';
            }
            if (renderLabelAsHtml) {
              return labelSpan.innerHTML = label;
            } else {
              return labelSpan.textContent = label;
            }
          } else {
            return labelSpan != null ? labelSpan.remove() : void 0;
          }
        };
      })(this));
      while (li = this.ol.childNodes[items.length]) {
        li.remove();
      }
      return (_ref = this.selectedLi) != null ? _ref.scrollIntoView(false) : void 0;
    };

    SuggestionListElement.prototype.dispose = function() {
      var _ref;
      this.subscriptions.dispose();
      return (_ref = this.parentNode) != null ? _ref.removeChild(this) : void 0;
    };

    return SuggestionListElement;

  })(HTMLElement);

  module.exports = SuggestionListElement = document.registerElement('autocomplete-suggestion-list', {
    prototype: SuggestionListElement.prototype
  });

}).call(this);
