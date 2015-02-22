(function() {
  var CompositeDisposable, DotMarkerElement, MarkerMixin,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CompositeDisposable = require('event-kit').CompositeDisposable;

  MarkerMixin = require('./marker-mixin');

  module.exports = DotMarkerElement = (function(_super) {
    __extends(DotMarkerElement, _super);

    function DotMarkerElement() {
      this.updateDisplay = __bind(this.updateDisplay, this);
      return DotMarkerElement.__super__.constructor.apply(this, arguments);
    }

    MarkerMixin.includeInto(DotMarkerElement);

    DotMarkerElement.prototype.createdCallback = function() {
      return this.subscriptions = new CompositeDisposable();
    };

    DotMarkerElement.prototype.init = function(_arg) {
      this.editorElement = _arg.editorElement, this.editor = _arg.editor, this.marker = _arg.marker, this.markersByRows = _arg.markersByRows;
      this.innerHTML = '<div class="selector"/>';
      this.updateNeeded = this.marker.isValid();
      this.oldScreenRange = this.getScreenRange();
      this.buffer = this.editor.getBuffer();
      this.clearPosition = true;
      this.subscribeToMarker();
      return this.updateDisplay();
    };

    DotMarkerElement.prototype.updateDisplay = function() {
      var color, colorText, left, line, lineLength, position, range, size, spacing, top, _base, _name, _ref;
      if (!this.isUpdateNeeded()) {
        return;
      }
      this.updateNeeded = false;
      range = this.getScreenRange();
      if (range.isEmpty()) {
        return;
      }
      if (this.isHidden()) {
        this.hide();
      }
      size = this.getSize();
      spacing = this.getSpacing();
      if ((_base = this.markersByRows)[_name = range.start.row] == null) {
        _base[_name] = 0;
      }
      if (this.clearPosition) {
        this.position = this.markersByRows[range.start.row];
        this.clearPosition = false;
      }
      this.markersByRows[range.start.row]++;
      color = this.getColor();
      colorText = this.getColorTextColor();
      line = this.editor.lineTextForScreenRow(range.start.row);
      lineLength = line.length;
      position = {
        row: range.start.row,
        column: lineLength
      };
      _ref = this.editorElement.pixelPositionForScreenPosition(position), top = _ref.top, left = _ref.left;
      this.style.top = top + 'px';
      this.style.width = size + 'px';
      this.style.height = size + 'px';
      this.style.left = (left + spacing + this.position * (size + spacing)) + 'px';
      this.style.backgroundColor = color;
      return this.style.color = colorText;
    };

    DotMarkerElement.prototype.getSize = function() {
      return atom.config.get('atom-color-highlight.dotMarkersSize');
    };

    DotMarkerElement.prototype.getSpacing = function() {
      return atom.config.get('atom-color-highlight.dotMarkersSpacing');
    };

    return DotMarkerElement;

  })(HTMLElement);

  module.exports = DotMarkerElement = document.registerElement('dot-color-marker', {
    prototype: DotMarkerElement.prototype
  });

}).call(this);
