(function() {
  var CompositeDisposable, MarkerMixin, Mixin,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Mixin = require('mixto');

  CompositeDisposable = require('event-kit').CompositeDisposable;

  module.exports = MarkerMixin = (function(_super) {
    __extends(MarkerMixin, _super);

    function MarkerMixin() {
      return MarkerMixin.__super__.constructor.apply(this, arguments);
    }

    MarkerMixin.prototype.addClass = function(cls) {
      return this.classList.add(cls);
    };

    MarkerMixin.prototype.removeClass = function(cls) {
      return this.classList.remove(cls);
    };

    MarkerMixin.prototype.remove = function() {
      var _ref;
      this.subscriptions.dispose();
      this.marker = null;
      this.editor = null;
      this.editor = null;
      return (_ref = this.parentNode) != null ? _ref.removeChild(this) : void 0;
    };

    MarkerMixin.prototype.show = function() {
      if (!this.isHidden()) {
        return this.style.display = "";
      }
    };

    MarkerMixin.prototype.hide = function() {
      return this.style.display = "none";
    };

    MarkerMixin.prototype.isVisible = function() {
      var newScreenRange, oldScreenRange;
      oldScreenRange = this.oldScreenRange;
      newScreenRange = this.getScreenRange();
      this.oldScreenRange = newScreenRange;
      return this.intersectsRenderedScreenRows(oldScreenRange) || this.intersectsRenderedScreenRows(newScreenRange);
    };

    MarkerMixin.prototype.subscribeToMarker = function() {
      if (this.subscriptions == null) {
        this.subscriptions = new CompositeDisposable;
      }
      this.subscriptions.add(this.marker.onDidChange((function(_this) {
        return function(e) {
          return _this.onMarkerChanged(e);
        };
      })(this)));
      this.subscriptions.add(this.marker.onDidDestroy((function(_this) {
        return function(e) {
          return _this.remove();
        };
      })(this)));
      return this.subscriptions.add(this.editor.onDidChangeScrollTop((function(_this) {
        return function(e) {
          return _this.updateDisplay();
        };
      })(this)));
    };

    MarkerMixin.prototype.onMarkerChanged = function(_arg) {
      var isValid;
      isValid = _arg.isValid;
      this.updateNeeded = isValid;
      this.updateDisplay();
      return this.updateVisibility();
    };

    MarkerMixin.prototype.updateVisibility = function() {
      if (this.isVisible()) {
        return this.show();
      } else {
        return this.hide();
      }
    };

    MarkerMixin.prototype.isUpdateNeeded = function() {
      if (!this.updateNeeded) {
        return false;
      }
      return this.isVisible();
    };

    MarkerMixin.prototype.intersectsRenderedScreenRows = function(range) {
      return range.intersectsRowRange(this.editorElement.getFirstVisibleScreenRow(), this.editorElement.getLastVisibleScreenRow());
    };

    MarkerMixin.prototype.isHidden = function() {
      return this.hiddenDueToComment() || this.hiddenDueToString();
    };

    MarkerMixin.prototype.getScope = function(bufferRange) {
      var descriptor;
      if (this.editor.displayBuffer.scopesForBufferPosition != null) {
        return this.editor.displayBuffer.scopesForBufferPosition(bufferRange.start).join(';');
      } else {
        descriptor = this.editor.displayBuffer.scopeDescriptorForBufferPosition(bufferRange.start);
        if (descriptor.join != null) {
          return descriptor.join(';');
        } else {
          return descriptor.scopes.join(';');
        }
      }
    };

    MarkerMixin.prototype.hiddenDueToComment = function() {
      var bufferRange, scope;
      bufferRange = this.getBufferRange();
      scope = this.getScope(bufferRange);
      return atom.config.get('atom-color-highlight.hideMarkersInComments') && (scope.match(/comment/) != null);
    };

    MarkerMixin.prototype.hiddenDueToString = function() {
      var bufferRange, scope;
      bufferRange = this.getBufferRange();
      scope = this.getScope(bufferRange);
      return atom.config.get('atom-color-highlight.hideMarkersInStrings') && (scope.match(/string/) != null);
    };

    MarkerMixin.prototype.getColor = function() {
      var _ref;
      return (_ref = this.marker) != null ? _ref.bufferMarker.properties.cssColor : void 0;
    };

    MarkerMixin.prototype.getColorText = function() {
      var _ref;
      return (_ref = this.marker) != null ? _ref.bufferMarker.properties.color : void 0;
    };

    MarkerMixin.prototype.getColorTextColor = function() {
      var _ref;
      return (_ref = this.marker) != null ? _ref.bufferMarker.properties.textColor : void 0;
    };

    MarkerMixin.prototype.getScreenRange = function() {
      var _ref;
      return (_ref = this.marker) != null ? _ref.getScreenRange() : void 0;
    };

    MarkerMixin.prototype.getBufferRange = function() {
      var _ref;
      return (_ref = this.marker) != null ? _ref.getBufferRange() : void 0;
    };

    return MarkerMixin;

  })(Mixin);

}).call(this);
