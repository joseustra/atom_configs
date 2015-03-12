(function() {
  var chunkString;

  module.exports = chunkString = function(str, len) {
    var _i, _offset, _ret, _size;
    _size = Math.ceil(str.length / len);
    _ret = new Array(_size);
    _offset = void 0;
    _i = 0;
    while (_i < _size) {
      _offset = _i * len;
      _ret[_i] = str.substring(_offset, _offset + len);
      _i++;
    }
    return _ret;
  };

}).call(this);
