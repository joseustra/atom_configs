(function() {
  var AtomColorHighlightModel, CompositeDisposable, Emitter, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ = require('underscore-plus');

  _ref = require('event-kit'), CompositeDisposable = _ref.CompositeDisposable, Emitter = _ref.Emitter;

  module.exports = AtomColorHighlightModel = (function() {
    AtomColorHighlightModel.idCounter = 0;

    AtomColorHighlightModel.markerClass = 'color-highlight';

    AtomColorHighlightModel.bufferRange = [[0, 0], [Infinity, Infinity]];

    function AtomColorHighlightModel(editor) {
      this.editor = editor;
      this.update = __bind(this.update, this);
      this.buffer = this.editor.getBuffer();
      this.id = AtomColorHighlightModel.idCounter++;
      this.dirty = false;
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
    }

    AtomColorHighlightModel.prototype.onDidUpdateMarkers = function(callback) {
      return this.emitter.on('did-update-markers', callback);
    };

    AtomColorHighlightModel.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    AtomColorHighlightModel.prototype.update = function() {
      if (this.frameRequested) {
        return;
      }
      this.frameRequested = true;
      return requestAnimationFrame((function(_this) {
        return function() {
          _this.frameRequested = false;
          return _this.updateMarkers();
        };
      })(this));
    };

    AtomColorHighlightModel.prototype.subscribeToBuffer = function() {
      this.subscriptions.add(this.editor.onDidChange((function(_this) {
        return function() {
          return _this.dirty = true;
        };
      })(this)));
      this.subscriptions.add(this.editor.onDidStopChanging((function(_this) {
        return function() {
          return _this.update();
        };
      })(this)));
      this.subscriptions.add(this.editor.displayBuffer.onDidTokenize((function(_this) {
        return function() {
          return _this.update();
        };
      })(this)));
      return this.subscriptions.add(this.editor.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this)));
    };

    AtomColorHighlightModel.prototype.unsubscribeFromBuffer = function() {
      this.subscriptions.dispose();
      return this.buffer = null;
    };

    AtomColorHighlightModel.prototype.init = function() {
      this.subscribeToBuffer();
      this.destroyAllMarkers();
      return this.update();
    };

    AtomColorHighlightModel.prototype.destroy = function() {
      this.destroyed = true;
      this.emitter.emit('did-destroy');
      if (this.buffer != null) {
        return this.unsubscribeFromBuffer();
      }
    };

    AtomColorHighlightModel.prototype.isDestroyed = function() {
      return this.destroyed;
    };

    AtomColorHighlightModel.prototype.eachColor = function(block) {
      if (this.buffer != null) {
        return this.constructor.Color.scanBufferForColors(this.buffer, block);
      }
    };

    AtomColorHighlightModel.prototype.updateMarkers = function() {
      var e, marker, markersToRemoveById, promise, updatedMarkers, _i, _len, _ref1;
      if (this.buffer == null) {
        return this.destroyAllMarkers();
      }
      if (this.updating) {
        return;
      }
      this.updating = true;
      updatedMarkers = [];
      markersToRemoveById = {};
      _ref1 = this.markers;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        marker = _ref1[_i];
        markersToRemoveById[marker.id] = marker;
      }
      try {
        promise = this.eachColor();
        return promise.then((function(_this) {
          return function(results) {
            var color, id, match, range, res, _j, _len1;
            _this.updating = false;
            if (results == null) {
              results = [];
            }
            for (_j = 0, _len1 = results.length; _j < _len1; _j++) {
              res = results[_j];
              if (res == null) {
                continue;
              }
              range = res.bufferRange, match = res.match, color = res.color;
              if (color.isInvalid) {
                continue;
              }
              if (marker = _this.findMarker(match, range)) {
                if (marker.bufferMarker.properties.cssColor !== color.toCSS()) {
                  marker = _this.createMarker(match, color, range);
                } else {
                  delete markersToRemoveById[marker.id];
                }
              } else {
                marker = _this.createMarker(match, color, range);
              }
              updatedMarkers.push(marker);
            }
            for (id in markersToRemoveById) {
              marker = markersToRemoveById[id];
              marker.destroy();
            }
            _this.markers = updatedMarkers;
            _this.emitter.emit('did-update-markers', _.clone(_this.markers));
            return _this.dirty = false;
          };
        })(this)).fail(function(e) {
          this.dirty = false;
          return console.log(e);
        });
      } catch (_error) {
        e = _error;
        this.destroyAllMarkers();
        throw e;
      }
    };

    AtomColorHighlightModel.prototype.findMarker = function(color, range) {
      var attributes;
      attributes = {
        type: this.constructor.markerClass,
        color: color,
        startPosition: range.start,
        endPosition: range.end
      };
      return _.find(this.editor.findMarkers(attributes), function(marker) {
        return marker.isValid();
      });
    };

    AtomColorHighlightModel.prototype.destroyAllMarkers = function() {
      var marker, _i, _len, _ref1, _ref2;
      _ref2 = (_ref1 = this.markers) != null ? _ref1 : [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.destroy();
      }
      this.markers = [];
      return this.emitter.emit('did-update-markers', _.clone(this.markers));
    };

    AtomColorHighlightModel.prototype.createMarker = function(color, colorObject, range) {
      var l, markerAttributes, textColor;
      l = colorObject.luma();
      textColor = l > 0.43 ? 'black' : 'white';
      markerAttributes = {
        type: this.constructor.markerClass,
        color: color,
        cssColor: colorObject.toCSS(),
        textColor: textColor,
        invalidate: 'touch',
        persistent: false
      };
      return this.editor.markBufferRange(range, markerAttributes);
    };

    return AtomColorHighlightModel;

  })();

}).call(this);
