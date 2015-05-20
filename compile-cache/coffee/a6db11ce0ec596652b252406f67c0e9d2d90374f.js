(function() {
  "use strict";
  var TwoDimArray, WrappedDomTree, curHash, hashTo,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  TwoDimArray = require('./two-dim-array');

  curHash = 0;

  hashTo = {};

  module.exports = WrappedDomTree = (function() {
    function WrappedDomTree(dom, clone, rep) {
      if (clone) {
        this.shownTree = new WrappedDomTree(dom, false, this);
        this.dom = dom.cloneNode(true);
      } else {
        this.dom = dom;
        this.rep = rep;
      }
      this.clone = clone;
      this.hash = curHash++;
      hashTo[this.hash] = this;
      this.isText = dom.nodeType === 3;
      this.tagName = dom.tagName;
      this.className = dom.className;
      this.textData = dom.data;
      this.diffHash = {};
      if (this.isText) {
        this.size = 1;
      } else {
        rep = this.rep;
        this.children = [].map.call(this.dom.childNodes, function(dom, ind) {
          return new WrappedDomTree(dom, false, rep ? rep.children[ind] : null);
        });
        this.size = this.children.length ? this.children.reduce((function(prev, cur) {
          return prev + cur.size;
        }), 0) : 0;
        if (!this.size) {
          this.size = 1;
        }
      }
    }

    WrappedDomTree.prototype.diffTo = function(otherTree) {
      var diff, indexShift, inserted, last, lastElmDeleted, lastElmInserted, lastOp, op, operations, possibleReplace, r, score, _fn, _i, _len;
      if (this.clone) {
        return this.shownTree.diffTo(otherTree);
      }
      diff = this.rep.diff(otherTree);
      score = diff.score;
      operations = diff.operations;
      indexShift = 0;
      inserted = [];
      last = void 0;
      possibleReplace = void 0;
      r = void 0;
      lastOp = void 0;
      lastElmDeleted = void 0;
      lastElmInserted = void 0;
      if (operations) {
        if (operations instanceof Array) {
          _fn = (function(_this) {
            return function(op) {
              var possibleLastDeleted, re;
              if (op.type === "d") {
                possibleLastDeleted = _this.children[op.tree + indexShift].dom;
                r = _this.remove(op.tree + indexShift);
                _this.rep.remove(op.tree + indexShift);
                if (!last || last.nextSibling === r || last === r) {
                  last = r;
                  if (last && lastOp && op.tree === lastOp.pos) {
                    lastElmDeleted = possibleLastDeleted;
                  } else {
                    lastElmDeleted = null;
                    lastElmInserted = null;
                  }
                  lastOp = op;
                }
                indexShift--;
              } else if (op.type === "i") {
                _this.rep.insert(op.pos + indexShift, otherTree.children[op.otherTree]);
                r = _this.insert(op.pos + indexShift, otherTree.children[op.otherTree], _this.rep.children[op.pos + indexShift]);
                inserted.push(r);
                if (!last || last.nextSibling === r) {
                  last = r;
                  lastOp = op;
                  lastElmInserted = r;
                }
                indexShift++;
              } else {
                re = _this.children[op.tree + indexShift].diffTo(otherTree.children[op.otherTree]);
                if (!last || (last.nextSibling === _this.children[op.tree + indexShift].dom && re.last)) {
                  last = re.last;
                  if (re.possibleReplace) {
                    lastElmInserted = re.possibleReplace.cur;
                    lastElmDeleted = re.possibleReplace.prev;
                  }
                  lastOp = op;
                }
                inserted = inserted.concat(re.inserted);
              }
            };
          })(this);
          for (_i = 0, _len = operations.length; _i < _len; _i++) {
            op = operations[_i];
            _fn(op);
          }
        } else {
          console.log(operations);
          throw "invalid operations";
        }
      }
      if (lastOp && lastOp.type !== 'i' && lastElmInserted && lastElmDeleted) {
        possibleReplace = {
          cur: lastElmInserted,
          prev: lastElmDeleted
        };
      }
      return {
        last: last,
        inserted: inserted,
        possibleReplace: possibleReplace
      };
    };

    WrappedDomTree.prototype.insert = function(i, tree, rep) {
      var ctree, dom;
      dom = tree.dom.cloneNode(true);
      if (i === this.dom.childNodes.length) {
        this.dom.appendChild(dom);
      } else {
        this.dom.insertBefore(dom, this.dom.childNodes[i]);
      }
      ctree = new WrappedDomTree(dom, false, rep);
      this.children.splice(i, 0, ctree);
      return this.dom.childNodes[i];
    };

    WrappedDomTree.prototype.remove = function(i) {
      this.dom.removeChild(this.dom.childNodes[i]);
      this.children[i].removeSelf();
      this.children.splice(i, 1);
      return this.dom.childNodes[i - 1];
    };

    WrappedDomTree.prototype.diff = function(otherTree, tmax) {
      var cc, cr, cur, dp, getScore, i, key, offset, op, operations, p, pc, pr, prev, rc, score, sum, _i, _j, _ref, _ref1;
      if (this.equalTo(otherTree)) {
        return {
          score: 0,
          operations: null
        };
      }
      if (this.cannotReplaceWith(otherTree)) {
        return {
          score: 1 / 0,
          operations: null
        };
      }
      key = otherTree.hash;
      if (__indexOf.call(this.diffHash, key) >= 0) {
        return this.diffHash[key];
      }
      if (tmax === void 0) {
        tmax = 100000;
      }
      if (tmax <= 0) {
        return 0;
      }
      offset = 0;
      while (offset < this.children.length && offset < otherTree.children.length && this.children[offset].equalTo(otherTree.children[offset])) {
        offset++;
      }
      dp = new TwoDimArray(this.children.length + 1 - offset, otherTree.children.length + 1 - offset);
      p = new TwoDimArray(this.children.length + 1 - offset, otherTree.children.length + 1 - offset);
      dp.set(0, 0, 0);
      sum = 0;
      if (otherTree.children.length - offset > 1) {
        for (i = _i = 1, _ref = otherTree.children.length - offset - 1; 1 <= _ref ? _i <= _ref : _i >= _ref; i = 1 <= _ref ? ++_i : --_i) {
          dp.set(0, i, sum);
          p.set(0, i, i - 1);
          sum += otherTree.children[i + offset].size;
        }
      }
      if (otherTree.children.length - offset > 0) {
        dp.set(0, otherTree.children.length - offset, sum);
        p.set(0, otherTree.children.length - offset, otherTree.children.length - 1 - offset);
      }
      sum = 0;
      if (this.children.length - offset > 1) {
        for (i = _j = 1, _ref1 = this.children.length - offset - 1; 1 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 1 <= _ref1 ? ++_j : --_j) {
          dp.set(i, 0, sum);
          p.set(i, 0, (i - 1) * p.col);
          sum += this.children[i + offset].size;
        }
      }
      if (this.children.length - offset) {
        dp.set(this.children.length - offset, 0, sum);
        p.set(this.children.length - offset, 0, (this.children.length - 1 - offset) * p.col);
      }
      getScore = (function(_this) {
        return function(i, j, max) {
          var bound, force, other, prev, subdiff, val;
          if (dp.get(i, j) !== void 0) {
            return dp.get(i, j);
          }
          if (max === void 0) {
            max = 1 / 0;
          }
          if (max <= 0) {
            return 1 / 0;
          }
          val = max;
          bound = max;
          subdiff = _this.children[i - 1 + offset].diff(otherTree.children[j - 1 + offset], bound).score;
          force = false;
          if (subdiff < bound && subdiff + 1 < _this.children[i - 1 + offset].size + otherTree.children[j - 1 + offset].size) {
            force = true;
          }
          val = getScore(i - 1, j - 1, bound - subdiff) + subdiff;
          prev = p.getInd(i - 1, j - 1);
          if (!force) {
            other = getScore(i - 1, j, Math.min(val, max) - _this.children[i - 1 + offset].size) + _this.children[i - 1 + offset].size;
            if (other < val) {
              prev = p.getInd(i - 1, j);
              val = other;
            }
            other = getScore(i, j - 1, Math.min(val, max) - otherTree.children[j - 1 + offset].size) + otherTree.children[j - 1 + offset].size;
            if (other < val) {
              prev = p.getInd(i, j - 1);
              val = other;
            }
          }
          if (val >= max) {
            val = 1 / 0;
          }
          dp.set(i, j, val);
          p.set(i, j, prev);
          return val;
        };
      })(this);
      score = getScore(this.children.length - offset, otherTree.children.length - offset, tmax);
      operations = [];
      cur = p.getInd(this.children.length - offset, otherTree.children.length - offset);
      cr = this.children.length - 1 - offset;
      cc = otherTree.children.length - 1 - offset;
      while (p.rawGet(cur) !== void 0) {
        prev = p.rawGet(cur);
        rc = p.get2DInd(prev);
        pr = rc.r - 1;
        pc = rc.c - 1;
        if (pr === cr) {
          operations.unshift({
            type: "i",
            otherTree: cc + offset,
            pos: cr + 1 + offset
          });
        } else if (pc === cc) {
          operations.unshift({
            type: "d",
            tree: cr + offset
          });
        } else {
          op = this.children[cr + offset].diff(otherTree.children[cc + offset]).operations;
          if (op && op.length) {
            operations.unshift({
              type: "r",
              tree: cr + offset,
              otherTree: cc + offset
            });
          }
        }
        cur = prev;
        cr = pr;
        cc = pc;
      }
      this.diffHash[key] = {
        score: score,
        operations: operations
      };
      return this.diffHash[key];
    };

    WrappedDomTree.prototype.equalTo = function(otherTree) {
      return this.dom.isEqualNode(otherTree.dom);
    };

    WrappedDomTree.prototype.cannotReplaceWith = function(otherTree) {
      return this.isText || otherTree.isText || this.tagName !== otherTree.tagName || this.className !== otherTree.className || this.className === "math" || this.tagName === "A" || (this.tagName === "IMG" && !this.dom.isEqualNode(otherTree.dom));
    };

    WrappedDomTree.prototype.getContent = function() {
      if (this.dom.outerHTML) {
        return this.dom.outerHTML;
      } else {
        return this.textData;
      }
    };

    WrappedDomTree.prototype.removeSelf = function() {
      hashTo[this.hash] = null;
      this.children && this.children.forEach(function(c) {
        return c.removeSelf();
      });
    };

    return WrappedDomTree;

  })();

}).call(this);
