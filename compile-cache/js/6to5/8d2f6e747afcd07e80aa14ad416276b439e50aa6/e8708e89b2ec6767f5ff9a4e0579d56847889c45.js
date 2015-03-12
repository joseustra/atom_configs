(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;if (!u && a) {
          return a(o, !0);
        }if (i) {
          return i(o, !0);
        }throw new Error("Cannot find module '" + o + "'");
      }var f = n[o] = { exports: {} };t[o][0].call(f.exports, function (e) {
        var n = t[o][1][e];return s(n ? n : e);
      }, f, f.exports, e, t, n, r);
    }return n[o].exports;
  }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
})({ 1: [function (require, module, exports) {
    var crypto = require("crypto");

    /**
     * Used for authenticating channel subscriptions entirely on the client.
     * If the client is a web browser then this can be highly insecure and it
     * IS NOT recommended that you do this. You SHOULD DEFINITELY NOT DO THIS
     * in production.
     *
     * @param {Object} options
     */
    function ClientAuthorizer(options) {
      if (!options.key) {
        throw new Error("a \"key\" must be provided");
      }

      if (!options.secret) {
        throw new Error("a \"secret\" must be provided");
      }

      this.key = options.key;
      this.secret = options.secret;
    }

    /**
     * Authenticate the subscription
     *
     * @param {String} socketId
     *    The socket id for the connection
     * @param {String} channel
     *    The name of the channel being subscribed to
     * @param {Object} channelData
     *    Additional channel data to be included in the authentication signature
     */
    ClientAuthorizer.prototype.auth = function (socketId, channel, channelData) {
      if (channel.indexOf("presence-") === 0) {
        if (!channelData) {
          throw Error("\"channelData\" is required when authenticating a Presence channel");
        }
        if (!channelData.user_id) {
          throw Error("\"channelData.user_id\" must be set when authenticating a Presence channel");
        }
      }

      var returnHash = {};
      var channelDataStr = "";
      if (channelData) {
        channelData = JSON.stringify(channelData);
        channelDataStr = ":" + channelData;
        returnHash.channel_data = channelData;
      }
      var stringToSign = socketId + ":" + channel + channelDataStr;
      returnHash.auth = this.key + ":" + crypto.createHmac("sha256", this.secret).update(stringToSign).digest("hex");
      return returnHash;
    };

    // Static Helpers

    /**
     * Setup up the client authoriser.
     *
     * @param {Pusher} Pusher
     *    The Pusher global reference.
     */
    ClientAuthorizer.setUpPusher = function (Pusher) {
      Pusher.authorizers.client = ClientAuthorizer.clientAuth;
    };

    /**
     * Perform the client authentication. Called by Pusher library when authTransport
     * is set to 'client'.
     *
     * When this is executed it will be scoped so that `this` reference an instance
     * of `Pusher.Channel.Authorizer`.
     *
     * @param {String} socketId
     *    The id of the socket being authenticated to subscribe to the channel.
     * @param {Function} callback
     *    The callback to be executed when the authentication has completed.
     */
    ClientAuthorizer.clientAuth = function (socketId, callback) {
      var authorizer = ClientAuthorizer.createAuthorizer(this.options.clientAuth);
      var channelData = null;
      if (this.options.clientAuth.user_id) {
        channelData = {
          user_id: this.options.clientAuth.user_id,
          user_info: this.options.clientAuth.user_info
        };
      }
      var hash = authorizer.auth(socketId, this.channel.name, channelData);
      callback(null, hash);
    };

    /**
     * Factory function for creating a ClientAuthorizer.
     *
     * @param {Object} clientAuthOption
     *    The client authentication options.
     * @returns ClientAuthorizer
     */
    ClientAuthorizer.createAuthorizer = function (clientAuthOptions) {
      var authorizer = new ClientAuthorizer(clientAuthOptions);
      return authorizer;
    };

    module.exports = ClientAuthorizer;
  }, { crypto: 7 }], 2: [function (require, module, exports) {
    (function (Pusher) {
      console.warn("You are using PusherJS client authentication. Never ever use this for a production application, as it would expose your secret keys.");

      var ClientAuthorizer = require("./ClientAuthorizer");
      ClientAuthorizer.setUpPusher(Pusher);
    })(window.Pusher);
  }, { "./ClientAuthorizer": 1 }], 3: [function (require, module, exports) {
    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
     * @license  MIT
     */

    var base64 = require("base64-js");
    var ieee754 = require("ieee754");

    exports.Buffer = Buffer;
    exports.SlowBuffer = Buffer;
    exports.INSPECT_MAX_BYTES = 50;
    Buffer.poolSize = 8192;

    /**
     * If `Buffer._useTypedArrays`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (compatible down to IE6)
     */
    Buffer._useTypedArrays = (function () {
      // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
      // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
      // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
      // because we need to be able to add all the node Buffer API methods. This is an issue
      // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
      try {
        var buf = new ArrayBuffer(0);
        var arr = new Uint8Array(buf);
        arr.foo = function () {
          return 42;
        };
        return 42 === arr.foo() && typeof arr.subarray === "function" // Chrome 9-10 lack `subarray`
        ;
      } catch (e) {
        return false;
      }
    })();

    /**
     * Class: Buffer
     * =============
     *
     * The Buffer constructor returns instances of `Uint8Array` that are augmented
     * with function properties for all the node `Buffer` API functions. We use
     * `Uint8Array` so that square bracket notation works as expected -- it returns
     * a single octet.
     *
     * By augmenting the instances, we can avoid modifying the `Uint8Array`
     * prototype.
     */
    function Buffer(subject, encoding, noZero) {
      if (!(this instanceof Buffer)) {
        return new Buffer(subject, encoding, noZero);
      }var type = typeof subject;

      // Workaround: node's base64 implementation allows for non-padded strings
      // while base64-js does not.
      if (encoding === "base64" && type === "string") {
        subject = stringtrim(subject);
        while (subject.length % 4 !== 0) {
          subject = subject + "=";
        }
      }

      // Find the length
      var length;
      if (type === "number") length = coerce(subject);else if (type === "string") length = Buffer.byteLength(subject, encoding);else if (type === "object") length = coerce(subject.length) // assume that object is array-like
      ;else throw new Error("First argument needs to be a number, array or string.");

      var buf;
      if (Buffer._useTypedArrays) {
        // Preferred: Return an augmented `Uint8Array` instance for best performance
        buf = Buffer._augment(new Uint8Array(length));
      } else {
        // Fallback: Return THIS instance of Buffer (created by `new`)
        buf = this;
        buf.length = length;
        buf._isBuffer = true;
      }

      var i;
      if (Buffer._useTypedArrays && typeof subject.byteLength === "number") {
        // Speed optimization -- use set if we're copying from a typed array
        buf._set(subject);
      } else if (isArrayish(subject)) {
        // Treat array-ish objects as a byte array
        for (i = 0; i < length; i++) {
          if (Buffer.isBuffer(subject)) buf[i] = subject.readUInt8(i);else buf[i] = subject[i];
        }
      } else if (type === "string") {
        buf.write(subject, 0, encoding);
      } else if (type === "number" && !Buffer._useTypedArrays && !noZero) {
        for (i = 0; i < length; i++) {
          buf[i] = 0;
        }
      }

      return buf;
    }

    // STATIC METHODS
    // ==============

    Buffer.isEncoding = function (encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "binary":
        case "base64":
        case "raw":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };

    Buffer.isBuffer = function (b) {
      return !!(b !== null && b !== undefined && b._isBuffer);
    };

    Buffer.byteLength = function (str, encoding) {
      var ret;
      str = str + "";
      switch (encoding || "utf8") {
        case "hex":
          ret = str.length / 2;
          break;
        case "utf8":
        case "utf-8":
          ret = utf8ToBytes(str).length;
          break;
        case "ascii":
        case "binary":
        case "raw":
          ret = str.length;
          break;
        case "base64":
          ret = base64ToBytes(str).length;
          break;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          ret = str.length * 2;
          break;
        default:
          throw new Error("Unknown encoding");
      }
      return ret;
    };

    Buffer.concat = function (list, totalLength) {
      assert(isArray(list), "Usage: Buffer.concat(list, [totalLength])\n" + "list should be an Array.");

      if (list.length === 0) {
        return new Buffer(0);
      } else if (list.length === 1) {
        return list[0];
      }

      var i;
      if (typeof totalLength !== "number") {
        totalLength = 0;
        for (i = 0; i < list.length; i++) {
          totalLength += list[i].length;
        }
      }

      var buf = new Buffer(totalLength);
      var pos = 0;
      for (i = 0; i < list.length; i++) {
        var item = list[i];
        item.copy(buf, pos);
        pos += item.length;
      }
      return buf;
    };

    // BUFFER INSTANCE METHODS
    // =======================

    function _hexWrite(buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      assert(strLen % 2 === 0, "Invalid hex string");

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; i++) {
        var byte = parseInt(string.substr(i * 2, 2), 16);
        assert(!isNaN(byte), "Invalid hex string");
        buf[offset + i] = byte;
      }
      Buffer._charsWritten = i * 2;
      return i;
    }

    function _utf8Write(buf, string, offset, length) {
      var charsWritten = Buffer._charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length);
      return charsWritten;
    }

    function _asciiWrite(buf, string, offset, length) {
      var charsWritten = Buffer._charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length);
      return charsWritten;
    }

    function _binaryWrite(buf, string, offset, length) {
      return _asciiWrite(buf, string, offset, length);
    }

    function _base64Write(buf, string, offset, length) {
      var charsWritten = Buffer._charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length);
      return charsWritten;
    }

    function _utf16leWrite(buf, string, offset, length) {
      var charsWritten = Buffer._charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length);
      return charsWritten;
    }

    Buffer.prototype.write = function (string, offset, length, encoding) {
      // Support both (string, offset, length, encoding)
      // and the legacy (string, encoding, offset, length)
      if (isFinite(offset)) {
        if (!isFinite(length)) {
          encoding = length;
          length = undefined;
        }
      } else {
        // legacy
        var swap = encoding;
        encoding = offset;
        offset = length;
        length = swap;
      }

      offset = Number(offset) || 0;
      var remaining = this.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }
      encoding = String(encoding || "utf8").toLowerCase();

      var ret;
      switch (encoding) {
        case "hex":
          ret = _hexWrite(this, string, offset, length);
          break;
        case "utf8":
        case "utf-8":
          ret = _utf8Write(this, string, offset, length);
          break;
        case "ascii":
          ret = _asciiWrite(this, string, offset, length);
          break;
        case "binary":
          ret = _binaryWrite(this, string, offset, length);
          break;
        case "base64":
          ret = _base64Write(this, string, offset, length);
          break;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          ret = _utf16leWrite(this, string, offset, length);
          break;
        default:
          throw new Error("Unknown encoding");
      }
      return ret;
    };

    Buffer.prototype.toString = function (encoding, start, end) {
      var self = this;

      encoding = String(encoding || "utf8").toLowerCase();
      start = Number(start) || 0;
      end = end !== undefined ? Number(end) : end = self.length;

      // Fastpath empty strings
      if (end === start) return "";

      var ret;
      switch (encoding) {
        case "hex":
          ret = _hexSlice(self, start, end);
          break;
        case "utf8":
        case "utf-8":
          ret = _utf8Slice(self, start, end);
          break;
        case "ascii":
          ret = _asciiSlice(self, start, end);
          break;
        case "binary":
          ret = _binarySlice(self, start, end);
          break;
        case "base64":
          ret = _base64Slice(self, start, end);
          break;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          ret = _utf16leSlice(self, start, end);
          break;
        default:
          throw new Error("Unknown encoding");
      }
      return ret;
    };

    Buffer.prototype.toJSON = function () {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function (target, target_start, start, end) {
      var source = this;

      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (!target_start) target_start = 0;

      // Copy 0 bytes; we're done
      if (end === start) return;
      if (target.length === 0 || source.length === 0) return;

      // Fatal error conditions
      assert(end >= start, "sourceEnd < sourceStart");
      assert(target_start >= 0 && target_start < target.length, "targetStart out of bounds");
      assert(start >= 0 && start < source.length, "sourceStart out of bounds");
      assert(end >= 0 && end <= source.length, "sourceEnd out of bounds");

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - target_start < end - start) end = target.length - target_start + start;

      var len = end - start;

      if (len < 100 || !Buffer._useTypedArrays) {
        for (var i = 0; i < len; i++) target[i + target_start] = this[i + start];
      } else {
        target._set(this.subarray(start, start + len), target_start);
      }
    };

    function _base64Slice(buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf);
      } else {
        return base64.fromByteArray(buf.slice(start, end));
      }
    }

    function _utf8Slice(buf, start, end) {
      var res = "";
      var tmp = "";
      end = Math.min(buf.length, end);

      for (var i = start; i < end; i++) {
        if (buf[i] <= 127) {
          res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i]);
          tmp = "";
        } else {
          tmp += "%" + buf[i].toString(16);
        }
      }

      return res + decodeUtf8Char(tmp);
    }

    function _asciiSlice(buf, start, end) {
      var ret = "";
      end = Math.min(buf.length, end);

      for (var i = start; i < end; i++) ret += String.fromCharCode(buf[i]);
      return ret;
    }

    function _binarySlice(buf, start, end) {
      return _asciiSlice(buf, start, end);
    }

    function _hexSlice(buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = "";
      for (var i = start; i < end; i++) {
        out += toHex(buf[i]);
      }
      return out;
    }

    function _utf16leSlice(buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = "";
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res;
    }

    Buffer.prototype.slice = function (start, end) {
      var len = this.length;
      start = clamp(start, len, 0);
      end = clamp(end, len, len);

      if (Buffer._useTypedArrays) {
        return Buffer._augment(this.subarray(start, end));
      } else {
        var sliceLen = end - start;
        var newBuf = new Buffer(sliceLen, undefined, true);
        for (var i = 0; i < sliceLen; i++) {
          newBuf[i] = this[i + start];
        }
        return newBuf;
      }
    };

    // `get` will be removed in Node 0.13+
    Buffer.prototype.get = function (offset) {
      console.log(".get() is deprecated. Access using array indexes instead.");
      return this.readUInt8(offset);
    };

    // `set` will be removed in Node 0.13+
    Buffer.prototype.set = function (v, offset) {
      console.log(".set() is deprecated. Access using array indexes instead.");
      return this.writeUInt8(v, offset);
    };

    Buffer.prototype.readUInt8 = function (offset, noAssert) {
      if (!noAssert) {
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset < this.length, "Trying to read beyond buffer length");
      }

      if (offset >= this.length) return;

      return this[offset];
    };

    function _readUInt16(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 1 < buf.length, "Trying to read beyond buffer length");
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }var val;
      if (littleEndian) {
        val = buf[offset];
        if (offset + 1 < len) val |= buf[offset + 1] << 8;
      } else {
        val = buf[offset] << 8;
        if (offset + 1 < len) val |= buf[offset + 1];
      }
      return val;
    }

    Buffer.prototype.readUInt16LE = function (offset, noAssert) {
      return _readUInt16(this, offset, true, noAssert);
    };

    Buffer.prototype.readUInt16BE = function (offset, noAssert) {
      return _readUInt16(this, offset, false, noAssert);
    };

    function _readUInt32(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 3 < buf.length, "Trying to read beyond buffer length");
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }var val;
      if (littleEndian) {
        if (offset + 2 < len) val = buf[offset + 2] << 16;
        if (offset + 1 < len) val |= buf[offset + 1] << 8;
        val |= buf[offset];
        if (offset + 3 < len) val = val + (buf[offset + 3] << 24 >>> 0);
      } else {
        if (offset + 1 < len) val = buf[offset + 1] << 16;
        if (offset + 2 < len) val |= buf[offset + 2] << 8;
        if (offset + 3 < len) val |= buf[offset + 3];
        val = val + (buf[offset] << 24 >>> 0);
      }
      return val;
    }

    Buffer.prototype.readUInt32LE = function (offset, noAssert) {
      return _readUInt32(this, offset, true, noAssert);
    };

    Buffer.prototype.readUInt32BE = function (offset, noAssert) {
      return _readUInt32(this, offset, false, noAssert);
    };

    Buffer.prototype.readInt8 = function (offset, noAssert) {
      if (!noAssert) {
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset < this.length, "Trying to read beyond buffer length");
      }

      if (offset >= this.length) return;

      var neg = this[offset] & 128;
      if (neg) return (255 - this[offset] + 1) * -1;else return this[offset];
    };

    function _readInt16(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 1 < buf.length, "Trying to read beyond buffer length");
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }var val = _readUInt16(buf, offset, littleEndian, true);
      var neg = val & 32768;
      if (neg) {
        return (65535 - val + 1) * -1;
      } else {
        return val;
      }
    }

    Buffer.prototype.readInt16LE = function (offset, noAssert) {
      return _readInt16(this, offset, true, noAssert);
    };

    Buffer.prototype.readInt16BE = function (offset, noAssert) {
      return _readInt16(this, offset, false, noAssert);
    };

    function _readInt32(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 3 < buf.length, "Trying to read beyond buffer length");
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }var val = _readUInt32(buf, offset, littleEndian, true);
      var neg = val & 2147483648;
      if (neg) {
        return (4294967295 - val + 1) * -1;
      } else {
        return val;
      }
    }

    Buffer.prototype.readInt32LE = function (offset, noAssert) {
      return _readInt32(this, offset, true, noAssert);
    };

    Buffer.prototype.readInt32BE = function (offset, noAssert) {
      return _readInt32(this, offset, false, noAssert);
    };

    function _readFloat(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset + 3 < buf.length, "Trying to read beyond buffer length");
      }

      return ieee754.read(buf, offset, littleEndian, 23, 4);
    }

    Buffer.prototype.readFloatLE = function (offset, noAssert) {
      return _readFloat(this, offset, true, noAssert);
    };

    Buffer.prototype.readFloatBE = function (offset, noAssert) {
      return _readFloat(this, offset, false, noAssert);
    };

    function _readDouble(buf, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset + 7 < buf.length, "Trying to read beyond buffer length");
      }

      return ieee754.read(buf, offset, littleEndian, 52, 8);
    }

    Buffer.prototype.readDoubleLE = function (offset, noAssert) {
      return _readDouble(this, offset, true, noAssert);
    };

    Buffer.prototype.readDoubleBE = function (offset, noAssert) {
      return _readDouble(this, offset, false, noAssert);
    };

    Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset < this.length, "trying to write beyond buffer length");
        verifuint(value, 255);
      }

      if (offset >= this.length) return;

      this[offset] = value;
    };

    function _writeUInt16(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 1 < buf.length, "trying to write beyond buffer length");
        verifuint(value, 65535);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
        buf[offset + i] = (value & 255 << 8 * (littleEndian ? i : 1 - i)) >>> (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
      _writeUInt16(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
      _writeUInt16(this, value, offset, false, noAssert);
    };

    function _writeUInt32(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 3 < buf.length, "trying to write beyond buffer length");
        verifuint(value, 4294967295);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
        buf[offset + i] = value >>> (littleEndian ? i : 3 - i) * 8 & 255;
      }
    }

    Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
      _writeUInt32(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
      _writeUInt32(this, value, offset, false, noAssert);
    };

    Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset < this.length, "Trying to write beyond buffer length");
        verifsint(value, 127, -128);
      }

      if (offset >= this.length) return;

      if (value >= 0) this.writeUInt8(value, offset, noAssert);else this.writeUInt8(255 + value + 1, offset, noAssert);
    };

    function _writeInt16(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 1 < buf.length, "Trying to write beyond buffer length");
        verifsint(value, 32767, -32768);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }if (value >= 0) _writeUInt16(buf, value, offset, littleEndian, noAssert);else _writeUInt16(buf, 65535 + value + 1, offset, littleEndian, noAssert);
    }

    Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
      _writeInt16(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
      _writeInt16(this, value, offset, false, noAssert);
    };

    function _writeInt32(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 3 < buf.length, "Trying to write beyond buffer length");
        verifsint(value, 2147483647, -2147483648);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }if (value >= 0) _writeUInt32(buf, value, offset, littleEndian, noAssert);else _writeUInt32(buf, 4294967295 + value + 1, offset, littleEndian, noAssert);
    }

    Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
      _writeInt32(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
      _writeInt32(this, value, offset, false, noAssert);
    };

    function _writeFloat(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 3 < buf.length, "Trying to write beyond buffer length");
        verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }ieee754.write(buf, value, offset, littleEndian, 23, 4);
    }

    Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
      _writeFloat(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
      _writeFloat(this, value, offset, false, noAssert);
    };

    function _writeDouble(buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        assert(value !== undefined && value !== null, "missing value");
        assert(typeof littleEndian === "boolean", "missing or invalid endian");
        assert(offset !== undefined && offset !== null, "missing offset");
        assert(offset + 7 < buf.length, "Trying to write beyond buffer length");
        verifIEEE754(value, 1.7976931348623157e+308, -1.7976931348623157e+308);
      }

      var len = buf.length;
      if (offset >= len) {
        return;
      }ieee754.write(buf, value, offset, littleEndian, 52, 8);
    }

    Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
      _writeDouble(this, value, offset, true, noAssert);
    };

    Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
      _writeDouble(this, value, offset, false, noAssert);
    };

    // fill(value, start=0, end=buffer.length)
    Buffer.prototype.fill = function (value, start, end) {
      if (!value) value = 0;
      if (!start) start = 0;
      if (!end) end = this.length;

      if (typeof value === "string") {
        value = value.charCodeAt(0);
      }

      assert(typeof value === "number" && !isNaN(value), "value is not a number");
      assert(end >= start, "end < start");

      // Fill 0 bytes; we're done
      if (end === start) return;
      if (this.length === 0) return;

      assert(start >= 0 && start < this.length, "start out of bounds");
      assert(end >= 0 && end <= this.length, "end out of bounds");

      for (var i = start; i < end; i++) {
        this[i] = value;
      }
    };

    Buffer.prototype.inspect = function () {
      var out = [];
      var len = this.length;
      for (var i = 0; i < len; i++) {
        out[i] = toHex(this[i]);
        if (i === exports.INSPECT_MAX_BYTES) {
          out[i + 1] = "...";
          break;
        }
      }
      return "<Buffer " + out.join(" ") + ">";
    };

    /**
     * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
     * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
     */
    Buffer.prototype.toArrayBuffer = function () {
      if (typeof Uint8Array !== "undefined") {
        if (Buffer._useTypedArrays) {
          return new Buffer(this).buffer;
        } else {
          var buf = new Uint8Array(this.length);
          for (var i = 0, len = buf.length; i < len; i += 1) buf[i] = this[i];
          return buf.buffer;
        }
      } else {
        throw new Error("Buffer.toArrayBuffer not supported in this browser");
      }
    };

    // HELPER FUNCTIONS
    // ================

    function stringtrim(str) {
      if (str.trim) {
        return str.trim();
      }return str.replace(/^\s+|\s+$/g, "");
    }

    var BP = Buffer.prototype;

    /**
     * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
     */
    Buffer._augment = function (arr) {
      arr._isBuffer = true;

      // save reference to original Uint8Array get/set methods before overwriting
      arr._get = arr.get;
      arr._set = arr.set;

      // deprecated, will be removed in node 0.13+
      arr.get = BP.get;
      arr.set = BP.set;

      arr.write = BP.write;
      arr.toString = BP.toString;
      arr.toLocaleString = BP.toString;
      arr.toJSON = BP.toJSON;
      arr.copy = BP.copy;
      arr.slice = BP.slice;
      arr.readUInt8 = BP.readUInt8;
      arr.readUInt16LE = BP.readUInt16LE;
      arr.readUInt16BE = BP.readUInt16BE;
      arr.readUInt32LE = BP.readUInt32LE;
      arr.readUInt32BE = BP.readUInt32BE;
      arr.readInt8 = BP.readInt8;
      arr.readInt16LE = BP.readInt16LE;
      arr.readInt16BE = BP.readInt16BE;
      arr.readInt32LE = BP.readInt32LE;
      arr.readInt32BE = BP.readInt32BE;
      arr.readFloatLE = BP.readFloatLE;
      arr.readFloatBE = BP.readFloatBE;
      arr.readDoubleLE = BP.readDoubleLE;
      arr.readDoubleBE = BP.readDoubleBE;
      arr.writeUInt8 = BP.writeUInt8;
      arr.writeUInt16LE = BP.writeUInt16LE;
      arr.writeUInt16BE = BP.writeUInt16BE;
      arr.writeUInt32LE = BP.writeUInt32LE;
      arr.writeUInt32BE = BP.writeUInt32BE;
      arr.writeInt8 = BP.writeInt8;
      arr.writeInt16LE = BP.writeInt16LE;
      arr.writeInt16BE = BP.writeInt16BE;
      arr.writeInt32LE = BP.writeInt32LE;
      arr.writeInt32BE = BP.writeInt32BE;
      arr.writeFloatLE = BP.writeFloatLE;
      arr.writeFloatBE = BP.writeFloatBE;
      arr.writeDoubleLE = BP.writeDoubleLE;
      arr.writeDoubleBE = BP.writeDoubleBE;
      arr.fill = BP.fill;
      arr.inspect = BP.inspect;
      arr.toArrayBuffer = BP.toArrayBuffer;

      return arr;
    };

    // slice(start, end)
    function clamp(index, len, defaultValue) {
      if (typeof index !== "number") {
        return defaultValue;
      }index = ~ ~index; // Coerce to integer.
      if (index >= len) {
        return len;
      }if (index >= 0) {
        return index;
      }index += len;
      if (index >= 0) {
        return index;
      }return 0;
    }

    function coerce(length) {
      // Coerce length to a number (possibly NaN), round up
      // in case it's fractional (e.g. 123.456) then do a
      // double negate to coerce a NaN to 0. Easy, right?
      length = ~ ~Math.ceil(+length);
      return length < 0 ? 0 : length;
    }

    function isArray(subject) {
      return (Array.isArray || function (subject) {
        return Object.prototype.toString.call(subject) === "[object Array]";
      })(subject);
    }

    function isArrayish(subject) {
      return isArray(subject) || Buffer.isBuffer(subject) || subject && typeof subject === "object" && typeof subject.length === "number";
    }

    function toHex(n) {
      if (n < 16) {
        return "0" + n.toString(16);
      }return n.toString(16);
    }

    function utf8ToBytes(str) {
      var byteArray = [];
      for (var i = 0; i < str.length; i++) {
        var b = str.charCodeAt(i);
        if (b <= 127) byteArray.push(str.charCodeAt(i));else {
          var start = i;
          if (b >= 55296 && b <= 57343) i++;
          var h = encodeURIComponent(str.slice(start, i + 1)).substr(1).split("%");
          for (var j = 0; j < h.length; j++) byteArray.push(parseInt(h[j], 16));
        }
      }
      return byteArray;
    }

    function asciiToBytes(str) {
      var byteArray = [];
      for (var i = 0; i < str.length; i++) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 255);
      }
      return byteArray;
    }

    function utf16leToBytes(str) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; i++) {
        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray;
    }

    function base64ToBytes(str) {
      return base64.toByteArray(str);
    }

    function blitBuffer(src, dst, offset, length) {
      var pos;
      for (var i = 0; i < length; i++) {
        if (i + offset >= dst.length || i >= src.length) break;
        dst[i + offset] = src[i];
      }
      return i;
    }

    function decodeUtf8Char(str) {
      try {
        return decodeURIComponent(str);
      } catch (err) {
        return String.fromCharCode(65533) // UTF 8 invalid char
        ;
      }
    }

    /*
     * We have to make sure that the value is a valid integer. This means that it
     * is non-negative. It has no fractional component and that it does not
     * exceed the maximum allowed value.
     */
    function verifuint(value, max) {
      assert(typeof value === "number", "cannot write a non-number as a number");
      assert(value >= 0, "specified a negative value for writing an unsigned value");
      assert(value <= max, "value is larger than maximum value for type");
      assert(Math.floor(value) === value, "value has a fractional component");
    }

    function verifsint(value, max, min) {
      assert(typeof value === "number", "cannot write a non-number as a number");
      assert(value <= max, "value larger than maximum allowed value");
      assert(value >= min, "value smaller than minimum allowed value");
      assert(Math.floor(value) === value, "value has a fractional component");
    }

    function verifIEEE754(value, max, min) {
      assert(typeof value === "number", "cannot write a non-number as a number");
      assert(value <= max, "value larger than maximum allowed value");
      assert(value >= min, "value smaller than minimum allowed value");
    }

    function assert(test, message) {
      if (!test) throw new Error(message || "Failed assertion");
    }
  }, { "base64-js": 4, ieee754: 5 }], 4: [function (require, module, exports) {
    var lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    ;(function (exports) {
      "use strict";

      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;

      var PLUS = "+".charCodeAt(0);
      var SLASH = "/".charCodeAt(0);
      var NUMBER = "0".charCodeAt(0);
      var LOWER = "a".charCodeAt(0);
      var UPPER = "A".charCodeAt(0);

      function decode(elt) {
        var code = elt.charCodeAt(0);
        if (code === PLUS) {
          return 62;
        } // '+'
        if (code === SLASH) {
          return 63;
        } // '/'
        if (code < NUMBER) {
          return -1;
        } //no match
        if (code < NUMBER + 10) {
          return code - NUMBER + 26 + 26;
        }if (code < UPPER + 26) {
          return code - UPPER;
        }if (code < LOWER + 26) {
          return code - LOWER + 26;
        }
      }

      function b64ToByteArray(b64) {
        var i, j, l, tmp, placeHolders, arr;

        if (b64.length % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }

        // the number of equal signs (place holders)
        // if there are two placeholders, than the two characters before it
        // represent one byte
        // if there is only one, then the three characters before it represent 2 bytes
        // this is just a cheap hack to not do indexOf twice
        var len = b64.length;
        placeHolders = "=" === b64.charAt(len - 2) ? 2 : "=" === b64.charAt(len - 1) ? 1 : 0;

        // base64 is 4/3 + up to two characters of the original data
        arr = new Arr(b64.length * 3 / 4 - placeHolders);

        // if there are placeholders, only get up to the last complete 4 chars
        l = placeHolders > 0 ? b64.length - 4 : b64.length;

        var L = 0;

        function push(v) {
          arr[L++] = v;
        }

        for (i = 0, j = 0; i < l; i += 4, j += 3) {
          tmp = decode(b64.charAt(i)) << 18 | decode(b64.charAt(i + 1)) << 12 | decode(b64.charAt(i + 2)) << 6 | decode(b64.charAt(i + 3));
          push((tmp & 16711680) >> 16);
          push((tmp & 65280) >> 8);
          push(tmp & 255);
        }

        if (placeHolders === 2) {
          tmp = decode(b64.charAt(i)) << 2 | decode(b64.charAt(i + 1)) >> 4;
          push(tmp & 255);
        } else if (placeHolders === 1) {
          tmp = decode(b64.charAt(i)) << 10 | decode(b64.charAt(i + 1)) << 4 | decode(b64.charAt(i + 2)) >> 2;
          push(tmp >> 8 & 255);
          push(tmp & 255);
        }

        return arr;
      }

      function uint8ToBase64(uint8) {
        var i,
            extraBytes = uint8.length % 3,
            // if we have 1 byte left, pad 2 bytes
        output = "",
            temp,
            length;

        function encode(num) {
          return lookup.charAt(num);
        }

        function tripletToBase64(num) {
          return encode(num >> 18 & 63) + encode(num >> 12 & 63) + encode(num >> 6 & 63) + encode(num & 63);
        }

        // go through the array every three bytes, we'll deal with trailing stuff later
        for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
          temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
          output += tripletToBase64(temp);
        }

        // pad the end with zeros, but make sure to not forget the extra bytes
        switch (extraBytes) {
          case 1:
            temp = uint8[uint8.length - 1];
            output += encode(temp >> 2);
            output += encode(temp << 4 & 63);
            output += "==";
            break;
          case 2:
            temp = (uint8[uint8.length - 2] << 8) + uint8[uint8.length - 1];
            output += encode(temp >> 10);
            output += encode(temp >> 4 & 63);
            output += encode(temp << 2 & 63);
            output += "=";
            break;
        }

        return output;
      }

      exports.toByteArray = b64ToByteArray;
      exports.fromByteArray = uint8ToBase64;
    })(typeof exports === "undefined" ? this.base64js = {} : exports);
  }, {}], 5: [function (require, module, exports) {
    exports.read = function (buffer, offset, isLE, mLen, nBytes) {
      var e,
          m,
          eLen = nBytes * 8 - mLen - 1,
          eMax = (1 << eLen) - 1,
          eBias = eMax >> 1,
          nBits = -7,
          i = isLE ? nBytes - 1 : 0,
          d = isLE ? -1 : 1,
          s = buffer[offset + i];

      i += d;

      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : (s ? -1 : 1) * Infinity;
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };

    exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
      var e,
          m,
          c,
          eLen = nBytes * 8 - mLen - 1,
          eMax = (1 << eLen) - 1,
          eBias = eMax >> 1,
          rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
          i = isLE ? 0 : nBytes - 1,
          d = isLE ? 1 : -1,
          s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8);

      e = e << mLen | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8);

      buffer[offset + i - d] |= s * 128;
    };
  }, {}], 6: [function (require, module, exports) {
    var Buffer = require("buffer").Buffer;
    var intSize = 4;
    var zeroBuffer = new Buffer(intSize);zeroBuffer.fill(0);
    var chrsz = 8;

    function toArray(buf, bigEndian) {
      if (buf.length % intSize !== 0) {
        var len = buf.length + (intSize - buf.length % intSize);
        buf = Buffer.concat([buf, zeroBuffer], len);
      }

      var arr = [];
      var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
      for (var i = 0; i < buf.length; i += intSize) {
        arr.push(fn.call(buf, i));
      }
      return arr;
    }

    function toBuffer(arr, size, bigEndian) {
      var buf = new Buffer(size);
      var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
      for (var i = 0; i < arr.length; i++) {
        fn.call(buf, arr[i], i * 4, true);
      }
      return buf;
    }

    function hash(buf, fn, hashSize, bigEndian) {
      if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
      var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
      return toBuffer(arr, hashSize, bigEndian);
    }

    module.exports = { hash: hash };
  }, { buffer: 3 }], 7: [function (require, module, exports) {
    var Buffer = require("buffer").Buffer;
    var sha = require("./sha");
    var sha256 = require("./sha256");
    var rng = require("./rng");
    var md5 = require("./md5");

    var algorithms = {
      sha1: sha,
      sha256: sha256,
      md5: md5
    };

    var blocksize = 64;
    var zeroBuffer = new Buffer(blocksize);zeroBuffer.fill(0);
    function hmac(fn, key, data) {
      if (!Buffer.isBuffer(key)) key = new Buffer(key);
      if (!Buffer.isBuffer(data)) data = new Buffer(data);

      if (key.length > blocksize) {
        key = fn(key);
      } else if (key.length < blocksize) {
        key = Buffer.concat([key, zeroBuffer], blocksize);
      }

      var ipad = new Buffer(blocksize),
          opad = new Buffer(blocksize);
      for (var i = 0; i < blocksize; i++) {
        ipad[i] = key[i] ^ 54;
        opad[i] = key[i] ^ 92;
      }

      var hash = fn(Buffer.concat([ipad, data]));
      return fn(Buffer.concat([opad, hash]));
    }

    function hash(alg, key) {
      alg = alg || "sha1";
      var fn = algorithms[alg];
      var bufs = [];
      var length = 0;
      if (!fn) error("algorithm:", alg, "is not yet supported");
      return {
        update: function (data) {
          if (!Buffer.isBuffer(data)) data = new Buffer(data);

          bufs.push(data);
          length += data.length;
          return this;
        },
        digest: function (enc) {
          var buf = Buffer.concat(bufs);
          var r = key ? hmac(fn, key, buf) : fn(buf);
          bufs = null;
          return enc ? r.toString(enc) : r;
        }
      };
    }

    function error() {
      var m = [].slice.call(arguments).join(" ");
      throw new Error([m, "we accept pull requests", "http://github.com/dominictarr/crypto-browserify"].join("\n"));
    }

    exports.createHash = function (alg) {
      return hash(alg);
    };
    exports.createHmac = function (alg, key) {
      return hash(alg, key);
    };
    exports.randomBytes = function (size, callback) {
      if (callback && callback.call) {
        try {
          callback.call(this, undefined, new Buffer(rng(size)));
        } catch (err) {
          callback(err);
        }
      } else {
        return new Buffer(rng(size));
      }
    };

    function each(a, f) {
      for (var i in a) f(a[i], i);
    }

    // the least I can do is make error messages for the rest of the node.js/crypto api.
    each(["createCredentials", "createCipher", "createCipheriv", "createDecipher", "createDecipheriv", "createSign", "createVerify", "createDiffieHellman", "pbkdf2"], function (name) {
      exports[name] = function () {
        error("sorry,", name, "is not implemented yet");
      };
    });
  }, { "./md5": 8, "./rng": 9, "./sha": 10, "./sha256": 11, buffer: 3 }], 8: [function (require, module, exports) {
    /*
     * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for more info.
     */

    var helpers = require("./helpers");

    /*
     * Perform a simple self-test to see if the VM is working
     */
    function md5_vm_test() {
      return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
    }

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length
     */
    function core_md5(x, len) {
      /* append padding */
      x[len >> 5] |= 128 << len % 32;
      x[(len + 64 >>> 9 << 4) + 14] = len;

      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for (var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;

        a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

        a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

        a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

        a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
      }
      return Array(a, b, c, d);
    }

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    function md5_cmn(q, a, b, x, s, t) {
      return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
      return md5_cmn(b & c | ~b & d, a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
      return md5_cmn(b & d | c & ~d, a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
      return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
      return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    function safe_add(x, y) {
      var lsw = (x & 65535) + (y & 65535);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    function bit_rol(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }

    module.exports = function md5(buf) {
      return helpers.hash(buf, core_md5, 16);
    };
  }, { "./helpers": 6 }], 9: [function (require, module, exports) {
    // Original code adapted from Robert Kieffer.
    // details at https://github.com/broofa/node-uuid
    (function () {
      var _global = this;

      var mathRNG, whatwgRNG;

      // NOTE: Math.random() does not guarantee "cryptographic quality"
      mathRNG = function (size) {
        var bytes = new Array(size);
        var r;

        for (var i = 0, r; i < size; i++) {
          if ((i & 3) == 0) r = Math.random() * 4294967296;
          bytes[i] = r >>> ((i & 3) << 3) & 255;
        }

        return bytes;
      };

      if (_global.crypto && crypto.getRandomValues) {
        whatwgRNG = function (size) {
          var bytes = new Uint8Array(size);
          crypto.getRandomValues(bytes);
          return bytes;
        };
      }

      module.exports = whatwgRNG || mathRNG;
    })();
  }, {}], 10: [function (require, module, exports) {
    /*
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
     * in FIPS PUB 180-1
     * Version 2.1a Copyright Paul Johnston 2000 - 2002.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for details.
     */

    var helpers = require("./helpers");

    /*
     * Calculate the SHA-1 of an array of big-endian words, and a bit length
     */
    function core_sha1(x, len) {
      /* append padding */
      x[len >> 5] |= 128 << 24 - len % 32;
      x[(len + 64 >> 9 << 4) + 15] = len;

      var w = Array(80);
      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;
      var e = -1009589776;

      for (var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        var olde = e;

        for (var j = 0; j < 80; j++) {
          if (j < 16) w[j] = x[i + j];else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
          var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
          e = d;
          d = c;
          c = rol(b, 30);
          b = a;
          a = t;
        }

        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
        e = safe_add(e, olde);
      }
      return Array(a, b, c, d, e);
    }

    /*
     * Perform the appropriate triplet combination function for the current
     * iteration
     */
    function sha1_ft(t, b, c, d) {
      if (t < 20) {
        return b & c | ~b & d;
      }if (t < 40) {
        return b ^ c ^ d;
      }if (t < 60) {
        return b & c | b & d | c & d;
      }return b ^ c ^ d;
    }

    /*
     * Determine the appropriate additive constant for the current iteration
     */
    function sha1_kt(t) {
      return t < 20 ? 1518500249 : t < 40 ? 1859775393 : t < 60 ? -1894007588 : -899497514;
    }

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    function safe_add(x, y) {
      var lsw = (x & 65535) + (y & 65535);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    function rol(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }

    module.exports = function sha1(buf) {
      return helpers.hash(buf, core_sha1, 20, true);
    };
  }, { "./helpers": 6 }], 11: [function (require, module, exports) {
    /**
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
     * in FIPS 180-2
     * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     *
     */

    var helpers = require("./helpers");

    var safe_add = function (x, y) {
      var lsw = (x & 65535) + (y & 65535);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    };

    var S = function (X, n) {
      return X >>> n | X << 32 - n;
    };

    var R = function (X, n) {
      return X >>> n;
    };

    var Ch = function (x, y, z) {
      return x & y ^ ~x & z;
    };

    var Maj = function (x, y, z) {
      return x & y ^ x & z ^ y & z;
    };

    var Sigma0256 = function (x) {
      return S(x, 2) ^ S(x, 13) ^ S(x, 22);
    };

    var Sigma1256 = function (x) {
      return S(x, 6) ^ S(x, 11) ^ S(x, 25);
    };

    var Gamma0256 = function (x) {
      return S(x, 7) ^ S(x, 18) ^ R(x, 3);
    };

    var Gamma1256 = function (x) {
      return S(x, 17) ^ S(x, 19) ^ R(x, 10);
    };

    var core_sha256 = function (m, l) {
      var K = new Array(1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298);
      var HASH = new Array(1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225);
      var W = new Array(64);
      var a, b, c, d, e, f, g, h, i, j;
      var T1, T2;
      /* append padding */
      m[l >> 5] |= 128 << 24 - l % 32;
      m[(l + 64 >> 9 << 4) + 15] = l;
      for (var i = 0; i < m.length; i += 16) {
        a = HASH[0];b = HASH[1];c = HASH[2];d = HASH[3];e = HASH[4];f = HASH[5];g = HASH[6];h = HASH[7];
        for (var j = 0; j < 64; j++) {
          if (j < 16) {
            W[j] = m[j + i];
          } else {
            W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
          }
          T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
          T2 = safe_add(Sigma0256(a), Maj(a, b, c));
          h = g;g = f;f = e;e = safe_add(d, T1);d = c;c = b;b = a;a = safe_add(T1, T2);
        }
        HASH[0] = safe_add(a, HASH[0]);HASH[1] = safe_add(b, HASH[1]);HASH[2] = safe_add(c, HASH[2]);HASH[3] = safe_add(d, HASH[3]);
        HASH[4] = safe_add(e, HASH[4]);HASH[5] = safe_add(f, HASH[5]);HASH[6] = safe_add(g, HASH[6]);HASH[7] = safe_add(h, HASH[7]);
      }
      return HASH;
    };

    module.exports = function sha256(buf) {
      return helpers.hash(buf, core_sha256, 32, true);
    };
  }, { "./helpers": 6 }] }, {}, [2]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c3RyYWp1bmlvci8uYXRvbS9wYWNrYWdlcy9hdG9tLXBhaXIvbGliL3B1c2hlci9wdXNoZXItanMtY2xpZW50LWF1dGguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLE9BQU8sT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUEsSUFBRyxDQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsRUFBQyxD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QUE7QUFDaEIsU0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFBOztBQUVoQixTQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUE7QUFDcEIsU0FBRyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFBO0FBQzFCLFNBQUcsQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQTtBQUNoQyxTQUFHLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUE7QUFDdEIsU0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFBO0FBQ2xCLFNBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQTtBQUNwQixTQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUE7QUFDNUIsU0FBRyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFBO0FBQ2xDLFNBQUcsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQTtBQUNsQyxTQUFHLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUE7QUFDbEMsU0FBRyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFBO0FBQ2xDLFNBQUcsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQTtBQUMxQixTQUFHLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUE7QUFDaEMsU0FBRyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFBO0FBQ2hDLFNBQUcsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQTtBQUNoQyxTQUFHLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUE7QUFDaEMsU0FBRyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFBO0FBQ2hDLFNBQUcsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQTtBQUNoQyxTQUFHLENBQUMsWUFBWSxH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LENBQUEsR0FBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0tBQ2pELENBQUM7O0FBRUYsV0FBTyxDQUFDLEtBQUssR0FBRyxVQUFTLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQ2xFLFVBQUksQ0FBQztVQUFFLENBQUM7VUFBRSxDQUFDO1VBQ1AsSUFBSSxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUM7VUFDNUIsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQSxHQUFJLENBQUM7VUFDdEIsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDO1VBQ2pCLEVBQUUsR0FBSSxJQUFJLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEFBQUM7VUFDNUQsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUksTUFBTSxHQUFHLENBQUMsQUFBQztVQUMzQixDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7VUFDakIsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLElBQUssS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQUFBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRTVELFdBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUV4QixVQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssUUFBUSxFQUFFO0FBQ3RDLFNBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixTQUFDLEdBQUcsSUFBSSxDQUFD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LElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7O0FBRWIsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFHLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVDLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDOztBQUVqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUcsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFJLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBSSxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUcsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRWpELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUcsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUcsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7QUFFaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUVoRCxTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztPQUN2QjtBQUNELGFBQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBRTFCOzs7OztBQUtELGFBQVMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUNqQztBQUNFLGFBQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDekU7QUFDRCxhQUFTLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFD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USxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBRTtLQUN4QyxDQUFDOztBQUVGLFFBQUksU0FBUyxHQUFHLFVBQVMsQ0FBQyxFQUFFO0FBQzFCLGFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUU7S0FDeEMsQ0FBQzs7QUFFRixRQUFJLFNBQVMsR0FBRyxVQUFTLENBQUMsRUFBRTtBQUMxQixhQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFFO0tBQ3ZDLENBQUM7O0FBRUYsUUFBSSxTQUFTLEdBQUcsVUFBUyxDQUFDLEVBQUU7QUFDMUIsYUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBRTtLQUN6QyxDQUFDOztBQUVGLFFBQUksV0FBVyxHQUFHLFVBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMvQixVQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsU0FBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNqdEIsVUFBSSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsU0FBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ25ILFVBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3RCLFVBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2pDLFVBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQzs7QUFFYixPQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUksSUFBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQUFBQyxDQUFDO0FBQ25DLE9BQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFBLEdBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pDLFdBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7QUFDckMsU0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkcsYUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMzQixjQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7QUFDVixhQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztXQUNqQixNQUFNO0FBQ0wsYUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7V0FDckc7QUFDRCxZQUFFLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLFlBQUUsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsV0FBQyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNyRjtBQUNELFlBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9ILFlBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2hJO0FBQ0QsYUFBTyxJQUFJLENBQUM7S0FDYixDQUFDOztBQUVGLFVBQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQ3BDLGFBQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNqRCxDQUFDO0dBRUQsRUFBQyxFQUFDLFdBQVcsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiIvVXNlcnMvdXN0cmFqdW5pb3IvLmF0b20vcGFja2FnZXMvYXRvbS1wYWlyL2xpYi9wdXNoZXIvcHVzaGVyLWpzLWNsaWVudC1hdXRoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIGNyeXB0byA9IHJlcXVpcmUoICdjcnlwdG8nICk7XG5cbi8qKlxuICogVXNlZCBmb3IgYXV0aGVudGljYXRpbmcgY2hhbm5lbCBzdWJzY3JpcHRpb25zIGVudGlyZWx5IG9uIHRoZSBjbGllbnQuXG4gKiBJZiB0aGUgY2xpZW50IGlzIGEgd2ViIGJyb3dzZXIgdGhlbiB0aGlzIGNhbiBiZSBoaWdobHkgaW5zZWN1cmUgYW5kIGl0XG4gKiBJUyBOT1QgcmVjb21tZW5kZWQgdGhhdCB5b3UgZG8gdGhpcy4gWW91IFNIT1VMRCBERUZJTklURUxZIE5PVCBETyBUSElTXG4gKiBpbiBwcm9kdWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIENsaWVudEF1dGhvcml6ZXIoIG9wdGlvbnMgKSB7XG4gIGlmKCAhb3B0aW9ucy5rZXkgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCAnYSBcImtleVwiIG11c3QgYmUgcHJvdmlkZWQnICk7XG4gIH1cblxuICBpZiggIW9wdGlvbnMuc2VjcmV0ICkge1xuICAgIHRocm93IG5ldyBFcnJvciggJ2EgXCJzZWNyZXRcIiBtdXN0IGJlIHByb3ZpZGVkJyApO1xuICB9XG5cbiAgdGhpcy5rZXkgPSBvcHRpb25zLmtleTtcbiAgdGhpcy5zZWNyZXQgPSBvcHRpb25zLnNlY3JldDtcbn1cblxuLyoqXG4gKiBBdXRoZW50aWNhdGUgdGhlIHN1YnNjcmlwdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzb2NrZXRJZFxuICogICAgVGhlIHNvY2tldCBpZCBmb3IgdGhlIGNvbm5lY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBjaGFubmVsXG4gKiAgICBUaGUgbmFtZSBvZiB0aGUgY2hhbm5lbCBiZWluZyBzdWJzY3JpYmVkIHRvXG4gKiBAcGFyYW0ge09iamVjdH0gY2hhbm5lbERhdGFcbiAqICAgIEFkZGl0aW9uYWwgY2hhbm5lbCBkYXRhIHRvIGJlIGluY2x1ZGVkIGluIHRoZSBhdXRoZW50aWNhdGlvbiBzaWduYXR1cmVcbiAqL1xuQ2xpZW50QXV0aG9yaXplci5wcm90b3R5cGUuYXV0aCA9IGZ1bmN0aW9uKHNvY2tldElkLCBjaGFubmVsLCBjaGFubmVsRGF0YSkge1xuICBpZiggY2hhbm5lbC5pbmRleE9mKCAncHJlc2VuY2UtJyApID09PSAwICkge1xuXG4gICAgaWYoICFjaGFubmVsRGF0YSApIHtcbiAgICAgIHRocm93IEVycm9yKCAnXCJjaGFubmVsRGF0YVwiIGlzIHJlcXVpcmVkIHdoZW4gYXV0aGVudGljYXRpbmcgYSBQcmVzZW5jZSBjaGFubmVsJyApO1xuICAgIH1cbiAgICBpZiggIWNoYW5uZWxEYXRhLnVzZXJfaWQgKSB7XG4gICAgICB0aHJvdyBFcnJvciggJ1wiY2hhbm5lbERhdGEudXNlcl9pZFwiIG11c3QgYmUgc2V0IHdoZW4gYXV0aGVudGljYXRpbmcgYSBQcmVzZW5jZSBjaGFubmVsJyApO1xuICAgIH1cbiAgfVxuXG4gIHZhciByZXR1cm5IYXNoID0ge307XG4gIHZhciBjaGFubmVsRGF0YVN0ciA9ICcnO1xuICBpZiAoY2hhbm5lbERhdGEpIHtcbiAgICBjaGFubmVsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNoYW5uZWxEYXRhKTtcbiAgICBjaGFubmVsRGF0YVN0ciA9ICc6JyArIGNoYW5uZWxEYXRhO1xuICAgIHJldHVybkhhc2guY2hhbm5lbF9kYXRhID0gY2hhbm5lbERhdGE7XG4gIH1cbiAgdmFyIHN0cmluZ1RvU2lnbiA9IHNvY2tldElkICsgJzonICsgY2hhbm5lbCArIGNoYW5uZWxEYXRhU3RyO1xuICByZXR1cm5IYXNoLmF1dGggPSB0aGlzLmtleSArICc6JyArIGNyeXB0by5jcmVhdGVIbWFjKCdzaGEyNTYnLCB0aGlzLnNlY3JldCkudXBkYXRlKHN0cmluZ1RvU2lnbikuZGlnZXN0KCdoZXgnKTtcbiAgcmV0dXJuIHJldHVybkhhc2g7XG59O1xuXG4vLyBTdGF0aWMgSGVscGVyc1xuXG4vKipcbiAqIFNldHVwIHVwIHRoZSBjbGllbnQgYXV0aG9yaXNlci5cbiAqXG4gKiBAcGFyYW0ge1B1c2hlcn0gUHVzaGVyXG4gKiAgICBUaGUgUHVzaGVyIGdsb2JhbCByZWZlcmVuY2UuXG4gKi9cbkNsaWVudEF1dGhvcml6ZXIuc2V0VXBQdXNoZXIgPSBmdW5jdGlvbiggUHVzaGVyICkge1xuICBQdXNoZXIuYXV0aG9yaXplcnMuY2xpZW50ID0gQ2xpZW50QXV0aG9yaXplci5jbGllbnRBdXRoO1xufTtcblxuLyoqXG4gKiBQZXJmb3JtIHRoZSBjbGllbnQgYXV0aGVudGljYXRpb24uIENhbGxlZCBieSBQdXNoZXIgbGlicmFyeSB3aGVuIGF1dGhUcmFuc3BvcnRcbiAqIGlzIHNldCB0byAnY2xpZW50Jy5cbiAqXG4gKiBXaGVuIHRoaXMgaXMgZXhlY3V0ZWQgaXQgd2lsbCBiZSBzY29wZWQgc28gdGhhdCBgdGhpc2AgcmVmZXJlbmNlIGFuIGluc3RhbmNlXG4gKiBvZiBgUHVzaGVyLkNoYW5uZWwuQXV0aG9yaXplcmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNvY2tldElkXG4gKiAgICBUaGUgaWQgb2YgdGhlIHNvY2tldCBiZWluZyBhdXRoZW50aWNhdGVkIHRvIHN1YnNjcmliZSB0byB0aGUgY2hhbm5lbC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiAgICBUaGUgY2FsbGJhY2sgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYXV0aGVudGljYXRpb24gaGFzIGNvbXBsZXRlZC5cbiAqL1xuQ2xpZW50QXV0aG9yaXplci5jbGllbnRBdXRoID0gZnVuY3Rpb24oIHNvY2tldElkLCBjYWxsYmFjayApe1xuICB2YXIgYXV0aG9yaXplciA9IENsaWVudEF1dGhvcml6ZXIuY3JlYXRlQXV0aG9yaXplciggdGhpcy5vcHRpb25zLmNsaWVudEF1dGggKTtcbiAgdmFyIGNoYW5uZWxEYXRhID0gbnVsbDtcbiAgaWYoIHRoaXMub3B0aW9ucy5jbGllbnRBdXRoLnVzZXJfaWQgKSB7XG4gICAgY2hhbm5lbERhdGEgPSB7XG4gICAgICB1c2VyX2lkOiB0aGlzLm9wdGlvbnMuY2xpZW50QXV0aC51c2VyX2lkLFxuICAgICAgdXNlcl9pbmZvOiB0aGlzLm9wdGlvbnMuY2xpZW50QXV0aC51c2VyX2luZm9cbiAgICB9O1xuICB9XG4gIHZhciBoYXNoID0gYXV0aG9yaXplci5hdXRoKCBzb2NrZXRJZCwgdGhpcy5jaGFubmVsLm5hbWUsIGNoYW5uZWxEYXRhICk7XG4gIGNhbGxiYWNrKCBudWxsLCBoYXNoICk7XG59O1xuXG4vKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGEgQ2xpZW50QXV0aG9yaXplci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY2xpZW50QXV0aE9wdGlvblxuICogICAgVGhlIGNsaWVudCBhdXRoZW50aWNhdGlvbiBvcHRpb25zLlxuICogQHJldHVybnMgQ2xpZW50QXV0aG9yaXplclxuICovXG5DbGllbnRBdXRob3JpemVyLmNyZWF0ZUF1dGhvcml6ZXIgPSBmdW5jdGlvbiggY2xpZW50QXV0aE9wdGlvbnMgKSB7XG4gIHZhciBhdXRob3JpemVyID0gbmV3IENsaWVudEF1dGhvcml6ZXIoIGNsaWVudEF1dGhPcHRpb25zICk7XG4gIHJldHVybiBhdXRob3JpemVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnRBdXRob3JpemVyO1xuXG59LHtcImNyeXB0b1wiOjd9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbiggZnVuY3Rpb24oIFB1c2hlciApIHtcbiAgY29uc29sZS53YXJuKCdZb3UgYXJlIHVzaW5nIFB1c2hlckpTIGNsaWVudCBhdXRoZW50aWNhdGlvbi4gTmV2ZXIgZXZlciB1c2UgdGhpcyBmb3IgYSBwcm9kdWN0aW9uIGFwcGxpY2F0aW9uLCBhcyBpdCB3b3VsZCBleHBvc2UgeW91ciBzZWNyZXQga2V5cy4nKTtcblxuICB2YXIgQ2xpZW50QXV0aG9yaXplciA9IHJlcXVpcmUoICcuL0NsaWVudEF1dGhvcml6ZXInICk7XG4gIENsaWVudEF1dGhvcml6ZXIuc2V0VXBQdXNoZXIoIFB1c2hlciApO1xuXG59ICkoIHdpbmRvdy5QdXNoZXIgKTtcblxufSx7XCIuL0NsaWVudEF1dGhvcml6ZXJcIjoxfV0sMzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59LHtcImJhc2U2NC1qc1wiOjQsXCJpZWVlNzU0XCI6NX1dLDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUylcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0gpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcblxufSx7fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcblxufSx7fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xudmFyIGludFNpemUgPSA0O1xudmFyIHplcm9CdWZmZXIgPSBuZXcgQnVmZmVyKGludFNpemUpOyB6ZXJvQnVmZmVyLmZpbGwoMCk7XG52YXIgY2hyc3ogPSA4O1xuXG5mdW5jdGlvbiB0b0FycmF5KGJ1ZiwgYmlnRW5kaWFuKSB7XG4gIGlmICgoYnVmLmxlbmd0aCAlIGludFNpemUpICE9PSAwKSB7XG4gICAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGggKyAoaW50U2l6ZSAtIChidWYubGVuZ3RoICUgaW50U2l6ZSkpO1xuICAgIGJ1ZiA9IEJ1ZmZlci5jb25jYXQoW2J1ZiwgemVyb0J1ZmZlcl0sIGxlbik7XG4gIH1cblxuICB2YXIgYXJyID0gW107XG4gIHZhciBmbiA9IGJpZ0VuZGlhbiA/IGJ1Zi5yZWFkSW50MzJCRSA6IGJ1Zi5yZWFkSW50MzJMRTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWYubGVuZ3RoOyBpICs9IGludFNpemUpIHtcbiAgICBhcnIucHVzaChmbi5jYWxsKGJ1ZiwgaSkpO1xuICB9XG4gIHJldHVybiBhcnI7XG59XG5cbmZ1bmN0aW9uIHRvQnVmZmVyKGFyciwgc2l6ZSwgYmlnRW5kaWFuKSB7XG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHNpemUpO1xuICB2YXIgZm4gPSBiaWdFbmRpYW4gPyBidWYud3JpdGVJbnQzMkJFIDogYnVmLndyaXRlSW50MzJMRTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICBmbi5jYWxsKGJ1ZiwgYXJyW2ldLCBpICogNCwgdHJ1ZSk7XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZnVuY3Rpb24gaGFzaChidWYsIGZuLCBoYXNoU2l6ZSwgYmlnRW5kaWFuKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIGJ1ZiA9IG5ldyBCdWZmZXIoYnVmKTtcbiAgdmFyIGFyciA9IGZuKHRvQXJyYXkoYnVmLCBiaWdFbmRpYW4pLCBidWYubGVuZ3RoICogY2hyc3opO1xuICByZXR1cm4gdG9CdWZmZXIoYXJyLCBoYXNoU2l6ZSwgYmlnRW5kaWFuKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IGhhc2g6IGhhc2ggfTtcblxufSx7XCJidWZmZXJcIjozfV0sNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyXG52YXIgc2hhID0gcmVxdWlyZSgnLi9zaGEnKVxudmFyIHNoYTI1NiA9IHJlcXVpcmUoJy4vc2hhMjU2JylcbnZhciBybmcgPSByZXF1aXJlKCcuL3JuZycpXG52YXIgbWQ1ID0gcmVxdWlyZSgnLi9tZDUnKVxuXG52YXIgYWxnb3JpdGhtcyA9IHtcbiAgc2hhMTogc2hhLFxuICBzaGEyNTY6IHNoYTI1NixcbiAgbWQ1OiBtZDVcbn1cblxudmFyIGJsb2Nrc2l6ZSA9IDY0XG52YXIgemVyb0J1ZmZlciA9IG5ldyBCdWZmZXIoYmxvY2tzaXplKTsgemVyb0J1ZmZlci5maWxsKDApXG5mdW5jdGlvbiBobWFjKGZuLCBrZXksIGRhdGEpIHtcbiAgaWYoIUJ1ZmZlci5pc0J1ZmZlcihrZXkpKSBrZXkgPSBuZXcgQnVmZmVyKGtleSlcbiAgaWYoIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkgZGF0YSA9IG5ldyBCdWZmZXIoZGF0YSlcblxuICBpZihrZXkubGVuZ3RoID4gYmxvY2tzaXplKSB7XG4gICAga2V5ID0gZm4oa2V5KVxuICB9IGVsc2UgaWYoa2V5Lmxlbmd0aCA8IGJsb2Nrc2l6ZSkge1xuICAgIGtleSA9IEJ1ZmZlci5jb25jYXQoW2tleSwgemVyb0J1ZmZlcl0sIGJsb2Nrc2l6ZSlcbiAgfVxuXG4gIHZhciBpcGFkID0gbmV3IEJ1ZmZlcihibG9ja3NpemUpLCBvcGFkID0gbmV3IEJ1ZmZlcihibG9ja3NpemUpXG4gIGZvcih2YXIgaSA9IDA7IGkgPCBibG9ja3NpemU7IGkrKykge1xuICAgIGlwYWRbaV0gPSBrZXlbaV0gXiAweDM2XG4gICAgb3BhZFtpXSA9IGtleVtpXSBeIDB4NUNcbiAgfVxuXG4gIHZhciBoYXNoID0gZm4oQnVmZmVyLmNvbmNhdChbaXBhZCwgZGF0YV0pKVxuICByZXR1cm4gZm4oQnVmZmVyLmNvbmNhdChbb3BhZCwgaGFzaF0pKVxufVxuXG5mdW5jdGlvbiBoYXNoKGFsZywga2V5KSB7XG4gIGFsZyA9IGFsZyB8fCAnc2hhMSdcbiAgdmFyIGZuID0gYWxnb3JpdGhtc1thbGddXG4gIHZhciBidWZzID0gW11cbiAgdmFyIGxlbmd0aCA9IDBcbiAgaWYoIWZuKSBlcnJvcignYWxnb3JpdGhtOicsIGFsZywgJ2lzIG5vdCB5ZXQgc3VwcG9ydGVkJylcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBpZighQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSBkYXRhID0gbmV3IEJ1ZmZlcihkYXRhKVxuXG4gICAgICBidWZzLnB1c2goZGF0YSlcbiAgICAgIGxlbmd0aCArPSBkYXRhLmxlbmd0aFxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9LFxuICAgIGRpZ2VzdDogZnVuY3Rpb24gKGVuYykge1xuICAgICAgdmFyIGJ1ZiA9IEJ1ZmZlci5jb25jYXQoYnVmcylcbiAgICAgIHZhciByID0ga2V5ID8gaG1hYyhmbiwga2V5LCBidWYpIDogZm4oYnVmKVxuICAgICAgYnVmcyA9IG51bGxcbiAgICAgIHJldHVybiBlbmMgPyByLnRvU3RyaW5nKGVuYykgOiByXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGVycm9yICgpIHtcbiAgdmFyIG0gPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykuam9pbignICcpXG4gIHRocm93IG5ldyBFcnJvcihbXG4gICAgbSxcbiAgICAnd2UgYWNjZXB0IHB1bGwgcmVxdWVzdHMnLFxuICAgICdodHRwOi8vZ2l0aHViLmNvbS9kb21pbmljdGFyci9jcnlwdG8tYnJvd3NlcmlmeSdcbiAgICBdLmpvaW4oJ1xcbicpKVxufVxuXG5leHBvcnRzLmNyZWF0ZUhhc2ggPSBmdW5jdGlvbiAoYWxnKSB7IHJldHVybiBoYXNoKGFsZykgfVxuZXhwb3J0cy5jcmVhdGVIbWFjID0gZnVuY3Rpb24gKGFsZywga2V5KSB7IHJldHVybiBoYXNoKGFsZywga2V5KSB9XG5leHBvcnRzLnJhbmRvbUJ5dGVzID0gZnVuY3Rpb24oc2l6ZSwgY2FsbGJhY2spIHtcbiAgaWYgKGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwpIHtcbiAgICB0cnkge1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCB1bmRlZmluZWQsIG5ldyBCdWZmZXIocm5nKHNpemUpKSlcbiAgICB9IGNhdGNoIChlcnIpIHsgY2FsbGJhY2soZXJyKSB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIocm5nKHNpemUpKVxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2goYSwgZikge1xuICBmb3IodmFyIGkgaW4gYSlcbiAgICBmKGFbaV0sIGkpXG59XG5cbi8vIHRoZSBsZWFzdCBJIGNhbiBkbyBpcyBtYWtlIGVycm9yIG1lc3NhZ2VzIGZvciB0aGUgcmVzdCBvZiB0aGUgbm9kZS5qcy9jcnlwdG8gYXBpLlxuZWFjaChbJ2NyZWF0ZUNyZWRlbnRpYWxzJ1xuLCAnY3JlYXRlQ2lwaGVyJ1xuLCAnY3JlYXRlQ2lwaGVyaXYnXG4sICdjcmVhdGVEZWNpcGhlcidcbiwgJ2NyZWF0ZURlY2lwaGVyaXYnXG4sICdjcmVhdGVTaWduJ1xuLCAnY3JlYXRlVmVyaWZ5J1xuLCAnY3JlYXRlRGlmZmllSGVsbG1hbidcbiwgJ3Bia2RmMiddLCBmdW5jdGlvbiAobmFtZSkge1xuICBleHBvcnRzW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgIGVycm9yKCdzb3JyeSwnLCBuYW1lLCAnaXMgbm90IGltcGxlbWVudGVkIHlldCcpXG4gIH1cbn0pXG5cbn0se1wiLi9tZDVcIjo4LFwiLi9ybmdcIjo5LFwiLi9zaGFcIjoxMCxcIi4vc2hhMjU2XCI6MTEsXCJidWZmZXJcIjozfV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vKlxyXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFJTQSBEYXRhIFNlY3VyaXR5LCBJbmMuIE1ENSBNZXNzYWdlXHJcbiAqIERpZ2VzdCBBbGdvcml0aG0sIGFzIGRlZmluZWQgaW4gUkZDIDEzMjEuXHJcbiAqIFZlcnNpb24gMi4xIENvcHlyaWdodCAoQykgUGF1bCBKb2huc3RvbiAxOTk5IC0gMjAwMi5cclxuICogT3RoZXIgY29udHJpYnV0b3JzOiBHcmVnIEhvbHQsIEFuZHJldyBLZXBlcnQsIFlkbmFyLCBMb3N0aW5ldFxyXG4gKiBEaXN0cmlidXRlZCB1bmRlciB0aGUgQlNEIExpY2Vuc2VcclxuICogU2VlIGh0dHA6Ly9wYWpob21lLm9yZy51ay9jcnlwdC9tZDUgZm9yIG1vcmUgaW5mby5cclxuICovXHJcblxyXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xyXG5cclxuLypcclxuICogUGVyZm9ybSBhIHNpbXBsZSBzZWxmLXRlc3QgdG8gc2VlIGlmIHRoZSBWTSBpcyB3b3JraW5nXHJcbiAqL1xyXG5mdW5jdGlvbiBtZDVfdm1fdGVzdCgpXHJcbntcclxuICByZXR1cm4gaGV4X21kNShcImFiY1wiKSA9PSBcIjkwMDE1MDk4M2NkMjRmYjBkNjk2M2Y3ZDI4ZTE3ZjcyXCI7XHJcbn1cclxuXHJcbi8qXHJcbiAqIENhbGN1bGF0ZSB0aGUgTUQ1IG9mIGFuIGFycmF5IG9mIGxpdHRsZS1lbmRpYW4gd29yZHMsIGFuZCBhIGJpdCBsZW5ndGhcclxuICovXHJcbmZ1bmN0aW9uIGNvcmVfbWQ1KHgsIGxlbilcclxue1xyXG4gIC8qIGFwcGVuZCBwYWRkaW5nICovXHJcbiAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAoKGxlbikgJSAzMik7XHJcbiAgeFsoKChsZW4gKyA2NCkgPj4+IDkpIDw8IDQpICsgMTRdID0gbGVuO1xyXG5cclxuICB2YXIgYSA9ICAxNzMyNTg0MTkzO1xyXG4gIHZhciBiID0gLTI3MTczMzg3OTtcclxuICB2YXIgYyA9IC0xNzMyNTg0MTk0O1xyXG4gIHZhciBkID0gIDI3MTczMzg3ODtcclxuXHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDE2KVxyXG4gIHtcclxuICAgIHZhciBvbGRhID0gYTtcclxuICAgIHZhciBvbGRiID0gYjtcclxuICAgIHZhciBvbGRjID0gYztcclxuICAgIHZhciBvbGRkID0gZDtcclxuXHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgMF0sIDcgLCAtNjgwODc2OTM2KTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKyAxXSwgMTIsIC0zODk1NjQ1ODYpO1xyXG4gICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2krIDJdLCAxNywgIDYwNjEwNTgxOSk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsgM10sIDIyLCAtMTA0NDUyNTMzMCk7XHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgNF0sIDcgLCAtMTc2NDE4ODk3KTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKyA1XSwgMTIsICAxMjAwMDgwNDI2KTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKyA2XSwgMTcsIC0xNDczMjMxMzQxKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKyA3XSwgMjIsIC00NTcwNTk4Myk7XHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgOF0sIDcgLCAgMTc3MDAzNTQxNik7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgOV0sIDEyLCAtMTk1ODQxNDQxNyk7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsxMF0sIDE3LCAtNDIwNjMpO1xyXG4gICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2krMTFdLCAyMiwgLTE5OTA0MDQxNjIpO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krMTJdLCA3ICwgIDE4MDQ2MDM2ODIpO1xyXG4gICAgZCA9IG1kNV9mZihkLCBhLCBiLCBjLCB4W2krMTNdLCAxMiwgLTQwMzQxMTAxKTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKzE0XSwgMTcsIC0xNTAyMDAyMjkwKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKzE1XSwgMjIsICAxMjM2NTM1MzI5KTtcclxuXHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsgMV0sIDUgLCAtMTY1Nzk2NTEwKTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKyA2XSwgOSAsIC0xMDY5NTAxNjMyKTtcclxuICAgIGMgPSBtZDVfZ2coYywgZCwgYSwgYiwgeFtpKzExXSwgMTQsICA2NDM3MTc3MTMpO1xyXG4gICAgYiA9IG1kNV9nZyhiLCBjLCBkLCBhLCB4W2krIDBdLCAyMCwgLTM3Mzg5NzMwMik7XHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsgNV0sIDUgLCAtNzAxNTU4NjkxKTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKzEwXSwgOSAsICAzODAxNjA4Myk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsxNV0sIDE0LCAtNjYwNDc4MzM1KTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyA0XSwgMjAsIC00MDU1Mzc4NDgpO1xyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDldLCA1ICwgIDU2ODQ0NjQzOCk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsxNF0sIDkgLCAtMTAxOTgwMzY5MCk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsgM10sIDE0LCAtMTg3MzYzOTYxKTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyA4XSwgMjAsICAxMTYzNTMxNTAxKTtcclxuICAgIGEgPSBtZDVfZ2coYSwgYiwgYywgZCwgeFtpKzEzXSwgNSAsIC0xNDQ0NjgxNDY3KTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKyAyXSwgOSAsIC01MTQwMzc4NCk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsgN10sIDE0LCAgMTczNTMyODQ3Myk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsxMl0sIDIwLCAtMTkyNjYwNzczNCk7XHJcblxyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDVdLCA0ICwgLTM3ODU1OCk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsgOF0sIDExLCAtMjAyMjU3NDQ2Myk7XHJcbiAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSsxMV0sIDE2LCAgMTgzOTAzMDU2Mik7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsxNF0sIDIzLCAtMzUzMDk1NTYpO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDFdLCA0ICwgLTE1MzA5OTIwNjApO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krIDRdLCAxMSwgIDEyNzI4OTMzNTMpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krIDddLCAxNiwgLTE1NTQ5NzYzMik7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsxMF0sIDIzLCAtMTA5NDczMDY0MCk7XHJcbiAgICBhID0gbWQ1X2hoKGEsIGIsIGMsIGQsIHhbaSsxM10sIDQgLCAgNjgxMjc5MTc0KTtcclxuICAgIGQgPSBtZDVfaGgoZCwgYSwgYiwgYywgeFtpKyAwXSwgMTEsIC0zNTg1MzcyMjIpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krIDNdLCAxNiwgLTcyMjUyMTk3OSk7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsgNl0sIDIzLCAgNzYwMjkxODkpO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDldLCA0ICwgLTY0MDM2NDQ4Nyk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsxMl0sIDExLCAtNDIxODE1ODM1KTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKzE1XSwgMTYsICA1MzA3NDI1MjApO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krIDJdLCAyMywgLTk5NTMzODY1MSk7XHJcblxyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krIDBdLCA2ICwgLTE5ODYzMDg0NCk7XHJcbiAgICBkID0gbWQ1X2lpKGQsIGEsIGIsIGMsIHhbaSsgN10sIDEwLCAgMTEyNjg5MTQxNSk7XHJcbiAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSsxNF0sIDE1LCAtMTQxNjM1NDkwNSk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsgNV0sIDIxLCAtNTc0MzQwNTUpO1xyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krMTJdLCA2ICwgIDE3MDA0ODU1NzEpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krIDNdLCAxMCwgLTE4OTQ5ODY2MDYpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krMTBdLCAxNSwgLTEwNTE1MjMpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDFdLCAyMSwgLTIwNTQ5MjI3OTkpO1xyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krIDhdLCA2ICwgIDE4NzMzMTMzNTkpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krMTVdLCAxMCwgLTMwNjExNzQ0KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKyA2XSwgMTUsIC0xNTYwMTk4MzgwKTtcclxuICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpKzEzXSwgMjEsICAxMzA5MTUxNjQ5KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyA0XSwgNiAsIC0xNDU1MjMwNzApO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krIDJdLCAxNSwgIDcxODc4NzI1OSk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsgOV0sIDIxLCAtMzQzNDg1NTUxKTtcclxuXHJcbiAgICBhID0gc2FmZV9hZGQoYSwgb2xkYSk7XHJcbiAgICBiID0gc2FmZV9hZGQoYiwgb2xkYik7XHJcbiAgICBjID0gc2FmZV9hZGQoYywgb2xkYyk7XHJcbiAgICBkID0gc2FmZV9hZGQoZCwgb2xkZCk7XHJcbiAgfVxyXG4gIHJldHVybiBBcnJheShhLCBiLCBjLCBkKTtcclxuXHJcbn1cclxuXHJcbi8qXHJcbiAqIFRoZXNlIGZ1bmN0aW9ucyBpbXBsZW1lbnQgdGhlIGZvdXIgYmFzaWMgb3BlcmF0aW9ucyB0aGUgYWxnb3JpdGhtIHVzZXMuXHJcbiAqL1xyXG5mdW5jdGlvbiBtZDVfY21uKHEsIGEsIGIsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gc2FmZV9hZGQoYml0X3JvbChzYWZlX2FkZChzYWZlX2FkZChhLCBxKSwgc2FmZV9hZGQoeCwgdCkpLCBzKSxiKTtcclxufVxyXG5mdW5jdGlvbiBtZDVfZmYoYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKChiICYgYykgfCAoKH5iKSAmIGQpLCBhLCBiLCB4LCBzLCB0KTtcclxufVxyXG5mdW5jdGlvbiBtZDVfZ2coYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKChiICYgZCkgfCAoYyAmICh+ZCkpLCBhLCBiLCB4LCBzLCB0KTtcclxufVxyXG5mdW5jdGlvbiBtZDVfaGgoYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKGIgXiBjIF4gZCwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2lpKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbihjIF4gKGIgfCAofmQpKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuXHJcbi8qXHJcbiAqIEFkZCBpbnRlZ2Vycywgd3JhcHBpbmcgYXQgMl4zMi4gVGhpcyB1c2VzIDE2LWJpdCBvcGVyYXRpb25zIGludGVybmFsbHlcclxuICogdG8gd29yayBhcm91bmQgYnVncyBpbiBzb21lIEpTIGludGVycHJldGVycy5cclxuICovXHJcbmZ1bmN0aW9uIHNhZmVfYWRkKHgsIHkpXHJcbntcclxuICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpO1xyXG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcclxuICByZXR1cm4gKG1zdyA8PCAxNikgfCAobHN3ICYgMHhGRkZGKTtcclxufVxyXG5cclxuLypcclxuICogQml0d2lzZSByb3RhdGUgYSAzMi1iaXQgbnVtYmVyIHRvIHRoZSBsZWZ0LlxyXG4gKi9cclxuZnVuY3Rpb24gYml0X3JvbChudW0sIGNudClcclxue1xyXG4gIHJldHVybiAobnVtIDw8IGNudCkgfCAobnVtID4+PiAoMzIgLSBjbnQpKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtZDUoYnVmKSB7XHJcbiAgcmV0dXJuIGhlbHBlcnMuaGFzaChidWYsIGNvcmVfbWQ1LCAxNik7XHJcbn07XHJcblxufSx7XCIuL2hlbHBlcnNcIjo2fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyBPcmlnaW5hbCBjb2RlIGFkYXB0ZWQgZnJvbSBSb2JlcnQgS2llZmZlci5cbi8vIGRldGFpbHMgYXQgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWRcbihmdW5jdGlvbigpIHtcbiAgdmFyIF9nbG9iYWwgPSB0aGlzO1xuXG4gIHZhciBtYXRoUk5HLCB3aGF0d2dSTkc7XG5cbiAgLy8gTk9URTogTWF0aC5yYW5kb20oKSBkb2VzIG5vdCBndWFyYW50ZWUgXCJjcnlwdG9ncmFwaGljIHF1YWxpdHlcIlxuICBtYXRoUk5HID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgIHZhciBieXRlcyA9IG5ldyBBcnJheShzaXplKTtcbiAgICB2YXIgcjtcblxuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgYnl0ZXNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ5dGVzO1xuICB9XG5cbiAgaWYgKF9nbG9iYWwuY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgICB3aGF0d2dSTkcgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgICB2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheShzaXplKTtcbiAgICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnl0ZXMpO1xuICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0gd2hhdHdnUk5HIHx8IG1hdGhSTkc7XG5cbn0oKSlcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLypcbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgU2VjdXJlIEhhc2ggQWxnb3JpdGhtLCBTSEEtMSwgYXMgZGVmaW5lZFxuICogaW4gRklQUyBQVUIgMTgwLTFcbiAqIFZlcnNpb24gMi4xYSBDb3B5cmlnaHQgUGF1bCBKb2huc3RvbiAyMDAwIC0gMjAwMi5cbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcbiAqIERpc3RyaWJ1dGVkIHVuZGVyIHRoZSBCU0QgTGljZW5zZVxuICogU2VlIGh0dHA6Ly9wYWpob21lLm9yZy51ay9jcnlwdC9tZDUgZm9yIGRldGFpbHMuXG4gKi9cblxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxuLypcbiAqIENhbGN1bGF0ZSB0aGUgU0hBLTEgb2YgYW4gYXJyYXkgb2YgYmlnLWVuZGlhbiB3b3JkcywgYW5kIGEgYml0IGxlbmd0aFxuICovXG5mdW5jdGlvbiBjb3JlX3NoYTEoeCwgbGVuKVxue1xuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xuICB4W2xlbiA+PiA1XSB8PSAweDgwIDw8ICgyNCAtIGxlbiAlIDMyKTtcbiAgeFsoKGxlbiArIDY0ID4+IDkpIDw8IDQpICsgMTVdID0gbGVuO1xuXG4gIHZhciB3ID0gQXJyYXkoODApO1xuICB2YXIgYSA9ICAxNzMyNTg0MTkzO1xuICB2YXIgYiA9IC0yNzE3MzM4Nzk7XG4gIHZhciBjID0gLTE3MzI1ODQxOTQ7XG4gIHZhciBkID0gIDI3MTczMzg3ODtcbiAgdmFyIGUgPSAtMTAwOTU4OTc3NjtcblxuICBmb3IodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkgKz0gMTYpXG4gIHtcbiAgICB2YXIgb2xkYSA9IGE7XG4gICAgdmFyIG9sZGIgPSBiO1xuICAgIHZhciBvbGRjID0gYztcbiAgICB2YXIgb2xkZCA9IGQ7XG4gICAgdmFyIG9sZGUgPSBlO1xuXG4gICAgZm9yKHZhciBqID0gMDsgaiA8IDgwOyBqKyspXG4gICAge1xuICAgICAgaWYoaiA8IDE2KSB3W2pdID0geFtpICsgal07XG4gICAgICBlbHNlIHdbal0gPSByb2wod1tqLTNdIF4gd1tqLThdIF4gd1tqLTE0XSBeIHdbai0xNl0sIDEpO1xuICAgICAgdmFyIHQgPSBzYWZlX2FkZChzYWZlX2FkZChyb2woYSwgNSksIHNoYTFfZnQoaiwgYiwgYywgZCkpLFxuICAgICAgICAgICAgICAgICAgICAgICBzYWZlX2FkZChzYWZlX2FkZChlLCB3W2pdKSwgc2hhMV9rdChqKSkpO1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSByb2woYiwgMzApO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG5cbiAgICBhID0gc2FmZV9hZGQoYSwgb2xkYSk7XG4gICAgYiA9IHNhZmVfYWRkKGIsIG9sZGIpO1xuICAgIGMgPSBzYWZlX2FkZChjLCBvbGRjKTtcbiAgICBkID0gc2FmZV9hZGQoZCwgb2xkZCk7XG4gICAgZSA9IHNhZmVfYWRkKGUsIG9sZGUpO1xuICB9XG4gIHJldHVybiBBcnJheShhLCBiLCBjLCBkLCBlKTtcblxufVxuXG4vKlxuICogUGVyZm9ybSB0aGUgYXBwcm9wcmlhdGUgdHJpcGxldCBjb21iaW5hdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGN1cnJlbnRcbiAqIGl0ZXJhdGlvblxuICovXG5mdW5jdGlvbiBzaGExX2Z0KHQsIGIsIGMsIGQpXG57XG4gIGlmKHQgPCAyMCkgcmV0dXJuIChiICYgYykgfCAoKH5iKSAmIGQpO1xuICBpZih0IDwgNDApIHJldHVybiBiIF4gYyBeIGQ7XG4gIGlmKHQgPCA2MCkgcmV0dXJuIChiICYgYykgfCAoYiAmIGQpIHwgKGMgJiBkKTtcbiAgcmV0dXJuIGIgXiBjIF4gZDtcbn1cblxuLypcbiAqIERldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgYWRkaXRpdmUgY29uc3RhbnQgZm9yIHRoZSBjdXJyZW50IGl0ZXJhdGlvblxuICovXG5mdW5jdGlvbiBzaGExX2t0KHQpXG57XG4gIHJldHVybiAodCA8IDIwKSA/ICAxNTE4NTAwMjQ5IDogKHQgPCA0MCkgPyAgMTg1OTc3NTM5MyA6XG4gICAgICAgICAodCA8IDYwKSA/IC0xODk0MDA3NTg4IDogLTg5OTQ5NzUxNDtcbn1cblxuLypcbiAqIEFkZCBpbnRlZ2Vycywgd3JhcHBpbmcgYXQgMl4zMi4gVGhpcyB1c2VzIDE2LWJpdCBvcGVyYXRpb25zIGludGVybmFsbHlcbiAqIHRvIHdvcmsgYXJvdW5kIGJ1Z3MgaW4gc29tZSBKUyBpbnRlcnByZXRlcnMuXG4gKi9cbmZ1bmN0aW9uIHNhZmVfYWRkKHgsIHkpXG57XG4gIHZhciBsc3cgPSAoeCAmIDB4RkZGRikgKyAoeSAmIDB4RkZGRik7XG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59XG5cbi8qXG4gKiBCaXR3aXNlIHJvdGF0ZSBhIDMyLWJpdCBudW1iZXIgdG8gdGhlIGxlZnQuXG4gKi9cbmZ1bmN0aW9uIHJvbChudW0sIGNudClcbntcbiAgcmV0dXJuIChudW0gPDwgY250KSB8IChudW0gPj4+ICgzMiAtIGNudCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNoYTEoYnVmKSB7XG4gIHJldHVybiBoZWxwZXJzLmhhc2goYnVmLCBjb3JlX3NoYTEsIDIwLCB0cnVlKTtcbn07XG5cbn0se1wiLi9oZWxwZXJzXCI6Nn1dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxuLyoqXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFNlY3VyZSBIYXNoIEFsZ29yaXRobSwgU0hBLTI1NiwgYXMgZGVmaW5lZFxuICogaW4gRklQUyAxODAtMlxuICogVmVyc2lvbiAyLjItYmV0YSBDb3B5cmlnaHQgQW5nZWwgTWFyaW4sIFBhdWwgSm9obnN0b24gMjAwMCAtIDIwMDkuXG4gKiBPdGhlciBjb250cmlidXRvcnM6IEdyZWcgSG9sdCwgQW5kcmV3IEtlcGVydCwgWWRuYXIsIExvc3RpbmV0XG4gKlxuICovXG5cbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XG5cbnZhciBzYWZlX2FkZCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgdmFyIGxzdyA9ICh4ICYgMHhGRkZGKSArICh5ICYgMHhGRkZGKTtcbiAgdmFyIG1zdyA9ICh4ID4+IDE2KSArICh5ID4+IDE2KSArIChsc3cgPj4gMTYpO1xuICByZXR1cm4gKG1zdyA8PCAxNikgfCAobHN3ICYgMHhGRkZGKTtcbn07XG5cbnZhciBTID0gZnVuY3Rpb24oWCwgbikge1xuICByZXR1cm4gKFggPj4+IG4pIHwgKFggPDwgKDMyIC0gbikpO1xufTtcblxudmFyIFIgPSBmdW5jdGlvbihYLCBuKSB7XG4gIHJldHVybiAoWCA+Pj4gbik7XG59O1xuXG52YXIgQ2ggPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gIHJldHVybiAoKHggJiB5KSBeICgofngpICYgeikpO1xufTtcblxudmFyIE1haiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgcmV0dXJuICgoeCAmIHkpIF4gKHggJiB6KSBeICh5ICYgeikpO1xufTtcblxudmFyIFNpZ21hMDI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDIpIF4gUyh4LCAxMykgXiBTKHgsIDIyKSk7XG59O1xuXG52YXIgU2lnbWExMjU2ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gKFMoeCwgNikgXiBTKHgsIDExKSBeIFMoeCwgMjUpKTtcbn07XG5cbnZhciBHYW1tYTAyNTYgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAoUyh4LCA3KSBeIFMoeCwgMTgpIF4gUih4LCAzKSk7XG59O1xuXG52YXIgR2FtbWExMjU2ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gKFMoeCwgMTcpIF4gUyh4LCAxOSkgXiBSKHgsIDEwKSk7XG59O1xuXG52YXIgY29yZV9zaGEyNTYgPSBmdW5jdGlvbihtLCBsKSB7XG4gIHZhciBLID0gbmV3IEFycmF5KDB4NDI4QTJGOTgsMHg3MTM3NDQ5MSwweEI1QzBGQkNGLDB4RTlCNURCQTUsMHgzOTU2QzI1QiwweDU5RjExMUYxLDB4OTIzRjgyQTQsMHhBQjFDNUVENSwweEQ4MDdBQTk4LDB4MTI4MzVCMDEsMHgyNDMxODVCRSwweDU1MEM3REMzLDB4NzJCRTVENzQsMHg4MERFQjFGRSwweDlCREMwNkE3LDB4QzE5QkYxNzQsMHhFNDlCNjlDMSwweEVGQkU0Nzg2LDB4RkMxOURDNiwweDI0MENBMUNDLDB4MkRFOTJDNkYsMHg0QTc0ODRBQSwweDVDQjBBOURDLDB4NzZGOTg4REEsMHg5ODNFNTE1MiwweEE4MzFDNjZELDB4QjAwMzI3QzgsMHhCRjU5N0ZDNywweEM2RTAwQkYzLDB4RDVBNzkxNDcsMHg2Q0E2MzUxLDB4MTQyOTI5NjcsMHgyN0I3MEE4NSwweDJFMUIyMTM4LDB4NEQyQzZERkMsMHg1MzM4MEQxMywweDY1MEE3MzU0LDB4NzY2QTBBQkIsMHg4MUMyQzkyRSwweDkyNzIyQzg1LDB4QTJCRkU4QTEsMHhBODFBNjY0QiwweEMyNEI4QjcwLDB4Qzc2QzUxQTMsMHhEMTkyRTgxOSwweEQ2OTkwNjI0LDB4RjQwRTM1ODUsMHgxMDZBQTA3MCwweDE5QTRDMTE2LDB4MUUzNzZDMDgsMHgyNzQ4Nzc0QywweDM0QjBCQ0I1LDB4MzkxQzBDQjMsMHg0RUQ4QUE0QSwweDVCOUNDQTRGLDB4NjgyRTZGRjMsMHg3NDhGODJFRSwweDc4QTU2MzZGLDB4ODRDODc4MTQsMHg4Q0M3MDIwOCwweDkwQkVGRkZBLDB4QTQ1MDZDRUIsMHhCRUY5QTNGNywweEM2NzE3OEYyKTtcbiAgdmFyIEhBU0ggPSBuZXcgQXJyYXkoMHg2QTA5RTY2NywgMHhCQjY3QUU4NSwgMHgzQzZFRjM3MiwgMHhBNTRGRjUzQSwgMHg1MTBFNTI3RiwgMHg5QjA1Njg4QywgMHgxRjgzRDlBQiwgMHg1QkUwQ0QxOSk7XG4gICAgdmFyIFcgPSBuZXcgQXJyYXkoNjQpO1xuICAgIHZhciBhLCBiLCBjLCBkLCBlLCBmLCBnLCBoLCBpLCBqO1xuICAgIHZhciBUMSwgVDI7XG4gIC8qIGFwcGVuZCBwYWRkaW5nICovXG4gIG1bbCA+PiA1XSB8PSAweDgwIDw8ICgyNCAtIGwgJSAzMik7XG4gIG1bKChsICsgNjQgPj4gOSkgPDwgNCkgKyAxNV0gPSBsO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG0ubGVuZ3RoOyBpICs9IDE2KSB7XG4gICAgYSA9IEhBU0hbMF07IGIgPSBIQVNIWzFdOyBjID0gSEFTSFsyXTsgZCA9IEhBU0hbM107IGUgPSBIQVNIWzRdOyBmID0gSEFTSFs1XTsgZyA9IEhBU0hbNl07IGggPSBIQVNIWzddO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgNjQ7IGorKykge1xuICAgICAgaWYgKGogPCAxNikge1xuICAgICAgICBXW2pdID0gbVtqICsgaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBXW2pdID0gc2FmZV9hZGQoc2FmZV9hZGQoc2FmZV9hZGQoR2FtbWExMjU2KFdbaiAtIDJdKSwgV1tqIC0gN10pLCBHYW1tYTAyNTYoV1tqIC0gMTVdKSksIFdbaiAtIDE2XSk7XG4gICAgICB9XG4gICAgICBUMSA9IHNhZmVfYWRkKHNhZmVfYWRkKHNhZmVfYWRkKHNhZmVfYWRkKGgsIFNpZ21hMTI1NihlKSksIENoKGUsIGYsIGcpKSwgS1tqXSksIFdbal0pO1xuICAgICAgVDIgPSBzYWZlX2FkZChTaWdtYTAyNTYoYSksIE1haihhLCBiLCBjKSk7XG4gICAgICBoID0gZzsgZyA9IGY7IGYgPSBlOyBlID0gc2FmZV9hZGQoZCwgVDEpOyBkID0gYzsgYyA9IGI7IGIgPSBhOyBhID0gc2FmZV9hZGQoVDEsIFQyKTtcbiAgICB9XG4gICAgSEFTSFswXSA9IHNhZmVfYWRkKGEsIEhBU0hbMF0pOyBIQVNIWzFdID0gc2FmZV9hZGQoYiwgSEFTSFsxXSk7IEhBU0hbMl0gPSBzYWZlX2FkZChjLCBIQVNIWzJdKTsgSEFTSFszXSA9IHNhZmVfYWRkKGQsIEhBU0hbM10pO1xuICAgIEhBU0hbNF0gPSBzYWZlX2FkZChlLCBIQVNIWzRdKTsgSEFTSFs1XSA9IHNhZmVfYWRkKGYsIEhBU0hbNV0pOyBIQVNIWzZdID0gc2FmZV9hZGQoZywgSEFTSFs2XSk7IEhBU0hbN10gPSBzYWZlX2FkZChoLCBIQVNIWzddKTtcbiAgfVxuICByZXR1cm4gSEFTSDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2hhMjU2KGJ1Zikge1xuICByZXR1cm4gaGVscGVycy5oYXNoKGJ1ZiwgY29yZV9zaGEyNTYsIDMyLCB0cnVlKTtcbn07XG5cbn0se1wiLi9oZWxwZXJzXCI6Nn1dfSx7fSxbMl0pXG4iXX0=