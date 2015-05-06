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
        update: function update(data) {
          if (!Buffer.isBuffer(data)) data = new Buffer(data);

          bufs.push(data);
          length += data.length;
          return this;
        },
        digest: function digest(enc) {
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

    var safe_add = function safe_add(x, y) {
      var lsw = (x & 65535) + (y & 65535);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    };

    var S = function S(X, n) {
      return X >>> n | X << 32 - n;
    };

    var R = function R(X, n) {
      return X >>> n;
    };

    var Ch = function Ch(x, y, z) {
      return x & y ^ ~x & z;
    };

    var Maj = function Maj(x, y, z) {
      return x & y ^ x & z ^ y & z;
    };

    var Sigma0256 = function Sigma0256(x) {
      return S(x, 2) ^ S(x, 13) ^ S(x, 22);
    };

    var Sigma1256 = function Sigma1256(x) {
      return S(x, 6) ^ S(x, 11) ^ S(x, 25);
    };

    var Gamma0256 = function Gamma0256(x) {
      return S(x, 7) ^ S(x, 18) ^ R(x, 3);
    };

    var Gamma1256 = function Gamma1256(x) {
      return S(x, 17) ^ S(x, 19) ^ R(x, 10);
    };

    var core_sha256 = function core_sha256(m, l) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c3RyYWp1bmlvci8uYXRvbS9wYWNrYWdlcy9hdG9tLXBhaXIvbGliL3B1c2hlci9wdXNoZXItanMtY2xpZW50LWF1dGguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLE9BQU8sT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUEsSUFBRyxDQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsRUFBQyxD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QyxDQUFBLEdBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztLQUNqRCxDQUFDOztBQUVGLFdBQU8sQ0FBQyxLQUFLLEdBQUcsVUFBUyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUNsRSxVQUFJLENBQUM7VUFBRSxDQUFDO1VBQUUsQ0FBQztVQUNQLElBQUksR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDO1VBQzVCLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUEsR0FBSSxDQUFDO1VBQ3RCLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQztVQUNqQixFQUFFLEdBQUksSUFBSSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxBQUFDO1VBQzVELENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFJLE1BQU0sR0FBRyxDQUFDLEFBQUM7VUFDM0IsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1VBQ2pCLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFLLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEFBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU1RCxXQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFeEIsVUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtBQUN0QyxTQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekIsU0FBQyxHQUFHLElBQUksQ0FB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QUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDYixZQUFJLElBQUksR0FBRyxDQUFDLENBQUM7O0FBRWIsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFHLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVDLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDOztBQUVqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUcsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFJLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBSSxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUcsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRWpELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9DLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUcsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUcsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7QUFFaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUksVUFBVSxDQUFDLENBQUM7QUFDakQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELFNBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsU0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRyxTQUFTLENBQUMsQ0FBQztBQUNoRCxTQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUVoRCxTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QixTQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztPQUN2QjtBQUNELGFBQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBRTFCOzs7OztBQUtELGFBQVMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUNqQztBQUNFLGFBQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDekU7QUFDRCxhQUFTLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxD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T0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNsQjs7Ozs7QUFLRCxhQUFTLE9BQU8sQ0FBQyxDQUFDLEVBQ2xCO0FBQ0UsYUFBTyxBQUFDLENBQUMsR0FBRyxFQUFFLEdBQUssVUFBVSxHQUFHLEFBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBSyxVQUFVLEdBQy9DLEFBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLFNBQVMsQ0FBQztLQUM1Qzs7Ozs7O0FBTUQsYUFBUyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFDdEI7QUFDRSxVQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFNLENBQUEsSUFBSyxDQUFDLEdBQUcsS0FBTSxDQUFBLEFBQUMsQ0FBQztBQUN0QyxVQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsSUFBSyxDQUFDLElBQUksRUFBRSxDQUFBLEFBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFBLEFBQUMsQ0FBQztBQUM5QyxhQUFPLEFBQUMsR0FBRyxJQUFJLEVBQUUsR0FBSyxHQUFHLEdBQUcsS0FBTSxBQUFDLENBQUM7S0FDckM7Ozs7O0FBS0QsYUFBUyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFDckI7QUFDRSxhQUFPLEFBQUMsR0FBRyxJQUFJLEdBQUcsR0FBSyxHQUFHLEtBQU0sRUFBRSxHQUFHLEdBQUcsQUFBQyxBQUFDLENBQUM7S0FDNUM7O0FBRUQsVUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUU7QUFDbEMsYUFBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQy9DLENBQUM7R0FFRCxFQUFDLEVBQUMsV0FBVyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsVUFBUyxPQUFPLEVBQUMsTUFBTSxFQUFDLE9BQU8sRUFBQzs7Ozs7Ozs7OztBQVV2RCxRQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7O0FBRW5DLFFBQUksUUFBUSxHQUFHLGtCQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDNUIsVUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBTSxDQUFBLElBQUssQ0FBQyxHQUFHLEtBQU0sQ0FBQSxBQUFDLENBQUM7QUFDdEMsVUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLElBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQSxBQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQSxBQUFDLENBQUM7QUFDOUMsYUFBTyxBQUFDLEdBQUcsSUFBSSxFQUFFLEdBQUssR0FBRyxHQUFHLEtBQU0sQUFBQyxDQUFDO0tBQ3JDLENBQUM7O0FBRUYsUUFBSSxDQUFDLEdBQUcsV0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3JCLGFBQU8sQUFBQyxDQUFDLEtBQUssQ0FBQyxHQUFLLENBQUMsSUFBSyxFQUFFLEdBQUcsQ0FBQyxBQUFDLEFBQUMsQ0FBQztLQUNwQyxDQUFDOztBQUVGLFFBQUksQ0FBQyxHQUFHLFdBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNyQixhQUFRLENBQUMsS0FBSyxDQUFDLENBQUU7S0FDbEIsQ0FBQzs7QUFFRixRQUFJLEVBQUUsR0FBRyxZQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3pCLGFBQVEsQUFBQyxDQUFDLEdBQUcsQ0FBQyxHQUFLLEFBQUMsQ0FBQyxDQUFDLEdBQUksQ0FBQyxBQUFDLENBQUU7S0FDL0IsQ0FBQzs7QUFFRixRQUFJLEdBQUcsR0FBRyxhQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzFCLGFBQVEsQUFBQyxDQUFDLEdBQUcsQ0FBQyxHQUFLLENBQUMsR0FBRyxDQUFDLEFBQUMsR0FBSSxDQUFDLEdBQUcsQ0FBQyxBQUFDLENBQUU7S0FDdEMsQ0FBQzs7QUFFRixRQUFJLFNBQVMsR0FBRyxtQkFBUyxDQUFDLEVBQUU7QUFDMUIsYUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBRTtLQUN4QyxDQUFDOztBQUVGLFFBQUksU0FBUyxHQUFHLG1CQUFTLENBQUMsRUFBRTtBQUMxQixhQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFFO0tBQ3hDLENBQUM7O0FBRUYsUUFBSSxTQUFTLEdBQUcsbUJBQVMsQ0FBQyxFQUFFO0FBQzFCLGFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUU7S0FDdkMsQ0FBQzs7QUFFRixRQUFJLFNBQVMsR0FBRyxtQkFBUyxDQUFDLEVBQUU7QUFDMUIsYUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBRTtLQUN6QyxDQUFDOztBQUVGLFFBQUksV0FBVyxHQUFHLHFCQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDL0IsVUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFNBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsU0FBUyxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsU0FBUyxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxTQUFVLEVBQUMsU0FBVSxFQUFDLFNBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxFQUFDLFVBQVUsRUFBQyxVQUFVLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDanRCLFVBQUksSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFNBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNuSCxVQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QixVQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqQyxVQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7O0FBRWIsT0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFJLElBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEFBQUMsQ0FBQztBQUNuQyxPQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFLLENBQUMsQ0FBQSxHQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQyxXQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO0FBQ3JDLFNBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZHLGFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDM0IsY0FBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO0FBQ1YsYUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7V0FDakIsTUFBTTtBQUNMLGFBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1dBQ3JHO0FBQ0QsWUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixZQUFFLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDLFdBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDckY7QUFDRCxZQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvSCxZQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNoSTtBQUNELGFBQU8sSUFBSSxDQUFDO0tBQ2IsQ0FBQzs7QUFFRixVQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsTUFBTSxDQUFDLEdBQUcsRUFBRTtBQUNwQyxhQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDakQsQ0FBQztHQUVELEVBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEiLCJmaWxlIjoiL1VzZXJzL3VzdHJhanVuaW9yLy5hdG9tL3BhY2thZ2VzL2F0b20tcGFpci9saWIvcHVzaGVyL3B1c2hlci1qcy1jbGllbnQtYXV0aC5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBjcnlwdG8gPSByZXF1aXJlKCAnY3J5cHRvJyApO1xuXG4vKipcbiAqIFVzZWQgZm9yIGF1dGhlbnRpY2F0aW5nIGNoYW5uZWwgc3Vic2NyaXB0aW9ucyBlbnRpcmVseSBvbiB0aGUgY2xpZW50LlxuICogSWYgdGhlIGNsaWVudCBpcyBhIHdlYiBicm93c2VyIHRoZW4gdGhpcyBjYW4gYmUgaGlnaGx5IGluc2VjdXJlIGFuZCBpdFxuICogSVMgTk9UIHJlY29tbWVuZGVkIHRoYXQgeW91IGRvIHRoaXMuIFlvdSBTSE9VTEQgREVGSU5JVEVMWSBOT1QgRE8gVEhJU1xuICogaW4gcHJvZHVjdGlvbi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICovXG5mdW5jdGlvbiBDbGllbnRBdXRob3JpemVyKCBvcHRpb25zICkge1xuICBpZiggIW9wdGlvbnMua2V5ICkge1xuICAgIHRocm93IG5ldyBFcnJvciggJ2EgXCJrZXlcIiBtdXN0IGJlIHByb3ZpZGVkJyApO1xuICB9XG5cbiAgaWYoICFvcHRpb25zLnNlY3JldCApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoICdhIFwic2VjcmV0XCIgbXVzdCBiZSBwcm92aWRlZCcgKTtcbiAgfVxuXG4gIHRoaXMua2V5ID0gb3B0aW9ucy5rZXk7XG4gIHRoaXMuc2VjcmV0ID0gb3B0aW9ucy5zZWNyZXQ7XG59XG5cbi8qKlxuICogQXV0aGVudGljYXRlIHRoZSBzdWJzY3JpcHRpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc29ja2V0SWRcbiAqICAgIFRoZSBzb2NrZXQgaWQgZm9yIHRoZSBjb25uZWN0aW9uXG4gKiBAcGFyYW0ge1N0cmluZ30gY2hhbm5lbFxuICogICAgVGhlIG5hbWUgb2YgdGhlIGNoYW5uZWwgYmVpbmcgc3Vic2NyaWJlZCB0b1xuICogQHBhcmFtIHtPYmplY3R9IGNoYW5uZWxEYXRhXG4gKiAgICBBZGRpdGlvbmFsIGNoYW5uZWwgZGF0YSB0byBiZSBpbmNsdWRlZCBpbiB0aGUgYXV0aGVudGljYXRpb24gc2lnbmF0dXJlXG4gKi9cbkNsaWVudEF1dGhvcml6ZXIucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbihzb2NrZXRJZCwgY2hhbm5lbCwgY2hhbm5lbERhdGEpIHtcbiAgaWYoIGNoYW5uZWwuaW5kZXhPZiggJ3ByZXNlbmNlLScgKSA9PT0gMCApIHtcblxuICAgIGlmKCAhY2hhbm5lbERhdGEgKSB7XG4gICAgICB0aHJvdyBFcnJvciggJ1wiY2hhbm5lbERhdGFcIiBpcyByZXF1aXJlZCB3aGVuIGF1dGhlbnRpY2F0aW5nIGEgUHJlc2VuY2UgY2hhbm5lbCcgKTtcbiAgICB9XG4gICAgaWYoICFjaGFubmVsRGF0YS51c2VyX2lkICkge1xuICAgICAgdGhyb3cgRXJyb3IoICdcImNoYW5uZWxEYXRhLnVzZXJfaWRcIiBtdXN0IGJlIHNldCB3aGVuIGF1dGhlbnRpY2F0aW5nIGEgUHJlc2VuY2UgY2hhbm5lbCcgKTtcbiAgICB9XG4gIH1cblxuICB2YXIgcmV0dXJuSGFzaCA9IHt9O1xuICB2YXIgY2hhbm5lbERhdGFTdHIgPSAnJztcbiAgaWYgKGNoYW5uZWxEYXRhKSB7XG4gICAgY2hhbm5lbERhdGEgPSBKU09OLnN0cmluZ2lmeShjaGFubmVsRGF0YSk7XG4gICAgY2hhbm5lbERhdGFTdHIgPSAnOicgKyBjaGFubmVsRGF0YTtcbiAgICByZXR1cm5IYXNoLmNoYW5uZWxfZGF0YSA9IGNoYW5uZWxEYXRhO1xuICB9XG4gIHZhciBzdHJpbmdUb1NpZ24gPSBzb2NrZXRJZCArICc6JyArIGNoYW5uZWwgKyBjaGFubmVsRGF0YVN0cjtcbiAgcmV0dXJuSGFzaC5hdXRoID0gdGhpcy5rZXkgKyAnOicgKyBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2JywgdGhpcy5zZWNyZXQpLnVwZGF0ZShzdHJpbmdUb1NpZ24pLmRpZ2VzdCgnaGV4Jyk7XG4gIHJldHVybiByZXR1cm5IYXNoO1xufTtcblxuLy8gU3RhdGljIEhlbHBlcnNcblxuLyoqXG4gKiBTZXR1cCB1cCB0aGUgY2xpZW50IGF1dGhvcmlzZXIuXG4gKlxuICogQHBhcmFtIHtQdXNoZXJ9IFB1c2hlclxuICogICAgVGhlIFB1c2hlciBnbG9iYWwgcmVmZXJlbmNlLlxuICovXG5DbGllbnRBdXRob3JpemVyLnNldFVwUHVzaGVyID0gZnVuY3Rpb24oIFB1c2hlciApIHtcbiAgUHVzaGVyLmF1dGhvcml6ZXJzLmNsaWVudCA9IENsaWVudEF1dGhvcml6ZXIuY2xpZW50QXV0aDtcbn07XG5cbi8qKlxuICogUGVyZm9ybSB0aGUgY2xpZW50IGF1dGhlbnRpY2F0aW9uLiBDYWxsZWQgYnkgUHVzaGVyIGxpYnJhcnkgd2hlbiBhdXRoVHJhbnNwb3J0XG4gKiBpcyBzZXQgdG8gJ2NsaWVudCcuXG4gKlxuICogV2hlbiB0aGlzIGlzIGV4ZWN1dGVkIGl0IHdpbGwgYmUgc2NvcGVkIHNvIHRoYXQgYHRoaXNgIHJlZmVyZW5jZSBhbiBpbnN0YW5jZVxuICogb2YgYFB1c2hlci5DaGFubmVsLkF1dGhvcml6ZXJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzb2NrZXRJZFxuICogICAgVGhlIGlkIG9mIHRoZSBzb2NrZXQgYmVpbmcgYXV0aGVudGljYXRlZCB0byBzdWJzY3JpYmUgdG8gdGhlIGNoYW5uZWwuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogICAgVGhlIGNhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGF1dGhlbnRpY2F0aW9uIGhhcyBjb21wbGV0ZWQuXG4gKi9cbkNsaWVudEF1dGhvcml6ZXIuY2xpZW50QXV0aCA9IGZ1bmN0aW9uKCBzb2NrZXRJZCwgY2FsbGJhY2sgKXtcbiAgdmFyIGF1dGhvcml6ZXIgPSBDbGllbnRBdXRob3JpemVyLmNyZWF0ZUF1dGhvcml6ZXIoIHRoaXMub3B0aW9ucy5jbGllbnRBdXRoICk7XG4gIHZhciBjaGFubmVsRGF0YSA9IG51bGw7XG4gIGlmKCB0aGlzLm9wdGlvbnMuY2xpZW50QXV0aC51c2VyX2lkICkge1xuICAgIGNoYW5uZWxEYXRhID0ge1xuICAgICAgdXNlcl9pZDogdGhpcy5vcHRpb25zLmNsaWVudEF1dGgudXNlcl9pZCxcbiAgICAgIHVzZXJfaW5mbzogdGhpcy5vcHRpb25zLmNsaWVudEF1dGgudXNlcl9pbmZvXG4gICAgfTtcbiAgfVxuICB2YXIgaGFzaCA9IGF1dGhvcml6ZXIuYXV0aCggc29ja2V0SWQsIHRoaXMuY2hhbm5lbC5uYW1lLCBjaGFubmVsRGF0YSApO1xuICBjYWxsYmFjayggbnVsbCwgaGFzaCApO1xufTtcblxuLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIENsaWVudEF1dGhvcml6ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNsaWVudEF1dGhPcHRpb25cbiAqICAgIFRoZSBjbGllbnQgYXV0aGVudGljYXRpb24gb3B0aW9ucy5cbiAqIEByZXR1cm5zIENsaWVudEF1dGhvcml6ZXJcbiAqL1xuQ2xpZW50QXV0aG9yaXplci5jcmVhdGVBdXRob3JpemVyID0gZnVuY3Rpb24oIGNsaWVudEF1dGhPcHRpb25zICkge1xuICB2YXIgYXV0aG9yaXplciA9IG5ldyBDbGllbnRBdXRob3JpemVyKCBjbGllbnRBdXRoT3B0aW9ucyApO1xuICByZXR1cm4gYXV0aG9yaXplcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50QXV0aG9yaXplcjtcblxufSx7XCJjcnlwdG9cIjo3fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4oIGZ1bmN0aW9uKCBQdXNoZXIgKSB7XG4gIGNvbnNvbGUud2FybignWW91IGFyZSB1c2luZyBQdXNoZXJKUyBjbGllbnQgYXV0aGVudGljYXRpb24uIE5ldmVyIGV2ZXIgdXNlIHRoaXMgZm9yIGEgcHJvZHVjdGlvbiBhcHBsaWNhdGlvbiwgYXMgaXQgd291bGQgZXhwb3NlIHlvdXIgc2VjcmV0IGtleXMuJyk7XG5cbiAgdmFyIENsaWVudEF1dGhvcml6ZXIgPSByZXF1aXJlKCAnLi9DbGllbnRBdXRob3JpemVyJyApO1xuICBDbGllbnRBdXRob3JpemVyLnNldFVwUHVzaGVyKCBQdXNoZXIgKTtcblxufSApKCB3aW5kb3cuUHVzaGVyICk7XG5cbn0se1wiLi9DbGllbnRBdXRob3JpemVyXCI6MX1dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MlxuXG4vKipcbiAqIElmIGBCdWZmZXIuX3VzZVR5cGVkQXJyYXlzYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKGNvbXBhdGlibGUgZG93biB0byBJRTYpXG4gKi9cbkJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgPSAoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgaWYgYnJvd3NlciBzdXBwb3J0cyBUeXBlZCBBcnJheXMuIFN1cHBvcnRlZCBicm93c2VycyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLFxuICAvLyBDaHJvbWUgNyssIFNhZmFyaSA1LjErLCBPcGVyYSAxMS42KywgaU9TIDQuMisuIElmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgYWRkaW5nXG4gIC8vIHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcywgdGhlbiB0aGF0J3MgdGhlIHNhbWUgYXMgbm8gYFVpbnQ4QXJyYXlgIHN1cHBvcnRcbiAgLy8gYmVjYXVzZSB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gYWRkIGFsbCB0aGUgbm9kZSBCdWZmZXIgQVBJIG1ldGhvZHMuIFRoaXMgaXMgYW4gaXNzdWVcbiAgLy8gaW4gRmlyZWZveCA0LTI5LiBOb3cgZml4ZWQ6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOFxuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiZcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAvLyBDaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gV29ya2Fyb3VuZDogbm9kZSdzIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgc3RyaW5nc1xuICAvLyB3aGlsZSBiYXNlNjQtanMgZG9lcyBub3QuXG4gIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcgJiYgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBzdWJqZWN0ID0gc3RyaW5ndHJpbShzdWJqZWN0KVxuICAgIHdoaWxlIChzdWJqZWN0Lmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0ICsgJz0nXG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0KVxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJylcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QubGVuZ3RoKSAvLyBhc3N1bWUgdGhhdCBvYmplY3QgaXMgYXJyYXktbGlrZVxuICBlbHNlXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBuZWVkcyB0byBiZSBhIG51bWJlciwgYXJyYXkgb3Igc3RyaW5nLicpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIC8vIFByZWZlcnJlZDogUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBidWYgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIFRISVMgaW5zdGFuY2Ugb2YgQnVmZmVyIChjcmVhdGVkIGJ5IGBuZXdgKVxuICAgIGJ1ZiA9IHRoaXNcbiAgICBidWYubGVuZ3RoID0gbGVuZ3RoXG4gICAgYnVmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgICBlbHNlXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3RbaV1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuLy8gU1RBVElDIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiAoYikge1xuICByZXR1cm4gISEoYiAhPT0gbnVsbCAmJiBiICE9PSB1bmRlZmluZWQgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgdmFyIHJldFxuICBzdHIgPSBzdHIgKyAnJ1xuICBzd2l0Y2ggKGVuY29kaW5nIHx8ICd1dGY4Jykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoIC8gMlxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGFzc2VydChpc0FycmF5KGxpc3QpLCAnVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdCwgW3RvdGFsTGVuZ3RoXSlcXG4nICtcbiAgICAgICdsaXN0IHNob3VsZCBiZSBhbiBBcnJheS4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB0b3RhbExlbmd0aCAhPT0gJ251bWJlcicpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBCVUZGRVIgSU5TVEFOQ0UgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gX2hleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgYXNzZXJ0KHN0ckxlbiAlIDIgPT09IDAsICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBhc3NlcnQoIWlzTmFOKGJ5dGUpLCAnSW52YWxpZCBoZXggc3RyaW5nJylcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlXG4gIH1cbiAgQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBpICogMlxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBfdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2FzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2JpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIF9hc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcbiAgc3RhcnQgPSBOdW1iZXIoc3RhcnQpIHx8IDBcbiAgZW5kID0gKGVuZCAhPT0gdW5kZWZpbmVkKVxuICAgID8gTnVtYmVyKGVuZClcbiAgICA6IGVuZCA9IHNlbGYubGVuZ3RoXG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoZW5kID09PSBzdGFydClcbiAgICByZXR1cm4gJydcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzXG5cbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpXG4gIGFzc2VydCh0YXJnZXRfc3RhcnQgPj0gMCAmJiB0YXJnZXRfc3RhcnQgPCB0YXJnZXQubGVuZ3RoLFxuICAgICAgJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSBzb3VyY2UubGVuZ3RoLCAnc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aClcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCA8IGVuZCAtIHN0YXJ0KVxuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAgfHwgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBfdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKylcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gX2JpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIF9hc2NpaVNsaWNlKGJ1Ziwgc3RhcnQsIGVuZClcbn1cblxuZnVuY3Rpb24gX2hleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSsxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSBjbGFtcChzdGFydCwgbGVuLCAwKVxuICBlbmQgPSBjbGFtcChlbmQsIGxlbiwgbGVuKVxuXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgdmFsID0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICB9IGVsc2Uge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV1cbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDJdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgICB2YWwgfD0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0ICsgM10gPDwgMjQgPj4+IDApXG4gIH0gZWxzZSB7XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMV0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMl0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAzXVxuICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0XSA8PCAyNCA+Pj4gMClcbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICB2YXIgbmVnID0gdGhpc1tvZmZzZXRdICYgMHg4MFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQxNihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MzIoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMDAwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZmZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRmxvYXQgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWREb3VibGUgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuXG5cbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAgICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZmZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2YsIC0weDgwKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICB0aGlzLndyaXRlVUludDgodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICB0aGlzLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmLCAtMHg4MDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQxNihidWYsIDB4ZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQzMihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MzIoYnVmLCAweGZmZmZmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5jaGFyQ29kZUF0KDApXG4gIH1cblxuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiAhaXNOYU4odmFsdWUpLCAndmFsdWUgaXMgbm90IGEgbnVtYmVyJylcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgdGhpcy5sZW5ndGgsICdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSB0aGlzLmxlbmd0aCwgJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHRoaXNbaV0gPSB2YWx1ZVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG91dCA9IFtdXG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSlcbiAgICBpZiAoaSA9PT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPidcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpXG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxuLy8gc2xpY2Uoc3RhcnQsIGVuZClcbmZ1bmN0aW9uIGNsYW1wIChpbmRleCwgbGVuLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgaW5kZXggPSB+fmluZGV4OyAgLy8gQ29lcmNlIHRvIGludGVnZXIuXG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICBpbmRleCArPSBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb2VyY2UgKGxlbmd0aCkge1xuICAvLyBDb2VyY2UgbGVuZ3RoIHRvIGEgbnVtYmVyIChwb3NzaWJseSBOYU4pLCByb3VuZCB1cFxuICAvLyBpbiBjYXNlIGl0J3MgZnJhY3Rpb25hbCAoZS5nLiAxMjMuNDU2KSB0aGVuIGRvIGFcbiAgLy8gZG91YmxlIG5lZ2F0ZSB0byBjb2VyY2UgYSBOYU4gdG8gMC4gRWFzeSwgcmlnaHQ/XG4gIGxlbmd0aCA9IH5+TWF0aC5jZWlsKCtsZW5ndGgpXG4gIHJldHVybiBsZW5ndGggPCAwID8gMCA6IGxlbmd0aFxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChzdWJqZWN0KSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ViamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgfSkoc3ViamVjdClcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaWYgKGIgPD0gMHg3RilcbiAgICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHN0YXJ0ID0gaVxuICAgICAgaWYgKGIgPj0gMHhEODAwICYmIGIgPD0gMHhERkZGKSBpKytcbiAgICAgIHZhciBoID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0ci5zbGljZShzdGFydCwgaSsxKSkuc3Vic3RyKDEpLnNwbGl0KCclJylcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaC5sZW5ndGg7IGorKylcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgcG9zXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuXG4vKlxuICogV2UgaGF2ZSB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWUgaXMgYSB2YWxpZCBpbnRlZ2VyLiBUaGlzIG1lYW5zIHRoYXQgaXRcbiAqIGlzIG5vbi1uZWdhdGl2ZS4gSXQgaGFzIG5vIGZyYWN0aW9uYWwgY29tcG9uZW50IGFuZCB0aGF0IGl0IGRvZXMgbm90XG4gKiBleGNlZWQgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ1aW50ICh2YWx1ZSwgbWF4KSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA+PSAwLCAnc3BlY2lmaWVkIGEgbmVnYXRpdmUgdmFsdWUgZm9yIHdyaXRpbmcgYW4gdW5zaWduZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgaXMgbGFyZ2VyIHRoYW4gbWF4aW11bSB2YWx1ZSBmb3IgdHlwZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmc2ludCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmSUVFRTc1NCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG59XG5cbmZ1bmN0aW9uIGFzc2VydCAodGVzdCwgbWVzc2FnZSkge1xuICBpZiAoIXRlc3QpIHRocm93IG5ldyBFcnJvcihtZXNzYWdlIHx8ICdGYWlsZWQgYXNzZXJ0aW9uJylcbn1cblxufSx7XCJiYXNlNjQtanNcIjo0LFwiaWVlZTc1NFwiOjV9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0se31dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldO1xuXG4gIGkgKz0gZDtcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgcyA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IGVMZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBlID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gbUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzO1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSk7XG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICBlID0gZSAtIGVCaWFzO1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pO1xufTtcblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG5cbn0se31dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbnZhciBpbnRTaXplID0gNDtcbnZhciB6ZXJvQnVmZmVyID0gbmV3IEJ1ZmZlcihpbnRTaXplKTsgemVyb0J1ZmZlci5maWxsKDApO1xudmFyIGNocnN6ID0gODtcblxuZnVuY3Rpb24gdG9BcnJheShidWYsIGJpZ0VuZGlhbikge1xuICBpZiAoKGJ1Zi5sZW5ndGggJSBpbnRTaXplKSAhPT0gMCkge1xuICAgIHZhciBsZW4gPSBidWYubGVuZ3RoICsgKGludFNpemUgLSAoYnVmLmxlbmd0aCAlIGludFNpemUpKTtcbiAgICBidWYgPSBCdWZmZXIuY29uY2F0KFtidWYsIHplcm9CdWZmZXJdLCBsZW4pO1xuICB9XG5cbiAgdmFyIGFyciA9IFtdO1xuICB2YXIgZm4gPSBiaWdFbmRpYW4gPyBidWYucmVhZEludDMyQkUgOiBidWYucmVhZEludDMyTEU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmLmxlbmd0aDsgaSArPSBpbnRTaXplKSB7XG4gICAgYXJyLnB1c2goZm4uY2FsbChidWYsIGkpKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiB0b0J1ZmZlcihhcnIsIHNpemUsIGJpZ0VuZGlhbikge1xuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzaXplKTtcbiAgdmFyIGZuID0gYmlnRW5kaWFuID8gYnVmLndyaXRlSW50MzJCRSA6IGJ1Zi53cml0ZUludDMyTEU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgZm4uY2FsbChidWYsIGFycltpXSwgaSAqIDQsIHRydWUpO1xuICB9XG4gIHJldHVybiBidWY7XG59XG5cbmZ1bmN0aW9uIGhhc2goYnVmLCBmbiwgaGFzaFNpemUsIGJpZ0VuZGlhbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSBidWYgPSBuZXcgQnVmZmVyKGJ1Zik7XG4gIHZhciBhcnIgPSBmbih0b0FycmF5KGJ1ZiwgYmlnRW5kaWFuKSwgYnVmLmxlbmd0aCAqIGNocnN6KTtcbiAgcmV0dXJuIHRvQnVmZmVyKGFyciwgaGFzaFNpemUsIGJpZ0VuZGlhbik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBoYXNoOiBoYXNoIH07XG5cbn0se1wiYnVmZmVyXCI6M31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlclxudmFyIHNoYSA9IHJlcXVpcmUoJy4vc2hhJylcbnZhciBzaGEyNTYgPSByZXF1aXJlKCcuL3NoYTI1NicpXG52YXIgcm5nID0gcmVxdWlyZSgnLi9ybmcnKVxudmFyIG1kNSA9IHJlcXVpcmUoJy4vbWQ1JylcblxudmFyIGFsZ29yaXRobXMgPSB7XG4gIHNoYTE6IHNoYSxcbiAgc2hhMjU2OiBzaGEyNTYsXG4gIG1kNTogbWQ1XG59XG5cbnZhciBibG9ja3NpemUgPSA2NFxudmFyIHplcm9CdWZmZXIgPSBuZXcgQnVmZmVyKGJsb2Nrc2l6ZSk7IHplcm9CdWZmZXIuZmlsbCgwKVxuZnVuY3Rpb24gaG1hYyhmbiwga2V5LCBkYXRhKSB7XG4gIGlmKCFCdWZmZXIuaXNCdWZmZXIoa2V5KSkga2V5ID0gbmV3IEJ1ZmZlcihrZXkpXG4gIGlmKCFCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIGRhdGEgPSBuZXcgQnVmZmVyKGRhdGEpXG5cbiAgaWYoa2V5Lmxlbmd0aCA+IGJsb2Nrc2l6ZSkge1xuICAgIGtleSA9IGZuKGtleSlcbiAgfSBlbHNlIGlmKGtleS5sZW5ndGggPCBibG9ja3NpemUpIHtcbiAgICBrZXkgPSBCdWZmZXIuY29uY2F0KFtrZXksIHplcm9CdWZmZXJdLCBibG9ja3NpemUpXG4gIH1cblxuICB2YXIgaXBhZCA9IG5ldyBCdWZmZXIoYmxvY2tzaXplKSwgb3BhZCA9IG5ldyBCdWZmZXIoYmxvY2tzaXplKVxuICBmb3IodmFyIGkgPSAwOyBpIDwgYmxvY2tzaXplOyBpKyspIHtcbiAgICBpcGFkW2ldID0ga2V5W2ldIF4gMHgzNlxuICAgIG9wYWRbaV0gPSBrZXlbaV0gXiAweDVDXG4gIH1cblxuICB2YXIgaGFzaCA9IGZuKEJ1ZmZlci5jb25jYXQoW2lwYWQsIGRhdGFdKSlcbiAgcmV0dXJuIGZuKEJ1ZmZlci5jb25jYXQoW29wYWQsIGhhc2hdKSlcbn1cblxuZnVuY3Rpb24gaGFzaChhbGcsIGtleSkge1xuICBhbGcgPSBhbGcgfHwgJ3NoYTEnXG4gIHZhciBmbiA9IGFsZ29yaXRobXNbYWxnXVxuICB2YXIgYnVmcyA9IFtdXG4gIHZhciBsZW5ndGggPSAwXG4gIGlmKCFmbikgZXJyb3IoJ2FsZ29yaXRobTonLCBhbGcsICdpcyBub3QgeWV0IHN1cHBvcnRlZCcpXG4gIHJldHVybiB7XG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgaWYoIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkgZGF0YSA9IG5ldyBCdWZmZXIoZGF0YSlcblxuICAgICAgYnVmcy5wdXNoKGRhdGEpXG4gICAgICBsZW5ndGggKz0gZGF0YS5sZW5ndGhcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBkaWdlc3Q6IGZ1bmN0aW9uIChlbmMpIHtcbiAgICAgIHZhciBidWYgPSBCdWZmZXIuY29uY2F0KGJ1ZnMpXG4gICAgICB2YXIgciA9IGtleSA/IGhtYWMoZm4sIGtleSwgYnVmKSA6IGZuKGJ1ZilcbiAgICAgIGJ1ZnMgPSBudWxsXG4gICAgICByZXR1cm4gZW5jID8gci50b1N0cmluZyhlbmMpIDogclxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBlcnJvciAoKSB7XG4gIHZhciBtID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLmpvaW4oJyAnKVxuICB0aHJvdyBuZXcgRXJyb3IoW1xuICAgIG0sXG4gICAgJ3dlIGFjY2VwdCBwdWxsIHJlcXVlc3RzJyxcbiAgICAnaHR0cDovL2dpdGh1Yi5jb20vZG9taW5pY3RhcnIvY3J5cHRvLWJyb3dzZXJpZnknXG4gICAgXS5qb2luKCdcXG4nKSlcbn1cblxuZXhwb3J0cy5jcmVhdGVIYXNoID0gZnVuY3Rpb24gKGFsZykgeyByZXR1cm4gaGFzaChhbGcpIH1cbmV4cG9ydHMuY3JlYXRlSG1hYyA9IGZ1bmN0aW9uIChhbGcsIGtleSkgeyByZXR1cm4gaGFzaChhbGcsIGtleSkgfVxuZXhwb3J0cy5yYW5kb21CeXRlcyA9IGZ1bmN0aW9uKHNpemUsIGNhbGxiYWNrKSB7XG4gIGlmIChjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgdW5kZWZpbmVkLCBuZXcgQnVmZmVyKHJuZyhzaXplKSkpXG4gICAgfSBjYXRjaCAoZXJyKSB7IGNhbGxiYWNrKGVycikgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKHJuZyhzaXplKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBlYWNoKGEsIGYpIHtcbiAgZm9yKHZhciBpIGluIGEpXG4gICAgZihhW2ldLCBpKVxufVxuXG4vLyB0aGUgbGVhc3QgSSBjYW4gZG8gaXMgbWFrZSBlcnJvciBtZXNzYWdlcyBmb3IgdGhlIHJlc3Qgb2YgdGhlIG5vZGUuanMvY3J5cHRvIGFwaS5cbmVhY2goWydjcmVhdGVDcmVkZW50aWFscydcbiwgJ2NyZWF0ZUNpcGhlcidcbiwgJ2NyZWF0ZUNpcGhlcml2J1xuLCAnY3JlYXRlRGVjaXBoZXInXG4sICdjcmVhdGVEZWNpcGhlcml2J1xuLCAnY3JlYXRlU2lnbidcbiwgJ2NyZWF0ZVZlcmlmeSdcbiwgJ2NyZWF0ZURpZmZpZUhlbGxtYW4nXG4sICdwYmtkZjInXSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgZXhwb3J0c1tuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICBlcnJvcignc29ycnksJywgbmFtZSwgJ2lzIG5vdCBpbXBsZW1lbnRlZCB5ZXQnKVxuICB9XG59KVxuXG59LHtcIi4vbWQ1XCI6OCxcIi4vcm5nXCI6OSxcIi4vc2hhXCI6MTAsXCIuL3NoYTI1NlwiOjExLFwiYnVmZmVyXCI6M31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLypcclxuICogQSBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBSU0EgRGF0YSBTZWN1cml0eSwgSW5jLiBNRDUgTWVzc2FnZVxyXG4gKiBEaWdlc3QgQWxnb3JpdGhtLCBhcyBkZWZpbmVkIGluIFJGQyAxMzIxLlxyXG4gKiBWZXJzaW9uIDIuMSBDb3B5cmlnaHQgKEMpIFBhdWwgSm9obnN0b24gMTk5OSAtIDIwMDIuXHJcbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcclxuICogRGlzdHJpYnV0ZWQgdW5kZXIgdGhlIEJTRCBMaWNlbnNlXHJcbiAqIFNlZSBodHRwOi8vcGFqaG9tZS5vcmcudWsvY3J5cHQvbWQ1IGZvciBtb3JlIGluZm8uXHJcbiAqL1xyXG5cclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxuXHJcbi8qXHJcbiAqIFBlcmZvcm0gYSBzaW1wbGUgc2VsZi10ZXN0IHRvIHNlZSBpZiB0aGUgVk0gaXMgd29ya2luZ1xyXG4gKi9cclxuZnVuY3Rpb24gbWQ1X3ZtX3Rlc3QoKVxyXG57XHJcbiAgcmV0dXJuIGhleF9tZDUoXCJhYmNcIikgPT0gXCI5MDAxNTA5ODNjZDI0ZmIwZDY5NjNmN2QyOGUxN2Y3MlwiO1xyXG59XHJcblxyXG4vKlxyXG4gKiBDYWxjdWxhdGUgdGhlIE1ENSBvZiBhbiBhcnJheSBvZiBsaXR0bGUtZW5kaWFuIHdvcmRzLCBhbmQgYSBiaXQgbGVuZ3RoXHJcbiAqL1xyXG5mdW5jdGlvbiBjb3JlX21kNSh4LCBsZW4pXHJcbntcclxuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xyXG4gIHhbbGVuID4+IDVdIHw9IDB4ODAgPDwgKChsZW4pICUgMzIpO1xyXG4gIHhbKCgobGVuICsgNjQpID4+PiA5KSA8PCA0KSArIDE0XSA9IGxlbjtcclxuXHJcbiAgdmFyIGEgPSAgMTczMjU4NDE5MztcclxuICB2YXIgYiA9IC0yNzE3MzM4Nzk7XHJcbiAgdmFyIGMgPSAtMTczMjU4NDE5NDtcclxuICB2YXIgZCA9ICAyNzE3MzM4Nzg7XHJcblxyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSArPSAxNilcclxuICB7XHJcbiAgICB2YXIgb2xkYSA9IGE7XHJcbiAgICB2YXIgb2xkYiA9IGI7XHJcbiAgICB2YXIgb2xkYyA9IGM7XHJcbiAgICB2YXIgb2xkZCA9IGQ7XHJcblxyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDBdLCA3ICwgLTY4MDg3NjkzNik7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgMV0sIDEyLCAtMzg5NTY0NTg2KTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKyAyXSwgMTcsICA2MDYxMDU4MTkpO1xyXG4gICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2krIDNdLCAyMiwgLTEwNDQ1MjUzMzApO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDRdLCA3ICwgLTE3NjQxODg5Nyk7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgNV0sIDEyLCAgMTIwMDA4MDQyNik7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsgNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsgN10sIDIyLCAtNDU3MDU5ODMpO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDhdLCA3ICwgIDE3NzAwMzU0MTYpO1xyXG4gICAgZCA9IG1kNV9mZihkLCBhLCBiLCBjLCB4W2krIDldLCAxMiwgLTE5NTg0MTQ0MTcpO1xyXG4gICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2krMTBdLCAxNywgLTQyMDYzKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKzExXSwgMjIsIC0xOTkwNDA0MTYyKTtcclxuICAgIGEgPSBtZDVfZmYoYSwgYiwgYywgZCwgeFtpKzEyXSwgNyAsICAxODA0NjAzNjgyKTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKzEzXSwgMTIsIC00MDM0MTEwMSk7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsxNF0sIDE3LCAtMTUwMjAwMjI5MCk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsxNV0sIDIyLCAgMTIzNjUzNTMyOSk7XHJcblxyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDFdLCA1ICwgLTE2NTc5NjUxMCk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsgNl0sIDkgLCAtMTA2OTUwMTYzMik7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsxMV0sIDE0LCAgNjQzNzE3NzEzKTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyAwXSwgMjAsIC0zNzM4OTczMDIpO1xyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDVdLCA1ICwgLTcwMTU1ODY5MSk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsxMF0sIDkgLCAgMzgwMTYwODMpO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsgNF0sIDIwLCAtNDA1NTM3ODQ4KTtcclxuICAgIGEgPSBtZDVfZ2coYSwgYiwgYywgZCwgeFtpKyA5XSwgNSAsICA1Njg0NDY0MzgpO1xyXG4gICAgZCA9IG1kNV9nZyhkLCBhLCBiLCBjLCB4W2krMTRdLCA5ICwgLTEwMTk4MDM2OTApO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krIDNdLCAxNCwgLTE4NzM2Mzk2MSk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsgOF0sIDIwLCAgMTE2MzUzMTUwMSk7XHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsxM10sIDUgLCAtMTQ0NDY4MTQ2Nyk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsgMl0sIDkgLCAtNTE0MDM3ODQpO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krIDddLCAxNCwgIDE3MzUzMjg0NzMpO1xyXG4gICAgYiA9IG1kNV9nZyhiLCBjLCBkLCBhLCB4W2krMTJdLCAyMCwgLTE5MjY2MDc3MzQpO1xyXG5cclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyA1XSwgNCAsIC0zNzg1NTgpO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krIDhdLCAxMSwgLTIwMjI1NzQ0NjMpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krMTFdLCAxNiwgIDE4MzkwMzA1NjIpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krMTRdLCAyMywgLTM1MzA5NTU2KTtcclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyAxXSwgNCAsIC0xNTMwOTkyMDYwKTtcclxuICAgIGQgPSBtZDVfaGgoZCwgYSwgYiwgYywgeFtpKyA0XSwgMTEsICAxMjcyODkzMzUzKTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKyA3XSwgMTYsIC0xNTU0OTc2MzIpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krMTBdLCAyMywgLTEwOTQ3MzA2NDApO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krMTNdLCA0ICwgIDY4MTI3OTE3NCk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsgMF0sIDExLCAtMzU4NTM3MjIyKTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKyAzXSwgMTYsIC03MjI1MjE5NzkpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krIDZdLCAyMywgIDc2MDI5MTg5KTtcclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyA5XSwgNCAsIC02NDAzNjQ0ODcpO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krMTJdLCAxMSwgLTQyMTgxNTgzNSk7XHJcbiAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSsxNV0sIDE2LCAgNTMwNzQyNTIwKTtcclxuICAgIGIgPSBtZDVfaGgoYiwgYywgZCwgYSwgeFtpKyAyXSwgMjMsIC05OTUzMzg2NTEpO1xyXG5cclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyAwXSwgNiAsIC0xOTg2MzA4NDQpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krIDddLCAxMCwgIDExMjY4OTE0MTUpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krMTRdLCAxNSwgLTE0MTYzNTQ5MDUpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDVdLCAyMSwgLTU3NDM0MDU1KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKzEyXSwgNiAsICAxNzAwNDg1NTcxKTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKyAzXSwgMTAsIC0xODk0OTg2NjA2KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKzEwXSwgMTUsIC0xMDUxNTIzKTtcclxuICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpKyAxXSwgMjEsIC0yMDU0OTIyNzk5KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyA4XSwgNiAsICAxODczMzEzMzU5KTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKzE1XSwgMTAsIC0zMDYxMTc0NCk7XHJcbiAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSsgNl0sIDE1LCAtMTU2MDE5ODM4MCk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsxM10sIDIxLCAgMTMwOTE1MTY0OSk7XHJcbiAgICBhID0gbWQ1X2lpKGEsIGIsIGMsIGQsIHhbaSsgNF0sIDYgLCAtMTQ1NTIzMDcwKTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKzExXSwgMTAsIC0xMTIwMjEwMzc5KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKyAyXSwgMTUsICA3MTg3ODcyNTkpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDldLCAyMSwgLTM0MzQ4NTU1MSk7XHJcblxyXG4gICAgYSA9IHNhZmVfYWRkKGEsIG9sZGEpO1xyXG4gICAgYiA9IHNhZmVfYWRkKGIsIG9sZGIpO1xyXG4gICAgYyA9IHNhZmVfYWRkKGMsIG9sZGMpO1xyXG4gICAgZCA9IHNhZmVfYWRkKGQsIG9sZGQpO1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkoYSwgYiwgYywgZCk7XHJcblxyXG59XHJcblxyXG4vKlxyXG4gKiBUaGVzZSBmdW5jdGlvbnMgaW1wbGVtZW50IHRoZSBmb3VyIGJhc2ljIG9wZXJhdGlvbnMgdGhlIGFsZ29yaXRobSB1c2VzLlxyXG4gKi9cclxuZnVuY3Rpb24gbWQ1X2NtbihxLCBhLCBiLCB4LCBzLCB0KVxyXG57XHJcbiAgcmV0dXJuIHNhZmVfYWRkKGJpdF9yb2woc2FmZV9hZGQoc2FmZV9hZGQoYSwgcSksIHNhZmVfYWRkKHgsIHQpKSwgcyksYik7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2ZmKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbigoYiAmIGMpIHwgKCh+YikgJiBkKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2dnKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbigoYiAmIGQpIHwgKGMgJiAofmQpKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2hoKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbihiIF4gYyBeIGQsIGEsIGIsIHgsIHMsIHQpO1xyXG59XHJcbmZ1bmN0aW9uIG1kNV9paShhLCBiLCBjLCBkLCB4LCBzLCB0KVxyXG57XHJcbiAgcmV0dXJuIG1kNV9jbW4oYyBeIChiIHwgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xyXG59XHJcblxyXG4vKlxyXG4gKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XHJcbiAqIHRvIHdvcmsgYXJvdW5kIGJ1Z3MgaW4gc29tZSBKUyBpbnRlcnByZXRlcnMuXHJcbiAqL1xyXG5mdW5jdGlvbiBzYWZlX2FkZCh4LCB5KVxyXG57XHJcbiAgdmFyIGxzdyA9ICh4ICYgMHhGRkZGKSArICh5ICYgMHhGRkZGKTtcclxuICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XHJcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XHJcbn1cclxuXHJcbi8qXHJcbiAqIEJpdHdpc2Ugcm90YXRlIGEgMzItYml0IG51bWJlciB0byB0aGUgbGVmdC5cclxuICovXHJcbmZ1bmN0aW9uIGJpdF9yb2wobnVtLCBjbnQpXHJcbntcclxuICByZXR1cm4gKG51bSA8PCBjbnQpIHwgKG51bSA+Pj4gKDMyIC0gY250KSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWQ1KGJ1Zikge1xyXG4gIHJldHVybiBoZWxwZXJzLmhhc2goYnVmLCBjb3JlX21kNSwgMTYpO1xyXG59O1xyXG5cbn0se1wiLi9oZWxwZXJzXCI6Nn1dLDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLy8gT3JpZ2luYWwgY29kZSBhZGFwdGVkIGZyb20gUm9iZXJ0IEtpZWZmZXIuXG4vLyBkZXRhaWxzIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBfZ2xvYmFsID0gdGhpcztcblxuICB2YXIgbWF0aFJORywgd2hhdHdnUk5HO1xuXG4gIC8vIE5PVEU6IE1hdGgucmFuZG9tKCkgZG9lcyBub3QgZ3VhcmFudGVlIFwiY3J5cHRvZ3JhcGhpYyBxdWFsaXR5XCJcbiAgbWF0aFJORyA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICB2YXIgYnl0ZXMgPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgdmFyIHI7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgcjsgaSA8IHNpemU7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIGJ5dGVzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBieXRlcztcbiAgfVxuXG4gIGlmIChfZ2xvYmFsLmNyeXB0byAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gICAgd2hhdHdnUk5HID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGJ5dGVzKTtcbiAgICAgIHJldHVybiBieXRlcztcbiAgICB9XG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cyA9IHdoYXR3Z1JORyB8fCBtYXRoUk5HO1xuXG59KCkpXG5cbn0se31dLDEwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8qXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFNlY3VyZSBIYXNoIEFsZ29yaXRobSwgU0hBLTEsIGFzIGRlZmluZWRcbiAqIGluIEZJUFMgUFVCIDE4MC0xXG4gKiBWZXJzaW9uIDIuMWEgQ29weXJpZ2h0IFBhdWwgSm9obnN0b24gMjAwMCAtIDIwMDIuXG4gKiBPdGhlciBjb250cmlidXRvcnM6IEdyZWcgSG9sdCwgQW5kcmV3IEtlcGVydCwgWWRuYXIsIExvc3RpbmV0XG4gKiBEaXN0cmlidXRlZCB1bmRlciB0aGUgQlNEIExpY2Vuc2VcbiAqIFNlZSBodHRwOi8vcGFqaG9tZS5vcmcudWsvY3J5cHQvbWQ1IGZvciBkZXRhaWxzLlxuICovXG5cbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XG5cbi8qXG4gKiBDYWxjdWxhdGUgdGhlIFNIQS0xIG9mIGFuIGFycmF5IG9mIGJpZy1lbmRpYW4gd29yZHMsIGFuZCBhIGJpdCBsZW5ndGhcbiAqL1xuZnVuY3Rpb24gY29yZV9zaGExKHgsIGxlbilcbntcbiAgLyogYXBwZW5kIHBhZGRpbmcgKi9cbiAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAoMjQgLSBsZW4gJSAzMik7XG4gIHhbKChsZW4gKyA2NCA+PiA5KSA8PCA0KSArIDE1XSA9IGxlbjtcblxuICB2YXIgdyA9IEFycmF5KDgwKTtcbiAgdmFyIGEgPSAgMTczMjU4NDE5MztcbiAgdmFyIGIgPSAtMjcxNzMzODc5O1xuICB2YXIgYyA9IC0xNzMyNTg0MTk0O1xuICB2YXIgZCA9ICAyNzE3MzM4Nzg7XG4gIHZhciBlID0gLTEwMDk1ODk3NzY7XG5cbiAgZm9yKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDE2KVxuICB7XG4gICAgdmFyIG9sZGEgPSBhO1xuICAgIHZhciBvbGRiID0gYjtcbiAgICB2YXIgb2xkYyA9IGM7XG4gICAgdmFyIG9sZGQgPSBkO1xuICAgIHZhciBvbGRlID0gZTtcblxuICAgIGZvcih2YXIgaiA9IDA7IGogPCA4MDsgaisrKVxuICAgIHtcbiAgICAgIGlmKGogPCAxNikgd1tqXSA9IHhbaSArIGpdO1xuICAgICAgZWxzZSB3W2pdID0gcm9sKHdbai0zXSBeIHdbai04XSBeIHdbai0xNF0gXiB3W2otMTZdLCAxKTtcbiAgICAgIHZhciB0ID0gc2FmZV9hZGQoc2FmZV9hZGQocm9sKGEsIDUpLCBzaGExX2Z0KGosIGIsIGMsIGQpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgc2FmZV9hZGQoc2FmZV9hZGQoZSwgd1tqXSksIHNoYTFfa3QoaikpKTtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gcm9sKGIsIDMwKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuXG4gICAgYSA9IHNhZmVfYWRkKGEsIG9sZGEpO1xuICAgIGIgPSBzYWZlX2FkZChiLCBvbGRiKTtcbiAgICBjID0gc2FmZV9hZGQoYywgb2xkYyk7XG4gICAgZCA9IHNhZmVfYWRkKGQsIG9sZGQpO1xuICAgIGUgPSBzYWZlX2FkZChlLCBvbGRlKTtcbiAgfVxuICByZXR1cm4gQXJyYXkoYSwgYiwgYywgZCwgZSk7XG5cbn1cblxuLypcbiAqIFBlcmZvcm0gdGhlIGFwcHJvcHJpYXRlIHRyaXBsZXQgY29tYmluYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBjdXJyZW50XG4gKiBpdGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gc2hhMV9mdCh0LCBiLCBjLCBkKVxue1xuICBpZih0IDwgMjApIHJldHVybiAoYiAmIGMpIHwgKCh+YikgJiBkKTtcbiAgaWYodCA8IDQwKSByZXR1cm4gYiBeIGMgXiBkO1xuICBpZih0IDwgNjApIHJldHVybiAoYiAmIGMpIHwgKGIgJiBkKSB8IChjICYgZCk7XG4gIHJldHVybiBiIF4gYyBeIGQ7XG59XG5cbi8qXG4gKiBEZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIGFkZGl0aXZlIGNvbnN0YW50IGZvciB0aGUgY3VycmVudCBpdGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gc2hhMV9rdCh0KVxue1xuICByZXR1cm4gKHQgPCAyMCkgPyAgMTUxODUwMDI0OSA6ICh0IDwgNDApID8gIDE4NTk3NzUzOTMgOlxuICAgICAgICAgKHQgPCA2MCkgPyAtMTg5NDAwNzU4OCA6IC04OTk0OTc1MTQ7XG59XG5cbi8qXG4gKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XG4gKiB0byB3b3JrIGFyb3VuZCBidWdzIGluIHNvbWUgSlMgaW50ZXJwcmV0ZXJzLlxuICovXG5mdW5jdGlvbiBzYWZlX2FkZCh4LCB5KVxue1xuICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpO1xuICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XG4gIHJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweEZGRkYpO1xufVxuXG4vKlxuICogQml0d2lzZSByb3RhdGUgYSAzMi1iaXQgbnVtYmVyIHRvIHRoZSBsZWZ0LlxuICovXG5mdW5jdGlvbiByb2wobnVtLCBjbnQpXG57XG4gIHJldHVybiAobnVtIDw8IGNudCkgfCAobnVtID4+PiAoMzIgLSBjbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaGExKGJ1Zikge1xuICByZXR1cm4gaGVscGVycy5oYXNoKGJ1ZiwgY29yZV9zaGExLCAyMCwgdHJ1ZSk7XG59O1xuXG59LHtcIi4vaGVscGVyc1wiOjZ9XSwxMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cbi8qKlxuICogQSBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBTZWN1cmUgSGFzaCBBbGdvcml0aG0sIFNIQS0yNTYsIGFzIGRlZmluZWRcbiAqIGluIEZJUFMgMTgwLTJcbiAqIFZlcnNpb24gMi4yLWJldGEgQ29weXJpZ2h0IEFuZ2VsIE1hcmluLCBQYXVsIEpvaG5zdG9uIDIwMDAgLSAyMDA5LlxuICogT3RoZXIgY29udHJpYnV0b3JzOiBHcmVnIEhvbHQsIEFuZHJldyBLZXBlcnQsIFlkbmFyLCBMb3N0aW5ldFxuICpcbiAqL1xuXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xuXG52YXIgc2FmZV9hZGQgPSBmdW5jdGlvbih4LCB5KSB7XG4gIHZhciBsc3cgPSAoeCAmIDB4RkZGRikgKyAoeSAmIDB4RkZGRik7XG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59O1xuXG52YXIgUyA9IGZ1bmN0aW9uKFgsIG4pIHtcbiAgcmV0dXJuIChYID4+PiBuKSB8IChYIDw8ICgzMiAtIG4pKTtcbn07XG5cbnZhciBSID0gZnVuY3Rpb24oWCwgbikge1xuICByZXR1cm4gKFggPj4+IG4pO1xufTtcblxudmFyIENoID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICByZXR1cm4gKCh4ICYgeSkgXiAoKH54KSAmIHopKTtcbn07XG5cbnZhciBNYWogPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gIHJldHVybiAoKHggJiB5KSBeICh4ICYgeikgXiAoeSAmIHopKTtcbn07XG5cbnZhciBTaWdtYTAyNTYgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAoUyh4LCAyKSBeIFMoeCwgMTMpIF4gUyh4LCAyMikpO1xufTtcblxudmFyIFNpZ21hMTI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDYpIF4gUyh4LCAxMSkgXiBTKHgsIDI1KSk7XG59O1xuXG52YXIgR2FtbWEwMjU2ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gKFMoeCwgNykgXiBTKHgsIDE4KSBeIFIoeCwgMykpO1xufTtcblxudmFyIEdhbW1hMTI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDE3KSBeIFMoeCwgMTkpIF4gUih4LCAxMCkpO1xufTtcblxudmFyIGNvcmVfc2hhMjU2ID0gZnVuY3Rpb24obSwgbCkge1xuICB2YXIgSyA9IG5ldyBBcnJheSgweDQyOEEyRjk4LDB4NzEzNzQ0OTEsMHhCNUMwRkJDRiwweEU5QjVEQkE1LDB4Mzk1NkMyNUIsMHg1OUYxMTFGMSwweDkyM0Y4MkE0LDB4QUIxQzVFRDUsMHhEODA3QUE5OCwweDEyODM1QjAxLDB4MjQzMTg1QkUsMHg1NTBDN0RDMywweDcyQkU1RDc0LDB4ODBERUIxRkUsMHg5QkRDMDZBNywweEMxOUJGMTc0LDB4RTQ5QjY5QzEsMHhFRkJFNDc4NiwweEZDMTlEQzYsMHgyNDBDQTFDQywweDJERTkyQzZGLDB4NEE3NDg0QUEsMHg1Q0IwQTlEQywweDc2Rjk4OERBLDB4OTgzRTUxNTIsMHhBODMxQzY2RCwweEIwMDMyN0M4LDB4QkY1OTdGQzcsMHhDNkUwMEJGMywweEQ1QTc5MTQ3LDB4NkNBNjM1MSwweDE0MjkyOTY3LDB4MjdCNzBBODUsMHgyRTFCMjEzOCwweDREMkM2REZDLDB4NTMzODBEMTMsMHg2NTBBNzM1NCwweDc2NkEwQUJCLDB4ODFDMkM5MkUsMHg5MjcyMkM4NSwweEEyQkZFOEExLDB4QTgxQTY2NEIsMHhDMjRCOEI3MCwweEM3NkM1MUEzLDB4RDE5MkU4MTksMHhENjk5MDYyNCwweEY0MEUzNTg1LDB4MTA2QUEwNzAsMHgxOUE0QzExNiwweDFFMzc2QzA4LDB4Mjc0ODc3NEMsMHgzNEIwQkNCNSwweDM5MUMwQ0IzLDB4NEVEOEFBNEEsMHg1QjlDQ0E0RiwweDY4MkU2RkYzLDB4NzQ4RjgyRUUsMHg3OEE1NjM2RiwweDg0Qzg3ODE0LDB4OENDNzAyMDgsMHg5MEJFRkZGQSwweEE0NTA2Q0VCLDB4QkVGOUEzRjcsMHhDNjcxNzhGMik7XG4gIHZhciBIQVNIID0gbmV3IEFycmF5KDB4NkEwOUU2NjcsIDB4QkI2N0FFODUsIDB4M0M2RUYzNzIsIDB4QTU0RkY1M0EsIDB4NTEwRTUyN0YsIDB4OUIwNTY4OEMsIDB4MUY4M0Q5QUIsIDB4NUJFMENEMTkpO1xuICAgIHZhciBXID0gbmV3IEFycmF5KDY0KTtcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSwgajtcbiAgICB2YXIgVDEsIFQyO1xuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xuICBtW2wgPj4gNV0gfD0gMHg4MCA8PCAoMjQgLSBsICUgMzIpO1xuICBtWygobCArIDY0ID4+IDkpIDw8IDQpICsgMTVdID0gbDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtLmxlbmd0aDsgaSArPSAxNikge1xuICAgIGEgPSBIQVNIWzBdOyBiID0gSEFTSFsxXTsgYyA9IEhBU0hbMl07IGQgPSBIQVNIWzNdOyBlID0gSEFTSFs0XTsgZiA9IEhBU0hbNV07IGcgPSBIQVNIWzZdOyBoID0gSEFTSFs3XTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IDY0OyBqKyspIHtcbiAgICAgIGlmIChqIDwgMTYpIHtcbiAgICAgICAgV1tqXSA9IG1baiArIGldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgV1tqXSA9IHNhZmVfYWRkKHNhZmVfYWRkKHNhZmVfYWRkKEdhbW1hMTI1NihXW2ogLSAyXSksIFdbaiAtIDddKSwgR2FtbWEwMjU2KFdbaiAtIDE1XSkpLCBXW2ogLSAxNl0pO1xuICAgICAgfVxuICAgICAgVDEgPSBzYWZlX2FkZChzYWZlX2FkZChzYWZlX2FkZChzYWZlX2FkZChoLCBTaWdtYTEyNTYoZSkpLCBDaChlLCBmLCBnKSksIEtbal0pLCBXW2pdKTtcbiAgICAgIFQyID0gc2FmZV9hZGQoU2lnbWEwMjU2KGEpLCBNYWooYSwgYiwgYykpO1xuICAgICAgaCA9IGc7IGcgPSBmOyBmID0gZTsgZSA9IHNhZmVfYWRkKGQsIFQxKTsgZCA9IGM7IGMgPSBiOyBiID0gYTsgYSA9IHNhZmVfYWRkKFQxLCBUMik7XG4gICAgfVxuICAgIEhBU0hbMF0gPSBzYWZlX2FkZChhLCBIQVNIWzBdKTsgSEFTSFsxXSA9IHNhZmVfYWRkKGIsIEhBU0hbMV0pOyBIQVNIWzJdID0gc2FmZV9hZGQoYywgSEFTSFsyXSk7IEhBU0hbM10gPSBzYWZlX2FkZChkLCBIQVNIWzNdKTtcbiAgICBIQVNIWzRdID0gc2FmZV9hZGQoZSwgSEFTSFs0XSk7IEhBU0hbNV0gPSBzYWZlX2FkZChmLCBIQVNIWzVdKTsgSEFTSFs2XSA9IHNhZmVfYWRkKGcsIEhBU0hbNl0pOyBIQVNIWzddID0gc2FmZV9hZGQoaCwgSEFTSFs3XSk7XG4gIH1cbiAgcmV0dXJuIEhBU0g7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNoYTI1NihidWYpIHtcbiAgcmV0dXJuIGhlbHBlcnMuaGFzaChidWYsIGNvcmVfc2hhMjU2LCAzMiwgdHJ1ZSk7XG59O1xuXG59LHtcIi4vaGVscGVyc1wiOjZ9XX0se30sWzJdKVxuIl19