(function() {
  var CompositeDisposable, MarkerElement, MarkerMixin,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  MarkerMixin = require('./marker-mixin');

  module.exports = MarkerElement = (function(_super) {
    __extends(MarkerElement, _super);

    function MarkerElement() {
      this.updateDisplay = __bind(this.updateDisplay, this);
      return MarkerElement.__super__.constructor.apply(this, arguments);
    }

    MarkerMixin.includeInto(MarkerElement);

    MarkerElement.prototype.createdCallback = function() {
      return this.regions = [];
    };

    MarkerElement.prototype.init = function(_arg) {
      this.editorElement = _arg.editorElement, this.editor = _arg.editor, this.marker = _arg.marker;
      this.updateNeeded = this.marker.isValid();
      this.oldScreenRange = this.getScreenRange();
      this.subscribeToMarker();
      return this.updateDisplay();
    };

    MarkerElement.prototype.updateDisplay = function() {
      var range, rowSpan;
      if (!this.isUpdateNeeded()) {
        return;
      }
      this.updateNeeded = false;
      this.clearRegions();
      range = this.getScreenRange();
      if (range.isEmpty()) {
        return;
      }
      if (this.isHidden()) {
        this.hide();
      }
      rowSpan = range.end.row - range.start.row;
      if (rowSpan === 0) {
        return this.appendRegion(1, range.start, range.end);
      } else {
        this.appendRegion(1, range.start, {
          row: range.start.row,
          column: Infinity
        });
        if (rowSpan > 1) {
          this.appendRegion(rowSpan - 1, {
            row: range.start.row + 1,
            column: 0
          }, {
            row: range.start.row + 1,
            column: Infinity
          });
        }
        return this.appendRegion(1, {
          row: range.end.row,
          column: 0
        }, range.end);
      }
    };

    MarkerElement.prototype.appendRegion = function(rows, start, end) {
      var bufferRange, charWidth, color, colorText, css, lineHeight, name, region, text, value, _ref;
      _ref = this.editorElement, lineHeight = _ref.lineHeight, charWidth = _ref.charWidth;
      color = this.getColor();
      colorText = this.getColorTextColor();
      bufferRange = this.editor.bufferRangeForScreenRange({
        start: start,
        end: end
      });
      text = this.editor.getTextInRange(bufferRange);
      css = this.editorElement.pixelPositionForScreenPosition(start);
      css.height = lineHeight * rows;
      if (end) {
        css.width = this.editorElement.pixelPositionForScreenPosition(end).left - css.left;
      } else {
        css.right = 0;
      }
      region = document.createElement('div');
      region.className = 'region';
      region.textContent = text;
      for (name in css) {
        value = css[name];
        region.style[name] = value + 'px';
      }
      region.style.backgroundColor = color;
      region.style.color = colorText;
      this.appendChild(region);
      return this.regions.push(region);
    };

    MarkerElement.prototype.clearRegions = function() {
      var region, _i, _len, _ref;
      _ref = this.regions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        region = _ref[_i];
        region.remove();
      }
      return this.regions = [];
    };

    return MarkerElement;

  })(HTMLElement);

  module.exports = MarkerElement = document.registerElement('color-marker', {
    prototype: MarkerElement.prototype
  });

}).call(this);
