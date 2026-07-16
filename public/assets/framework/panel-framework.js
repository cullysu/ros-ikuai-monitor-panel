var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  "use strict";
  var jsxRuntime = { exports: {} };
  var reactJsxRuntime_production_min = {};
  var react = { exports: {} };
  var react_production_min = {};
  /**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var hasRequiredReact_production_min;
  function requireReact_production_min() {
    if (hasRequiredReact_production_min) return react_production_min;
    hasRequiredReact_production_min = 1;
    var l = Symbol.for("react.element"), n = Symbol.for("react.portal"), p = Symbol.for("react.fragment"), q = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } }, C = Object.assign, D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray, J = Object.prototype.hasOwnProperty, K = { current: null }, L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null }, V = { transition: null }, W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X2() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    react_production_min.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    react_production_min.Component = E;
    react_production_min.Fragment = p;
    react_production_min.Profiler = r;
    react_production_min.PureComponent = G;
    react_production_min.StrictMode = q;
    react_production_min.Suspense = w;
    react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    react_production_min.act = X2;
    react_production_min.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    react_production_min.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    react_production_min.createElement = M;
    react_production_min.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    react_production_min.createRef = function() {
      return { current: null };
    };
    react_production_min.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    react_production_min.isValidElement = O;
    react_production_min.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    react_production_min.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    react_production_min.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    react_production_min.unstable_act = X2;
    react_production_min.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    react_production_min.useContext = function(a) {
      return U.current.useContext(a);
    };
    react_production_min.useDebugValue = function() {
    };
    react_production_min.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    react_production_min.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    react_production_min.useId = function() {
      return U.current.useId();
    };
    react_production_min.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    react_production_min.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    react_production_min.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    react_production_min.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    react_production_min.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    react_production_min.useRef = function(a) {
      return U.current.useRef(a);
    };
    react_production_min.useState = function(a) {
      return U.current.useState(a);
    };
    react_production_min.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    react_production_min.useTransition = function() {
      return U.current.useTransition();
    };
    react_production_min.version = "18.3.1";
    return react_production_min;
  }
  var hasRequiredReact;
  function requireReact() {
    if (hasRequiredReact) return react.exports;
    hasRequiredReact = 1;
    {
      react.exports = requireReact_production_min();
    }
    return react.exports;
  }
  /**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var hasRequiredReactJsxRuntime_production_min;
  function requireReactJsxRuntime_production_min() {
    if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
    hasRequiredReactJsxRuntime_production_min = 1;
    var f = requireReact(), k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = { key: true, ref: true, __self: true, __source: true };
    function q(c, a, g) {
      var b, d = {}, e = null, h = null;
      void 0 !== g && (e = "" + g);
      void 0 !== a.key && (e = "" + a.key);
      void 0 !== a.ref && (h = a.ref);
      for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
      if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
      return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
    }
    reactJsxRuntime_production_min.Fragment = l;
    reactJsxRuntime_production_min.jsx = q;
    reactJsxRuntime_production_min.jsxs = q;
    return reactJsxRuntime_production_min;
  }
  var hasRequiredJsxRuntime;
  function requireJsxRuntime() {
    if (hasRequiredJsxRuntime) return jsxRuntime.exports;
    hasRequiredJsxRuntime = 1;
    {
      jsxRuntime.exports = requireReactJsxRuntime_production_min();
    }
    return jsxRuntime.exports;
  }
  var jsxRuntimeExports = requireJsxRuntime();
  var client = {};
  var reactDom = { exports: {} };
  var reactDom_production_min = {};
  var scheduler = { exports: {} };
  var scheduler_production_min = {};
  /**
   * @license React
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var hasRequiredScheduler_production_min;
  function requireScheduler_production_min() {
    if (hasRequiredScheduler_production_min) return scheduler_production_min;
    hasRequiredScheduler_production_min = 1;
    (function(exports) {
      function f(a, b) {
        var c = a.length;
        a.push(b);
        a: for (; 0 < c; ) {
          var d = c - 1 >>> 1, e = a[d];
          if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
          else break a;
        }
      }
      function h(a) {
        return 0 === a.length ? null : a[0];
      }
      function k(a) {
        if (0 === a.length) return null;
        var b = a[0], c = a.pop();
        if (c !== b) {
          a[0] = c;
          a: for (var d = 0, e = a.length, w = e >>> 1; d < w; ) {
            var m = 2 * (d + 1) - 1, C = a[m], n = m + 1, x = a[n];
            if (0 > g(C, c)) n < e && 0 > g(x, C) ? (a[d] = x, a[n] = c, d = n) : (a[d] = C, a[m] = c, d = m);
            else if (n < e && 0 > g(x, c)) a[d] = x, a[n] = c, d = n;
            else break a;
          }
        }
        return b;
      }
      function g(a, b) {
        var c = a.sortIndex - b.sortIndex;
        return 0 !== c ? c : a.id - b.id;
      }
      if ("object" === typeof performance && "function" === typeof performance.now) {
        var l = performance;
        exports.unstable_now = function() {
          return l.now();
        };
      } else {
        var p = Date, q = p.now();
        exports.unstable_now = function() {
          return p.now() - q;
        };
      }
      var r = [], t = [], u = 1, v = null, y = 3, z = false, A = false, B = false, D = "function" === typeof setTimeout ? setTimeout : null, E = "function" === typeof clearTimeout ? clearTimeout : null, F = "undefined" !== typeof setImmediate ? setImmediate : null;
      "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
      function G(a) {
        for (var b = h(t); null !== b; ) {
          if (null === b.callback) k(t);
          else if (b.startTime <= a) k(t), b.sortIndex = b.expirationTime, f(r, b);
          else break;
          b = h(t);
        }
      }
      function H(a) {
        B = false;
        G(a);
        if (!A) if (null !== h(r)) A = true, I(J);
        else {
          var b = h(t);
          null !== b && K(H, b.startTime - a);
        }
      }
      function J(a, b) {
        A = false;
        B && (B = false, E(L), L = -1);
        z = true;
        var c = y;
        try {
          G(b);
          for (v = h(r); null !== v && (!(v.expirationTime > b) || a && !M()); ) {
            var d = v.callback;
            if ("function" === typeof d) {
              v.callback = null;
              y = v.priorityLevel;
              var e = d(v.expirationTime <= b);
              b = exports.unstable_now();
              "function" === typeof e ? v.callback = e : v === h(r) && k(r);
              G(b);
            } else k(r);
            v = h(r);
          }
          if (null !== v) var w = true;
          else {
            var m = h(t);
            null !== m && K(H, m.startTime - b);
            w = false;
          }
          return w;
        } finally {
          v = null, y = c, z = false;
        }
      }
      var N = false, O = null, L = -1, P = 5, Q = -1;
      function M() {
        return exports.unstable_now() - Q < P ? false : true;
      }
      function R() {
        if (null !== O) {
          var a = exports.unstable_now();
          Q = a;
          var b = true;
          try {
            b = O(true, a);
          } finally {
            b ? S() : (N = false, O = null);
          }
        } else N = false;
      }
      var S;
      if ("function" === typeof F) S = function() {
        F(R);
      };
      else if ("undefined" !== typeof MessageChannel) {
        var T = new MessageChannel(), U = T.port2;
        T.port1.onmessage = R;
        S = function() {
          U.postMessage(null);
        };
      } else S = function() {
        D(R, 0);
      };
      function I(a) {
        O = a;
        N || (N = true, S());
      }
      function K(a, b) {
        L = D(function() {
          a(exports.unstable_now());
        }, b);
      }
      exports.unstable_IdlePriority = 5;
      exports.unstable_ImmediatePriority = 1;
      exports.unstable_LowPriority = 4;
      exports.unstable_NormalPriority = 3;
      exports.unstable_Profiling = null;
      exports.unstable_UserBlockingPriority = 2;
      exports.unstable_cancelCallback = function(a) {
        a.callback = null;
      };
      exports.unstable_continueExecution = function() {
        A || z || (A = true, I(J));
      };
      exports.unstable_forceFrameRate = function(a) {
        0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < a ? Math.floor(1e3 / a) : 5;
      };
      exports.unstable_getCurrentPriorityLevel = function() {
        return y;
      };
      exports.unstable_getFirstCallbackNode = function() {
        return h(r);
      };
      exports.unstable_next = function(a) {
        switch (y) {
          case 1:
          case 2:
          case 3:
            var b = 3;
            break;
          default:
            b = y;
        }
        var c = y;
        y = b;
        try {
          return a();
        } finally {
          y = c;
        }
      };
      exports.unstable_pauseExecution = function() {
      };
      exports.unstable_requestPaint = function() {
      };
      exports.unstable_runWithPriority = function(a, b) {
        switch (a) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
            break;
          default:
            a = 3;
        }
        var c = y;
        y = a;
        try {
          return b();
        } finally {
          y = c;
        }
      };
      exports.unstable_scheduleCallback = function(a, b, c) {
        var d = exports.unstable_now();
        "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
        switch (a) {
          case 1:
            var e = -1;
            break;
          case 2:
            e = 250;
            break;
          case 5:
            e = 1073741823;
            break;
          case 4:
            e = 1e4;
            break;
          default:
            e = 5e3;
        }
        e = c + e;
        a = { id: u++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
        c > d ? (a.sortIndex = c, f(t, a), null === h(r) && a === h(t) && (B ? (E(L), L = -1) : B = true, K(H, c - d))) : (a.sortIndex = e, f(r, a), A || z || (A = true, I(J)));
        return a;
      };
      exports.unstable_shouldYield = M;
      exports.unstable_wrapCallback = function(a) {
        var b = y;
        return function() {
          var c = y;
          y = b;
          try {
            return a.apply(this, arguments);
          } finally {
            y = c;
          }
        };
      };
    })(scheduler_production_min);
    return scheduler_production_min;
  }
  var hasRequiredScheduler;
  function requireScheduler() {
    if (hasRequiredScheduler) return scheduler.exports;
    hasRequiredScheduler = 1;
    {
      scheduler.exports = requireScheduler_production_min();
    }
    return scheduler.exports;
  }
  /**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var hasRequiredReactDom_production_min;
  function requireReactDom_production_min() {
    if (hasRequiredReactDom_production_min) return reactDom_production_min;
    hasRequiredReactDom_production_min = 1;
    var aa = requireReact(), ca = requireScheduler();
    function p(a) {
      for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
      return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
    }
    var da = /* @__PURE__ */ new Set(), ea = {};
    function fa(a, b) {
      ha(a, b);
      ha(a + "Capture", b);
    }
    function ha(a, b) {
      ea[a] = b;
      for (a = 0; a < b.length; a++) da.add(b[a]);
    }
    var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
    function oa(a) {
      if (ja.call(ma, a)) return true;
      if (ja.call(la, a)) return false;
      if (ka.test(a)) return ma[a] = true;
      la[a] = true;
      return false;
    }
    function pa(a, b, c, d) {
      if (null !== c && 0 === c.type) return false;
      switch (typeof b) {
        case "function":
        case "symbol":
          return true;
        case "boolean":
          if (d) return false;
          if (null !== c) return !c.acceptsBooleans;
          a = a.toLowerCase().slice(0, 5);
          return "data-" !== a && "aria-" !== a;
        default:
          return false;
      }
    }
    function qa(a, b, c, d) {
      if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
      if (d) return false;
      if (null !== c) switch (c.type) {
        case 3:
          return !b;
        case 4:
          return false === b;
        case 5:
          return isNaN(b);
        case 6:
          return isNaN(b) || 1 > b;
      }
      return false;
    }
    function v(a, b, c, d, e, f, g) {
      this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
      this.attributeName = d;
      this.attributeNamespace = e;
      this.mustUseProperty = c;
      this.propertyName = a;
      this.type = b;
      this.sanitizeURL = f;
      this.removeEmptyString = g;
    }
    var z = {};
    "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
      z[a] = new v(a, 0, false, a, null, false, false);
    });
    [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
      var b = a[0];
      z[b] = new v(b, 1, false, a[1], null, false, false);
    });
    ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
      z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
    });
    ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
      z[a] = new v(a, 2, false, a, null, false, false);
    });
    "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
      z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
    });
    ["checked", "multiple", "muted", "selected"].forEach(function(a) {
      z[a] = new v(a, 3, true, a, null, false, false);
    });
    ["capture", "download"].forEach(function(a) {
      z[a] = new v(a, 4, false, a, null, false, false);
    });
    ["cols", "rows", "size", "span"].forEach(function(a) {
      z[a] = new v(a, 6, false, a, null, false, false);
    });
    ["rowSpan", "start"].forEach(function(a) {
      z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
    });
    var ra = /[\-:]([a-z])/g;
    function sa(a) {
      return a[1].toUpperCase();
    }
    "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
      var b = a.replace(
        ra,
        sa
      );
      z[b] = new v(b, 1, false, a, null, false, false);
    });
    "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
      var b = a.replace(ra, sa);
      z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
    });
    ["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
      var b = a.replace(ra, sa);
      z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
    });
    ["tabIndex", "crossOrigin"].forEach(function(a) {
      z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
    });
    z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
    ["src", "href", "action", "formAction"].forEach(function(a) {
      z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
    });
    function ta(a, b, c, d) {
      var e = z.hasOwnProperty(b) ? z[b] : null;
      if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
    }
    var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
    var Ia = Symbol.for("react.offscreen");
    var Ja = Symbol.iterator;
    function Ka(a) {
      if (null === a || "object" !== typeof a) return null;
      a = Ja && a[Ja] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var A = Object.assign, La;
    function Ma(a) {
      if (void 0 === La) try {
        throw Error();
      } catch (c) {
        var b = c.stack.trim().match(/\n( *(at )?)/);
        La = b && b[1] || "";
      }
      return "\n" + La + a;
    }
    var Na = false;
    function Oa(a, b) {
      if (!a || Na) return "";
      Na = true;
      var c = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      try {
        if (b) if (b = function() {
          throw Error();
        }, Object.defineProperty(b.prototype, "props", { set: function() {
          throw Error();
        } }), "object" === typeof Reflect && Reflect.construct) {
          try {
            Reflect.construct(b, []);
          } catch (l) {
            var d = l;
          }
          Reflect.construct(a, [], b);
        } else {
          try {
            b.call();
          } catch (l) {
            d = l;
          }
          a.call(b.prototype);
        }
        else {
          try {
            throw Error();
          } catch (l) {
            d = l;
          }
          a();
        }
      } catch (l) {
        if (l && d && "string" === typeof l.stack) {
          for (var e = l.stack.split("\n"), f = d.stack.split("\n"), g = e.length - 1, h = f.length - 1; 1 <= g && 0 <= h && e[g] !== f[h]; ) h--;
          for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f[h]) {
            if (1 !== g || 1 !== h) {
              do
                if (g--, h--, 0 > h || e[g] !== f[h]) {
                  var k = "\n" + e[g].replace(" at new ", " at ");
                  a.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", a.displayName));
                  return k;
                }
              while (1 <= g && 0 <= h);
            }
            break;
          }
        }
      } finally {
        Na = false, Error.prepareStackTrace = c;
      }
      return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
    }
    function Pa(a) {
      switch (a.tag) {
        case 5:
          return Ma(a.type);
        case 16:
          return Ma("Lazy");
        case 13:
          return Ma("Suspense");
        case 19:
          return Ma("SuspenseList");
        case 0:
        case 2:
        case 15:
          return a = Oa(a.type, false), a;
        case 11:
          return a = Oa(a.type.render, false), a;
        case 1:
          return a = Oa(a.type, true), a;
        default:
          return "";
      }
    }
    function Qa(a) {
      if (null == a) return null;
      if ("function" === typeof a) return a.displayName || a.name || null;
      if ("string" === typeof a) return a;
      switch (a) {
        case ya:
          return "Fragment";
        case wa:
          return "Portal";
        case Aa:
          return "Profiler";
        case za:
          return "StrictMode";
        case Ea:
          return "Suspense";
        case Fa:
          return "SuspenseList";
      }
      if ("object" === typeof a) switch (a.$$typeof) {
        case Ca:
          return (a.displayName || "Context") + ".Consumer";
        case Ba:
          return (a._context.displayName || "Context") + ".Provider";
        case Da:
          var b = a.render;
          a = a.displayName;
          a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
          return a;
        case Ga:
          return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
        case Ha:
          b = a._payload;
          a = a._init;
          try {
            return Qa(a(b));
          } catch (c) {
          }
      }
      return null;
    }
    function Ra(a) {
      var b = a.type;
      switch (a.tag) {
        case 24:
          return "Cache";
        case 9:
          return (b.displayName || "Context") + ".Consumer";
        case 10:
          return (b._context.displayName || "Context") + ".Provider";
        case 18:
          return "DehydratedFragment";
        case 11:
          return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
        case 7:
          return "Fragment";
        case 5:
          return b;
        case 4:
          return "Portal";
        case 3:
          return "Root";
        case 6:
          return "Text";
        case 16:
          return Qa(b);
        case 8:
          return b === za ? "StrictMode" : "Mode";
        case 22:
          return "Offscreen";
        case 12:
          return "Profiler";
        case 21:
          return "Scope";
        case 13:
          return "Suspense";
        case 19:
          return "SuspenseList";
        case 25:
          return "TracingMarker";
        case 1:
        case 0:
        case 17:
        case 2:
        case 14:
        case 15:
          if ("function" === typeof b) return b.displayName || b.name || null;
          if ("string" === typeof b) return b;
      }
      return null;
    }
    function Sa(a) {
      switch (typeof a) {
        case "boolean":
        case "number":
        case "string":
        case "undefined":
          return a;
        case "object":
          return a;
        default:
          return "";
      }
    }
    function Ta(a) {
      var b = a.type;
      return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
    }
    function Ua(a) {
      var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
      if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
        var e = c.get, f = c.set;
        Object.defineProperty(a, b, { configurable: true, get: function() {
          return e.call(this);
        }, set: function(a2) {
          d = "" + a2;
          f.call(this, a2);
        } });
        Object.defineProperty(a, b, { enumerable: c.enumerable });
        return { getValue: function() {
          return d;
        }, setValue: function(a2) {
          d = "" + a2;
        }, stopTracking: function() {
          a._valueTracker = null;
          delete a[b];
        } };
      }
    }
    function Va(a) {
      a._valueTracker || (a._valueTracker = Ua(a));
    }
    function Wa(a) {
      if (!a) return false;
      var b = a._valueTracker;
      if (!b) return true;
      var c = b.getValue();
      var d = "";
      a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
      a = d;
      return a !== c ? (b.setValue(a), true) : false;
    }
    function Xa(a) {
      a = a || ("undefined" !== typeof document ? document : void 0);
      if ("undefined" === typeof a) return null;
      try {
        return a.activeElement || a.body;
      } catch (b) {
        return a.body;
      }
    }
    function Ya(a, b) {
      var c = b.checked;
      return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
    }
    function Za(a, b) {
      var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
      c = Sa(null != b.value ? b.value : c);
      a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
    }
    function ab(a, b) {
      b = b.checked;
      null != b && ta(a, "checked", b, false);
    }
    function bb(a, b) {
      ab(a, b);
      var c = Sa(b.value), d = b.type;
      if (null != c) if ("number" === d) {
        if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
      } else a.value !== "" + c && (a.value = "" + c);
      else if ("submit" === d || "reset" === d) {
        a.removeAttribute("value");
        return;
      }
      b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
      null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
    }
    function db(a, b, c) {
      if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
        var d = b.type;
        if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
        b = "" + a._wrapperState.initialValue;
        c || b === a.value || (a.value = b);
        a.defaultValue = b;
      }
      c = a.name;
      "" !== c && (a.name = "");
      a.defaultChecked = !!a._wrapperState.initialChecked;
      "" !== c && (a.name = c);
    }
    function cb(a, b, c) {
      if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
    }
    var eb = Array.isArray;
    function fb(a, b, c, d) {
      a = a.options;
      if (b) {
        b = {};
        for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
        for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
      } else {
        c = "" + Sa(c);
        b = null;
        for (e = 0; e < a.length; e++) {
          if (a[e].value === c) {
            a[e].selected = true;
            d && (a[e].defaultSelected = true);
            return;
          }
          null !== b || a[e].disabled || (b = a[e]);
        }
        null !== b && (b.selected = true);
      }
    }
    function gb(a, b) {
      if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
      return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
    }
    function hb(a, b) {
      var c = b.value;
      if (null == c) {
        c = b.children;
        b = b.defaultValue;
        if (null != c) {
          if (null != b) throw Error(p(92));
          if (eb(c)) {
            if (1 < c.length) throw Error(p(93));
            c = c[0];
          }
          b = c;
        }
        null == b && (b = "");
        c = b;
      }
      a._wrapperState = { initialValue: Sa(c) };
    }
    function ib(a, b) {
      var c = Sa(b.value), d = Sa(b.defaultValue);
      null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
      null != d && (a.defaultValue = "" + d);
    }
    function jb(a) {
      var b = a.textContent;
      b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
    }
    function kb(a) {
      switch (a) {
        case "svg":
          return "http://www.w3.org/2000/svg";
        case "math":
          return "http://www.w3.org/1998/Math/MathML";
        default:
          return "http://www.w3.org/1999/xhtml";
      }
    }
    function lb(a, b) {
      return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
    }
    var mb, nb = (function(a) {
      return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
        MSApp.execUnsafeLocalFunction(function() {
          return a(b, c, d, e);
        });
      } : a;
    })(function(a, b) {
      if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
      else {
        mb = mb || document.createElement("div");
        mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
        for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
        for (; b.firstChild; ) a.appendChild(b.firstChild);
      }
    });
    function ob(a, b) {
      if (b) {
        var c = a.firstChild;
        if (c && c === a.lastChild && 3 === c.nodeType) {
          c.nodeValue = b;
          return;
        }
      }
      a.textContent = b;
    }
    var pb = {
      animationIterationCount: true,
      aspectRatio: true,
      borderImageOutset: true,
      borderImageSlice: true,
      borderImageWidth: true,
      boxFlex: true,
      boxFlexGroup: true,
      boxOrdinalGroup: true,
      columnCount: true,
      columns: true,
      flex: true,
      flexGrow: true,
      flexPositive: true,
      flexShrink: true,
      flexNegative: true,
      flexOrder: true,
      gridArea: true,
      gridRow: true,
      gridRowEnd: true,
      gridRowSpan: true,
      gridRowStart: true,
      gridColumn: true,
      gridColumnEnd: true,
      gridColumnSpan: true,
      gridColumnStart: true,
      fontWeight: true,
      lineClamp: true,
      lineHeight: true,
      opacity: true,
      order: true,
      orphans: true,
      tabSize: true,
      widows: true,
      zIndex: true,
      zoom: true,
      fillOpacity: true,
      floodOpacity: true,
      stopOpacity: true,
      strokeDasharray: true,
      strokeDashoffset: true,
      strokeMiterlimit: true,
      strokeOpacity: true,
      strokeWidth: true
    }, qb = ["Webkit", "ms", "Moz", "O"];
    Object.keys(pb).forEach(function(a) {
      qb.forEach(function(b) {
        b = b + a.charAt(0).toUpperCase() + a.substring(1);
        pb[b] = pb[a];
      });
    });
    function rb(a, b, c) {
      return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
    }
    function sb(a, b) {
      a = a.style;
      for (var c in b) if (b.hasOwnProperty(c)) {
        var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
        "float" === c && (c = "cssFloat");
        d ? a.setProperty(c, e) : a[c] = e;
      }
    }
    var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
    function ub(a, b) {
      if (b) {
        if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
        if (null != b.dangerouslySetInnerHTML) {
          if (null != b.children) throw Error(p(60));
          if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
        }
        if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
      }
    }
    function vb(a, b) {
      if (-1 === a.indexOf("-")) return "string" === typeof b.is;
      switch (a) {
        case "annotation-xml":
        case "color-profile":
        case "font-face":
        case "font-face-src":
        case "font-face-uri":
        case "font-face-format":
        case "font-face-name":
        case "missing-glyph":
          return false;
        default:
          return true;
      }
    }
    var wb = null;
    function xb(a) {
      a = a.target || a.srcElement || window;
      a.correspondingUseElement && (a = a.correspondingUseElement);
      return 3 === a.nodeType ? a.parentNode : a;
    }
    var yb = null, zb = null, Ab = null;
    function Bb(a) {
      if (a = Cb(a)) {
        if ("function" !== typeof yb) throw Error(p(280));
        var b = a.stateNode;
        b && (b = Db(b), yb(a.stateNode, a.type, b));
      }
    }
    function Eb(a) {
      zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
    }
    function Fb() {
      if (zb) {
        var a = zb, b = Ab;
        Ab = zb = null;
        Bb(a);
        if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
      }
    }
    function Gb(a, b) {
      return a(b);
    }
    function Hb() {
    }
    var Ib = false;
    function Jb(a, b, c) {
      if (Ib) return a(b, c);
      Ib = true;
      try {
        return Gb(a, b, c);
      } finally {
        if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
      }
    }
    function Kb(a, b) {
      var c = a.stateNode;
      if (null === c) return null;
      var d = Db(c);
      if (null === d) return null;
      c = d[b];
      a: switch (b) {
        case "onClick":
        case "onClickCapture":
        case "onDoubleClick":
        case "onDoubleClickCapture":
        case "onMouseDown":
        case "onMouseDownCapture":
        case "onMouseMove":
        case "onMouseMoveCapture":
        case "onMouseUp":
        case "onMouseUpCapture":
        case "onMouseEnter":
          (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
          a = !d;
          break a;
        default:
          a = false;
      }
      if (a) return null;
      if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
      return c;
    }
    var Lb = false;
    if (ia) try {
      var Mb = {};
      Object.defineProperty(Mb, "passive", { get: function() {
        Lb = true;
      } });
      window.addEventListener("test", Mb, Mb);
      window.removeEventListener("test", Mb, Mb);
    } catch (a) {
      Lb = false;
    }
    function Nb(a, b, c, d, e, f, g, h, k) {
      var l = Array.prototype.slice.call(arguments, 3);
      try {
        b.apply(c, l);
      } catch (m) {
        this.onError(m);
      }
    }
    var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
      Ob = true;
      Pb = a;
    } };
    function Tb(a, b, c, d, e, f, g, h, k) {
      Ob = false;
      Pb = null;
      Nb.apply(Sb, arguments);
    }
    function Ub(a, b, c, d, e, f, g, h, k) {
      Tb.apply(this, arguments);
      if (Ob) {
        if (Ob) {
          var l = Pb;
          Ob = false;
          Pb = null;
        } else throw Error(p(198));
        Qb || (Qb = true, Rb = l);
      }
    }
    function Vb(a) {
      var b = a, c = a;
      if (a.alternate) for (; b.return; ) b = b.return;
      else {
        a = b;
        do
          b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
        while (a);
      }
      return 3 === b.tag ? c : null;
    }
    function Wb(a) {
      if (13 === a.tag) {
        var b = a.memoizedState;
        null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
        if (null !== b) return b.dehydrated;
      }
      return null;
    }
    function Xb(a) {
      if (Vb(a) !== a) throw Error(p(188));
    }
    function Yb(a) {
      var b = a.alternate;
      if (!b) {
        b = Vb(a);
        if (null === b) throw Error(p(188));
        return b !== a ? null : a;
      }
      for (var c = a, d = b; ; ) {
        var e = c.return;
        if (null === e) break;
        var f = e.alternate;
        if (null === f) {
          d = e.return;
          if (null !== d) {
            c = d;
            continue;
          }
          break;
        }
        if (e.child === f.child) {
          for (f = e.child; f; ) {
            if (f === c) return Xb(e), a;
            if (f === d) return Xb(e), b;
            f = f.sibling;
          }
          throw Error(p(188));
        }
        if (c.return !== d.return) c = e, d = f;
        else {
          for (var g = false, h = e.child; h; ) {
            if (h === c) {
              g = true;
              c = e;
              d = f;
              break;
            }
            if (h === d) {
              g = true;
              d = e;
              c = f;
              break;
            }
            h = h.sibling;
          }
          if (!g) {
            for (h = f.child; h; ) {
              if (h === c) {
                g = true;
                c = f;
                d = e;
                break;
              }
              if (h === d) {
                g = true;
                d = f;
                c = e;
                break;
              }
              h = h.sibling;
            }
            if (!g) throw Error(p(189));
          }
        }
        if (c.alternate !== d) throw Error(p(190));
      }
      if (3 !== c.tag) throw Error(p(188));
      return c.stateNode.current === c ? a : b;
    }
    function Zb(a) {
      a = Yb(a);
      return null !== a ? $b(a) : null;
    }
    function $b(a) {
      if (5 === a.tag || 6 === a.tag) return a;
      for (a = a.child; null !== a; ) {
        var b = $b(a);
        if (null !== b) return b;
        a = a.sibling;
      }
      return null;
    }
    var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
    function mc(a) {
      if (lc && "function" === typeof lc.onCommitFiberRoot) try {
        lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
      } catch (b) {
      }
    }
    var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
    function nc(a) {
      a >>>= 0;
      return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
    }
    var rc = 64, sc = 4194304;
    function tc(a) {
      switch (a & -a) {
        case 1:
          return 1;
        case 2:
          return 2;
        case 4:
          return 4;
        case 8:
          return 8;
        case 16:
          return 16;
        case 32:
          return 32;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return a & 4194240;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          return a & 130023424;
        case 134217728:
          return 134217728;
        case 268435456:
          return 268435456;
        case 536870912:
          return 536870912;
        case 1073741824:
          return 1073741824;
        default:
          return a;
      }
    }
    function uc(a, b) {
      var c = a.pendingLanes;
      if (0 === c) return 0;
      var d = 0, e = a.suspendedLanes, f = a.pingedLanes, g = c & 268435455;
      if (0 !== g) {
        var h = g & ~e;
        0 !== h ? d = tc(h) : (f &= g, 0 !== f && (d = tc(f)));
      } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f && (d = tc(f));
      if (0 === d) return 0;
      if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f = b & -b, e >= f || 16 === e && 0 !== (f & 4194240))) return b;
      0 !== (d & 4) && (d |= c & 16);
      b = a.entangledLanes;
      if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
      return d;
    }
    function vc(a, b) {
      switch (a) {
        case 1:
        case 2:
        case 4:
          return b + 250;
        case 8:
        case 16:
        case 32:
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return b + 5e3;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          return -1;
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
          return -1;
        default:
          return -1;
      }
    }
    function wc(a, b) {
      for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f = a.pendingLanes; 0 < f; ) {
        var g = 31 - oc(f), h = 1 << g, k = e[g];
        if (-1 === k) {
          if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
        } else k <= b && (a.expiredLanes |= h);
        f &= ~h;
      }
    }
    function xc(a) {
      a = a.pendingLanes & -1073741825;
      return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
    }
    function yc() {
      var a = rc;
      rc <<= 1;
      0 === (rc & 4194240) && (rc = 64);
      return a;
    }
    function zc(a) {
      for (var b = [], c = 0; 31 > c; c++) b.push(a);
      return b;
    }
    function Ac(a, b, c) {
      a.pendingLanes |= b;
      536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
      a = a.eventTimes;
      b = 31 - oc(b);
      a[b] = c;
    }
    function Bc(a, b) {
      var c = a.pendingLanes & ~b;
      a.pendingLanes = b;
      a.suspendedLanes = 0;
      a.pingedLanes = 0;
      a.expiredLanes &= b;
      a.mutableReadLanes &= b;
      a.entangledLanes &= b;
      b = a.entanglements;
      var d = a.eventTimes;
      for (a = a.expirationTimes; 0 < c; ) {
        var e = 31 - oc(c), f = 1 << e;
        b[e] = 0;
        d[e] = -1;
        a[e] = -1;
        c &= ~f;
      }
    }
    function Cc(a, b) {
      var c = a.entangledLanes |= b;
      for (a = a.entanglements; c; ) {
        var d = 31 - oc(c), e = 1 << d;
        e & b | a[d] & b && (a[d] |= b);
        c &= ~e;
      }
    }
    var C = 0;
    function Dc(a) {
      a &= -a;
      return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
    }
    var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
    function Sc(a, b) {
      switch (a) {
        case "focusin":
        case "focusout":
          Lc = null;
          break;
        case "dragenter":
        case "dragleave":
          Mc = null;
          break;
        case "mouseover":
        case "mouseout":
          Nc = null;
          break;
        case "pointerover":
        case "pointerout":
          Oc.delete(b.pointerId);
          break;
        case "gotpointercapture":
        case "lostpointercapture":
          Pc.delete(b.pointerId);
      }
    }
    function Tc(a, b, c, d, e, f) {
      if (null === a || a.nativeEvent !== f) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
      a.eventSystemFlags |= d;
      b = a.targetContainers;
      null !== e && -1 === b.indexOf(e) && b.push(e);
      return a;
    }
    function Uc(a, b, c, d, e) {
      switch (b) {
        case "focusin":
          return Lc = Tc(Lc, a, b, c, d, e), true;
        case "dragenter":
          return Mc = Tc(Mc, a, b, c, d, e), true;
        case "mouseover":
          return Nc = Tc(Nc, a, b, c, d, e), true;
        case "pointerover":
          var f = e.pointerId;
          Oc.set(f, Tc(Oc.get(f) || null, a, b, c, d, e));
          return true;
        case "gotpointercapture":
          return f = e.pointerId, Pc.set(f, Tc(Pc.get(f) || null, a, b, c, d, e)), true;
      }
      return false;
    }
    function Vc(a) {
      var b = Wc(a.target);
      if (null !== b) {
        var c = Vb(b);
        if (null !== c) {
          if (b = c.tag, 13 === b) {
            if (b = Wb(c), null !== b) {
              a.blockedOn = b;
              Ic(a.priority, function() {
                Gc(c);
              });
              return;
            }
          } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
            a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
            return;
          }
        }
      }
      a.blockedOn = null;
    }
    function Xc(a) {
      if (null !== a.blockedOn) return false;
      for (var b = a.targetContainers; 0 < b.length; ) {
        var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
        if (null === c) {
          c = a.nativeEvent;
          var d = new c.constructor(c.type, c);
          wb = d;
          c.target.dispatchEvent(d);
          wb = null;
        } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
        b.shift();
      }
      return true;
    }
    function Zc(a, b, c) {
      Xc(a) && c.delete(b);
    }
    function $c() {
      Jc = false;
      null !== Lc && Xc(Lc) && (Lc = null);
      null !== Mc && Xc(Mc) && (Mc = null);
      null !== Nc && Xc(Nc) && (Nc = null);
      Oc.forEach(Zc);
      Pc.forEach(Zc);
    }
    function ad(a, b) {
      a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
    }
    function bd(a) {
      function b(b2) {
        return ad(b2, a);
      }
      if (0 < Kc.length) {
        ad(Kc[0], a);
        for (var c = 1; c < Kc.length; c++) {
          var d = Kc[c];
          d.blockedOn === a && (d.blockedOn = null);
        }
      }
      null !== Lc && ad(Lc, a);
      null !== Mc && ad(Mc, a);
      null !== Nc && ad(Nc, a);
      Oc.forEach(b);
      Pc.forEach(b);
      for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
      for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
    }
    var cd = ua.ReactCurrentBatchConfig, dd = true;
    function ed(a, b, c, d) {
      var e = C, f = cd.transition;
      cd.transition = null;
      try {
        C = 1, fd(a, b, c, d);
      } finally {
        C = e, cd.transition = f;
      }
    }
    function gd(a, b, c, d) {
      var e = C, f = cd.transition;
      cd.transition = null;
      try {
        C = 4, fd(a, b, c, d);
      } finally {
        C = e, cd.transition = f;
      }
    }
    function fd(a, b, c, d) {
      if (dd) {
        var e = Yc(a, b, c, d);
        if (null === e) hd(a, b, d, id, c), Sc(a, d);
        else if (Uc(e, a, b, c, d)) d.stopPropagation();
        else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
          for (; null !== e; ) {
            var f = Cb(e);
            null !== f && Ec(f);
            f = Yc(a, b, c, d);
            null === f && hd(a, b, d, id, c);
            if (f === e) break;
            e = f;
          }
          null !== e && d.stopPropagation();
        } else hd(a, b, d, null, c);
      }
    }
    var id = null;
    function Yc(a, b, c, d) {
      id = null;
      a = xb(d);
      a = Wc(a);
      if (null !== a) if (b = Vb(a), null === b) a = null;
      else if (c = b.tag, 13 === c) {
        a = Wb(b);
        if (null !== a) return a;
        a = null;
      } else if (3 === c) {
        if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
        a = null;
      } else b !== a && (a = null);
      id = a;
      return null;
    }
    function jd(a) {
      switch (a) {
        case "cancel":
        case "click":
        case "close":
        case "contextmenu":
        case "copy":
        case "cut":
        case "auxclick":
        case "dblclick":
        case "dragend":
        case "dragstart":
        case "drop":
        case "focusin":
        case "focusout":
        case "input":
        case "invalid":
        case "keydown":
        case "keypress":
        case "keyup":
        case "mousedown":
        case "mouseup":
        case "paste":
        case "pause":
        case "play":
        case "pointercancel":
        case "pointerdown":
        case "pointerup":
        case "ratechange":
        case "reset":
        case "resize":
        case "seeked":
        case "submit":
        case "touchcancel":
        case "touchend":
        case "touchstart":
        case "volumechange":
        case "change":
        case "selectionchange":
        case "textInput":
        case "compositionstart":
        case "compositionend":
        case "compositionupdate":
        case "beforeblur":
        case "afterblur":
        case "beforeinput":
        case "blur":
        case "fullscreenchange":
        case "focus":
        case "hashchange":
        case "popstate":
        case "select":
        case "selectstart":
          return 1;
        case "drag":
        case "dragenter":
        case "dragexit":
        case "dragleave":
        case "dragover":
        case "mousemove":
        case "mouseout":
        case "mouseover":
        case "pointermove":
        case "pointerout":
        case "pointerover":
        case "scroll":
        case "toggle":
        case "touchmove":
        case "wheel":
        case "mouseenter":
        case "mouseleave":
        case "pointerenter":
        case "pointerleave":
          return 4;
        case "message":
          switch (ec()) {
            case fc:
              return 1;
            case gc:
              return 4;
            case hc:
            case ic:
              return 16;
            case jc:
              return 536870912;
            default:
              return 16;
          }
        default:
          return 16;
      }
    }
    var kd = null, ld = null, md = null;
    function nd() {
      if (md) return md;
      var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f = e.length;
      for (a = 0; a < c && b[a] === e[a]; a++) ;
      var g = c - a;
      for (d = 1; d <= g && b[c - d] === e[f - d]; d++) ;
      return md = e.slice(a, 1 < d ? 1 - d : void 0);
    }
    function od(a) {
      var b = a.keyCode;
      "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
      10 === a && (a = 13);
      return 32 <= a || 13 === a ? a : 0;
    }
    function pd() {
      return true;
    }
    function qd() {
      return false;
    }
    function rd(a) {
      function b(b2, d, e, f, g) {
        this._reactName = b2;
        this._targetInst = e;
        this.type = d;
        this.nativeEvent = f;
        this.target = g;
        this.currentTarget = null;
        for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f) : f[c]);
        this.isDefaultPrevented = (null != f.defaultPrevented ? f.defaultPrevented : false === f.returnValue) ? pd : qd;
        this.isPropagationStopped = qd;
        return this;
      }
      A(b.prototype, { preventDefault: function() {
        this.defaultPrevented = true;
        var a2 = this.nativeEvent;
        a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
      }, stopPropagation: function() {
        var a2 = this.nativeEvent;
        a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
      }, persist: function() {
      }, isPersistent: pd });
      return b;
    }
    var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
      return a.timeStamp || Date.now();
    }, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
      return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
    }, movementX: function(a) {
      if ("movementX" in a) return a.movementX;
      a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
      return wd;
    }, movementY: function(a) {
      return "movementY" in a ? a.movementY : xd;
    } }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
      return "clipboardData" in a ? a.clipboardData : window.clipboardData;
    } }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
      Esc: "Escape",
      Spacebar: " ",
      Left: "ArrowLeft",
      Up: "ArrowUp",
      Right: "ArrowRight",
      Down: "ArrowDown",
      Del: "Delete",
      Win: "OS",
      Menu: "ContextMenu",
      Apps: "ContextMenu",
      Scroll: "ScrollLock",
      MozPrintableKey: "Unidentified"
    }, Nd = {
      8: "Backspace",
      9: "Tab",
      12: "Clear",
      13: "Enter",
      16: "Shift",
      17: "Control",
      18: "Alt",
      19: "Pause",
      20: "CapsLock",
      27: "Escape",
      32: " ",
      33: "PageUp",
      34: "PageDown",
      35: "End",
      36: "Home",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      45: "Insert",
      46: "Delete",
      112: "F1",
      113: "F2",
      114: "F3",
      115: "F4",
      116: "F5",
      117: "F6",
      118: "F7",
      119: "F8",
      120: "F9",
      121: "F10",
      122: "F11",
      123: "F12",
      144: "NumLock",
      145: "ScrollLock",
      224: "Meta"
    }, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
    function Pd(a) {
      var b = this.nativeEvent;
      return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
    }
    function zd() {
      return Pd;
    }
    var Qd = A({}, ud, { key: function(a) {
      if (a.key) {
        var b = Md[a.key] || a.key;
        if ("Unidentified" !== b) return b;
      }
      return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
    }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
      return "keypress" === a.type ? od(a) : 0;
    }, keyCode: function(a) {
      return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
    }, which: function(a) {
      return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
    } }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
      deltaX: function(a) {
        return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
      },
      deltaY: function(a) {
        return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
      },
      deltaZ: 0,
      deltaMode: 0
    }), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
    ia && "documentMode" in document && (be = document.documentMode);
    var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
    function ge(a, b) {
      switch (a) {
        case "keyup":
          return -1 !== $d.indexOf(b.keyCode);
        case "keydown":
          return 229 !== b.keyCode;
        case "keypress":
        case "mousedown":
        case "focusout":
          return true;
        default:
          return false;
      }
    }
    function he(a) {
      a = a.detail;
      return "object" === typeof a && "data" in a ? a.data : null;
    }
    var ie = false;
    function je(a, b) {
      switch (a) {
        case "compositionend":
          return he(b);
        case "keypress":
          if (32 !== b.which) return null;
          fe = true;
          return ee;
        case "textInput":
          return a = b.data, a === ee && fe ? null : a;
        default:
          return null;
      }
    }
    function ke(a, b) {
      if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
      switch (a) {
        case "paste":
          return null;
        case "keypress":
          if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
            if (b.char && 1 < b.char.length) return b.char;
            if (b.which) return String.fromCharCode(b.which);
          }
          return null;
        case "compositionend":
          return de && "ko" !== b.locale ? null : b.data;
        default:
          return null;
      }
    }
    var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
    function me(a) {
      var b = a && a.nodeName && a.nodeName.toLowerCase();
      return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
    }
    function ne(a, b, c, d) {
      Eb(d);
      b = oe(b, "onChange");
      0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
    }
    var pe = null, qe = null;
    function re(a) {
      se(a, 0);
    }
    function te(a) {
      var b = ue(a);
      if (Wa(b)) return a;
    }
    function ve(a, b) {
      if ("change" === a) return b;
    }
    var we = false;
    if (ia) {
      var xe;
      if (ia) {
        var ye = "oninput" in document;
        if (!ye) {
          var ze = document.createElement("div");
          ze.setAttribute("oninput", "return;");
          ye = "function" === typeof ze.oninput;
        }
        xe = ye;
      } else xe = false;
      we = xe && (!document.documentMode || 9 < document.documentMode);
    }
    function Ae() {
      pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
    }
    function Be(a) {
      if ("value" === a.propertyName && te(qe)) {
        var b = [];
        ne(b, qe, a, xb(a));
        Jb(re, b);
      }
    }
    function Ce(a, b, c) {
      "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
    }
    function De(a) {
      if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
    }
    function Ee(a, b) {
      if ("click" === a) return te(b);
    }
    function Fe(a, b) {
      if ("input" === a || "change" === a) return te(b);
    }
    function Ge(a, b) {
      return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
    }
    var He = "function" === typeof Object.is ? Object.is : Ge;
    function Ie(a, b) {
      if (He(a, b)) return true;
      if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
      var c = Object.keys(a), d = Object.keys(b);
      if (c.length !== d.length) return false;
      for (d = 0; d < c.length; d++) {
        var e = c[d];
        if (!ja.call(b, e) || !He(a[e], b[e])) return false;
      }
      return true;
    }
    function Je(a) {
      for (; a && a.firstChild; ) a = a.firstChild;
      return a;
    }
    function Ke(a, b) {
      var c = Je(a);
      a = 0;
      for (var d; c; ) {
        if (3 === c.nodeType) {
          d = a + c.textContent.length;
          if (a <= b && d >= b) return { node: c, offset: b - a };
          a = d;
        }
        a: {
          for (; c; ) {
            if (c.nextSibling) {
              c = c.nextSibling;
              break a;
            }
            c = c.parentNode;
          }
          c = void 0;
        }
        c = Je(c);
      }
    }
    function Le(a, b) {
      return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
    }
    function Me() {
      for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
        try {
          var c = "string" === typeof b.contentWindow.location.href;
        } catch (d) {
          c = false;
        }
        if (c) a = b.contentWindow;
        else break;
        b = Xa(a.document);
      }
      return b;
    }
    function Ne(a) {
      var b = a && a.nodeName && a.nodeName.toLowerCase();
      return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
    }
    function Oe(a) {
      var b = Me(), c = a.focusedElem, d = a.selectionRange;
      if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
        if (null !== d && Ne(c)) {
          if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
          else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
            a = a.getSelection();
            var e = c.textContent.length, f = Math.min(d.start, e);
            d = void 0 === d.end ? f : Math.min(d.end, e);
            !a.extend && f > d && (e = d, d = f, f = e);
            e = Ke(c, f);
            var g = Ke(
              c,
              d
            );
            e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
          }
        }
        b = [];
        for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
        "function" === typeof c.focus && c.focus();
        for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
      }
    }
    var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
    function Ue(a, b, c) {
      var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
      Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
    }
    function Ve(a, b) {
      var c = {};
      c[a.toLowerCase()] = b.toLowerCase();
      c["Webkit" + a] = "webkit" + b;
      c["Moz" + a] = "moz" + b;
      return c;
    }
    var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
    ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
    function Ze(a) {
      if (Xe[a]) return Xe[a];
      if (!We[a]) return a;
      var b = We[a], c;
      for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
      return a;
    }
    var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
    function ff(a, b) {
      df.set(a, b);
      fa(b, [a]);
    }
    for (var gf = 0; gf < ef.length; gf++) {
      var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
      ff(jf, "on" + kf);
    }
    ff($e, "onAnimationEnd");
    ff(af, "onAnimationIteration");
    ff(bf, "onAnimationStart");
    ff("dblclick", "onDoubleClick");
    ff("focusin", "onFocus");
    ff("focusout", "onBlur");
    ff(cf, "onTransitionEnd");
    ha("onMouseEnter", ["mouseout", "mouseover"]);
    ha("onMouseLeave", ["mouseout", "mouseover"]);
    ha("onPointerEnter", ["pointerout", "pointerover"]);
    ha("onPointerLeave", ["pointerout", "pointerover"]);
    fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
    fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
    fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
    fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
    fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
    fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
    var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
    function nf(a, b, c) {
      var d = a.type || "unknown-event";
      a.currentTarget = c;
      Ub(d, b, void 0, a);
      a.currentTarget = null;
    }
    function se(a, b) {
      b = 0 !== (b & 4);
      for (var c = 0; c < a.length; c++) {
        var d = a[c], e = d.event;
        d = d.listeners;
        a: {
          var f = void 0;
          if (b) for (var g = d.length - 1; 0 <= g; g--) {
            var h = d[g], k = h.instance, l = h.currentTarget;
            h = h.listener;
            if (k !== f && e.isPropagationStopped()) break a;
            nf(e, h, l);
            f = k;
          }
          else for (g = 0; g < d.length; g++) {
            h = d[g];
            k = h.instance;
            l = h.currentTarget;
            h = h.listener;
            if (k !== f && e.isPropagationStopped()) break a;
            nf(e, h, l);
            f = k;
          }
        }
      }
      if (Qb) throw a = Rb, Qb = false, Rb = null, a;
    }
    function D(a, b) {
      var c = b[of];
      void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
      var d = a + "__bubble";
      c.has(d) || (pf(b, a, 2, false), c.add(d));
    }
    function qf(a, b, c) {
      var d = 0;
      b && (d |= 4);
      pf(c, a, d, b);
    }
    var rf = "_reactListening" + Math.random().toString(36).slice(2);
    function sf(a) {
      if (!a[rf]) {
        a[rf] = true;
        da.forEach(function(b2) {
          "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
        });
        var b = 9 === a.nodeType ? a : a.ownerDocument;
        null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
      }
    }
    function pf(a, b, c, d) {
      switch (jd(b)) {
        case 1:
          var e = ed;
          break;
        case 4:
          e = gd;
          break;
        default:
          e = fd;
      }
      c = e.bind(null, b, c, a);
      e = void 0;
      !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
      d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
    }
    function hd(a, b, c, d, e) {
      var f = d;
      if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
        if (null === d) return;
        var g = d.tag;
        if (3 === g || 4 === g) {
          var h = d.stateNode.containerInfo;
          if (h === e || 8 === h.nodeType && h.parentNode === e) break;
          if (4 === g) for (g = d.return; null !== g; ) {
            var k = g.tag;
            if (3 === k || 4 === k) {
              if (k = g.stateNode.containerInfo, k === e || 8 === k.nodeType && k.parentNode === e) return;
            }
            g = g.return;
          }
          for (; null !== h; ) {
            g = Wc(h);
            if (null === g) return;
            k = g.tag;
            if (5 === k || 6 === k) {
              d = f = g;
              continue a;
            }
            h = h.parentNode;
          }
        }
        d = d.return;
      }
      Jb(function() {
        var d2 = f, e2 = xb(c), g2 = [];
        a: {
          var h2 = df.get(a);
          if (void 0 !== h2) {
            var k2 = td, n = a;
            switch (a) {
              case "keypress":
                if (0 === od(c)) break a;
              case "keydown":
              case "keyup":
                k2 = Rd;
                break;
              case "focusin":
                n = "focus";
                k2 = Fd;
                break;
              case "focusout":
                n = "blur";
                k2 = Fd;
                break;
              case "beforeblur":
              case "afterblur":
                k2 = Fd;
                break;
              case "click":
                if (2 === c.button) break a;
              case "auxclick":
              case "dblclick":
              case "mousedown":
              case "mousemove":
              case "mouseup":
              case "mouseout":
              case "mouseover":
              case "contextmenu":
                k2 = Bd;
                break;
              case "drag":
              case "dragend":
              case "dragenter":
              case "dragexit":
              case "dragleave":
              case "dragover":
              case "dragstart":
              case "drop":
                k2 = Dd;
                break;
              case "touchcancel":
              case "touchend":
              case "touchmove":
              case "touchstart":
                k2 = Vd;
                break;
              case $e:
              case af:
              case bf:
                k2 = Hd;
                break;
              case cf:
                k2 = Xd;
                break;
              case "scroll":
                k2 = vd;
                break;
              case "wheel":
                k2 = Zd;
                break;
              case "copy":
              case "cut":
              case "paste":
                k2 = Jd;
                break;
              case "gotpointercapture":
              case "lostpointercapture":
              case "pointercancel":
              case "pointerdown":
              case "pointermove":
              case "pointerout":
              case "pointerover":
              case "pointerup":
                k2 = Td;
            }
            var t = 0 !== (b & 4), J = !t && "scroll" === a, x = t ? null !== h2 ? h2 + "Capture" : null : h2;
            t = [];
            for (var w = d2, u; null !== w; ) {
              u = w;
              var F = u.stateNode;
              5 === u.tag && null !== F && (u = F, null !== x && (F = Kb(w, x), null != F && t.push(tf(w, F, u))));
              if (J) break;
              w = w.return;
            }
            0 < t.length && (h2 = new k2(h2, n, null, c, e2), g2.push({ event: h2, listeners: t }));
          }
        }
        if (0 === (b & 7)) {
          a: {
            h2 = "mouseover" === a || "pointerover" === a;
            k2 = "mouseout" === a || "pointerout" === a;
            if (h2 && c !== wb && (n = c.relatedTarget || c.fromElement) && (Wc(n) || n[uf])) break a;
            if (k2 || h2) {
              h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
              if (k2) {
                if (n = c.relatedTarget || c.toElement, k2 = d2, n = n ? Wc(n) : null, null !== n && (J = Vb(n), n !== J || 5 !== n.tag && 6 !== n.tag)) n = null;
              } else k2 = null, n = d2;
              if (k2 !== n) {
                t = Bd;
                F = "onMouseLeave";
                x = "onMouseEnter";
                w = "mouse";
                if ("pointerout" === a || "pointerover" === a) t = Td, F = "onPointerLeave", x = "onPointerEnter", w = "pointer";
                J = null == k2 ? h2 : ue(k2);
                u = null == n ? h2 : ue(n);
                h2 = new t(F, w + "leave", k2, c, e2);
                h2.target = J;
                h2.relatedTarget = u;
                F = null;
                Wc(e2) === d2 && (t = new t(x, w + "enter", n, c, e2), t.target = u, t.relatedTarget = J, F = t);
                J = F;
                if (k2 && n) b: {
                  t = k2;
                  x = n;
                  w = 0;
                  for (u = t; u; u = vf(u)) w++;
                  u = 0;
                  for (F = x; F; F = vf(F)) u++;
                  for (; 0 < w - u; ) t = vf(t), w--;
                  for (; 0 < u - w; ) x = vf(x), u--;
                  for (; w--; ) {
                    if (t === x || null !== x && t === x.alternate) break b;
                    t = vf(t);
                    x = vf(x);
                  }
                  t = null;
                }
                else t = null;
                null !== k2 && wf(g2, h2, k2, t, false);
                null !== n && null !== J && wf(g2, J, n, t, true);
              }
            }
          }
          a: {
            h2 = d2 ? ue(d2) : window;
            k2 = h2.nodeName && h2.nodeName.toLowerCase();
            if ("select" === k2 || "input" === k2 && "file" === h2.type) var na = ve;
            else if (me(h2)) if (we) na = Fe;
            else {
              na = De;
              var xa = Ce;
            }
            else (k2 = h2.nodeName) && "input" === k2.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
            if (na && (na = na(a, d2))) {
              ne(g2, na, c, e2);
              break a;
            }
            xa && xa(a, h2, d2);
            "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
          }
          xa = d2 ? ue(d2) : window;
          switch (a) {
            case "focusin":
              if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
              break;
            case "focusout":
              Se = Re = Qe = null;
              break;
            case "mousedown":
              Te = true;
              break;
            case "contextmenu":
            case "mouseup":
            case "dragend":
              Te = false;
              Ue(g2, c, e2);
              break;
            case "selectionchange":
              if (Pe) break;
            case "keydown":
            case "keyup":
              Ue(g2, c, e2);
          }
          var $a;
          if (ae) b: {
            switch (a) {
              case "compositionstart":
                var ba = "onCompositionStart";
                break b;
              case "compositionend":
                ba = "onCompositionEnd";
                break b;
              case "compositionupdate":
                ba = "onCompositionUpdate";
                break b;
            }
            ba = void 0;
          }
          else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
          ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
          if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
        }
        se(g2, b);
      });
    }
    function tf(a, b, c) {
      return { instance: a, listener: b, currentTarget: c };
    }
    function oe(a, b) {
      for (var c = b + "Capture", d = []; null !== a; ) {
        var e = a, f = e.stateNode;
        5 === e.tag && null !== f && (e = f, f = Kb(a, c), null != f && d.unshift(tf(a, f, e)), f = Kb(a, b), null != f && d.push(tf(a, f, e)));
        a = a.return;
      }
      return d;
    }
    function vf(a) {
      if (null === a) return null;
      do
        a = a.return;
      while (a && 5 !== a.tag);
      return a ? a : null;
    }
    function wf(a, b, c, d, e) {
      for (var f = b._reactName, g = []; null !== c && c !== d; ) {
        var h = c, k = h.alternate, l = h.stateNode;
        if (null !== k && k === d) break;
        5 === h.tag && null !== l && (h = l, e ? (k = Kb(c, f), null != k && g.unshift(tf(c, k, h))) : e || (k = Kb(c, f), null != k && g.push(tf(c, k, h))));
        c = c.return;
      }
      0 !== g.length && a.push({ event: b, listeners: g });
    }
    var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
    function zf(a) {
      return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
    }
    function Af(a, b, c) {
      b = zf(b);
      if (zf(a) !== b && c) throw Error(p(425));
    }
    function Bf() {
    }
    var Cf = null, Df = null;
    function Ef(a, b) {
      return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
    }
    var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
      return Hf.resolve(null).then(a).catch(If);
    } : Ff;
    function If(a) {
      setTimeout(function() {
        throw a;
      });
    }
    function Kf(a, b) {
      var c = b, d = 0;
      do {
        var e = c.nextSibling;
        a.removeChild(c);
        if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
          if (0 === d) {
            a.removeChild(e);
            bd(b);
            return;
          }
          d--;
        } else "$" !== c && "$?" !== c && "$!" !== c || d++;
        c = e;
      } while (c);
      bd(b);
    }
    function Lf(a) {
      for (; null != a; a = a.nextSibling) {
        var b = a.nodeType;
        if (1 === b || 3 === b) break;
        if (8 === b) {
          b = a.data;
          if ("$" === b || "$!" === b || "$?" === b) break;
          if ("/$" === b) return null;
        }
      }
      return a;
    }
    function Mf(a) {
      a = a.previousSibling;
      for (var b = 0; a; ) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("$" === c || "$!" === c || "$?" === c) {
            if (0 === b) return a;
            b--;
          } else "/$" === c && b++;
        }
        a = a.previousSibling;
      }
      return null;
    }
    var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
    function Wc(a) {
      var b = a[Of];
      if (b) return b;
      for (var c = a.parentNode; c; ) {
        if (b = c[uf] || c[Of]) {
          c = b.alternate;
          if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
            if (c = a[Of]) return c;
            a = Mf(a);
          }
          return b;
        }
        a = c;
        c = a.parentNode;
      }
      return null;
    }
    function Cb(a) {
      a = a[Of] || a[uf];
      return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
    }
    function ue(a) {
      if (5 === a.tag || 6 === a.tag) return a.stateNode;
      throw Error(p(33));
    }
    function Db(a) {
      return a[Pf] || null;
    }
    var Sf = [], Tf = -1;
    function Uf(a) {
      return { current: a };
    }
    function E(a) {
      0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
    }
    function G(a, b) {
      Tf++;
      Sf[Tf] = a.current;
      a.current = b;
    }
    var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
    function Yf(a, b) {
      var c = a.type.contextTypes;
      if (!c) return Vf;
      var d = a.stateNode;
      if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
      var e = {}, f;
      for (f in c) e[f] = b[f];
      d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
      return e;
    }
    function Zf(a) {
      a = a.childContextTypes;
      return null !== a && void 0 !== a;
    }
    function $f() {
      E(Wf);
      E(H);
    }
    function ag(a, b, c) {
      if (H.current !== Vf) throw Error(p(168));
      G(H, b);
      G(Wf, c);
    }
    function bg(a, b, c) {
      var d = a.stateNode;
      b = b.childContextTypes;
      if ("function" !== typeof d.getChildContext) return c;
      d = d.getChildContext();
      for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
      return A({}, c, d);
    }
    function cg(a) {
      a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
      Xf = H.current;
      G(H, a);
      G(Wf, Wf.current);
      return true;
    }
    function dg(a, b, c) {
      var d = a.stateNode;
      if (!d) throw Error(p(169));
      c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
      G(Wf, c);
    }
    var eg = null, fg = false, gg = false;
    function hg(a) {
      null === eg ? eg = [a] : eg.push(a);
    }
    function ig(a) {
      fg = true;
      hg(a);
    }
    function jg() {
      if (!gg && null !== eg) {
        gg = true;
        var a = 0, b = C;
        try {
          var c = eg;
          for (C = 1; a < c.length; a++) {
            var d = c[a];
            do
              d = d(true);
            while (null !== d);
          }
          eg = null;
          fg = false;
        } catch (e) {
          throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
        } finally {
          C = b, gg = false;
        }
      }
      return null;
    }
    var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
    function tg(a, b) {
      kg[lg++] = ng;
      kg[lg++] = mg;
      mg = a;
      ng = b;
    }
    function ug(a, b, c) {
      og[pg++] = rg;
      og[pg++] = sg;
      og[pg++] = qg;
      qg = a;
      var d = rg;
      a = sg;
      var e = 32 - oc(d) - 1;
      d &= ~(1 << e);
      c += 1;
      var f = 32 - oc(b) + e;
      if (30 < f) {
        var g = e - e % 5;
        f = (d & (1 << g) - 1).toString(32);
        d >>= g;
        e -= g;
        rg = 1 << 32 - oc(b) + e | c << e | d;
        sg = f + a;
      } else rg = 1 << f | c << e | d, sg = a;
    }
    function vg(a) {
      null !== a.return && (tg(a, 1), ug(a, 1, 0));
    }
    function wg(a) {
      for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
      for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
    }
    var xg = null, yg = null, I = false, zg = null;
    function Ag(a, b) {
      var c = Bg(5, null, null, 0);
      c.elementType = "DELETED";
      c.stateNode = b;
      c.return = a;
      b = a.deletions;
      null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
    }
    function Cg(a, b) {
      switch (a.tag) {
        case 5:
          var c = a.type;
          b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
          return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
        case 6:
          return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
        case 13:
          return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
        default:
          return false;
      }
    }
    function Dg(a) {
      return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
    }
    function Eg(a) {
      if (I) {
        var b = yg;
        if (b) {
          var c = b;
          if (!Cg(a, b)) {
            if (Dg(a)) throw Error(p(418));
            b = Lf(c.nextSibling);
            var d = xg;
            b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
          }
        } else {
          if (Dg(a)) throw Error(p(418));
          a.flags = a.flags & -4097 | 2;
          I = false;
          xg = a;
        }
      }
    }
    function Fg(a) {
      for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
      xg = a;
    }
    function Gg(a) {
      if (a !== xg) return false;
      if (!I) return Fg(a), I = true, false;
      var b;
      (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
      if (b && (b = yg)) {
        if (Dg(a)) throw Hg(), Error(p(418));
        for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
      }
      Fg(a);
      if (13 === a.tag) {
        a = a.memoizedState;
        a = null !== a ? a.dehydrated : null;
        if (!a) throw Error(p(317));
        a: {
          a = a.nextSibling;
          for (b = 0; a; ) {
            if (8 === a.nodeType) {
              var c = a.data;
              if ("/$" === c) {
                if (0 === b) {
                  yg = Lf(a.nextSibling);
                  break a;
                }
                b--;
              } else "$" !== c && "$!" !== c && "$?" !== c || b++;
            }
            a = a.nextSibling;
          }
          yg = null;
        }
      } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
      return true;
    }
    function Hg() {
      for (var a = yg; a; ) a = Lf(a.nextSibling);
    }
    function Ig() {
      yg = xg = null;
      I = false;
    }
    function Jg(a) {
      null === zg ? zg = [a] : zg.push(a);
    }
    var Kg = ua.ReactCurrentBatchConfig;
    function Lg(a, b, c) {
      a = c.ref;
      if (null !== a && "function" !== typeof a && "object" !== typeof a) {
        if (c._owner) {
          c = c._owner;
          if (c) {
            if (1 !== c.tag) throw Error(p(309));
            var d = c.stateNode;
          }
          if (!d) throw Error(p(147, a));
          var e = d, f = "" + a;
          if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f) return b.ref;
          b = function(a2) {
            var b2 = e.refs;
            null === a2 ? delete b2[f] : b2[f] = a2;
          };
          b._stringRef = f;
          return b;
        }
        if ("string" !== typeof a) throw Error(p(284));
        if (!c._owner) throw Error(p(290, a));
      }
      return a;
    }
    function Mg(a, b) {
      a = Object.prototype.toString.call(b);
      throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
    }
    function Ng(a) {
      var b = a._init;
      return b(a._payload);
    }
    function Og(a) {
      function b(b2, c2) {
        if (a) {
          var d2 = b2.deletions;
          null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
        }
      }
      function c(c2, d2) {
        if (!a) return null;
        for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
        return null;
      }
      function d(a2, b2) {
        for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
        return a2;
      }
      function e(a2, b2) {
        a2 = Pg(a2, b2);
        a2.index = 0;
        a2.sibling = null;
        return a2;
      }
      function f(b2, c2, d2) {
        b2.index = d2;
        if (!a) return b2.flags |= 1048576, c2;
        d2 = b2.alternate;
        if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
        b2.flags |= 2;
        return c2;
      }
      function g(b2) {
        a && null === b2.alternate && (b2.flags |= 2);
        return b2;
      }
      function h(a2, b2, c2, d2) {
        if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
        b2 = e(b2, c2);
        b2.return = a2;
        return b2;
      }
      function k(a2, b2, c2, d2) {
        var f2 = c2.type;
        if (f2 === ya) return m(a2, b2, c2.props.children, d2, c2.key);
        if (null !== b2 && (b2.elementType === f2 || "object" === typeof f2 && null !== f2 && f2.$$typeof === Ha && Ng(f2) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
        d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
        d2.ref = Lg(a2, b2, c2);
        d2.return = a2;
        return d2;
      }
      function l(a2, b2, c2, d2) {
        if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
        b2 = e(b2, c2.children || []);
        b2.return = a2;
        return b2;
      }
      function m(a2, b2, c2, d2, f2) {
        if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f2), b2.return = a2, b2;
        b2 = e(b2, c2);
        b2.return = a2;
        return b2;
      }
      function q(a2, b2, c2) {
        if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
        if ("object" === typeof b2 && null !== b2) {
          switch (b2.$$typeof) {
            case va:
              return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
            case wa:
              return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
            case Ha:
              var d2 = b2._init;
              return q(a2, d2(b2._payload), c2);
          }
          if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
          Mg(a2, b2);
        }
        return null;
      }
      function r(a2, b2, c2, d2) {
        var e2 = null !== b2 ? b2.key : null;
        if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
        if ("object" === typeof c2 && null !== c2) {
          switch (c2.$$typeof) {
            case va:
              return c2.key === e2 ? k(a2, b2, c2, d2) : null;
            case wa:
              return c2.key === e2 ? l(a2, b2, c2, d2) : null;
            case Ha:
              return e2 = c2._init, r(
                a2,
                b2,
                e2(c2._payload),
                d2
              );
          }
          if (eb(c2) || Ka(c2)) return null !== e2 ? null : m(a2, b2, c2, d2, null);
          Mg(a2, c2);
        }
        return null;
      }
      function y(a2, b2, c2, d2, e2) {
        if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
        if ("object" === typeof d2 && null !== d2) {
          switch (d2.$$typeof) {
            case va:
              return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k(b2, a2, d2, e2);
            case wa:
              return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l(b2, a2, d2, e2);
            case Ha:
              var f2 = d2._init;
              return y(a2, b2, c2, f2(d2._payload), e2);
          }
          if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m(b2, a2, d2, e2, null);
          Mg(b2, d2);
        }
        return null;
      }
      function n(e2, g2, h2, k2) {
        for (var l2 = null, m2 = null, u = g2, w = g2 = 0, x = null; null !== u && w < h2.length; w++) {
          u.index > w ? (x = u, u = null) : x = u.sibling;
          var n2 = r(e2, u, h2[w], k2);
          if (null === n2) {
            null === u && (u = x);
            break;
          }
          a && u && null === n2.alternate && b(e2, u);
          g2 = f(n2, g2, w);
          null === m2 ? l2 = n2 : m2.sibling = n2;
          m2 = n2;
          u = x;
        }
        if (w === h2.length) return c(e2, u), I && tg(e2, w), l2;
        if (null === u) {
          for (; w < h2.length; w++) u = q(e2, h2[w], k2), null !== u && (g2 = f(u, g2, w), null === m2 ? l2 = u : m2.sibling = u, m2 = u);
          I && tg(e2, w);
          return l2;
        }
        for (u = d(e2, u); w < h2.length; w++) x = y(u, e2, w, h2[w], k2), null !== x && (a && null !== x.alternate && u.delete(null === x.key ? w : x.key), g2 = f(x, g2, w), null === m2 ? l2 = x : m2.sibling = x, m2 = x);
        a && u.forEach(function(a2) {
          return b(e2, a2);
        });
        I && tg(e2, w);
        return l2;
      }
      function t(e2, g2, h2, k2) {
        var l2 = Ka(h2);
        if ("function" !== typeof l2) throw Error(p(150));
        h2 = l2.call(h2);
        if (null == h2) throw Error(p(151));
        for (var u = l2 = null, m2 = g2, w = g2 = 0, x = null, n2 = h2.next(); null !== m2 && !n2.done; w++, n2 = h2.next()) {
          m2.index > w ? (x = m2, m2 = null) : x = m2.sibling;
          var t2 = r(e2, m2, n2.value, k2);
          if (null === t2) {
            null === m2 && (m2 = x);
            break;
          }
          a && m2 && null === t2.alternate && b(e2, m2);
          g2 = f(t2, g2, w);
          null === u ? l2 = t2 : u.sibling = t2;
          u = t2;
          m2 = x;
        }
        if (n2.done) return c(
          e2,
          m2
        ), I && tg(e2, w), l2;
        if (null === m2) {
          for (; !n2.done; w++, n2 = h2.next()) n2 = q(e2, n2.value, k2), null !== n2 && (g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
          I && tg(e2, w);
          return l2;
        }
        for (m2 = d(e2, m2); !n2.done; w++, n2 = h2.next()) n2 = y(m2, e2, w, n2.value, k2), null !== n2 && (a && null !== n2.alternate && m2.delete(null === n2.key ? w : n2.key), g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
        a && m2.forEach(function(a2) {
          return b(e2, a2);
        });
        I && tg(e2, w);
        return l2;
      }
      function J(a2, d2, f2, h2) {
        "object" === typeof f2 && null !== f2 && f2.type === ya && null === f2.key && (f2 = f2.props.children);
        if ("object" === typeof f2 && null !== f2) {
          switch (f2.$$typeof) {
            case va:
              a: {
                for (var k2 = f2.key, l2 = d2; null !== l2; ) {
                  if (l2.key === k2) {
                    k2 = f2.type;
                    if (k2 === ya) {
                      if (7 === l2.tag) {
                        c(a2, l2.sibling);
                        d2 = e(l2, f2.props.children);
                        d2.return = a2;
                        a2 = d2;
                        break a;
                      }
                    } else if (l2.elementType === k2 || "object" === typeof k2 && null !== k2 && k2.$$typeof === Ha && Ng(k2) === l2.type) {
                      c(a2, l2.sibling);
                      d2 = e(l2, f2.props);
                      d2.ref = Lg(a2, l2, f2);
                      d2.return = a2;
                      a2 = d2;
                      break a;
                    }
                    c(a2, l2);
                    break;
                  } else b(a2, l2);
                  l2 = l2.sibling;
                }
                f2.type === ya ? (d2 = Tg(f2.props.children, a2.mode, h2, f2.key), d2.return = a2, a2 = d2) : (h2 = Rg(f2.type, f2.key, f2.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f2), h2.return = a2, a2 = h2);
              }
              return g(a2);
            case wa:
              a: {
                for (l2 = f2.key; null !== d2; ) {
                  if (d2.key === l2) if (4 === d2.tag && d2.stateNode.containerInfo === f2.containerInfo && d2.stateNode.implementation === f2.implementation) {
                    c(a2, d2.sibling);
                    d2 = e(d2, f2.children || []);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  } else {
                    c(a2, d2);
                    break;
                  }
                  else b(a2, d2);
                  d2 = d2.sibling;
                }
                d2 = Sg(f2, a2.mode, h2);
                d2.return = a2;
                a2 = d2;
              }
              return g(a2);
            case Ha:
              return l2 = f2._init, J(a2, d2, l2(f2._payload), h2);
          }
          if (eb(f2)) return n(a2, d2, f2, h2);
          if (Ka(f2)) return t(a2, d2, f2, h2);
          Mg(a2, f2);
        }
        return "string" === typeof f2 && "" !== f2 || "number" === typeof f2 ? (f2 = "" + f2, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f2), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f2, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
      }
      return J;
    }
    var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
    function $g() {
      Zg = Yg = Xg = null;
    }
    function ah(a) {
      var b = Wg.current;
      E(Wg);
      a._currentValue = b;
    }
    function bh(a, b, c) {
      for (; null !== a; ) {
        var d = a.alternate;
        (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
        if (a === c) break;
        a = a.return;
      }
    }
    function ch(a, b) {
      Xg = a;
      Zg = Yg = null;
      a = a.dependencies;
      null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
    }
    function eh(a) {
      var b = a._currentValue;
      if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
        if (null === Xg) throw Error(p(308));
        Yg = a;
        Xg.dependencies = { lanes: 0, firstContext: a };
      } else Yg = Yg.next = a;
      return b;
    }
    var fh = null;
    function gh(a) {
      null === fh ? fh = [a] : fh.push(a);
    }
    function hh(a, b, c, d) {
      var e = b.interleaved;
      null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
      b.interleaved = c;
      return ih(a, d);
    }
    function ih(a, b) {
      a.lanes |= b;
      var c = a.alternate;
      null !== c && (c.lanes |= b);
      c = a;
      for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
      return 3 === c.tag ? c.stateNode : null;
    }
    var jh = false;
    function kh(a) {
      a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
    }
    function lh(a, b) {
      a = a.updateQueue;
      b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
    }
    function mh(a, b) {
      return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
    }
    function nh(a, b, c) {
      var d = a.updateQueue;
      if (null === d) return null;
      d = d.shared;
      if (0 !== (K & 2)) {
        var e = d.pending;
        null === e ? b.next = b : (b.next = e.next, e.next = b);
        d.pending = b;
        return ih(a, c);
      }
      e = d.interleaved;
      null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
      d.interleaved = b;
      return ih(a, c);
    }
    function oh(a, b, c) {
      b = b.updateQueue;
      if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
        var d = b.lanes;
        d &= a.pendingLanes;
        c |= d;
        b.lanes = c;
        Cc(a, c);
      }
    }
    function ph(a, b) {
      var c = a.updateQueue, d = a.alternate;
      if (null !== d && (d = d.updateQueue, c === d)) {
        var e = null, f = null;
        c = c.firstBaseUpdate;
        if (null !== c) {
          do {
            var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
            null === f ? e = f = g : f = f.next = g;
            c = c.next;
          } while (null !== c);
          null === f ? e = f = b : f = f.next = b;
        } else e = f = b;
        c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f, shared: d.shared, effects: d.effects };
        a.updateQueue = c;
        return;
      }
      a = c.lastBaseUpdate;
      null === a ? c.firstBaseUpdate = b : a.next = b;
      c.lastBaseUpdate = b;
    }
    function qh(a, b, c, d) {
      var e = a.updateQueue;
      jh = false;
      var f = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
      if (null !== h) {
        e.shared.pending = null;
        var k = h, l = k.next;
        k.next = null;
        null === g ? f = l : g.next = l;
        g = k;
        var m = a.alternate;
        null !== m && (m = m.updateQueue, h = m.lastBaseUpdate, h !== g && (null === h ? m.firstBaseUpdate = l : h.next = l, m.lastBaseUpdate = k));
      }
      if (null !== f) {
        var q = e.baseState;
        g = 0;
        m = l = k = null;
        h = f;
        do {
          var r = h.lane, y = h.eventTime;
          if ((d & r) === r) {
            null !== m && (m = m.next = {
              eventTime: y,
              lane: 0,
              tag: h.tag,
              payload: h.payload,
              callback: h.callback,
              next: null
            });
            a: {
              var n = a, t = h;
              r = b;
              y = c;
              switch (t.tag) {
                case 1:
                  n = t.payload;
                  if ("function" === typeof n) {
                    q = n.call(y, q, r);
                    break a;
                  }
                  q = n;
                  break a;
                case 3:
                  n.flags = n.flags & -65537 | 128;
                case 0:
                  n = t.payload;
                  r = "function" === typeof n ? n.call(y, q, r) : n;
                  if (null === r || void 0 === r) break a;
                  q = A({}, q, r);
                  break a;
                case 2:
                  jh = true;
              }
            }
            null !== h.callback && 0 !== h.lane && (a.flags |= 64, r = e.effects, null === r ? e.effects = [h] : r.push(h));
          } else y = { eventTime: y, lane: r, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m ? (l = m = y, k = q) : m = m.next = y, g |= r;
          h = h.next;
          if (null === h) if (h = e.shared.pending, null === h) break;
          else r = h, h = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
        } while (1);
        null === m && (k = q);
        e.baseState = k;
        e.firstBaseUpdate = l;
        e.lastBaseUpdate = m;
        b = e.shared.interleaved;
        if (null !== b) {
          e = b;
          do
            g |= e.lane, e = e.next;
          while (e !== b);
        } else null === f && (e.shared.lanes = 0);
        rh |= g;
        a.lanes = g;
        a.memoizedState = q;
      }
    }
    function sh(a, b, c) {
      a = b.effects;
      b.effects = null;
      if (null !== a) for (b = 0; b < a.length; b++) {
        var d = a[b], e = d.callback;
        if (null !== e) {
          d.callback = null;
          d = c;
          if ("function" !== typeof e) throw Error(p(191, e));
          e.call(d);
        }
      }
    }
    var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
    function xh(a) {
      if (a === th) throw Error(p(174));
      return a;
    }
    function yh(a, b) {
      G(wh, b);
      G(vh, a);
      G(uh, th);
      a = b.nodeType;
      switch (a) {
        case 9:
        case 11:
          b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
          break;
        default:
          a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
      }
      E(uh);
      G(uh, b);
    }
    function zh() {
      E(uh);
      E(vh);
      E(wh);
    }
    function Ah(a) {
      xh(wh.current);
      var b = xh(uh.current);
      var c = lb(b, a.type);
      b !== c && (G(vh, a), G(uh, c));
    }
    function Bh(a) {
      vh.current === a && (E(uh), E(vh));
    }
    var L = Uf(0);
    function Ch(a) {
      for (var b = a; null !== b; ) {
        if (13 === b.tag) {
          var c = b.memoizedState;
          if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
        } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
          if (0 !== (b.flags & 128)) return b;
        } else if (null !== b.child) {
          b.child.return = b;
          b = b.child;
          continue;
        }
        if (b === a) break;
        for (; null === b.sibling; ) {
          if (null === b.return || b.return === a) return null;
          b = b.return;
        }
        b.sibling.return = b.return;
        b = b.sibling;
      }
      return null;
    }
    var Dh = [];
    function Eh() {
      for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
      Dh.length = 0;
    }
    var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
    function P() {
      throw Error(p(321));
    }
    function Mh(a, b) {
      if (null === b) return false;
      for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
      return true;
    }
    function Nh(a, b, c, d, e, f) {
      Hh = f;
      M = b;
      b.memoizedState = null;
      b.updateQueue = null;
      b.lanes = 0;
      Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
      a = c(d, e);
      if (Jh) {
        f = 0;
        do {
          Jh = false;
          Kh = 0;
          if (25 <= f) throw Error(p(301));
          f += 1;
          O = N = null;
          b.updateQueue = null;
          Fh.current = Qh;
          a = c(d, e);
        } while (Jh);
      }
      Fh.current = Rh;
      b = null !== N && null !== N.next;
      Hh = 0;
      O = N = M = null;
      Ih = false;
      if (b) throw Error(p(300));
      return a;
    }
    function Sh() {
      var a = 0 !== Kh;
      Kh = 0;
      return a;
    }
    function Th() {
      var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
      null === O ? M.memoizedState = O = a : O = O.next = a;
      return O;
    }
    function Uh() {
      if (null === N) {
        var a = M.alternate;
        a = null !== a ? a.memoizedState : null;
      } else a = N.next;
      var b = null === O ? M.memoizedState : O.next;
      if (null !== b) O = b, N = a;
      else {
        if (null === a) throw Error(p(310));
        N = a;
        a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
        null === O ? M.memoizedState = O = a : O = O.next = a;
      }
      return O;
    }
    function Vh(a, b) {
      return "function" === typeof b ? b(a) : b;
    }
    function Wh(a) {
      var b = Uh(), c = b.queue;
      if (null === c) throw Error(p(311));
      c.lastRenderedReducer = a;
      var d = N, e = d.baseQueue, f = c.pending;
      if (null !== f) {
        if (null !== e) {
          var g = e.next;
          e.next = f.next;
          f.next = g;
        }
        d.baseQueue = e = f;
        c.pending = null;
      }
      if (null !== e) {
        f = e.next;
        d = d.baseState;
        var h = g = null, k = null, l = f;
        do {
          var m = l.lane;
          if ((Hh & m) === m) null !== k && (k = k.next = { lane: 0, action: l.action, hasEagerState: l.hasEagerState, eagerState: l.eagerState, next: null }), d = l.hasEagerState ? l.eagerState : a(d, l.action);
          else {
            var q = {
              lane: m,
              action: l.action,
              hasEagerState: l.hasEagerState,
              eagerState: l.eagerState,
              next: null
            };
            null === k ? (h = k = q, g = d) : k = k.next = q;
            M.lanes |= m;
            rh |= m;
          }
          l = l.next;
        } while (null !== l && l !== f);
        null === k ? g = d : k.next = h;
        He(d, b.memoizedState) || (dh = true);
        b.memoizedState = d;
        b.baseState = g;
        b.baseQueue = k;
        c.lastRenderedState = d;
      }
      a = c.interleaved;
      if (null !== a) {
        e = a;
        do
          f = e.lane, M.lanes |= f, rh |= f, e = e.next;
        while (e !== a);
      } else null === e && (c.lanes = 0);
      return [b.memoizedState, c.dispatch];
    }
    function Xh(a) {
      var b = Uh(), c = b.queue;
      if (null === c) throw Error(p(311));
      c.lastRenderedReducer = a;
      var d = c.dispatch, e = c.pending, f = b.memoizedState;
      if (null !== e) {
        c.pending = null;
        var g = e = e.next;
        do
          f = a(f, g.action), g = g.next;
        while (g !== e);
        He(f, b.memoizedState) || (dh = true);
        b.memoizedState = f;
        null === b.baseQueue && (b.baseState = f);
        c.lastRenderedState = f;
      }
      return [f, d];
    }
    function Yh() {
    }
    function Zh(a, b) {
      var c = M, d = Uh(), e = b(), f = !He(d.memoizedState, e);
      f && (d.memoizedState = e, dh = true);
      d = d.queue;
      $h(ai.bind(null, c, d, a), [a]);
      if (d.getSnapshot !== b || f || null !== O && O.memoizedState.tag & 1) {
        c.flags |= 2048;
        bi(9, ci.bind(null, c, d, e, b), void 0, null);
        if (null === Q) throw Error(p(349));
        0 !== (Hh & 30) || di(c, b, e);
      }
      return e;
    }
    function di(a, b, c) {
      a.flags |= 16384;
      a = { getSnapshot: b, value: c };
      b = M.updateQueue;
      null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
    }
    function ci(a, b, c, d) {
      b.value = c;
      b.getSnapshot = d;
      ei(b) && fi(a);
    }
    function ai(a, b, c) {
      return c(function() {
        ei(b) && fi(a);
      });
    }
    function ei(a) {
      var b = a.getSnapshot;
      a = a.value;
      try {
        var c = b();
        return !He(a, c);
      } catch (d) {
        return true;
      }
    }
    function fi(a) {
      var b = ih(a, 1);
      null !== b && gi(b, a, 1, -1);
    }
    function hi(a) {
      var b = Th();
      "function" === typeof a && (a = a());
      b.memoizedState = b.baseState = a;
      a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
      b.queue = a;
      a = a.dispatch = ii.bind(null, M, a);
      return [b.memoizedState, a];
    }
    function bi(a, b, c, d) {
      a = { tag: a, create: b, destroy: c, deps: d, next: null };
      b = M.updateQueue;
      null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
      return a;
    }
    function ji() {
      return Uh().memoizedState;
    }
    function ki(a, b, c, d) {
      var e = Th();
      M.flags |= a;
      e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
    }
    function li(a, b, c, d) {
      var e = Uh();
      d = void 0 === d ? null : d;
      var f = void 0;
      if (null !== N) {
        var g = N.memoizedState;
        f = g.destroy;
        if (null !== d && Mh(d, g.deps)) {
          e.memoizedState = bi(b, c, f, d);
          return;
        }
      }
      M.flags |= a;
      e.memoizedState = bi(1 | b, c, f, d);
    }
    function mi(a, b) {
      return ki(8390656, 8, a, b);
    }
    function $h(a, b) {
      return li(2048, 8, a, b);
    }
    function ni(a, b) {
      return li(4, 2, a, b);
    }
    function oi(a, b) {
      return li(4, 4, a, b);
    }
    function pi(a, b) {
      if ("function" === typeof b) return a = a(), b(a), function() {
        b(null);
      };
      if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
        b.current = null;
      };
    }
    function qi(a, b, c) {
      c = null !== c && void 0 !== c ? c.concat([a]) : null;
      return li(4, 4, pi.bind(null, b, a), c);
    }
    function ri() {
    }
    function si(a, b) {
      var c = Uh();
      b = void 0 === b ? null : b;
      var d = c.memoizedState;
      if (null !== d && null !== b && Mh(b, d[1])) return d[0];
      c.memoizedState = [a, b];
      return a;
    }
    function ti(a, b) {
      var c = Uh();
      b = void 0 === b ? null : b;
      var d = c.memoizedState;
      if (null !== d && null !== b && Mh(b, d[1])) return d[0];
      a = a();
      c.memoizedState = [a, b];
      return a;
    }
    function ui(a, b, c) {
      if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
      He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
      return b;
    }
    function vi(a, b) {
      var c = C;
      C = 0 !== c && 4 > c ? c : 4;
      a(true);
      var d = Gh.transition;
      Gh.transition = {};
      try {
        a(false), b();
      } finally {
        C = c, Gh.transition = d;
      }
    }
    function wi() {
      return Uh().memoizedState;
    }
    function xi(a, b, c) {
      var d = yi(a);
      c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
      if (zi(a)) Ai(b, c);
      else if (c = hh(a, b, c, d), null !== c) {
        var e = R();
        gi(c, a, d, e);
        Bi(c, b, d);
      }
    }
    function ii(a, b, c) {
      var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
      if (zi(a)) Ai(b, e);
      else {
        var f = a.alternate;
        if (0 === a.lanes && (null === f || 0 === f.lanes) && (f = b.lastRenderedReducer, null !== f)) try {
          var g = b.lastRenderedState, h = f(g, c);
          e.hasEagerState = true;
          e.eagerState = h;
          if (He(h, g)) {
            var k = b.interleaved;
            null === k ? (e.next = e, gh(b)) : (e.next = k.next, k.next = e);
            b.interleaved = e;
            return;
          }
        } catch (l) {
        } finally {
        }
        c = hh(a, b, e, d);
        null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
      }
    }
    function zi(a) {
      var b = a.alternate;
      return a === M || null !== b && b === M;
    }
    function Ai(a, b) {
      Jh = Ih = true;
      var c = a.pending;
      null === c ? b.next = b : (b.next = c.next, c.next = b);
      a.pending = b;
    }
    function Bi(a, b, c) {
      if (0 !== (c & 4194240)) {
        var d = b.lanes;
        d &= a.pendingLanes;
        c |= d;
        b.lanes = c;
        Cc(a, c);
      }
    }
    var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
      Th().memoizedState = [a, void 0 === b ? null : b];
      return a;
    }, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
      c = null !== c && void 0 !== c ? c.concat([a]) : null;
      return ki(
        4194308,
        4,
        pi.bind(null, b, a),
        c
      );
    }, useLayoutEffect: function(a, b) {
      return ki(4194308, 4, a, b);
    }, useInsertionEffect: function(a, b) {
      return ki(4, 2, a, b);
    }, useMemo: function(a, b) {
      var c = Th();
      b = void 0 === b ? null : b;
      a = a();
      c.memoizedState = [a, b];
      return a;
    }, useReducer: function(a, b, c) {
      var d = Th();
      b = void 0 !== c ? c(b) : b;
      d.memoizedState = d.baseState = b;
      a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
      d.queue = a;
      a = a.dispatch = xi.bind(null, M, a);
      return [d.memoizedState, a];
    }, useRef: function(a) {
      var b = Th();
      a = { current: a };
      return b.memoizedState = a;
    }, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
      return Th().memoizedState = a;
    }, useTransition: function() {
      var a = hi(false), b = a[0];
      a = vi.bind(null, a[1]);
      Th().memoizedState = a;
      return [b, a];
    }, useMutableSource: function() {
    }, useSyncExternalStore: function(a, b, c) {
      var d = M, e = Th();
      if (I) {
        if (void 0 === c) throw Error(p(407));
        c = c();
      } else {
        c = b();
        if (null === Q) throw Error(p(349));
        0 !== (Hh & 30) || di(d, b, c);
      }
      e.memoizedState = c;
      var f = { value: c, getSnapshot: b };
      e.queue = f;
      mi(ai.bind(
        null,
        d,
        f,
        a
      ), [a]);
      d.flags |= 2048;
      bi(9, ci.bind(null, d, f, c, b), void 0, null);
      return c;
    }, useId: function() {
      var a = Th(), b = Q.identifierPrefix;
      if (I) {
        var c = sg;
        var d = rg;
        c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
        b = ":" + b + "R" + c;
        c = Kh++;
        0 < c && (b += "H" + c.toString(32));
        b += ":";
      } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
      return a.memoizedState = b;
    }, unstable_isNewReconciler: false }, Ph = {
      readContext: eh,
      useCallback: si,
      useContext: eh,
      useEffect: $h,
      useImperativeHandle: qi,
      useInsertionEffect: ni,
      useLayoutEffect: oi,
      useMemo: ti,
      useReducer: Wh,
      useRef: ji,
      useState: function() {
        return Wh(Vh);
      },
      useDebugValue: ri,
      useDeferredValue: function(a) {
        var b = Uh();
        return ui(b, N.memoizedState, a);
      },
      useTransition: function() {
        var a = Wh(Vh)[0], b = Uh().memoizedState;
        return [a, b];
      },
      useMutableSource: Yh,
      useSyncExternalStore: Zh,
      useId: wi,
      unstable_isNewReconciler: false
    }, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
      return Xh(Vh);
    }, useDebugValue: ri, useDeferredValue: function(a) {
      var b = Uh();
      return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
    }, useTransition: function() {
      var a = Xh(Vh)[0], b = Uh().memoizedState;
      return [a, b];
    }, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
    function Ci(a, b) {
      if (a && a.defaultProps) {
        b = A({}, b);
        a = a.defaultProps;
        for (var c in a) void 0 === b[c] && (b[c] = a[c]);
        return b;
      }
      return b;
    }
    function Di(a, b, c, d) {
      b = a.memoizedState;
      c = c(d, b);
      c = null === c || void 0 === c ? b : A({}, b, c);
      a.memoizedState = c;
      0 === a.lanes && (a.updateQueue.baseState = c);
    }
    var Ei = { isMounted: function(a) {
      return (a = a._reactInternals) ? Vb(a) === a : false;
    }, enqueueSetState: function(a, b, c) {
      a = a._reactInternals;
      var d = R(), e = yi(a), f = mh(d, e);
      f.payload = b;
      void 0 !== c && null !== c && (f.callback = c);
      b = nh(a, f, e);
      null !== b && (gi(b, a, e, d), oh(b, a, e));
    }, enqueueReplaceState: function(a, b, c) {
      a = a._reactInternals;
      var d = R(), e = yi(a), f = mh(d, e);
      f.tag = 1;
      f.payload = b;
      void 0 !== c && null !== c && (f.callback = c);
      b = nh(a, f, e);
      null !== b && (gi(b, a, e, d), oh(b, a, e));
    }, enqueueForceUpdate: function(a, b) {
      a = a._reactInternals;
      var c = R(), d = yi(a), e = mh(c, d);
      e.tag = 2;
      void 0 !== b && null !== b && (e.callback = b);
      b = nh(a, e, d);
      null !== b && (gi(b, a, d, c), oh(b, a, d));
    } };
    function Fi(a, b, c, d, e, f, g) {
      a = a.stateNode;
      return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f) : true;
    }
    function Gi(a, b, c) {
      var d = false, e = Vf;
      var f = b.contextType;
      "object" === typeof f && null !== f ? f = eh(f) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
      b = new b(c, f);
      a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
      b.updater = Ei;
      a.stateNode = b;
      b._reactInternals = a;
      d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
      return b;
    }
    function Hi(a, b, c, d) {
      a = b.state;
      "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
      "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
      b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
    }
    function Ii(a, b, c, d) {
      var e = a.stateNode;
      e.props = c;
      e.state = a.memoizedState;
      e.refs = {};
      kh(a);
      var f = b.contextType;
      "object" === typeof f && null !== f ? e.context = eh(f) : (f = Zf(b) ? Xf : H.current, e.context = Yf(a, f));
      e.state = a.memoizedState;
      f = b.getDerivedStateFromProps;
      "function" === typeof f && (Di(a, b, f, c), e.state = a.memoizedState);
      "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
      "function" === typeof e.componentDidMount && (a.flags |= 4194308);
    }
    function Ji(a, b) {
      try {
        var c = "", d = b;
        do
          c += Pa(d), d = d.return;
        while (d);
        var e = c;
      } catch (f) {
        e = "\nError generating stack: " + f.message + "\n" + f.stack;
      }
      return { value: a, source: b, stack: e, digest: null };
    }
    function Ki(a, b, c) {
      return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
    }
    function Li(a, b) {
      try {
        console.error(b.value);
      } catch (c) {
        setTimeout(function() {
          throw c;
        });
      }
    }
    var Mi = "function" === typeof WeakMap ? WeakMap : Map;
    function Ni(a, b, c) {
      c = mh(-1, c);
      c.tag = 3;
      c.payload = { element: null };
      var d = b.value;
      c.callback = function() {
        Oi || (Oi = true, Pi = d);
        Li(a, b);
      };
      return c;
    }
    function Qi(a, b, c) {
      c = mh(-1, c);
      c.tag = 3;
      var d = a.type.getDerivedStateFromError;
      if ("function" === typeof d) {
        var e = b.value;
        c.payload = function() {
          return d(e);
        };
        c.callback = function() {
          Li(a, b);
        };
      }
      var f = a.stateNode;
      null !== f && "function" === typeof f.componentDidCatch && (c.callback = function() {
        Li(a, b);
        "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
        var c2 = b.stack;
        this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
      });
      return c;
    }
    function Si(a, b, c) {
      var d = a.pingCache;
      if (null === d) {
        d = a.pingCache = new Mi();
        var e = /* @__PURE__ */ new Set();
        d.set(b, e);
      } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
      e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
    }
    function Ui(a) {
      do {
        var b;
        if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
        if (b) return a;
        a = a.return;
      } while (null !== a);
      return null;
    }
    function Vi(a, b, c, d, e) {
      if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
      a.flags |= 65536;
      a.lanes = e;
      return a;
    }
    var Wi = ua.ReactCurrentOwner, dh = false;
    function Xi(a, b, c, d) {
      b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
    }
    function Yi(a, b, c, d, e) {
      c = c.render;
      var f = b.ref;
      ch(b, e);
      d = Nh(a, b, c, d, f, e);
      c = Sh();
      if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
      I && c && vg(b);
      b.flags |= 1;
      Xi(a, b, d, e);
      return b.child;
    }
    function $i(a, b, c, d, e) {
      if (null === a) {
        var f = c.type;
        if ("function" === typeof f && !aj(f) && void 0 === f.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f, bj(a, b, f, d, e);
        a = Rg(c.type, null, d, b, b.mode, e);
        a.ref = b.ref;
        a.return = b;
        return b.child = a;
      }
      f = a.child;
      if (0 === (a.lanes & e)) {
        var g = f.memoizedProps;
        c = c.compare;
        c = null !== c ? c : Ie;
        if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
      }
      b.flags |= 1;
      a = Pg(f, d);
      a.ref = b.ref;
      a.return = b;
      return b.child = a;
    }
    function bj(a, b, c, d, e) {
      if (null !== a) {
        var f = a.memoizedProps;
        if (Ie(f, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
        else return b.lanes = a.lanes, Zi(a, b, e);
      }
      return cj(a, b, c, d, e);
    }
    function dj(a, b, c) {
      var d = b.pendingProps, e = d.children, f = null !== a ? a.memoizedState : null;
      if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
      else {
        if (0 === (c & 1073741824)) return a = null !== f ? f.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
        b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
        d = null !== f ? f.baseLanes : c;
        G(ej, fj);
        fj |= d;
      }
      else null !== f ? (d = f.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
      Xi(a, b, e, c);
      return b.child;
    }
    function gj(a, b) {
      var c = b.ref;
      if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
    }
    function cj(a, b, c, d, e) {
      var f = Zf(c) ? Xf : H.current;
      f = Yf(b, f);
      ch(b, e);
      c = Nh(a, b, c, d, f, e);
      d = Sh();
      if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
      I && d && vg(b);
      b.flags |= 1;
      Xi(a, b, c, e);
      return b.child;
    }
    function hj(a, b, c, d, e) {
      if (Zf(c)) {
        var f = true;
        cg(b);
      } else f = false;
      ch(b, e);
      if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
      else if (null === a) {
        var g = b.stateNode, h = b.memoizedProps;
        g.props = h;
        var k = g.context, l = c.contextType;
        "object" === typeof l && null !== l ? l = eh(l) : (l = Zf(c) ? Xf : H.current, l = Yf(b, l));
        var m = c.getDerivedStateFromProps, q = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
        q || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Hi(b, g, d, l);
        jh = false;
        var r = b.memoizedState;
        g.state = r;
        qh(b, d, g, e);
        k = b.memoizedState;
        h !== d || r !== k || Wf.current || jh ? ("function" === typeof m && (Di(b, c, m, d), k = b.memoizedState), (h = jh || Fi(b, c, h, d, r, k, l)) ? (q || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
      } else {
        g = b.stateNode;
        lh(a, b);
        h = b.memoizedProps;
        l = b.type === b.elementType ? h : Ci(b.type, h);
        g.props = l;
        q = b.pendingProps;
        r = g.context;
        k = c.contextType;
        "object" === typeof k && null !== k ? k = eh(k) : (k = Zf(c) ? Xf : H.current, k = Yf(b, k));
        var y = c.getDerivedStateFromProps;
        (m = "function" === typeof y || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q || r !== k) && Hi(b, g, d, k);
        jh = false;
        r = b.memoizedState;
        g.state = r;
        qh(b, d, g, e);
        var n = b.memoizedState;
        h !== q || r !== n || Wf.current || jh ? ("function" === typeof y && (Di(b, c, y, d), n = b.memoizedState), (l = jh || Fi(b, c, l, d, r, n, k) || false) ? (m || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n, k), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n, k)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n), g.props = d, g.state = n, g.context = k, d = l) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), d = false);
      }
      return jj(a, b, c, d, f, e);
    }
    function jj(a, b, c, d, e, f) {
      gj(a, b);
      var g = 0 !== (b.flags & 128);
      if (!d && !g) return e && dg(b, c, false), Zi(a, b, f);
      d = b.stateNode;
      Wi.current = b;
      var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
      b.flags |= 1;
      null !== a && g ? (b.child = Ug(b, a.child, null, f), b.child = Ug(b, null, h, f)) : Xi(a, b, h, f);
      b.memoizedState = d.state;
      e && dg(b, c, true);
      return b.child;
    }
    function kj(a) {
      var b = a.stateNode;
      b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
      yh(a, b.containerInfo);
    }
    function lj(a, b, c, d, e) {
      Ig();
      Jg(e);
      b.flags |= 256;
      Xi(a, b, c, d);
      return b.child;
    }
    var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
    function nj(a) {
      return { baseLanes: a, cachePool: null, transitions: null };
    }
    function oj(a, b, c) {
      var d = b.pendingProps, e = L.current, f = false, g = 0 !== (b.flags & 128), h;
      (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
      if (h) f = true, b.flags &= -129;
      else if (null === a || null !== a.memoizedState) e |= 1;
      G(L, e & 1);
      if (null === a) {
        Eg(b);
        a = b.memoizedState;
        if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
        g = d.children;
        a = d.fallback;
        return f ? (d = b.mode, f = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f ? (f.childLanes = 0, f.pendingProps = g) : f = pj(g, d, 0, null), a = Tg(a, d, c, null), f.return = b, a.return = b, f.sibling = a, b.child = f, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
      }
      e = a.memoizedState;
      if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
      if (f) {
        f = d.fallback;
        g = b.mode;
        e = a.child;
        h = e.sibling;
        var k = { mode: "hidden", children: d.children };
        0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k, b.deletions = null) : (d = Pg(e, k), d.subtreeFlags = e.subtreeFlags & 14680064);
        null !== h ? f = Pg(h, f) : (f = Tg(f, g, c, null), f.flags |= 2);
        f.return = b;
        d.return = b;
        d.sibling = f;
        b.child = d;
        d = f;
        f = b.child;
        g = a.child.memoizedState;
        g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
        f.memoizedState = g;
        f.childLanes = a.childLanes & ~c;
        b.memoizedState = mj;
        return d;
      }
      f = a.child;
      a = f.sibling;
      d = Pg(f, { mode: "visible", children: d.children });
      0 === (b.mode & 1) && (d.lanes = c);
      d.return = b;
      d.sibling = null;
      null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
      b.child = d;
      b.memoizedState = null;
      return d;
    }
    function qj(a, b) {
      b = pj({ mode: "visible", children: b }, a.mode, 0, null);
      b.return = a;
      return a.child = b;
    }
    function sj(a, b, c, d) {
      null !== d && Jg(d);
      Ug(b, a.child, null, c);
      a = qj(b, b.pendingProps.children);
      a.flags |= 2;
      b.memoizedState = null;
      return a;
    }
    function rj(a, b, c, d, e, f, g) {
      if (c) {
        if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
        if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
        f = d.fallback;
        e = b.mode;
        d = pj({ mode: "visible", children: d.children }, e, 0, null);
        f = Tg(f, e, g, null);
        f.flags |= 2;
        d.return = b;
        f.return = b;
        d.sibling = f;
        b.child = d;
        0 !== (b.mode & 1) && Ug(b, a.child, null, g);
        b.child.memoizedState = nj(g);
        b.memoizedState = mj;
        return f;
      }
      if (0 === (b.mode & 1)) return sj(a, b, g, null);
      if ("$!" === e.data) {
        d = e.nextSibling && e.nextSibling.dataset;
        if (d) var h = d.dgst;
        d = h;
        f = Error(p(419));
        d = Ki(f, d, void 0);
        return sj(a, b, g, d);
      }
      h = 0 !== (g & a.childLanes);
      if (dh || h) {
        d = Q;
        if (null !== d) {
          switch (g & -g) {
            case 4:
              e = 2;
              break;
            case 16:
              e = 8;
              break;
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
              e = 32;
              break;
            case 536870912:
              e = 268435456;
              break;
            default:
              e = 0;
          }
          e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
          0 !== e && e !== f.retryLane && (f.retryLane = e, ih(a, e), gi(d, a, e, -1));
        }
        tj();
        d = Ki(Error(p(421)));
        return sj(a, b, g, d);
      }
      if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
      a = f.treeContext;
      yg = Lf(e.nextSibling);
      xg = b;
      I = true;
      zg = null;
      null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
      b = qj(b, d.children);
      b.flags |= 4096;
      return b;
    }
    function vj(a, b, c) {
      a.lanes |= b;
      var d = a.alternate;
      null !== d && (d.lanes |= b);
      bh(a.return, b, c);
    }
    function wj(a, b, c, d, e) {
      var f = a.memoizedState;
      null === f ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f.isBackwards = b, f.rendering = null, f.renderingStartTime = 0, f.last = d, f.tail = c, f.tailMode = e);
    }
    function xj(a, b, c) {
      var d = b.pendingProps, e = d.revealOrder, f = d.tail;
      Xi(a, b, d.children, c);
      d = L.current;
      if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
      else {
        if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
          if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
          else if (19 === a.tag) vj(a, c, b);
          else if (null !== a.child) {
            a.child.return = a;
            a = a.child;
            continue;
          }
          if (a === b) break a;
          for (; null === a.sibling; ) {
            if (null === a.return || a.return === b) break a;
            a = a.return;
          }
          a.sibling.return = a.return;
          a = a.sibling;
        }
        d &= 1;
      }
      G(L, d);
      if (0 === (b.mode & 1)) b.memoizedState = null;
      else switch (e) {
        case "forwards":
          c = b.child;
          for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
          c = e;
          null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
          wj(b, false, e, c, f);
          break;
        case "backwards":
          c = null;
          e = b.child;
          for (b.child = null; null !== e; ) {
            a = e.alternate;
            if (null !== a && null === Ch(a)) {
              b.child = e;
              break;
            }
            a = e.sibling;
            e.sibling = c;
            c = e;
            e = a;
          }
          wj(b, true, c, null, f);
          break;
        case "together":
          wj(b, false, null, null, void 0);
          break;
        default:
          b.memoizedState = null;
      }
      return b.child;
    }
    function ij(a, b) {
      0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
    }
    function Zi(a, b, c) {
      null !== a && (b.dependencies = a.dependencies);
      rh |= b.lanes;
      if (0 === (c & b.childLanes)) return null;
      if (null !== a && b.child !== a.child) throw Error(p(153));
      if (null !== b.child) {
        a = b.child;
        c = Pg(a, a.pendingProps);
        b.child = c;
        for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
        c.sibling = null;
      }
      return b.child;
    }
    function yj(a, b, c) {
      switch (b.tag) {
        case 3:
          kj(b);
          Ig();
          break;
        case 5:
          Ah(b);
          break;
        case 1:
          Zf(b.type) && cg(b);
          break;
        case 4:
          yh(b, b.stateNode.containerInfo);
          break;
        case 10:
          var d = b.type._context, e = b.memoizedProps.value;
          G(Wg, d._currentValue);
          d._currentValue = e;
          break;
        case 13:
          d = b.memoizedState;
          if (null !== d) {
            if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
            if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
            G(L, L.current & 1);
            a = Zi(a, b, c);
            return null !== a ? a.sibling : null;
          }
          G(L, L.current & 1);
          break;
        case 19:
          d = 0 !== (c & b.childLanes);
          if (0 !== (a.flags & 128)) {
            if (d) return xj(a, b, c);
            b.flags |= 128;
          }
          e = b.memoizedState;
          null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
          G(L, L.current);
          if (d) break;
          else return null;
        case 22:
        case 23:
          return b.lanes = 0, dj(a, b, c);
      }
      return Zi(a, b, c);
    }
    var zj, Aj, Bj, Cj;
    zj = function(a, b) {
      for (var c = b.child; null !== c; ) {
        if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
        else if (4 !== c.tag && null !== c.child) {
          c.child.return = c;
          c = c.child;
          continue;
        }
        if (c === b) break;
        for (; null === c.sibling; ) {
          if (null === c.return || c.return === b) return;
          c = c.return;
        }
        c.sibling.return = c.return;
        c = c.sibling;
      }
    };
    Aj = function() {
    };
    Bj = function(a, b, c, d) {
      var e = a.memoizedProps;
      if (e !== d) {
        a = b.stateNode;
        xh(uh.current);
        var f = null;
        switch (c) {
          case "input":
            e = Ya(a, e);
            d = Ya(a, d);
            f = [];
            break;
          case "select":
            e = A({}, e, { value: void 0 });
            d = A({}, d, { value: void 0 });
            f = [];
            break;
          case "textarea":
            e = gb(a, e);
            d = gb(a, d);
            f = [];
            break;
          default:
            "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
        }
        ub(c, d);
        var g;
        c = null;
        for (l in e) if (!d.hasOwnProperty(l) && e.hasOwnProperty(l) && null != e[l]) if ("style" === l) {
          var h = e[l];
          for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
        } else "dangerouslySetInnerHTML" !== l && "children" !== l && "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && "autoFocus" !== l && (ea.hasOwnProperty(l) ? f || (f = []) : (f = f || []).push(l, null));
        for (l in d) {
          var k = d[l];
          h = null != e ? e[l] : void 0;
          if (d.hasOwnProperty(l) && k !== h && (null != k || null != h)) if ("style" === l) if (h) {
            for (g in h) !h.hasOwnProperty(g) || k && k.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
            for (g in k) k.hasOwnProperty(g) && h[g] !== k[g] && (c || (c = {}), c[g] = k[g]);
          } else c || (f || (f = []), f.push(
            l,
            c
          )), c = k;
          else "dangerouslySetInnerHTML" === l ? (k = k ? k.__html : void 0, h = h ? h.__html : void 0, null != k && h !== k && (f = f || []).push(l, k)) : "children" === l ? "string" !== typeof k && "number" !== typeof k || (f = f || []).push(l, "" + k) : "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && (ea.hasOwnProperty(l) ? (null != k && "onScroll" === l && D("scroll", a), f || h === k || (f = [])) : (f = f || []).push(l, k));
        }
        c && (f = f || []).push("style", c);
        var l = f;
        if (b.updateQueue = l) b.flags |= 4;
      }
    };
    Cj = function(a, b, c, d) {
      c !== d && (b.flags |= 4);
    };
    function Dj(a, b) {
      if (!I) switch (a.tailMode) {
        case "hidden":
          b = a.tail;
          for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
          null === c ? a.tail = null : c.sibling = null;
          break;
        case "collapsed":
          c = a.tail;
          for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
          null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
      }
    }
    function S(a) {
      var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
      if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
      else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
      a.subtreeFlags |= d;
      a.childLanes = c;
      return b;
    }
    function Ej(a, b, c) {
      var d = b.pendingProps;
      wg(b);
      switch (b.tag) {
        case 2:
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
          return S(b), null;
        case 1:
          return Zf(b.type) && $f(), S(b), null;
        case 3:
          d = b.stateNode;
          zh();
          E(Wf);
          E(H);
          Eh();
          d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
          if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
          Aj(a, b);
          S(b);
          return null;
        case 5:
          Bh(b);
          var e = xh(wh.current);
          c = b.type;
          if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
          else {
            if (!d) {
              if (null === b.stateNode) throw Error(p(166));
              S(b);
              return null;
            }
            a = xh(uh.current);
            if (Gg(b)) {
              d = b.stateNode;
              c = b.type;
              var f = b.memoizedProps;
              d[Of] = b;
              d[Pf] = f;
              a = 0 !== (b.mode & 1);
              switch (c) {
                case "dialog":
                  D("cancel", d);
                  D("close", d);
                  break;
                case "iframe":
                case "object":
                case "embed":
                  D("load", d);
                  break;
                case "video":
                case "audio":
                  for (e = 0; e < lf.length; e++) D(lf[e], d);
                  break;
                case "source":
                  D("error", d);
                  break;
                case "img":
                case "image":
                case "link":
                  D(
                    "error",
                    d
                  );
                  D("load", d);
                  break;
                case "details":
                  D("toggle", d);
                  break;
                case "input":
                  Za(d, f);
                  D("invalid", d);
                  break;
                case "select":
                  d._wrapperState = { wasMultiple: !!f.multiple };
                  D("invalid", d);
                  break;
                case "textarea":
                  hb(d, f), D("invalid", d);
              }
              ub(c, f);
              e = null;
              for (var g in f) if (f.hasOwnProperty(g)) {
                var h = f[g];
                "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f.suppressHydrationWarning && Af(
                  d.textContent,
                  h,
                  a
                ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
              }
              switch (c) {
                case "input":
                  Va(d);
                  db(d, f, true);
                  break;
                case "textarea":
                  Va(d);
                  jb(d);
                  break;
                case "select":
                case "option":
                  break;
                default:
                  "function" === typeof f.onClick && (d.onclick = Bf);
              }
              d = e;
              b.updateQueue = d;
              null !== d && (b.flags |= 4);
            } else {
              g = 9 === e.nodeType ? e : e.ownerDocument;
              "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
              "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
              a[Of] = b;
              a[Pf] = d;
              zj(a, b, false, false);
              b.stateNode = a;
              a: {
                g = vb(c, d);
                switch (c) {
                  case "dialog":
                    D("cancel", a);
                    D("close", a);
                    e = d;
                    break;
                  case "iframe":
                  case "object":
                  case "embed":
                    D("load", a);
                    e = d;
                    break;
                  case "video":
                  case "audio":
                    for (e = 0; e < lf.length; e++) D(lf[e], a);
                    e = d;
                    break;
                  case "source":
                    D("error", a);
                    e = d;
                    break;
                  case "img":
                  case "image":
                  case "link":
                    D(
                      "error",
                      a
                    );
                    D("load", a);
                    e = d;
                    break;
                  case "details":
                    D("toggle", a);
                    e = d;
                    break;
                  case "input":
                    Za(a, d);
                    e = Ya(a, d);
                    D("invalid", a);
                    break;
                  case "option":
                    e = d;
                    break;
                  case "select":
                    a._wrapperState = { wasMultiple: !!d.multiple };
                    e = A({}, d, { value: void 0 });
                    D("invalid", a);
                    break;
                  case "textarea":
                    hb(a, d);
                    e = gb(a, d);
                    D("invalid", a);
                    break;
                  default:
                    e = d;
                }
                ub(c, e);
                h = e;
                for (f in h) if (h.hasOwnProperty(f)) {
                  var k = h[f];
                  "style" === f ? sb(a, k) : "dangerouslySetInnerHTML" === f ? (k = k ? k.__html : void 0, null != k && nb(a, k)) : "children" === f ? "string" === typeof k ? ("textarea" !== c || "" !== k) && ob(a, k) : "number" === typeof k && ob(a, "" + k) : "suppressContentEditableWarning" !== f && "suppressHydrationWarning" !== f && "autoFocus" !== f && (ea.hasOwnProperty(f) ? null != k && "onScroll" === f && D("scroll", a) : null != k && ta(a, f, k, g));
                }
                switch (c) {
                  case "input":
                    Va(a);
                    db(a, d, false);
                    break;
                  case "textarea":
                    Va(a);
                    jb(a);
                    break;
                  case "option":
                    null != d.value && a.setAttribute("value", "" + Sa(d.value));
                    break;
                  case "select":
                    a.multiple = !!d.multiple;
                    f = d.value;
                    null != f ? fb(a, !!d.multiple, f, false) : null != d.defaultValue && fb(
                      a,
                      !!d.multiple,
                      d.defaultValue,
                      true
                    );
                    break;
                  default:
                    "function" === typeof e.onClick && (a.onclick = Bf);
                }
                switch (c) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    d = !!d.autoFocus;
                    break a;
                  case "img":
                    d = true;
                    break a;
                  default:
                    d = false;
                }
              }
              d && (b.flags |= 4);
            }
            null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
          }
          S(b);
          return null;
        case 6:
          if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
          else {
            if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
            c = xh(wh.current);
            xh(uh.current);
            if (Gg(b)) {
              d = b.stateNode;
              c = b.memoizedProps;
              d[Of] = b;
              if (f = d.nodeValue !== c) {
                if (a = xg, null !== a) switch (a.tag) {
                  case 3:
                    Af(d.nodeValue, c, 0 !== (a.mode & 1));
                    break;
                  case 5:
                    true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
                }
              }
              f && (b.flags |= 4);
            } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
          }
          S(b);
          return null;
        case 13:
          E(L);
          d = b.memoizedState;
          if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
            if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f = false;
            else if (f = Gg(b), null !== d && null !== d.dehydrated) {
              if (null === a) {
                if (!f) throw Error(p(318));
                f = b.memoizedState;
                f = null !== f ? f.dehydrated : null;
                if (!f) throw Error(p(317));
                f[Of] = b;
              } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
              S(b);
              f = false;
            } else null !== zg && (Fj(zg), zg = null), f = true;
            if (!f) return b.flags & 65536 ? b : null;
          }
          if (0 !== (b.flags & 128)) return b.lanes = c, b;
          d = null !== d;
          d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
          null !== b.updateQueue && (b.flags |= 4);
          S(b);
          return null;
        case 4:
          return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
        case 10:
          return ah(b.type._context), S(b), null;
        case 17:
          return Zf(b.type) && $f(), S(b), null;
        case 19:
          E(L);
          f = b.memoizedState;
          if (null === f) return S(b), null;
          d = 0 !== (b.flags & 128);
          g = f.rendering;
          if (null === g) if (d) Dj(f, false);
          else {
            if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
              g = Ch(a);
              if (null !== g) {
                b.flags |= 128;
                Dj(f, false);
                d = g.updateQueue;
                null !== d && (b.updateQueue = d, b.flags |= 4);
                b.subtreeFlags = 0;
                d = c;
                for (c = b.child; null !== c; ) f = c, a = d, f.flags &= 14680066, g = f.alternate, null === g ? (f.childLanes = 0, f.lanes = a, f.child = null, f.subtreeFlags = 0, f.memoizedProps = null, f.memoizedState = null, f.updateQueue = null, f.dependencies = null, f.stateNode = null) : (f.childLanes = g.childLanes, f.lanes = g.lanes, f.child = g.child, f.subtreeFlags = 0, f.deletions = null, f.memoizedProps = g.memoizedProps, f.memoizedState = g.memoizedState, f.updateQueue = g.updateQueue, f.type = g.type, a = g.dependencies, f.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
                G(L, L.current & 1 | 2);
                return b.child;
              }
              a = a.sibling;
            }
            null !== f.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
          }
          else {
            if (!d) if (a = Ch(g), null !== a) {
              if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f, true), null === f.tail && "hidden" === f.tailMode && !g.alternate && !I) return S(b), null;
            } else 2 * B() - f.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
            f.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f.last, null !== c ? c.sibling = g : b.child = g, f.last = g);
          }
          if (null !== f.tail) return b = f.tail, f.rendering = b, f.tail = b.sibling, f.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
          S(b);
          return null;
        case 22:
        case 23:
          return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
        case 24:
          return null;
        case 25:
          return null;
      }
      throw Error(p(156, b.tag));
    }
    function Ij(a, b) {
      wg(b);
      switch (b.tag) {
        case 1:
          return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
        case 3:
          return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
        case 5:
          return Bh(b), null;
        case 13:
          E(L);
          a = b.memoizedState;
          if (null !== a && null !== a.dehydrated) {
            if (null === b.alternate) throw Error(p(340));
            Ig();
          }
          a = b.flags;
          return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
        case 19:
          return E(L), null;
        case 4:
          return zh(), null;
        case 10:
          return ah(b.type._context), null;
        case 22:
        case 23:
          return Hj(), null;
        case 24:
          return null;
        default:
          return null;
      }
    }
    var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
    function Lj(a, b) {
      var c = a.ref;
      if (null !== c) if ("function" === typeof c) try {
        c(null);
      } catch (d) {
        W(a, b, d);
      }
      else c.current = null;
    }
    function Mj(a, b, c) {
      try {
        c();
      } catch (d) {
        W(a, b, d);
      }
    }
    var Nj = false;
    function Oj(a, b) {
      Cf = dd;
      a = Me();
      if (Ne(a)) {
        if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
        else a: {
          c = (c = a.ownerDocument) && c.defaultView || window;
          var d = c.getSelection && c.getSelection();
          if (d && 0 !== d.rangeCount) {
            c = d.anchorNode;
            var e = d.anchorOffset, f = d.focusNode;
            d = d.focusOffset;
            try {
              c.nodeType, f.nodeType;
            } catch (F) {
              c = null;
              break a;
            }
            var g = 0, h = -1, k = -1, l = 0, m = 0, q = a, r = null;
            b: for (; ; ) {
              for (var y; ; ) {
                q !== c || 0 !== e && 3 !== q.nodeType || (h = g + e);
                q !== f || 0 !== d && 3 !== q.nodeType || (k = g + d);
                3 === q.nodeType && (g += q.nodeValue.length);
                if (null === (y = q.firstChild)) break;
                r = q;
                q = y;
              }
              for (; ; ) {
                if (q === a) break b;
                r === c && ++l === e && (h = g);
                r === f && ++m === d && (k = g);
                if (null !== (y = q.nextSibling)) break;
                q = r;
                r = q.parentNode;
              }
              q = y;
            }
            c = -1 === h || -1 === k ? null : { start: h, end: k };
          } else c = null;
        }
        c = c || { start: 0, end: 0 };
      } else c = null;
      Df = { focusedElem: a, selectionRange: c };
      dd = false;
      for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
      else for (; null !== V; ) {
        b = V;
        try {
          var n = b.alternate;
          if (0 !== (b.flags & 1024)) switch (b.tag) {
            case 0:
            case 11:
            case 15:
              break;
            case 1:
              if (null !== n) {
                var t = n.memoizedProps, J = n.memoizedState, x = b.stateNode, w = x.getSnapshotBeforeUpdate(b.elementType === b.type ? t : Ci(b.type, t), J);
                x.__reactInternalSnapshotBeforeUpdate = w;
              }
              break;
            case 3:
              var u = b.stateNode.containerInfo;
              1 === u.nodeType ? u.textContent = "" : 9 === u.nodeType && u.documentElement && u.removeChild(u.documentElement);
              break;
            case 5:
            case 6:
            case 4:
            case 17:
              break;
            default:
              throw Error(p(163));
          }
        } catch (F) {
          W(b, b.return, F);
        }
        a = b.sibling;
        if (null !== a) {
          a.return = b.return;
          V = a;
          break;
        }
        V = b.return;
      }
      n = Nj;
      Nj = false;
      return n;
    }
    function Pj(a, b, c) {
      var d = b.updateQueue;
      d = null !== d ? d.lastEffect : null;
      if (null !== d) {
        var e = d = d.next;
        do {
          if ((e.tag & a) === a) {
            var f = e.destroy;
            e.destroy = void 0;
            void 0 !== f && Mj(b, c, f);
          }
          e = e.next;
        } while (e !== d);
      }
    }
    function Qj(a, b) {
      b = b.updateQueue;
      b = null !== b ? b.lastEffect : null;
      if (null !== b) {
        var c = b = b.next;
        do {
          if ((c.tag & a) === a) {
            var d = c.create;
            c.destroy = d();
          }
          c = c.next;
        } while (c !== b);
      }
    }
    function Rj(a) {
      var b = a.ref;
      if (null !== b) {
        var c = a.stateNode;
        switch (a.tag) {
          case 5:
            a = c;
            break;
          default:
            a = c;
        }
        "function" === typeof b ? b(a) : b.current = a;
      }
    }
    function Sj(a) {
      var b = a.alternate;
      null !== b && (a.alternate = null, Sj(b));
      a.child = null;
      a.deletions = null;
      a.sibling = null;
      5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
      a.stateNode = null;
      a.return = null;
      a.dependencies = null;
      a.memoizedProps = null;
      a.memoizedState = null;
      a.pendingProps = null;
      a.stateNode = null;
      a.updateQueue = null;
    }
    function Tj(a) {
      return 5 === a.tag || 3 === a.tag || 4 === a.tag;
    }
    function Uj(a) {
      a: for (; ; ) {
        for (; null === a.sibling; ) {
          if (null === a.return || Tj(a.return)) return null;
          a = a.return;
        }
        a.sibling.return = a.return;
        for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
          if (a.flags & 2) continue a;
          if (null === a.child || 4 === a.tag) continue a;
          else a.child.return = a, a = a.child;
        }
        if (!(a.flags & 2)) return a.stateNode;
      }
    }
    function Vj(a, b, c) {
      var d = a.tag;
      if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
      else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
    }
    function Wj(a, b, c) {
      var d = a.tag;
      if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
      else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
    }
    var X2 = null, Xj = false;
    function Yj(a, b, c) {
      for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
    }
    function Zj(a, b, c) {
      if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
        lc.onCommitFiberUnmount(kc, c);
      } catch (h) {
      }
      switch (c.tag) {
        case 5:
          U || Lj(c, b);
        case 6:
          var d = X2, e = Xj;
          X2 = null;
          Yj(a, b, c);
          X2 = d;
          Xj = e;
          null !== X2 && (Xj ? (a = X2, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X2.removeChild(c.stateNode));
          break;
        case 18:
          null !== X2 && (Xj ? (a = X2, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X2, c.stateNode));
          break;
        case 4:
          d = X2;
          e = Xj;
          X2 = c.stateNode.containerInfo;
          Xj = true;
          Yj(a, b, c);
          X2 = d;
          Xj = e;
          break;
        case 0:
        case 11:
        case 14:
        case 15:
          if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
            e = d = d.next;
            do {
              var f = e, g = f.destroy;
              f = f.tag;
              void 0 !== g && (0 !== (f & 2) ? Mj(c, b, g) : 0 !== (f & 4) && Mj(c, b, g));
              e = e.next;
            } while (e !== d);
          }
          Yj(a, b, c);
          break;
        case 1:
          if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
            d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
          } catch (h) {
            W(c, b, h);
          }
          Yj(a, b, c);
          break;
        case 21:
          Yj(a, b, c);
          break;
        case 22:
          c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
          break;
        default:
          Yj(a, b, c);
      }
    }
    function ak(a) {
      var b = a.updateQueue;
      if (null !== b) {
        a.updateQueue = null;
        var c = a.stateNode;
        null === c && (c = a.stateNode = new Kj());
        b.forEach(function(b2) {
          var d = bk.bind(null, a, b2);
          c.has(b2) || (c.add(b2), b2.then(d, d));
        });
      }
    }
    function ck(a, b) {
      var c = b.deletions;
      if (null !== c) for (var d = 0; d < c.length; d++) {
        var e = c[d];
        try {
          var f = a, g = b, h = g;
          a: for (; null !== h; ) {
            switch (h.tag) {
              case 5:
                X2 = h.stateNode;
                Xj = false;
                break a;
              case 3:
                X2 = h.stateNode.containerInfo;
                Xj = true;
                break a;
              case 4:
                X2 = h.stateNode.containerInfo;
                Xj = true;
                break a;
            }
            h = h.return;
          }
          if (null === X2) throw Error(p(160));
          Zj(f, g, e);
          X2 = null;
          Xj = false;
          var k = e.alternate;
          null !== k && (k.return = null);
          e.return = null;
        } catch (l) {
          W(e, b, l);
        }
      }
      if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
    }
    function dk(a, b) {
      var c = a.alternate, d = a.flags;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          ck(b, a);
          ek(a);
          if (d & 4) {
            try {
              Pj(3, a, a.return), Qj(3, a);
            } catch (t) {
              W(a, a.return, t);
            }
            try {
              Pj(5, a, a.return);
            } catch (t) {
              W(a, a.return, t);
            }
          }
          break;
        case 1:
          ck(b, a);
          ek(a);
          d & 512 && null !== c && Lj(c, c.return);
          break;
        case 5:
          ck(b, a);
          ek(a);
          d & 512 && null !== c && Lj(c, c.return);
          if (a.flags & 32) {
            var e = a.stateNode;
            try {
              ob(e, "");
            } catch (t) {
              W(a, a.return, t);
            }
          }
          if (d & 4 && (e = a.stateNode, null != e)) {
            var f = a.memoizedProps, g = null !== c ? c.memoizedProps : f, h = a.type, k = a.updateQueue;
            a.updateQueue = null;
            if (null !== k) try {
              "input" === h && "radio" === f.type && null != f.name && ab(e, f);
              vb(h, g);
              var l = vb(h, f);
              for (g = 0; g < k.length; g += 2) {
                var m = k[g], q = k[g + 1];
                "style" === m ? sb(e, q) : "dangerouslySetInnerHTML" === m ? nb(e, q) : "children" === m ? ob(e, q) : ta(e, m, q, l);
              }
              switch (h) {
                case "input":
                  bb(e, f);
                  break;
                case "textarea":
                  ib(e, f);
                  break;
                case "select":
                  var r = e._wrapperState.wasMultiple;
                  e._wrapperState.wasMultiple = !!f.multiple;
                  var y = f.value;
                  null != y ? fb(e, !!f.multiple, y, false) : r !== !!f.multiple && (null != f.defaultValue ? fb(
                    e,
                    !!f.multiple,
                    f.defaultValue,
                    true
                  ) : fb(e, !!f.multiple, f.multiple ? [] : "", false));
              }
              e[Pf] = f;
            } catch (t) {
              W(a, a.return, t);
            }
          }
          break;
        case 6:
          ck(b, a);
          ek(a);
          if (d & 4) {
            if (null === a.stateNode) throw Error(p(162));
            e = a.stateNode;
            f = a.memoizedProps;
            try {
              e.nodeValue = f;
            } catch (t) {
              W(a, a.return, t);
            }
          }
          break;
        case 3:
          ck(b, a);
          ek(a);
          if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
            bd(b.containerInfo);
          } catch (t) {
            W(a, a.return, t);
          }
          break;
        case 4:
          ck(b, a);
          ek(a);
          break;
        case 13:
          ck(b, a);
          ek(a);
          e = a.child;
          e.flags & 8192 && (f = null !== e.memoizedState, e.stateNode.isHidden = f, !f || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
          d & 4 && ak(a);
          break;
        case 22:
          m = null !== c && null !== c.memoizedState;
          a.mode & 1 ? (U = (l = U) || m, ck(b, a), U = l) : ck(b, a);
          ek(a);
          if (d & 8192) {
            l = null !== a.memoizedState;
            if ((a.stateNode.isHidden = l) && !m && 0 !== (a.mode & 1)) for (V = a, m = a.child; null !== m; ) {
              for (q = V = m; null !== V; ) {
                r = V;
                y = r.child;
                switch (r.tag) {
                  case 0:
                  case 11:
                  case 14:
                  case 15:
                    Pj(4, r, r.return);
                    break;
                  case 1:
                    Lj(r, r.return);
                    var n = r.stateNode;
                    if ("function" === typeof n.componentWillUnmount) {
                      d = r;
                      c = r.return;
                      try {
                        b = d, n.props = b.memoizedProps, n.state = b.memoizedState, n.componentWillUnmount();
                      } catch (t) {
                        W(d, c, t);
                      }
                    }
                    break;
                  case 5:
                    Lj(r, r.return);
                    break;
                  case 22:
                    if (null !== r.memoizedState) {
                      gk(q);
                      continue;
                    }
                }
                null !== y ? (y.return = r, V = y) : gk(q);
              }
              m = m.sibling;
            }
            a: for (m = null, q = a; ; ) {
              if (5 === q.tag) {
                if (null === m) {
                  m = q;
                  try {
                    e = q.stateNode, l ? (f = e.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (h = q.stateNode, k = q.memoizedProps.style, g = void 0 !== k && null !== k && k.hasOwnProperty("display") ? k.display : null, h.style.display = rb("display", g));
                  } catch (t) {
                    W(a, a.return, t);
                  }
                }
              } else if (6 === q.tag) {
                if (null === m) try {
                  q.stateNode.nodeValue = l ? "" : q.memoizedProps;
                } catch (t) {
                  W(a, a.return, t);
                }
              } else if ((22 !== q.tag && 23 !== q.tag || null === q.memoizedState || q === a) && null !== q.child) {
                q.child.return = q;
                q = q.child;
                continue;
              }
              if (q === a) break a;
              for (; null === q.sibling; ) {
                if (null === q.return || q.return === a) break a;
                m === q && (m = null);
                q = q.return;
              }
              m === q && (m = null);
              q.sibling.return = q.return;
              q = q.sibling;
            }
          }
          break;
        case 19:
          ck(b, a);
          ek(a);
          d & 4 && ak(a);
          break;
        case 21:
          break;
        default:
          ck(
            b,
            a
          ), ek(a);
      }
    }
    function ek(a) {
      var b = a.flags;
      if (b & 2) {
        try {
          a: {
            for (var c = a.return; null !== c; ) {
              if (Tj(c)) {
                var d = c;
                break a;
              }
              c = c.return;
            }
            throw Error(p(160));
          }
          switch (d.tag) {
            case 5:
              var e = d.stateNode;
              d.flags & 32 && (ob(e, ""), d.flags &= -33);
              var f = Uj(a);
              Wj(a, f, e);
              break;
            case 3:
            case 4:
              var g = d.stateNode.containerInfo, h = Uj(a);
              Vj(a, h, g);
              break;
            default:
              throw Error(p(161));
          }
        } catch (k) {
          W(a, a.return, k);
        }
        a.flags &= -3;
      }
      b & 4096 && (a.flags &= -4097);
    }
    function hk(a, b, c) {
      V = a;
      ik(a);
    }
    function ik(a, b, c) {
      for (var d = 0 !== (a.mode & 1); null !== V; ) {
        var e = V, f = e.child;
        if (22 === e.tag && d) {
          var g = null !== e.memoizedState || Jj;
          if (!g) {
            var h = e.alternate, k = null !== h && null !== h.memoizedState || U;
            h = Jj;
            var l = U;
            Jj = g;
            if ((U = k) && !l) for (V = e; null !== V; ) g = V, k = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k ? (k.return = g, V = k) : jk(e);
            for (; null !== f; ) V = f, ik(f), f = f.sibling;
            V = e;
            Jj = h;
            U = l;
          }
          kk(a);
        } else 0 !== (e.subtreeFlags & 8772) && null !== f ? (f.return = e, V = f) : kk(a);
      }
    }
    function kk(a) {
      for (; null !== V; ) {
        var b = V;
        if (0 !== (b.flags & 8772)) {
          var c = b.alternate;
          try {
            if (0 !== (b.flags & 8772)) switch (b.tag) {
              case 0:
              case 11:
              case 15:
                U || Qj(5, b);
                break;
              case 1:
                var d = b.stateNode;
                if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
                else {
                  var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
                  d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
                }
                var f = b.updateQueue;
                null !== f && sh(b, f, d);
                break;
              case 3:
                var g = b.updateQueue;
                if (null !== g) {
                  c = null;
                  if (null !== b.child) switch (b.child.tag) {
                    case 5:
                      c = b.child.stateNode;
                      break;
                    case 1:
                      c = b.child.stateNode;
                  }
                  sh(b, g, c);
                }
                break;
              case 5:
                var h = b.stateNode;
                if (null === c && b.flags & 4) {
                  c = h;
                  var k = b.memoizedProps;
                  switch (b.type) {
                    case "button":
                    case "input":
                    case "select":
                    case "textarea":
                      k.autoFocus && c.focus();
                      break;
                    case "img":
                      k.src && (c.src = k.src);
                  }
                }
                break;
              case 6:
                break;
              case 4:
                break;
              case 12:
                break;
              case 13:
                if (null === b.memoizedState) {
                  var l = b.alternate;
                  if (null !== l) {
                    var m = l.memoizedState;
                    if (null !== m) {
                      var q = m.dehydrated;
                      null !== q && bd(q);
                    }
                  }
                }
                break;
              case 19:
              case 17:
              case 21:
              case 22:
              case 23:
              case 25:
                break;
              default:
                throw Error(p(163));
            }
            U || b.flags & 512 && Rj(b);
          } catch (r) {
            W(b, b.return, r);
          }
        }
        if (b === a) {
          V = null;
          break;
        }
        c = b.sibling;
        if (null !== c) {
          c.return = b.return;
          V = c;
          break;
        }
        V = b.return;
      }
    }
    function gk(a) {
      for (; null !== V; ) {
        var b = V;
        if (b === a) {
          V = null;
          break;
        }
        var c = b.sibling;
        if (null !== c) {
          c.return = b.return;
          V = c;
          break;
        }
        V = b.return;
      }
    }
    function jk(a) {
      for (; null !== V; ) {
        var b = V;
        try {
          switch (b.tag) {
            case 0:
            case 11:
            case 15:
              var c = b.return;
              try {
                Qj(4, b);
              } catch (k) {
                W(b, c, k);
              }
              break;
            case 1:
              var d = b.stateNode;
              if ("function" === typeof d.componentDidMount) {
                var e = b.return;
                try {
                  d.componentDidMount();
                } catch (k) {
                  W(b, e, k);
                }
              }
              var f = b.return;
              try {
                Rj(b);
              } catch (k) {
                W(b, f, k);
              }
              break;
            case 5:
              var g = b.return;
              try {
                Rj(b);
              } catch (k) {
                W(b, g, k);
              }
          }
        } catch (k) {
          W(b, b.return, k);
        }
        if (b === a) {
          V = null;
          break;
        }
        var h = b.sibling;
        if (null !== h) {
          h.return = b.return;
          V = h;
          break;
        }
        V = b.return;
      }
    }
    var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
    function R() {
      return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
    }
    function yi(a) {
      if (0 === (a.mode & 1)) return 1;
      if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
      if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
      a = C;
      if (0 !== a) return a;
      a = window.event;
      a = void 0 === a ? 16 : jd(a.type);
      return a;
    }
    function gi(a, b, c, d) {
      if (50 < yk) throw yk = 0, zk = null, Error(p(185));
      Ac(a, c, d);
      if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
    }
    function Dk(a, b) {
      var c = a.callbackNode;
      wc(a, b);
      var d = uc(a, a === Q ? Z : 0);
      if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
      else if (b = d & -d, a.callbackPriority !== b) {
        null != c && bc(c);
        if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
          0 === (K & 6) && jg();
        }), c = null;
        else {
          switch (Dc(d)) {
            case 1:
              c = fc;
              break;
            case 4:
              c = gc;
              break;
            case 16:
              c = hc;
              break;
            case 536870912:
              c = jc;
              break;
            default:
              c = hc;
          }
          c = Fk(c, Gk.bind(null, a));
        }
        a.callbackPriority = b;
        a.callbackNode = c;
      }
    }
    function Gk(a, b) {
      Ak = -1;
      Bk = 0;
      if (0 !== (K & 6)) throw Error(p(327));
      var c = a.callbackNode;
      if (Hk() && a.callbackNode !== c) return null;
      var d = uc(a, a === Q ? Z : 0);
      if (0 === d) return null;
      if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
      else {
        b = d;
        var e = K;
        K |= 2;
        var f = Jk();
        if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
        do
          try {
            Lk();
            break;
          } catch (h) {
            Mk(a, h);
          }
        while (1);
        $g();
        mk.current = f;
        K = e;
        null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
      }
      if (0 !== b) {
        2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
        if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
        if (6 === b) Ck(a, d);
        else {
          e = a.current.alternate;
          if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f = xc(a), 0 !== f && (d = f, b = Nk(a, f))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
          a.finishedWork = e;
          a.finishedLanes = d;
          switch (b) {
            case 0:
            case 1:
              throw Error(p(345));
            case 2:
              Pk(a, tk, uk);
              break;
            case 3:
              Ck(a, d);
              if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
                if (0 !== uc(a, 0)) break;
                e = a.suspendedLanes;
                if ((e & d) !== d) {
                  R();
                  a.pingedLanes |= a.suspendedLanes & e;
                  break;
                }
                a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
                break;
              }
              Pk(a, tk, uk);
              break;
            case 4:
              Ck(a, d);
              if ((d & 4194240) === d) break;
              b = a.eventTimes;
              for (e = -1; 0 < d; ) {
                var g = 31 - oc(d);
                f = 1 << g;
                g = b[g];
                g > e && (e = g);
                d &= ~f;
              }
              d = e;
              d = B() - d;
              d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
              if (10 < d) {
                a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
                break;
              }
              Pk(a, tk, uk);
              break;
            case 5:
              Pk(a, tk, uk);
              break;
            default:
              throw Error(p(329));
          }
        }
      }
      Dk(a, B());
      return a.callbackNode === c ? Gk.bind(null, a) : null;
    }
    function Nk(a, b) {
      var c = sk;
      a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
      a = Ik(a, b);
      2 !== a && (b = tk, tk = c, null !== b && Fj(b));
      return a;
    }
    function Fj(a) {
      null === tk ? tk = a : tk.push.apply(tk, a);
    }
    function Ok(a) {
      for (var b = a; ; ) {
        if (b.flags & 16384) {
          var c = b.updateQueue;
          if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
            var e = c[d], f = e.getSnapshot;
            e = e.value;
            try {
              if (!He(f(), e)) return false;
            } catch (g) {
              return false;
            }
          }
        }
        c = b.child;
        if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
        else {
          if (b === a) break;
          for (; null === b.sibling; ) {
            if (null === b.return || b.return === a) return true;
            b = b.return;
          }
          b.sibling.return = b.return;
          b = b.sibling;
        }
      }
      return true;
    }
    function Ck(a, b) {
      b &= ~rk;
      b &= ~qk;
      a.suspendedLanes |= b;
      a.pingedLanes &= ~b;
      for (a = a.expirationTimes; 0 < b; ) {
        var c = 31 - oc(b), d = 1 << c;
        a[c] = -1;
        b &= ~d;
      }
    }
    function Ek(a) {
      if (0 !== (K & 6)) throw Error(p(327));
      Hk();
      var b = uc(a, 0);
      if (0 === (b & 1)) return Dk(a, B()), null;
      var c = Ik(a, b);
      if (0 !== a.tag && 2 === c) {
        var d = xc(a);
        0 !== d && (b = d, c = Nk(a, d));
      }
      if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
      if (6 === c) throw Error(p(345));
      a.finishedWork = a.current.alternate;
      a.finishedLanes = b;
      Pk(a, tk, uk);
      Dk(a, B());
      return null;
    }
    function Qk(a, b) {
      var c = K;
      K |= 1;
      try {
        return a(b);
      } finally {
        K = c, 0 === K && (Gj = B() + 500, fg && jg());
      }
    }
    function Rk(a) {
      null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
      var b = K;
      K |= 1;
      var c = ok.transition, d = C;
      try {
        if (ok.transition = null, C = 1, a) return a();
      } finally {
        C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
      }
    }
    function Hj() {
      fj = ej.current;
      E(ej);
    }
    function Kk(a, b) {
      a.finishedWork = null;
      a.finishedLanes = 0;
      var c = a.timeoutHandle;
      -1 !== c && (a.timeoutHandle = -1, Gf(c));
      if (null !== Y) for (c = Y.return; null !== c; ) {
        var d = c;
        wg(d);
        switch (d.tag) {
          case 1:
            d = d.type.childContextTypes;
            null !== d && void 0 !== d && $f();
            break;
          case 3:
            zh();
            E(Wf);
            E(H);
            Eh();
            break;
          case 5:
            Bh(d);
            break;
          case 4:
            zh();
            break;
          case 13:
            E(L);
            break;
          case 19:
            E(L);
            break;
          case 10:
            ah(d.type._context);
            break;
          case 22:
          case 23:
            Hj();
        }
        c = c.return;
      }
      Q = a;
      Y = a = Pg(a.current, null);
      Z = fj = b;
      T = 0;
      pk = null;
      rk = qk = rh = 0;
      tk = sk = null;
      if (null !== fh) {
        for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
          c.interleaved = null;
          var e = d.next, f = c.pending;
          if (null !== f) {
            var g = f.next;
            f.next = e;
            d.next = g;
          }
          c.pending = d;
        }
        fh = null;
      }
      return a;
    }
    function Mk(a, b) {
      do {
        var c = Y;
        try {
          $g();
          Fh.current = Rh;
          if (Ih) {
            for (var d = M.memoizedState; null !== d; ) {
              var e = d.queue;
              null !== e && (e.pending = null);
              d = d.next;
            }
            Ih = false;
          }
          Hh = 0;
          O = N = M = null;
          Jh = false;
          Kh = 0;
          nk.current = null;
          if (null === c || null === c.return) {
            T = 1;
            pk = b;
            Y = null;
            break;
          }
          a: {
            var f = a, g = c.return, h = c, k = b;
            b = Z;
            h.flags |= 32768;
            if (null !== k && "object" === typeof k && "function" === typeof k.then) {
              var l = k, m = h, q = m.tag;
              if (0 === (m.mode & 1) && (0 === q || 11 === q || 15 === q)) {
                var r = m.alternate;
                r ? (m.updateQueue = r.updateQueue, m.memoizedState = r.memoizedState, m.lanes = r.lanes) : (m.updateQueue = null, m.memoizedState = null);
              }
              var y = Ui(g);
              if (null !== y) {
                y.flags &= -257;
                Vi(y, g, h, f, b);
                y.mode & 1 && Si(f, l, b);
                b = y;
                k = l;
                var n = b.updateQueue;
                if (null === n) {
                  var t = /* @__PURE__ */ new Set();
                  t.add(k);
                  b.updateQueue = t;
                } else n.add(k);
                break a;
              } else {
                if (0 === (b & 1)) {
                  Si(f, l, b);
                  tj();
                  break a;
                }
                k = Error(p(426));
              }
            } else if (I && h.mode & 1) {
              var J = Ui(g);
              if (null !== J) {
                0 === (J.flags & 65536) && (J.flags |= 256);
                Vi(J, g, h, f, b);
                Jg(Ji(k, h));
                break a;
              }
            }
            f = k = Ji(k, h);
            4 !== T && (T = 2);
            null === sk ? sk = [f] : sk.push(f);
            f = g;
            do {
              switch (f.tag) {
                case 3:
                  f.flags |= 65536;
                  b &= -b;
                  f.lanes |= b;
                  var x = Ni(f, k, b);
                  ph(f, x);
                  break a;
                case 1:
                  h = k;
                  var w = f.type, u = f.stateNode;
                  if (0 === (f.flags & 128) && ("function" === typeof w.getDerivedStateFromError || null !== u && "function" === typeof u.componentDidCatch && (null === Ri || !Ri.has(u)))) {
                    f.flags |= 65536;
                    b &= -b;
                    f.lanes |= b;
                    var F = Qi(f, h, b);
                    ph(f, F);
                    break a;
                  }
              }
              f = f.return;
            } while (null !== f);
          }
          Sk(c);
        } catch (na) {
          b = na;
          Y === c && null !== c && (Y = c = c.return);
          continue;
        }
        break;
      } while (1);
    }
    function Jk() {
      var a = mk.current;
      mk.current = Rh;
      return null === a ? Rh : a;
    }
    function tj() {
      if (0 === T || 3 === T || 2 === T) T = 4;
      null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
    }
    function Ik(a, b) {
      var c = K;
      K |= 2;
      var d = Jk();
      if (Q !== a || Z !== b) uk = null, Kk(a, b);
      do
        try {
          Tk();
          break;
        } catch (e) {
          Mk(a, e);
        }
      while (1);
      $g();
      K = c;
      mk.current = d;
      if (null !== Y) throw Error(p(261));
      Q = null;
      Z = 0;
      return T;
    }
    function Tk() {
      for (; null !== Y; ) Uk(Y);
    }
    function Lk() {
      for (; null !== Y && !cc(); ) Uk(Y);
    }
    function Uk(a) {
      var b = Vk(a.alternate, a, fj);
      a.memoizedProps = a.pendingProps;
      null === b ? Sk(a) : Y = b;
      nk.current = null;
    }
    function Sk(a) {
      var b = a;
      do {
        var c = b.alternate;
        a = b.return;
        if (0 === (b.flags & 32768)) {
          if (c = Ej(c, b, fj), null !== c) {
            Y = c;
            return;
          }
        } else {
          c = Ij(c, b);
          if (null !== c) {
            c.flags &= 32767;
            Y = c;
            return;
          }
          if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
          else {
            T = 6;
            Y = null;
            return;
          }
        }
        b = b.sibling;
        if (null !== b) {
          Y = b;
          return;
        }
        Y = b = a;
      } while (null !== b);
      0 === T && (T = 5);
    }
    function Pk(a, b, c) {
      var d = C, e = ok.transition;
      try {
        ok.transition = null, C = 1, Wk(a, b, c, d);
      } finally {
        ok.transition = e, C = d;
      }
      return null;
    }
    function Wk(a, b, c, d) {
      do
        Hk();
      while (null !== wk);
      if (0 !== (K & 6)) throw Error(p(327));
      c = a.finishedWork;
      var e = a.finishedLanes;
      if (null === c) return null;
      a.finishedWork = null;
      a.finishedLanes = 0;
      if (c === a.current) throw Error(p(177));
      a.callbackNode = null;
      a.callbackPriority = 0;
      var f = c.lanes | c.childLanes;
      Bc(a, f);
      a === Q && (Y = Q = null, Z = 0);
      0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
        Hk();
        return null;
      }));
      f = 0 !== (c.flags & 15990);
      if (0 !== (c.subtreeFlags & 15990) || f) {
        f = ok.transition;
        ok.transition = null;
        var g = C;
        C = 1;
        var h = K;
        K |= 4;
        nk.current = null;
        Oj(a, c);
        dk(c, a);
        Oe(Df);
        dd = !!Cf;
        Df = Cf = null;
        a.current = c;
        hk(c);
        dc();
        K = h;
        C = g;
        ok.transition = f;
      } else a.current = c;
      vk && (vk = false, wk = a, xk = e);
      f = a.pendingLanes;
      0 === f && (Ri = null);
      mc(c.stateNode);
      Dk(a, B());
      if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
      if (Oi) throw Oi = false, a = Pi, Pi = null, a;
      0 !== (xk & 1) && 0 !== a.tag && Hk();
      f = a.pendingLanes;
      0 !== (f & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
      jg();
      return null;
    }
    function Hk() {
      if (null !== wk) {
        var a = Dc(xk), b = ok.transition, c = C;
        try {
          ok.transition = null;
          C = 16 > a ? 16 : a;
          if (null === wk) var d = false;
          else {
            a = wk;
            wk = null;
            xk = 0;
            if (0 !== (K & 6)) throw Error(p(331));
            var e = K;
            K |= 4;
            for (V = a.current; null !== V; ) {
              var f = V, g = f.child;
              if (0 !== (V.flags & 16)) {
                var h = f.deletions;
                if (null !== h) {
                  for (var k = 0; k < h.length; k++) {
                    var l = h[k];
                    for (V = l; null !== V; ) {
                      var m = V;
                      switch (m.tag) {
                        case 0:
                        case 11:
                        case 15:
                          Pj(8, m, f);
                      }
                      var q = m.child;
                      if (null !== q) q.return = m, V = q;
                      else for (; null !== V; ) {
                        m = V;
                        var r = m.sibling, y = m.return;
                        Sj(m);
                        if (m === l) {
                          V = null;
                          break;
                        }
                        if (null !== r) {
                          r.return = y;
                          V = r;
                          break;
                        }
                        V = y;
                      }
                    }
                  }
                  var n = f.alternate;
                  if (null !== n) {
                    var t = n.child;
                    if (null !== t) {
                      n.child = null;
                      do {
                        var J = t.sibling;
                        t.sibling = null;
                        t = J;
                      } while (null !== t);
                    }
                  }
                  V = f;
                }
              }
              if (0 !== (f.subtreeFlags & 2064) && null !== g) g.return = f, V = g;
              else b: for (; null !== V; ) {
                f = V;
                if (0 !== (f.flags & 2048)) switch (f.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Pj(9, f, f.return);
                }
                var x = f.sibling;
                if (null !== x) {
                  x.return = f.return;
                  V = x;
                  break b;
                }
                V = f.return;
              }
            }
            var w = a.current;
            for (V = w; null !== V; ) {
              g = V;
              var u = g.child;
              if (0 !== (g.subtreeFlags & 2064) && null !== u) u.return = g, V = u;
              else b: for (g = w; null !== V; ) {
                h = V;
                if (0 !== (h.flags & 2048)) try {
                  switch (h.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Qj(9, h);
                  }
                } catch (na) {
                  W(h, h.return, na);
                }
                if (h === g) {
                  V = null;
                  break b;
                }
                var F = h.sibling;
                if (null !== F) {
                  F.return = h.return;
                  V = F;
                  break b;
                }
                V = h.return;
              }
            }
            K = e;
            jg();
            if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
              lc.onPostCommitFiberRoot(kc, a);
            } catch (na) {
            }
            d = true;
          }
          return d;
        } finally {
          C = c, ok.transition = b;
        }
      }
      return false;
    }
    function Xk(a, b, c) {
      b = Ji(c, b);
      b = Ni(a, b, 1);
      a = nh(a, b, 1);
      b = R();
      null !== a && (Ac(a, 1, b), Dk(a, b));
    }
    function W(a, b, c) {
      if (3 === a.tag) Xk(a, a, c);
      else for (; null !== b; ) {
        if (3 === b.tag) {
          Xk(b, a, c);
          break;
        } else if (1 === b.tag) {
          var d = b.stateNode;
          if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
            a = Ji(c, a);
            a = Qi(b, a, 1);
            b = nh(b, a, 1);
            a = R();
            null !== b && (Ac(b, 1, a), Dk(b, a));
            break;
          }
        }
        b = b.return;
      }
    }
    function Ti(a, b, c) {
      var d = a.pingCache;
      null !== d && d.delete(b);
      b = R();
      a.pingedLanes |= a.suspendedLanes & c;
      Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
      Dk(a, b);
    }
    function Yk(a, b) {
      0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
      var c = R();
      a = ih(a, b);
      null !== a && (Ac(a, b, c), Dk(a, c));
    }
    function uj(a) {
      var b = a.memoizedState, c = 0;
      null !== b && (c = b.retryLane);
      Yk(a, c);
    }
    function bk(a, b) {
      var c = 0;
      switch (a.tag) {
        case 13:
          var d = a.stateNode;
          var e = a.memoizedState;
          null !== e && (c = e.retryLane);
          break;
        case 19:
          d = a.stateNode;
          break;
        default:
          throw Error(p(314));
      }
      null !== d && d.delete(b);
      Yk(a, c);
    }
    var Vk;
    Vk = function(a, b, c) {
      if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
      else {
        if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
        dh = 0 !== (a.flags & 131072) ? true : false;
      }
      else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
      b.lanes = 0;
      switch (b.tag) {
        case 2:
          var d = b.type;
          ij(a, b);
          a = b.pendingProps;
          var e = Yf(b, H.current);
          ch(b, c);
          e = Nh(null, b, d, a, e, c);
          var f = Sh();
          b.flags |= 1;
          "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f = true, cg(b)) : f = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f, c)) : (b.tag = 0, I && f && vg(b), Xi(null, b, e, c), b = b.child);
          return b;
        case 16:
          d = b.elementType;
          a: {
            ij(a, b);
            a = b.pendingProps;
            e = d._init;
            d = e(d._payload);
            b.type = d;
            e = b.tag = Zk(d);
            a = Ci(d, a);
            switch (e) {
              case 0:
                b = cj(null, b, d, a, c);
                break a;
              case 1:
                b = hj(null, b, d, a, c);
                break a;
              case 11:
                b = Yi(null, b, d, a, c);
                break a;
              case 14:
                b = $i(null, b, d, Ci(d.type, a), c);
                break a;
            }
            throw Error(p(
              306,
              d,
              ""
            ));
          }
          return b;
        case 0:
          return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
        case 1:
          return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
        case 3:
          a: {
            kj(b);
            if (null === a) throw Error(p(387));
            d = b.pendingProps;
            f = b.memoizedState;
            e = f.element;
            lh(a, b);
            qh(b, d, null, c);
            var g = b.memoizedState;
            d = g.element;
            if (f.isDehydrated) if (f = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f, b.memoizedState = f, b.flags & 256) {
              e = Ji(Error(p(423)), b);
              b = lj(a, b, d, c, e);
              break a;
            } else if (d !== e) {
              e = Ji(Error(p(424)), b);
              b = lj(a, b, d, c, e);
              break a;
            } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
            else {
              Ig();
              if (d === e) {
                b = Zi(a, b, c);
                break a;
              }
              Xi(a, b, d, c);
            }
            b = b.child;
          }
          return b;
        case 5:
          return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f && Ef(d, f) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
        case 6:
          return null === a && Eg(b), null;
        case 13:
          return oj(a, b, c);
        case 4:
          return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
        case 11:
          return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
        case 7:
          return Xi(a, b, b.pendingProps, c), b.child;
        case 8:
          return Xi(a, b, b.pendingProps.children, c), b.child;
        case 12:
          return Xi(a, b, b.pendingProps.children, c), b.child;
        case 10:
          a: {
            d = b.type._context;
            e = b.pendingProps;
            f = b.memoizedProps;
            g = e.value;
            G(Wg, d._currentValue);
            d._currentValue = g;
            if (null !== f) if (He(f.value, g)) {
              if (f.children === e.children && !Wf.current) {
                b = Zi(a, b, c);
                break a;
              }
            } else for (f = b.child, null !== f && (f.return = b); null !== f; ) {
              var h = f.dependencies;
              if (null !== h) {
                g = f.child;
                for (var k = h.firstContext; null !== k; ) {
                  if (k.context === d) {
                    if (1 === f.tag) {
                      k = mh(-1, c & -c);
                      k.tag = 2;
                      var l = f.updateQueue;
                      if (null !== l) {
                        l = l.shared;
                        var m = l.pending;
                        null === m ? k.next = k : (k.next = m.next, m.next = k);
                        l.pending = k;
                      }
                    }
                    f.lanes |= c;
                    k = f.alternate;
                    null !== k && (k.lanes |= c);
                    bh(
                      f.return,
                      c,
                      b
                    );
                    h.lanes |= c;
                    break;
                  }
                  k = k.next;
                }
              } else if (10 === f.tag) g = f.type === b.type ? null : f.child;
              else if (18 === f.tag) {
                g = f.return;
                if (null === g) throw Error(p(341));
                g.lanes |= c;
                h = g.alternate;
                null !== h && (h.lanes |= c);
                bh(g, c, b);
                g = f.sibling;
              } else g = f.child;
              if (null !== g) g.return = f;
              else for (g = f; null !== g; ) {
                if (g === b) {
                  g = null;
                  break;
                }
                f = g.sibling;
                if (null !== f) {
                  f.return = g.return;
                  g = f;
                  break;
                }
                g = g.return;
              }
              f = g;
            }
            Xi(a, b, e.children, c);
            b = b.child;
          }
          return b;
        case 9:
          return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
        case 14:
          return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
        case 15:
          return bj(a, b, b.type, b.pendingProps, c);
        case 17:
          return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
        case 19:
          return xj(a, b, c);
        case 22:
          return dj(a, b, c);
      }
      throw Error(p(156, b.tag));
    };
    function Fk(a, b) {
      return ac(a, b);
    }
    function $k(a, b, c, d) {
      this.tag = a;
      this.key = c;
      this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
      this.index = 0;
      this.ref = null;
      this.pendingProps = b;
      this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
      this.mode = d;
      this.subtreeFlags = this.flags = 0;
      this.deletions = null;
      this.childLanes = this.lanes = 0;
      this.alternate = null;
    }
    function Bg(a, b, c, d) {
      return new $k(a, b, c, d);
    }
    function aj(a) {
      a = a.prototype;
      return !(!a || !a.isReactComponent);
    }
    function Zk(a) {
      if ("function" === typeof a) return aj(a) ? 1 : 0;
      if (void 0 !== a && null !== a) {
        a = a.$$typeof;
        if (a === Da) return 11;
        if (a === Ga) return 14;
      }
      return 2;
    }
    function Pg(a, b) {
      var c = a.alternate;
      null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
      c.flags = a.flags & 14680064;
      c.childLanes = a.childLanes;
      c.lanes = a.lanes;
      c.child = a.child;
      c.memoizedProps = a.memoizedProps;
      c.memoizedState = a.memoizedState;
      c.updateQueue = a.updateQueue;
      b = a.dependencies;
      c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
      c.sibling = a.sibling;
      c.index = a.index;
      c.ref = a.ref;
      return c;
    }
    function Rg(a, b, c, d, e, f) {
      var g = 2;
      d = a;
      if ("function" === typeof a) aj(a) && (g = 1);
      else if ("string" === typeof a) g = 5;
      else a: switch (a) {
        case ya:
          return Tg(c.children, e, f, b);
        case za:
          g = 8;
          e |= 8;
          break;
        case Aa:
          return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f, a;
        case Ea:
          return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f, a;
        case Fa:
          return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f, a;
        case Ia:
          return pj(c, e, f, b);
        default:
          if ("object" === typeof a && null !== a) switch (a.$$typeof) {
            case Ba:
              g = 10;
              break a;
            case Ca:
              g = 9;
              break a;
            case Da:
              g = 11;
              break a;
            case Ga:
              g = 14;
              break a;
            case Ha:
              g = 16;
              d = null;
              break a;
          }
          throw Error(p(130, null == a ? a : typeof a, ""));
      }
      b = Bg(g, c, b, e);
      b.elementType = a;
      b.type = d;
      b.lanes = f;
      return b;
    }
    function Tg(a, b, c, d) {
      a = Bg(7, a, d, b);
      a.lanes = c;
      return a;
    }
    function pj(a, b, c, d) {
      a = Bg(22, a, d, b);
      a.elementType = Ia;
      a.lanes = c;
      a.stateNode = { isHidden: false };
      return a;
    }
    function Qg(a, b, c) {
      a = Bg(6, a, null, b);
      a.lanes = c;
      return a;
    }
    function Sg(a, b, c) {
      b = Bg(4, null !== a.children ? a.children : [], a.key, b);
      b.lanes = c;
      b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
      return b;
    }
    function al(a, b, c, d, e) {
      this.tag = b;
      this.containerInfo = a;
      this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
      this.timeoutHandle = -1;
      this.callbackNode = this.pendingContext = this.context = null;
      this.callbackPriority = 0;
      this.eventTimes = zc(0);
      this.expirationTimes = zc(-1);
      this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
      this.entanglements = zc(0);
      this.identifierPrefix = d;
      this.onRecoverableError = e;
      this.mutableSourceEagerHydrationData = null;
    }
    function bl(a, b, c, d, e, f, g, h, k) {
      a = new al(a, b, c, h, k);
      1 === b ? (b = 1, true === f && (b |= 8)) : b = 0;
      f = Bg(3, null, null, b);
      a.current = f;
      f.stateNode = a;
      f.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
      kh(f);
      return a;
    }
    function cl(a, b, c) {
      var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
      return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
    }
    function dl(a) {
      if (!a) return Vf;
      a = a._reactInternals;
      a: {
        if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
        var b = a;
        do {
          switch (b.tag) {
            case 3:
              b = b.stateNode.context;
              break a;
            case 1:
              if (Zf(b.type)) {
                b = b.stateNode.__reactInternalMemoizedMergedChildContext;
                break a;
              }
          }
          b = b.return;
        } while (null !== b);
        throw Error(p(171));
      }
      if (1 === a.tag) {
        var c = a.type;
        if (Zf(c)) return bg(a, c, b);
      }
      return b;
    }
    function el(a, b, c, d, e, f, g, h, k) {
      a = bl(c, d, true, a, e, f, g, h, k);
      a.context = dl(null);
      c = a.current;
      d = R();
      e = yi(c);
      f = mh(d, e);
      f.callback = void 0 !== b && null !== b ? b : null;
      nh(c, f, e);
      a.current.lanes = e;
      Ac(a, e, d);
      Dk(a, d);
      return a;
    }
    function fl(a, b, c, d) {
      var e = b.current, f = R(), g = yi(e);
      c = dl(c);
      null === b.context ? b.context = c : b.pendingContext = c;
      b = mh(f, g);
      b.payload = { element: a };
      d = void 0 === d ? null : d;
      null !== d && (b.callback = d);
      a = nh(e, b, g);
      null !== a && (gi(a, e, g, f), oh(a, e, g));
      return g;
    }
    function gl(a) {
      a = a.current;
      if (!a.child) return null;
      switch (a.child.tag) {
        case 5:
          return a.child.stateNode;
        default:
          return a.child.stateNode;
      }
    }
    function hl(a, b) {
      a = a.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        var c = a.retryLane;
        a.retryLane = 0 !== c && c < b ? c : b;
      }
    }
    function il(a, b) {
      hl(a, b);
      (a = a.alternate) && hl(a, b);
    }
    function jl() {
      return null;
    }
    var kl = "function" === typeof reportError ? reportError : function(a) {
      console.error(a);
    };
    function ll(a) {
      this._internalRoot = a;
    }
    ml.prototype.render = ll.prototype.render = function(a) {
      var b = this._internalRoot;
      if (null === b) throw Error(p(409));
      fl(a, b, null, null);
    };
    ml.prototype.unmount = ll.prototype.unmount = function() {
      var a = this._internalRoot;
      if (null !== a) {
        this._internalRoot = null;
        var b = a.containerInfo;
        Rk(function() {
          fl(null, a, null, null);
        });
        b[uf] = null;
      }
    };
    function ml(a) {
      this._internalRoot = a;
    }
    ml.prototype.unstable_scheduleHydration = function(a) {
      if (a) {
        var b = Hc();
        a = { blockedOn: null, target: a, priority: b };
        for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
        Qc.splice(c, 0, a);
        0 === c && Vc(a);
      }
    };
    function nl(a) {
      return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
    }
    function ol(a) {
      return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
    }
    function pl() {
    }
    function ql(a, b, c, d, e) {
      if (e) {
        if ("function" === typeof d) {
          var f = d;
          d = function() {
            var a2 = gl(g);
            f.call(a2);
          };
        }
        var g = el(b, d, a, 0, null, false, false, "", pl);
        a._reactRootContainer = g;
        a[uf] = g.current;
        sf(8 === a.nodeType ? a.parentNode : a);
        Rk();
        return g;
      }
      for (; e = a.lastChild; ) a.removeChild(e);
      if ("function" === typeof d) {
        var h = d;
        d = function() {
          var a2 = gl(k);
          h.call(a2);
        };
      }
      var k = bl(a, 0, false, null, null, false, false, "", pl);
      a._reactRootContainer = k;
      a[uf] = k.current;
      sf(8 === a.nodeType ? a.parentNode : a);
      Rk(function() {
        fl(b, k, c, d);
      });
      return k;
    }
    function rl(a, b, c, d, e) {
      var f = c._reactRootContainer;
      if (f) {
        var g = f;
        if ("function" === typeof e) {
          var h = e;
          e = function() {
            var a2 = gl(g);
            h.call(a2);
          };
        }
        fl(b, g, a, e);
      } else g = ql(c, b, a, e, d);
      return gl(g);
    }
    Ec = function(a) {
      switch (a.tag) {
        case 3:
          var b = a.stateNode;
          if (b.current.memoizedState.isDehydrated) {
            var c = tc(b.pendingLanes);
            0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
          }
          break;
        case 13:
          Rk(function() {
            var b2 = ih(a, 1);
            if (null !== b2) {
              var c2 = R();
              gi(b2, a, 1, c2);
            }
          }), il(a, 1);
      }
    };
    Fc = function(a) {
      if (13 === a.tag) {
        var b = ih(a, 134217728);
        if (null !== b) {
          var c = R();
          gi(b, a, 134217728, c);
        }
        il(a, 134217728);
      }
    };
    Gc = function(a) {
      if (13 === a.tag) {
        var b = yi(a), c = ih(a, b);
        if (null !== c) {
          var d = R();
          gi(c, a, b, d);
        }
        il(a, b);
      }
    };
    Hc = function() {
      return C;
    };
    Ic = function(a, b) {
      var c = C;
      try {
        return C = a, b();
      } finally {
        C = c;
      }
    };
    yb = function(a, b, c) {
      switch (b) {
        case "input":
          bb(a, c);
          b = c.name;
          if ("radio" === c.type && null != b) {
            for (c = a; c.parentNode; ) c = c.parentNode;
            c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
            for (b = 0; b < c.length; b++) {
              var d = c[b];
              if (d !== a && d.form === a.form) {
                var e = Db(d);
                if (!e) throw Error(p(90));
                Wa(d);
                bb(d, e);
              }
            }
          }
          break;
        case "textarea":
          ib(a, c);
          break;
        case "select":
          b = c.value, null != b && fb(a, !!c.multiple, b, false);
      }
    };
    Gb = Qk;
    Hb = Rk;
    var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
    var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
      a = Zb(a);
      return null === a ? null : a.stateNode;
    }, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
    if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
      var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!vl.isDisabled && vl.supportsFiber) try {
        kc = vl.inject(ul), lc = vl;
      } catch (a) {
      }
    }
    reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
    reactDom_production_min.createPortal = function(a, b) {
      var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
      if (!nl(b)) throw Error(p(200));
      return cl(a, b, null, c);
    };
    reactDom_production_min.createRoot = function(a, b) {
      if (!nl(a)) throw Error(p(299));
      var c = false, d = "", e = kl;
      null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
      b = bl(a, 1, false, null, null, c, false, d, e);
      a[uf] = b.current;
      sf(8 === a.nodeType ? a.parentNode : a);
      return new ll(b);
    };
    reactDom_production_min.findDOMNode = function(a) {
      if (null == a) return null;
      if (1 === a.nodeType) return a;
      var b = a._reactInternals;
      if (void 0 === b) {
        if ("function" === typeof a.render) throw Error(p(188));
        a = Object.keys(a).join(",");
        throw Error(p(268, a));
      }
      a = Zb(b);
      a = null === a ? null : a.stateNode;
      return a;
    };
    reactDom_production_min.flushSync = function(a) {
      return Rk(a);
    };
    reactDom_production_min.hydrate = function(a, b, c) {
      if (!ol(b)) throw Error(p(200));
      return rl(null, a, b, true, c);
    };
    reactDom_production_min.hydrateRoot = function(a, b, c) {
      if (!nl(a)) throw Error(p(405));
      var d = null != c && c.hydratedSources || null, e = false, f = "", g = kl;
      null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
      b = el(b, null, a, 1, null != c ? c : null, e, false, f, g);
      a[uf] = b.current;
      sf(a);
      if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
        c,
        e
      );
      return new ml(b);
    };
    reactDom_production_min.render = function(a, b, c) {
      if (!ol(b)) throw Error(p(200));
      return rl(null, a, b, false, c);
    };
    reactDom_production_min.unmountComponentAtNode = function(a) {
      if (!ol(a)) throw Error(p(40));
      return a._reactRootContainer ? (Rk(function() {
        rl(null, null, a, false, function() {
          a._reactRootContainer = null;
          a[uf] = null;
        });
      }), true) : false;
    };
    reactDom_production_min.unstable_batchedUpdates = Qk;
    reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
      if (!ol(c)) throw Error(p(200));
      if (null == a || void 0 === a._reactInternals) throw Error(p(38));
      return rl(a, b, c, false, d);
    };
    reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
    return reactDom_production_min;
  }
  var hasRequiredReactDom;
  function requireReactDom() {
    if (hasRequiredReactDom) return reactDom.exports;
    hasRequiredReactDom = 1;
    function checkDCE() {
      if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
        return;
      }
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
      } catch (err) {
        console.error(err);
      }
    }
    {
      checkDCE();
      reactDom.exports = requireReactDom_production_min();
    }
    return reactDom.exports;
  }
  var hasRequiredClient;
  function requireClient() {
    if (hasRequiredClient) return client;
    hasRequiredClient = 1;
    var m = requireReactDom();
    {
      client.createRoot = m.createRoot;
      client.hydrateRoot = m.hydrateRoot;
    }
    return client;
  }
  var clientExports = requireClient();
  var reactExports = requireReact();
  const RFC3339_WITH_TIMEZONE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/;
  function parseRfc3339Timestamp(value) {
    if (typeof value !== "string") return null;
    const timestamp = value.trim();
    const match = RFC3339_WITH_TIMEZONE.exec(timestamp);
    if (!match) return null;
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const offsetHour = Number(offsetHourText || 0);
    const offsetMinute = Number(offsetMinuteText || 0);
    if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
    const calendar = /* @__PURE__ */ new Date(0);
    calendar.setUTCHours(0, 0, 0, 0);
    calendar.setUTCFullYear(year, month - 1, day);
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
    const parsed = Date.parse(timestamp);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function isRfc3339Timestamp(value) {
    return parseRfc3339Timestamp(value) !== null;
  }
  const DANGER_CPU = 85;
  const DANGER_MEMORY = 85;
  const DANGER_DISK = 90;
  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function formatNumber(value) {
    const n = toNumber(value, NaN);
    return Number.isFinite(n) ? new Intl.NumberFormat("zh-CN").format(n) : "-";
  }
  function formatPercent(value, digits = 0) {
    const n = toNumber(value, NaN);
    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : "-";
  }
  function formatRate(value) {
    const n = toNumber(value, NaN);
    if (!Number.isFinite(n)) return "-";
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} Gbps`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)} Mbps`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(2)} Kbps`;
    return `${Math.round(n)} bps`;
  }
  function formatDurationCompact(seconds) {
    const safe = Math.max(0, Math.round(toNumber(seconds, 0)));
    if (safe >= 86400) return `${Math.floor(safe / 86400)}d${Math.floor(safe % 86400 / 3600)}h`;
    if (safe >= 3600) return `${Math.floor(safe / 3600)}h${Math.floor(safe % 3600 / 60)}m`;
    if (safe >= 60) return `${Math.floor(safe / 60)}m${safe % 60}s`;
    return `${safe}s`;
  }
  function shortTimestamp(value) {
    if (!value) return "-";
    const parsed = parseRfc3339Timestamp(value);
    if (parsed === null) return "-";
    const date = new Date(parsed);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function compactListText(values, limit = 3) {
    const items = values.map((value) => String(value ?? "").trim()).filter(Boolean);
    if (!items.length) return "";
    if (items.length <= limit) return items.join(" / ");
    return `${items.slice(0, limit).join(" / ")} / …`;
  }
  function normalize(value, fallback = "-") {
    const text2 = String(value ?? "").replace(/\s+/g, " ").trim();
    return text2 || fallback;
  }
  function text$1(value, fallback = "-") {
    return normalize(value, fallback);
  }
  function credibilityLabelOf(credibility) {
    switch (credibility) {
      case "realtime":
        return "实时";
      case "cache":
        return "缓存快照";
      case "unavailable":
        return "不可判定";
    }
  }
  function credibilityToneOf(credibility) {
    switch (credibility) {
      case "realtime":
        return "trust";
      case "cache":
        return "warn";
      case "unavailable":
        return "missing";
    }
  }
  function snapshotCredibilityOf(snapshot) {
    if (isSnapshotUnavailable(snapshot)) return "unavailable";
    const meta = snapshot.meta || {};
    if (meta.realtimeError || meta.slowRestError) return "cache";
    return "realtime";
  }
  function wanRows$3(snapshot) {
    return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function routeRows(snapshot) {
    var _a, _b;
    const rows2 = ((_a = snapshot.routes) == null ? void 0 : _a.defaultRoutes) || ((_b = snapshot.routes) == null ? void 0 : _b.items) || [];
    return Array.isArray(rows2) ? rows2 : [];
  }
  function defaultRouteRawSummary(routes) {
    const primary = routes.slice().sort((a, b) => toNumber(a.distance) - toNumber(b.distance))[0];
    if (!primary) return "";
    return `路由表 ${primary.table || primary.routingTable || "main"} / 网关 ${primary.gateway || primary.gatewayStatus || "-"} / 优先级 ${primary.distance ?? "-"} / ${primary.active ? "活动路由" : "非活动路由"} / ${primary.disabled ? "已禁用" : "未禁用"}`;
  }
  function defaultRouteBusinessSummary(routes) {
    const primary = routes.slice().sort((a, b) => toNumber(a.distance) - toNumber(b.distance))[0];
    if (!primary) return "";
    const gateway = normalize(primary.gateway || primary.gatewayStatus, "-");
    const distance = primary.distance ?? "-";
    const state2 = primary.disabled ? "已禁用" : primary.active ? "已启用" : "待确认";
    return `主默认路由：${gateway}，优先级${distance}，${state2}`;
  }
  function latestBusinessSuccessTime(snapshot) {
    const meta = snapshot.meta || {};
    return latestTimestamp([meta.realtimeUpdatedAt, meta.slowRestUpdatedAt]);
  }
  function latestTimestamp(values) {
    return values.reduce((latest, value) => {
      const parsed = parseRfc3339Timestamp(value);
      if (parsed === null) return latest;
      const latestParsed = parseRfc3339Timestamp(latest);
      if (latestParsed === null || parsed > latestParsed) return value || latest;
      return latest;
    }, "");
  }
  function isSnapshotUnavailable(snapshot) {
    if (!snapshot) return true;
    const meta = snapshot.meta || {};
    const signal = [snapshot.error, meta.realtimeError, meta.slowRestError, meta.staticError, meta.connectionDetailError, meta.connectionProtocolError].map((v) => String(v || "")).join(" ");
    const emptyBusiness = [snapshot.wan, snapshot.pppoe, snapshot.interfaces, snapshot.terminals].every((rows2) => !Array.isArray(rows2) || rows2.length === 0);
    return snapshot.status === "error" && (/无可用快照|无业务快照|业务数据不展示|RouterOS 当前不可达|设备当前不可达/.test(signal) || emptyBusiness);
  }
  function endpointFailureEntries(meta) {
    return [...meta.staticEndpointFailures || [], ...meta.realtimeEndpointFailures || [], ...meta.slowRestEndpointFailures || [], ...meta.detailEndpointFailures || []].filter(Boolean);
  }
  function failedEndpointSummary(snapshot) {
    const entries = endpointFailureEntries(snapshot.meta || {});
    return {
      count: entries.length,
      text: entries.length ? compactListText(entries.map((row) => `${normalize(row.group || "端点")}:${normalize(row.name || "-")}`), 3) : "未记录",
      entries
    };
  }
  function freshnessState(snapshot, now2) {
    var _a, _b;
    if (isSnapshotUnavailable(snapshot)) {
      return {
        label: "快照缺失",
        level: "danger",
        stale: true,
        history: false,
        missing: true,
        credibility: "unavailable",
        credibilityLabel: credibilityLabelOf("unavailable"),
        credibilityTone: credibilityToneOf("unavailable"),
        seconds: null,
        text: "不可判定",
        source: ""
      };
    }
    const credibility = snapshotCredibilityOf(snapshot);
    const source = latestBusinessSuccessTime(snapshot);
    if (!source) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
    const parsed = parseRfc3339Timestamp(source);
    if (parsed === null) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
    const seconds = Math.max(0, Math.round((now2 - parsed) / 1e3));
    const poll = Math.max(1, toNumber((_a = snapshot.meta) == null ? void 0 : _a.pollSeconds, 60));
    const boundary = (_b = snapshot.meta) == null ? void 0 : _b.clientEvidenceBoundary;
    if (boundary) {
      const label = boundary === "stale" ? "历史证据" : boundary === "error" ? "刷新失败" : "恢复中";
      return {
        label,
        level: boundary === "error" ? "danger" : "warn",
        stale: true,
        history: true,
        missing: false,
        credibility: "cache",
        credibilityLabel: credibilityLabelOf("cache"),
        credibilityTone: credibilityToneOf("cache"),
        seconds,
        text: formatDurationCompact(seconds),
        source
      };
    }
    const level = seconds >= Math.max(900, poll * 15) ? "danger" : seconds >= Math.max(300, poll * 5) ? "warn" : "ok";
    return { label: level === "danger" ? "数据陈旧" : level === "warn" ? "数据偏旧" : "采样新鲜", level, stale: level !== "ok", history: level === "danger", missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds, text: formatDurationCompact(seconds), source };
  }
  function collectionState(snapshot, freshness, failures = failedEndpointSummary(snapshot)) {
    const meta = snapshot.meta || {};
    const noSnapshot = isSnapshotUnavailable(snapshot);
    const credibility = noSnapshot ? "unavailable" : freshness.credibility === "cache" || Boolean(meta.realtimeError || meta.slowRestError) ? "cache" : "realtime";
    const coreRestErrors = [meta.realtimeError, meta.slowRestError].filter(Boolean).map(String);
    const auxiliaryRestErrors = [meta.connectionDetailError, meta.connectionProtocolError].filter(Boolean).map(String);
    const restErrors = [...coreRestErrors, ...auxiliaryRestErrors];
    const sshErrors = [meta.staticError].filter(Boolean).map(String);
    const restSuccessAt = latestTimestamp([meta.realtimeUpdatedAt, meta.slowRestUpdatedAt, meta.connectionDetailUpdatedAt, meta.connectionProtocolUpdatedAt]);
    const sshSuccessAt = latestTimestamp([meta.staticUpdatedAt]);
    const channelStatus = (coreErrors, auxiliaryErrors, successAt) => {
      if (coreErrors.length) return "failed";
      if (auxiliaryErrors.length) return "degraded";
      if (successAt) return "current";
      return "unavailable";
    };
    const restStatus = channelStatus(coreRestErrors, auxiliaryRestErrors, restSuccessAt);
    const sshStatus = channelStatus(sshErrors, [], sshSuccessAt);
    const channelLabel = (status) => status === "current" ? "可用" : status === "degraded" ? "降级" : status === "failed" ? "失败" : "未记录";
    const restLabel = channelLabel(restStatus);
    const sshLabel = channelLabel(sshStatus);
    const rest = { status: restStatus, label: restLabel, successAt: restSuccessAt, error: restErrors.join("；") };
    const ssh = { status: sshStatus, label: sshLabel, successAt: sshSuccessAt, error: sshErrors.join("；") };
    const channelText = `REST ${restLabel} / SSH ${sshLabel}`;
    const channelDegraded = Boolean(noSnapshot || restStatus !== "current" || sshStatus !== "current" || failures.count > 0);
    const dataStale = Boolean(freshness.stale || freshness.history);
    const dataText = noSnapshot ? "无业务快照，业务数据不展示" : channelDegraded ? "缓存快照" : dataStale ? `业务快照年龄 ${freshness.text}` : latestBusinessSuccessTime(snapshot) ? `数据层最后成功采样 ${shortTimestamp(latestBusinessSuccessTime(snapshot))}` : "成功时间未记录";
    const level = noSnapshot ? "danger" : channelDegraded || dataStale ? "warn" : "ok";
    const credibilityLabel = credibilityLabelOf(credibility);
    const credibilityTone = credibilityToneOf(credibility);
    return {
      level,
      label: noSnapshot ? "快照缺失" : channelDegraded ? "通道需复核" : dataStale ? "数据陈旧" : "采集可用",
      credibility,
      credibilityLabel,
      credibilityTone,
      restLabel,
      sshLabel,
      rest,
      ssh,
      channelStateText: channelText,
      dataStateText: dataText,
      dataText,
      channelText,
      channelDegraded,
      dataStale,
      text: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
      summaryText: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
      failedEndpointText: failures.text
    };
  }
  function routeState(snapshot, freshness) {
    const rawSummary = defaultRouteRawSummary(routeRows(snapshot));
    const businessSummary = defaultRouteBusinessSummary(routeRows(snapshot));
    if (isSnapshotUnavailable(snapshot)) return { label: "不可判定", text: "缺少当前路由快照", level: "warn", rawSummary };
    const active = routeRows(snapshot).find((route) => route.active === true && route.disabled !== true);
    if (freshness.stale || freshness.history) return { label: active ? "历史活动记录" : "历史快照", text: active ? "仅证明上次成功采集时的默认路由" : "默认路由待判定", level: "warn", rawSummary };
    if (!active) return { label: "待确认", text: "默认路由事实未采集", level: "warn", rawSummary };
    return { label: active.active && !active.disabled ? "活动默认路由" : "默认路由待确认", text: businessSummary || "默认路由事实未采集", level: active.active && !active.disabled ? "ok" : "warn", rawSummary };
  }
  function resourceState(snapshot) {
    const device = snapshot.overview || {};
    const available = !isSnapshotUnavailable(snapshot);
    const cpu = available ? toNumber(device.cpuLoad, 0) : 0;
    const memory = available ? toNumber(device.memoryUsage, 0) : 0;
    const disk = available ? toNumber(device.diskUsage, 0) : 0;
    const level = !available ? "missing" : cpu >= DANGER_CPU || memory >= DANGER_MEMORY || disk >= DANGER_DISK ? "danger" : cpu >= 70 || memory >= 70 || disk >= 80 ? "warn" : "ok";
    return { level, available, cpu, memory, disk, summaryText: available ? `处理器 ${formatPercent(cpu)} / 内存 ${formatPercent(memory)} / 磁盘 ${formatPercent(disk)}` : "处理器 未记录 / 内存 未记录 / 磁盘 未记录" };
  }
  function wanState(snapshot) {
    const rows2 = wanRows$3(snapshot);
    const available = !isSnapshotUnavailable(snapshot);
    const online = rows2.filter((row) => row.running !== false).length;
    const total = rows2.length;
    const offline = Math.max(0, total - online);
    const allOffline = total > 0 && online === 0;
    return { available, total, online, offline, allOffline, label: !available ? "未记录" : allOffline ? "WAN 全离线" : offline > 0 ? "WAN 部分离线" : "WAN 可用", text: !available ? "未记录" : `${formatNumber(online)}/${formatNumber(total)} · ${formatNumber(offline)} 离线` };
  }
  function interfaceState(snapshot) {
    const rows2 = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
    const available = !isSnapshotUnavailable(snapshot);
    const downRows = rows2.filter((row) => (row == null ? void 0 : row.running) === false);
    const downNames = downRows.map((row) => row.name || row.interface || "").filter(Boolean);
    return { available, total: available ? rows2.length : 0, down: available ? downRows.length : 0, downNames, text: !available ? "未记录" : downRows.length ? `${formatNumber(downRows.length)} down · ${compactListText(downNames, 3) || "未列出"}` : "接口在线" };
  }
  function connectionState(snapshot) {
    var _a, _b, _c;
    return { total: toNumber((_a = snapshot.connections) == null ? void 0 : _a.total, 0), active: Array.isArray((_b = snapshot.connections) == null ? void 0 : _b.active) ? snapshot.connections.active.length : 0, topIps: Array.isArray((_c = snapshot.connections) == null ? void 0 : _c.topIps) ? snapshot.connections.topIps.length : 0 };
  }
  function deviceFacts(snapshot) {
    const device = snapshot.overview || {};
    const meta = snapshot.meta || {};
    const rawIdentity = normalize(device.identity || "", "");
    const identity = rawIdentity && !/无可用快照|不可达|采集失败|error/i.test(rawIdentity) ? rawIdentity : normalize(meta.target || meta.routerHost || "RouterOS");
    return { identity, version: normalize(device.version || "-"), boardName: normalize(device.boardName || "-"), architecture: normalize(device.architecture || "-"), uptime: normalize(device.uptime || "-"), systemTime: normalize(device.systemTime || "-"), routerHost: normalize(meta.routerHost || "-"), target: normalize(meta.target || "-") };
  }
  function countsOf(wan, interfaces, failures, connections) {
    return { wanTotal: wan.total, wanOnline: wan.online, wanOffline: wan.offline, interfacesTotal: interfaces.total, interfacesDown: interfaces.down, failures: failures.count, connections: connections.total };
  }
  function scenarioOf(snapshot, counts, resource, collection, options) {
    if (options.scenarioHint) return options.scenarioHint;
    if (isSnapshotUnavailable(snapshot)) return "no-snapshot";
    if (counts.wanTotal > 0 && counts.wanOnline === 0) return "all-offline";
    if (counts.interfacesDown > 0) return "interfaces-down";
    if (resource.level === "danger") return "resource-full";
    if (collection.channelDegraded) return "collection-down";
    if (counts.wanTotal >= 4 || counts.interfacesTotal >= 8 || counts.connections >= 5e3) return "fleet";
    return "single";
  }
  function labelOf(key) {
    switch (key) {
      case "single":
        return "Single 轻量态";
      case "fleet":
        return "Fleet 密集态";
      case "all-offline":
        return "WAN 全离线";
      case "no-snapshot":
        return "快照缺失";
      case "collection-down":
        return "通道需复核";
      case "resource-full":
        return "资源满载";
      case "interfaces-down":
        return "接口转发面异常";
    }
  }
  function buildVerdict(key, facts) {
    const level = key === "no-snapshot" || key === "interfaces-down" || key === "resource-full" || key === "all-offline" ? "danger" : key === "collection-down" ? "warn" : facts.freshness.stale ? "warn" : "ok";
    const summary = key === "no-snapshot" ? `无业务快照，业务数据不展示 / 失败端点 ${facts.collection.failedEndpointText}` : key === "resource-full" ? facts.resource.summaryText : key === "interfaces-down" ? `${formatNumber(facts.interfaces.down)} 个接口 down / 转发面优先` : key === "all-offline" ? `${facts.wan.label} / ${facts.route.label}` : key === "collection-down" ? `${facts.collection.channelText} / 缓存快照` : `${formatNumber(facts.wan.total)} 条 WAN / ${facts.resource.summaryText}`;
    const detail = key === "no-snapshot" ? "设备当前不可达" : key === "resource-full" ? `处理器 ${formatPercent(facts.resource.cpu, 1)} / 内存 ${formatPercent(facts.resource.memory, 1)} / 磁盘 ${formatPercent(facts.resource.disk, 1)}` : key === "interfaces-down" ? compactListText(facts.interfaces.downNames, 4) || "涉及接口未列出" : key === "all-offline" ? `${formatNumber(facts.wan.offline)} 条离线线路` : key === "collection-down" ? "REST / SSH / 失败端点 / 缓存快照" : facts.collection.channelText;
    return { key, level, label: labelOf(key), topLabel: labelOf(key), detail, summary };
  }
  function topbarState(snapshot, verdict, facts) {
    const unavailable = facts.freshness.credibility === "unavailable";
    const routeros = unavailable ? { label: "设备通达", value: "不可达", note: text$1(snapshot.error, "当前采集失败"), tone: "danger" } : { label: "设备通达", value: "可达", note: "管理面已返回快照", tone: "ok" };
    const rest = { label: "REST", value: facts.collection.rest.label, note: facts.collection.rest.error || (facts.collection.rest.successAt ? `成功 ${shortTimestamp(facts.collection.rest.successAt)}` : "成功时间未记录"), tone: facts.collection.rest.status === "current" ? "trust" : facts.collection.rest.status === "unavailable" ? "missing" : "warn" };
    const ssh = { label: "SSH", value: facts.collection.ssh.label, note: facts.collection.ssh.error || (facts.collection.ssh.successAt ? `成功 ${shortTimestamp(facts.collection.ssh.successAt)}` : "成功时间未记录"), tone: facts.collection.ssh.status === "current" ? "trust" : facts.collection.ssh.status === "unavailable" ? "missing" : "warn" };
    const recentSuccess = unavailable ? { label: "最近成功", value: "未记录", note: "业务快照缺失", tone: "warn" } : { label: "最近成功", value: shortTimestamp(facts.freshness.source), note: facts.freshness.credibilityLabel, tone: facts.freshness.credibilityTone };
    return {
      device: { label: "设备", value: facts.device.identity, note: `${facts.device.version} · ${facts.device.uptime}`, tone: "trust" },
      conclusion: { label: "结论", value: verdict.topLabel, note: verdict.summary, tone: verdict.level },
      routeros,
      rest,
      ssh,
      recentSuccess
    };
  }
  function deriveOverviewState(snapshot, options = {}) {
    const raw = snapshot || {};
    const freshness = freshnessState(raw, options.now ?? Date.now());
    const failures = failedEndpointSummary(raw);
    const collection = collectionState(raw, freshness, failures);
    const facts = { device: deviceFacts(raw), freshness, collection, route: routeState(raw, freshness), resource: resourceState(raw), wan: wanState(raw), interfaces: interfaceState(raw), failures, connections: connectionState(raw) };
    const counts = countsOf(facts.wan, facts.interfaces, failures, facts.connections);
    const scenario = scenarioOf(raw, counts, facts.resource, collection, options);
    const verdict = buildVerdict(scenario, facts);
    const topbar = topbarState(raw, verdict, facts);
    return { scenario, scale: scenario === "fleet" ? "fleet" : "single", verdict, counts, facts, topbar };
  }
  const OVERVIEW_SCENARIO_KEYS = [
    "single",
    "fleet",
    "all-offline",
    "no-snapshot",
    "collection-down",
    "resource-full",
    "interfaces-down"
  ];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nowSeconds = Math.floor(Date.parse(now) / 1e3);
  const rateTimestamps = () => Array.from({ length: 6 }, (_, index) => nowSeconds - (5 - index) * 5);
  const base$1 = (scenario) => ({
    status: "ok",
    updatedAt: now,
    meta: {
      scaleScenario: scenario,
      configuredIdentity: scenario === "fleet" ? "Fleet-Core" : "RouterOS",
      target: "10.0.0.1",
      routerHost: "10.0.0.1",
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: "RouterOS",
      version: "7.15",
      boardName: "RB5009",
      architecture: "arm64",
      uptime: "2d4h",
      cpuLoad: 28,
      memoryUsage: 34,
      diskUsage: 22,
      history: {
        timestamps: rateTimestamps(),
        downlink: [2100, 2600, 2300, 3100, 2900, 3400],
        uplink: [800, 920, 760, 1080, 1010, 1200],
        cpu: [22, 25, 24, 27, 26, 28],
        memory: [31, 32, 32, 33, 33, 34],
        disk: [22, 22, 22, 22, 22, 22]
      }
    },
    wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan" }],
    routes: { defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }] },
    connections: { total: 1234, active: [{}, {}], topIps: [{}] },
    terminals: [{ name: "client-1", ip: "192.168.88.10", status: "online" }]
  });
  ({
    single: base$1("single"),
    fleet: {
      ...base$1("fleet"),
      overview: {
        ...base$1("fleet").overview,
        history: {
          timestamps: rateTimestamps()
        }
      }
    },
    "all-offline": {
      ...base$1("all-offline")
    },
    "collection-down": {
      ...base$1("collection-down"),
      meta: {
        ...base$1("collection-down").meta
      }
    },
    "resource-full": {
      ...base$1("resource-full"),
      overview: {
        ...base$1("resource-full").overview,
        history: {
          timestamps: rateTimestamps()
        }
      }
    },
    "interfaces-down": {
      ...base$1("interfaces-down")
    }
  });
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const toCamelCase = (string) => string.replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
  );
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const toPascalCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const hasA11yProp = (props) => {
    for (const prop in props) {
      if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
        return true;
      }
    }
    return false;
  };
  const LucideContext = reactExports.createContext({});
  const useLucideContext = () => reactExports.useContext(LucideContext);
  const Icon = reactExports.forwardRef(
    ({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
      const {
        size: contextSize = 24,
        strokeWidth: contextStrokeWidth = 2,
        absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
        color: contextColor = "currentColor",
        className: contextClass = ""
      } = useLucideContext() ?? {};
      const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
      return reactExports.createElement(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size ?? contextSize ?? defaultAttributes.width,
          height: size ?? contextSize ?? defaultAttributes.height,
          stroke: color ?? contextColor,
          strokeWidth: calculatedStrokeWidth,
          className: mergeClasses("lucide", contextClass, className),
          ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const createLucideIcon = (iconName, iconNode) => {
    const Component = reactExports.forwardRef(
      ({ className, ...props }, ref) => reactExports.createElement(Icon, {
        ref,
        iconNode,
        className: mergeClasses(
          `lucide-${toKebabCase(toPascalCase(iconName))}`,
          `lucide-${iconName}`,
          className
        ),
        ...props
      })
    );
    Component.displayName = toPascalCase(iconName);
    return Component;
  };
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$C = [
    [
      "path",
      {
        d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
        key: "169zse"
      }
    ]
  ];
  const Activity = createLucideIcon("activity", __iconNode$C);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$B = [
    ["path", { d: "M12 5v14", key: "s699le" }],
    ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
  ];
  const ArrowDown = createLucideIcon("arrow-down", __iconNode$B);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$A = [
    ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
    ["path", { d: "M19 12H5", key: "x3x0zl" }]
  ];
  const ArrowLeft = createLucideIcon("arrow-left", __iconNode$A);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$z = [
    ["path", { d: "m21 16-4 4-4-4", key: "f6ql7i" }],
    ["path", { d: "M17 20V4", key: "1ejh1v" }],
    ["path", { d: "m3 8 4-4 4 4", key: "11wl7u" }],
    ["path", { d: "M7 4v16", key: "1glfcx" }]
  ];
  const ArrowUpDown = createLucideIcon("arrow-up-down", __iconNode$z);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$y = [
    ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
    ["path", { d: "M12 19V5", key: "x0mq9r" }]
  ];
  const ArrowUp = createLucideIcon("arrow-up", __iconNode$y);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$x = [
    [
      "path",
      { d: "M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z", key: "trhst0" }
    ],
    ["path", { d: "M17 21v-2", key: "ds4u3f" }],
    ["path", { d: "M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10", key: "1mo9zo" }],
    ["path", { d: "M21 21v-2", key: "eo0ou" }],
    ["path", { d: "M3 5V3", key: "1k5hjh" }],
    [
      "path",
      { d: "M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z", key: "1dd30t" }
    ],
    ["path", { d: "M7 5V3", key: "1t1388" }]
  ];
  const Cable = createLucideIcon("cable", __iconNode$x);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$w = [
    ["path", { d: "M12 16v5", key: "zza2cw" }],
    ["path", { d: "M16 14.639V21", key: "1s85h0" }],
    ["path", { d: "M20 10.656V21", key: "q45596" }],
    [
      "path",
      { d: "m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15", key: "1fw8x9" }
    ],
    ["path", { d: "M4 18.463V21", key: "1otddq" }],
    ["path", { d: "M8 14.656V21", key: "1t2idw" }]
  ];
  const ChartNoAxesCombined = createLucideIcon("chart-no-axes-combined", __iconNode$w);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$v = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
  const Check = createLucideIcon("check", __iconNode$v);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$u = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
  const ChevronLeft = createLucideIcon("chevron-left", __iconNode$u);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$t = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
  const ChevronDown = createLucideIcon("chevron-down", __iconNode$t);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$s = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
  const ChevronRight = createLucideIcon("chevron-right", __iconNode$s);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$r = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
  ];
  const CircleAlert = createLucideIcon("circle-alert", __iconNode$r);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$q = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M12 6v6h4", key: "135r8i" }]
  ];
  const Clock3 = createLucideIcon("clock-3", __iconNode$q);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$p = [
    ["path", { d: "M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057", key: "1uxyv8" }],
    ["path", { d: "M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78", key: "99tcn7" }],
    ["path", { d: "m2 2 20 20", key: "1ooewy" }]
  ];
  const CloudOff = createLucideIcon("cloud-off", __iconNode$p);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$o = [
    ["path", { d: "M12 20v2", key: "1lh1kg" }],
    ["path", { d: "M12 2v2", key: "tus03m" }],
    ["path", { d: "M17 20v2", key: "1rnc9c" }],
    ["path", { d: "M17 2v2", key: "11trls" }],
    ["path", { d: "M2 12h2", key: "1t8f8n" }],
    ["path", { d: "M2 17h2", key: "7oei6x" }],
    ["path", { d: "M2 7h2", key: "asdhe0" }],
    ["path", { d: "M20 12h2", key: "1q8mjw" }],
    ["path", { d: "M20 17h2", key: "1fpfkl" }],
    ["path", { d: "M20 7h2", key: "1o8tra" }],
    ["path", { d: "M7 20v2", key: "4gnj0m" }],
    ["path", { d: "M7 2v2", key: "1i4yhu" }],
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2", key: "1vbyd7" }],
    ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1", key: "z9xiuo" }]
  ];
  const Cpu = createLucideIcon("cpu", __iconNode$o);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$n = [
    ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
    ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
    ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
  ];
  const Database = createLucideIcon("database", __iconNode$n);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$m = [
    ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
    ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
    ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
  ];
  const Ellipsis = createLucideIcon("ellipsis", __iconNode$m);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$l = [
    [
      "path",
      {
        d: "M16 22h2a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v2.85",
        key: "ryk6xj"
      }
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
    ["path", { d: "M8 14v2.2l1.6 1", key: "6m4bie" }],
    ["circle", { cx: "8", cy: "16", r: "6", key: "10v15b" }]
  ];
  const FileClock = createLucideIcon("file-clock", __iconNode$l);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$k = [
    ["path", { d: "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4", key: "1nerag" }],
    ["path", { d: "M14 13.12c0 2.38 0 6.38-1 8.88", key: "o46ks0" }],
    ["path", { d: "M17.29 21.02c.12-.6.43-2.3.5-3.02", key: "ptglia" }],
    ["path", { d: "M2 12a10 10 0 0 1 18-6", key: "ydlgp0" }],
    ["path", { d: "M2 16h.01", key: "1gqxmh" }],
    ["path", { d: "M21.8 16c.2-2 .131-5.354 0-6", key: "drycrb" }],
    ["path", { d: "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2", key: "1tidbn" }],
    ["path", { d: "M8.65 22c.21-.66.45-1.32.57-2", key: "13wd9y" }],
    ["path", { d: "M9 6.8a6 6 0 0 1 9 5.2v2", key: "1fr1j5" }]
  ];
  const FingerprintPattern = createLucideIcon("fingerprint-pattern", __iconNode$k);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$j = [
    ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
    ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]
  ];
  const Gauge = createLucideIcon("gauge", __iconNode$j);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$i = [
    ["path", { d: "M10 16h.01", key: "1bzywj" }],
    [
      "path",
      {
        d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
        key: "18tbho"
      }
    ],
    ["path", { d: "M21.946 12.013H2.054", key: "zqlbp7" }],
    ["path", { d: "M6 16h.01", key: "1pmjb7" }]
  ];
  const HardDrive = createLucideIcon("hard-drive", __iconNode$i);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$h = [
    ["path", { d: "M2 5h20", key: "1fs1ex" }],
    ["path", { d: "M6 12h12", key: "8npq4p" }],
    ["path", { d: "M9 19h6", key: "456am0" }]
  ];
  const ListFilter = createLucideIcon("list-filter", __iconNode$h);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$g = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
  const LoaderCircle = createLucideIcon("loader-circle", __iconNode$g);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$f = [
    ["circle", { cx: "12", cy: "16", r: "1", key: "1au0dj" }],
    ["rect", { x: "3", y: "10", width: "18", height: "12", rx: "2", key: "6s8ecr" }],
    ["path", { d: "M7 10V7a5 5 0 0 1 10 0v3", key: "1pqi11" }]
  ];
  const LockKeyhole = createLucideIcon("lock-keyhole", __iconNode$f);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$e = [
    ["rect", { x: "16", y: "16", width: "6", height: "6", rx: "1", key: "4q2zg0" }],
    ["rect", { x: "2", y: "16", width: "6", height: "6", rx: "1", key: "8cvhb9" }],
    ["rect", { x: "9", y: "2", width: "6", height: "6", rx: "1", key: "1egb70" }],
    ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3", key: "1jsf9p" }],
    ["path", { d: "M12 12V8", key: "2874zd" }]
  ];
  const Network = createLucideIcon("network", __iconNode$e);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$d = [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
    ["path", { d: "M3 9h18", key: "1pudct" }],
    ["path", { d: "M9 21V9", key: "1oto5p" }]
  ];
  const PanelsTopLeft = createLucideIcon("panels-top-left", __iconNode$d);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$c = [
    ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
    ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
    ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
    ["path", { d: "M8 16H3v5", key: "1cv678" }]
  ];
  const RefreshCw = createLucideIcon("refresh-cw", __iconNode$c);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$b = [
    ["circle", { cx: "6", cy: "19", r: "3", key: "1kj8tv" }],
    ["path", { d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", key: "1d8sl" }],
    ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }]
  ];
  const Route = createLucideIcon("route", __iconNode$b);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$a = [
    ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", key: "w68u3i" }],
    ["path", { d: "M6.01 18H6", key: "19vcac" }],
    ["path", { d: "M10.01 18H10", key: "uamcmx" }],
    ["path", { d: "M15 10v4", key: "qjz1xs" }],
    ["path", { d: "M17.84 7.17a4 4 0 0 0-5.66 0", key: "1rif40" }],
    ["path", { d: "M20.66 4.34a8 8 0 0 0-11.31 0", key: "6a5xfq" }]
  ];
  const Router = createLucideIcon("router", __iconNode$a);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$9 = [
    ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2", key: "aa7l1z" }],
    ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2", key: "4qcy5o" }],
    ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2", key: "6vwrx8" }],
    ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2", key: "ioqczr" }],
    ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
    ["path", { d: "m16 16-1.9-1.9", key: "1dq9hf" }]
  ];
  const ScanSearch = createLucideIcon("scan-search", __iconNode$9);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$8 = [
    ["path", { d: "M15 12h-5", key: "r7krc0" }],
    ["path", { d: "M15 8h-5", key: "1khuty" }],
    ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4", key: "zz82l3" }],
    [
      "path",
      {
        d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
        key: "1ph1d7"
      }
    ]
  ];
  const ScrollText = createLucideIcon("scroll-text", __iconNode$8);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$7 = [
    ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
    ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
  ];
  const Search = createLucideIcon("search", __iconNode$7);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$6 = [
    ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2", key: "ngkwjq" }],
    ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2", key: "iecqi9" }],
    ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
    ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }]
  ];
  const Server = createLucideIcon("server", __iconNode$6);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$5 = [
    ["path", { d: "M14 17H5", key: "gfn3mx" }],
    ["path", { d: "M19 7h-9", key: "6i9tg" }],
    ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
    ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
  ];
  const Settings2 = createLucideIcon("settings-2", __iconNode$5);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$4 = [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
        key: "oel41y"
      }
    ],
    ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
  ];
  const ShieldCheck = createLucideIcon("shield-check", __iconNode$4);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$3 = [
    ["path", { d: "M10 11v6", key: "nco0om" }],
    ["path", { d: "M14 11v6", key: "outv1u" }],
    ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
  ];
  const Trash2 = createLucideIcon("trash-2", __iconNode$3);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$2 = [
    [
      "path",
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        key: "wmoenq"
      }
    ],
    ["path", { d: "M12 9v4", key: "juzpu7" }],
    ["path", { d: "M12 17h.01", key: "p32p05" }]
  ];
  const TriangleAlert = createLucideIcon("triangle-alert", __iconNode$2);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode$1 = [
    ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
    ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
    ["path", { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" }]
  ];
  const UsersRound = createLucideIcon("users-round", __iconNode$1);
  /**
   * @license lucide-react v1.24.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const __iconNode = [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ];
  const X = createLucideIcon("x", __iconNode);
  const CPU_THRESHOLD = 85;
  const MEMORY_THRESHOLD = 85;
  const DISK_THRESHOLD = 90;
  function finite$2(value) {
    if (value === null || value === void 0 || value === "") return null;
    const number2 = Number(value);
    return Number.isFinite(number2) ? number2 : null;
  }
  function wanRows$2(snapshot) {
    if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
    return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function timestampOf(value) {
    const numeric = finite$2(value);
    if (numeric !== null) return numeric < 1e12 ? numeric * 1e3 : numeric;
    return parseRfc3339Timestamp(value);
  }
  function currentRates(snapshot) {
    const rows2 = wanRows$2(snapshot).filter((row) => row.running !== false && row.disabled !== true);
    if (!rows2.length) return null;
    let down = 0;
    let up = 0;
    for (const row of rows2) {
      const rowDown = finite$2(row.downRate);
      const rowUp = finite$2(row.upRate);
      if (rowDown === null || rowUp === null) return null;
      down += rowDown;
      up += rowUp;
    }
    return { down, up };
  }
  function closeObservation(left, right) {
    return Math.abs(left - right) <= Math.max(1, Math.abs(right) * 0.01);
  }
  function currentTrafficInstrument(rates, title, points = []) {
    const currentDown = formatRate(rates.down);
    const currentUp = formatRate(rates.up);
    const peak = Math.max(rates.down, rates.up);
    const boundary = title === "接口异常期间的 WAN 吞吐" ? "；该读数不证明 Down 接口无影响" : "";
    return {
      status: "accumulating",
      title,
      windowLabel: "当前采样",
      sampleCount: points.length,
      points,
      currentDown,
      currentUp,
      peak: formatRate(peak),
      accessibleSummary: `当前完整 WAN 观测，下载 ${currentDown}，上传 ${currentUp}；尚无足够同窗样本形成趋势${boundary}。`
    };
  }
  function buildTrafficInstrument(snapshot, mode, risk) {
    var _a, _b;
    if (mode !== "current" || risk !== "none" && risk !== "interfaces") return null;
    const title = risk === "interfaces" ? "接口异常期间的 WAN 吞吐" : "WAN 双向吞吐";
    const rates = currentRates(snapshot);
    if (!rates) return null;
    const history = ((_a = snapshot.overview) == null ? void 0 : _a.history) || {};
    const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
    const down = Array.isArray(history.downlink) ? history.downlink : [];
    const up = Array.isArray(history.uplink) ? history.uplink : [];
    const length = Math.min(timestamps.length, down.length, up.length);
    const points = [];
    for (let offset = length; offset > 0; offset -= 1) {
      const timestamp = timestampOf(timestamps[timestamps.length - offset]);
      const pointDown = finite$2(down[down.length - offset]);
      const pointUp = finite$2(up[up.length - offset]);
      if (timestamp !== null && pointDown !== null && pointUp !== null) points.push({ timestamp, down: pointDown, up: pointUp });
    }
    if (!points.length) return currentTrafficInstrument(rates, title);
    const last = points[points.length - 1];
    if (!closeObservation(last.down, rates.down) || !closeObservation(last.up, rates.up)) return currentTrafficInstrument(rates, title);
    const snapshotAt = timestampOf(snapshot.updatedAt);
    const maxAge = Math.max(12e4, Number(((_b = snapshot.meta) == null ? void 0 : _b.pollSeconds) || 5) * 3e3);
    if (snapshotAt !== null && Math.abs(snapshotAt - last.timestamp) > maxAge) return currentTrafficInstrument(rates, title);
    const durationSeconds = Math.max(0, Math.round((last.timestamp - points[0].timestamp) / 1e3));
    const windowLabel = durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒`;
    const peak = Math.max(...points.flatMap((point) => [point.down, point.up]), rates.down, rates.up);
    const currentDown = formatRate(rates.down);
    const currentUp = formatRate(rates.up);
    return {
      status: points.length >= 2 ? "ready" : "accumulating",
      title,
      windowLabel,
      sampleCount: points.length,
      points,
      currentDown,
      currentUp,
      peak: formatRate(peak),
      accessibleSummary: `${windowLabel}，${points.length} 个当前样本，最新下载 ${currentDown}，最新上传 ${currentUp}，窗口峰值 ${formatRate(peak)}${risk === "interfaces" ? "；该趋势不证明 Down 接口无影响" : ""}。`
    };
  }
  function validPercentage(value) {
    const number2 = finite$2(value);
    return number2 !== null && number2 >= 0 && number2 <= 100 ? number2 : null;
  }
  function buildResourceInstrument(snapshot, state2, risk) {
    var _a, _b;
    if (risk !== "resource") return null;
    const metrics = [
      { key: "cpu", label: "CPU", value: state2.facts.resource.cpu, threshold: CPU_THRESHOLD },
      { key: "memory", label: "内存", value: state2.facts.resource.memory, threshold: MEMORY_THRESHOLD },
      { key: "disk", label: "磁盘", value: state2.facts.resource.disk, threshold: DISK_THRESHOLD }
    ];
    const history = ((_a = snapshot.overview) == null ? void 0 : _a.history) || {};
    const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
    const cpu = Array.isArray(history.cpu) ? history.cpu : [];
    const memory = Array.isArray(history.memory) ? history.memory : [];
    const disk = Array.isArray(history.disk) ? history.disk : [];
    const length = Math.min(timestamps.length, cpu.length, memory.length, disk.length);
    let points = [];
    for (let offset = length; offset > 0; offset -= 1) {
      const timestamp = timestampOf(timestamps[timestamps.length - offset]);
      const cpuValue = validPercentage(cpu[cpu.length - offset]);
      const memoryValue = validPercentage(memory[memory.length - offset]);
      const diskValue = validPercentage(disk[disk.length - offset]);
      if (timestamp === null || cpuValue === null || memoryValue === null || diskValue === null || points.length > 0 && timestamp <= points[points.length - 1].timestamp) continue;
      points.push({ timestamp, cpu: cpuValue, memory: memoryValue, disk: diskValue });
    }
    if (points.length) {
      const latest = points[points.length - 1];
      const snapshotAt = timestampOf(snapshot.updatedAt);
      const maxAge = Math.max(12e4, Number(((_b = snapshot.meta) == null ? void 0 : _b.pollSeconds) || 5) * 3e3);
      const matchesCurrent = Math.abs(latest.cpu - metrics[0].value) <= 1 && Math.abs(latest.memory - metrics[1].value) <= 1 && Math.abs(latest.disk - metrics[2].value) <= 1;
      const isCurrent = snapshotAt === null || Math.abs(snapshotAt - latest.timestamp) <= maxAge;
      if (!matchesCurrent || !isCurrent) points = [];
    }
    const durationSeconds = points.length >= 2 ? Math.max(0, Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1e3)) : 0;
    const windowLabel = points.length >= 2 ? durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒` : "当前采样";
    return {
      status: points.length >= 2 ? "ready" : "accumulating",
      windowLabel,
      sampleCount: points.length,
      metrics,
      points,
      accessibleSummary: metrics.map((metric) => `${metric.label} ${Math.round(metric.value)}%，策略阈值 ${metric.threshold}%`).join("；")
    };
  }
  function clean$1(value, fallback = "未记录") {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }
  function finite$1(value) {
    if (value === null || value === void 0 || value === "") return null;
    const number2 = Number(value);
    return Number.isFinite(number2) ? number2 : null;
  }
  function wanRows$1(snapshot) {
    if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
    return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function defaultRoutes(snapshot) {
    var _a, _b;
    if (Array.isArray((_a = snapshot.routes) == null ? void 0 : _a.defaultRoutes)) return snapshot.routes.defaultRoutes;
    if (!Array.isArray((_b = snapshot.routes) == null ? void 0 : _b.items)) return [];
    return snapshot.routes.items.filter(
      (route) => route.default === true || route.dstAddress === "0.0.0.0/0" || route.dstAddress === "::/0"
    );
  }
  function activeDefaultRoute(snapshot) {
    return defaultRoutes(snapshot).find((route) => route.active === true && route.disabled !== true) || null;
  }
  function evidenceMode$1(snapshot, state2) {
    if (isSnapshotUnavailable(snapshot) || state2.facts.freshness.credibility === "unavailable") return "unavailable";
    if (!latestBusinessSuccessTime(snapshot)) return "unavailable";
    const meta = snapshot.meta || {};
    if (meta.clientEvidenceBoundary || meta.realtimeError || meta.slowRestError || meta.staticError || state2.facts.freshness.stale || state2.facts.freshness.history || state2.facts.freshness.credibility === "cache") return "historical";
    return "current";
  }
  function evidenceBoundary(snapshot, state2, mode) {
    const successfulAt = latestBusinessSuccessTime(snapshot);
    const successLabel = successfulAt ? shortTimestamp(successfulAt) : "成功时间未记录";
    if (mode === "current") return {
      label: "当前证据",
      time: successLabel,
      note: "业务采样完整",
      tone: "trust"
    };
    if (mode === "historical") return {
      label: "历史证据",
      time: successLabel === "成功时间未记录" ? successLabel : `上次成功 ${successLabel}`,
      note: "当前变化不可见",
      tone: "warn"
    };
    return {
      label: "证据不可用",
      time: successLabel,
      note: "不作当前业务判断",
      tone: "danger"
    };
  }
  function deviceIdentity(snapshot, state2, mode) {
    var _a, _b, _c;
    const target = clean$1(((_a = snapshot.meta) == null ? void 0 : _a.routerHost) || ((_b = snapshot.meta) == null ? void 0 : _b.target), "");
    const device = clean$1(((_c = snapshot.meta) == null ? void 0 : _c.configuredIdentity) || state2.facts.device.identity || target, "RouterOS");
    const version = mode === "unavailable" || state2.facts.device.version === "-" ? "" : `RouterOS ${state2.facts.device.version}`;
    return { device, note: [version, target ? `目标 ${target}` : ""].filter(Boolean).join(" · ") };
  }
  function resourceSampleStats(snapshot) {
    var _a;
    const history = ((_a = snapshot.overview) == null ? void 0 : _a.history) || {};
    const series = [history.cpu, history.memory, history.disk].map((value) => Array.isArray(value) ? value : []);
    const total = Math.max(...series.map((values) => values.length), 0);
    const observed = [];
    for (let index = 0; index < total; index += 1) {
      const cpu = finite$1(series[0][index]);
      const memory = finite$1(series[1][index]);
      const disk = finite$1(series[2][index]);
      if (cpu === null && memory === null && disk === null) {
        observed.push(null);
        continue;
      }
      observed.push(
        cpu !== null && cpu >= CPU_THRESHOLD || memory !== null && memory >= MEMORY_THRESHOLD || disk !== null && disk >= DISK_THRESHOLD
      );
    }
    let trailing = 0;
    for (let index = observed.length - 1; index >= 0 && observed[index] === true; index -= 1) trailing += 1;
    return {
      observed: observed.filter((value) => value !== null).length,
      exceeded: observed.filter((value) => value === true).length,
      trailing
    };
  }
  function riskOf(mode, state2, route) {
    if (mode === "unavailable") return "evidence";
    if (mode === "historical") return "collection";
    if (state2.facts.wan.total > 0 && state2.facts.wan.online === 0) return "wan";
    if (state2.facts.resource.level === "danger") return "resource";
    if (state2.facts.interfaces.down > 0) return "interfaces";
    if (!route) return "route";
    return "none";
  }
  function fact(key, label, value, tone, note = "") {
    return { key, label, value, tone, ...note ? { note } : {} };
  }
  function factsFor(snapshot, state2, mode, risk, route) {
    var _a, _b, _c;
    const rest = state2.facts.collection.rest;
    const ssh = state2.facts.collection.ssh;
    const routeVerified = mode === "current" && Boolean(route);
    const targetKnown = Boolean(((_a = snapshot.meta) == null ? void 0 : _a.routerHost) || ((_b = snapshot.meta) == null ? void 0 : _b.target) || ((_c = snapshot.meta) == null ? void 0 : _c.configuredIdentity));
    const success = latestBusinessSuccessTime(snapshot);
    if (risk === "evidence") return [
      fact("snapshot", "当前快照", "不可用", "danger", "业务数字已隐藏"),
      fact("target", "配置目标", targetKnown ? "已识别" : "未记录", targetKnown ? "trust" : "missing", "身份独立于快照"),
      fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", success ? "仅作历史参考" : "不回退尝试时间")
    ];
    if (risk === "collection") return [
      fact(
        "collection-channels",
        "可用通道",
        `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`,
        rest.status === "current" || ssh.status === "current" ? "warn" : "danger",
        "REST + SSH"
      ),
      fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", "不代表当前状态"),
      fact(
        "failed-endpoints",
        "失败端点",
        state2.facts.failures.count ? `已记录 ${state2.facts.failures.count}` : "未记录",
        state2.facts.failures.count ? "warn" : "missing",
        "未记录不等于没有故障"
      )
    ];
    if (risk === "wan") return [
      fact("wan", "WAN 运行", `0 / ${state2.facts.wan.total}`, "danger", "当前对象"),
      fact("route", "活动默认路由", "0", "danger", "没有明确活动记录"),
      fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH")
    ];
    if (risk === "resource") {
      const samples = resourceSampleStats(snapshot);
      const breached = [
        state2.facts.resource.cpu >= CPU_THRESHOLD,
        state2.facts.resource.memory >= MEMORY_THRESHOLD,
        state2.facts.resource.disk >= DISK_THRESHOLD
      ].filter(Boolean).length;
      return [
        fact("resource-breaches", "超阈值", `${breached} / 3`, breached ? "danger" : "trust", "按资源策略判定"),
        fact("resource-trailing", "尾部连续", samples.observed ? `${samples.trailing} 个` : "未取得", samples.trailing ? "danger" : "missing", "不是超限总数"),
        fact("resource-samples", "有效样本", samples.observed ? `${samples.observed} 个` : "未取得", samples.observed ? "trust" : "missing", "当前采样序列")
      ];
    }
    if (risk === "interfaces") return [
      fact("interfaces", "接口 Down", `${state2.facts.interfaces.down} / ${state2.facts.interfaces.total}`, "danger", "当前对象"),
      fact("route", "默认路由", routeVerified ? "已核实" : "无法核实", routeVerified ? "trust" : "warn", routeVerified ? "明确活动记录" : "无明确活动记录"),
      fact("wan", "WAN 范围", `${state2.facts.wan.online} / ${state2.facts.wan.total}`, state2.facts.wan.online ? "trust" : "danger", "运行对象")
    ];
    if (risk === "route") return [
      fact("route", "默认路由", "无法核实", "warn", "无明确活动记录"),
      fact("wan", "WAN 运行", `${state2.facts.wan.online} / ${state2.facts.wan.total}`, state2.facts.wan.online ? "trust" : "warn", "对象状态"),
      fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH")
    ];
    if (state2.scale === "fleet") {
      const runningInterfaces = Math.max(0, state2.facts.interfaces.total - state2.facts.interfaces.down);
      return [
        fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
        fact("wan", "WAN 运行", `${state2.facts.wan.online} / ${state2.facts.wan.total}`, "trust", "多对象范围"),
        fact("interfaces", "接口运行", `${runningInterfaces} / ${state2.facts.interfaces.total}`, "trust", "本次采样")
      ];
    }
    return [
      fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
      fact("wan", "WAN 运行", `${state2.facts.wan.online} / ${state2.facts.wan.total}`, "trust", "当前对象"),
      fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH")
    ];
  }
  function verdictFor(state2, mode, risk, route) {
    if (risk === "evidence") return { label: "判断边界", title: "当前业务状态不可判断", summary: "没有可用于当前判断的业务快照。", tone: "danger" };
    if (risk === "collection") {
      const partial = state2.facts.collection.rest.status === "current" || state2.facts.collection.ssh.status === "current";
      return { label: "证据已降级", title: partial ? "采集通道部分可用" : "当前变化不可见", summary: "仅保留历史对照；不代表当前业务。", tone: "warn" };
    }
    if (risk === "wan") return { label: "出口中断", title: `全部 ${state2.facts.wan.total} 条 WAN 未运行`, summary: "无活动默认路由；先查链路、认证与上游。", tone: "danger" };
    if (risk === "resource") return { label: "资源压力", title: "资源策略已触发", summary: "资源超限已持续；不推断网络中断。", tone: "danger" };
    if (risk === "interfaces") return { label: "转发对象异常", title: `${state2.facts.interfaces.down} 个接口未运行`, summary: route ? "默认路由仍有记录；先核对 Down 接口。" : "当前证据无法核实默认路由。", tone: "danger" };
    if (risk === "route") return { label: "出口证据不完整", title: "默认路由无法核实", summary: "WAN 有记录；无明确活动默认路由。", tone: "warn" };
    return {
      label: state2.scale === "fleet" ? "多对象巡检" : "当前运行判断",
      title: "出口路径已核实",
      summary: "默认路由与 WAN 一致；未探测外部业务。",
      tone: "trust"
    };
  }
  function collectionObjects(state2) {
    const channels = [
      { key: "rest", name: "REST", channel: state2.facts.collection.rest, source: "meta.realtime + meta.slowRest" },
      { key: "ssh", name: "SSH", channel: state2.facts.collection.ssh, source: "meta.static" }
    ];
    const rows2 = channels.filter(({ channel }) => channel.status !== "current").map(({ key, name, channel, source }) => ({
      id: `collection:${key}`,
      category: "采集通道",
      name,
      state: channel.label,
      reason: channel.error ? clean$1(channel.error) : "没有明确成功记录",
      tone: channel.status === "unavailable" ? "missing" : "danger",
      route: "readonlyDiagnostics",
      sourcePath: source,
      attributes: [
        { label: "通道状态", value: channel.label },
        { label: "最近成功", value: channel.successAt ? shortTimestamp(channel.successAt) : "未记录" },
        { label: "错误记录", value: channel.error ? clean$1(channel.error) : "未记录" }
      ]
    }));
    return rows2.length ? rows2 : [{
      id: "collection:boundary",
      category: "证据边界",
      name: "业务快照",
      state: "历史",
      reason: "客户端已停止当前状态声明",
      tone: "warn",
      route: "readonlyDiagnostics",
      sourcePath: "meta.clientEvidenceBoundary",
      attributes: [
        { label: "REST", value: state2.facts.collection.rest.label },
        { label: "SSH", value: state2.facts.collection.ssh.label },
        { label: "业务证据", value: "仅作历史参考" }
      ]
    }];
  }
  function priorityObjectsFor(snapshot, state2, risk) {
    var _a, _b;
    if (risk === "evidence" || risk === "collection") {
      const rows2 = collectionObjects(state2);
      return { total: rows2.length, rows: rows2 };
    }
    if (risk === "wan") {
      const rows2 = wanRows$1(snapshot).filter((row) => row.running === false);
      return {
        total: rows2.length,
        rows: rows2.map((row, index) => ({
          id: `wan:${index}:${clean$1(row.name || row.interface)}`,
          category: "WAN",
          name: clean$1(row.name || row.interface, `WAN ${index + 1}`),
          state: "未运行",
          reason: `${clean$1(row.parent, "父接口未记录")} · 无活动默认路由`,
          tone: "danger",
          route: "lineStatus",
          sourcePath: `wan[${index}]`,
          attributes: [
            { label: "父接口", value: clean$1(row.parent) },
            { label: "接入方式", value: clean$1(row.access) },
            { label: "地址", value: clean$1(row.address) }
          ]
        }))
      };
    }
    if (risk === "interfaces") {
      const rows2 = (snapshot.interfaces || []).filter((row) => row.running === false);
      return {
        total: rows2.length,
        rows: rows2.map((row, index) => ({
          id: `interface:${index}:${clean$1(row.name || row.interface)}`,
          category: "接口",
          name: clean$1(row.name || row.interface, `接口 ${index + 1}`),
          state: row.disabled === true ? "已停用" : "未运行",
          reason: `${clean$1(row.parent || row.master, "父级未记录")} · 依赖关系待核对`,
          tone: "danger",
          route: "interfaces",
          sourcePath: `interfaces[${(snapshot.interfaces || []).indexOf(row)}]`,
          attributes: [
            { label: "父级", value: clean$1(row.parent || row.master) },
            { label: "类型", value: clean$1(row.type || row.role) },
            { label: "VLAN", value: clean$1(row.vlan || row.vlanId) }
          ]
        }))
      };
    }
    if (risk === "resource") {
      const samples = resourceSampleStats(snapshot);
      return {
        total: 1,
        rows: [{
          id: "resource:system",
          category: "系统资源",
          name: clean$1(state2.facts.device.identity, "RouterOS"),
          state: samples.trailing ? "持续超限" : "策略命中",
          reason: samples.observed ? "检查连接压力、接口吞吐与原始采样" : "检查资源对象与采集完整性",
          tone: "danger",
          route: "trafficLoad",
          sourcePath: "overview + overview.history",
          attributes: [
            { label: "连接总量", value: finite$1((_a = snapshot.connections) == null ? void 0 : _a.total) === null ? "未记录" : Number((_b = snapshot.connections) == null ? void 0 : _b.total).toLocaleString("zh-CN") },
            { label: "尾部连续", value: samples.observed ? `${samples.trailing} 个` : "未取得" },
            { label: "有效样本", value: samples.observed ? `${samples.observed} 个` : "未取得" }
          ]
        }]
      };
    }
    if (risk === "route") return {
      total: 1,
      rows: [{
        id: "route:unverified",
        category: "默认路由",
        name: "活动出口",
        state: "未核实",
        reason: "没有 active=true 且未停用的默认路由",
        tone: "warn",
        route: "routes",
        sourcePath: "routes.defaultRoutes",
        attributes: [
          { label: "默认路由记录", value: `${defaultRoutes(snapshot).length} 条` },
          { label: "WAN 运行", value: `${state2.facts.wan.online} / ${state2.facts.wan.total}` },
          { label: "活动标记", value: "未发现 active=true" }
        ]
      }]
    };
    return { total: 0, rows: [] };
  }
  function focusObjectFor(mode, risk, route) {
    if (mode !== "current" || risk !== "none" || !route) return null;
    return {
      id: "route:active-default",
      category: "活动出口",
      name: clean$1(route.gateway, "网关未记录"),
      note: `${clean$1(route.dstAddress, "0.0.0.0/0")} · 明确 active=true 且未停用`,
      tone: "trust",
      route: "routes",
      sourcePath: "routes.defaultRoutes",
      attributes: [
        { label: "路由表", value: clean$1(route.table || route.routingTable, "main") },
        { label: "网关", value: clean$1(route.gateway) },
        { label: "distance", value: clean$1(route.distance) }
      ]
    };
  }
  function evidenceRows(snapshot, state2) {
    var _a, _b;
    const target = clean$1(((_a = snapshot.meta) == null ? void 0 : _a.routerHost) || ((_b = snapshot.meta) == null ? void 0 : _b.target));
    const success = latestBusinessSuccessTime(snapshot);
    return [
      { key: "target", label: "采集目标", value: target, note: "只读连接", tone: target === "未记录" ? "missing" : "trust" },
      { key: "success", label: "业务成功", value: success ? shortTimestamp(success) : "未记录", note: "不使用尝试时间兜底", tone: success ? "trust" : "missing" },
      { key: "failures", label: "失败端点", value: state2.facts.failures.count ? `已记录 ${state2.facts.failures.count}` : "未记录", note: "未记录不等于没有故障", tone: state2.facts.failures.count ? "warn" : "missing" },
      { key: "boundary", label: "操作边界", value: "只读监控", note: "不会修改 RouterOS 配置", tone: "trust" }
    ];
  }
  function buildOverviewEvidenceModel(snapshot, state2) {
    const mode = evidenceMode$1(snapshot, state2);
    const route = activeDefaultRoute(snapshot);
    const risk = riskOf(mode, state2, route);
    const evidence = evidenceBoundary(snapshot, state2, mode);
    const identity = deviceIdentity(snapshot, state2, mode);
    const verdict = verdictFor(state2, mode, risk, route);
    const priority = priorityObjectsFor(snapshot, state2, risk);
    return {
      scenario: state2.scenario,
      risk,
      evidenceMode: mode,
      evidenceLabel: evidence.label,
      evidenceTime: evidence.time,
      evidenceNote: evidence.note,
      evidenceTone: evidence.tone,
      device: identity.device,
      deviceNote: identity.note,
      verdictLabel: verdict.label,
      verdictTitle: verdict.title,
      verdictSummary: verdict.summary,
      verdictTone: verdict.tone,
      facts: factsFor(snapshot, state2, mode, risk, route),
      priorityLabel: priority.total ? "优先处理" : "",
      priorityObjects: priority.rows.slice(0, 3),
      priorityObjectsAll: priority.rows,
      priorityTotal: priority.total,
      focusObject: focusObjectFor(mode, risk, route),
      traffic: buildTrafficInstrument(snapshot, mode, risk),
      resource: buildResourceInstrument(snapshot, state2, risk),
      evidenceRows: evidenceRows(snapshot, state2)
    };
  }
  function MobileFocusObject({ object, onOpen }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-focus", "data-mobile-focus-object": object.id, "aria-labelledby": "mp-focus-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "活动对象" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-focus-title", children: object.category })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { "aria-hidden": "true", size: 19 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-focus-identity", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: object.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: object.note })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { children: object.attributes.map((attribute) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: attribute.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: attribute.value })
      ] }, attribute.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-mobile-destination": object.route, onClick: onOpen, children: [
        "检查路由证据",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
      ] })
    ] });
  }
  function patrolActions(risk) {
    if (risk === "evidence" || risk === "collection") {
      return [
        { route: "readonlyDiagnostics", label: "验证采集边界", note: "REST、SSH 与业务快照", icon: "diagnostic" },
        { route: "logs", label: "检查失败记录", note: "定位最近采集错误", icon: "logs" },
        { route: "more", label: "打开工具目录", note: "服务、DNS 与审计入口", icon: "more" }
      ];
    }
    if (risk === "wan") {
      return [
        { route: "lineStatus", label: "检查 WAN 对象", note: "运行、地址与父接口", icon: "network" },
        { route: "routes", label: "核对默认路由", note: "活动标记、网关与距离", icon: "route" },
        { route: "logs", label: "查看网络事件", note: "确认故障出现时间", icon: "logs" }
      ];
    }
    if (risk === "interfaces") {
      return [
        { route: "interfaces", label: "检查接口对象", note: "运行状态与依赖关系", icon: "network" },
        { route: "lineStatus", label: "核对 WAN 关联", note: "确认出口是否受影响", icon: "route" },
        { route: "logs", label: "查看接口事件", note: "定位状态变化时间", icon: "logs" }
      ];
    }
    if (risk === "resource") {
      return [
        { route: "trafficLoad", label: "进入资源负载", note: "当前压力与接口吞吐", icon: "resource" },
        { route: "loadAudit", label: "检查采样审计", note: "阈值、连续性与原始样本", icon: "diagnostic" },
        { route: "trafficAudit", label: "核对流量对象", note: "协议与高吞吐来源", icon: "network" }
      ];
    }
    if (risk === "route") {
      return [
        { route: "routes", label: "检查路由表", note: "查找活动默认路由", icon: "route" },
        { route: "lineStatus", label: "核对 WAN 状态", note: "确认可承载出口", icon: "network" },
        { route: "readonlyDiagnostics", label: "验证只读证据", note: "区分不可达与未采集", icon: "diagnostic" }
      ];
    }
    return [
      { route: "lineStatus", label: "巡检 WAN 线路", note: "出口对象与当前吞吐", icon: "network" },
      { route: "routes", label: "核对默认路由", note: "活动路径与网关", icon: "route" },
      { route: "readonlyDiagnostics", label: "查看只读诊断", note: "采集链路与证据边界", icon: "diagnostic" }
    ];
  }
  function PatrolActionGlyph({ icon }) {
    if (icon === "diagnostic") return /* @__PURE__ */ jsxRuntimeExports.jsx(ScanSearch, { "aria-hidden": "true", size: 18 });
    if (icon === "logs") return /* @__PURE__ */ jsxRuntimeExports.jsx(FileClock, { "aria-hidden": "true", size: 18 });
    if (icon === "network") return /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { "aria-hidden": "true", size: 18 });
    if (icon === "route") return /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { "aria-hidden": "true", size: 18 });
    if (icon === "more") return /* @__PURE__ */ jsxRuntimeExports.jsx(PanelsTopLeft, { "aria-hidden": "true", size: 18 });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Gauge, { "aria-hidden": "true", size: 18 });
  }
  function MobilePatrolActions({
    risk,
    onNavigate
  }) {
    const actions = patrolActions(risk);
    const steady = risk === "none";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-actions", "data-mobile-patrol-actions": true, "aria-labelledby": "mp-actions-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: steady ? "巡检入口" : "处置入口" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-actions-title", children: steady ? "继续核对关键对象" : "沿证据继续检查" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: actions.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mp-action-list", children: actions.map((action) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "data-mobile-patrol-action": action.route,
          "data-mobile-destination": action.route,
          onClick: () => onNavigate(action.route),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-action-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PatrolActionGlyph, { icon: action.icon }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: action.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: action.note })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
          ]
        },
        action.route
      )) })
    ] });
  }
  function IncidentRow({
    object,
    onOpen,
    selected
  }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        className: `mp-incident-row is-${object.tone} ${selected ? "is-selected" : ""}`,
        type: "button",
        "aria-pressed": selected === void 0 ? void 0 : selected,
        onClick: onOpen,
        "aria-label": `${object.category} ${object.name}，${object.state}。${object.reason}`,
        "data-mobile-incident-object": object.id,
        "data-mobile-incident-route": object.route,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-incident-mark", "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mp-incident-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: object.category }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: object.name })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: object.state }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: object.reason })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 18 })
        ]
      }
    );
  }
  function IncidentInspector({ object, onOpen }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-inspector", "data-mobile-incident-inspector": object.id, "aria-labelledby": "mp-inspector-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "所选对象" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-inspector-title", children: object.name })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ScanSearch, { "aria-hidden": "true", size: 19 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: object.state }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: object.reason })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { children: object.attributes.map((attribute) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: attribute.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: attribute.value })
      ] }, attribute.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-inspector-source", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "采样来源" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: object.sourcePath })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-mobile-destination": object.route, onClick: onOpen, children: [
        "进入",
        object.category,
        "工作区",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
      ] })
    ] });
  }
  function polyline$1(points, key) {
    if (points.length < 2) return "";
    const peak = Math.max(1, ...points.flatMap((point) => [point.down, point.up]));
    return points.map((point, index) => {
      const x = 4 + index / (points.length - 1) * 312;
      const y = 84 - point[key] / peak * 76;
      return `${x.toFixed(1)},${Math.max(6, y).toFixed(1)}`;
    }).join(" ");
  }
  function axisTime$1(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(timestamp));
  }
  function MobilePatrolTraffic({ traffic, onOpen }) {
    const chartReady = traffic.status === "ready" && traffic.points.length >= 2;
    const windowText = chartReady ? `${traffic.windowLabel} · ${traffic.sampleCount} 点` : "当前读数 · 趋势待采样";
    const down = polyline$1(traffic.points, "down");
    const up = polyline$1(traffic.points, "up");
    const startTime = chartReady ? axisTime$1(traffic.points[0].timestamp) : "";
    const endTime = chartReady ? axisTime$1(traffic.points[traffic.points.length - 1].timestamp) : "";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-traffic", "data-mobile-traffic": traffic.status, "aria-labelledby": "mp-traffic-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "WAN 信号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-traffic-title", children: traffic.title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-window", children: windowText })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mp-traffic-body ${chartReady ? "is-ready" : "is-accumulating"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-rate-pair", "aria-label": traffic.accessibleSummary, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { "aria-hidden": "true", size: 16 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "下载" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.currentDown })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { "aria-hidden": "true", size: 16 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "上传" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.currentUp })
          ] })
        ] }),
        chartReady ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-chart", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mp-chart-scale", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.peak }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "0" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "svg",
            {
              viewBox: "0 0 320 92",
              preserveAspectRatio: "xMidYMid meet",
              role: "img",
              "aria-labelledby": "mp-traffic-chart-title mp-traffic-chart-desc",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("title", { id: "mp-traffic-chart-title", children: "WAN 上传与下载趋势" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("desc", { id: "mp-traffic-chart-desc", children: [
                  traffic.accessibleSummary,
                  "，纵轴从 0 到 ",
                  traffic.peak,
                  "，横轴从 ",
                  startTime,
                  " 到 ",
                  endTime,
                  "。"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "mp-chart-grid", d: "M4 12H316 M4 48H316 M4 84H316" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "mp-chart-down", points: down }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "mp-chart-up", points: up })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mp-chart-time", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: startTime }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: endTime })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-chart-pending", "aria-label": traffic.accessibleSummary, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartNoAxesCombined, { "aria-hidden": "true", size: 18 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "趋势正在形成" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "至少需要两个同窗完整样本" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { children: [
        chartReady ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-down", "aria-hidden": "true" }),
            "下载"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-up", "aria-hidden": "true" }),
            "上传"
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "完整样本 ",
          traffic.sampleCount,
          " / 2"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "峰值 ",
          traffic.peak
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", "data-mobile-destination": "trafficLoad", onClick: onOpen, children: "流量明细" })
      ] })
    ] });
  }
  const ICONS = {
    cpu: Cpu,
    memory: Database,
    disk: HardDrive
  };
  function polyline(points, key) {
    if (points.length < 2) return "";
    return points.map((point, index) => {
      const x = 4 + index / (points.length - 1) * 312;
      const y = 4 + (100 - point[key]) / 100 * 52;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }
  function axisTime(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(timestamp));
  }
  function MobileResourcePressure({ resource }) {
    const chartReady = resource.status === "ready" && resource.points.length >= 2;
    const startTime = chartReady ? axisTime(resource.points[0].timestamp) : "";
    const endTime = chartReady ? axisTime(resource.points[resource.points.length - 1].timestamp) : "";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-resource", "data-mobile-resource-signal": resource.status, "aria-labelledby": "mp-resource-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "资源信号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-resource-title", children: "当前压力与策略阈值" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-window", children: chartReady ? `${resource.windowLabel} · ${resource.sampleCount} 点` : "当前采样" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mp-resource-metrics", "aria-label": resource.accessibleSummary, children: resource.metrics.map((metric) => {
        const Icon2 = ICONS[metric.key];
        const value = Math.max(0, Math.min(100, metric.value));
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 17 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: metric.label })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: "mp-resource-meter",
              role: "meter",
              "aria-label": `${metric.label} ${Math.round(metric.value)}%，策略阈值 ${metric.threshold}%`,
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-valuenow": Math.round(metric.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("i", { style: { width: `${value}%` } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("em", { style: { left: `${metric.threshold}%` } })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
            Math.round(metric.value),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
            "阈值 ",
            metric.threshold,
            "%"
          ] })
        ] }, metric.key);
      }) }),
      chartReady ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-resource-chart", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mp-resource-scale", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "100%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "50%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "0" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "svg",
            {
              viewBox: "0 0 320 60",
              preserveAspectRatio: "xMidYMid meet",
              role: "img",
              "aria-labelledby": "mp-resource-chart-title mp-resource-chart-desc",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("title", { id: "mp-resource-chart-title", children: "CPU、内存与磁盘压力趋势" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("desc", { id: "mp-resource-chart-desc", children: [
                  resource.accessibleSummary,
                  "；纵轴为 0 到 100%，横轴从 ",
                  startTime,
                  " 到 ",
                  endTime,
                  "。"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "mp-resource-grid", d: "M4 4H316 M4 30H316 M4 56H316" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "mp-resource-threshold", d: "M4 9.2H316 M4 11.8H316" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "is-cpu", points: polyline(resource.points, "cpu") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "is-memory", points: polyline(resource.points, "memory") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "is-disk", points: polyline(resource.points, "disk") })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mp-resource-time", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: startTime }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: endTime })
          ] })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mp-resource-pending", children: "只有当前完整资源采样；至少两个带时间样本后才绘制趋势。" }),
      chartReady ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-resource-samples", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "样本明细" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            resource.points.length,
            " 条"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { "aria-label": "资源压力时间序列样本", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "时间" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPU" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "内存" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "磁盘" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: resource.points.slice(-6).map((point) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: axisTime(point.timestamp) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              Math.round(point.cpu),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              Math.round(point.memory),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              Math.round(point.disk),
              "%"
            ] })
          ] }, point.timestamp)) })
        ] })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-cpu" }),
          "CPU"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-memory" }),
          "内存"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-disk" }),
          "磁盘"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "is-threshold" }),
          "策略阈值"
        ] })
      ] })
    ] });
  }
  function VerdictIcon$1({ tone }) {
    if (tone === "danger") return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { "aria-hidden": "true", size: 22 });
    if (tone === "warn" || tone === "missing") return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { "aria-hidden": "true", size: 22 });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { "aria-hidden": "true", size: 22 });
  }
  function observedCount(value) {
    const number2 = Number(value);
    return Number.isFinite(number2) ? number2 : null;
  }
  function MobilePatrolScreen({
    snapshot,
    state: state2,
    onNavigate,
    runtimeManaged = false
  }) {
    var _a;
    const model = reactExports.useMemo(() => buildOverviewEvidenceModel(snapshot, state2), [snapshot, state2]);
    const incident = model.priorityObjects.length > 0;
    const ledgerRef = reactExports.useRef(null);
    const textScaleSentinelRef = reactExports.useRef(null);
    const [largeText, setLargeText] = reactExports.useState(false);
    const [tablet, setTablet] = reactExports.useState(false);
    const [selectedIncidentId, setSelectedIncidentId] = reactExports.useState("");
    const terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : null;
    const connections = observedCount((_a = snapshot.connections) == null ? void 0 : _a.total);
    const runningInterfaces = state2.facts.interfaces.available ? Math.max(0, state2.facts.interfaces.total - state2.facts.interfaces.down) : null;
    reactExports.useEffect(() => {
      const syncLedger = () => {
        const ledger = ledgerRef.current;
        if (!ledger) return;
        const availableBelowSummary = window.innerHeight - ledger.getBoundingClientRect().top - 76;
        const estimatedLedgerBody = model.evidenceRows.length * 54;
        const fitsUsefulEvidence = availableBelowSummary >= Math.min(180, estimatedLedgerBody);
        const roomyIncident = incident && (window.innerHeight >= 720 || window.innerWidth >= 600 || model.priorityObjects.length <= 2);
        ledger.open = model.evidenceMode === "unavailable" || roomyIncident || fitsUsefulEvidence;
      };
      syncLedger();
      window.addEventListener("resize", syncLedger);
      return () => window.removeEventListener("resize", syncLedger);
    }, [incident, model.evidenceMode, model.evidenceRows.length, model.priorityObjects.length, tablet]);
    reactExports.useEffect(() => {
      var _a2;
      const sentinel = textScaleSentinelRef.current;
      if (!sentinel) return;
      const sync = () => setLargeText(sentinel.getBoundingClientRect().height >= 24);
      sync();
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
      observer == null ? void 0 : observer.observe(sentinel);
      window.addEventListener("resize", sync);
      (_a2 = document.fonts) == null ? void 0 : _a2.ready.then(sync).catch(() => {
      });
      return () => {
        observer == null ? void 0 : observer.disconnect();
        window.removeEventListener("resize", sync);
      };
    }, []);
    reactExports.useEffect(() => {
      const media = window.matchMedia("(min-width: 600px) and (max-width: 1023px)");
      const sync = () => setTablet(media.matches);
      sync();
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }, []);
    const visiblePriorityObjects = tablet ? model.priorityObjectsAll : model.priorityObjects;
    const remainingPriorityObjects = Math.max(0, model.priorityTotal - visiblePriorityObjects.length);
    const selectedIncident = visiblePriorityObjects.find((object) => object.id === selectedIncidentId) || visiblePriorityObjects[0] || null;
    const ledgerInPrimary = tablet && (model.risk === "evidence" || model.risk === "collection");
    const showPatrolActions = tablet || model.risk === "evidence" || model.risk === "collection";
    const evidenceLedger = /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mp-ledger", "data-mobile-evidence-ledger": true, ref: ledgerRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Gauge, { "aria-hidden": "true", size: 17 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "证据边界" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.evidenceNote })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          model.evidenceRows.length,
          " 项",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { "aria-hidden": "true", size: 17 })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { children: model.evidenceRows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${row.tone}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: row.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: row.note })
        ] })
      ] }, row.key)) })
    ] });
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: `mp-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "is-steady"} ${largeText ? "is-large-text" : ""}`,
        "data-mobile-overview": true,
        "data-mobile-overview-scenario": model.scenario,
        "data-mobile-overview-risk": model.risk,
        "data-mobile-evidence-mode": model.evidenceMode,
        "data-mobile-large-text": largeText ? "true" : "false",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-text-scale-sentinel", "aria-hidden": "true", ref: textScaleSentinelRef, children: "M" }),
          !runtimeManaged ? /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mp-device-context", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { "aria-hidden": "true", size: 19 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: model.device }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.deviceNote })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LockKeyhole, { "aria-hidden": "true", size: 15 }),
              "只读"
            ] })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-command", "aria-labelledby": "mp-command-title", "data-mobile-verdict": true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-evidence-line", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `is-${model.evidenceTone}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock3, { "aria-hidden": "true", size: 14 }),
                model.evidenceLabel
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("time", { children: model.evidenceTime })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-command-main", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-command-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VerdictIcon$1, { tone: model.verdictTone }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { id: "mp-command-title", tabIndex: -1, "data-panel-route-title": true, children: model.verdictTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: model.verdictSummary })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-workspace", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mp-proof", "aria-label": "判断依据", "data-mobile-core-facts": true, children: model.facts.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${item.tone}`, "data-mobile-core-fact": item.key, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: item.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.value }),
              item.note ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.note }) : null
            ] }, item.key)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-workspace-body", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-workspace-primary", children: [
                model.resource ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileResourcePressure, { resource: model.resource }) : null,
                incident ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-incident", "data-mobile-incident-center": true, "aria-labelledby": "mp-incident-title", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "事故中心" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-incident-title", children: "先检查这些对象" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("b", { "data-mobile-incident-count": true, children: model.priorityTotal })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mp-incident-list", children: visiblePriorityObjects.map((object) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    IncidentRow,
                    {
                      object,
                      selected: tablet ? (selectedIncident == null ? void 0 : selectedIncident.id) === object.id : void 0,
                      onOpen: () => {
                        if (tablet) {
                          setSelectedIncidentId(object.id);
                          return;
                        }
                        onNavigate(object.route);
                      }
                    },
                    object.id
                  )) }),
                  remainingPriorityObjects > 0 && visiblePriorityObjects[0] ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      className: "mp-incident-more",
                      type: "button",
                      onClick: () => onNavigate(visiblePriorityObjects[0].route),
                      "data-mobile-destination": visiblePriorityObjects[0].route,
                      children: [
                        "进入",
                        visiblePriorityObjects[0].category,
                        "工作区查看其余 ",
                        remainingPriorityObjects,
                        " 个",
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                      ]
                    }
                  ) : null
                ] }) : null,
                model.traffic ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobilePatrolTraffic, { traffic: model.traffic, onOpen: () => onNavigate("trafficLoad") }) : null,
                tablet && model.focusObject ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileFocusObject, { object: model.focusObject, onOpen: () => onNavigate(model.focusObject.route) }) : null,
                ledgerInPrimary ? evidenceLedger : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mp-workspace-context", children: [
                !incident ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mp-load", "aria-labelledby": "mp-load-title", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mp-section-kicker", children: "当前负载" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mp-load-title", children: "对象与连接" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-mobile-destination": "terminals", onClick: () => onNavigate("terminals"), children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(UsersRound, { "aria-hidden": "true", size: 18 }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "终端记录" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: terminals === null ? "未取得" : terminals })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-mobile-destination": "connections", onClick: () => onNavigate("connections"), children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { "aria-hidden": "true", size: 18 }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "连接总数" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: connections === null ? "未取得" : connections })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-mobile-destination": "interfaces", onClick: () => onNavigate("interfaces"), children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Cable, { "aria-hidden": "true", size: 18 }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "运行接口" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: runningInterfaces === null ? "未取得" : `${runningInterfaces} / ${state2.facts.interfaces.total}` })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                    ] })
                  ] })
                ] }) : null,
                tablet && selectedIncident ? /* @__PURE__ */ jsxRuntimeExports.jsx(IncidentInspector, { object: selectedIncident, onOpen: () => onNavigate(selectedIncident.route) }) : null,
                !ledgerInPrimary ? evidenceLedger : null,
                showPatrolActions ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobilePatrolActions, { risk: model.risk, onNavigate }) : null
              ] })
            ] })
          ] })
        ]
      }
    );
  }
  const MOBILE_PANEL_QUERY = "(max-width: 1023px)";
  function useMobilePanelSurface() {
    const [mobile, setMobile] = reactExports.useState(
      () => typeof window !== "undefined" && window.matchMedia(MOBILE_PANEL_QUERY).matches
    );
    reactExports.useEffect(() => {
      const media = window.matchMedia(MOBILE_PANEL_QUERY);
      const sync = () => setMobile(media.matches);
      sync();
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }, []);
    return mobile;
  }
  function DesktopLedger({
    title,
    subtitle,
    rows: rows2,
    onNavigate,
    module,
    emptyLabel = "当前没有可列出的对象"
  }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "do-ledger", "aria-labelledby": `do-ledger-${module}`, "data-desktop-ledger": module, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "do-module-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: `do-ledger-${module}`, children: title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: subtitle })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          rows2.length,
          " 项"
        ] })
      ] }),
      rows2.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-ledger-table", role: "table", "aria-label": title, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-ledger-head", role: "row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "columnheader", children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "columnheader", children: "对象" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "columnheader", children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "columnheader", children: "证据" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { role: "columnheader", children: "来源" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "do-ledger-body", role: "rowgroup", children: rows2.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `do-ledger-row is-${row.tone}`, role: "row", "data-desktop-ledger-row": row.id, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "do-ledger-category", role: "cell", children: row.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "do-ledger-object", role: "cell", children: row.route ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onNavigate(row.route), "aria-label": `查看${row.object}详情`, "data-desktop-ledger-route": row.route, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.object }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 15 })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.object }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "do-ledger-state", role: "cell", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("i", { "aria-hidden": "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.state })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "do-ledger-evidence", role: "cell", children: row.evidence }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "do-ledger-source", role: "cell", children: row.source })
        ] }, row.id)) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "do-ledger-empty", children: emptyLabel })
    ] });
  }
  function DesktopIncidentDocket({
    model,
    onNavigate
  }) {
    const rows2 = model.priorityObjects.map((object) => ({
      id: object.id,
      category: object.category,
      object: object.name,
      state: object.state,
      evidence: object.reason,
      source: object.sourcePath,
      tone: object.tone,
      route: object.route
    }));
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: `do-incident is-${model.verdictTone}`, "aria-labelledby": "do-incident-title", "data-desktop-incident": model.risk, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "do-incident-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: model.verdictTone === "danger" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 22 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 22 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.risk === "resource" ? "压力采样" : "影响与来源" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "do-incident-title", children: "处置证据" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "先核对判断依据，再进入对应对象；此处不重复顶层结论。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: model.priorityTotal ? `${model.priorityTotal} 项` : "需核对" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "do-incident-facts", "aria-label": "事故判断依据", children: model.facts.map((fact2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${fact2.tone}`, "data-desktop-incident-fact": fact2.key, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: fact2.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: fact2.value }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact2.note || "来源见下方账本" })
      ] }, fact2.key)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DesktopLedger,
        {
          title: "影响对象",
          subtitle: "按判断优先级列出；每项保留详情入口和原始来源路径",
          rows: rows2,
          onNavigate,
          module: "incident-objects",
          emptyLabel: "当前没有可安全列出的对象；请按证据边界核对采集来源。"
        }
      )
    ] });
  }
  const WIDTH = 760;
  const HEIGHT = 260;
  const PLOT = { left: 54, right: 18, top: 24, bottom: 42 };
  function pathFor(points, key, peak) {
    const width = WIDTH - PLOT.left - PLOT.right;
    const height = HEIGHT - PLOT.top - PLOT.bottom;
    return points.map((point, index) => {
      const x = PLOT.left + (points.length === 1 ? width : index / (points.length - 1) * width);
      const y = PLOT.top + height - point[key] / peak * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
  }
  function timeLabel$1(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(timestamp));
  }
  function DesktopWanEvidence({ traffic, onOpen }) {
    const hasTrend = traffic.points.length > 0;
    const fallbackPoint = { timestamp: Date.now(), down: 0, up: 0 };
    const rawPeak = Math.max(1, ...traffic.points.flatMap((point) => [point.down, point.up]));
    const downPath = pathFor(traffic.points, "down", rawPeak);
    const upPath = pathFor(traffic.points, "up", rawPeak);
    const first = traffic.points[0] ?? fallbackPoint;
    const middle = traffic.points[Math.floor((traffic.points.length - 1) / 2)] ?? fallbackPoint;
    const last = traffic.points[traffic.points.length - 1] ?? fallbackPoint;
    const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
    const latestX = WIDTH - PLOT.right;
    const latestDownY = PLOT.top + plotHeight - last.down / rawPeak * plotHeight;
    const latestUpY = PLOT.top + plotHeight - last.up / rawPeak * plotHeight;
    const titleId = "do-wan-chart-title";
    const descId = "do-wan-chart-desc";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "do-wan", "aria-labelledby": "do-wan-heading", "data-desktop-wan-evidence": true, "data-sample-count": traffic.sampleCount, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "do-module-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "do-wan-heading", children: traffic.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            traffic.windowLabel,
            " · 统一采样窗口"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onOpen, children: [
          "流量审计",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 16 })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-wan-summary", "aria-label": "WAN 当前与峰值", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { "aria-hidden": "true", size: 15 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "当前下载" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.currentDown })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { "aria-hidden": "true", size: 15 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "当前上传" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.currentUp })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "窗口峰值" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: traffic.peak })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "采样" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
            traffic.sampleCount,
            " 点"
          ] })
        ] })
      ] }),
      hasTrend ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "svg",
        {
          className: "do-wan-chart",
          viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
          role: "img",
          "aria-labelledby": `${titleId} ${descId}`,
          preserveAspectRatio: "xMidYMid meet",
          "data-unit": "bit/s",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("title", { id: titleId, children: "WAN 下载与上传吞吐时间序列" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("desc", { id: descId, children: traffic.accessibleSummary }),
            [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = PLOT.top + plotHeight - ratio * plotHeight;
              return /* @__PURE__ */ jsxRuntimeExports.jsx("line", { className: "do-chart-grid", x1: PLOT.left, x2: WIDTH - PLOT.right, y1: y, y2: y }, ratio);
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { className: "do-chart-axis", x1: PLOT.left, x2: PLOT.left, y1: PLOT.top, y2: HEIGHT - PLOT.bottom }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { className: "do-chart-axis", x1: PLOT.left, x2: WIDTH - PLOT.right, y1: HEIGHT - PLOT.bottom, y2: HEIGHT - PLOT.bottom }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { className: "do-chart-label", x: PLOT.left - 8, y: PLOT.top + 4, textAnchor: "end", children: traffic.peak }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { className: "do-chart-label", x: PLOT.left - 8, y: HEIGHT - PLOT.bottom + 4, textAnchor: "end", children: "0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "do-chart-line is-down", d: downPath }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "do-chart-line is-up", d: upPath }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "do-chart-point is-down", cx: latestX, cy: latestDownY, r: "4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "do-chart-point is-up", cx: latestX, cy: latestUpY, r: "4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { className: "do-chart-time", x: PLOT.left, y: HEIGHT - 14, textAnchor: "start", children: timeLabel$1(first.timestamp) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { className: "do-chart-time", x: WIDTH / 2, y: HEIGHT - 14, textAnchor: "middle", children: timeLabel$1(middle.timestamp) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { className: "do-chart-time", x: WIDTH - PLOT.right, y: HEIGHT - 14, textAnchor: "end", children: timeLabel$1(last.timestamp) })
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-wan-pending", role: "status", "data-traffic-accumulating": true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "时间序列正在积累" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "当前上下行读数可用；至少形成一个带时间的同窗样本后才绘制趋势。" })
      ] }),
      hasTrend ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-wan-legend", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "is-down", children: "下载" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "is-up", children: "上传" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "单位 bit/s" })
      ] }) : null
    ] });
  }
  function clean(value, fallback = "未记录") {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }
  function finite(value) {
    if (value === null || value === void 0 || value === "") return null;
    const number2 = Number(value);
    return Number.isFinite(number2) ? number2 : null;
  }
  function wanRows(snapshot) {
    if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
    return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function interfaceRows(snapshot) {
    return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  }
  function activeRoute(snapshot) {
    var _a, _b;
    const explicit = Array.isArray((_a = snapshot.routes) == null ? void 0 : _a.defaultRoutes) ? snapshot.routes.defaultRoutes : Array.isArray((_b = snapshot.routes) == null ? void 0 : _b.items) ? snapshot.routes.items.filter((row) => row.default === true || row.dstAddress === "0.0.0.0/0" || row.dstAddress === "::/0") : [];
    return explicit.find((row) => row.active === true && row.disabled !== true) || null;
  }
  function routeStatus(evidence, state2, route) {
    if (evidence.evidenceMode !== "current") return {
      key: "route",
      label: "默认路由",
      value: "无法核实",
      note: "当前路由变化不可见",
      tone: evidence.evidenceMode === "unavailable" ? "missing" : "warn"
    };
    if (!route) return {
      key: "route",
      label: "默认路由",
      value: state2.facts.wan.total > 0 && state2.facts.wan.online === 0 ? "无活动记录" : "无法核实",
      note: "未发现 active=true 且未停用的默认路由",
      tone: state2.facts.wan.online === 0 ? "danger" : "warn"
    };
    const table2 = clean(route.routingTable || route.table, "main");
    const gateway = clean(route.gateway, "网关未记录");
    const distance = route.distance === void 0 || route.distance === "" ? "距离未记录" : `距离 ${route.distance}`;
    return {
      key: "route",
      label: "默认路由",
      value: `${table2} → ${gateway}`,
      note: `${distance} · 明确活动记录`,
      tone: "trust"
    };
  }
  function collectionStatus(evidence, state2) {
    const channels = [state2.facts.collection.rest, state2.facts.collection.ssh];
    const current = channels.filter((channel) => channel.status === "current").length;
    const unavailable = channels.every((channel) => channel.status === "unavailable" || channel.status === "failed");
    return {
      key: "collection",
      label: "采集通道",
      value: `${current} / 2 当前`,
      note: `REST ${state2.facts.collection.rest.label} · SSH ${state2.facts.collection.ssh.label}`,
      tone: current === 2 && evidence.evidenceMode === "current" ? "trust" : unavailable ? "danger" : "warn"
    };
  }
  function boundaryRows(evidence, state2) {
    const currentChannels = [state2.facts.collection.rest, state2.facts.collection.ssh].filter((channel) => channel.status === "current").length;
    let forwarding = "当前不可判断";
    let forwardingNote = "采集证据不足，不能声明转发状态";
    let forwardingTone = "missing";
    if (evidence.evidenceMode === "current") {
      if (evidence.risk === "wan") {
        forwarding = "出口对象未运行";
        forwardingNote = "没有核实到活动默认路由";
        forwardingTone = "danger";
      } else if (evidence.risk === "interfaces") {
        forwarding = "部分接口未运行";
        forwardingNote = "影响范围需按接口依赖核对";
        forwardingTone = "danger";
      } else if (evidence.risk === "route") {
        forwarding = "默认路由未核实";
        forwardingNote = "WAN 记录不能替代活动路由证据";
        forwardingTone = "warn";
      } else if (evidence.risk === "resource") {
        forwarding = "未由资源值判定";
        forwardingNote = "资源压力不等于转发已经中断";
        forwardingTone = "warn";
      }
    }
    return [
      {
        id: "plane:management",
        category: "管理面",
        object: "REST / SSH",
        state: `${currentChannels} / 2 当前`,
        evidence: "通道状态只说明管理与采集可达性",
        source: "meta.realtime + meta.static",
        tone: currentChannels === 2 ? "trust" : currentChannels ? "warn" : "danger",
        route: "readonlyDiagnostics"
      },
      {
        id: "plane:forwarding",
        category: "转发面",
        object: "WAN / 接口 / 路由",
        state: forwarding,
        evidence: forwardingNote,
        source: "wan + interfaces + routes.defaultRoutes",
        tone: forwardingTone,
        route: evidence.risk === "interfaces" ? "interfaces" : "routes"
      },
      {
        id: "plane:business",
        category: "业务面",
        object: "终端业务",
        state: "没有独立测量",
        evidence: "不由 REST、SSH 或资源数值推断业务可用性",
        source: "evidence policy",
        tone: "missing",
        route: "readonlyDiagnostics"
      }
    ];
  }
  function operationalRows(snapshot, state2) {
    var _a;
    const runningInterfaces = Math.max(0, state2.facts.interfaces.total - state2.facts.interfaces.down);
    const resourceTone = state2.facts.resource.level;
    const connectionTotal = finite((_a = snapshot.connections) == null ? void 0 : _a.total);
    return [
      {
        id: "decision:wan",
        category: "出口对象",
        object: "WAN",
        state: `${state2.facts.wan.online} / ${state2.facts.wan.total} 运行`,
        evidence: state2.facts.wan.offline ? `${state2.facts.wan.offline} 条未运行` : "当前对象均有运行记录",
        source: "wan",
        tone: state2.facts.wan.offline ? "danger" : "trust",
        route: "lineStatus"
      },
      {
        id: "decision:interfaces",
        category: "转发对象",
        object: "接口",
        state: `${runningInterfaces} / ${state2.facts.interfaces.total} 运行`,
        evidence: state2.facts.interfaces.down ? `${state2.facts.interfaces.down} 个 Down：${state2.facts.interfaces.downNames.slice(0, 3).join("、")}` : "本次采样未见 Down",
        source: "interfaces",
        tone: state2.facts.interfaces.down ? "danger" : "trust",
        route: "interfaces"
      },
      {
        id: "decision:resource",
        category: "设备资源",
        object: "CPU / 内存 / 磁盘",
        state: state2.facts.resource.available ? `${Math.round(state2.facts.resource.cpu)}% / ${Math.round(state2.facts.resource.memory)}% / ${Math.round(state2.facts.resource.disk)}%` : "未记录",
        evidence: state2.facts.resource.available ? "阈值 85% / 85% / 90%" : "资源采样不可用",
        source: "overview.cpuLoad + memoryUsage + diskUsage",
        tone: resourceTone,
        route: "trafficLoad"
      },
      {
        id: "decision:connections",
        category: "连接对象",
        object: "连接跟踪",
        state: connectionTotal === null ? "未记录" : `${connectionTotal.toLocaleString("zh-CN")} 条`,
        evidence: connectionTotal === null ? "不以零值代替缺失" : "当前快照总量",
        source: "connections.total",
        tone: connectionTotal === null ? "missing" : "trust",
        route: "connections"
      }
    ];
  }
  function rateEvidence(row) {
    const down = finite(row.downRate);
    const up = finite(row.upRate);
    if (down === null || up === null) return "速率未记录";
    return `下 ${formatRate(down)} · 上 ${formatRate(up)}`;
  }
  function interfaceEvidence(row) {
    const down = finite(row.downRate ?? row.rxRate);
    const up = finite(row.upRate ?? row.txRate);
    const relation = clean(row.bridge || row.parent || row.master, "关系未记录");
    if (down === null || up === null) return relation;
    return `${relation} · 下 ${formatRate(down)} · 上 ${formatRate(up)}`;
  }
  function objectRows(snapshot) {
    const wans = wanRows(snapshot).slice(0, 6).map((row, index) => ({
      id: `object:wan:${index}`,
      category: "WAN",
      object: clean(row.name || row.interface, `WAN ${index + 1}`),
      state: row.disabled === true ? "已停用" : row.running === false ? "未运行" : row.running === true ? "运行" : "状态未记录",
      evidence: `${clean(row.parent, "父接口未记录")} · ${rateEvidence(row)}`,
      source: `wan[${index}]`,
      tone: row.disabled === true || row.running === false ? "danger" : row.running === true ? "trust" : "missing",
      route: "lineStatus"
    }));
    const remaining = Math.max(0, 8 - wans.length);
    const interfaces = interfaceRows(snapshot).slice(0, remaining).map((row, index) => ({
      id: `object:interface:${index}`,
      category: "接口",
      object: clean(row.name || row.interface, `接口 ${index + 1}`),
      state: row.disabled === true ? "已停用" : row.running === false ? "未运行" : row.running === true ? "运行" : "状态未记录",
      evidence: interfaceEvidence(row),
      source: `interfaces[${index}]`,
      tone: row.disabled === true || row.running === false ? "danger" : row.running === true ? "trust" : "missing",
      route: "interfaces"
    }));
    return [...wans, ...interfaces];
  }
  function buildDesktopOverviewModel(snapshot, state2) {
    const evidence = buildOverviewEvidenceModel(snapshot, state2);
    const route = activeRoute(snapshot);
    const statusItems = [
      {
        key: "evidence",
        label: "证据边界",
        value: `${evidence.evidenceLabel} · ${evidence.evidenceTime}`,
        note: evidence.evidenceNote,
        tone: evidence.evidenceTone
      },
      routeStatus(evidence, state2, route),
      collectionStatus(evidence, state2)
    ];
    return {
      evidence,
      statusItems,
      decisionRows: evidence.risk === "none" ? operationalRows(snapshot, state2) : boundaryRows(evidence, state2),
      objectRows: evidence.evidenceMode === "current" ? objectRows(snapshot) : [],
      activeRoute: route
    };
  }
  function VerdictIcon({ model }) {
    if (model.verdictTone === "danger") return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { "aria-hidden": "true", size: 24 });
    if (model.verdictTone === "warn" || model.verdictTone === "missing") return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { "aria-hidden": "true", size: 24 });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { "aria-hidden": "true", size: 24 });
  }
  function sourceRows(model) {
    const paths = {
      target: "meta.routerHost + meta.target",
      success: "latestBusinessSuccessTime(meta)",
      failures: "meta.*EndpointFailures",
      boundary: "capabilities + read-only policy"
    };
    return model.evidenceRows.map((row) => ({
      id: `source:${row.key}`,
      category: "来源",
      object: row.label,
      state: row.value,
      evidence: row.note,
      source: paths[row.key] || row.key,
      tone: row.tone,
      route: "readonlyDiagnostics"
    }));
  }
  function DesktopOverviewScreen({ snapshot, state: state2, onNavigate, runtimeManaged = false }) {
    const view = reactExports.useMemo(() => buildDesktopOverviewModel(snapshot, state2), [snapshot, state2]);
    const model = view.evidence;
    const incident = model.risk !== "none";
    const showTraffic = !incident && state2.scale !== "fleet" && Boolean(model.traffic);
    const provenance = sourceRows(model);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: `do-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "has-normal-workbench"}`,
        "data-desktop-overview": true,
        "data-desktop-overview-scenario": model.scenario,
        "data-desktop-overview-risk": model.risk,
        "data-desktop-evidence-mode": model.evidenceMode,
        children: [
          !runtimeManaged ? /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "do-fixture-bar", "data-desktop-fixture-toolbar": true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { "aria-hidden": "true", size: 18 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: model.device }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.deviceNote })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LockKeyhole, { "aria-hidden": "true", size: 15 }),
              "只读监控"
            ] })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "do-status-bus", "aria-labelledby": "do-verdict-title", "data-desktop-status-bus": true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `do-verdict is-${model.verdictTone}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "do-verdict-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VerdictIcon, { model }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.verdictLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { id: "do-verdict-title", tabIndex: -1, "data-panel-route-title": true, children: model.verdictTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: model.verdictSummary })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "do-status-items", children: view.statusItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${item.tone}`, "data-desktop-status-item": item.key, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: item.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.value }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: item.note })
              ] })
            ] }, item.key)) })
          ] }),
          incident ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopIncidentDocket, { model, onNavigate }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-lower-grid", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "判断边界",
                  subtitle: "管理面、转发面与业务面分别陈述，不互相冒充",
                  rows: view.decisionRows,
                  onNavigate,
                  module: "plane-boundary"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "来源与操作边界",
                  subtitle: "成功时间、失败记录和只读约束",
                  rows: provenance,
                  onNavigate,
                  module: "provenance"
                }
              )
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "do-main-grid", children: [
              showTraffic && model.traffic ? /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopWanEvidence, { traffic: model.traffic, onOpen: () => onNavigate("trafficAudit") }) : state2.scale === "fleet" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "当前对象覆盖",
                  subtitle: "Fleet 只表示范围；对象异常仍按实际风险排序",
                  rows: view.objectRows,
                  onNavigate,
                  module: "fleet-coverage"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "do-wan-empty", "data-desktop-wan-unavailable": true, "aria-labelledby": "do-wan-empty-title", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { "aria-hidden": "true", size: 22 }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "do-wan-empty-title", children: "WAN 趋势证据未形成" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "当前值、历史尾点或采样时间窗不一致，因此不绘制看似实时的曲线。" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => onNavigate("trafficAudit"), children: "查看流量证据" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "运行判断",
                  subtitle: "每一行回答一个不同的运维问题",
                  rows: view.decisionRows,
                  onNavigate,
                  module: "decisions"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `do-lower-grid ${state2.scale === "fleet" ? "is-fleet" : ""}`, children: [
              state2.scale !== "fleet" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "运行对象",
                  subtitle: "从聚合判断下钻到 WAN 与接口对象",
                  rows: view.objectRows,
                  onNavigate,
                  module: "objects"
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DesktopLedger,
                {
                  title: "来源与操作边界",
                  subtitle: "成功时间、失败记录和只读约束",
                  rows: provenance,
                  onNavigate,
                  module: "provenance"
                }
              )
            ] })
          ] })
        ]
      }
    );
  }
  function OverviewPanel({
    snapshot,
    state: state2,
    onNavigate,
    runtimeManaged = false
  }) {
    const mobile = useMobilePanelSurface();
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        id: "overview",
        className: "section router-overview-framework " + (mobile ? "is-mobile-surface" : "ro-desktop-console ro-desktop-hierarchy"),
        "data-overview-page-credibility": state2.facts.freshness.credibilityLabel,
        "data-overview-page-credibility-tone": state2.facts.freshness.credibilityTone,
        "data-overview-business-display-boundary": state2.scenario === "no-snapshot" ? "no-business-data" : "business-data",
        "data-overview-scene-key": state2.scenario,
        children: mobile ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-patrol-mount", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          MobilePatrolScreen,
          {
            snapshot,
            state: state2,
            onNavigate,
            runtimeManaged
          },
          state2.scenario
        ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          DesktopOverviewScreen,
          {
            snapshot,
            state: state2,
            onNavigate,
            runtimeManaged
          }
        )
      }
    );
  }
  const MOBILE_CONNECTION_QUERY = "(max-width: 1023px)";
  function useMobileConnectionSurface() {
    const [mobile, setMobile] = reactExports.useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_CONNECTION_QUERY).matches);
    reactExports.useEffect(() => {
      const media = window.matchMedia(MOBILE_CONNECTION_QUERY);
      const sync = () => setMobile(media.matches);
      sync();
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }, []);
    return mobile;
  }
  function ChannelFact({ label, test }) {
    const known = Boolean(test);
    const ok = (test == null ? void 0 : test.ok) === true;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `router-channel-fact ${known ? ok ? "is-ok" : "is-failed" : "is-unknown"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: ok ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 15 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: !known ? "尚未验证" : ok ? `已验证${(test == null ? void 0 : test.elapsedMs) !== null ? ` · ${test == null ? void 0 : test.elapsedMs} ms` : ""}` : "未通过" }),
        (test == null ? void 0 : test.error) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { children: "查看错误" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: test.error })
        ] }) : null
      ] })
    ] });
  }
  function SavedProfileRow({
    profile,
    selected,
    disabled,
    onSelect,
    onForget
  }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `router-saved-profile ${selected ? "is-selected" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "aria-pressed": selected, onClick: onSelect, disabled, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: profile.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
            profile.user,
            " · ",
            profile.restScheme.toUpperCase(),
            " ",
            profile.restPort,
            " · SSH ",
            profile.sshPort
          ] })
        ] }),
        selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 17, "aria-hidden": "true" }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "router-icon-button", title: `删除 ${profile.label} 的设备资料`, "aria-label": `删除 ${profile.label} 的设备资料`, onClick: onForget, disabled, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 17, "aria-hidden": "true" }) })
    ] });
  }
  function ConnectionForm({ runtime, compact = false }) {
    const current = runtime.connection.profile;
    const [selectedSavedId, setSelectedSavedId] = reactExports.useState((current == null ? void 0 : current.savedId) || "");
    const [host, setHost] = reactExports.useState((current == null ? void 0 : current.host) || "");
    const [user, setUser] = reactExports.useState((current == null ? void 0 : current.user) || "");
    const [sshPort, setSshPort] = reactExports.useState((current == null ? void 0 : current.sshPort) || 22);
    const [restScheme, setRestScheme] = reactExports.useState((current == null ? void 0 : current.restScheme) || "https");
    const [restPort, setRestPort] = reactExports.useState((current == null ? void 0 : current.restPort) || 443);
    const [restVerifyTls, setRestVerifyTls] = reactExports.useState((current == null ? void 0 : current.restVerifyTls) ?? true);
    const [insecureRestConfirmed, setInsecureRestConfirmed] = reactExports.useState((current == null ? void 0 : current.insecureRestConfirmed) ?? false);
    const [password, setPassword] = reactExports.useState("");
    const [rememberProfile, setRememberProfile] = reactExports.useState(false);
    const [confirmSshHostKey, setConfirmSshHostKey] = reactExports.useState(false);
    const [clientError, setClientError] = reactExports.useState("");
    reactExports.useEffect(() => {
      setHost((current == null ? void 0 : current.host) || "");
      setUser((current == null ? void 0 : current.user) || "");
      setSshPort((current == null ? void 0 : current.sshPort) || 22);
      setRestScheme((current == null ? void 0 : current.restScheme) || "https");
      setRestPort((current == null ? void 0 : current.restPort) || 443);
      setRestVerifyTls((current == null ? void 0 : current.restVerifyTls) ?? true);
      setInsecureRestConfirmed((current == null ? void 0 : current.insecureRestConfirmed) ?? false);
      setSelectedSavedId((current == null ? void 0 : current.savedId) || "");
    }, [
      current == null ? void 0 : current.host,
      current == null ? void 0 : current.insecureRestConfirmed,
      current == null ? void 0 : current.restPort,
      current == null ? void 0 : current.restScheme,
      current == null ? void 0 : current.restVerifyTls,
      current == null ? void 0 : current.savedId,
      current == null ? void 0 : current.sshPort,
      current == null ? void 0 : current.user
    ]);
    const selectSaved = (profile) => {
      setSelectedSavedId(profile.id);
      setHost(profile.host);
      setUser(profile.user);
      setSshPort(profile.sshPort);
      setRestScheme(profile.restScheme);
      setRestPort(profile.restPort);
      setRestVerifyTls(profile.restVerifyTls);
      setInsecureRestConfirmed(profile.insecureRestConfirmed);
      setConfirmSshHostKey(false);
      setClientError("");
    };
    const clearSavedSelection = () => setSelectedSavedId("");
    const pendingHostKey = runtime.connection.pendingSshHostKey;
    const matchingPendingHostKey = (pendingHostKey == null ? void 0 : pendingHostKey.host) === host.trim() && pendingHostKey.sshPort === sshPort ? pendingHostKey : null;
    const insecureRest = restScheme === "http" || !restVerifyTls;
    reactExports.useEffect(() => {
      setConfirmSshHostKey(false);
    }, [matchingPendingHostKey == null ? void 0 : matchingPendingHostKey.fingerprint]);
    const changeRestScheme = (scheme) => {
      if (scheme === restScheme) return;
      const currentDefaultPort = restScheme === "https" ? 443 : 80;
      const nextDefaultPort = scheme === "https" ? 443 : 80;
      setRestScheme(scheme);
      if (restPort === currentDefaultPort) setRestPort(nextDefaultPort);
      setRestVerifyTls(scheme === "https");
      setInsecureRestConfirmed(false);
      clearSavedSelection();
    };
    const submit = async (event) => {
      event.preventDefault();
      const cleanHost = host.trim();
      const cleanUser = user.trim();
      if (!cleanHost || !cleanUser || !password.trim()) {
        setClientError("请填写设备地址、用户名和密码");
        return;
      }
      if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) {
        setClientError("SSH 端口必须在 1–65535 之间");
        return;
      }
      if (!Number.isInteger(restPort) || restPort < 1 || restPort > 65535) {
        setClientError("REST 端口必须在 1–65535 之间");
        return;
      }
      if (insecureRest && !insecureRestConfirmed) {
        setClientError(restScheme === "http" ? "使用 HTTP 前必须确认凭据明文传输风险" : "关闭证书校验前必须确认设备身份风险");
        return;
      }
      if (matchingPendingHostKey && !confirmSshHostKey) {
        setClientError("请先核对并确认 SSH 主机密钥指纹");
        return;
      }
      setClientError("");
      const input = {
        host: cleanHost,
        user: cleanUser,
        password,
        sshPort,
        restScheme,
        restPort,
        restVerifyTls: restScheme === "https" && restVerifyTls,
        insecureRestConfirmed: insecureRest && insecureRestConfirmed,
        ...matchingPendingHostKey && confirmSshHostKey ? { sshHostKeyFingerprint: matchingPendingHostKey.fingerprint } : {},
        ...selectedSavedId ? { savedId: selectedSavedId } : {},
        rememberProfile
      };
      const connected = await runtime.connect(input);
      if (connected) setPassword("");
    };
    const test = runtime.connection.lastTest || (current == null ? void 0 : current.lastTest) || null;
    const selectedProfile = runtime.connection.savedLogins.find((profile) => profile.id === selectedSavedId) || null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: `router-connection-form ${compact ? "is-compact" : ""}`, "data-router-login-form": true, onSubmit: submit, noValidate: true, children: [
      compact && runtime.connection.savedLogins.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-saved-select", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "设备资料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: selectedSavedId,
              onChange: (event) => {
                const profile = runtime.connection.savedLogins.find((item) => item.id === event.target.value);
                if (profile) selectSaved(profile);
                else setSelectedSavedId("");
              },
              disabled: runtime.connection.busy,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "手动填写" }),
                runtime.connection.savedLogins.map((profile) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: profile.id, children: [
                  profile.label,
                  " · ",
                  profile.user
                ] }, profile.id))
              ]
            }
          )
        ] }),
        selectedProfile ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "router-icon-button", title: `删除 ${selectedProfile.label} 的设备资料`, "aria-label": `删除 ${selectedProfile.label} 的设备资料`, onClick: () => {
          setSelectedSavedId("");
          void runtime.forgetProfile(selectedProfile.id);
        }, disabled: runtime.connection.busy, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 17, "aria-hidden": "true" }) }) : null
      ] }) : !compact && runtime.connection.savedLogins.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "router-form-group", "aria-labelledby": "saved-router-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "saved-router-heading", children: "设备资料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "密码不会保存" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "router-saved-list", children: runtime.connection.savedLogins.map((profile) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          SavedProfileRow,
          {
            profile,
            selected: selectedSavedId === profile.id,
            disabled: runtime.connection.busy,
            onSelect: () => selectSaved(profile),
            onForget: () => {
              if (selectedSavedId === profile.id) setSelectedSavedId("");
              void runtime.forgetProfile(profile.id);
            }
          },
          profile.id
        )) })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "router-form-group", "aria-labelledby": "router-address-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "router-address-heading", children: "RouterOS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "只读采集" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "设备地址" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              name: "host",
              type: "text",
              value: host,
              onChange: (event) => {
                setHost(event.target.value);
                clearSavedSelection();
              },
              placeholder: "192.168.88.1",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              disabled: runtime.connection.busy,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "用户名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              name: "user",
              type: "text",
              value: user,
              onChange: (event) => {
                setUser(event.target.value);
                clearSavedSelection();
              },
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              autoComplete: "username",
              disabled: runtime.connection.busy,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "密码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              name: "password",
              type: "password",
              value: password,
              onChange: (event) => setPassword(event.target.value),
              autoComplete: "current-password",
              disabled: runtime.connection.busy,
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "router-advanced-settings", "data-router-advanced-settings": true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { "aria-hidden": "true", size: 18 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "高级连接设置" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                  restScheme.toUpperCase(),
                  " ",
                  restPort,
                  " · SSH ",
                  sshPort,
                  " · ",
                  insecureRest ? "风险模式" : "证书校验"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { "aria-hidden": "true", size: 18 })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-advanced-fields", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field router-field-port", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "SSH 端口" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  name: "sshPort",
                  type: "number",
                  min: 1,
                  max: 65535,
                  inputMode: "numeric",
                  value: sshPort,
                  onChange: (event) => {
                    setSshPort(Number(event.target.value));
                    clearSavedSelection();
                  },
                  disabled: runtime.connection.busy,
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-field router-field-segmented", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "REST 协议" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-segmented-control", role: "group", "aria-label": "REST 协议", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", "aria-pressed": restScheme === "https", onClick: () => changeRestScheme("https"), disabled: runtime.connection.busy, children: "HTTPS" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", "aria-pressed": restScheme === "http", onClick: () => changeRestScheme("http"), disabled: runtime.connection.busy, children: "HTTP" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field router-field-port", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "REST 端口" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  name: "restPort",
                  type: "number",
                  min: 1,
                  max: 65535,
                  inputMode: "numeric",
                  value: restPort,
                  onChange: (event) => {
                    setRestPort(Number(event.target.value));
                    clearSavedSelection();
                  },
                  disabled: runtime.connection.busy,
                  required: true
                }
              )
            ] }),
            restScheme === "https" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-field router-field-toggle", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "证书校验" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  name: "restVerifyTls",
                  type: "checkbox",
                  checked: restVerifyTls,
                  onChange: (event) => {
                    setRestVerifyTls(event.target.checked);
                    setInsecureRestConfirmed(false);
                    clearSavedSelection();
                  },
                  disabled: runtime.connection.busy
                }
              )
            ] }) : null
          ] })
        ] })
      ] }),
      insecureRest ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-risk-confirmation", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            name: "insecureRestConfirmed",
            type: "checkbox",
            checked: insecureRestConfirmed,
            onChange: (event) => setInsecureRestConfirmed(event.target.checked),
            disabled: runtime.connection.busy
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: restScheme === "http" ? "确认使用明文 HTTP" : "确认关闭证书校验" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: restScheme === "http" ? "RouterOS 用户名和密码可能被同网段设备读取。" : "连接会加密，但无法确认对端确实是这台 RouterOS。" })
        ] })
      ] }) : null,
      matchingPendingHostKey ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "router-host-key-confirmation", "aria-labelledby": "ssh-host-key-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FingerprintPattern, { size: 19, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "ssh-host-key-heading", children: "确认 SSH 主机密钥" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "首次连接只读取到以下指纹，尚未发送 SSH 密码。请与设备侧记录核对。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("code", { children: [
            matchingPendingHostKey.algorithm,
            " · ",
            matchingPendingHostKey.fingerprint
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: confirmSshHostKey, onChange: (event) => setConfirmSshHostKey(event.target.checked), disabled: runtime.connection.busy }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "确认并固定此指纹；以后发生变化时阻断连接" })
          ] })
        ] })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "router-remember-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            name: "rememberProfile",
            type: "checkbox",
            checked: rememberProfile,
            onChange: (event) => setRememberProfile(event.target.checked),
            disabled: runtime.connection.busy
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "记住设备资料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "保存地址、端口、传输设置与 SSH 指纹；密码不会保存" })
        ] })
      ] }),
      clientError || runtime.connection.error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-connection-error", role: "alert", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 18, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: clientError || runtime.connection.error })
      ] }) : null,
      test || !compact ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-channel-grid", "aria-label": "连接通道验证结果", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChannelFact, { label: "REST", test: test == null ? void 0 : test.rest }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChannelFact, { label: "SSH", test: test == null ? void 0 : test.ssh })
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "router-transport-boundary", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LockKeyhole, { size: 17, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: restScheme === "https" && restVerifyTls ? "REST 使用 HTTPS 并验证证书；不会自动降级到 HTTP。" : "当前使用已显式确认的风险模式；面板不会静默切换传输方式。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "router-connect-submit", type: "submit", disabled: runtime.connection.busy, children: [
        runtime.connection.busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "is-spinning", size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { size: 18, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: runtime.connection.busy ? "正在验证 REST 与 SSH" : "连接并进入面板" })
      ] })
    ] });
  }
  function ConnectionStatus({ runtime, mobile }) {
    const error = runtime.connection.phase === "error";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: `router-connection-status ${mobile ? "is-mobile" : "is-desktop"}`, "data-router-connection-status": runtime.connection.phase, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "router-status-symbol", "aria-hidden": "true", children: error ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 26 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "is-spinning", size: 26 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: error ? "无法读取连接状态" : "正在读取连接状态" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: error ? runtime.connection.error : "核对本地会话与 RouterOS 配置。" }),
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => void runtime.retryConnectionStatus(), children: "重新检查" }) : null
    ] });
  }
  function MobileConnectionScreen({ runtime }) {
    const canReturn = runtime.connection.phase === "ready" && Boolean(runtime.snapshot.data);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "router-connection router-connection-mobile", "data-panel-mobile-surface": true, "data-router-connection-screen": "mobile", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "router-mobile-connection-bar", children: [
        canReturn ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "router-icon-button", title: "返回面板", "aria-label": "返回面板", onClick: runtime.cancelConnection, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 21, "aria-hidden": "true" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "router-mobile-bar-spacer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "RouterOS 连接" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "设备只读状态台" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { size: 20, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "router-mobile-connection-intro", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { size: 18, "aria-hidden": "true" }),
          " 设备入口"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: canReturn ? "切换监控设备" : "连接 RouterOS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "REST 与 SSH 独立验证；失败通道会标明影响。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionForm, { runtime, compact: true }),
      runtime.connection.phase === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "router-logout-button", type: "button", onClick: () => void runtime.logout(), disabled: runtime.connection.busy, children: "清除当前连接" }) : null
    ] });
  }
  function DesktopConnectionScreen({ runtime }) {
    var _a;
    const canReturn = runtime.connection.phase === "ready" && Boolean(runtime.snapshot.data);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "router-connection router-connection-desktop", "data-router-connection-screen": "desktop", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "router-connection-context", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "router-context-mark", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { size: 24, "aria-hidden": "true" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "router-context-kicker", children: "ROUTEROS · READ ONLY" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: canReturn ? "切换监控设备" : "建立设备连接" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "连接验证只读取 RouterOS 身份与状态。REST 和 SSH 结果独立呈现，不把管理面可达冒充网络可用。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "配置" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: "地址、用户、SSH 端口" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "密码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: "仅用于当前进程，不写入设备资料" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "权限" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: "监控面板不修改 RouterOS 配置" })
          ] })
        ] }),
        canReturn ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: runtime.cancelConnection, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 17, "aria-hidden": "true" }),
          "返回面板"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "router-connection-workspace", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "连接设置" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "验证 RouterOS 通道" })
          ] }),
          ((_a = runtime.connection.profile) == null ? void 0 : _a.configured) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
            "当前：",
            runtime.connection.profile.host
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "尚未配置" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionForm, { runtime }),
        runtime.connection.phase === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "router-logout-button", type: "button", onClick: () => void runtime.logout(), disabled: runtime.connection.busy, children: "清除当前连接" }) : null
      ] })
    ] });
  }
  function RouterConnectionScreen({ runtime }) {
    const mobile = useMobileConnectionSurface();
    if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionStatus, { runtime, mobile });
    }
    return mobile ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileConnectionScreen, { runtime }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopConnectionScreen, { runtime });
  }
  const PANEL_ROUTE_IDS = [
    "overview",
    "interfaces",
    "lineStatus",
    "balance",
    "routes",
    "terminals",
    "dhcp",
    "arp",
    "trafficLoad",
    "loadAudit",
    "trafficAudit",
    "connections",
    "dns4",
    "dns6",
    "security",
    "logs",
    "serviceLogs",
    "readonlyDiagnostics",
    "more"
  ];
  const PANEL_ROUTES = {
    overview: { id: "overview", title: "运行概览", shortTitle: "概览", description: "服务、证据、默认出口与当前异常", taskGroup: "overview" },
    interfaces: { id: "interfaces", title: "接口", shortTitle: "接口", description: "物理、VLAN、桥接与隧道接口状态", taskGroup: "interfaces" },
    lineStatus: { id: "lineStatus", title: "WAN 线路", shortTitle: "线路", description: "出口对象、接入关系与当前吞吐", taskGroup: "interfaces" },
    balance: { id: "balance", title: "WAN 分流", shortTitle: "分流", description: "默认路由、策略标记与线路分布", taskGroup: "interfaces" },
    routes: { id: "routes", title: "路由表", shortTitle: "路由", description: "默认、静态和动态路由证据", taskGroup: "more" },
    terminals: { id: "terminals", title: "在线终端", shortTitle: "终端", description: "终端身份、地址、流量与连接数", taskGroup: "terminals" },
    dhcp: { id: "dhcp", title: "DHCP", shortTitle: "DHCP", description: "地址租约、客户端与地址池", taskGroup: "terminals" },
    arp: { id: "arp", title: "ARP", shortTitle: "ARP", description: "地址身份与冲突证据", taskGroup: "terminals" },
    trafficLoad: { id: "trafficLoad", title: "资源与负载", shortTitle: "资源", description: "CPU、内存、磁盘与接口压力", taskGroup: "overview" },
    loadAudit: { id: "loadAudit", title: "负载审计", shortTitle: "负载审计", description: "资源采样序列、阈值与持续性", taskGroup: "more" },
    trafficAudit: { id: "trafficAudit", title: "流量审计", shortTitle: "流量审计", description: "协议分布与高流量对象", taskGroup: "more" },
    connections: { id: "connections", title: "连接跟踪", shortTitle: "连接", description: "活动连接、协议与对象检索", taskGroup: "more" },
    dns4: { id: "dns4", title: "IPv4 DNS", shortTitle: "DNS v4", description: "DNS 服务、上游与静态规则", taskGroup: "more" },
    dns6: { id: "dns6", title: "IPv6 与 DNS", shortTitle: "DNS v6", description: "邻居发现、DHCPv6 与 DNS 发布", taskGroup: "more" },
    security: { id: "security", title: "安全观察", shortTitle: "安全", description: "防火墙、地址集与只读告警", taskGroup: "more" },
    logs: { id: "logs", title: "运行日志", shortTitle: "日志", description: "最近系统、网络和服务事件", taskGroup: "logs" },
    serviceLogs: { id: "serviceLogs", title: "服务日志", shortTitle: "服务日志", description: "按系统、防火墙、DHCP 与 DNS 分类", taskGroup: "logs" },
    readonlyDiagnostics: { id: "readonlyDiagnostics", title: "只读诊断", shortTitle: "诊断", description: "明确边界内的连通性证据", taskGroup: "more" },
    more: { id: "more", title: "更多工具", shortTitle: "更多", description: "路由、DNS、安全、审计与连接工具", taskGroup: "more" }
  };
  const PANEL_TASK_ROUTES = ["overview", "interfaces", "terminals", "logs"];
  function isPanelRouteId(value) {
    return typeof value === "string" && PANEL_ROUTE_IDS.includes(value);
  }
  function routeFromLocation(location) {
    const hashRoute = decodeURIComponent(location.hash.replace(/^#/, "").trim());
    if (isPanelRouteId(hashRoute)) return hashRoute;
    const queryRoute = new URLSearchParams(location.search).get("section");
    return isPanelRouteId(queryRoute) ? queryRoute : "overview";
  }
  function routeUrl(route, location = window.location) {
    const query = new URLSearchParams(location.search);
    query.set("section", route);
    return `${location.pathname}?${query.toString()}#${route}`;
  }
  function syncDocumentRoute(route) {
    const definition = PANEL_ROUTES[route];
    document.body.dataset.panelRoute = route;
    document.querySelectorAll("[data-section]").forEach((node) => {
      const active = node.dataset.section === route;
      node.classList.toggle("is-active", active);
      if (active) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = definition.title;
    const pageSubtitle = document.getElementById("pageSubtitle");
    if (pageSubtitle) {
      pageSubtitle.textContent = definition.description;
      pageSubtitle.classList.remove("is-hidden");
    }
    document.title = `${definition.title} · RouterOS 只读面板`;
  }
  function normalizeCurrentUrl(route) {
    const canonical = routeUrl(route);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (canonical !== current) window.history.replaceState({ ...window.history.state || {}, panelRoute: route }, "", canonical);
  }
  function usePanelRoute() {
    const [route, setRoute] = reactExports.useState(() => typeof window === "undefined" ? "overview" : routeFromLocation(window.location));
    reactExports.useEffect(() => {
      const sync = () => {
        const next = routeFromLocation(window.location);
        normalizeCurrentUrl(next);
        syncDocumentRoute(next);
        setRoute(next);
      };
      sync();
      window.addEventListener("hashchange", sync);
      window.addEventListener("popstate", sync);
      return () => {
        window.removeEventListener("hashchange", sync);
        window.removeEventListener("popstate", sync);
      };
    }, []);
    reactExports.useEffect(() => {
      syncDocumentRoute(route);
      const frame = window.requestAnimationFrame(() => {
        var _a;
        return (_a = document.querySelector("[data-panel-route-title]")) == null ? void 0 : _a.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }, [route]);
    const navigate = reactExports.useCallback((next, options) => {
      if (next === route) return;
      const state2 = { ...window.history.state || {}, panelRoute: next };
      delete state2.mobileObject;
      const target = new URL(routeUrl(next), window.location.origin);
      target.searchParams.delete("object");
      const targetUrl = target.pathname + target.search + target.hash;
      if (options == null ? void 0 : options.replace) window.history.replaceState(state2, "", targetUrl);
      else window.history.pushState(state2, "", targetUrl);
      window.dispatchEvent(new PopStateEvent("popstate", { state: state2 }));
    }, [route]);
    return { route, navigate, definition: PANEL_ROUTES[route] };
  }
  const MOBILE_RUNTIME_QUERY = "(max-width: 1023px)";
  function useMobileRuntimeSurface() {
    const [mobile, setMobile] = reactExports.useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_RUNTIME_QUERY).matches);
    reactExports.useEffect(() => {
      const media = window.matchMedia(MOBILE_RUNTIME_QUERY);
      const sync = () => setMobile(media.matches);
      sync();
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }, []);
    return mobile;
  }
  function phaseLabel(phase, age) {
    const ageText = age === null ? "时间未记录" : age < 60 ? `${age} 秒前` : `${Math.floor(age / 60)} 分钟前`;
    if (phase === "current") return `当前 · ${ageText}`;
    if (phase === "refreshing") return `刷新中 · ${ageText}`;
    if (phase === "stale") return `历史证据 · ${ageText}`;
    if (phase === "recovering") return `恢复中 · ${ageText}`;
    if (phase === "error") return "快照不可用";
    return "正在载入";
  }
  function mobileEvidenceLabel(runtime) {
    var _a;
    const phase = phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds);
    const source = (_a = runtime.snapshot.data) == null ? void 0 : _a.updatedAt;
    const parsed = parseRfc3339Timestamp(source);
    if (parsed === null) return phase;
    const stamp = new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(parsed));
    return `${phase} · ${stamp}`;
  }
  function RuntimeActions({ runtime }) {
    const busy = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "refreshing";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-runtime-actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", title: "立即刷新", "aria-label": "立即刷新", onClick: () => void runtime.refresh("manual"), disabled: busy, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: busy ? "is-spinning" : "", size: 19, "aria-hidden": "true" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", title: "设备连接", "aria-label": "设备连接", onClick: runtime.showConnection, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { size: 19, "aria-hidden": "true" }) })
    ] });
  }
  function MobileRuntimeBar({ runtime }) {
    var _a;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel-runtime-bar panel-runtime-bar-mobile", "data-panel-runtime-toolbar": "mobile", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-runtime-device", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: ((_a = runtime.connection.profile) == null ? void 0 : _a.host) || "RouterOS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: mobileEvidenceLabel(runtime) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeActions, { runtime })
    ] });
  }
  function DesktopRuntimeBar({ runtime }) {
    var _a, _b, _c, _d;
    const identity = ((_b = (_a = runtime.snapshot.data) == null ? void 0 : _a.overview) == null ? void 0 : _b.identity) || ((_c = runtime.connection.profile) == null ? void 0 : _c.host) || "RouterOS";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel-runtime-bar panel-runtime-bar-desktop", "data-panel-runtime-toolbar": "desktop", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-runtime-device", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "当前设备" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: identity }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: ((_d = runtime.connection.profile) == null ? void 0 : _d.host) || "地址未记录" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `panel-runtime-phase is-${runtime.snapshot.phase}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeActions, { runtime })
    ] });
  }
  function PanelRuntimeChrome({ runtime }) {
    const mobile = useMobileRuntimeSurface();
    return mobile ? /* @__PURE__ */ jsxRuntimeExports.jsx(MobileRuntimeBar, { runtime }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopRuntimeBar, { runtime });
  }
  function PanelRuntimeNotice({ runtime }) {
    const snapshotMessage = runtime.snapshot.phase === "current" || runtime.snapshot.phase === "refreshing" ? "" : runtime.snapshot.error;
    const browserConnectivityHint = !runtime.online ? "浏览器报告互联网不可用；本地 RouterOS 快照请求仍会继续。" : "";
    const message = snapshotMessage || runtime.connection.warning || browserConnectivityHint;
    const showsConnectionWarning = !snapshotMessage && Boolean(runtime.connection.warning);
    const showsConnectivityHint = !snapshotMessage && !runtime.connection.warning && Boolean(browserConnectivityHint);
    if (!message) return null;
    const critical = runtime.snapshot.phase === "error" && !runtime.snapshot.data;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `panel-runtime-notice ${critical ? "is-critical" : ""}`, role: critical ? "alert" : "status", children: [
      showsConnectivityHint ? /* @__PURE__ */ jsxRuntimeExports.jsx(CloudOff, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 18, "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: message }),
      showsConnectionWarning ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", title: "关闭连接提示", "aria-label": "关闭连接提示", onClick: runtime.dismissWarning, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 17, "aria-hidden": "true" }) }) : null
    ] });
  }
  function PanelRuntimeEmptyState({ runtime }) {
    const recovering = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "idle";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "panel-runtime-empty", "data-panel-runtime-empty": runtime.snapshot.phase, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: recovering ? "is-spinning" : "", size: 26 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: recovering ? "正在建立设备快照" : "无法读取设备快照" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: runtime.snapshot.error || (recovering ? "连接已经验证，正在等待首个可用采集结果。" : "没有可供判断的 RouterOS 证据。") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => void runtime.refresh("manual"), children: "重新获取" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: runtime.showConnection, children: "检查设备连接" })
      ] })
    ] });
  }
  const SNAPSHOT_ARRAY_FIELDS = ["interfaces", "pppoe", "wan", "terminals"];
  const SNAPSHOT_RECORD_FIELDS = [
    "meta",
    "overview",
    "routes",
    "connections",
    "dns",
    "dhcp",
    "arp",
    "loadBalance",
    "security",
    "logs"
  ];
  const SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS = {
    meta: ["staticEndpointFailures", "realtimeEndpointFailures", "slowRestEndpointFailures", "detailEndpointFailures"],
    routes: ["items", "defaultRoutes", "staticRoutes", "tables"],
    connections: ["active", "topIps", "protocolTop"],
    dhcp: ["leases", "clients", "pools", "servers"],
    arp: ["items", "alerts"],
    loadBalance: ["distribution", "defaultRoutes", "mangleRules", "routingRules"],
    dns: ["forwardRules", "ipv6Nd", "ipv6DhcpClients"],
    security: ["filters", "alerts", "addressLists"],
    logs: ["all", "system", "firewall", "dhcp", "dns"]
  };
  const SNAPSHOT_RATE_FIELDS = {
    interfaces: ["txRate", "rxRate", "upRate", "downRate"],
    pppoe: ["upRate", "downRate"],
    wan: ["upRate", "downRate"],
    terminals: ["upRate", "downRate"]
  };
  const CONNECTION_RATE_FIELDS = ["upRate", "downRate", "totalRate", "sessionBytes"];
  const MAX_SNAPSHOT_COLLECTION_ROWS = 2e4;
  const TIMESTAMP_FIELD = /^(?:updatedAt|generatedAt|sourceUpdatedAt|cachedAt|lastUsedAt|createdAt|.*UpdatedAt|.*LastErrorAt)$/;
  function isRecord$2(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
  function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }
  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function hasObservedOverviewValue(value) {
    if (!isRecord$2(value)) return false;
    const stringFields = ["identity", "version", "boardName", "architecture", "uptime", "systemTime"];
    const numberFields = ["cpuLoad", "memoryUsage", "memoryUsedPercent", "diskUsage", "diskUsedPercent", "connectionTotal", "onlineTerminals"];
    return stringFields.some((key) => stringValue(value[key]) !== "") || numberFields.some((key) => finiteNumber(value[key]) !== null);
  }
  function hasRows(value) {
    return Array.isArray(value) && value.length > 0;
  }
  function hasNestedRows(value, keys) {
    if (!isRecord$2(value)) return false;
    return keys.some((key) => hasRows(value[key]));
  }
  function hasOperationalEvidenceValue(snapshot) {
    if (hasObservedOverviewValue(snapshot.overview)) return true;
    if (SNAPSHOT_ARRAY_FIELDS.some((field) => hasRows(snapshot[field]))) return true;
    if (hasNestedRows(snapshot.routes, ["items", "defaultRoutes", "staticRoutes"])) return true;
    const connections = isRecord$2(snapshot.connections) ? snapshot.connections : null;
    const connectionTotal = connections ? finiteNumber(connections.total) : null;
    return connectionTotal !== null && connectionTotal >= 0;
  }
  function validTimestamp(value) {
    return isRfc3339Timestamp(value);
  }
  function validateSnapshotTree(value, path, issues, depth = 0) {
    if (depth > 8) return;
    if (Array.isArray(value)) {
      if (value.length > MAX_SNAPSHOT_COLLECTION_ROWS) {
        issues.push(`${path || "snapshot"} 超过 ${MAX_SNAPSHOT_COLLECTION_ROWS} 项上限`);
        return;
      }
      value.forEach((item, index) => validateSnapshotTree(item, `${path}[${index}]`, issues, depth + 1));
      return;
    }
    if (!isRecord$2(value)) return;
    Object.entries(value).forEach(([key, item]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (!(path === "" && key === "updatedAt") && TIMESTAMP_FIELD.test(key) && item !== null && !validTimestamp(item)) {
        issues.push(`${nextPath} 必须是带时区的 RFC 3339 时间或 null`);
      }
      validateSnapshotTree(item, nextPath, issues, depth + 1);
    });
  }
  function validatePercentage(source, key, path, issues) {
    if (!(key in source) || source[key] === null) return;
    const value = finiteNumber(source[key]);
    if (value === null || value < 0 || value > 100) issues.push(`${path}.${key} 必须是 0–100 的有限数值`);
  }
  function validateRecordArrayFields(input, issues) {
    for (const [parentKey, fields] of Object.entries(SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS)) {
      const parent = isRecord$2(input[parentKey]) ? input[parentKey] : null;
      if (!parent) continue;
      for (const field of fields) {
        if (!(field in parent)) continue;
        const value = parent[field];
        if (!Array.isArray(value)) {
          issues.push(`${parentKey}.${field} 必须是数组`);
        } else if (!value.every(isRecord$2)) {
          issues.push(`${parentKey}.${field} 每一项必须是对象`);
        }
      }
    }
  }
  function validateNonnegativeRowNumbers(value, path, fields, issues) {
    if (!Array.isArray(value)) return;
    value.forEach((item, index) => {
      if (!isRecord$2(item)) return;
      fields.forEach((field) => {
        if (!(field in item) || item[field] === null) return;
        const observed = finiteNumber(item[field]);
        if (observed === null || observed < 0) issues.push(`${path}[${index}].${field} 必须是非负有限数值或 null`);
      });
    });
  }
  function channelTest(value) {
    const source = isRecord$2(value) ? value : {};
    return {
      ok: source.ok === true,
      error: stringValue(source.error),
      elapsedMs: finiteNumber(source.elapsedMs),
      ...stringValue(source.identity) ? { identity: stringValue(source.identity) } : {},
      ...finiteNumber(source.status) !== null ? { status: finiteNumber(source.status) } : {},
      ...stringValue(source.fingerprint) ? { fingerprint: stringValue(source.fingerprint) } : {},
      ...stringValue(source.expectedFingerprint) ? { expectedFingerprint: stringValue(source.expectedFingerprint) } : {},
      ...stringValue(source.algorithm) ? { algorithm: stringValue(source.algorithm) } : {},
      ...source.confirmationRequired === true ? { confirmationRequired: true } : {},
      ...source.hostKeyChanged === true ? { hostKeyChanged: true } : {},
      ...source.scheme === "https" || source.scheme === "http" ? { scheme: source.scheme } : {},
      ...finiteNumber(source.port) !== null ? { port: Math.round(finiteNumber(source.port)) } : {},
      ...typeof source.verifyTls === "boolean" ? { verifyTls: source.verifyTls } : {}
    };
  }
  function connectionTest(value) {
    if (!isRecord$2(value)) return null;
    return {
      ssh: channelTest(value.ssh),
      rest: channelTest(value.rest),
      elapsedMs: finiteNumber(value.elapsedMs)
    };
  }
  function routerLoginProfile(value) {
    if (!isRecord$2(value) || typeof value.configured !== "boolean") return null;
    const port = finiteNumber(value.sshPort);
    const restPort = finiteNumber(value.restPort);
    const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" ? "https" : null;
    const updatedAt = stringValue(value.updatedAt);
    if (port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
    if (value.updatedAt !== null && typeof value.updatedAt !== "undefined" && !validTimestamp(value.updatedAt)) return null;
    return {
      configured: value.configured,
      host: stringValue(value.host),
      user: stringValue(value.user),
      sshPort: Math.round(port),
      sshHostKeyFingerprint: stringValue(value.sshHostKeyFingerprint),
      restScheme,
      restPort: Math.round(restPort),
      restVerifyTls: value.restVerifyTls === true,
      insecureRestConfirmed: value.insecureRestConfirmed === true,
      source: stringValue(value.source),
      savedId: stringValue(value.savedId),
      updatedAt,
      passwordSet: value.passwordSet === true,
      lastTest: connectionTest(value.lastTest)
    };
  }
  function savedLogin(value) {
    if (!isRecord$2(value)) return null;
    const id = stringValue(value.id);
    const host = stringValue(value.host);
    const user = stringValue(value.user);
    const port = finiteNumber(value.sshPort);
    const restPort = finiteNumber(value.restPort);
    const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" ? "https" : null;
    if (!id || !host || !user || port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
    if (!validTimestamp(value.updatedAt) || !validTimestamp(value.lastUsedAt)) return null;
    return {
      id,
      host,
      user,
      sshPort: Math.round(port),
      sshHostKeyFingerprint: stringValue(value.sshHostKeyFingerprint),
      restScheme,
      restPort: Math.round(restPort),
      restVerifyTls: value.restVerifyTls === true,
      insecureRestConfirmed: value.insecureRestConfirmed === true,
      label: stringValue(value.label) || host,
      updatedAt: stringValue(value.updatedAt),
      lastUsedAt: stringValue(value.lastUsedAt),
      lastTest: connectionTest(value.lastTest)
    };
  }
  function savedLoginList(value) {
    if (!Array.isArray(value)) return null;
    const rows2 = value.map(savedLogin);
    return rows2.every((row) => row !== null) ? rows2 : null;
  }
  function validatePanelSnapshot(input) {
    if (!isRecord$2(input)) {
      return { ok: false, kind: "malformed", issues: ["快照根节点必须是 JSON 对象"] };
    }
    const issues = [];
    if ("status" in input && typeof input.status !== "string") issues.push("status 必须是字符串");
    if ("updatedAt" in input && input.updatedAt !== null && !validTimestamp(input.updatedAt)) {
      issues.push("updatedAt 必须是有效时间戳或 null");
    }
    if ("error" in input && input.error !== null && typeof input.error !== "string") {
      issues.push("error 必须是字符串或 null");
    }
    for (const field of SNAPSHOT_ARRAY_FIELDS) {
      if (field in input && !Array.isArray(input[field])) issues.push(`${field} 必须是数组`);
      if (Array.isArray(input[field]) && !input[field].every(isRecord$2)) issues.push(`${field} 每一项必须是对象`);
    }
    for (const field of SNAPSHOT_RECORD_FIELDS) {
      if (field in input && !isRecord$2(input[field])) issues.push(`${field} 必须是对象`);
    }
    const meta = isRecord$2(input.meta) ? input.meta : null;
    if (meta && "pollSeconds" in meta) {
      const pollSeconds = finiteNumber(meta.pollSeconds);
      if (pollSeconds === null || pollSeconds < 1 || pollSeconds > 300) issues.push("meta.pollSeconds 必须是 1–300 的有限数值");
    }
    const overview = isRecord$2(input.overview) ? input.overview : null;
    if (overview) {
      validatePercentage(overview, "cpuLoad", "overview", issues);
      validatePercentage(overview, "memoryUsage", "overview", issues);
      validatePercentage(overview, "diskUsage", "overview", issues);
    }
    const connections = isRecord$2(input.connections) ? input.connections : null;
    if (connections && "total" in connections) {
      const total = finiteNumber(connections.total);
      if (total === null || total < 0) issues.push("connections.total 必须是非负有限数值");
    }
    validateRecordArrayFields(input, issues);
    for (const [field, rateFields] of Object.entries(SNAPSHOT_RATE_FIELDS)) {
      validateNonnegativeRowNumbers(input[field], field, rateFields, issues);
    }
    const connectionRecord = isRecord$2(input.connections) ? input.connections : null;
    if (connectionRecord) {
      for (const field of ["active", "topIps", "protocolTop"]) {
        validateNonnegativeRowNumbers(connectionRecord[field], `connections.${field}`, CONNECTION_RATE_FIELDS, issues);
      }
    }
    validateSnapshotTree(input, "", issues);
    if (issues.length > 0) return { ok: false, kind: "malformed", issues };
    const status = stringValue(input.status).toLowerCase();
    if (status === "error" || status === "needs_config") {
      return { ok: true, kind: "error", value: input };
    }
    const hasCoreEnvelope = isRecord$2(input.meta) && isRecord$2(input.overview);
    const presentCollections = SNAPSHOT_ARRAY_FIELDS.filter((field) => Array.isArray(input[field])).length;
    const operational = status === "ok" && validTimestamp(input.updatedAt) && hasCoreEnvelope && presentCollections >= 2 && hasOperationalEvidenceValue(input);
    return { ok: true, kind: operational ? "operational" : "partial", value: input };
  }
  function parseRouterLoginBootstrap(input) {
    if (!isRecord$2(input) || input.ok !== true) return null;
    const profile = routerLoginProfile(input.routerLogin);
    const saved = savedLoginList(input.savedLogins);
    const csrfToken = stringValue(input.csrfToken);
    if (!profile || !saved || !csrfToken) return null;
    return {
      routerLogin: profile,
      savedLogins: saved,
      profileStorageAvailable: input.profileStorageAvailable === true,
      csrfToken
    };
  }
  function parseRouterLoginMutation(input) {
    if (!isRecord$2(input) || input.ok !== true) return null;
    const profile = routerLoginProfile(input.routerLogin);
    const saved = savedLoginList(input.savedLogins);
    if (!profile || !saved) return null;
    return {
      routerLogin: profile,
      savedLogins: saved,
      test: connectionTest(input.test),
      warning: stringValue(input.warning),
      removed: typeof input.removed === "boolean" ? input.removed : null
    };
  }
  function snapshotEvidenceTimestamp(snapshot) {
    const meta = isRecord$2(snapshot.meta) ? snapshot.meta : {};
    const candidates = [meta.realtimeUpdatedAt, meta.statusUpdatedAt, snapshot.updatedAt];
    for (const candidate of candidates) {
      if (!validTimestamp(candidate)) continue;
      return parseRfc3339Timestamp(candidate);
    }
    return null;
  }
  function snapshotPollSeconds(snapshot) {
    const meta = snapshot && isRecord$2(snapshot.meta) ? snapshot.meta : {};
    const raw = finiteNumber(meta.pollSeconds);
    return Math.max(2, Math.min(60, raw === null ? 5 : raw));
  }
  function snapshotHasOperationalEvidence(snapshot) {
    return hasOperationalEvidenceValue(snapshot);
  }
  class PanelApiError extends Error {
    constructor(message, status = 0, code = "request_failed", payload = null) {
      super(message);
      __publicField(this, "status");
      __publicField(this, "code");
      __publicField(this, "payload");
      this.name = "PanelApiError";
      this.status = status;
      this.code = code;
      this.payload = payload;
    }
  }
  function isRecord$1(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
  async function requestJson(path, init = {}) {
    let response;
    try {
      response = await fetch(path, {
        ...init,
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          ...init.headers
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络请求失败";
      throw new PanelApiError(message, 0, "network_error");
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      throw new PanelApiError(`接口返回了无法解析的 JSON（HTTP ${response.status}）`, response.status, "invalid_json");
    }
    if (!response.ok) {
      const message = isRecord$1(payload) && typeof payload.error === "string" ? payload.error : `请求失败（HTTP ${response.status}）`;
      const code = isRecord$1(payload) && typeof payload.code === "string" ? payload.code : "request_failed";
      throw new PanelApiError(message, response.status, code, payload);
    }
    return payload;
  }
  function writeHeaders(csrfToken) {
    return {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    };
  }
  async function fetchRouterLoginBootstrap(signal) {
    const payload = await requestJson("/api/router-login", { signal });
    const parsed = parseRouterLoginBootstrap(payload);
    if (!parsed) throw new PanelApiError("连接状态接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
    return parsed;
  }
  async function submitRouterConnection(input, csrfToken, signal) {
    const payload = await requestJson("/api/router-login", {
      method: "POST",
      signal,
      headers: writeHeaders(csrfToken),
      body: JSON.stringify({
        host: input.host,
        user: input.user,
        password: input.password,
        sshPort: input.sshPort,
        restScheme: input.restScheme,
        restPort: input.restPort,
        restVerifyTls: input.restVerifyTls,
        insecureRestConfirmed: input.insecureRestConfirmed,
        ...input.sshHostKeyFingerprint ? { sshHostKeyFingerprint: input.sshHostKeyFingerprint } : {},
        ...input.savedId ? { savedId: input.savedId } : {},
        rememberProfile: input.rememberProfile
      })
    });
    const parsed = parseRouterLoginMutation(payload);
    if (!parsed) throw new PanelApiError("连接接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
    return parsed;
  }
  async function submitRouterLogout(csrfToken, signal) {
    const payload = await requestJson("/api/router-logout", {
      method: "POST",
      signal,
      headers: writeHeaders(csrfToken),
      body: "{}"
    });
    const parsed = parseRouterLoginMutation(payload);
    if (!parsed) throw new PanelApiError("注销接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
    return parsed;
  }
  async function forgetRouterLoginProfile(savedId, csrfToken, signal) {
    const payload = await requestJson("/api/router-login-forget", {
      method: "POST",
      signal,
      headers: writeHeaders(csrfToken),
      body: JSON.stringify({ savedId })
    });
    const parsed = parseRouterLoginMutation(payload);
    if (!parsed) throw new PanelApiError("设备资料接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
    return parsed;
  }
  async function fetchPanelSnapshot(signal) {
    const payload = await requestJson("/api/snapshot", { signal });
    return validatePanelSnapshot(payload);
  }
  const initialConnection = {
    phase: "checking",
    profile: null,
    savedLogins: [],
    csrfToken: "",
    busy: false,
    error: "",
    warning: "",
    lastTest: null,
    pendingSshHostKey: null
  };
  function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
  function pendingSshHostKey(error, input) {
    if (!(error instanceof PanelApiError) || error.code !== "ssh_host_key_confirmation_required" || !isRecord(error.payload)) return null;
    const test = isRecord(error.payload.test) ? error.payload.test : {};
    const ssh = isRecord(test.ssh) ? test.ssh : {};
    const fingerprint = typeof ssh.fingerprint === "string" ? ssh.fingerprint.trim() : "";
    const algorithm = typeof ssh.algorithm === "string" ? ssh.algorithm.trim() : "";
    if (!fingerprint) return null;
    return { host: input.host, sshPort: input.sshPort, fingerprint, algorithm: algorithm || "SSH" };
  }
  const initialSnapshot = {
    phase: "idle",
    kind: null,
    data: null,
    error: "",
    lastAttemptAt: null,
    lastSuccessAt: null
  };
  function errorMessage(error) {
    if (error instanceof PanelApiError || error instanceof Error) return error.message;
    return "请求未完成";
  }
  function isSnapshotStale(snapshot, now2 = Date.now()) {
    const evidenceAt = snapshotEvidenceTimestamp(snapshot);
    if (evidenceAt === null) return true;
    const thresholdMs = Math.max(15e3, snapshotPollSeconds(snapshot) * 3e3);
    return now2 - evidenceAt > thresholdMs;
  }
  function usePanelRuntime() {
    const [view, setView] = reactExports.useState("connection");
    const [online, setOnline] = reactExports.useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
    const [connection, setConnection] = reactExports.useState(initialConnection);
    const [snapshot, setSnapshot] = reactExports.useState(initialSnapshot);
    const [clock, setClock] = reactExports.useState(() => Date.now());
    const connectionRef = reactExports.useRef(connection);
    const snapshotRef = reactExports.useRef(snapshot);
    const viewRef = reactExports.useRef(view);
    const bootstrapControllerRef = reactExports.useRef(null);
    const snapshotControllerRef = reactExports.useRef(null);
    reactExports.useEffect(() => {
      connectionRef.current = connection;
    }, [connection]);
    reactExports.useEffect(() => {
      snapshotRef.current = snapshot;
    }, [snapshot]);
    reactExports.useEffect(() => {
      viewRef.current = view;
    }, [view]);
    const retryConnectionStatus = reactExports.useCallback(async () => {
      var _a;
      (_a = bootstrapControllerRef.current) == null ? void 0 : _a.abort();
      const controller = new AbortController();
      bootstrapControllerRef.current = controller;
      setConnection((current) => ({ ...current, phase: "checking", busy: false, error: "" }));
      try {
        const result = await fetchRouterLoginBootstrap(controller.signal);
        if (controller.signal.aborted) return;
        const phase = result.routerLogin.configured ? "ready" : "unconfigured";
        setConnection({
          phase,
          profile: result.routerLogin,
          savedLogins: result.savedLogins,
          csrfToken: result.csrfToken,
          busy: false,
          error: "",
          warning: "",
          lastTest: result.routerLogin.lastTest,
          pendingSshHostKey: null
        });
        setView(result.routerLogin.configured ? "panel" : "connection");
      } catch (error) {
        if (controller.signal.aborted) return;
        setConnection((current) => ({
          ...current,
          phase: "error",
          busy: false,
          error: errorMessage(error)
        }));
        setView("connection");
      }
    }, []);
    const refresh = reactExports.useCallback(async (reason = "manual") => {
      var _a;
      if (connectionRef.current.phase !== "ready" || viewRef.current !== "panel") return;
      if (snapshotControllerRef.current && reason !== "manual") return;
      (_a = snapshotControllerRef.current) == null ? void 0 : _a.abort();
      const controller = new AbortController();
      snapshotControllerRef.current = controller;
      const startedAt = Date.now();
      const previous = snapshotRef.current;
      setSnapshot((current) => ({
        ...current,
        phase: current.data ? "refreshing" : "loading",
        error: "",
        lastAttemptAt: startedAt
      }));
      try {
        const result = await fetchPanelSnapshot(controller.signal);
        if (controller.signal.aborted) return;
        if (!result.ok) {
          const message = `快照数据不符合契约：${result.issues.join("；")}`;
          setSnapshot((current) => ({
            ...current,
            phase: current.data ? "recovering" : "error",
            kind: null,
            error: message,
            lastAttemptAt: startedAt
          }));
          return;
        }
        const data = result.value;
        const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
        if (status === "needs_config") {
          setSnapshot({ ...initialSnapshot, phase: "error", kind: "error", data, error: "RouterOS 尚未配置", lastAttemptAt: startedAt });
          await retryConnectionStatus();
          return;
        }
        const hasEvidence = snapshotHasOperationalEvidence(result.value);
        const previousData = previous.data;
        const nextData = status === "starting" && !hasEvidence && previousData ? previousData : data;
        let phase;
        if (status === "starting") phase = "recovering";
        else if (result.kind === "error") phase = hasEvidence ? "stale" : "error";
        else phase = isSnapshotStale(nextData) ? "stale" : "current";
        setSnapshot({
          phase,
          kind: result.kind,
          data: nextData,
          error: result.kind === "error" ? String(data.error || "采集返回错误状态") : phase === "stale" ? "快照时间已超出当前证据时限" : "",
          lastAttemptAt: startedAt,
          lastSuccessAt: Date.now()
        });
        if (phase === "current") {
          const meta = data.meta || {};
          const restCurrent = Boolean(
            (meta.realtimeUpdatedAt || meta.slowRestUpdatedAt) && !meta.realtimeError && !meta.slowRestError
          );
          const sshCurrent = Boolean(meta.staticUpdatedAt && !meta.staticError);
          setConnection((current) => {
            var _a2, _b, _c, _d;
            const failedRest = ((_b = (_a2 = current.lastTest) == null ? void 0 : _a2.rest) == null ? void 0 : _b.ok) === false;
            const failedSsh = ((_d = (_c = current.lastTest) == null ? void 0 : _c.ssh) == null ? void 0 : _d.ok) === false;
            const recovered = (failedRest || failedSsh) && (!failedRest || restCurrent) && (!failedSsh || sshCurrent);
            return recovered && current.warning ? { ...current, warning: "" } : current;
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const browserOfflineHint = typeof navigator !== "undefined" && !navigator.onLine;
        if (browserOfflineHint) setOnline(false);
        setSnapshot((current) => ({
          ...current,
          phase: current.data ? "recovering" : "error",
          error: browserOfflineHint ? "本地快照请求失败；浏览器同时报告互联网不可用（仅作提示）：" + errorMessage(error) : errorMessage(error),
          lastAttemptAt: startedAt
        }));
      } finally {
        if (snapshotControllerRef.current === controller) snapshotControllerRef.current = null;
      }
    }, [retryConnectionStatus]);
    reactExports.useEffect(() => {
      void retryConnectionStatus();
      return () => {
        var _a;
        return (_a = bootstrapControllerRef.current) == null ? void 0 : _a.abort();
      };
    }, [retryConnectionStatus]);
    reactExports.useEffect(() => {
      if (connection.phase !== "ready" || view !== "panel") return;
      if (snapshot.phase === "idle") {
        void refresh("initial");
        return;
      }
      if (snapshot.phase === "loading" || snapshot.phase === "refreshing") return;
      const retrySeconds = snapshot.phase === "error" || snapshot.phase === "recovering" ? 5 : snapshotPollSeconds(snapshot.data);
      const timer = window.setTimeout(() => void refresh(snapshot.phase === "current" ? "poll" : "recovery"), retrySeconds * 1e3);
      return () => window.clearTimeout(timer);
    }, [connection.phase, refresh, snapshot.data, snapshot.phase, view]);
    reactExports.useEffect(() => {
      const timer = window.setInterval(() => {
        const now2 = Date.now();
        setClock(now2);
        setSnapshot((current) => {
          if (current.phase !== "current" || !current.data || !isSnapshotStale(current.data, now2)) return current;
          return { ...current, phase: "stale", error: "快照已超过当前证据时限" };
        });
      }, 1e3);
      return () => window.clearInterval(timer);
    }, []);
    reactExports.useEffect(() => {
      const onOffline = () => {
        setOnline(false);
        if (connectionRef.current.phase === "ready" && viewRef.current === "panel") void refresh("recovery");
      };
      const onOnline = () => {
        setOnline(true);
        if (connectionRef.current.phase === "ready" && viewRef.current === "panel") void refresh("recovery");
        else if (connectionRef.current.phase === "error") void retryConnectionStatus();
      };
      const onVisibility = () => {
        if (document.visibilityState !== "visible" || connectionRef.current.phase !== "ready" || viewRef.current !== "panel") return;
        const current = snapshotRef.current;
        const lastAttempt = current.lastAttemptAt || 0;
        const pollMs = snapshotPollSeconds(current.data) * 1e3;
        if (Date.now() - lastAttempt >= pollMs) void refresh("recovery");
      };
      window.addEventListener("offline", onOffline);
      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        var _a;
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisibility);
        (_a = snapshotControllerRef.current) == null ? void 0 : _a.abort();
      };
    }, [refresh, retryConnectionStatus]);
    const connect = reactExports.useCallback(async (input) => {
      var _a;
      const current = connectionRef.current;
      if (!current.csrfToken) {
        setConnection((state2) => ({ ...state2, error: "本地会话已失效，请重新读取连接状态" }));
        return false;
      }
      setConnection((state2) => ({ ...state2, busy: true, error: "", warning: "" }));
      try {
        const result = await submitRouterConnection(input, current.csrfToken);
        (_a = snapshotControllerRef.current) == null ? void 0 : _a.abort();
        setSnapshot(initialSnapshot);
        setConnection((state2) => ({
          ...state2,
          phase: "ready",
          profile: result.routerLogin,
          savedLogins: result.savedLogins,
          busy: false,
          error: "",
          warning: result.warning,
          lastTest: result.test,
          pendingSshHostKey: null
        }));
        setView("panel");
        return true;
      } catch (error) {
        const pending = pendingSshHostKey(error, input);
        const payload = error instanceof PanelApiError && isRecord(error.payload) && isRecord(error.payload.test) ? error.payload.test : null;
        setConnection((state2) => ({
          ...state2,
          busy: false,
          error: errorMessage(error),
          lastTest: payload || state2.lastTest,
          pendingSshHostKey: pending
        }));
        return false;
      }
    }, []);
    const logout = reactExports.useCallback(async () => {
      var _a;
      const current = connectionRef.current;
      if (!current.csrfToken) return;
      setConnection((state2) => ({ ...state2, busy: true, error: "" }));
      try {
        const result = await submitRouterLogout(current.csrfToken);
        (_a = snapshotControllerRef.current) == null ? void 0 : _a.abort();
        setSnapshot(initialSnapshot);
        setConnection((state2) => ({
          ...state2,
          phase: "unconfigured",
          profile: result.routerLogin,
          savedLogins: result.savedLogins,
          busy: false,
          error: "",
          warning: "",
          lastTest: null,
          pendingSshHostKey: null
        }));
        setView("connection");
      } catch (error) {
        setConnection((state2) => ({ ...state2, busy: false, error: errorMessage(error) }));
      }
    }, []);
    const forgetProfile = reactExports.useCallback(async (savedId) => {
      const current = connectionRef.current;
      if (!current.csrfToken) return;
      setConnection((state2) => ({ ...state2, busy: true, error: "" }));
      try {
        const result = await forgetRouterLoginProfile(savedId, current.csrfToken);
        setConnection((state2) => ({
          ...state2,
          profile: result.routerLogin,
          savedLogins: result.savedLogins,
          busy: false
        }));
      } catch (error) {
        setConnection((state2) => ({ ...state2, busy: false, error: errorMessage(error) }));
      }
    }, []);
    const showConnection = reactExports.useCallback(() => setView("connection"), []);
    const cancelConnection = reactExports.useCallback(() => {
      const current = connectionRef.current;
      if (current.phase === "ready" && snapshotRef.current.data) setView("panel");
    }, []);
    const dismissWarning = reactExports.useCallback(() => setConnection((state2) => ({ ...state2, warning: "" })), []);
    const pollSeconds = snapshotPollSeconds(snapshot.data);
    const evidenceAt = snapshot.data ? snapshotEvidenceTimestamp(snapshot.data) : null;
    const evidenceAgeSeconds = evidenceAt === null ? null : Math.max(0, Math.floor((clock - evidenceAt) / 1e3));
    return reactExports.useMemo(
      () => ({
        view,
        online,
        evidenceAgeSeconds,
        pollSeconds,
        connection,
        snapshot,
        connect,
        logout,
        forgetProfile,
        retryConnectionStatus,
        refresh,
        showConnection,
        cancelConnection,
        dismissWarning
      }),
      [
        cancelConnection,
        clock,
        connect,
        connection,
        dismissWarning,
        evidenceAgeSeconds,
        forgetProfile,
        logout,
        online,
        pollSeconds,
        refresh,
        retryConnectionStatus,
        showConnection,
        snapshot,
        view
      ]
    );
  }
  function timeLabel(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(timestamp));
  }
  function linePoints(series, start, end) {
    const duration = Math.max(1, end - start);
    return series.points.map((point) => {
      const x = 6 + (point.timestamp - start) / duration * 308;
      const y = 6 + (100 - point.value) / 100 * 76;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }
  function SectionTimeSeriesChart({ visualization }) {
    const id = reactExports.useId().replace(/:/g, "");
    const points = visualization.series.flatMap((series) => series.points);
    if (points.length < 2) return null;
    const start = Math.min(...points.map((point) => point.timestamp));
    const end = Math.max(...points.map((point) => point.timestamp));
    const startLabel = timeLabel(start);
    const endLabel = timeLabel(end);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("figure", { className: "section-timeseries", "data-section-time-series": true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("figcaption", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: visualization.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
            visualization.windowLabel,
            " · 时间与比例尺来自同一采样窗"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0–100%" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-timeseries-body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "section-timeseries-scale", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "100%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "50%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "0" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-timeseries-plot", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "svg",
            {
              viewBox: "0 0 320 88",
              preserveAspectRatio: "xMidYMid meet",
              role: "img",
              "aria-labelledby": `${id}-title ${id}-desc`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("title", { id: `${id}-title`, children: visualization.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("desc", { id: `${id}-desc`, children: [
                  visualization.accessibleSummary,
                  "，横轴从 ",
                  startLabel,
                  " 到 ",
                  endLabel,
                  "，纵轴从 0% 到 100%。"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "section-series-grid", d: "M6 6H314 M6 44H314 M6 82H314" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "section-series-threshold is-85", d: "M6 17.4H314" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "section-series-threshold is-90", d: "M6 13.6H314" }),
                visualization.series.map((series) => /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: `section-series-line is-${series.key}`, points: linePoints(series, start, end) }, series.key))
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "section-timeseries-axis", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: startLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: endLabel })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { children: visualization.series.map((series) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: `is-${series.key}`, "aria-hidden": "true" }),
        series.label,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
          "阈值 ",
          series.threshold,
          "%"
        ] })
      ] }, series.key)) })
    ] });
  }
  function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function rows(value) {
    return Array.isArray(value) ? value.filter((item) => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
  }
  function text(value, fallback = "未记录") {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "是" : "否";
    return fallback;
  }
  function number(value) {
    if (value === null || value === void 0 || value === "") return null;
    const result = typeof value === "number" ? value : Number(value);
    return Number.isFinite(result) ? result : null;
  }
  function count(value) {
    return rows(value).length;
  }
  function state(value, disabled) {
    if (disabled === true) return "已停用";
    if (value === true || String(value).toLowerCase() === "running" || String(value).toLowerCase() === "bound") return "运行";
    if (value === false) return "未运行";
    return text(value);
  }
  function rate(value) {
    const observed = number(value);
    return observed === null ? "未取得" : formatRate(observed);
  }
  function table(title, columns, sourceRows2, map, empty, note) {
    return { title, columns, rows: sourceRows2.map(map), empty, note };
  }
  function evidenceMode(snapshot) {
    var _a, _b, _c, _d;
    if (isSnapshotUnavailable(snapshot) || !latestBusinessSuccessTime(snapshot)) return "unavailable";
    if (((_a = snapshot.meta) == null ? void 0 : _a.clientEvidenceBoundary) || ((_b = snapshot.meta) == null ? void 0 : _b.realtimeError) || ((_c = snapshot.meta) == null ? void 0 : _c.slowRestError) || ((_d = snapshot.meta) == null ? void 0 : _d.staticError)) return "historical";
    return "current";
  }
  function base(route, snapshot) {
    var _a;
    const mode = evidenceMode(snapshot);
    const evidenceBoundary2 = (_a = snapshot.meta) == null ? void 0 : _a.clientEvidenceBoundary;
    const boundaryLabel = evidenceBoundary2 ? "历史快照" : "";
    const successAt = latestBusinessSuccessTime(snapshot);
    return {
      title: PANEL_ROUTES[route].title,
      description: PANEL_ROUTES[route].description,
      updatedAt: successAt ? shortTimestamp(successAt) : "未记录",
      evidenceMode: mode,
      status: boundaryLabel || (mode === "unavailable" ? text(snapshot.error, "当前证据不可用") : mode === "historical" ? "历史快照 · 当前变化不可见" : "当前只读证据"),
      statusTone: mode === "unavailable" ? "danger" : mode === "historical" ? "warn" : "trust"
    };
  }
  function applyEvidenceBoundary(model) {
    if (model.evidenceMode === "current") return model;
    if (model.evidenceMode === "historical") return {
      ...model,
      metrics: model.metrics.map((metric) => ({
        ...metric,
        label: metric.label.replace(/^当前/, "历史"),
        note: [metric.note, "历史记录，不代表当前"].filter(Boolean).join(" · "),
        tone: metric.tone === "danger" ? "danger" : "warn"
      })),
      tables: model.tables.map((item) => ({
        ...item,
        note: [item.note, "以下对象来自上次成功快照，不代表当前状态"].filter(Boolean).join(" · ")
      }))
    };
    return {
      ...model,
      visualization: void 0,
      metrics: [
        { label: "当前证据", value: "不可用", note: "业务数字已隐藏", tone: "danger" },
        { label: "最近成功", value: model.updatedAt || "未记录", note: "不使用尝试时间兜底", tone: model.updatedAt && model.updatedAt !== "未记录" ? "warn" : "missing" },
        { label: "业务对象", value: "不可判断", note: "等待新的成功快照", tone: "missing" }
      ],
      tables: model.tables.map((item) => ({
        ...item,
        rows: [],
        note: "当前证据不可用；未显示业务对象",
        empty: "没有可用于当前判断的业务快照"
      }))
    };
  }
  function historyTimestamp(value) {
    const numeric = number(value);
    if (numeric !== null) return numeric < 1e12 ? numeric * 1e3 : numeric;
    return parseRfc3339Timestamp(value);
  }
  function resourceVisualization(history) {
    const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
    if (timestamps.length < 2) return void 0;
    const definitions = [
      { key: "cpu", label: "CPU", threshold: 85 },
      { key: "memory", label: "内存", threshold: 85 },
      { key: "disk", label: "磁盘", threshold: 90 }
    ];
    const series = definitions.map((definition) => {
      const values = Array.isArray(history[definition.key]) ? history[definition.key] : [];
      const length = Math.min(timestamps.length, values.length);
      const points = [];
      for (let index = 0; index < length; index += 1) {
        const timestamp = historyTimestamp(timestamps[index]);
        const value = number(values[index]);
        if (timestamp !== null && value !== null && value >= 0 && value <= 100) points.push({ timestamp, value });
      }
      return { ...definition, unit: "%", points };
    }).filter((item) => item.points.length >= 2);
    if (!series.length) return void 0;
    const allPoints = series.flatMap((item) => item.points);
    const start = Math.min(...allPoints.map((point) => point.timestamp));
    const end = Math.max(...allPoints.map((point) => point.timestamp));
    const durationSeconds = Math.max(0, Math.round((end - start) / 1e3));
    const windowLabel = durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒`;
    const latest = series.map((item) => `${item.label} ${item.points[item.points.length - 1].value}%`).join("，");
    return {
      kind: "time-series",
      title: "资源压力时间序列",
      windowLabel,
      min: 0,
      max: 100,
      series,
      accessibleSummary: `${windowLabel}，${latest}；CPU 和内存阈值 85%，磁盘阈值 90%。`
    };
  }
  function interfaceModel(route, snapshot) {
    const items = rows(snapshot.interfaces);
    const down = items.filter((item) => item.running === false).length;
    const disabled = items.filter((item) => item.disabled === true).length;
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "接口总数", value: String(items.length), tone: items.length ? "trust" : "missing" },
        { label: "未运行", value: String(down), tone: down ? "danger" : "trust" },
        { label: "已停用", value: String(disabled), tone: disabled ? "warn" : "trust" }
      ],
      tables: [table("接口对象", [
        { key: "name", label: "接口" },
        { key: "kind", label: "类型 / 角色" },
        { key: "status", label: "状态" },
        { key: "parent", label: "上级" },
        { key: "traffic", label: "接收 / 发送" }
      ], items, (item, index) => ({
        name: text(item.name || item.interface, `接口 ${index + 1}`),
        kind: `${text(item.type, "未知类型")} / ${text(item.role, "未标角色")}`,
        status: state(item.running, item.disabled),
        parent: text(item.parent || item.master || item.bridge),
        traffic: `${rate(item.rxRate ?? item.downRate)} / ${rate(item.txRate ?? item.upRate)}`
      }), "当前快照没有接口对象")]
    };
  }
  function wanModel(route, snapshot) {
    const items = rows(snapshot.wan).length ? rows(snapshot.wan) : rows(snapshot.pppoe);
    const running = items.filter((item) => item.running === true && item.disabled !== true).length;
    const observedRates = items.map((item) => ({ down: number(item.downRate), up: number(item.upRate) }));
    const ratesComplete = items.length > 0 && observedRates.every((item) => item.down !== null && item.up !== null);
    const downTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + item.down, 0) : null;
    const upTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + item.up, 0) : null;
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "运行线路", value: `${running} / ${items.length}`, tone: items.length && running === 0 ? "danger" : "trust" },
        { label: "当前下载", value: downTotal === null ? "未取得" : formatRate(downTotal), tone: downTotal === null ? "missing" : "trust" },
        { label: "当前上传", value: upTotal === null ? "未取得" : formatRate(upTotal), tone: upTotal === null ? "missing" : "trust" }
      ],
      tables: [table("WAN 对象", [
        { key: "name", label: "线路" },
        { key: "status", label: "状态" },
        { key: "parent", label: "父接口" },
        { key: "access", label: "接入" },
        { key: "traffic", label: "下载 / 上传" }
      ], items, (item, index) => ({
        name: text(item.name || item.interface, `WAN ${index + 1}`),
        status: state(item.running, item.disabled),
        parent: text(item.parent),
        access: text(item.access || item.kind),
        traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`
      }), "当前快照没有 WAN 对象")]
    };
  }
  function routeModel(route, snapshot) {
    const routeData = record(snapshot.routes);
    const routeItems = rows(routeData.items);
    const defaultRouteItems = rows(routeData.defaultRoutes);
    const items = routeItems.length ? routeItems : defaultRouteItems;
    const active = items.filter((item) => item.active === true && item.disabled !== true).length;
    const defaults = routeItems.length ? items.filter((item) => item.default === true || item.dstAddress === "0.0.0.0/0" || item.dstAddress === "::/0").length : defaultRouteItems.length;
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "路由记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
        { label: "活动记录", value: String(active), tone: active ? "trust" : "warn" },
        { label: "默认路由", value: String(defaults), tone: defaults ? "trust" : "warn" }
      ],
      tables: [table("路由记录", [
        { key: "destination", label: "目的" },
        { key: "gateway", label: "网关" },
        { key: "table", label: "路由表" },
        { key: "distance", label: "距离" },
        { key: "status", label: "状态" }
      ], items, (item) => ({
        destination: text(item.dstAddress, item.default === true ? "0.0.0.0/0" : "未记录"),
        gateway: text(item.gateway || item.gatewayStatus),
        table: text(item.table || item.routingTable, "main"),
        distance: text(item.distance),
        status: item.disabled === true ? "已停用" : item.active === true ? "活动" : "非活动"
      }), "当前快照没有路由记录")]
    };
  }
  function balanceModel(route, snapshot) {
    const balance = record(snapshot.loadBalance);
    const defaults = rows(balance.defaultRoutes);
    const rules = [...rows(balance.mangleRules), ...rows(balance.routingRules)];
    const activeLines = number(balance.activeLines);
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "工作模式", value: text(balance.mode), tone: "trust" },
        { label: "活动线路", value: activeLines === null ? "未记录" : String(activeLines), tone: activeLines === null ? "missing" : activeLines > 0 ? "trust" : "warn" },
        { label: "PCC", value: balance.pccDetected === true ? "已识别" : "未识别", tone: balance.pccDetected === true ? "trust" : "missing" }
      ],
      tables: [
        table("默认路由", [{ key: "gateway", label: "网关" }, { key: "table", label: "路由表" }, { key: "distance", label: "距离" }, { key: "status", label: "状态" }], defaults, (item) => ({ gateway: text(item.gateway), table: text(item.table), distance: text(item.distance), status: item.active === true ? "活动" : "非活动" }), "未取得默认路由"),
        table("策略规则", [{ key: "chain", label: "链 / 动作" }, { key: "mark", label: "标记 / 表" }, { key: "interface", label: "接口" }, { key: "comment", label: "说明" }], rules, (item) => ({ chain: `${text(item.chain, "rule")} / ${text(item.action)}`, mark: text(item.newRoutingMark || item.table || item.routingMark), interface: text(item.inInterface || item.outInterface || item.interface), comment: text(item.comment, "—") }), "未取得策略规则")
      ]
    };
  }
  function terminalModel(route, snapshot) {
    const items = rows(snapshot.terminals);
    const online = items.filter((item) => item.online === true || /^(?:online|active|reachable|bound)$/i.test(text(item.status, ""))).length;
    const connectionValues = items.map((item) => number(item.connections));
    const connectionsComplete = items.length > 0 && connectionValues.every((value) => value !== null);
    const connections = connectionsComplete ? connectionValues.reduce((sum, value) => sum + value, 0) : null;
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "终端记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
        { label: "在线标记", value: String(online), tone: online ? "trust" : "missing" },
        { label: "连接合计", value: connections === null ? "未取得" : String(connections), tone: connections === null ? "missing" : "trust" }
      ],
      tables: [table("终端对象", [
        { key: "name", label: "终端" },
        { key: "address", label: "IP / MAC" },
        { key: "status", label: "状态" },
        { key: "connections", label: "连接" },
        { key: "traffic", label: "下载 / 上传" }
      ], items, (item, index) => ({
        name: text(item.displayName || item.hostname || item.name, `终端 ${index + 1}`),
        address: `${text(item.ip)} / ${text(item.mac)}`,
        status: text(item.status, item.online === true ? "在线" : "未确认"),
        connections: text(item.connections, "未取得"),
        traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`
      }), "当前快照没有终端记录")]
    };
  }
  function dhcpModel(route, snapshot) {
    const dhcp = record(snapshot.dhcp);
    const leases = rows(dhcp.leases);
    const clients = rows(dhcp.clients);
    const pools = rows(dhcp.pools);
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "租约", value: String(leases.length), tone: leases.length ? "trust" : "missing" },
        { label: "上游客户端", value: String(clients.length), tone: clients.length ? "trust" : "missing" },
        { label: "地址池", value: String(pools.length), tone: pools.length ? "trust" : "missing" }
      ],
      tables: [
        table("地址租约", [{ key: "host", label: "主机" }, { key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "server", label: "服务器" }, { key: "status", label: "状态" }], leases, (item) => ({ host: text(item.hostName || item.hostname), address: text(item.address), mac: text(item.macAddress || item.mac), server: text(item.server), status: text(item.status) }), "当前快照没有 DHCP 租约"),
        table("DHCP 客户端", [{ key: "interface", label: "接口" }, { key: "status", label: "状态" }, { key: "route", label: "默认路由" }, { key: "dns", label: "使用上游 DNS" }], clients, (item) => ({ interface: text(item.interface), status: text(item.status), route: text(item.addDefaultRoute), dns: text(item.usePeerDns) }), "当前快照没有 DHCP 客户端")
      ]
    };
  }
  function arpModel(route, snapshot) {
    const arp = record(snapshot.arp);
    const items = rows(arp.items).length ? rows(arp.items) : rows(snapshot.arp);
    const alerts = rows(arp.alerts);
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "ARP 记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
        { label: "身份告警", value: String(alerts.length), tone: alerts.length ? "danger" : "trust" },
        { label: "动态记录", value: String(items.filter((item) => item.dynamic === true).length), tone: "trust" }
      ],
      tables: [
        table("身份告警", [{ key: "address", label: "地址" }, { key: "kind", label: "类型" }, { key: "detail", label: "证据" }], alerts, (item) => ({ address: text(item.ip || item.address), kind: text(item.type || item.level, "冲突"), detail: text(item.message || item.detail) }), "没有记录到 ARP 身份告警"),
        table("ARP 对象", [{ key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "status", label: "状态" }, { key: "interface", label: "接口" }], items, (item) => ({ address: text(item.ip || item.address), mac: text(item.mac || item.macAddress), status: text(item.status, item.dynamic === true ? "动态" : "未确认"), interface: text(item.interface) }), "当前快照没有 ARP 记录")
      ]
    };
  }
  function resourceModel(route, snapshot) {
    const overview = record(snapshot.overview);
    const history = record(overview.history);
    const series = ["cpu", "memory", "disk"].map((key) => ({ key, values: Array.isArray(history[key]) ? history[key] : [] }));
    const cpu = number(overview.cpuLoad);
    const memory = number(overview.memoryUsage);
    const disk = number(overview.diskUsage);
    return {
      ...base(route, snapshot),
      visualization: resourceVisualization(history),
      metrics: [
        { label: "CPU", value: cpu === null ? "未取得" : `${cpu}%`, tone: cpu === null ? "missing" : cpu >= 85 ? "danger" : "trust" },
        { label: "内存", value: memory === null ? "未取得" : `${memory}%`, tone: memory === null ? "missing" : memory >= 85 ? "danger" : "trust" },
        { label: "磁盘", value: disk === null ? "未取得" : `${disk}%`, tone: disk === null ? "missing" : disk >= 90 ? "danger" : "trust" }
      ],
      tables: [table(route === "loadAudit" ? "资源采样摘要" : "资源证据", [{ key: "series", label: "对象" }, { key: "samples", label: "有效样本" }, { key: "latest", label: "最近值" }, { key: "range", label: "样本范围" }], series, (item) => {
        const values = Array.isArray(item.values) ? item.values : [];
        const observed = values.map((value) => number(value)).filter((value) => value !== null && value >= 0 && value <= 100);
        return {
          series: item.key === "cpu" ? "CPU" : item.key === "memory" ? "内存" : "磁盘",
          samples: observed.length ? `${observed.length} 个` : "未取得",
          latest: observed.length ? `${observed[observed.length - 1]}%` : "未取得",
          range: observed.length ? `${Math.min(...observed)}% – ${Math.max(...observed)}%` : "未取得"
        };
      }, "当前快照没有资源采样记录", "没有配套时间戳时只显示样本摘要，不绘制趋势")]
    };
  }
  function connectionModel(route, snapshot) {
    const connections = record(snapshot.connections);
    const active = rows(connections.active);
    const protocols = rows(connections.protocolTop);
    const topIps = rows(connections.topIps);
    const source = route === "connections" ? active : route === "trafficAudit" ? [...protocols, ...topIps] : active;
    const total = number(connections.total);
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "连接总数", value: total === null ? "未取得" : String(total), tone: total === null ? "missing" : "trust" },
        { label: "当前明细", value: String(active.length), tone: active.length ? "trust" : "missing" },
        { label: "协议分组", value: String(protocols.length), tone: protocols.length ? "trust" : "missing" }
      ],
      tables: [table(route === "connections" ? "活动连接" : "流量对象", [{ key: "source", label: "源" }, { key: "target", label: "目标 / 协议" }, { key: "connections", label: "连接" }, { key: "traffic", label: "流量" }], source, (item) => {
        const remote = text(item.destination || item.remoteIp || item.dstAddress || item.dst, "");
        const protocol = text(item.protocol || item.label, "");
        return {
          source: text(item.source || item.localIp || item.srcAddress || item.src || item.ip || item.name),
          target: [remote, protocol].filter(Boolean).join(" / ") || "未记录",
          connections: text(item.connections ?? item.count, "—"),
          traffic: text(item.totalRate ?? item.bytes ?? item.value, "未取得")
        };
      }, route === "connections" ? "当前快照没有活动连接明细" : "当前快照没有流量审计对象")]
    };
  }
  function dnsModel(route, snapshot) {
    const dns = record(snapshot.dns);
    const ipv6 = route === "dns6";
    const source = ipv6 ? [...rows(dns.ipv6Nd), ...rows(dns.ipv6DhcpClients)] : rows(dns.forwardRules);
    const servers = Array.isArray(dns.servers) ? dns.servers : [];
    return {
      ...base(route, snapshot),
      metrics: ipv6 ? [
        { label: "ND 对象", value: String(count(dns.ipv6Nd)), tone: count(dns.ipv6Nd) ? "trust" : "missing" },
        { label: "DHCPv6 客户端", value: String(count(dns.ipv6DhcpClients)), tone: count(dns.ipv6DhcpClients) ? "trust" : "missing" },
        { label: "DNS 发布", value: String(rows(dns.ipv6Nd).filter((item) => item.advertiseDns === true).length), tone: "trust" }
      ] : [
        { label: "远程请求", value: dns.running === true ? "允许" : dns.running === false ? "未允许" : "未记录", tone: dns.running === true ? "trust" : dns.running === false ? "warn" : "missing" },
        { label: "上游服务器", value: String(servers.length), tone: servers.length ? "trust" : "warn" },
        { label: "静态规则", value: text(dns.forwardRuleCount, String(source.length)), tone: source.length ? "trust" : "missing" }
      ],
      tables: [table(ipv6 ? "IPv6 网络对象" : "DNS 静态规则", ipv6 ? [
        { key: "interface", label: "接口" },
        { key: "status", label: "状态" },
        { key: "prefix", label: "前缀 / DNS" },
        { key: "route", label: "默认路由" }
      ] : [
        { key: "name", label: "名称" },
        { key: "type", label: "类型" },
        { key: "value", label: "目标" },
        { key: "status", label: "状态" }
      ], source, (item) => {
        if (ipv6) return { interface: text(item.interface), status: text(item.status, item.advertiseDns === true ? "发布 DNS" : "未确认"), prefix: text(item.prefix || item.dnsServers), route: text(item.addDefaultRoute) };
        return { name: text(item.name), type: text(item.type), value: text(item.value || item.address), status: item.disabled === true ? "已停用" : "启用" };
      }, ipv6 ? "当前快照没有 IPv6 ND/DHCP 对象" : "当前快照没有 DNS 静态规则")]
    };
  }
  function securityModel(route, snapshot) {
    const security = record(snapshot.security);
    const filters = rows(security.filters);
    const alerts = rows(security.alerts);
    const addressLists = rows(security.addressLists);
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "过滤规则", value: String(filters.length), tone: filters.length ? "trust" : "missing" },
        { label: "地址集", value: String(addressLists.length), tone: addressLists.length ? "trust" : "missing" },
        { label: "告警记录", value: String(alerts.length), tone: alerts.length ? "danger" : "trust" }
      ],
      tables: [
        table("安全告警", [{ key: "time", label: "时间" }, { key: "scope", label: "范围" }, { key: "message", label: "事件" }], alerts, (item) => ({ time: text(item.time || item.lastConfirmed), scope: text(item.affected || item.topics), message: text(item.abnormal || item.message) }), "当前快照没有安全告警"),
        table("防火墙规则", [{ key: "order", label: "顺序" }, { key: "chain", label: "链" }, { key: "action", label: "动作" }, { key: "comment", label: "说明" }], filters, (item) => ({ order: text(item.rawOrder), chain: text(item.chain), action: text(item.action), comment: text(item.comment, "—") }), "当前快照没有防火墙规则")
      ]
    };
  }
  function logModel(route, snapshot) {
    const logs = record(snapshot.logs);
    const all = rows(logs.all);
    const grouped = route === "serviceLogs" ? ["system", "firewall", "dhcp", "dns"].flatMap((group) => rows(logs[group]).map((item) => ({ ...item, group }))) : all;
    return {
      ...base(route, snapshot),
      metrics: [
        { label: "全部记录", value: String(all.length), tone: all.length ? "trust" : "missing" },
        { label: "防火墙", value: String(count(logs.firewall)), tone: count(logs.firewall) ? "warn" : "trust" },
        { label: "错误/警告", value: String(all.filter((item) => /error|warning|critical/i.test(text(item.topics, ""))).length), tone: "warn" }
      ],
      tables: [table(route === "serviceLogs" ? "分类日志" : "最近日志", [{ key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }], grouped, (item) => ({ time: text(item.time), topics: route === "serviceLogs" ? `${text(item.group)} · ${text(item.topics)}` : text(item.topics), message: text(item.message) }), "当前快照没有日志记录")]
    };
  }
  function diagnosticsModel(route, snapshot) {
    const meta = record(snapshot.meta);
    const failures = [...rows(meta.realtimeEndpointFailures), ...rows(meta.staticEndpointFailures), ...rows(meta.detailEndpointFailures)];
    return {
      ...base(route, snapshot),
      status: "按需诊断受公开配置边界约束",
      statusTone: "warn",
      metrics: [
        { label: "REST 采集", value: meta.realtimeError ? "有错误" : "无错误记录", tone: meta.realtimeError ? "danger" : "trust" },
        { label: "SSH 采集", value: meta.staticError ? "有错误" : "无错误记录", tone: meta.staticError ? "danger" : "trust" },
        { label: "失败端点", value: failures.length ? String(failures.length) : "未记录", tone: failures.length ? "warn" : "missing" }
      ],
      tables: [table("采集与诊断边界", [{ key: "group", label: "通道" }, { key: "name", label: "对象" }, { key: "message", label: "记录" }], failures, (item) => ({ group: text(item.group), name: text(item.name), message: text(item.message, "失败端点记录") }), "没有失败端点记录；这不等于外部诊断已经执行", "公开 RouterOS-only 配置默认不执行外部只读探测")]
    };
  }
  function buildCurrentSectionModel(route, snapshot) {
    if (route === "interfaces") return interfaceModel(route, snapshot);
    if (route === "lineStatus") return wanModel(route, snapshot);
    if (route === "balance") return balanceModel(route, snapshot);
    if (route === "routes") return routeModel(route, snapshot);
    if (route === "terminals") return terminalModel(route, snapshot);
    if (route === "dhcp") return dhcpModel(route, snapshot);
    if (route === "arp") return arpModel(route, snapshot);
    if (route === "trafficLoad" || route === "loadAudit") return resourceModel(route, snapshot);
    if (route === "trafficAudit" || route === "connections") return connectionModel(route, snapshot);
    if (route === "dns4" || route === "dns6") return dnsModel(route, snapshot);
    if (route === "security") return securityModel(route, snapshot);
    if (route === "logs" || route === "serviceLogs") return logModel(route, snapshot);
    if (route === "readonlyDiagnostics") return diagnosticsModel(route, snapshot);
    return routeModel(route, snapshot);
  }
  function buildSectionModel(route, snapshot) {
    return applyEvidenceBoundary(buildCurrentSectionModel(route, snapshot));
  }
  const NETWORK_ROUTES = [
    { route: "interfaces", label: "接口" },
    { route: "lineStatus", label: "WAN" },
    { route: "routes", label: "路由" },
    { route: "connections", label: "连接" }
  ];
  const TERMINAL_ROUTES = [
    { route: "terminals", label: "终端" },
    { route: "dhcp", label: "DHCP" },
    { route: "arp", label: "ARP" }
  ];
  const LOG_ROUTES = [
    { route: "logs", label: "运行日志" },
    { route: "serviceLogs", label: "服务日志" }
  ];
  const MORE_ROUTE_GROUPS = [
    { id: "network", label: "路径与性能" },
    { id: "services", label: "审计与服务" }
  ];
  const MORE_ROUTES = [
    { route: "balance", label: "WAN 分流", group: "network" },
    { route: "routes", label: "路由表", group: "network" },
    { route: "connections", label: "连接跟踪", group: "network" },
    { route: "trafficLoad", label: "资源与负载", group: "network" },
    { route: "loadAudit", label: "负载审计", group: "network" },
    { route: "trafficAudit", label: "流量审计", group: "services" },
    { route: "dns4", label: "IPv4 DNS", group: "services" },
    { route: "dns6", label: "IPv6 与 DNS", group: "services" },
    { route: "security", label: "安全观察", group: "services" },
    { route: "readonlyDiagnostics", label: "只读诊断", group: "services" }
  ];
  const DOMAIN = {
    interfaces: {
      icon: Cable,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "attention", label: "异常" },
        { id: "running", label: "运行" }
      ]
    },
    terminals: {
      icon: UsersRound,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "online", label: "在线" },
        { id: "attention", label: "待确认" }
      ]
    },
    logs: {
      icon: ScrollText,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "alerts", label: "告警" },
        { id: "system", label: "系统" }
      ]
    },
    serviceLogs: {
      icon: ScrollText,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "alerts", label: "告警" },
        { id: "system", label: "系统" }
      ]
    },
    connections: {
      icon: Network,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "tcp", label: "TCP" },
        { id: "udp", label: "UDP" }
      ]
    },
    dns4: {
      icon: Network,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "attention", label: "异常" },
        { id: "running", label: "启用" }
      ]
    },
    dns6: {
      icon: Network,
      searchable: true,
      filters: [
        { id: "all", label: "全部" },
        { id: "attention", label: "异常" },
        { id: "running", label: "启用" }
      ]
    }
  };
  const DEFAULT_DOMAIN = {
    searchable: true,
    filters: [{ id: "all", label: "全部" }]
  };
  const ATTENTION_PATTERN = /未运行|停用|异常|失败|错误|警告|离线|不可用|critical|error|warning|down|offline|failed/i;
  const RUNNING_PATTERN = /运行|在线|active|running|bound|online/i;
  function routeTabs(route) {
    const group = PANEL_ROUTES[route].taskGroup;
    if (group === "terminals") return TERMINAL_ROUTES;
    if (group === "logs") return LOG_ROUTES;
    return NETWORK_ROUTES;
  }
  function routeIcon(route) {
    if (DOMAIN[route]) return DOMAIN[route].icon;
    const group = PANEL_ROUTES[route].taskGroup;
    if (group === "terminals") return UsersRound;
    if (group === "logs") return ScrollText;
    if (route === "trafficLoad" || route === "loadAudit") return Gauge;
    if (route === "readonlyDiagnostics") return ShieldCheck;
    return Router;
  }
  function toneIcon(tone) {
    if (tone === "danger") return CircleAlert;
    if (tone === "warn" || tone === "missing") return TriangleAlert;
    return ShieldCheck;
  }
  function shortHash(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index) | 0;
    }
    return Math.abs(hash).toString(36);
  }
  function rowsFromModel(route, model) {
    const result = [];
    model.tables.forEach((table2, tableIndex) => {
      table2.rows.forEach((values, rowIndex) => {
        const ordered = table2.columns.map((column) => values[column.key] || "—");
        let primary = ordered[0] || `对象 ${rowIndex + 1}`;
        let secondary = ordered[1] || table2.title;
        const statusColumn = table2.columns.find((column) => column.key === "status" || column.key === "topics");
        let trailing = statusColumn ? values[statusColumn.key] || "—" : ordered[ordered.length - 1] || "—";
        if (route === "logs" || route === "serviceLogs") {
          primary = values.message || primary;
          secondary = values.time || secondary;
          trailing = values.topics || trailing;
        } else if (route === "connections") {
          primary = values.source || primary;
          secondary = values.target || secondary;
          trailing = values.traffic || trailing;
        } else if (route === "trafficAudit") {
          const target = values.target && values.target !== "未记录" ? values.target : "";
          primary = target || values.source || primary;
          secondary = values.connections && values.connections !== "—" ? `${values.connections} 个连接` : values.source || secondary;
          trailing = values.traffic || trailing;
        } else if (route === "security" && table2.title === "防火墙规则") {
          const chain = values.chain && values.chain !== "—" ? values.chain : "";
          const action = values.action && values.action !== "—" ? values.action : "";
          primary = values.comment && !/^(?:—|未记录)$/.test(values.comment) ? values.comment : [chain, action].filter(Boolean).join(" / ") || primary;
          secondary = [chain, action].filter(Boolean).join(" · ") || secondary;
          trailing = values.order && !/^(?:—|未记录)$/.test(values.order) ? `#${values.order}` : action || trailing;
        } else if (route === "security" && table2.title === "安全告警") {
          primary = values.message || primary;
          secondary = [values.time, values.scope].filter((value) => value && value !== "—").join(" · ") || secondary;
          trailing = values.scope || trailing;
        } else if (route === "dhcp" && table2.title === "地址租约") {
          primary = values.host || primary;
          secondary = [values.address, values.mac].filter((value) => value && value !== "—").join(" · ") || secondary;
          trailing = values.status || trailing;
        } else if (route === "dhcp" && table2.title === "DHCP 客户端") {
          primary = values.interface || primary;
          secondary = values.route && values.route !== "—" ? `默认路由 ${values.route}` : secondary;
          trailing = values.status || trailing;
        } else if ((route === "trafficLoad" || route === "loadAudit") && values.series) {
          primary = values.series;
          secondary = values.samples || secondary;
          trailing = values.latest || trailing;
        }
        const identity = `${route}:${tableIndex}:${rowIndex}:${primary}`;
        result.push({
          id: `${route}-${tableIndex}-${rowIndex}-${shortHash(identity)}`,
          table: table2.title,
          columns: table2.columns,
          values,
          primary,
          secondary,
          trailing,
          searchText: Object.values(values).join(" ").toLocaleLowerCase()
        });
      });
    });
    return result;
  }
  function filterMatches(filter, row) {
    const text2 = row.searchText;
    if (filter === "all") return true;
    if (filter === "attention" || filter === "alerts") return ATTENTION_PATTERN.test(text2);
    if (filter === "running" || filter === "online") {
      return RUNNING_PATTERN.test(text2) && !ATTENTION_PATTERN.test(text2);
    }
    if (filter === "system") return /system|系统/i.test(text2);
    if (filter === "tcp") return /\btcp\b/i.test(text2);
    if (filter === "udp") return /\budp\b/i.test(text2);
    return true;
  }
  function selectedObjectFromUrl() {
    return new URLSearchParams(window.location.search).get("object") || "";
  }
  function objectUrl(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("object", id);
    else url.searchParams.delete("object");
    return `${url.pathname}${url.search}${url.hash}`;
  }
  function useObjectHistory(route) {
    const [selectedId, setSelectedId] = reactExports.useState(() => typeof window === "undefined" ? "" : selectedObjectFromUrl());
    reactExports.useEffect(() => {
      const sync = () => setSelectedId(selectedObjectFromUrl());
      sync();
      window.addEventListener("popstate", sync);
      return () => window.removeEventListener("popstate", sync);
    }, [route]);
    const open = (id) => {
      const state2 = { ...window.history.state || {}, mobileObject: id };
      window.history.pushState(state2, "", objectUrl(id));
      window.dispatchEvent(new PopStateEvent("popstate", { state: state2 }));
    };
    const close = () => {
      var _a;
      if (((_a = window.history.state) == null ? void 0 : _a.mobileObject) === selectedId) {
        window.history.back();
        return;
      }
      const state2 = { ...window.history.state || {} };
      delete state2.mobileObject;
      window.history.replaceState(state2, "", objectUrl(null));
      window.dispatchEvent(new PopStateEvent("popstate", { state: state2 }));
    };
    return { selectedId, open, close };
  }
  function EvidenceBadge({ model }) {
    const Icon2 = toneIcon(model.statusTone);
    const label = model.evidenceMode === "current" ? "当前证据" : model.evidenceMode === "historical" ? "历史证据" : "证据不可用";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `mdw-evidence is-${model.statusTone}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 15 }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.updatedAt || "时间未记录" })
      ] })
    ] });
  }
  function DomainMenu({ onNavigate }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mdw-more", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { "aria-label": "更多只读工具", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { "aria-hidden": "true", size: 21 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: MORE_ROUTES.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-section": item.route, onClick: () => onNavigate(item.route), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 16 })
      ] }, item.route)) })
    ] });
  }
  function MetricStrip({ model }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mdw-metrics", "aria-label": "关键指标", children: model.metrics.slice(0, 3).map((metric) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${metric.tone || "trust"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: metric.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: metric.value }),
      metric.note ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: metric.note }) : null
    ] }, metric.label)) });
  }
  function MobileMoreDirectory({
    model,
    onNavigate
  }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: "mdw-shell mdw-directory-shell",
        "data-mobile-domain-workspace": "more",
        "data-mobile-evidence-mode": model.evidenceMode,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mdw-header mdw-directory-header", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-title-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mdw-title-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { "aria-hidden": "true", size: 22 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "只读工具目录" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { tabIndex: -1, "data-panel-route-title": true, children: "更多工具" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: PANEL_ROUTES.more.description })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mdw-directory-list", "aria-label": "更多只读工具", children: MORE_ROUTE_GROUPS.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mdw-directory-group", "aria-labelledby": `mdw-directory-${group.id}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: `mdw-directory-${group.id}`, children: group.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: MORE_ROUTES.filter((item) => item.group === group.id).map((item) => {
              const ItemIcon = routeIcon(item.route);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-section": item.route, onClick: () => onNavigate(item.route), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mdw-directory-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIcon, { "aria-hidden": "true", size: 19 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mdw-directory-copy", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: PANEL_ROUTES[item.route].description })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
              ] }, item.route);
            }) })
          ] }, group.id)) })
        ]
      }
    );
  }
  function DetailPane({
    row,
    model,
    route,
    onClose,
    titleRef
  }) {
    const Icon2 = routeIcon(route);
    if (!row) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "mdw-inspector is-empty", "aria-label": "对象检查器", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mdw-inspector-symbol", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 24 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "对象检查器" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "从列表选择一个对象" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "右侧会显示该对象的完整字段、来源分组和证据边界，不会重复聚合指标。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "证据模式" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: model.evidenceMode === "current" ? "当前" : model.evidenceMode === "historical" ? "历史" : "不可用" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "对象总数" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: model.tables.reduce((sum, table2) => sum + table2.rows.length, 0) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "最近成功" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: model.updatedAt || "未记录" })
          ] })
        ] })
      ] });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "mdw-inspector has-object", "data-mobile-object-detail": row.id, "aria-labelledby": "mdw-detail-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onClose, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { "aria-hidden": "true", size: 18 }),
          "返回列表"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.table })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-detail-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 22 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
            PANEL_ROUTES[route].shortTitle,
            "对象"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "mdw-detail-title", tabIndex: -1, ref: titleRef, children: row.primary }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: row.secondary })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mdw-detail-fields", children: row.columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: column.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: row.values[column.key] || "—" })
      ] }, column.key)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { "aria-hidden": "true", size: 16 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: model.evidenceMode === "current" ? "当前只读快照" : model.evidenceMode === "historical" ? "历史只读快照" : "证据不可用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.status })
        ] })
      ] })
    ] });
  }
  function MobileDomainWorkspace({
    route,
    snapshot,
    onNavigate
  }) {
    var _a;
    const model = reactExports.useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]);
    const allRows = reactExports.useMemo(() => rowsFromModel(route, model), [route, model]);
    const definition = DOMAIN[route] || DEFAULT_DOMAIN;
    const tabs = routeTabs(route);
    const { selectedId, open, close } = useObjectHistory(route);
    const [query, setQuery] = reactExports.useState("");
    const [filter, setFilter] = reactExports.useState("all");
    const [sort, setSort] = reactExports.useState("source");
    const [page, setPage] = reactExports.useState(1);
    const detailTitleRef = reactExports.useRef(null);
    const lastTriggerRef = reactExports.useRef("");
    const rowRefs = reactExports.useRef(/* @__PURE__ */ new Map());
    reactExports.useEffect(() => {
      setQuery("");
      setFilter("all");
      setSort("source");
      setPage(1);
    }, [route]);
    const filtered = reactExports.useMemo(() => {
      const needle = query.trim().toLocaleLowerCase();
      const rows2 = allRows.filter((row) => (!needle || row.searchText.includes(needle)) && filterMatches(filter, row));
      if (sort === "source") return rows2;
      return [...rows2].sort((left, right) => {
        const result = left.primary.localeCompare(right.primary, "zh-CN", { numeric: true });
        return sort === "asc" ? result : -result;
      });
    }, [allRows, filter, query, sort]);
    const pageSize = 20;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const visibleRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const selectedRow = allRows.find((row) => row.id === selectedId) || null;
    const Icon2 = routeIcon(route);
    reactExports.useEffect(() => {
      if (selectedRow) {
        window.requestAnimationFrame(() => {
          var _a2;
          return (_a2 = detailTitleRef.current) == null ? void 0 : _a2.focus({ preventScroll: true });
        });
        return;
      }
      if (!lastTriggerRef.current) return;
      const trigger = rowRefs.current.get(lastTriggerRef.current);
      window.requestAnimationFrame(() => trigger == null ? void 0 : trigger.focus({ preventScroll: true }));
    }, [selectedRow]);
    if (route === "more") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(MobileMoreDirectory, { model, onNavigate });
    }
    const openRow = (row) => {
      lastTriggerRef.current = row.id;
      open(row.id);
    };
    const closeDetail = () => {
      if (selectedRow) lastTriggerRef.current = selectedRow.id;
      close();
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: `mdw-shell ${selectedRow ? "has-selection" : ""}`,
        "data-mobile-domain-workspace": route,
        "data-mobile-evidence-mode": model.evidenceMode,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mdw-header", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-title-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mdw-title-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 21 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: PANEL_ROUTES[route].taskGroup === "logs" ? "事件时间线" : PANEL_ROUTES[route].taskGroup === "terminals" ? "终端工作区" : "网络工作区" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { tabIndex: -1, "data-panel-route-title": true, children: model.title })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DomainMenu, { onNavigate })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-status-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(EvidenceBadge, { model }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: model.status })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "mdw-route-switcher", "aria-label": "当前工作区分类", children: tabs.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "aria-current": route === item.route ? "page" : void 0,
                className: route === item.route ? "is-active" : "",
                onClick: () => onNavigate(item.route),
                children: item.label
              },
              item.route
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-layout", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mdw-list-pane", "aria-label": model.title + "对象列表", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MetricStrip, { model }),
              model.visualization ? /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTimeSeriesChart, { visualization: model.visualization }) : null,
              definition.searchable ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-controls", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mdw-search", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "aria-hidden": "true", size: 17 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
                    "搜索",
                    model.title
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "search",
                      value: query,
                      onChange: (event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      },
                      placeholder: `搜索${model.title}`
                    }
                  ),
                  query ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", "aria-label": "清除搜索", onClick: () => {
                    setQuery("");
                    setPage(1);
                  }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "aria-hidden": "true", size: 16 }) }) : null
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-filter-row", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "aria-label": "对象筛选", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ListFilter, { "aria-hidden": "true", size: 16 }),
                    definition.filters.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "aria-pressed": filter === item.id,
                        onClick: () => {
                          setFilter(item.id);
                          setPage(1);
                        },
                        children: item.label
                      },
                      item.id
                    ))
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { "aria-hidden": "true", size: 15 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "排序" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: sort, onChange: (event) => setSort(event.target.value), children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "source", children: "采集顺序" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "asc", children: "名称正序" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "desc", children: "名称倒序" })
                    ] })
                  ] })
                ] })
              ] }) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-list-heading", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: filtered.length }),
                  " 个对象"
                ] }),
                query || filter !== "all" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                  "已从 ",
                  allRows.length,
                  " 个对象中筛选"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: model.description })
              ] }),
              visibleRows.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mdw-object-list", children: visibleRows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: selectedId === row.id ? "is-selected" : "",
                  "data-mobile-row-id": row.id,
                  "aria-current": selectedId === row.id ? "true" : void 0,
                  onClick: () => openRow(row),
                  ref: (node) => {
                    if (node) rowRefs.current.set(row.id, node);
                    else rowRefs.current.delete(row.id);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mdw-row-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 18 }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mdw-row-copy", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.primary }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: row.secondary })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: ATTENTION_PATTERN.test(row.searchText) ? "mdw-row-state is-attention" : "mdw-row-state", children: row.trailing }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                  ]
                },
                row.id
              )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mdw-empty", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "aria-hidden": "true", size: 21 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: allRows.length ? "没有匹配对象" : ((_a = model.tables[0]) == null ? void 0 : _a.empty) || "没有可显示对象" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: allRows.length ? "调整搜索词或筛选条件。" : model.status }),
                allRows.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => {
                  setQuery("");
                  setFilter("all");
                }, children: "清除筛选" }) : null
              ] }),
              pageCount > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "mdw-pagination", "aria-label": "对象分页", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: safePage <= 1, onClick: () => setPage((value) => Math.max(1, value - 1)), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { "aria-hidden": "true", size: 17 }),
                  "上一页"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  safePage,
                  " / ",
                  pageCount
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", disabled: safePage >= pageCount, onClick: () => setPage((value) => Math.min(pageCount, value + 1)), children: [
                  "下一页",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
                ] })
              ] }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DetailPane,
              {
                row: selectedRow,
                model,
                route,
                onClose: closeDetail,
                titleRef: detailTitleRef
              }
            )
          ] })
        ]
      }
    );
  }
  const READONLY_DESTINATIONS = [
    { label: "采集状态", route: "readonlyDiagnostics" },
    { label: "DNS 状态", route: "dns4" },
    { label: "线路状态", route: "lineStatus" },
    { label: "终端状态", route: "terminals" },
    { label: "日志状态", route: "logs" }
  ];
  function ToneMark({ tone = "trust" }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `panel-tone-mark is-${tone}`, "aria-hidden": "true" });
  }
  function OverviewBackCommand({ onNavigate }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "panel-overview-back", type: "button", "data-panel-overview-back": true, onClick: () => onNavigate("overview"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { "aria-hidden": "true", size: 18 }),
      "返回运行概览"
    ] });
  }
  function cellValue(value) {
    return value === void 0 || value === "" ? "—" : value;
  }
  function DataTable({ table: table2 }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel-section-table", "aria-labelledby": `panel-table-${table2.title}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: `panel-table-${table2.title}`, children: table2.title }),
          table2.note ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: table2.note }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          table2.rows.length,
          " 条"
        ] })
      ] }),
      table2.rows.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-table-scroll", role: "region", "aria-label": table2.title, tabIndex: 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: table2.columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", children: column.label }, column.key)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: table2.rows.map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: table2.columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": column.label, children: cellValue(row[column.key]) }, column.key)) }, `${table2.title}-${index}`)) })
      ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "panel-empty-state", children: table2.empty })
    ] });
  }
  function MorePage({ onNavigate }) {
    const routes = PANEL_ROUTE_IDS.filter((route) => !["overview", "interfaces", "more"].includes(route));
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "more", className: "section panel-operational-section", "data-panel-route": "more", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel-section-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewBackCommand, { onNavigate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "只读工具" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { tabIndex: -1, "data-panel-route-title": true, children: "更多工具" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "路由、DNS、安全、审计与连接检查。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LockKeyhole, { className: "panel-more-lock", "aria-label": "只读", size: 20 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-more-list", children: routes.map((route) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", "data-section": route, onClick: () => onNavigate(route), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: PANEL_ROUTES[route].shortTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: PANEL_ROUTES[route].description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 18 })
      ] }, route)) })
    ] });
  }
  function OperationalSectionPage({ route, snapshot, onNavigate }) {
    const mobile = useMobilePanelSurface();
    if (mobile) return /* @__PURE__ */ jsxRuntimeExports.jsx(MobileDomainWorkspace, { route, snapshot, onNavigate });
    if (route === "more") return /* @__PURE__ */ jsxRuntimeExports.jsx(MorePage, { onNavigate });
    const model = buildSectionModel(route, snapshot);
    const timeLabel2 = model.evidenceMode === "current" ? "业务成功" : model.evidenceMode === "historical" ? "上次成功" : "成功时间";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: route, className: "section panel-operational-section", "data-panel-route": route, "data-panel-route-content": route, "data-panel-evidence-mode": model.evidenceMode, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "panel-section-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewBackCommand, { onNavigate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: model.status }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { tabIndex: -1, "data-panel-route-title": true, children: model.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: model.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `panel-section-freshness is-${model.statusTone}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock3, { "aria-hidden": "true", size: 16 }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            timeLabel2,
            " ",
            model.updatedAt || "未记录"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "panel-section-metrics", "aria-label": "本页关键指标", children: model.metrics.map((metric) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `is-${metric.tone || "trust"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToneMark, { tone: metric.tone }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: metric.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: metric.value }),
          metric.note ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: metric.note }) : null
        ] })
      ] }, metric.label)) }),
      model.visualization ? /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTimeSeriesChart, { visualization: model.visualization }) : null,
      route === "readonlyDiagnostics" ? /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "readonly-feature-nav", "aria-label": "只读状态入口", children: READONLY_DESTINATIONS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "readonly-feature-link", type: "button", "data-section": item.route, onClick: () => onNavigate(item.route), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { "aria-hidden": "true", size: 17 })
      ] }, item.label)) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-section-tables", children: model.tables.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { table: item }, item.title)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "panel-readonly-footer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { "aria-hidden": "true", size: 16 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "只读快照" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "本页不会修改 RouterOS 配置" })
        ] })
      ] })
    ] });
  }
  const ITEMS = {
    overview: { label: "概览", icon: Gauge },
    interfaces: { label: "网络", icon: Cable },
    terminals: { label: "终端", icon: UsersRound },
    logs: { label: "日志", icon: ScrollText }
  };
  function selectedDestination(route) {
    if (route === "overview") return "overview";
    const group = PANEL_ROUTES[route].taskGroup;
    if (group === "interfaces") return "interfaces";
    if (group === "terminals") return "terminals";
    if (group === "logs") return "logs";
    return null;
  }
  function PanelTaskNavigation({
    route,
    onNavigate
  }) {
    const selected = selectedDestination(route);
    return /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "panel-task-navigation", "aria-label": "手机主要任务", children: PANEL_TASK_ROUTES.map((destination) => {
      const item = ITEMS[destination];
      const Icon2 = item.icon;
      const active = destination === selected;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: active ? "is-active" : "",
          "aria-current": active ? "page" : void 0,
          "data-section": destination,
          onClick: () => onNavigate(destination),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", size: 20, strokeWidth: 1.8 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label })
          ]
        },
        destination
      );
    }) });
  }
  function isScenarioKey(value) {
    return typeof value === "string" && OVERVIEW_SCENARIO_KEYS.includes(value);
  }
  function scenarioHintFromSnapshot(snapshot, options) {
    var _a;
    if (options == null ? void 0 : options.scenarioHint) return options.scenarioHint;
    const hint = (_a = snapshot.meta) == null ? void 0 : _a.scaleScenario;
    return isScenarioKey(hint) ? hint : void 0;
  }
  function SnapshotSurface({ snapshot, options, runtimeManaged = false }) {
    const { route, navigate } = usePanelRoute();
    const scenarioHint = scenarioHintFromSnapshot(snapshot, options);
    const state2 = reactExports.useMemo(
      () => deriveOverviewState(snapshot, {
        ...options,
        scenarioHint
      }),
      [snapshot, options, scenarioHint]
    );
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-app", "data-panel-app": true, "data-active-section": route, children: [
      route === "overview" ? /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewPanel, { snapshot, state: state2, onNavigate: navigate, runtimeManaged }) : /* @__PURE__ */ jsxRuntimeExports.jsx(OperationalSectionPage, { route, snapshot, onNavigate: navigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelTaskNavigation, { route, onNavigate: navigate })
    ] });
  }
  function SnapshotContractError({ issues }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "panel-runtime-empty", "data-panel-snapshot-contract": "malformed", role: "alert", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": "true", children: "!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "快照格式无法使用" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: issues.join("；") })
    ] });
  }
  function StaticSnapshotApp({ snapshot, options }) {
    const validated = validatePanelSnapshot(snapshot);
    if (!validated.ok) return /* @__PURE__ */ jsxRuntimeExports.jsx(SnapshotContractError, { issues: validated.issues });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SnapshotSurface, { snapshot: validated.value, options });
  }
  function LivePanelRuntime({ options }) {
    const runtime = usePanelRuntime();
    if (runtime.view === "connection" || runtime.connection.phase !== "ready") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RouterConnectionScreen, { runtime });
    }
    const runtimeBoundary = runtime.snapshot.phase === "stale" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "error" ? runtime.snapshot.phase : null;
    const boundedSnapshot = runtime.snapshot.data && runtimeBoundary ? {
      ...runtime.snapshot.data,
      meta: {
        ...runtime.snapshot.data.meta,
        clientEvidenceBoundary: runtimeBoundary
      }
    } : runtime.snapshot.data;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-runtime-live", "data-panel-runtime-phase": runtime.snapshot.phase, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRuntimeChrome, { runtime }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRuntimeNotice, { runtime }),
      boundedSnapshot ? /* @__PURE__ */ jsxRuntimeExports.jsx(SnapshotSurface, { snapshot: boundedSnapshot, options, runtimeManaged: true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRuntimeEmptyState, { runtime })
    ] });
  }
  function PanelFrameworkApp({ snapshot, options }) {
    if (typeof snapshot !== "undefined") return /* @__PURE__ */ jsxRuntimeExports.jsx(StaticSnapshotApp, { snapshot, options });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LivePanelRuntime, { options });
  }
  let root = null;
  function resolveTestSnapshot() {
    const testWindow = window;
    return typeof testWindow.__PANEL_TEST_SNAPSHOT__ === "undefined" ? void 0 : testWindow.__PANEL_TEST_SNAPSHOT__;
  }
  function mountPanel() {
    if (root) return;
    const app = document.getElementById("app");
    if (!app) throw new Error("RouterOS panel root #app is missing");
    root = clientExports.createRoot(app);
    root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(PanelFrameworkApp, { snapshot: resolveTestSnapshot() }));
    window.dispatchEvent(new CustomEvent("router-panel-mounted"));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
  } else {
    mountPanel();
  }
})();
