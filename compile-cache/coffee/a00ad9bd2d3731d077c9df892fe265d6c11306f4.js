(function() {
  var AtomColorHighlightElement, CompositeDisposable, Disposable, DotMarkerElement, MarkerElement, _, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore-plus');

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Disposable = _ref.Disposable;

  MarkerElement = require('./marker-element');

  DotMarkerElement = require('./dot-marker-element');

  AtomColorHighlightElement = (function(_super) {
    __extends(AtomColorHighlightElement, _super);

    function AtomColorHighlightElement() {
      return AtomColorHighlightElement.__super__.constructor.apply(this, arguments);
    }

    AtomColorHighlightElement.prototype.createdCallback = function() {
      this.selections = [];
      this.markerViews = {};
      return this.subscriptions = new CompositeDisposable;
    };

    AtomColorHighlightElement.prototype.attach = function() {
      return requestAnimationFrame((function(_this) {
        return function() {
          var editorElement, editorRoot, _ref1, _ref2;
          editorElement = atom.views.getView(_this.model.editor);
          editorRoot = (_ref1 = editorElement.shadowRoot) != null ? _ref1 : editorElement;
          return (_ref2 = editorRoot.querySelector('.lines')) != null ? _ref2.appendChild(_this) : void 0;
        };
      })(this));
    };

    AtomColorHighlightElement.prototype.detachedCallback = function() {
      if (!this.model.isDestroyed()) {
        return this.attach();
      }
    };

    AtomColorHighlightElement.prototype.setModel = function(model) {
      this.model = model;
      this.editor = this.model.editor;
      this.editorElement = atom.views.getView(this.editor);
      this.subscriptions.add(this.model.onDidUpdateMarkers((function(_this) {
        return function(markers) {
          return _this.markersUpdated(markers);
        };
      })(this)));
      this.subscriptions.add(this.model.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidAddCursor((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidRemoveCursor((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidChangeCursorPosition((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidAddSelection((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidRemoveSelection((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidChangeSelectionRange((function(_this) {
        return function() {
          return _this.requestSelectionUpdate();
        };
      })(this)));
      this.subscriptions.add(this.editorElement.onDidAttach((function(_this) {
        return function() {
          _this.updateSelections();
          return _this.updateMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('atom-color-highlight.hideMarkersInComments', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('atom-color-highlight.hideMarkersInStrings', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('atom-color-highlight.markersAtEndOfLine', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('atom-color-highlight.dotMarkersSize', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('atom-color-highlight.dotMarkersSpading', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('editor.lineHeight', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('editor.fontSize', (function(_this) {
        return function() {
          return _this.rebuildMarkers();
        };
      })(this)));
      return this.updateSelections();
    };

    AtomColorHighlightElement.prototype.requestSelectionUpdate = function() {
      if (this.updateRequested) {
        return;
      }
      this.updateRequested = true;
      return requestAnimationFrame((function(_this) {
        return function() {
          _this.updateRequested = false;
          if (_this.editor.getBuffer().isDestroyed()) {
            return;
          }
          return _this.updateSelections();
        };
      })(this));
    };

    AtomColorHighlightElement.prototype.updateSelections = function() {
      var id, range, selection, selections, view, viewRange, viewsToBeDisplayed, _i, _len, _ref1, _ref2, _results;
      if (this.editor.displayBuffer.isDestroyed()) {
        return;
      }
      if (((_ref1 = this.markers) != null ? _ref1.length : void 0) === 0) {
        return;
      }
      selections = this.editor.getSelections();
      viewsToBeDisplayed = _.clone(this.markerViews);
      _ref2 = this.markerViews;
      for (id in _ref2) {
        view = _ref2[id];
        view.removeClass('selected');
        for (_i = 0, _len = selections.length; _i < _len; _i++) {
          selection = selections[_i];
          range = selection.getScreenRange();
          viewRange = view.getScreenRange();
          if (!((viewRange != null) && (range != null))) {
            continue;
          }
          if (viewRange.intersectsWith(range)) {
            view.addClass('selected');
            delete viewsToBeDisplayed[id];
          }
        }
      }
      _results = [];
      for (id in viewsToBeDisplayed) {
        view = viewsToBeDisplayed[id];
        _results.push(view.show());
      }
      return _results;
    };

    AtomColorHighlightElement.prototype.destroy = function() {
      var _ref1;
      this.subscriptions.dispose();
      this.destroyAllViews();
      return (_ref1 = this.parentNode) != null ? _ref1.removeChild(this) : void 0;
    };

    AtomColorHighlightElement.prototype.getMarkerAt = function(position) {
      var id, view, _ref1;
      _ref1 = this.markerViews;
      for (id in _ref1) {
        view = _ref1[id];
        if (view.marker.bufferMarker.containsPoint(position)) {
          return view;
        }
      }
    };

    AtomColorHighlightElement.prototype.removeMarkers = function() {
      var id, markerView, _ref1;
      _ref1 = this.markerViews;
      for (id in _ref1) {
        markerView = _ref1[id];
        markerView.remove();
      }
      return this.markerViews = {};
    };

    AtomColorHighlightElement.prototype.markersUpdated = function(markers) {
      var id, marker, markerView, markerViewsToRemoveById, markersByRows, sortedMarkers, useDots, _i, _j, _len, _len1, _ref1, _results;
      this.markers = markers;
      markerViewsToRemoveById = _.clone(this.markerViews);
      markersByRows = {};
      useDots = atom.config.get('atom-color-highlight.markersAtEndOfLine');
      sortedMarkers = [];
      _ref1 = this.markers;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        marker = _ref1[_i];
        if (marker == null) {
          continue;
        }
        if (this.markerViews[marker.id] != null) {
          delete markerViewsToRemoveById[marker.id];
          if (useDots) {
            sortedMarkers.push(this.markerViews[marker.id]);
          }
        } else {
          if (useDots) {
            markerView = this.createDotMarkerElement(marker, markersByRows);
            sortedMarkers.push(markerView);
          } else {
            markerView = this.createMarkerElement(marker);
          }
          this.appendChild(markerView);
          this.markerViews[marker.id] = markerView;
        }
      }
      for (id in markerViewsToRemoveById) {
        markerView = markerViewsToRemoveById[id];
        delete this.markerViews[id];
        markerView.remove();
      }
      if (useDots) {
        markersByRows = {};
        _results = [];
        for (_j = 0, _len1 = sortedMarkers.length; _j < _len1; _j++) {
          markerView = sortedMarkers[_j];
          markerView.markersByRows = markersByRows;
          markerView.updateNeeded = true;
          markerView.clearPosition = true;
          _results.push(markerView.updateDisplay());
        }
        return _results;
      }
    };

    AtomColorHighlightElement.prototype.rebuildMarkers = function() {
      var marker, markerView, markersByRows, _i, _len, _ref1, _results;
      if (!this.markers) {
        return;
      }
      markersByRows = {};
      _ref1 = this.markers;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        marker = _ref1[_i];
        if (marker == null) {
          continue;
        }
        if (this.markerViews[marker.id] != null) {
          this.markerViews[marker.id].remove();
        }
        if (atom.config.get('atom-color-highlight.markersAtEndOfLine')) {
          markerView = this.createDotMarkerElement(marker, markersByRows);
        } else {
          markerView = this.createMarkerElement(marker);
        }
        this.appendChild(markerView);
        _results.push(this.markerViews[marker.id] = markerView);
      }
      return _results;
    };

    AtomColorHighlightElement.prototype.updateMarkers = function() {
      var id, markerView, _ref1, _results;
      _ref1 = this.markerViews;
      _results = [];
      for (id in _ref1) {
        markerView = _ref1[id];
        _results.push(markerView.updateDisplay());
      }
      return _results;
    };

    AtomColorHighlightElement.prototype.destroyAllViews = function() {
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
      return this.markerViews = {};
    };

    AtomColorHighlightElement.prototype.createMarkerElement = function(marker) {
      var element;
      element = new MarkerElement;
      element.init({
        editorElement: this.editorElement,
        editor: this.editor,
        marker: marker
      });
      return element;
    };

    AtomColorHighlightElement.prototype.createDotMarkerElement = function(marker, markersByRows) {
      var element;
      element = new DotMarkerElement;
      element.init({
        editorElement: this.editorElement,
        editor: this.editor,
        marker: marker,
        markersByRows: markersByRows
      });
      return element;
    };

    return AtomColorHighlightElement;

  })(HTMLElement);

  module.exports = AtomColorHighlightElement = document.registerElement('atom-color-highlight', {
    prototype: AtomColorHighlightElement.prototype
  });

  AtomColorHighlightElement.registerViewProvider = function(modelClass) {
    return atom.views.addViewProvider(modelClass, function(model) {
      var element;
      element = new AtomColorHighlightElement;
      element.setModel(model);
      return element;
    });
  };

}).call(this);
