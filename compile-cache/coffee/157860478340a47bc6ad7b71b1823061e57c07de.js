(function() {
  var TwoDimArray;

  module.exports = TwoDimArray = (function() {
    function TwoDimArray(rows, cols) {
      this._arr = new Array(rows * cols);
      this.row = rows;
      this.col = cols;
      return;
    }

    TwoDimArray.prototype.getInd = function(row, col) {
      return row * this.col + col;
    };

    TwoDimArray.prototype.get2DInd = function(ind) {
      return {
        r: ind / this.col | 0,
        c: ind % this.col
      };
    };

    TwoDimArray.prototype.get = function(row, col) {
      return this._arr[this.getInd(row, col)];
    };

    TwoDimArray.prototype.set = function(row, col, val) {
      this._arr[row * this.col + col] = val;
    };

    TwoDimArray.prototype.rawGet = function(ind) {
      return this._arr[ind];
    };

    return TwoDimArray;

  })();

}).call(this);
