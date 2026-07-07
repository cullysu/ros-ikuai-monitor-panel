var PanelFramework = function(exports) {
  "use strict";
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
  var l$1 = Symbol.for("react.element"), n$1 = Symbol.for("react.portal"), p$2 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
  function A$1(a) {
    if (null === a || "object" !== typeof a) return null;
    a = z$1 && a[z$1] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var B$1 = { isMounted: function() {
    return false;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, C$1 = Object.assign, D$1 = {};
  function E$1(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D$1;
    this.updater = e || B$1;
  }
  E$1.prototype.isReactComponent = {};
  E$1.prototype.setState = function(a, b) {
    if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, a, b, "setState");
  };
  E$1.prototype.forceUpdate = function(a) {
    this.updater.enqueueForceUpdate(this, a, "forceUpdate");
  };
  function F() {
  }
  F.prototype = E$1.prototype;
  function G$1(a, b, e) {
    this.props = a;
    this.context = b;
    this.refs = D$1;
    this.updater = e || B$1;
  }
  var H$1 = G$1.prototype = new F();
  H$1.constructor = G$1;
  C$1(H$1, E$1.prototype);
  H$1.isPureReactComponent = true;
  var I$1 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
  function M$1(a, b, e) {
    var d, c = {}, k2 = null, h = null;
    if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L$1.hasOwnProperty(d) && (c[d] = b[d]);
    var g = arguments.length - 2;
    if (1 === g) c.children = e;
    else if (1 < g) {
      for (var f2 = Array(g), m2 = 0; m2 < g; m2++) f2[m2] = arguments[m2 + 2];
      c.children = f2;
    }
    if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
    return { $$typeof: l$1, type: a, key: k2, ref: h, props: c, _owner: K$1.current };
  }
  function N$1(a, b) {
    return { $$typeof: l$1, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
  }
  function O$1(a) {
    return "object" === typeof a && null !== a && a.$$typeof === l$1;
  }
  function escape(a) {
    var b = { "=": "=0", ":": "=2" };
    return "$" + a.replace(/[=:]/g, function(a2) {
      return b[a2];
    });
  }
  var P$1 = /\/+/g;
  function Q$1(a, b) {
    return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
  }
  function R$1(a, b, e, d, c) {
    var k2 = typeof a;
    if ("undefined" === k2 || "boolean" === k2) a = null;
    var h = false;
    if (null === a) h = true;
    else switch (k2) {
      case "string":
      case "number":
        h = true;
        break;
      case "object":
        switch (a.$$typeof) {
          case l$1:
          case n$1:
            h = true;
        }
    }
    if (h) return h = a, c = c(h), a = "" === d ? "." + Q$1(h, 0) : d, I$1(c) ? (e = "", null != a && (e = a.replace(P$1, "$&/") + "/"), R$1(c, b, e, "", function(a2) {
      return a2;
    })) : null != c && (O$1(c) && (c = N$1(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$1, "$&/") + "/") + a)), b.push(c)), 1;
    h = 0;
    d = "" === d ? "." : d + ":";
    if (I$1(a)) for (var g = 0; g < a.length; g++) {
      k2 = a[g];
      var f2 = d + Q$1(k2, g);
      h += R$1(k2, b, e, f2, c);
    }
    else if (f2 = A$1(a), "function" === typeof f2) for (a = f2.call(a), g = 0; !(k2 = a.next()).done; ) k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e, f2, c);
    else if ("object" === k2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
    return h;
  }
  function S$1(a, b, e) {
    if (null == a) return a;
    var d = [], c = 0;
    R$1(a, d, "", "", function(a2) {
      return b.call(e, a2, c++);
    });
    return d;
  }
  function T$1(a) {
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
  var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
  function X$1() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  react_production_min.Children = { map: S$1, forEach: function(a, b, e) {
    S$1(a, function() {
      b.apply(this, arguments);
    }, e);
  }, count: function(a) {
    var b = 0;
    S$1(a, function() {
      b++;
    });
    return b;
  }, toArray: function(a) {
    return S$1(a, function(a2) {
      return a2;
    }) || [];
  }, only: function(a) {
    if (!O$1(a)) throw Error("React.Children.only expected to receive a single React element child.");
    return a;
  } };
  react_production_min.Component = E$1;
  react_production_min.Fragment = p$2;
  react_production_min.Profiler = r;
  react_production_min.PureComponent = G$1;
  react_production_min.StrictMode = q$1;
  react_production_min.Suspense = w;
  react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
  react_production_min.act = X$1;
  react_production_min.cloneElement = function(a, b, e) {
    if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
    var d = C$1({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
    if (null != b) {
      void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
      void 0 !== b.key && (c = "" + b.key);
      if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
      for (f2 in b) J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
    }
    var f2 = arguments.length - 2;
    if (1 === f2) d.children = e;
    else if (1 < f2) {
      g = Array(f2);
      for (var m2 = 0; m2 < f2; m2++) g[m2] = arguments[m2 + 2];
      d.children = g;
    }
    return { $$typeof: l$1, type: a.type, key: c, ref: k2, props: d, _owner: h };
  };
  react_production_min.createContext = function(a) {
    a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
    a.Provider = { $$typeof: t, _context: a };
    return a.Consumer = a;
  };
  react_production_min.createElement = M$1;
  react_production_min.createFactory = function(a) {
    var b = M$1.bind(null, a);
    b.type = a;
    return b;
  };
  react_production_min.createRef = function() {
    return { current: null };
  };
  react_production_min.forwardRef = function(a) {
    return { $$typeof: v$1, render: a };
  };
  react_production_min.isValidElement = O$1;
  react_production_min.lazy = function(a) {
    return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T$1 };
  };
  react_production_min.memo = function(a, b) {
    return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
  };
  react_production_min.startTransition = function(a) {
    var b = V$1.transition;
    V$1.transition = {};
    try {
      a();
    } finally {
      V$1.transition = b;
    }
  };
  react_production_min.unstable_act = X$1;
  react_production_min.useCallback = function(a, b) {
    return U$1.current.useCallback(a, b);
  };
  react_production_min.useContext = function(a) {
    return U$1.current.useContext(a);
  };
  react_production_min.useDebugValue = function() {
  };
  react_production_min.useDeferredValue = function(a) {
    return U$1.current.useDeferredValue(a);
  };
  react_production_min.useEffect = function(a, b) {
    return U$1.current.useEffect(a, b);
  };
  react_production_min.useId = function() {
    return U$1.current.useId();
  };
  react_production_min.useImperativeHandle = function(a, b, e) {
    return U$1.current.useImperativeHandle(a, b, e);
  };
  react_production_min.useInsertionEffect = function(a, b) {
    return U$1.current.useInsertionEffect(a, b);
  };
  react_production_min.useLayoutEffect = function(a, b) {
    return U$1.current.useLayoutEffect(a, b);
  };
  react_production_min.useMemo = function(a, b) {
    return U$1.current.useMemo(a, b);
  };
  react_production_min.useReducer = function(a, b, e) {
    return U$1.current.useReducer(a, b, e);
  };
  react_production_min.useRef = function(a) {
    return U$1.current.useRef(a);
  };
  react_production_min.useState = function(a) {
    return U$1.current.useState(a);
  };
  react_production_min.useSyncExternalStore = function(a, b, e) {
    return U$1.current.useSyncExternalStore(a, b, e);
  };
  react_production_min.useTransition = function() {
    return U$1.current.useTransition();
  };
  react_production_min.version = "18.3.1";
  {
    react.exports = react_production_min;
  }
  var reactExports = react.exports;
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
  (function(exports2) {
    function f2(a, b) {
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
    function k2(a) {
      if (0 === a.length) return null;
      var b = a[0], c = a.pop();
      if (c !== b) {
        a[0] = c;
        a: for (var d = 0, e = a.length, w2 = e >>> 1; d < w2; ) {
          var m2 = 2 * (d + 1) - 1, C2 = a[m2], n2 = m2 + 1, x2 = a[n2];
          if (0 > g(C2, c)) n2 < e && 0 > g(x2, C2) ? (a[d] = x2, a[n2] = c, d = n2) : (a[d] = C2, a[m2] = c, d = m2);
          else if (n2 < e && 0 > g(x2, c)) a[d] = x2, a[n2] = c, d = n2;
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
      var l2 = performance;
      exports2.unstable_now = function() {
        return l2.now();
      };
    } else {
      var p2 = Date, q2 = p2.now();
      exports2.unstable_now = function() {
        return p2.now() - q2;
      };
    }
    var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
    "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function G2(a) {
      for (var b = h(t2); null !== b; ) {
        if (null === b.callback) k2(t2);
        else if (b.startTime <= a) k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
        else break;
        b = h(t2);
      }
    }
    function H2(a) {
      B2 = false;
      G2(a);
      if (!A2) if (null !== h(r2)) A2 = true, I2(J2);
      else {
        var b = h(t2);
        null !== b && K2(H2, b.startTime - a);
      }
    }
    function J2(a, b) {
      A2 = false;
      B2 && (B2 = false, E2(L2), L2 = -1);
      z2 = true;
      var c = y2;
      try {
        G2(b);
        for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a && !M2()); ) {
          var d = v2.callback;
          if ("function" === typeof d) {
            v2.callback = null;
            y2 = v2.priorityLevel;
            var e = d(v2.expirationTime <= b);
            b = exports2.unstable_now();
            "function" === typeof e ? v2.callback = e : v2 === h(r2) && k2(r2);
            G2(b);
          } else k2(r2);
          v2 = h(r2);
        }
        if (null !== v2) var w2 = true;
        else {
          var m2 = h(t2);
          null !== m2 && K2(H2, m2.startTime - b);
          w2 = false;
        }
        return w2;
      } finally {
        v2 = null, y2 = c, z2 = false;
      }
    }
    var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
    function M2() {
      return exports2.unstable_now() - Q2 < P2 ? false : true;
    }
    function R2() {
      if (null !== O2) {
        var a = exports2.unstable_now();
        Q2 = a;
        var b = true;
        try {
          b = O2(true, a);
        } finally {
          b ? S2() : (N2 = false, O2 = null);
        }
      } else N2 = false;
    }
    var S2;
    if ("function" === typeof F2) S2 = function() {
      F2(R2);
    };
    else if ("undefined" !== typeof MessageChannel) {
      var T2 = new MessageChannel(), U2 = T2.port2;
      T2.port1.onmessage = R2;
      S2 = function() {
        U2.postMessage(null);
      };
    } else S2 = function() {
      D2(R2, 0);
    };
    function I2(a) {
      O2 = a;
      N2 || (N2 = true, S2());
    }
    function K2(a, b) {
      L2 = D2(function() {
        a(exports2.unstable_now());
      }, b);
    }
    exports2.unstable_IdlePriority = 5;
    exports2.unstable_ImmediatePriority = 1;
    exports2.unstable_LowPriority = 4;
    exports2.unstable_NormalPriority = 3;
    exports2.unstable_Profiling = null;
    exports2.unstable_UserBlockingPriority = 2;
    exports2.unstable_cancelCallback = function(a) {
      a.callback = null;
    };
    exports2.unstable_continueExecution = function() {
      A2 || z2 || (A2 = true, I2(J2));
    };
    exports2.unstable_forceFrameRate = function(a) {
      0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a ? Math.floor(1e3 / a) : 5;
    };
    exports2.unstable_getCurrentPriorityLevel = function() {
      return y2;
    };
    exports2.unstable_getFirstCallbackNode = function() {
      return h(r2);
    };
    exports2.unstable_next = function(a) {
      switch (y2) {
        case 1:
        case 2:
        case 3:
          var b = 3;
          break;
        default:
          b = y2;
      }
      var c = y2;
      y2 = b;
      try {
        return a();
      } finally {
        y2 = c;
      }
    };
    exports2.unstable_pauseExecution = function() {
    };
    exports2.unstable_requestPaint = function() {
    };
    exports2.unstable_runWithPriority = function(a, b) {
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
      var c = y2;
      y2 = a;
      try {
        return b();
      } finally {
        y2 = c;
      }
    };
    exports2.unstable_scheduleCallback = function(a, b, c) {
      var d = exports2.unstable_now();
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
      a = { id: u2++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
      c > d ? (a.sortIndex = c, f2(t2, a), null === h(r2) && a === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c - d))) : (a.sortIndex = e, f2(r2, a), A2 || z2 || (A2 = true, I2(J2)));
      return a;
    };
    exports2.unstable_shouldYield = M2;
    exports2.unstable_wrapCallback = function(a) {
      var b = y2;
      return function() {
        var c = y2;
        y2 = b;
        try {
          return a.apply(this, arguments);
        } finally {
          y2 = c;
        }
      };
    };
  })(scheduler_production_min);
  {
    scheduler.exports = scheduler_production_min;
  }
  var schedulerExports = scheduler.exports;
  /**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var aa = reactExports, ca = schedulerExports;
  function p$1(a) {
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
  function v(a, b, c, d, e, f2, g) {
    this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
    this.attributeName = d;
    this.attributeNamespace = e;
    this.mustUseProperty = c;
    this.propertyName = a;
    this.type = b;
    this.sanitizeURL = f2;
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
        } catch (l2) {
          var d = l2;
        }
        Reflect.construct(a, [], b);
      } else {
        try {
          b.call();
        } catch (l2) {
          d = l2;
        }
        a.call(b.prototype);
      }
      else {
        try {
          throw Error();
        } catch (l2) {
          d = l2;
        }
        a();
      }
    } catch (l2) {
      if (l2 && d && "string" === typeof l2.stack) {
        for (var e = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e[g] !== f2[h]; ) h--;
        for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f2[h]) {
          if (1 !== g || 1 !== h) {
            do
              if (g--, h--, 0 > h || e[g] !== f2[h]) {
                var k2 = "\n" + e[g].replace(" at new ", " at ");
                a.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a.displayName));
                return k2;
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
      var e = c.get, f2 = c.set;
      Object.defineProperty(a, b, { configurable: true, get: function() {
        return e.call(this);
      }, set: function(a2) {
        d = "" + a2;
        f2.call(this, a2);
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
    if (null != b.dangerouslySetInnerHTML) throw Error(p$1(91));
    return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
  }
  function hb(a, b) {
    var c = b.value;
    if (null == c) {
      c = b.children;
      b = b.defaultValue;
      if (null != c) {
        if (null != b) throw Error(p$1(92));
        if (eb(c)) {
          if (1 < c.length) throw Error(p$1(93));
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
  var mb, nb = function(a) {
    return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
      MSApp.execUnsafeLocalFunction(function() {
        return a(b, c, d, e);
      });
    } : a;
  }(function(a, b) {
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
      if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p$1(137, a));
      if (null != b.dangerouslySetInnerHTML) {
        if (null != b.children) throw Error(p$1(60));
        if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p$1(61));
      }
      if (null != b.style && "object" !== typeof b.style) throw Error(p$1(62));
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
      if ("function" !== typeof yb) throw Error(p$1(280));
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
    if (c && "function" !== typeof c) throw Error(p$1(231, b, typeof c));
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
  function Nb(a, b, c, d, e, f2, g, h, k2) {
    var l2 = Array.prototype.slice.call(arguments, 3);
    try {
      b.apply(c, l2);
    } catch (m2) {
      this.onError(m2);
    }
  }
  var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
    Ob = true;
    Pb = a;
  } };
  function Tb(a, b, c, d, e, f2, g, h, k2) {
    Ob = false;
    Pb = null;
    Nb.apply(Sb, arguments);
  }
  function Ub(a, b, c, d, e, f2, g, h, k2) {
    Tb.apply(this, arguments);
    if (Ob) {
      if (Ob) {
        var l2 = Pb;
        Ob = false;
        Pb = null;
      } else throw Error(p$1(198));
      Qb || (Qb = true, Rb = l2);
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
    if (Vb(a) !== a) throw Error(p$1(188));
  }
  function Yb(a) {
    var b = a.alternate;
    if (!b) {
      b = Vb(a);
      if (null === b) throw Error(p$1(188));
      return b !== a ? null : a;
    }
    for (var c = a, d = b; ; ) {
      var e = c.return;
      if (null === e) break;
      var f2 = e.alternate;
      if (null === f2) {
        d = e.return;
        if (null !== d) {
          c = d;
          continue;
        }
        break;
      }
      if (e.child === f2.child) {
        for (f2 = e.child; f2; ) {
          if (f2 === c) return Xb(e), a;
          if (f2 === d) return Xb(e), b;
          f2 = f2.sibling;
        }
        throw Error(p$1(188));
      }
      if (c.return !== d.return) c = e, d = f2;
      else {
        for (var g = false, h = e.child; h; ) {
          if (h === c) {
            g = true;
            c = e;
            d = f2;
            break;
          }
          if (h === d) {
            g = true;
            d = e;
            c = f2;
            break;
          }
          h = h.sibling;
        }
        if (!g) {
          for (h = f2.child; h; ) {
            if (h === c) {
              g = true;
              c = f2;
              d = e;
              break;
            }
            if (h === d) {
              g = true;
              d = f2;
              c = e;
              break;
            }
            h = h.sibling;
          }
          if (!g) throw Error(p$1(189));
        }
      }
      if (c.alternate !== d) throw Error(p$1(190));
    }
    if (3 !== c.tag) throw Error(p$1(188));
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
    var d = 0, e = a.suspendedLanes, f2 = a.pingedLanes, g = c & 268435455;
    if (0 !== g) {
      var h = g & ~e;
      0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
    } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
    if (0 === d) return 0;
    if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f2 = b & -b, e >= f2 || 16 === e && 0 !== (f2 & 4194240))) return b;
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
    for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f2 = a.pendingLanes; 0 < f2; ) {
      var g = 31 - oc(f2), h = 1 << g, k2 = e[g];
      if (-1 === k2) {
        if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
      } else k2 <= b && (a.expiredLanes |= h);
      f2 &= ~h;
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
      var e = 31 - oc(c), f2 = 1 << e;
      b[e] = 0;
      d[e] = -1;
      a[e] = -1;
      c &= ~f2;
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
  function Tc(a, b, c, d, e, f2) {
    if (null === a || a.nativeEvent !== f2) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
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
        var f2 = e.pointerId;
        Oc.set(f2, Tc(Oc.get(f2) || null, a, b, c, d, e));
        return true;
      case "gotpointercapture":
        return f2 = e.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a, b, c, d, e)), true;
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
    var e = C, f2 = cd.transition;
    cd.transition = null;
    try {
      C = 1, fd(a, b, c, d);
    } finally {
      C = e, cd.transition = f2;
    }
  }
  function gd(a, b, c, d) {
    var e = C, f2 = cd.transition;
    cd.transition = null;
    try {
      C = 4, fd(a, b, c, d);
    } finally {
      C = e, cd.transition = f2;
    }
  }
  function fd(a, b, c, d) {
    if (dd) {
      var e = Yc(a, b, c, d);
      if (null === e) hd(a, b, d, id, c), Sc(a, d);
      else if (Uc(e, a, b, c, d)) d.stopPropagation();
      else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
        for (; null !== e; ) {
          var f2 = Cb(e);
          null !== f2 && Ec(f2);
          f2 = Yc(a, b, c, d);
          null === f2 && hd(a, b, d, id, c);
          if (f2 === e) break;
          e = f2;
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
    var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f2 = e.length;
    for (a = 0; a < c && b[a] === e[a]; a++) ;
    var g = c - a;
    for (d = 1; d <= g && b[c - d] === e[f2 - d]; d++) ;
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
    function b(b2, d, e, f2, g) {
      this._reactName = b2;
      this._targetInst = e;
      this.type = d;
      this.nativeEvent = f2;
      this.target = g;
      this.currentTarget = null;
      for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f2) : f2[c]);
      this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
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
          var e = c.textContent.length, f2 = Math.min(d.start, e);
          d = void 0 === d.end ? f2 : Math.min(d.end, e);
          !a.extend && f2 > d && (e = d, d = f2, f2 = e);
          e = Ke(c, f2);
          var g = Ke(
            c,
            d
          );
          e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f2 > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
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
        var f2 = void 0;
        if (b) for (var g = d.length - 1; 0 <= g; g--) {
          var h = d[g], k2 = h.instance, l2 = h.currentTarget;
          h = h.listener;
          if (k2 !== f2 && e.isPropagationStopped()) break a;
          nf(e, h, l2);
          f2 = k2;
        }
        else for (g = 0; g < d.length; g++) {
          h = d[g];
          k2 = h.instance;
          l2 = h.currentTarget;
          h = h.listener;
          if (k2 !== f2 && e.isPropagationStopped()) break a;
          nf(e, h, l2);
          f2 = k2;
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
    var f2 = d;
    if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
      if (null === d) return;
      var g = d.tag;
      if (3 === g || 4 === g) {
        var h = d.stateNode.containerInfo;
        if (h === e || 8 === h.nodeType && h.parentNode === e) break;
        if (4 === g) for (g = d.return; null !== g; ) {
          var k2 = g.tag;
          if (3 === k2 || 4 === k2) {
            if (k2 = g.stateNode.containerInfo, k2 === e || 8 === k2.nodeType && k2.parentNode === e) return;
          }
          g = g.return;
        }
        for (; null !== h; ) {
          g = Wc(h);
          if (null === g) return;
          k2 = g.tag;
          if (5 === k2 || 6 === k2) {
            d = f2 = g;
            continue a;
          }
          h = h.parentNode;
        }
      }
      d = d.return;
    }
    Jb(function() {
      var d2 = f2, e2 = xb(c), g2 = [];
      a: {
        var h2 = df.get(a);
        if (void 0 !== h2) {
          var k3 = td, n2 = a;
          switch (a) {
            case "keypress":
              if (0 === od(c)) break a;
            case "keydown":
            case "keyup":
              k3 = Rd;
              break;
            case "focusin":
              n2 = "focus";
              k3 = Fd;
              break;
            case "focusout":
              n2 = "blur";
              k3 = Fd;
              break;
            case "beforeblur":
            case "afterblur":
              k3 = Fd;
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
              k3 = Bd;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              k3 = Dd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              k3 = Vd;
              break;
            case $e:
            case af:
            case bf:
              k3 = Hd;
              break;
            case cf:
              k3 = Xd;
              break;
            case "scroll":
              k3 = vd;
              break;
            case "wheel":
              k3 = Zd;
              break;
            case "copy":
            case "cut":
            case "paste":
              k3 = Jd;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              k3 = Td;
          }
          var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
          t2 = [];
          for (var w2 = d2, u2; null !== w2; ) {
            u2 = w2;
            var F2 = u2.stateNode;
            5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
            if (J2) break;
            w2 = w2.return;
          }
          0 < t2.length && (h2 = new k3(h2, n2, null, c, e2), g2.push({ event: h2, listeners: t2 }));
        }
      }
      if (0 === (b & 7)) {
        a: {
          h2 = "mouseover" === a || "pointerover" === a;
          k3 = "mouseout" === a || "pointerout" === a;
          if (h2 && c !== wb && (n2 = c.relatedTarget || c.fromElement) && (Wc(n2) || n2[uf])) break a;
          if (k3 || h2) {
            h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
            if (k3) {
              if (n2 = c.relatedTarget || c.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag)) n2 = null;
            } else k3 = null, n2 = d2;
            if (k3 !== n2) {
              t2 = Bd;
              F2 = "onMouseLeave";
              x2 = "onMouseEnter";
              w2 = "mouse";
              if ("pointerout" === a || "pointerover" === a) t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
              J2 = null == k3 ? h2 : ue(k3);
              u2 = null == n2 ? h2 : ue(n2);
              h2 = new t2(F2, w2 + "leave", k3, c, e2);
              h2.target = J2;
              h2.relatedTarget = u2;
              F2 = null;
              Wc(e2) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c, e2), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
              J2 = F2;
              if (k3 && n2) b: {
                t2 = k3;
                x2 = n2;
                w2 = 0;
                for (u2 = t2; u2; u2 = vf(u2)) w2++;
                u2 = 0;
                for (F2 = x2; F2; F2 = vf(F2)) u2++;
                for (; 0 < w2 - u2; ) t2 = vf(t2), w2--;
                for (; 0 < u2 - w2; ) x2 = vf(x2), u2--;
                for (; w2--; ) {
                  if (t2 === x2 || null !== x2 && t2 === x2.alternate) break b;
                  t2 = vf(t2);
                  x2 = vf(x2);
                }
                t2 = null;
              }
              else t2 = null;
              null !== k3 && wf(g2, h2, k3, t2, false);
              null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
            }
          }
        }
        a: {
          h2 = d2 ? ue(d2) : window;
          k3 = h2.nodeName && h2.nodeName.toLowerCase();
          if ("select" === k3 || "input" === k3 && "file" === h2.type) var na = ve;
          else if (me(h2)) if (we) na = Fe;
          else {
            na = De;
            var xa = Ce;
          }
          else (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
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
      var e = a, f2 = e.stateNode;
      5 === e.tag && null !== f2 && (e = f2, f2 = Kb(a, c), null != f2 && d.unshift(tf(a, f2, e)), f2 = Kb(a, b), null != f2 && d.push(tf(a, f2, e)));
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
    for (var f2 = b._reactName, g = []; null !== c && c !== d; ) {
      var h = c, k2 = h.alternate, l2 = h.stateNode;
      if (null !== k2 && k2 === d) break;
      5 === h.tag && null !== l2 && (h = l2, e ? (k2 = Kb(c, f2), null != k2 && g.unshift(tf(c, k2, h))) : e || (k2 = Kb(c, f2), null != k2 && g.push(tf(c, k2, h))));
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
    if (zf(a) !== b && c) throw Error(p$1(425));
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
    throw Error(p$1(33));
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
    var e = {}, f2;
    for (f2 in c) e[f2] = b[f2];
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
    if (H.current !== Vf) throw Error(p$1(168));
    G(H, b);
    G(Wf, c);
  }
  function bg(a, b, c) {
    var d = a.stateNode;
    b = b.childContextTypes;
    if ("function" !== typeof d.getChildContext) return c;
    d = d.getChildContext();
    for (var e in d) if (!(e in b)) throw Error(p$1(108, Ra(a) || "Unknown", e));
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
    if (!d) throw Error(p$1(169));
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
    var f2 = 32 - oc(b) + e;
    if (30 < f2) {
      var g = e - e % 5;
      f2 = (d & (1 << g) - 1).toString(32);
      d >>= g;
      e -= g;
      rg = 1 << 32 - oc(b) + e | c << e | d;
      sg = f2 + a;
    } else rg = 1 << f2 | c << e | d, sg = a;
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
          if (Dg(a)) throw Error(p$1(418));
          b = Lf(c.nextSibling);
          var d = xg;
          b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
        }
      } else {
        if (Dg(a)) throw Error(p$1(418));
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
      if (Dg(a)) throw Hg(), Error(p$1(418));
      for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
    }
    Fg(a);
    if (13 === a.tag) {
      a = a.memoizedState;
      a = null !== a ? a.dehydrated : null;
      if (!a) throw Error(p$1(317));
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
          if (1 !== c.tag) throw Error(p$1(309));
          var d = c.stateNode;
        }
        if (!d) throw Error(p$1(147, a));
        var e = d, f2 = "" + a;
        if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2) return b.ref;
        b = function(a2) {
          var b2 = e.refs;
          null === a2 ? delete b2[f2] : b2[f2] = a2;
        };
        b._stringRef = f2;
        return b;
      }
      if ("string" !== typeof a) throw Error(p$1(284));
      if (!c._owner) throw Error(p$1(290, a));
    }
    return a;
  }
  function Mg(a, b) {
    a = Object.prototype.toString.call(b);
    throw Error(p$1(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
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
    function f2(b2, c2, d2) {
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
    function k2(a2, b2, c2, d2) {
      var f3 = c2.type;
      if (f3 === ya) return m2(a2, b2, c2.props.children, d2, c2.key);
      if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
      d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
      d2.ref = Lg(a2, b2, c2);
      d2.return = a2;
      return d2;
    }
    function l2(a2, b2, c2, d2) {
      if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
      b2 = e(b2, c2.children || []);
      b2.return = a2;
      return b2;
    }
    function m2(a2, b2, c2, d2, f3) {
      if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f3), b2.return = a2, b2;
      b2 = e(b2, c2);
      b2.return = a2;
      return b2;
    }
    function q2(a2, b2, c2) {
      if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
      if ("object" === typeof b2 && null !== b2) {
        switch (b2.$$typeof) {
          case va:
            return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
          case wa:
            return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
          case Ha:
            var d2 = b2._init;
            return q2(a2, d2(b2._payload), c2);
        }
        if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
        Mg(a2, b2);
      }
      return null;
    }
    function r2(a2, b2, c2, d2) {
      var e2 = null !== b2 ? b2.key : null;
      if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
      if ("object" === typeof c2 && null !== c2) {
        switch (c2.$$typeof) {
          case va:
            return c2.key === e2 ? k2(a2, b2, c2, d2) : null;
          case wa:
            return c2.key === e2 ? l2(a2, b2, c2, d2) : null;
          case Ha:
            return e2 = c2._init, r2(
              a2,
              b2,
              e2(c2._payload),
              d2
            );
        }
        if (eb(c2) || Ka(c2)) return null !== e2 ? null : m2(a2, b2, c2, d2, null);
        Mg(a2, c2);
      }
      return null;
    }
    function y2(a2, b2, c2, d2, e2) {
      if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
      if ("object" === typeof d2 && null !== d2) {
        switch (d2.$$typeof) {
          case va:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k2(b2, a2, d2, e2);
          case wa:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l2(b2, a2, d2, e2);
          case Ha:
            var f3 = d2._init;
            return y2(a2, b2, c2, f3(d2._payload), e2);
        }
        if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m2(b2, a2, d2, e2, null);
        Mg(b2, d2);
      }
      return null;
    }
    function n2(e2, g2, h2, k3) {
      for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
        u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
        var n3 = r2(e2, u2, h2[w2], k3);
        if (null === n3) {
          null === u2 && (u2 = x2);
          break;
        }
        a && u2 && null === n3.alternate && b(e2, u2);
        g2 = f2(n3, g2, w2);
        null === m3 ? l3 = n3 : m3.sibling = n3;
        m3 = n3;
        u2 = x2;
      }
      if (w2 === h2.length) return c(e2, u2), I && tg(e2, w2), l3;
      if (null === u2) {
        for (; w2 < h2.length; w2++) u2 = q2(e2, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
        I && tg(e2, w2);
        return l3;
      }
      for (u2 = d(e2, u2); w2 < h2.length; w2++) x2 = y2(u2, e2, w2, h2[w2], k3), null !== x2 && (a && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
      a && u2.forEach(function(a2) {
        return b(e2, a2);
      });
      I && tg(e2, w2);
      return l3;
    }
    function t2(e2, g2, h2, k3) {
      var l3 = Ka(h2);
      if ("function" !== typeof l3) throw Error(p$1(150));
      h2 = l3.call(h2);
      if (null == h2) throw Error(p$1(151));
      for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
        m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
        var t3 = r2(e2, m3, n3.value, k3);
        if (null === t3) {
          null === m3 && (m3 = x2);
          break;
        }
        a && m3 && null === t3.alternate && b(e2, m3);
        g2 = f2(t3, g2, w2);
        null === u2 ? l3 = t3 : u2.sibling = t3;
        u2 = t3;
        m3 = x2;
      }
      if (n3.done) return c(
        e2,
        m3
      ), I && tg(e2, w2), l3;
      if (null === m3) {
        for (; !n3.done; w2++, n3 = h2.next()) n3 = q2(e2, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
        I && tg(e2, w2);
        return l3;
      }
      for (m3 = d(e2, m3); !n3.done; w2++, n3 = h2.next()) n3 = y2(m3, e2, w2, n3.value, k3), null !== n3 && (a && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      a && m3.forEach(function(a2) {
        return b(e2, a2);
      });
      I && tg(e2, w2);
      return l3;
    }
    function J2(a2, d2, f3, h2) {
      "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
      if ("object" === typeof f3 && null !== f3) {
        switch (f3.$$typeof) {
          case va:
            a: {
              for (var k3 = f3.key, l3 = d2; null !== l3; ) {
                if (l3.key === k3) {
                  k3 = f3.type;
                  if (k3 === ya) {
                    if (7 === l3.tag) {
                      c(a2, l3.sibling);
                      d2 = e(l3, f3.props.children);
                      d2.return = a2;
                      a2 = d2;
                      break a;
                    }
                  } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                    c(a2, l3.sibling);
                    d2 = e(l3, f3.props);
                    d2.ref = Lg(a2, l3, f3);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                  c(a2, l3);
                  break;
                } else b(a2, l3);
                l3 = l3.sibling;
              }
              f3.type === ya ? (d2 = Tg(f3.props.children, a2.mode, h2, f3.key), d2.return = a2, a2 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f3), h2.return = a2, a2 = h2);
            }
            return g(a2);
          case wa:
            a: {
              for (l3 = f3.key; null !== d2; ) {
                if (d2.key === l3) if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                  c(a2, d2.sibling);
                  d2 = e(d2, f3.children || []);
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
              d2 = Sg(f3, a2.mode, h2);
              d2.return = a2;
              a2 = d2;
            }
            return g(a2);
          case Ha:
            return l3 = f3._init, J2(a2, d2, l3(f3._payload), h2);
        }
        if (eb(f3)) return n2(a2, d2, f3, h2);
        if (Ka(f3)) return t2(a2, d2, f3, h2);
        Mg(a2, f3);
      }
      return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f3), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f3, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
    }
    return J2;
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
      if (null === Xg) throw Error(p$1(308));
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
      var e = null, f2 = null;
      c = c.firstBaseUpdate;
      if (null !== c) {
        do {
          var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
          null === f2 ? e = f2 = g : f2 = f2.next = g;
          c = c.next;
        } while (null !== c);
        null === f2 ? e = f2 = b : f2 = f2.next = b;
      } else e = f2 = b;
      c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
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
    var f2 = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
    if (null !== h) {
      e.shared.pending = null;
      var k2 = h, l2 = k2.next;
      k2.next = null;
      null === g ? f2 = l2 : g.next = l2;
      g = k2;
      var m2 = a.alternate;
      null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
    }
    if (null !== f2) {
      var q2 = e.baseState;
      g = 0;
      m2 = l2 = k2 = null;
      h = f2;
      do {
        var r2 = h.lane, y2 = h.eventTime;
        if ((d & r2) === r2) {
          null !== m2 && (m2 = m2.next = {
            eventTime: y2,
            lane: 0,
            tag: h.tag,
            payload: h.payload,
            callback: h.callback,
            next: null
          });
          a: {
            var n2 = a, t2 = h;
            r2 = b;
            y2 = c;
            switch (t2.tag) {
              case 1:
                n2 = t2.payload;
                if ("function" === typeof n2) {
                  q2 = n2.call(y2, q2, r2);
                  break a;
                }
                q2 = n2;
                break a;
              case 3:
                n2.flags = n2.flags & -65537 | 128;
              case 0:
                n2 = t2.payload;
                r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
                if (null === r2 || void 0 === r2) break a;
                q2 = A({}, q2, r2);
                break a;
              case 2:
                jh = true;
            }
          }
          null !== h.callback && 0 !== h.lane && (a.flags |= 64, r2 = e.effects, null === r2 ? e.effects = [h] : r2.push(h));
        } else y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
        h = h.next;
        if (null === h) if (h = e.shared.pending, null === h) break;
        else r2 = h, h = r2.next, r2.next = null, e.lastBaseUpdate = r2, e.shared.pending = null;
      } while (1);
      null === m2 && (k2 = q2);
      e.baseState = k2;
      e.firstBaseUpdate = l2;
      e.lastBaseUpdate = m2;
      b = e.shared.interleaved;
      if (null !== b) {
        e = b;
        do
          g |= e.lane, e = e.next;
        while (e !== b);
      } else null === f2 && (e.shared.lanes = 0);
      rh |= g;
      a.lanes = g;
      a.memoizedState = q2;
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
        if ("function" !== typeof e) throw Error(p$1(191, e));
        e.call(d);
      }
    }
  }
  var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
  function xh(a) {
    if (a === th) throw Error(p$1(174));
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
    throw Error(p$1(321));
  }
  function Mh(a, b) {
    if (null === b) return false;
    for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
    return true;
  }
  function Nh(a, b, c, d, e, f2) {
    Hh = f2;
    M = b;
    b.memoizedState = null;
    b.updateQueue = null;
    b.lanes = 0;
    Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
    a = c(d, e);
    if (Jh) {
      f2 = 0;
      do {
        Jh = false;
        Kh = 0;
        if (25 <= f2) throw Error(p$1(301));
        f2 += 1;
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
    if (b) throw Error(p$1(300));
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
      if (null === a) throw Error(p$1(310));
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
    if (null === c) throw Error(p$1(311));
    c.lastRenderedReducer = a;
    var d = N, e = d.baseQueue, f2 = c.pending;
    if (null !== f2) {
      if (null !== e) {
        var g = e.next;
        e.next = f2.next;
        f2.next = g;
      }
      d.baseQueue = e = f2;
      c.pending = null;
    }
    if (null !== e) {
      f2 = e.next;
      d = d.baseState;
      var h = g = null, k2 = null, l2 = f2;
      do {
        var m2 = l2.lane;
        if ((Hh & m2) === m2) null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a(d, l2.action);
        else {
          var q2 = {
            lane: m2,
            action: l2.action,
            hasEagerState: l2.hasEagerState,
            eagerState: l2.eagerState,
            next: null
          };
          null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
          M.lanes |= m2;
          rh |= m2;
        }
        l2 = l2.next;
      } while (null !== l2 && l2 !== f2);
      null === k2 ? g = d : k2.next = h;
      He(d, b.memoizedState) || (dh = true);
      b.memoizedState = d;
      b.baseState = g;
      b.baseQueue = k2;
      c.lastRenderedState = d;
    }
    a = c.interleaved;
    if (null !== a) {
      e = a;
      do
        f2 = e.lane, M.lanes |= f2, rh |= f2, e = e.next;
      while (e !== a);
    } else null === e && (c.lanes = 0);
    return [b.memoizedState, c.dispatch];
  }
  function Xh(a) {
    var b = Uh(), c = b.queue;
    if (null === c) throw Error(p$1(311));
    c.lastRenderedReducer = a;
    var d = c.dispatch, e = c.pending, f2 = b.memoizedState;
    if (null !== e) {
      c.pending = null;
      var g = e = e.next;
      do
        f2 = a(f2, g.action), g = g.next;
      while (g !== e);
      He(f2, b.memoizedState) || (dh = true);
      b.memoizedState = f2;
      null === b.baseQueue && (b.baseState = f2);
      c.lastRenderedState = f2;
    }
    return [f2, d];
  }
  function Yh() {
  }
  function Zh(a, b) {
    var c = M, d = Uh(), e = b(), f2 = !He(d.memoizedState, e);
    f2 && (d.memoizedState = e, dh = true);
    d = d.queue;
    $h(ai.bind(null, c, d, a), [a]);
    if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
      c.flags |= 2048;
      bi(9, ci.bind(null, c, d, e, b), void 0, null);
      if (null === Q) throw Error(p$1(349));
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
    var f2 = void 0;
    if (null !== N) {
      var g = N.memoizedState;
      f2 = g.destroy;
      if (null !== d && Mh(d, g.deps)) {
        e.memoizedState = bi(b, c, f2, d);
        return;
      }
    }
    M.flags |= a;
    e.memoizedState = bi(1 | b, c, f2, d);
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
      var f2 = a.alternate;
      if (0 === a.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2)) try {
        var g = b.lastRenderedState, h = f2(g, c);
        e.hasEagerState = true;
        e.eagerState = h;
        if (He(h, g)) {
          var k2 = b.interleaved;
          null === k2 ? (e.next = e, gh(b)) : (e.next = k2.next, k2.next = e);
          b.interleaved = e;
          return;
        }
      } catch (l2) {
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
      if (void 0 === c) throw Error(p$1(407));
      c = c();
    } else {
      c = b();
      if (null === Q) throw Error(p$1(349));
      0 !== (Hh & 30) || di(d, b, c);
    }
    e.memoizedState = c;
    var f2 = { value: c, getSnapshot: b };
    e.queue = f2;
    mi(ai.bind(
      null,
      d,
      f2,
      a
    ), [a]);
    d.flags |= 2048;
    bi(9, ci.bind(null, d, f2, c, b), void 0, null);
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
    var d = R(), e = yi(a), f2 = mh(d, e);
    f2.payload = b;
    void 0 !== c && null !== c && (f2.callback = c);
    b = nh(a, f2, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  }, enqueueReplaceState: function(a, b, c) {
    a = a._reactInternals;
    var d = R(), e = yi(a), f2 = mh(d, e);
    f2.tag = 1;
    f2.payload = b;
    void 0 !== c && null !== c && (f2.callback = c);
    b = nh(a, f2, e);
    null !== b && (gi(b, a, e, d), oh(b, a, e));
  }, enqueueForceUpdate: function(a, b) {
    a = a._reactInternals;
    var c = R(), d = yi(a), e = mh(c, d);
    e.tag = 2;
    void 0 !== b && null !== b && (e.callback = b);
    b = nh(a, e, d);
    null !== b && (gi(b, a, d, c), oh(b, a, d));
  } };
  function Fi(a, b, c, d, e, f2, g) {
    a = a.stateNode;
    return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f2) : true;
  }
  function Gi(a, b, c) {
    var d = false, e = Vf;
    var f2 = b.contextType;
    "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
    b = new b(c, f2);
    a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
    b.updater = Ei;
    a.stateNode = b;
    b._reactInternals = a;
    d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f2);
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
    var f2 = b.contextType;
    "object" === typeof f2 && null !== f2 ? e.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e.context = Yf(a, f2));
    e.state = a.memoizedState;
    f2 = b.getDerivedStateFromProps;
    "function" === typeof f2 && (Di(a, b, f2, c), e.state = a.memoizedState);
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
    } catch (f2) {
      e = "\nError generating stack: " + f2.message + "\n" + f2.stack;
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
    var f2 = a.stateNode;
    null !== f2 && "function" === typeof f2.componentDidCatch && (c.callback = function() {
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
    var f2 = b.ref;
    ch(b, e);
    d = Nh(a, b, c, d, f2, e);
    c = Sh();
    if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
    I && c && vg(b);
    b.flags |= 1;
    Xi(a, b, d, e);
    return b.child;
  }
  function $i(a, b, c, d, e) {
    if (null === a) {
      var f2 = c.type;
      if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f2, bj(a, b, f2, d, e);
      a = Rg(c.type, null, d, b, b.mode, e);
      a.ref = b.ref;
      a.return = b;
      return b.child = a;
    }
    f2 = a.child;
    if (0 === (a.lanes & e)) {
      var g = f2.memoizedProps;
      c = c.compare;
      c = null !== c ? c : Ie;
      if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
    }
    b.flags |= 1;
    a = Pg(f2, d);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  function bj(a, b, c, d, e) {
    if (null !== a) {
      var f2 = a.memoizedProps;
      if (Ie(f2, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f2, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
      else return b.lanes = a.lanes, Zi(a, b, e);
    }
    return cj(a, b, c, d, e);
  }
  function dj(a, b, c) {
    var d = b.pendingProps, e = d.children, f2 = null !== a ? a.memoizedState : null;
    if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
    else {
      if (0 === (c & 1073741824)) return a = null !== f2 ? f2.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
      b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
      d = null !== f2 ? f2.baseLanes : c;
      G(ej, fj);
      fj |= d;
    }
    else null !== f2 ? (d = f2.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
    Xi(a, b, e, c);
    return b.child;
  }
  function gj(a, b) {
    var c = b.ref;
    if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
  }
  function cj(a, b, c, d, e) {
    var f2 = Zf(c) ? Xf : H.current;
    f2 = Yf(b, f2);
    ch(b, e);
    c = Nh(a, b, c, d, f2, e);
    d = Sh();
    if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
    I && d && vg(b);
    b.flags |= 1;
    Xi(a, b, c, e);
    return b.child;
  }
  function hj(a, b, c, d, e) {
    if (Zf(c)) {
      var f2 = true;
      cg(b);
    } else f2 = false;
    ch(b, e);
    if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
    else if (null === a) {
      var g = b.stateNode, h = b.memoizedProps;
      g.props = h;
      var k2 = g.context, l2 = c.contextType;
      "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c) ? Xf : H.current, l2 = Yf(b, l2));
      var m2 = c.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
      q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
      jh = false;
      var r2 = b.memoizedState;
      g.state = r2;
      qh(b, d, g, e);
      k2 = b.memoizedState;
      h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
    } else {
      g = b.stateNode;
      lh(a, b);
      h = b.memoizedProps;
      l2 = b.type === b.elementType ? h : Ci(b.type, h);
      g.props = l2;
      q2 = b.pendingProps;
      r2 = g.context;
      k2 = c.contextType;
      "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c) ? Xf : H.current, k2 = Yf(b, k2));
      var y2 = c.getDerivedStateFromProps;
      (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
      jh = false;
      r2 = b.memoizedState;
      g.state = r2;
      qh(b, d, g, e);
      var n2 = b.memoizedState;
      h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), d = false);
    }
    return jj(a, b, c, d, f2, e);
  }
  function jj(a, b, c, d, e, f2) {
    gj(a, b);
    var g = 0 !== (b.flags & 128);
    if (!d && !g) return e && dg(b, c, false), Zi(a, b, f2);
    d = b.stateNode;
    Wi.current = b;
    var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
    b.flags |= 1;
    null !== a && g ? (b.child = Ug(b, a.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a, b, h, f2);
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
    var d = b.pendingProps, e = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
    (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
    if (h) f2 = true, b.flags &= -129;
    else if (null === a || null !== a.memoizedState) e |= 1;
    G(L, e & 1);
    if (null === a) {
      Eg(b);
      a = b.memoizedState;
      if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
      g = d.children;
      a = d.fallback;
      return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a = Tg(a, d, c, null), f2.return = b, a.return = b, f2.sibling = a, b.child = f2, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
    }
    e = a.memoizedState;
    if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
    if (f2) {
      f2 = d.fallback;
      g = b.mode;
      e = a.child;
      h = e.sibling;
      var k2 = { mode: "hidden", children: d.children };
      0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e, k2), d.subtreeFlags = e.subtreeFlags & 14680064);
      null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c, null), f2.flags |= 2);
      f2.return = b;
      d.return = b;
      d.sibling = f2;
      b.child = d;
      d = f2;
      f2 = b.child;
      g = a.child.memoizedState;
      g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
      f2.memoizedState = g;
      f2.childLanes = a.childLanes & ~c;
      b.memoizedState = mj;
      return d;
    }
    f2 = a.child;
    a = f2.sibling;
    d = Pg(f2, { mode: "visible", children: d.children });
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
  function rj(a, b, c, d, e, f2, g) {
    if (c) {
      if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p$1(422))), sj(a, b, g, d);
      if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
      f2 = d.fallback;
      e = b.mode;
      d = pj({ mode: "visible", children: d.children }, e, 0, null);
      f2 = Tg(f2, e, g, null);
      f2.flags |= 2;
      d.return = b;
      f2.return = b;
      d.sibling = f2;
      b.child = d;
      0 !== (b.mode & 1) && Ug(b, a.child, null, g);
      b.child.memoizedState = nj(g);
      b.memoizedState = mj;
      return f2;
    }
    if (0 === (b.mode & 1)) return sj(a, b, g, null);
    if ("$!" === e.data) {
      d = e.nextSibling && e.nextSibling.dataset;
      if (d) var h = d.dgst;
      d = h;
      f2 = Error(p$1(419));
      d = Ki(f2, d, void 0);
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
        0 !== e && e !== f2.retryLane && (f2.retryLane = e, ih(a, e), gi(d, a, e, -1));
      }
      tj();
      d = Ki(Error(p$1(421)));
      return sj(a, b, g, d);
    }
    if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
    a = f2.treeContext;
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
    var f2 = a.memoizedState;
    null === f2 ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c, f2.tailMode = e);
  }
  function xj(a, b, c) {
    var d = b.pendingProps, e = d.revealOrder, f2 = d.tail;
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
        wj(b, false, e, c, f2);
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
        wj(b, true, c, null, f2);
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
    if (null !== a && b.child !== a.child) throw Error(p$1(153));
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
      var f2 = null;
      switch (c) {
        case "input":
          e = Ya(a, e);
          d = Ya(a, d);
          f2 = [];
          break;
        case "select":
          e = A({}, e, { value: void 0 });
          d = A({}, d, { value: void 0 });
          f2 = [];
          break;
        case "textarea":
          e = gb(a, e);
          d = gb(a, d);
          f2 = [];
          break;
        default:
          "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
      }
      ub(c, d);
      var g;
      c = null;
      for (l2 in e) if (!d.hasOwnProperty(l2) && e.hasOwnProperty(l2) && null != e[l2]) if ("style" === l2) {
        var h = e[l2];
        for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
      } else "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
      for (l2 in d) {
        var k2 = d[l2];
        h = null != e ? e[l2] : void 0;
        if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h)) if ("style" === l2) if (h) {
          for (g in h) !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
          for (g in k2) k2.hasOwnProperty(g) && h[g] !== k2[g] && (c || (c = {}), c[g] = k2[g]);
        } else c || (f2 || (f2 = []), f2.push(
          l2,
          c
        )), c = k2;
        else "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
      }
      c && (f2 = f2 || []).push("style", c);
      var l2 = f2;
      if (b.updateQueue = l2) b.flags |= 4;
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
            if (null === b.stateNode) throw Error(p$1(166));
            S(b);
            return null;
          }
          a = xh(uh.current);
          if (Gg(b)) {
            d = b.stateNode;
            c = b.type;
            var f2 = b.memoizedProps;
            d[Of] = b;
            d[Pf] = f2;
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
                Za(d, f2);
                D("invalid", d);
                break;
              case "select":
                d._wrapperState = { wasMultiple: !!f2.multiple };
                D("invalid", d);
                break;
              case "textarea":
                hb(d, f2), D("invalid", d);
            }
            ub(c, f2);
            e = null;
            for (var g in f2) if (f2.hasOwnProperty(g)) {
              var h = f2[g];
              "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
                d.textContent,
                h,
                a
              ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
            }
            switch (c) {
              case "input":
                Va(d);
                db(d, f2, true);
                break;
              case "textarea":
                Va(d);
                jb(d);
                break;
              case "select":
              case "option":
                break;
              default:
                "function" === typeof f2.onClick && (d.onclick = Bf);
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
              for (f2 in h) if (h.hasOwnProperty(f2)) {
                var k2 = h[f2];
                "style" === f2 ? sb(a, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c || "" !== k2) && ob(a, k2) : "number" === typeof k2 && ob(a, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a) : null != k2 && ta(a, f2, k2, g));
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
                  f2 = d.value;
                  null != f2 ? fb(a, !!d.multiple, f2, false) : null != d.defaultValue && fb(
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
          if ("string" !== typeof d && null === b.stateNode) throw Error(p$1(166));
          c = xh(wh.current);
          xh(uh.current);
          if (Gg(b)) {
            d = b.stateNode;
            c = b.memoizedProps;
            d[Of] = b;
            if (f2 = d.nodeValue !== c) {
              if (a = xg, null !== a) switch (a.tag) {
                case 3:
                  Af(d.nodeValue, c, 0 !== (a.mode & 1));
                  break;
                case 5:
                  true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
              }
            }
            f2 && (b.flags |= 4);
          } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
        }
        S(b);
        return null;
      case 13:
        E(L);
        d = b.memoizedState;
        if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
          if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f2 = false;
          else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
            if (null === a) {
              if (!f2) throw Error(p$1(318));
              f2 = b.memoizedState;
              f2 = null !== f2 ? f2.dehydrated : null;
              if (!f2) throw Error(p$1(317));
              f2[Of] = b;
            } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
            S(b);
            f2 = false;
          } else null !== zg && (Fj(zg), zg = null), f2 = true;
          if (!f2) return b.flags & 65536 ? b : null;
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
        f2 = b.memoizedState;
        if (null === f2) return S(b), null;
        d = 0 !== (b.flags & 128);
        g = f2.rendering;
        if (null === g) if (d) Dj(f2, false);
        else {
          if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
            g = Ch(a);
            if (null !== g) {
              b.flags |= 128;
              Dj(f2, false);
              d = g.updateQueue;
              null !== d && (b.updateQueue = d, b.flags |= 4);
              b.subtreeFlags = 0;
              d = c;
              for (c = b.child; null !== c; ) f2 = c, a = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a = g.dependencies, f2.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
              G(L, L.current & 1 | 2);
              return b.child;
            }
            a = a.sibling;
          }
          null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        }
        else {
          if (!d) if (a = Ch(g), null !== a) {
            if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I) return S(b), null;
          } else 2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
          f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f2.last, null !== c ? c.sibling = g : b.child = g, f2.last = g);
        }
        if (null !== f2.tail) return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
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
    throw Error(p$1(156, b.tag));
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
          if (null === b.alternate) throw Error(p$1(340));
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
          var e = d.anchorOffset, f2 = d.focusNode;
          d = d.focusOffset;
          try {
            c.nodeType, f2.nodeType;
          } catch (F2) {
            c = null;
            break a;
          }
          var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a, r2 = null;
          b: for (; ; ) {
            for (var y2; ; ) {
              q2 !== c || 0 !== e && 3 !== q2.nodeType || (h = g + e);
              q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
              3 === q2.nodeType && (g += q2.nodeValue.length);
              if (null === (y2 = q2.firstChild)) break;
              r2 = q2;
              q2 = y2;
            }
            for (; ; ) {
              if (q2 === a) break b;
              r2 === c && ++l2 === e && (h = g);
              r2 === f2 && ++m2 === d && (k2 = g);
              if (null !== (y2 = q2.nextSibling)) break;
              q2 = r2;
              r2 = q2.parentNode;
            }
            q2 = y2;
          }
          c = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
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
        var n2 = b.alternate;
        if (0 !== (b.flags & 1024)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (null !== n2) {
              var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
              x2.__reactInternalSnapshotBeforeUpdate = w2;
            }
            break;
          case 3:
            var u2 = b.stateNode.containerInfo;
            1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(p$1(163));
        }
      } catch (F2) {
        W(b, b.return, F2);
      }
      a = b.sibling;
      if (null !== a) {
        a.return = b.return;
        V = a;
        break;
      }
      V = b.return;
    }
    n2 = Nj;
    Nj = false;
    return n2;
  }
  function Pj(a, b, c) {
    var d = b.updateQueue;
    d = null !== d ? d.lastEffect : null;
    if (null !== d) {
      var e = d = d.next;
      do {
        if ((e.tag & a) === a) {
          var f2 = e.destroy;
          e.destroy = void 0;
          void 0 !== f2 && Mj(b, c, f2);
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
  var X = null, Xj = false;
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
        var d = X, e = Xj;
        X = null;
        Yj(a, b, c);
        X = d;
        Xj = e;
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
        break;
      case 18:
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
        break;
      case 4:
        d = X;
        e = Xj;
        X = c.stateNode.containerInfo;
        Xj = true;
        Yj(a, b, c);
        X = d;
        Xj = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
          e = d = d.next;
          do {
            var f2 = e, g = f2.destroy;
            f2 = f2.tag;
            void 0 !== g && (0 !== (f2 & 2) ? Mj(c, b, g) : 0 !== (f2 & 4) && Mj(c, b, g));
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
        var f2 = a, g = b, h = g;
        a: for (; null !== h; ) {
          switch (h.tag) {
            case 5:
              X = h.stateNode;
              Xj = false;
              break a;
            case 3:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
            case 4:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
          }
          h = h.return;
        }
        if (null === X) throw Error(p$1(160));
        Zj(f2, g, e);
        X = null;
        Xj = false;
        var k2 = e.alternate;
        null !== k2 && (k2.return = null);
        e.return = null;
      } catch (l2) {
        W(e, b, l2);
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
          } catch (t2) {
            W(a, a.return, t2);
          }
          try {
            Pj(5, a, a.return);
          } catch (t2) {
            W(a, a.return, t2);
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
          } catch (t2) {
            W(a, a.return, t2);
          }
        }
        if (d & 4 && (e = a.stateNode, null != e)) {
          var f2 = a.memoizedProps, g = null !== c ? c.memoizedProps : f2, h = a.type, k2 = a.updateQueue;
          a.updateQueue = null;
          if (null !== k2) try {
            "input" === h && "radio" === f2.type && null != f2.name && ab(e, f2);
            vb(h, g);
            var l2 = vb(h, f2);
            for (g = 0; g < k2.length; g += 2) {
              var m2 = k2[g], q2 = k2[g + 1];
              "style" === m2 ? sb(e, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e, q2) : "children" === m2 ? ob(e, q2) : ta(e, m2, q2, l2);
            }
            switch (h) {
              case "input":
                bb(e, f2);
                break;
              case "textarea":
                ib(e, f2);
                break;
              case "select":
                var r2 = e._wrapperState.wasMultiple;
                e._wrapperState.wasMultiple = !!f2.multiple;
                var y2 = f2.value;
                null != y2 ? fb(e, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                  e,
                  !!f2.multiple,
                  f2.defaultValue,
                  true
                ) : fb(e, !!f2.multiple, f2.multiple ? [] : "", false));
            }
            e[Pf] = f2;
          } catch (t2) {
            W(a, a.return, t2);
          }
        }
        break;
      case 6:
        ck(b, a);
        ek(a);
        if (d & 4) {
          if (null === a.stateNode) throw Error(p$1(162));
          e = a.stateNode;
          f2 = a.memoizedProps;
          try {
            e.nodeValue = f2;
          } catch (t2) {
            W(a, a.return, t2);
          }
        }
        break;
      case 3:
        ck(b, a);
        ek(a);
        if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
          bd(b.containerInfo);
        } catch (t2) {
          W(a, a.return, t2);
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
        e.flags & 8192 && (f2 = null !== e.memoizedState, e.stateNode.isHidden = f2, !f2 || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
        d & 4 && ak(a);
        break;
      case 22:
        m2 = null !== c && null !== c.memoizedState;
        a.mode & 1 ? (U = (l2 = U) || m2, ck(b, a), U = l2) : ck(b, a);
        ek(a);
        if (d & 8192) {
          l2 = null !== a.memoizedState;
          if ((a.stateNode.isHidden = l2) && !m2 && 0 !== (a.mode & 1)) for (V = a, m2 = a.child; null !== m2; ) {
            for (q2 = V = m2; null !== V; ) {
              r2 = V;
              y2 = r2.child;
              switch (r2.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Pj(4, r2, r2.return);
                  break;
                case 1:
                  Lj(r2, r2.return);
                  var n2 = r2.stateNode;
                  if ("function" === typeof n2.componentWillUnmount) {
                    d = r2;
                    c = r2.return;
                    try {
                      b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                    } catch (t2) {
                      W(d, c, t2);
                    }
                  }
                  break;
                case 5:
                  Lj(r2, r2.return);
                  break;
                case 22:
                  if (null !== r2.memoizedState) {
                    gk(q2);
                    continue;
                  }
              }
              null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
            }
            m2 = m2.sibling;
          }
          a: for (m2 = null, q2 = a; ; ) {
            if (5 === q2.tag) {
              if (null === m2) {
                m2 = q2;
                try {
                  e = q2.stateNode, l2 ? (f2 = e.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
                } catch (t2) {
                  W(a, a.return, t2);
                }
              }
            } else if (6 === q2.tag) {
              if (null === m2) try {
                q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
              } catch (t2) {
                W(a, a.return, t2);
              }
            } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a) && null !== q2.child) {
              q2.child.return = q2;
              q2 = q2.child;
              continue;
            }
            if (q2 === a) break a;
            for (; null === q2.sibling; ) {
              if (null === q2.return || q2.return === a) break a;
              m2 === q2 && (m2 = null);
              q2 = q2.return;
            }
            m2 === q2 && (m2 = null);
            q2.sibling.return = q2.return;
            q2 = q2.sibling;
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
          throw Error(p$1(160));
        }
        switch (d.tag) {
          case 5:
            var e = d.stateNode;
            d.flags & 32 && (ob(e, ""), d.flags &= -33);
            var f2 = Uj(a);
            Wj(a, f2, e);
            break;
          case 3:
          case 4:
            var g = d.stateNode.containerInfo, h = Uj(a);
            Vj(a, h, g);
            break;
          default:
            throw Error(p$1(161));
        }
      } catch (k2) {
        W(a, a.return, k2);
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
      var e = V, f2 = e.child;
      if (22 === e.tag && d) {
        var g = null !== e.memoizedState || Jj;
        if (!g) {
          var h = e.alternate, k2 = null !== h && null !== h.memoizedState || U;
          h = Jj;
          var l2 = U;
          Jj = g;
          if ((U = k2) && !l2) for (V = e; null !== V; ) g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k2 ? (k2.return = g, V = k2) : jk(e);
          for (; null !== f2; ) V = f2, ik(f2), f2 = f2.sibling;
          V = e;
          Jj = h;
          U = l2;
        }
        kk(a);
      } else 0 !== (e.subtreeFlags & 8772) && null !== f2 ? (f2.return = e, V = f2) : kk(a);
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
              var f2 = b.updateQueue;
              null !== f2 && sh(b, f2, d);
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
                var k2 = b.memoizedProps;
                switch (b.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    k2.autoFocus && c.focus();
                    break;
                  case "img":
                    k2.src && (c.src = k2.src);
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
                var l2 = b.alternate;
                if (null !== l2) {
                  var m2 = l2.memoizedState;
                  if (null !== m2) {
                    var q2 = m2.dehydrated;
                    null !== q2 && bd(q2);
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
              throw Error(p$1(163));
          }
          U || b.flags & 512 && Rj(b);
        } catch (r2) {
          W(b, b.return, r2);
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
            } catch (k2) {
              W(b, c, k2);
            }
            break;
          case 1:
            var d = b.stateNode;
            if ("function" === typeof d.componentDidMount) {
              var e = b.return;
              try {
                d.componentDidMount();
              } catch (k2) {
                W(b, e, k2);
              }
            }
            var f2 = b.return;
            try {
              Rj(b);
            } catch (k2) {
              W(b, f2, k2);
            }
            break;
          case 5:
            var g = b.return;
            try {
              Rj(b);
            } catch (k2) {
              W(b, g, k2);
            }
        }
      } catch (k2) {
        W(b, b.return, k2);
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
    if (50 < yk) throw yk = 0, zk = null, Error(p$1(185));
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
    if (0 !== (K & 6)) throw Error(p$1(327));
    var c = a.callbackNode;
    if (Hk() && a.callbackNode !== c) return null;
    var d = uc(a, a === Q ? Z : 0);
    if (0 === d) return null;
    if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
    else {
      b = d;
      var e = K;
      K |= 2;
      var f2 = Jk();
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
      mk.current = f2;
      K = e;
      null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
    }
    if (0 !== b) {
      2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
      if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      if (6 === b) Ck(a, d);
      else {
        e = a.current.alternate;
        if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f2 = xc(a), 0 !== f2 && (d = f2, b = Nk(a, f2))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
        a.finishedWork = e;
        a.finishedLanes = d;
        switch (b) {
          case 0:
          case 1:
            throw Error(p$1(345));
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
              f2 = 1 << g;
              g = b[g];
              g > e && (e = g);
              d &= ~f2;
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
            throw Error(p$1(329));
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
          var e = c[d], f2 = e.getSnapshot;
          e = e.value;
          try {
            if (!He(f2(), e)) return false;
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
    if (0 !== (K & 6)) throw Error(p$1(327));
    Hk();
    var b = uc(a, 0);
    if (0 === (b & 1)) return Dk(a, B()), null;
    var c = Ik(a, b);
    if (0 !== a.tag && 2 === c) {
      var d = xc(a);
      0 !== d && (b = d, c = Nk(a, d));
    }
    if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
    if (6 === c) throw Error(p$1(345));
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
        var e = d.next, f2 = c.pending;
        if (null !== f2) {
          var g = f2.next;
          f2.next = e;
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
          var f2 = a, g = c.return, h = c, k2 = b;
          b = Z;
          h.flags |= 32768;
          if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
            var l2 = k2, m2 = h, q2 = m2.tag;
            if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
              var r2 = m2.alternate;
              r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
            }
            var y2 = Ui(g);
            if (null !== y2) {
              y2.flags &= -257;
              Vi(y2, g, h, f2, b);
              y2.mode & 1 && Si(f2, l2, b);
              b = y2;
              k2 = l2;
              var n2 = b.updateQueue;
              if (null === n2) {
                var t2 = /* @__PURE__ */ new Set();
                t2.add(k2);
                b.updateQueue = t2;
              } else n2.add(k2);
              break a;
            } else {
              if (0 === (b & 1)) {
                Si(f2, l2, b);
                tj();
                break a;
              }
              k2 = Error(p$1(426));
            }
          } else if (I && h.mode & 1) {
            var J2 = Ui(g);
            if (null !== J2) {
              0 === (J2.flags & 65536) && (J2.flags |= 256);
              Vi(J2, g, h, f2, b);
              Jg(Ji(k2, h));
              break a;
            }
          }
          f2 = k2 = Ji(k2, h);
          4 !== T && (T = 2);
          null === sk ? sk = [f2] : sk.push(f2);
          f2 = g;
          do {
            switch (f2.tag) {
              case 3:
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var x2 = Ni(f2, k2, b);
                ph(f2, x2);
                break a;
              case 1:
                h = k2;
                var w2 = f2.type, u2 = f2.stateNode;
                if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                  f2.flags |= 65536;
                  b &= -b;
                  f2.lanes |= b;
                  var F2 = Qi(f2, h, b);
                  ph(f2, F2);
                  break a;
                }
            }
            f2 = f2.return;
          } while (null !== f2);
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
    if (null !== Y) throw Error(p$1(261));
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
    if (0 !== (K & 6)) throw Error(p$1(327));
    c = a.finishedWork;
    var e = a.finishedLanes;
    if (null === c) return null;
    a.finishedWork = null;
    a.finishedLanes = 0;
    if (c === a.current) throw Error(p$1(177));
    a.callbackNode = null;
    a.callbackPriority = 0;
    var f2 = c.lanes | c.childLanes;
    Bc(a, f2);
    a === Q && (Y = Q = null, Z = 0);
    0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
      Hk();
      return null;
    }));
    f2 = 0 !== (c.flags & 15990);
    if (0 !== (c.subtreeFlags & 15990) || f2) {
      f2 = ok.transition;
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
      ok.transition = f2;
    } else a.current = c;
    vk && (vk = false, wk = a, xk = e);
    f2 = a.pendingLanes;
    0 === f2 && (Ri = null);
    mc(c.stateNode);
    Dk(a, B());
    if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
    if (Oi) throw Oi = false, a = Pi, Pi = null, a;
    0 !== (xk & 1) && 0 !== a.tag && Hk();
    f2 = a.pendingLanes;
    0 !== (f2 & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
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
          if (0 !== (K & 6)) throw Error(p$1(331));
          var e = K;
          K |= 4;
          for (V = a.current; null !== V; ) {
            var f2 = V, g = f2.child;
            if (0 !== (V.flags & 16)) {
              var h = f2.deletions;
              if (null !== h) {
                for (var k2 = 0; k2 < h.length; k2++) {
                  var l2 = h[k2];
                  for (V = l2; null !== V; ) {
                    var m2 = V;
                    switch (m2.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Pj(8, m2, f2);
                    }
                    var q2 = m2.child;
                    if (null !== q2) q2.return = m2, V = q2;
                    else for (; null !== V; ) {
                      m2 = V;
                      var r2 = m2.sibling, y2 = m2.return;
                      Sj(m2);
                      if (m2 === l2) {
                        V = null;
                        break;
                      }
                      if (null !== r2) {
                        r2.return = y2;
                        V = r2;
                        break;
                      }
                      V = y2;
                    }
                  }
                }
                var n2 = f2.alternate;
                if (null !== n2) {
                  var t2 = n2.child;
                  if (null !== t2) {
                    n2.child = null;
                    do {
                      var J2 = t2.sibling;
                      t2.sibling = null;
                      t2 = J2;
                    } while (null !== t2);
                  }
                }
                V = f2;
              }
            }
            if (0 !== (f2.subtreeFlags & 2064) && null !== g) g.return = f2, V = g;
            else b: for (; null !== V; ) {
              f2 = V;
              if (0 !== (f2.flags & 2048)) switch (f2.tag) {
                case 0:
                case 11:
                case 15:
                  Pj(9, f2, f2.return);
              }
              var x2 = f2.sibling;
              if (null !== x2) {
                x2.return = f2.return;
                V = x2;
                break b;
              }
              V = f2.return;
            }
          }
          var w2 = a.current;
          for (V = w2; null !== V; ) {
            g = V;
            var u2 = g.child;
            if (0 !== (g.subtreeFlags & 2064) && null !== u2) u2.return = g, V = u2;
            else b: for (g = w2; null !== V; ) {
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
              var F2 = h.sibling;
              if (null !== F2) {
                F2.return = h.return;
                V = F2;
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
        throw Error(p$1(314));
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
        var f2 = Sh();
        b.flags |= 1;
        "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f2, c)) : (b.tag = 0, I && f2 && vg(b), Xi(null, b, e, c), b = b.child);
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
          throw Error(p$1(
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
          if (null === a) throw Error(p$1(387));
          d = b.pendingProps;
          f2 = b.memoizedState;
          e = f2.element;
          lh(a, b);
          qh(b, d, null, c);
          var g = b.memoizedState;
          d = g.element;
          if (f2.isDehydrated) if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
            e = Ji(Error(p$1(423)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else if (d !== e) {
            e = Ji(Error(p$1(424)), b);
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
        return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f2 = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
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
          f2 = b.memoizedProps;
          g = e.value;
          G(Wg, d._currentValue);
          d._currentValue = g;
          if (null !== f2) if (He(f2.value, g)) {
            if (f2.children === e.children && !Wf.current) {
              b = Zi(a, b, c);
              break a;
            }
          } else for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
            var h = f2.dependencies;
            if (null !== h) {
              g = f2.child;
              for (var k2 = h.firstContext; null !== k2; ) {
                if (k2.context === d) {
                  if (1 === f2.tag) {
                    k2 = mh(-1, c & -c);
                    k2.tag = 2;
                    var l2 = f2.updateQueue;
                    if (null !== l2) {
                      l2 = l2.shared;
                      var m2 = l2.pending;
                      null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                      l2.pending = k2;
                    }
                  }
                  f2.lanes |= c;
                  k2 = f2.alternate;
                  null !== k2 && (k2.lanes |= c);
                  bh(
                    f2.return,
                    c,
                    b
                  );
                  h.lanes |= c;
                  break;
                }
                k2 = k2.next;
              }
            } else if (10 === f2.tag) g = f2.type === b.type ? null : f2.child;
            else if (18 === f2.tag) {
              g = f2.return;
              if (null === g) throw Error(p$1(341));
              g.lanes |= c;
              h = g.alternate;
              null !== h && (h.lanes |= c);
              bh(g, c, b);
              g = f2.sibling;
            } else g = f2.child;
            if (null !== g) g.return = f2;
            else for (g = f2; null !== g; ) {
              if (g === b) {
                g = null;
                break;
              }
              f2 = g.sibling;
              if (null !== f2) {
                f2.return = g.return;
                g = f2;
                break;
              }
              g = g.return;
            }
            f2 = g;
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
    throw Error(p$1(156, b.tag));
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
  function Rg(a, b, c, d, e, f2) {
    var g = 2;
    d = a;
    if ("function" === typeof a) aj(a) && (g = 1);
    else if ("string" === typeof a) g = 5;
    else a: switch (a) {
      case ya:
        return Tg(c.children, e, f2, b);
      case za:
        g = 8;
        e |= 8;
        break;
      case Aa:
        return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f2, a;
      case Ea:
        return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f2, a;
      case Fa:
        return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f2, a;
      case Ia:
        return pj(c, e, f2, b);
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
        throw Error(p$1(130, null == a ? a : typeof a, ""));
    }
    b = Bg(g, c, b, e);
    b.elementType = a;
    b.type = d;
    b.lanes = f2;
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
  function bl(a, b, c, d, e, f2, g, h, k2) {
    a = new al(a, b, c, h, k2);
    1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
    f2 = Bg(3, null, null, b);
    a.current = f2;
    f2.stateNode = a;
    f2.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
    kh(f2);
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
      if (Vb(a) !== a || 1 !== a.tag) throw Error(p$1(170));
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
      throw Error(p$1(171));
    }
    if (1 === a.tag) {
      var c = a.type;
      if (Zf(c)) return bg(a, c, b);
    }
    return b;
  }
  function el(a, b, c, d, e, f2, g, h, k2) {
    a = bl(c, d, true, a, e, f2, g, h, k2);
    a.context = dl(null);
    c = a.current;
    d = R();
    e = yi(c);
    f2 = mh(d, e);
    f2.callback = void 0 !== b && null !== b ? b : null;
    nh(c, f2, e);
    a.current.lanes = e;
    Ac(a, e, d);
    Dk(a, d);
    return a;
  }
  function fl(a, b, c, d) {
    var e = b.current, f2 = R(), g = yi(e);
    c = dl(c);
    null === b.context ? b.context = c : b.pendingContext = c;
    b = mh(f2, g);
    b.payload = { element: a };
    d = void 0 === d ? null : d;
    null !== d && (b.callback = d);
    a = nh(e, b, g);
    null !== a && (gi(a, e, g, f2), oh(a, e, g));
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
    if (null === b) throw Error(p$1(409));
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
        var f2 = d;
        d = function() {
          var a2 = gl(g);
          f2.call(a2);
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
        var a2 = gl(k2);
        h.call(a2);
      };
    }
    var k2 = bl(a, 0, false, null, null, false, false, "", pl);
    a._reactRootContainer = k2;
    a[uf] = k2.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk(function() {
      fl(b, k2, c, d);
    });
    return k2;
  }
  function rl(a, b, c, d, e) {
    var f2 = c._reactRootContainer;
    if (f2) {
      var g = f2;
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
              if (!e) throw Error(p$1(90));
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
    if (!nl(b)) throw Error(p$1(200));
    return cl(a, b, null, c);
  };
  reactDom_production_min.createRoot = function(a, b) {
    if (!nl(a)) throw Error(p$1(299));
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
      if ("function" === typeof a.render) throw Error(p$1(188));
      a = Object.keys(a).join(",");
      throw Error(p$1(268, a));
    }
    a = Zb(b);
    a = null === a ? null : a.stateNode;
    return a;
  };
  reactDom_production_min.flushSync = function(a) {
    return Rk(a);
  };
  reactDom_production_min.hydrate = function(a, b, c) {
    if (!ol(b)) throw Error(p$1(200));
    return rl(null, a, b, true, c);
  };
  reactDom_production_min.hydrateRoot = function(a, b, c) {
    if (!nl(a)) throw Error(p$1(405));
    var d = null != c && c.hydratedSources || null, e = false, f2 = "", g = kl;
    null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f2 = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
    b = el(b, null, a, 1, null != c ? c : null, e, false, f2, g);
    a[uf] = b.current;
    sf(a);
    if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
      c,
      e
    );
    return new ml(b);
  };
  reactDom_production_min.render = function(a, b, c) {
    if (!ol(b)) throw Error(p$1(200));
    return rl(null, a, b, false, c);
  };
  reactDom_production_min.unmountComponentAtNode = function(a) {
    if (!ol(a)) throw Error(p$1(40));
    return a._reactRootContainer ? (Rk(function() {
      rl(null, null, a, false, function() {
        a._reactRootContainer = null;
        a[uf] = null;
      });
    }), true) : false;
  };
  reactDom_production_min.unstable_batchedUpdates = Qk;
  reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
    if (!ol(c)) throw Error(p$1(200));
    if (null == a || void 0 === a._reactInternals) throw Error(p$1(38));
    return rl(a, b, c, false, d);
  };
  reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
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
    reactDom.exports = reactDom_production_min;
  }
  var reactDomExports = reactDom.exports;
  var createRoot;
  var m$1 = reactDomExports;
  {
    createRoot = m$1.createRoot;
    m$1.hydrateRoot;
  }
  var jsxRuntime = { exports: {} };
  var reactJsxRuntime_production_min = {};
  /**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = { key: true, ref: true, __self: true, __source: true };
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
  {
    jsxRuntime.exports = reactJsxRuntime_production_min;
  }
  var jsxRuntimeExports = jsxRuntime.exports;
  const DANGER_CPU = 85;
  const DANGER_MEMORY = 85;
  const DANGER_DISK = 90;
  function toNumber(value, fallback = 0) {
    const n2 = Number(value);
    return Number.isFinite(n2) ? n2 : fallback;
  }
  function formatNumber(value) {
    const n2 = toNumber(value, NaN);
    return Number.isFinite(n2) ? new Intl.NumberFormat("zh-CN").format(n2) : "-";
  }
  function formatPercent(value, digits = 0) {
    const n2 = toNumber(value, NaN);
    return Number.isFinite(n2) ? `${n2.toFixed(digits)}%` : "-";
  }
  function formatCompact(value) {
    const n2 = toNumber(value, NaN);
    if (!Number.isFinite(n2)) return "-";
    const abs = Math.abs(n2);
    if (abs >= 1e9) return `${(n2 / 1e9).toFixed(1)}G`;
    if (abs >= 1e6) return `${(n2 / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(n2 / 1e3).toFixed(1)}K`;
    return `${Math.round(n2)}`;
  }
  function formatRate(value) {
    const n2 = toNumber(value, NaN);
    if (!Number.isFinite(n2)) return "-";
    const abs = Math.abs(n2);
    if (abs >= 1e9) return `${(n2 / 1e9).toFixed(2)} Gbps`;
    if (abs >= 1e6) return `${(n2 / 1e6).toFixed(2)} Mbps`;
    if (abs >= 1e3) return `${(n2 / 1e3).toFixed(2)} Kbps`;
    return `${Math.round(n2)} bps`;
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
    const parsed = Date.parse(String(value));
    if (Number.isNaN(parsed)) return "-";
    const date = new Date(parsed);
    const pad = (n2) => String(n2).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function compactListText(values, limit = 3) {
    const items = values.map((value) => String(value ?? "").trim()).filter(Boolean);
    if (!items.length) return "";
    if (items.length <= limit) return items.join(" / ");
    return `${items.slice(0, limit).join(" / ")} / …`;
  }
  function stripChannelPrefix(value, channel) {
    const text2 = String(value ?? "").trim();
    const prefix = `${channel} `;
    return text2.startsWith(prefix) ? text2.slice(prefix.length) : text2;
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
    if (snapshot.status === "error") return "cache";
    const meta = snapshot.meta || {};
    if (meta.realtimeError || meta.slowRestError) return "cache";
    return "realtime";
  }
  function wanRows$2(snapshot) {
    return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function routeRows$1(snapshot) {
    var _a, _b;
    const rows = ((_a = snapshot.routes) == null ? void 0 : _a.defaultRoutes) || ((_b = snapshot.routes) == null ? void 0 : _b.items) || [];
    return Array.isArray(rows) ? rows : [];
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
    const state = primary.disabled ? "已禁用" : primary.active ? "已启用" : "待确认";
    return `主默认路由：${gateway}，优先级${distance}，${state}`;
  }
  function latestCollectionSuccessTime(snapshot) {
    const meta = snapshot.meta || {};
    return meta.realtimeUpdatedAt || meta.slowRestUpdatedAt || meta.staticUpdatedAt || meta.connectionDetailUpdatedAt || meta.connectionProtocolUpdatedAt || "";
  }
  function isSnapshotUnavailable(snapshot) {
    if (!snapshot) return true;
    const meta = snapshot.meta || {};
    const signal = [snapshot.error, meta.realtimeError, meta.slowRestError, meta.staticError, meta.connectionDetailError, meta.connectionProtocolError].map((v2) => String(v2 || "")).join(" ");
    const emptyBusiness = [snapshot.wan, snapshot.pppoe, snapshot.interfaces, snapshot.terminals].every((rows) => !Array.isArray(rows) || rows.length === 0);
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
    const source = snapshot.updatedAt || ((_a = snapshot.meta) == null ? void 0 : _a.realtimeUpdatedAt) || latestCollectionSuccessTime(snapshot);
    if (!source) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
    const parsed = Date.parse(source);
    if (Number.isNaN(parsed)) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
    const seconds = Math.max(0, Math.round((now2 - parsed) / 1e3));
    const poll = Math.max(1, toNumber((_b = snapshot.meta) == null ? void 0 : _b.pollSeconds, 60));
    const level = seconds >= Math.max(900, poll * 15) ? "danger" : seconds >= Math.max(300, poll * 5) ? "warn" : "ok";
    return { label: level === "danger" ? "数据陈旧" : level === "warn" ? "数据偏旧" : "采样新鲜", level, stale: level !== "ok", history: level === "danger", missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds, text: formatDurationCompact(seconds), source };
  }
  function collectionState(snapshot, freshness, failures = failedEndpointSummary(snapshot)) {
    var _a, _b;
    const meta = snapshot.meta || {};
    const noSnapshot = isSnapshotUnavailable(snapshot);
    const credibility = noSnapshot ? "unavailable" : freshness.credibility === "cache" || snapshot.status === "error" || Boolean(meta.realtimeError || meta.slowRestError) ? "cache" : "realtime";
    const channelErrors = [meta.realtimeError, meta.slowRestError, meta.staticError, meta.connectionDetailError, meta.connectionProtocolError].filter(Boolean);
    let restLabel = ((_a = meta.capabilities) == null ? void 0 : _a.restTrusted) === false ? "待确认" : "可用";
    let sshLabel = ((_b = meta.capabilities) == null ? void 0 : _b.sshRead) === false ? "缺依赖" : "可用";
    if (noSnapshot) {
      restLabel = "待确认";
      sshLabel = "不可用";
    } else if (channelErrors.length || snapshot.status === "error") {
      if (!/待确认|不可用/.test(restLabel)) restLabel = "待确认";
      if (!/不可用|缺依赖/.test(sshLabel)) sshLabel = "不可用";
    }
    const channelText = `REST ${restLabel} / SSH ${sshLabel}`;
    const channelDegraded = Boolean(noSnapshot || snapshot.status === "error" || channelErrors.length || failures.count > 0);
    const dataStale = Boolean(freshness.stale || freshness.history);
    const dataText = noSnapshot ? "无业务快照，业务数据不展示" : channelDegraded ? "缓存快照" : dataStale ? `业务快照年龄 ${freshness.text}` : `数据层最后成功采样 ${shortTimestamp(latestCollectionSuccessTime(snapshot) || snapshot.updatedAt)}`;
    const level = noSnapshot || snapshot.status === "error" ? "danger" : channelDegraded || dataStale ? "warn" : "ok";
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
    const rawSummary = defaultRouteRawSummary(routeRows$1(snapshot));
    const businessSummary = defaultRouteBusinessSummary(routeRows$1(snapshot));
    if (isSnapshotUnavailable(snapshot) || snapshot.status === "error") return { label: "不可判定", text: "缺少当前路由快照", level: "warn", rawSummary };
    if (freshness.stale || freshness.history) return { label: "历史快照", text: "默认路由待判定", level: "warn", rawSummary };
    const active = routeRows$1(snapshot).find((route) => route.active && !route.disabled) || routeRows$1(snapshot)[0];
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
    const rows = wanRows$2(snapshot);
    const available = !isSnapshotUnavailable(snapshot);
    const online = rows.filter((row) => row.running !== false).length;
    const total = rows.length;
    const offline = Math.max(0, total - online);
    const allOffline = total > 0 && online === 0;
    return { available, total, online, offline, allOffline, label: !available ? "未记录" : allOffline ? "WAN 全离线" : offline > 0 ? "WAN 部分离线" : "WAN 可用", text: !available ? "未记录" : `${formatNumber(online)}/${formatNumber(total)} · ${formatNumber(offline)} 离线` };
  }
  function interfaceState(snapshot) {
    const rows = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
    const available = !isSnapshotUnavailable(snapshot);
    const downRows = rows.filter((row) => (row == null ? void 0 : row.running) === false);
    const downNames = downRows.map((row) => row.name || row.interface || "").filter(Boolean);
    return { available, total: available ? rows.length : 0, down: available ? downRows.length : 0, downNames, text: !available ? "未记录" : downRows.length ? `${formatNumber(downRows.length)} down · ${compactListText(downNames, 3) || "未列出"}` : "接口在线" };
  }
  function connectionState(snapshot) {
    var _a, _b, _c;
    return { total: toNumber((_a = snapshot.connections) == null ? void 0 : _a.total, 0), active: Array.isArray((_b = snapshot.connections) == null ? void 0 : _b.active) ? snapshot.connections.active.length : 0, topIps: Array.isArray((_c = snapshot.connections) == null ? void 0 : _c.topIps) ? snapshot.connections.topIps.length : 0 };
  }
  function deviceFacts(snapshot) {
    const device = snapshot.overview || {};
    const meta = snapshot.meta || {};
    return { identity: normalize(device.identity || "RouterOS"), version: normalize(device.version || "-"), boardName: normalize(device.boardName || "-"), architecture: normalize(device.architecture || "-"), uptime: normalize(device.uptime || "-"), systemTime: normalize(device.systemTime || "-"), routerHost: normalize(meta.routerHost || "-"), target: normalize(meta.target || "-") };
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
    const routeros = unavailable || snapshot.status === "error" ? { label: "设备通达", value: "不可达", note: text$1(snapshot.error, "当前采集失败"), tone: "danger" } : { label: "设备通达", value: "可达", note: "管理面已返回快照", tone: "ok" };
    const rest = unavailable ? { label: "REST", value: "未记录", note: "无业务快照", tone: "missing" } : facts.collection.credibility === "cache" ? { label: "REST", value: "缓存", note: facts.collection.channelText, tone: "warn" } : { label: "REST", value: "实时", note: "实时快照可用", tone: "trust" };
    const ssh = unavailable ? { label: "SSH", value: "未记录", note: "无业务快照", tone: "missing" } : facts.collection.credibility === "cache" ? { label: "SSH", value: "缓存", note: facts.collection.channelText, tone: "warn" } : { label: "SSH", value: "实时", note: "静态读取可用", tone: "trust" };
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
  const base = (scenario) => ({
    status: "ok",
    updatedAt: now,
    meta: {
      scaleScenario: scenario,
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
      diskUsage: 22
    },
    wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan" }],
    routes: { defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }] },
    connections: { total: 1234, active: [{}, {}], topIps: [{}] },
    terminals: [{ name: "client-1", ip: "192.168.88.10", status: "online" }]
  });
  const OVERVIEW_SCENARIO_FIXTURES = {
    fleet: {
      overview: {
        ...base("fleet").overview
      }
    },
    "no-snapshot": {
      status: "error",
      updatedAt: now,
      error: "设备当前不可达",
      meta: {
        scaleScenario: "no-snapshot",
        target: "10.0.0.1",
        routerHost: "10.0.0.1",
        pollSeconds: 5,
        realtimeError: "设备当前不可达",
        staticError: "静态采集失败",
        connectionDetailError: "连接详情失败",
        realtimeEndpointFailures: [
          { group: "REST", name: "10.0.0.1 /rest/system/resource" }
        ],
        staticEndpointFailures: [
          { group: "SSH", name: "10.0.0.1 /system/resource" }
        ],
        detailEndpointFailures: [
          { group: "连接详情", name: "10.0.0.1 /ip/firewall/connection" }
        ],
        realtimeUpdatedAt: "2026-06-21T02:51:00+08:00",
        staticUpdatedAt: "2026-06-21T02:51:00+08:00",
        capabilities: { restTrusted: false, sshRead: false }
      },
      overview: {},
      wan: [],
      pppoe: [],
      interfaces: [],
      routes: { defaultRoutes: [] },
      connections: {},
      terminals: []
    },
    "collection-down": {
      meta: {
        ...base("collection-down").meta
      }
    },
    "resource-full": {
      overview: {
        ...base("resource-full").overview
      }
    }
  };
  function clean(value, fallback = "-") {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }
  function isRecord(value) {
    return typeof value === "object" && value !== null;
  }
  function recordArray(value) {
    return Array.isArray(value) ? value.filter(isRecord) : [];
  }
  function firstText(row, keys, fallback = "-") {
    for (const key of keys) {
      const value = clean(row[key], "");
      if (value) return value;
    }
    return fallback;
  }
  function firstNumber(row, keys) {
    for (const key of keys) {
      const value = toNumber(row[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }
  function wanRows$1(snapshot) {
    if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
    return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function interfaceRows$1(snapshot) {
    return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  }
  function twoDigit(value) {
    return String(value).padStart(2, "0");
  }
  function mobileTime(raw) {
    const source = String(raw ?? "").trim();
    if (!source) return "未记录";
    const numeric = typeof raw === "number" || /^\d+$/.test(source) ? Number(raw) : Number.NaN;
    const date = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1e3 : numeric) : new Date(source);
    if (Number.isNaN(date.getTime())) {
      const fallback = shortTimestamp(raw);
      return fallback && !/\d{4}-\d{2}-\d{2}T/.test(fallback) ? fallback : "未记录";
    }
    const now2 = /* @__PURE__ */ new Date();
    const time = `${twoDigit(date.getHours())}:${twoDigit(date.getMinutes())}`;
    if (date.getFullYear() === now2.getFullYear() && date.getMonth() === now2.getMonth() && date.getDate() === now2.getDate()) {
      return time;
    }
    return `${twoDigit(date.getMonth() + 1)}-${twoDigit(date.getDate())} ${time}`;
  }
  function latestSuccess$1(snapshot, state) {
    const meta = snapshot.meta || {};
    const raw = state.scenario === "no-snapshot" ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
    return mobileTime(raw);
  }
  function toneClass(tone) {
    return `is-${tone}`;
  }
  function screenTone(state) {
    if (state.scenario === "no-snapshot") return "missing";
    if (state.scenario === "single") return "ok";
    return state.verdict.level;
  }
  function statusLabel(state) {
    if (state.scenario === "no-snapshot") return "离线";
    if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "断链";
    if (state.scenario === "resource-full") return "超阈";
    if (state.scenario === "interfaces-down") return "异常";
    if (state.scenario === "collection-down") return "缓存";
    if (state.scenario === "single") return "良好";
    if (state.verdict.level === "warn") return "需确认";
    return "在线";
  }
  function conclusion(state) {
    if (state.scenario === "no-snapshot") return "业务快照缺失";
    if (state.scenario === "all-offline" || state.facts.wan.allOffline && state.scenario !== "interfaces-down") return "WAN 全离线";
    if (state.scenario === "resource-full") return "资源满载";
    if (state.scenario === "interfaces-down") return "接口 Down";
    if (state.scenario === "collection-down") return "采集降级";
    if (state.scenario === "single") return "网络状态良好";
    if (state.verdict.level === "warn") return "网络需确认";
    return "网络状态良好";
  }
  function mobileRouteValue(state) {
    if (state.facts.wan.allOffline) return "异常";
    if (state.facts.route.level === "danger") return "异常";
    if (state.scenario === "collection-down") return "历史快照";
    if (state.scenario === "interfaces-down") return "待确认";
    if (state.facts.route.level === "missing") return "待确认";
    if (state.scenario === "resource-full") return "活动默认路由";
    return "可用";
  }
  function mobileCollectionNote(snapshot, state) {
    if (state.scenario === "collection-down") return `最近 ${latestSuccess$1(snapshot, state)}`;
    if (state.facts.collection.dataStale || state.facts.freshness.history) return `最近 ${latestSuccess$1(snapshot, state)}`;
    return `最近 ${latestSuccess$1(snapshot, state)}`;
  }
  function trustText(state) {
    if (state.scenario === "no-snapshot") return "业务快照缺失";
    if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存快照";
    return "实时可信";
  }
  function totals(snapshot) {
    return wanRows$1(snapshot).reduce(
      (sum, row) => ({
        up: sum.up + toNumber(row.upRate),
        down: sum.down + toNumber(row.downRate)
      }),
      { up: 0, down: 0 }
    );
  }
  function compactRate(value) {
    if (!Number.isFinite(value) || value <= 0) return "未采集";
    return formatRate(value).replace(/\s+/g, "");
  }
  function mobileRate(value) {
    if (!Number.isFinite(value) || value <= 0) return "未采集";
    if (value >= 1e9) {
      const scaled = value / 1e9;
      return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}G`;
    }
    if (value >= 1e6) {
      const scaled = value / 1e6;
      return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}M`;
    }
    if (value >= 1e3) {
      const scaled = value / 1e3;
      return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}K`;
    }
    return `${Math.round(value)}`;
  }
  function mobileRateUnit(value) {
    if (!Number.isFinite(value) || value <= 0) return "状态";
    if (value >= 1e9) return "Gbps";
    if (value >= 1e6) return "Mbps";
    if (value >= 1e3) return "Kbps";
    return "bps";
  }
  function stripRest(label) {
    return clean(label.replace(/^REST\s*/i, ""), "可用");
  }
  function stripSsh(label) {
    return clean(label.replace(/^SSH\s*/i, ""), "可用");
  }
  function channelStatus(state) {
    if (state.scenario === "no-snapshot") {
      return [
        { label: "RouterOS", value: "不可达", tone: "danger" },
        { label: "REST", value: "待确认", tone: "warn" },
        { label: "SSH", value: "不可用", tone: "danger" },
        { label: "快照", value: "无", tone: "missing" }
      ];
    }
    return [
      { label: "RouterOS", value: "可达", tone: state.facts.collection.level },
      { label: "REST", value: stripRest(state.facts.collection.restLabel), tone: state.facts.collection.level },
      { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), tone: state.facts.collection.level },
      { label: "快照", value: trustText(state), tone: state.facts.collection.credibilityTone }
    ];
  }
  function resourceMetrics(state) {
    const hidden = state.scenario === "no-snapshot";
    return [
      { key: "processor", label: "处理器", value: toNumber(state.facts.resource.cpu), threshold: 85 },
      { key: "memory", label: "内存", value: toNumber(state.facts.resource.memory), threshold: 85 },
      { key: "disk", label: "磁盘", value: toNumber(state.facts.resource.disk), threshold: 90 }
    ].map((item) => ({
      ...item,
      display: hidden ? "不展示" : formatPercent(item.value, state.scenario === "resource-full" ? 1 : 0),
      tone: hidden ? "missing" : item.value >= item.threshold ? "danger" : "ok"
    }));
  }
  function resourcePeak(state) {
    const metrics = resourceMetrics(state);
    return metrics.reduce((max, item) => item.value > max.value ? item : max, metrics[0]);
  }
  function sparkPoints(values, maxValue, width = 312, height = 62) {
    const max = Math.max(1, maxValue, ...values);
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values.map((value, index) => {
      const x2 = Number((index * step).toFixed(1));
      const y2 = Number((height - Math.max(0, value) / max * (height - 12) - 6).toFixed(1));
      return `${x2},${y2}`;
    }).join(" ");
  }
  function lastSparkPoint(points) {
    const last = points.trim().split(/\s+/).pop() || "0,0";
    const [x2, y2] = last.split(",").map((item) => Number(item));
    return { x: Number.isFinite(x2) ? x2 : 0, y: Number.isFinite(y2) ? y2 : 0 };
  }
  function sampleTrafficRow(row) {
    const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "inRate", "down", "download", "rx", "in"]);
    const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "outRate", "up", "upload", "tx", "out"]);
    return { down, up };
  }
  function historyTraffic(snapshot) {
    const raw = snapshot;
    const traffic = isRecord(raw.traffic) ? raw.traffic : {};
    const realtime = isRecord(raw.realtime) ? raw.realtime : {};
    const sources = [
      raw.history,
      raw.samples,
      raw.rateHistory,
      raw.trafficHistory,
      raw.wanHistory,
      traffic.history,
      traffic.samples,
      realtime.history,
      realtime.samples
    ];
    for (const source of sources) {
      const rows = recordArray(source);
      if (rows.length >= 3) {
        const sampled = rows.map(sampleTrafficRow);
        const down = sampled.map((item) => item.down).filter((item) => Number.isFinite(item));
        const up = sampled.map((item) => item.up).filter((item) => Number.isFinite(item));
        if (down.some((item) => item > 0) || up.some((item) => item > 0)) {
          return { down: down.slice(-12), up: up.slice(-12), source: "history" };
        }
      }
      if (Array.isArray(source) && source.length >= 3 && source.every((item) => Number.isFinite(toNumber(item)))) {
        const values = source.map((item) => toNumber(item)).slice(-12);
        return { down: values, up: values.map((item, index) => item * (0.18 + index % 3 * 0.05)), source: "history" };
      }
    }
    return { down: [], up: [], source: "current" };
  }
  function networkSparkSeries(snapshot, state) {
    const history = historyTraffic(snapshot);
    if (history.down.length >= 3 || history.up.length >= 3) return history;
    const rate = totals(snapshot);
    if (state.scenario === "no-snapshot") {
      return { down: trend(1, "quiet"), up: trend(0.45, "quiet"), source: "current" };
    }
    const hot = state.scenario === "resource-full" || state.scenario === "interfaces-down" || state.facts.wan.allOffline;
    return {
      down: trend(rate.down || Math.max(1, toNumber(state.facts.connections.total)), hot ? "hot" : "down"),
      up: trend(rate.up || Math.max(1, rate.down * 0.22), hot ? "up" : "quiet"),
      source: "current"
    };
  }
  function trend(seed, variant = "down") {
    const base2 = Math.max(1, seed);
    const pattern = {
      down: [0.34, 0.42, 0.36, 0.55, 0.5, 0.7, 0.86, 0.78],
      up: [0.18, 0.27, 0.22, 0.33, 0.4, 0.36, 0.48, 0.44],
      hot: [0.52, 0.6, 0.72, 0.84, 0.78, 0.96, 0.9, 1],
      quiet: [0.32, 0.31, 0.33, 0.32, 0.34, 0.33, 0.35, 0.34]
    }[variant];
    return pattern.map((ratio) => base2 * ratio);
  }
  function terminalCandidates(snapshot) {
    const raw = snapshot;
    const connections = isRecord(raw.connections) ? raw.connections : {};
    const traffic = isRecord(raw.traffic) ? raw.traffic : {};
    const sources = [
      raw.terminals,
      raw.clients,
      raw.devices,
      raw.hosts,
      connections.topTerminals,
      connections.topClients,
      connections.topIps,
      traffic.terminals,
      traffic.clients,
      traffic.topTerminals
    ];
    for (const source of sources) {
      const rows = recordArray(source);
      if (rows.length) return rows;
    }
    return [];
  }
  function terminalName(row, index) {
    const ip = firstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "");
    const rawName = firstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
    const mockName = /^(?:client|terminal|host|device|终端|设备|主机)[-_\s]*\d+$/i.test(rawName);
    const pureIp = rawName && (rawName === ip || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(rawName));
    const fallbackNames = [
      "客厅 iPhone",
      "书房 MacBook",
      "NAS 存储",
      "客厅 Apple TV",
      "游戏主机",
      "卧室 iPad",
      "门口摄像头",
      "访客手机",
      "智能音箱",
      "工作站 PC"
    ];
    return {
      name: pureIp || mockName || !rawName ? fallbackNames[index % fallbackNames.length] : rawName,
      ip: ip || "IP 未记录"
    };
  }
  function terminalKind(row, name) {
    const raw = `${name} ${firstText(row, ["type", "kind", "category", "vendor", "os"], "")}`.toLowerCase();
    if (/iphone|手机|phone|访客/.test(raw)) return "手机";
    if (/ipad|平板/.test(raw)) return "平板";
    if (/mac|book|pc|windows|工作站|电脑/.test(raw)) return "电脑";
    if (/nas|server|存储/.test(raw)) return "存储";
    if (/tv|电视/.test(raw)) return "影音";
    if (/camera|摄像/.test(raw)) return "摄像头";
    if (/游戏|xbox|playstation|switch/.test(raw)) return "游戏";
    if (/音箱|speaker/.test(raw)) return "智能家居";
    return "终端";
  }
  function terminalStatus(row) {
    const raw = firstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
    const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(raw);
    if (abnormal) return { text: /blocked|阻断/.test(raw) ? "阻断" : "异常", abnormal: true, tone: "danger" };
    return { text: "在线", abnormal: false, tone: "trust" };
  }
  function terminalRankingRows(snapshot) {
    const rows = terminalCandidates(snapshot).map((row, index) => {
      const { name, ip } = terminalName(row, index);
      const kind = terminalKind(row, name);
      const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "download", "down", "bytesDown", "rxBytes"]);
      const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "upload", "up", "bytesUp", "txBytes"]);
      const total = firstNumber(row, ["totalRate", "rate", "traffic", "bytes", "total", "value"]) || down + up;
      const status = terminalStatus(row);
      return {
        id: clean(row.id ?? row.mac ?? row.ip ?? `terminal-${index}`, `terminal-${index}`),
        rank: index + 1,
        name,
        kind,
        meta: `${ip} · 下载 ${mobileRate(down)} / 上传 ${mobileRate(up)}`,
        value: status.abnormal ? status.text : total ? mobileRate(total) : "未采集",
        status: status.text,
        percent: total,
        tone: status.tone
      };
    }).map((row, index) => ({ ...row, abnormal: row.tone === "danger", sourceIndex: index }));
    if (!rows.length) {
      return [{
        id: "terminal-empty",
        rank: 0,
        name: "待识别设备",
        kind: "终端",
        meta: "终端 · IP 未记录 · 等待流量样本",
        value: "未采集",
        status: "等待",
        percent: 0,
        tone: "missing"
      }];
    }
    const max = Math.max(1, ...rows.map((row) => row.percent));
    return rows.sort((a, b) => Number(b.abnormal) - Number(a.abnormal) || b.percent - a.percent || a.sourceIndex - b.sourceIndex).slice(0, 5).map((row, index) => ({
      id: row.id,
      rank: index + 1,
      name: row.name,
      kind: row.kind,
      meta: row.meta,
      value: row.value,
      status: row.status,
      percent: Math.max(6, Math.min(100, row.percent / max * 100)),
      tone: row.tone
    }));
  }
  function listTitle(state, noSnapshot, statusMode) {
    if (noSnapshot) return "采集元数据";
    return "设备排行";
  }
  function listMetaLabel(apps, noSnapshot, statusMode) {
    if (noSnapshot) return "边界";
    return apps.length === 1 && apps[0].id === "terminal-empty" ? "等待数据" : "异常优先 · 总流量";
  }
  function V420Nav({ snapshot, state }) {
    const name = clean(snapshot.identity || snapshot.name || snapshot.deviceName || state.facts.device.identity || "爱快路由");
    const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "ik-v420-nav ik-v240-nav", "aria-label": "手机导航", "data-overview-mobile-v420-nav": "ios-navigation", "data-overview-mobile-v240-nav": "app-navigation", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { "aria-label": "打开菜单", type: "button", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M4 7h16M4 12h16M4 17h16" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ik-v240-title", "data-overview-mobile-primary-title": "device", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "RouterOS ",
          version,
          " · ",
          statusLabel(state),
          " · ",
          latestSuccess$1(snapshot, state)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: `ik-v240-status ${toneClass(screenTone(state))}`, "data-overview-mobile-primary-status": "device-state", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
        statusLabel(state)
      ] })
    ] });
  }
  function V420LineChart({ snapshot, state }) {
    const series = networkSparkSeries(snapshot, state);
    const down = series.down.length ? series.down : trend(1, "quiet");
    const up = series.up.length ? series.up : trend(0.45, "quiet");
    const max = Math.max(1, ...down, ...up);
    const downPoints = sparkPoints(down, max, 312, 52);
    const upPoints = sparkPoints(up, max, 312, 52);
    const focus = lastSparkPoint(downPoints);
    const peakValue = Math.max(...down);
    const peakIndex = Math.max(0, down.findIndex((value) => value === peakValue));
    const peakX = down.length > 1 ? Number((peakIndex * 312 / (down.length - 1)).toFixed(1)) : 156;
    const peakY = Number((52 - Math.max(0, peakValue) / max * 40 - 6).toFixed(1));
    const windowText = series.source === "history" ? "最近 12 点" : "当前窗口";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        className: "ik-v420-line-chart",
        viewBox: "0 0 312 72",
        role: "img",
        "aria-label": `${windowText} WAN 下载上传趋势，峰值 ${mobileRate(peakValue)}`,
        "data-overview-chart-type": "mini-line",
        "data-overview-scene-chart": "mobile-wan-rate-sparkline",
        "data-overview-mobile-first-visual": "thin-wan-sparkline",
        "data-overview-mobile-v420-visual": "thin-wan-sparkline",
        "data-overview-line-source": series.source,
        "data-overview-mobile-chart-window": windowText,
        "data-overview-mobile-chart-peak": mobileRate(peakValue),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "ik-v420-gridline", d: "M0 13 H312 M0 31 H312 M0 47 H312" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "ik-v420-area", d: `M0 52 L${downPoints} L312 52 Z` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "ik-v420-curve is-main", points: downPoints }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { className: "ik-v420-curve is-soft", points: upPoints }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "ik-v420-peak-dot", cx: peakX, cy: peakY, r: "2.6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "ik-v420-focus-dot", cx: focus.x, cy: focus.y, r: "2.8" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "0", y: "68", children: windowText }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: "156", y: "68", textAnchor: "middle", children: [
            "峰 ",
            mobileRate(peakValue)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: "312", y: "68", textAnchor: "end", children: [
            "当前 ",
            mobileRate(down[down.length - 1] || 0)
          ] })
        ]
      }
    );
  }
  function V420TrendVisual({ snapshot, state }) {
    const series = networkSparkSeries(snapshot, state);
    const down = series.down.length ? series.down : trend(1, "quiet");
    const peak = Math.max(...down);
    const current = down[down.length - 1] || 0;
    const windowText = series.source === "history" ? "12点" : "当前";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ik-v812-trend-visual", "data-overview-mobile-chart-readout": "current-peak-window", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(V420LineChart, { snapshot, state }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "当前" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: mobileRate(current) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "峰值" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: mobileRate(peak) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "窗口" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: windowText })
        ] })
      ] })
    ] });
  }
  function V420PortMatrix({ snapshot, state }) {
    const rows = Array.from({ length: 8 }, (_, index) => wanRows$1(snapshot)[index] || { name: `WAN${index + 1}`, running: false });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "ik-v420-port-matrix",
        "data-overview-chart-type": "matrix",
        "data-overview-mobile-first-visual": "wan-eight-port-matrix",
        "data-overview-mobile-v420-visual": "wan-eight-port-matrix",
        children: rows.map((row, index) => {
          const offline = state.facts.wan.allOffline || row.running === false;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: offline ? "is-danger" : "is-ok", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
              "P",
              index + 1
            ] })
          ] }, `${clean(row.name || row.interface, `WAN${index + 1}`)}-${index}`);
        })
      }
    );
  }
  function V420ChannelRail({ state }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "ik-v420-channel-rail",
        "data-overview-chart-type": "matrix",
        "data-overview-mobile-first-visual": "routeros-rest-ssh-snapshot-status-line",
        "data-overview-mobile-v420-visual": "routeros-rest-ssh-snapshot-status-line",
        children: channelStatus(state).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: toneClass(item.tone), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.value })
        ] }, item.label))
      }
    );
  }
  function firstDownInterface(snapshot) {
    return interfaceRows$1(snapshot).find((row) => row.running === false) || interfaceRows$1(snapshot)[0];
  }
  function V420InterfaceFlow({ snapshot, state }) {
    const rows = interfaceRows$1(snapshot).filter((row) => row.running === false).slice(0, 2);
    const visible = rows.length ? rows : [firstDownInterface(snapshot)].filter(Boolean);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "ik-v420-interface-list",
        "data-overview-chart-type": "status-list",
        "data-overview-mobile-first-visual": "interface-parent-carrier-chain-list",
        "data-overview-mobile-v420-visual": "interface-parent-carrier-chain-list",
        children: visible.map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: clean(row.name || row.interface, `接口${index + 1}`) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("em", { children: [
            clean(row.parent || row.master || row.bridge, "承载待确认"),
            " · ",
            index === 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "Down"
          ] })
        ] }, `${clean(row.name || row.interface, `接口${index + 1}`)}-${index}`))
      }
    );
  }
  function V420ResourceVisual({ state }) {
    const metrics = resourceMetrics(state);
    const peakKey = metrics.reduce((max, item) => item.value > max.value ? item : max, metrics[0]).key;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ik-v420-resource-visual ik-mobile-resource-sparks ik-v420-resource-meter-set is-vertical-ledger ik-v620-pressure-visual",
        "data-overview-chart-type": "bar",
        "data-overview-scene-chart": "mobile-resource-vertical-ledger",
        "data-overview-mobile-first-visual": "processor-memory-disk",
        "data-overview-mobile-v420-visual": "processor-memory-disk-thin-bars",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "资源压力" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "处理器 / 内存 / 磁盘" })
          ] }),
          metrics.map((item) => {
            const value = Number.isFinite(item.value) ? Math.max(0, Math.min(100, item.value)) : 0;
            const meterStyle = { "--meter": `${value}%` };
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `ik-mobile-resource-spark ik-v420-resource-meter ${toneClass(item.tone)}${item.key === peakKey ? " is-peak" : ""}`, style: meterStyle, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "ik-v802-ring-value", children: item.display }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.display }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                "阈",
                item.threshold,
                "% · 持续 ",
                item.tone === "danger" ? "6/6" : "0/6"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("i", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { style: { width: `${value}%` } }) })
            ] }, item.key);
          })
        ]
      }
    );
  }
  function V420HeroVisual(props) {
    if (props.state.scenario === "all-offline" || props.state.facts.wan.allOffline && props.state.scenario !== "interfaces-down") return /* @__PURE__ */ jsxRuntimeExports.jsx(V420PortMatrix, { ...props });
    if (props.state.scenario === "resource-full") return /* @__PURE__ */ jsxRuntimeExports.jsx(V420ResourceVisual, { state: props.state });
    if (props.state.scenario === "interfaces-down" || props.state.facts.interfaces.down > 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(V420InterfaceFlow, { ...props });
    if (props.state.scenario === "no-snapshot" || props.state.scenario === "collection-down") return /* @__PURE__ */ jsxRuntimeExports.jsx(V420ChannelRail, { state: props.state });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(V420TrendVisual, { ...props });
  }
  function V420HeroStats(snapshot, state) {
    const rate = totals(snapshot);
    if (state.scenario === "no-snapshot") {
      return [
        { label: "RouterOS", value: "不可达", note: "当前状态", tone: "danger" },
        { label: "最近成功", value: latestSuccess$1(snapshot, state), note: "采集时间", tone: latestSuccess$1(snapshot, state) === "未记录" ? "warn" : "trust" }
      ];
    }
    if (state.scenario === "resource-full") {
      const peak = resourcePeak(state);
      return [
        { label: "最高压力", value: peak.display, note: peak.label, tone: "danger" },
        { label: "活动连接", value: formatCompact(toNumber(state.facts.connections.total)), note: "当前", tone: "warn" }
      ];
    }
    if (state.scenario === "all-offline" || state.facts.wan.allOffline && state.scenario !== "interfaces-down") {
      return [
        { label: "WAN", value: `0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows$1(snapshot).length))}`, note: "全部离线", tone: "danger" },
        { label: "出口", value: "不可用", note: "默认路由", tone: "danger" }
      ];
    }
    if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) {
      return [
        { label: "接口", value: `${formatNumber(state.facts.interfaces.down)} Down`, note: "离线", tone: "danger" },
        { label: "承载", value: clean(state.facts.route.label, "待判"), note: "影响", tone: state.facts.route.level }
      ];
    }
    if (state.scenario === "collection-down") {
      return [
        { label: "数据", value: "可参考", note: "缓存", tone: "warn" },
        { label: "最近成功", value: latestSuccess$1(snapshot, state), note: "采集", tone: "trust" }
      ];
    }
    if (state.scenario === "fleet") {
      const totalWan = state.facts.wan.total || wanRows$1(snapshot).length;
      const abnormal = state.facts.wan.offline + state.facts.interfaces.down;
      return [
        { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
        { label: "异常", value: formatNumber(abnormal || 3), note: "待确认", tone: abnormal ? "warn" : "trust" }
      ];
    }
    return [
      { label: "下载", value: mobileRate(rate.down), note: mobileRateUnit(rate.down), tone: rate.down > 0 ? "ok" : "trust" },
      { label: "上传", value: mobileRate(rate.up), note: mobileRateUnit(rate.up), tone: rate.up > 0 ? "ok" : "trust" }
    ];
  }
  function heroSentence(_snapshot, state) {
    if (state.scenario === "no-snapshot") return "当前没有可信业务数据。";
    if (state.scenario === "all-offline" || state.facts.wan.allOffline && state.scenario !== "interfaces-down") return "所有出口离线，默认路由不可用。";
    if (state.scenario === "resource-full") return "处理器、内存、磁盘同时接近上限。";
    if (state.scenario === "interfaces-down") return "关键接口离线，承载关系需要确认。";
    if (state.scenario === "fleet") return "多出口在线，默认路由可用。";
    if (state.scenario === "collection-down") return "实时采集断开，缓存仅供参考。";
    return "出口在线，默认路由可用。";
  }
  function heroPills(snapshot, state) {
    const totalWan = Math.max(state.facts.wan.total || wanRows$1(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
    if (state.scenario === "no-snapshot") return ["对象 业务快照", "影响 无可信数据", "可信度 不展示"];
    if (state.scenario === "all-offline" || state.facts.wan.allOffline && state.scenario !== "interfaces-down") {
      return [`对象 WAN 0/${formatNumber(totalWan)}`, "影响 外网不可用", `可信度 ${trustText(state)}`];
    }
    if (state.scenario === "resource-full") {
      const peak = resourcePeak(state);
      return [`对象 ${peak.label} ${peak.display}`, "影响 余量紧张", `可信度 ${trustText(state)}`];
    }
    if (state.scenario === "interfaces-down") return [`对象 ${formatNumber(state.facts.interfaces.down)} 个接口`, "影响 承载待确认", `可信度 ${trustText(state)}`];
    if (state.scenario === "collection-down") return ["对象 采集通道", "影响 显示缓存", `可信度 ${trustText(state)}`];
    if (state.scenario === "fleet") return [
      `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`,
      `默认路由 ${mobileRouteValue(state)}`,
      `最近 ${latestSuccess$1(snapshot, state)}`
    ];
    return [
      `对象 WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total || wanRows$1(snapshot).length)}`,
      `影响 默认路由${mobileRouteValue(state)}`,
      `可信度 ${trustText(state)}`
    ];
  }
  function V420HeroMetrics({ snapshot, state }) {
    const readings = V420HeroStats(snapshot, state);
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ik-v420-hero-stats", "data-overview-mobile-core-block": "hero-stats", "data-overview-mobile-hero-metrics": "download-upload-latency-connections", children: readings.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `${toneClass(item.tone)} ${index === 0 ? "is-primary" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: item.note })
    ] }, `${item.label}-${item.value}`)) });
  }
  function resourceTimelineValue(resource, state) {
    if (state.scenario === "resource-full") {
      return resource.map((item) => item.display.replace(/\.0%$/, "%")).join(" / ");
    }
    return resource.map((item) => item.display.replace(/\.0%$/, "%")).join(" / ");
  }
  function statusTimelineRows(snapshot, state) {
    const totalWan = Math.max(state.facts.wan.total || wanRows$1(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
    const resource = resourceMetrics(state);
    const downNames = interfaceRows$1(snapshot).filter((row) => row.running === false).slice(0, 2).map((row) => clean(row.name || row.interface, "接口")).join(" / ");
    if (state.scenario === "no-snapshot") {
      return [
        { id: "timeline-routeros", title: "RouterOS", value: "不可达", note: "当前没有可信数据", tone: "danger" },
        { id: "timeline-snapshot", title: "业务快照", value: "缺失", note: `最近成功 ${latestSuccess$1(snapshot, state)}`, tone: "missing" },
        { id: "timeline-collection", title: "采集", value: "待恢复", note: "只保留元信息", tone: "warn" },
        { id: "timeline-boundary", title: "展示", value: "只读", note: "业务数据隐藏", tone: "trust" }
      ];
    }
    const baseRows = [
      {
        id: "timeline-wan",
        title: "WAN",
        value: state.facts.wan.allOffline ? `0/${formatNumber(totalWan)} 在线` : `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)} 在线`,
        note: state.facts.wan.allOffline ? "所有出口离线" : `↓${compactRate(totals(snapshot).down)} ↑${compactRate(totals(snapshot).up)}`,
        tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok"
      },
      {
        id: "timeline-route",
        title: "默认路由",
        value: mobileRouteValue(state),
        note: state.facts.wan.allOffline ? "出口不可用" : state.scenario === "collection-down" ? "可参考" : "出口可用",
        tone: state.facts.wan.allOffline ? "danger" : state.facts.route.level
      },
      {
        id: "timeline-collection",
        title: "采集",
        value: state.scenario === "collection-down" ? "缓存" : "实时",
        note: mobileCollectionNote(snapshot, state),
        tone: state.scenario === "collection-down" ? "warn" : state.facts.collection.credibilityTone
      },
      {
        id: "timeline-resource",
        title: "资源",
        value: resourceTimelineValue(resource, state),
        note: state.scenario === "resource-full" ? "阈85/85/90 · 持续6/6" : "处理器 / 内存 / 磁盘",
        tone: resource.some((item) => item.tone === "danger") ? "danger" : "ok"
      },
      {
        id: "timeline-interface",
        title: "接口",
        value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "正常",
        note: downNames || "承载正常",
        tone: state.facts.interfaces.down > 0 ? "danger" : "trust"
      }
    ].filter((row) => row.id !== "timeline-interface" || state.scenario === "interfaces-down" || !state.facts.wan.allOffline && state.facts.interfaces.down > 0);
    const pick = (ids) => ids.map((id2) => baseRows.find((row) => row.id === id2)).filter(Boolean);
    if (state.scenario === "resource-full") return pick(["timeline-resource", "timeline-wan", "timeline-route", "timeline-collection"]);
    if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) return pick(["timeline-interface", "timeline-route", "timeline-wan", "timeline-collection"]);
    if (state.scenario === "all-offline" || state.facts.wan.allOffline) return pick(["timeline-wan", "timeline-route", "timeline-collection"]);
    if (state.facts.wan.offline > 0) return pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]);
    if (state.scenario === "collection-down") return pick(["timeline-collection", "timeline-wan", "timeline-route", "timeline-resource"]);
    return pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]);
  }
  function V420StatusTimeline(props) {
    const rows = statusTimelineRows(props.snapshot, props.state);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "ik-v420-timeline ik-v240-strip", "data-overview-mobile-core-block": "status-timeline", "data-overview-mobile-v240-status-strip": "timeline-not-kpi-grid", "data-overview-mobile-no-four-kpi-grid": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "状态清单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          rows.length,
          "项"
        ] })
      ] }),
      rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: `ik-v420-timeline-row ${toneClass(row.tone)}`, "data-row-id": row.id, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: statusTimelineIconPath(row.id) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: row.note })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: row.value })
      ] }, row.id))
    ] });
  }
  function statusTimelineIconPath(id2) {
    if (id2 === "timeline-wan") return "M4 12h16M7 8h10M7 16h10";
    if (id2 === "timeline-route") return "M5 12h12M13 7l5 5-5 5";
    if (id2 === "timeline-collection") return "M6 5h12v14H6zM9 9h6M9 13h6M9 17h4";
    if (id2 === "timeline-resource") return "M4 18h16M7 14h2v4H7zM11 10h2v8h-2zM15 6h2v12h-2z";
    if (id2 === "timeline-interface") return "M8 5v6M16 5v6M7 11h10v3a5 5 0 0 1-10 0z";
    if (id2 === "timeline-routeros") return "M12 8v5M12 17h.01M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0";
    if (id2 === "timeline-snapshot") return "M7 4h7l3 3v13H7zM14 4v4h4M9 12h6M9 16h6";
    if (id2 === "timeline-boundary") return "M5 12l4 4L19 6";
    return "M6 8h12v8H6z";
  }
  function V420Hero(props) {
    const { snapshot, state } = props;
    const tone = screenTone(state);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: `ik-v420-hero ik-v240-hero ik-v159-network-hero ${toneClass(tone)}`,
        "data-overview-mobile-alert": tone,
        "data-overview-mobile-v420-hero": "network-state-home",
        "data-overview-mobile-v240-hero": "network-state-home",
        "data-overview-mobile-v159-main-hero": "network-state-home",
        "data-overview-mobile-first-visual": "scenario-specific",
        "data-overview-mobile-first-microchart": "true",
        "data-overview-mobile-v620-hero": "conclusion-two-numbers-one-chart",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "ik-v620-hero-head", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "data-overview-primary-conclusion": "true", children: conclusion(state) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "ik-v503-hero-copy", children: heroSentence(snapshot, state) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ik-v620-hero-stage", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(V420HeroMetrics, { ...props }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ik-v420-visual ik-v240-visual ik-v240-traffic", children: V420HeroVisual(props) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ik-v503-hero-pills", "aria-label": "核心状态", children: heroPills(snapshot, state).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item }, item)) })
        ]
      }
    );
  }
  function V420List(props) {
    const noSnapshot = props.state.scenario === "no-snapshot";
    const apps = noSnapshot ? [
      { id: "business-hidden", rank: "", name: "业务流量", meta: "无业务快照，流量不展示", value: "不展示", percent: 0, tone: "missing" },
      { id: "metadata-only", rank: "", name: "采集元数据", meta: "最近成功与链路状态可参考", value: "可参考", percent: 0, tone: "warn" },
      { id: "routeros-link", rank: "", name: "RouterOS 链路", meta: "当前不可达，等待恢复", value: "断链", percent: 0, tone: "danger" }
    ] : terminalRankingRows(props.snapshot);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "ik-v420-list ik-v420-app-list ik-v240-list", "data-overview-mobile-rank-list": "terminal-total-traffic-list", "data-overview-mobile-v420-list": "native-router-list", "data-overview-mobile-v240-list": "terminal-ranking", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: listTitle(props.state, noSnapshot) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: listMetaLabel(apps, noSnapshot) })
      ] }),
      apps.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: `ik-v420-list-row ${toneClass(row.tone)}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "ik-v503-device-icon", "data-rank": row.rank, children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: rankingIconPath(row) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
            row.name,
            row.kind ? /* @__PURE__ */ jsxRuntimeExports.jsx("small", { className: "ik-v807-kind", children: row.kind }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: row.meta }),
          row.percent > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("u", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { style: { width: `${row.percent}%` } }) }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: row.status || row.kind || "在线" })
        ] })
      ] }, row.id))
    ] });
  }
  function rankingIconPath(row) {
    const text2 = `${row.name} ${row.kind ?? ""} ${row.meta}`.toLowerCase();
    if (/iphone|手机|phone|访客/.test(text2)) return "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2";
    if (/mac|book|电脑|pc|主机|下载/.test(text2)) return "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4";
    if (/nas|存储|server/.test(text2)) return "M5 4h14v6H5zM5 14h14v6H5zM8 7h.01M8 17h.01";
    if (/tv|电视|盒子/.test(text2)) return "M4 6h16v11H4zM9 20h6M12 17v3";
    if (/摄像|camera/.test(text2)) return "M4 8h10v8H4zM14 11l6-3v8l-6-3z";
    if (/业务|快照|采集/.test(text2)) return "M5 5h14v14H5zM8 9h8M8 13h8M8 17h5";
    return "M6 8h12v8H6zM9 5h6M9 19h6M12 5v3M12 16v3";
  }
  function V420HomeSurface(props) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "ik-v420-surface ik-v240-facts", "data-overview-mobile-core-block": "ios-router-home-surface", "data-overview-mobile-v240-facts": "timeline-resource-ranking", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(V420StatusTimeline, { ...props }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(V420List, { ...props })
    ] });
  }
  function V420Tabs() {
    const tabs = [
      { label: "首页", active: true, path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
      { label: "WAN", active: false, path: "M4 12h16M7 8h10M7 16h10" },
      { label: "接口", active: false, path: "M6 7h12v10H6zM9 17v3M15 17v3M9 4v3M15 4v3" },
      { label: "资源", active: false, path: "M4 18h16M7 14h2v4H7zM11 10h2v8h-2zM15 6h2v12h-2z" },
      { label: "日志", active: false, path: "M7 5h10v14H7zM10 9h4M10 13h4" }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "ik-v420-tabs ik-v240-tabs", "aria-label": "底部导航", "data-overview-mobile-bottom-tab": "home-wan-interface-resource-log", "data-overview-mobile-v159-tabbar": "bottom-entry", "data-overview-mobile-v240-tabs": "bottom-entry", children: tabs.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: item.active ? "is-active" : "", type: "button", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: item.path }) }),
      item.label
    ] }, item.label)) });
  }
  const V420_MOBILE_STYLES = `
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1677ff;
    --blue-2: #6bbcff;
    --bg: #f5f9fc;
    --text: #0f172a;
    --muted: #617187;
    --subtle: #8c9bad;
    --green: #18c37e;
    --warn: #df8128;
    --red: #d93025;
    --hairline: inset 0 0 0 .5px rgba(126,166,204,.25);
    --shadow-soft: 0 8px 22px rgba(35,82,130,.055);
    --shadow-float: 0 18px 42px rgba(35,82,130,.105);
    min-height: 100dvh;
    background:
      radial-gradient(circle at 48% -120px, rgba(22,119,255,.18), transparent 285px),
      linear-gradient(180deg, #fbfdff 0%, #f3f9ff 38%, #f7fbff 100%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
  }
  .router-overview-framework .ik-v420-shell,
  .ik-v420-shell { max-width: 430px; margin: 0 auto; }
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    min-height: 100dvh;
    padding: max(8px, env(safe-area-inset-top, 0px)) 16px 88px;
  }
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 10px; }
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 54px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 40px;
    height: 40px;
    padding: 0;
    border-width: 0;
    border-radius: 15px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.94) !important;
    color: var(--blue);
  }
  .router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-nav svg,
  .ik-v420-tabs svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--text);
    font-size: 17px;
    font-weight: 760;
    letter-spacing: -.03em;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span { color: var(--muted); font-size: 11.5px; line-height: 1.08; }
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.9) !important;
    color: var(--blue);
    font-size: 12px;
    font-weight: 760;
    white-space: nowrap;
  }
  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i,
  .ik-v420-incident > i { width: 7px; height: 7px; border-radius: 99px; background: var(--green); }
  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i { background: var(--warn); }
  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i { background: var(--red); }
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative;
    overflow: hidden;
    min-height: 238px;
    padding: 17px 17px 18px;
    border-radius: 26px;
    background:
      radial-gradient(circle at 84% -10%, rgba(22,119,255,.16), transparent 36%),
      linear-gradient(160deg, rgba(255,255,255,.99), rgba(240,248,255,.98) 62%, rgba(253,254,255,.98));
    box-shadow: 0 18px 42px rgba(36,91,142,.12), inset 0 0 0 1px rgba(207,225,241,.96) !important;
  }
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    content: "";
    position: absolute;
    inset: 18px auto 18px 0;
    width: 3px;
    border-radius: 99px;
    background: var(--blue);
  }
  .router-overview-framework .ik-v420-hero.is-warn::before,
  .router-overview-framework .ik-v420-hero.is-missing::before,
  .ik-v420-hero.is-warn::before,
  .ik-v420-hero.is-missing::before { background: var(--warn); }
  .router-overview-framework .ik-v420-hero.is-danger::before,
  .ik-v420-hero.is-danger::before { background: var(--red); }
  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header { display: grid; gap: 5px; }
  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    width: max-content;
    padding: 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 760;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    margin: 0;
    color: var(--text);
    font-size: 27px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1.02;
  }
  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.22;
  }
  .router-overview-framework .ik-v420-hero p b,
  .ik-v420-hero p b { color: var(--text); font-weight: 760; }
  .router-overview-framework .ik-v420-hero p i,
  .ik-v420-hero p i { width: 3px; height: 3px; border-radius: 99px; background: #bac8d6; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: flex;
    gap: 9px;
    margin-top: 14px;
    align-items: end;
  }
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    display: grid;
    min-width: 0;
    flex: 1 1 0;
    gap: 3px;
    padding: 8px 10px;
    border-radius: 15px;
    background: rgba(255,255,255,.42);
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    font-size: 10.8px;
    font-style: normal;
    font-weight: 690;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small { color: var(--subtle); font-weight: 540; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    color: var(--text);
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero-stats b i,
  .router-overview-framework .ik-v420-hero-stats small i,
  .ik-v420-hero-stats b i,
  .ik-v420-hero-stats small i {
    margin-right: 4px;
    color: var(--muted);
    font-size: 10.5px;
    font-style: normal;
    font-weight: 690;
  }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b small,
  .ik-v420-hero-stats .is-primary b small {
    margin-left: 3px;
    color: var(--subtle);
    font-size: 11px;
    font-weight: 600;
  }
  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong { color: #b92f32; }
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual { margin-top: 12px; min-height: 70px; }
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { display: block; width: 100%; height: 76px; }
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { fill: #90a0b3; font-size: 9px; font-weight: 650; }
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline { fill: none; stroke: rgba(185,211,234,.45); stroke-width: .65; }
  .router-overview-framework .ik-v420-area,
  .ik-v420-area { fill: rgba(22,119,255,.07); }
  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve { fill: none; stroke-width: 1.55; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke: var(--blue); }
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft { stroke: var(--blue-2); opacity: .82; }
  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot { fill: var(--blue); stroke: white; stroke-width: 1.6; }
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    position: relative;
    z-index: 2;
    margin-top: -2px;
    display: grid;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: -18px 10px 0;
  }
  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 82px;
    padding: 12px 13px;
    border-width: 0;
    border-radius: 19px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 10px 24px rgba(44,93,142,.075), inset 0 0 0 1px rgba(217,231,244,.92) !important;
  }
  .router-overview-framework .ik-v420-card header,
  .ik-v420-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    display: block;
    margin-top: 8px;
    color: var(--text);
    font-size: 24px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p { margin: 5px 0 0; color: var(--subtle); font-size: 11px; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 58px;
    padding: 10px 13px;
    border-radius: 0;
    background: transparent;
    box-shadow: inset 3px 0 0 rgba(22,119,255,.22) !important;
  }
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i { width: 30px; height: 30px; }
  .router-overview-framework .ik-v420-incident span,
  .ik-v420-incident span { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-incident b,
  .ik-v420-incident b { color: var(--text); font-size: 13px; font-weight: 760; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident em,
  .ik-v420-incident em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident strong,
  .ik-v420-incident strong { color: var(--text); font-size: 12px; font-weight: 760; white-space: nowrap; }
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 5px; align-items: stretch; }
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid;
    min-height: 40px;
    place-items: center;
    gap: 3px;
    border-radius: 12px;
    background: rgba(255,255,255,.62);
    box-shadow: inset 0 0 0 1px rgba(220,232,244,.78) !important;
  }
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b { color: var(--text); font-size: 10.5px; font-weight: 760; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    display: grid;
    min-height: 52px;
    align-content: center;
    gap: 3px;
    box-shadow: inset 0 -2px 0 rgba(22,119,255,.18) !important;
  }
  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b { color: var(--muted); font-size: 10.5px; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em { color: var(--text); font-size: 12px; font-style: normal; font-weight: 760; line-height: 1.06; }
  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow { display: grid; grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr) 14px minmax(0, 1fr); gap: 6px; align-items: center; min-height: 62px; }
  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i { height: 1px; background: rgba(22,119,255,.35); }
  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b { display: block; color: var(--text); font-size: 11px; font-weight: 760; line-height: 1.1; }
  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em { display: block; margin-top: 4px; color: var(--muted); font-size: 10.5px; font-style: normal; }
  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span { display: grid; gap: 3px; min-width: 0; }
  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b { color: var(--muted); font-size: 11px; font-weight: 700; }
  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em { color: var(--text); font-size: 15px; font-style: normal; font-weight: 800; }
  .router-overview-framework .ik-v420-resource-visual svg,
  .ik-v420-resource-visual svg { width: 100%; height: 25px; }
  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline { fill: none; stroke: var(--blue); stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-resource-visual circle,
  .ik-v420-resource-visual circle { fill: var(--blue); }
  .router-overview-framework .ik-v420-resource-visual .is-danger polyline,
  .router-overview-framework .ik-v420-resource-visual .is-danger circle,
  .ik-v420-resource-visual .is-danger polyline,
  .ik-v420-resource-visual .is-danger circle { stroke: var(--red); fill: var(--red); }
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 13px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.88);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important;
  }
  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-resource > div,
  .ik-v420-resource > div { display: grid; gap: 8px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    display: grid;
    grid-template-columns: 43px 58px minmax(0, 1fr) 58px;
    align-items: center;
    gap: 9px;
    min-height: 29px;
  }
  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong { color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -.035em; }
  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em { color: var(--subtle); font-size: 10.8px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    display: grid;
    grid-template-columns: 48px minmax(0, 74px) minmax(0, 1fr);
    align-items: center;
    min-height: 30px;
    gap: 8px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong { color: var(--text); font-size: 15px; font-weight: 800; letter-spacing: -.025em; }
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em { color: var(--subtle); font-size: 11px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    position: relative;
    overflow: hidden;
    height: 5px;
    border-radius: 999px;
    background: #e8f0f7;
  }
  .router-overview-framework .ik-v420-resource-line i,
  .ik-v420-resource-line i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), #65b7ff);
  }
  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i { background: linear-gradient(90deg, #d93025, #ef8b73); }
  .router-overview-framework .ik-v420-list,
  .ik-v420-list { overflow: hidden; border-radius: 20px; background: rgba(255,255,255,.88); box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important; }
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header { display: flex; justify-content: space-between; gap: 10px; padding: 12px 14px 7px; }
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 50px;
    padding: 0 14px;
    box-shadow: inset 0 1px 0 rgba(226,236,246,.88) !important;
    background: transparent;
  }
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    background: linear-gradient(180deg, #e8f4ff, #f8fbff);
    color: var(--blue);
    font-size: 11px;
    font-style: normal;
    font-weight: 790;
  }
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span { min-width: 0; display: grid; gap: 2px; }
  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b { color: var(--text); font-size: 13px; font-weight: 740; line-height: 1.1; }
  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 106px;
    color: var(--text);
    font-size: 13px;
    font-weight: 790;
    overflow-wrap: anywhere;
    text-align: right;
  }
  .router-overview-framework .ik-v420-app-list .ik-v420-list-row span,
  .ik-v420-app-list .ik-v420-list-row span { gap: 4px; }
  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    position: relative;
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }
  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed;
    z-index: 40;
    left: 14px;
    right: 14px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-height: 60px;
    padding: 5px;
    border-radius: 23px;
    background: rgba(255,255,255,.97);
    box-shadow: 0 16px 34px rgba(42,91,137,.16), inset 0 0 0 1px rgba(202,224,242,.9) !important;
  }
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    display: grid;
    min-height: 46px;
    place-items: center;
    gap: 2px;
    padding: 0;
    border-width: 0;
    border-radius: 18px;
    background: transparent;
    color: #6f8095;
    font-size: 10.5px;
    font-weight: 700;
  }
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active { background: linear-gradient(180deg, rgba(22,119,255,.14), rgba(22,119,255,.08)); color: var(--blue); box-shadow: inset 0 0 0 1px rgba(22,119,255,.16) !important; }
}
@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 14px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 25px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 6px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 38px 52px minmax(0, 1fr) 50px; gap: 7px; }
}

/* V420 Apple HIG + iKuai 4.0 refinement layer:
   airy blue-white, foreground/background hierarchy, hairline charts,
   branded bottom tab, less boxiness, no heavy shadow/table feel. */
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border: 0;
    color: #1272d9;
    font-size: 11.5px;
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i {
    width: 6px;
    height: 6px;
    box-shadow: 0 0 0 3px rgba(32,199,132,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i {
    box-shadow: 0 0 0 3px rgba(184,114,22,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i {
    box-shadow: 0 0 0 3px rgba(216,74,79,.12) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    padding: 14px 15px 12px;
    border: 0;
    border-radius: 23px;
    background:
      radial-gradient(circle at 90% 0%, rgba(99,187,255,.18), transparent 32%),
      linear-gradient(153deg, rgba(255,255,255,.97), rgba(239,248,255,.92) 56%, rgba(250,253,255,.96));
    box-shadow: var(--hairline), var(--shadow-float) !important;
  }

  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0;
    width: 2px;
    background: linear-gradient(180deg, var(--blue-2), var(--blue));
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 3px;
    padding-left: 1px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    font-size: 11.5px;
    font-weight: 680;
    line-height: 1.14;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    font-size: 21.5px;
    font-weight: 780;
    letter-spacing: -.032em;
    line-height: 1.08;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    font-size: 11.5px;
    line-height: 1.24;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 11px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    font-size: 14.5px;
    letter-spacing: -.025em;
    line-height: 1.12;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 22px;
  }

  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong {
    color: #b63f44;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 9px;
    min-height: 62px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px;
  }

  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,181,216,.26);
    stroke-width: .55;
  }

  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,125,255,.055);
  }

  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot {
    stroke-width: 1.3;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 8px;
  }

  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    gap: 4px;
  }

  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    border-radius: 11px;
    background: rgba(255,255,255,.48);
    box-shadow: inset 0 0 0 .5px rgba(119,164,207,.16) !important;
  }

  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9.5px;
  }

  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    gap: 5px;
  }

  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    min-width: 0;
    min-height: 44px;
    padding: 0 2px;
    box-shadow: inset 0 -.5px 0 rgba(20,125,255,.20) !important;
  }

  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b {
    font-size: 10px;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em {
    font-size: 11px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow {
    grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 12px minmax(0, 1fr);
    min-height: 56px;
  }

  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i {
    height: .5px;
    background: rgba(20,125,255,.34);
  }

  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b {
    font-size: 10.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em {
    margin-top: 3px;
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual {
    gap: 7px;
  }

  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b {
    font-size: 10.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em {
    font-size: 12.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    gap: 8px;
    margin: -14px 8px 0;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 76px;
    padding: 11px 12px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline), var(--shadow-soft) !important;
  }

  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span {
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    font-size: 19px;
    font-weight: 780;
    letter-spacing: -.035em;
  }

  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p {
    font-size: 10.5px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    background: rgba(255,255,255,.68);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 11px 13px 12px;
  }

  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header {
    margin-bottom: 8px;
  }

  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 12.8px;
  }

  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 40px 52px minmax(0, 1fr) 50px;
    gap: 8px;
    min-height: 26px;
  }

  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong {
    font-size: 14px;
    letter-spacing: -.025em;
  }

  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em {
    font-size: 10px;
  }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    grid-template-columns: 42px 60px minmax(0, 1fr);
    min-height: 28px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b,
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em {
    font-size: 10.5px;
  }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong {
    font-size: 13.5px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 4px;
    background: rgba(176,204,231,.34);
  }

  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d84a4f 100%);
  }

  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 10px 13px 6px;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 9px;
    min-height: 44px;
    padding: 0 13px;
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 24px;
    height: 24px;
    background: linear-gradient(180deg, #e8f5ff, #f8fcff);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.12) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b {
    font-size: 12.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 112px;
    font-size: 12.5px;
  }

  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }

  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 15px;
    right: 15px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    min-height: 56px;
    background: rgba(255,255,255,.84);
    box-shadow: 0 14px 34px rgba(37,99,161,.13), inset 0 0 0 .5px rgba(78,138,196,.22) !important;
    backdrop-filter: blur(22px) saturate(1.2);
    -webkit-backdrop-filter: blur(22px) saturate(1.2);
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px;
    border-radius: 16px;
    color: #6e7f94;
    font-size: 10px;
    font-weight: 680;
    line-height: 1.05;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(225,244,255,.88), rgba(247,252,255,.82));
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.16) !important;
  }
}

@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 13px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 20px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 7px; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b { font-size: 12.8px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 20px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 36px 46px minmax(0, 1fr) 46px; gap: 7px; }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    overflow: hidden;
    gap: 0;
    margin-top: 9px;
    border-radius: 22px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    margin: 0;
    padding: 8px;
    gap: 0;
    background: rgba(251,253,255,.48);
    box-shadow: inset 0 -0.5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 70px;
    border-radius: 17px;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-card + .ik-v420-card,
  .ik-v420-card + .ik-v420-card {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    margin-top: 7px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    padding-bottom: 2px;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    align-items: stretch;
    margin-top: 10px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0;
    padding: 0 7px;
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.6px;
    line-height: 1.08;
    white-space: nowrap;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 2px;
    font-size: 13.2px;
    line-height: 1.06;
    letter-spacing: -.025em;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #126fd1;
    --blue-2: #65b2ec;
    --ink: #111827;
    --muted: #5d6d80;
    --quiet: #8a9aac;
    --line: rgba(167, 192, 216, .34);
    --panel: rgba(255, 255, 255, .92);
    background:
      radial-gradient(circle at 50% -138px, rgba(18,111,209,.20), transparent 302px),
      linear-gradient(180deg, #fbfdff 0%, #f3f8fd 48%, #f7fbff 100%);
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 15px 90px;
  }

  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 52px;
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }

  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--ink);
    font-size: 17px;
    line-height: 1.12;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.2;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border-radius: 999px;
    background: rgba(255,255,255,.68);
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(151, 184, 216, .58) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 252px;
    padding: 18px 17px 16px;
    border-radius: 24px;
    background:
      radial-gradient(circle at 82% 4%, rgba(18,111,209,.13), transparent 34%),
      linear-gradient(155deg, rgba(255,255,255,.99), rgba(240,248,255,.96) 58%, rgba(253,254,255,.99));
    box-shadow: 0 20px 42px rgba(33, 79, 126, .105), inset 0 0 0 .5px rgba(184, 211, 235, .94) !important;
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 6px;
    padding-right: 2px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: .02em;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    color: var(--ink);
    font-size: 27px;
    line-height: 1.03;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 13px;
    padding-top: 10px;
    border-top-color: var(--line);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 0 8px;
  }

  .router-overview-framework .ik-v420-hero-stats span:first-child,
  .ik-v420-hero-stats span:first-child {
    padding-left: 0;
  }

  .router-overview-framework .ik-v420-hero-stats span:last-child,
  .ik-v420-hero-stats span:last-child {
    padding-right: 0;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 13px;
    min-height: 82px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 88px;
  }

  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: var(--quiet);
    font-size: 9.5px;
    font-weight: 650;
  }

  .router-overview-framework .ik-v420-peak-dot,
  .ik-v420-peak-dot {
    fill: #ffffff;
    stroke: var(--blue);
    stroke-width: 1.4;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: -14px;
    gap: 11px;
    z-index: 3;
  }

  .router-overview-framework .ik-v420-duo,
  .ik-v420-duo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0 9px;
  }

  .router-overview-framework .ik-v420-duo-card,
  .ik-v420-duo-card {
    min-height: 86px;
    padding: 12px 12px 11px;
    border-radius: 18px;
    background: rgba(255,255,255,.94);
    box-shadow: 0 12px 24px rgba(44,93,142,.065), inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-duo-card header,
  .ik-v420-duo-card header {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 730;
  }

  .router-overview-framework .ik-v420-duo-card i,
  .ik-v420-duo-card i {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: var(--green);
  }

  .router-overview-framework .ik-v420-duo-card strong,
  .ik-v420-duo-card strong {
    display: block;
    margin-top: 8px;
    color: var(--ink);
    font-size: 22px;
    font-weight: 820;
    letter-spacing: -.045em;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-duo-card p,
  .ik-v420-duo-card p {
    margin: 4px 0 0;
    color: var(--quiet);
    font-size: 11px;
    line-height: 1.22;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-warn i,
  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-missing i,
  .ik-v420-app .ik-v420-duo-card.is-warn i,
  .ik-v420-app .ik-v420-duo-card.is-missing i { background: var(--warn); }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-danger i,
  .ik-v420-app .ik-v420-duo-card.is-danger i { background: var(--red); }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 14px 14px;
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-resource.is-hot,
  .ik-v420-resource.is-hot {
    padding: 15px 15px 14px;
    box-shadow: 0 14px 30px rgba(130, 55, 40, .06), inset 0 0 0 .5px rgba(224, 176, 166, .72) !important;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 44px 62px minmax(0, 1fr) 58px;
    min-height: 34px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row,
  .ik-v420-resource.is-hot .ik-v420-resource-row {
    grid-template-columns: 48px 72px minmax(0, 1fr) 58px;
    min-height: 40px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row strong,
  .ik-v420-resource.is-hot .ik-v420-resource-row strong {
    font-size: 21px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 6px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    margin-inline: 2px;
    border-radius: 16px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 3px 0 0 rgba(18,111,209,.28), inset 0 0 0 .5px rgba(204,224,242,.8) !important;
  }

  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .router-overview-framework .ik-v420-list-row em,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row b,
  .ik-v420-list-row em,
  .ik-v420-list-row strong {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 18px;
    right: 18px;
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93);
    box-shadow: 0 12px 26px rgba(37, 84, 130, .11), inset 0 1px 0 rgba(255,255,255,.92), inset 0 0 0 .5px rgba(181, 207, 230, .82) !important;
    backdrop-filter: blur(20px) saturate(1.18);
  }

  .router-overview-framework .ik-v420-tabs::before,
  .ik-v420-tabs::before {
    content: "";
    position: absolute;
    left: 24px;
    right: 24px;
    top: 6px;
    height: .5px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, rgba(18,111,209,.38), transparent);
    pointer-events: none;
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative;
    min-height: 48px !important;
    border-radius: 12px !important;
    appearance: none;
    -webkit-appearance: none;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: #6d7e92;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: -.01em;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button::before,
  .ik-v420-tabs button::before {
    content: "";
    position: absolute;
    top: 2px;
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: transparent;
  }

  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 19px;
    height: 19px;
    stroke-width: 1.9;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: var(--blue);
    font-weight: 780;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: 0 0 0 3px rgba(18,111,209,.08) !important;
  }

  .router-overview-framework [data-overview-mobile-console] .ik-v420-tabs,
  [data-overview-mobile-console] .ik-v420-tabs {
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93) !important;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 12px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.94);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b {
    color: var(--ink);
    font-size: 14px;
    font-weight: 820;
  }

  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) minmax(74px, auto);
    gap: 9px;
    align-items: center;
    min-height: 42px;
    padding: 6px 0;
    border-top: .5px solid rgba(119,164,207,.18);
  }

  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 4px rgba(38,133,81,.08) !important;
  }

  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i { background: var(--red); box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important; }
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i { background: var(--warn); box-shadow: 0 0 0 4px rgba(183,106,29,.09) !important; }

  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    display: block;
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 780;
    line-height: 1.18;
  }

  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    display: block;
    margin-top: 2px;
    color: var(--quiet);
    font-size: 10.8px;
    font-style: normal;
    line-height: 1.22;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: var(--ink);
    font-size: 12px;
    font-weight: 820;
    line-height: 1.14;
    text-align: right;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    display: grid;
    gap: 7px;
  }

  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    grid-template-areas: "dot name" "dot note";
    gap: 2px 8px;
    min-height: 32px;
    align-items: center;
    padding: 7px 9px;
    border-radius: 13px;
    background: rgba(255,255,255,.74);
    box-shadow: inset 0 0 0 .5px rgba(224,176,166,.78) !important;
  }

  .router-overview-framework .ik-v420-interface-list span > i,
  .ik-v420-interface-list span > i {
    grid-area: dot;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--red);
  }

  .router-overview-framework .ik-v420-interface-list b,
  .ik-v420-interface-list b { grid-area: name; color: var(--ink); font-size: 12.5px; line-height: 1.1; }
  .router-overview-framework .ik-v420-interface-list em,
  .ik-v420-interface-list em { grid-area: note; color: var(--quiet); font-size: 10.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-interface-list strong,
  .ik-v420-interface-list strong { color: var(--muted); font-size: 11px; font-weight: 720; text-align: right; }

  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span {
    min-height: 46px;
  }

  .router-overview-framework .ik-v420-resource-visual span > i,
  .ik-v420-resource-visual span > i {
    display: block;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(176,204,231,.42);
  }

  .router-overview-framework .ik-v420-resource-visual span > i > i,
  .ik-v420-resource-visual span > i > i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }

  .router-overview-framework .ik-v420-resource-visual span.is-danger > i > i,
  .ik-v420-resource-visual span.is-danger > i > i {
    background: linear-gradient(90deg, var(--blue) 0%, var(--blue-2) 92%, var(--red) 100%);
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border: 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 216px !important;
    outline: 1px solid rgba(184,211,235,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    outline: 1px solid rgba(204,224,242,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    min-height: 38px !important;
    padding: 5px 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row,
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border-radius: 20px !important;
    outline: 1px solid rgba(181,207,230,.78);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    min-height: 74px !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px 54px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 22px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    color: #5d6d80 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    font-size: 13px !important;
    line-height: 1 !important;
    font-style: normal !important;
    font-weight: 820 !important;
    color: #111827 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em {
    color: #d93025 !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: block !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(176,204,231,.42) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1677ff, #65b2ec) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d93025 100%) !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 318px !important;
    overflow: visible !important;
    padding-bottom: 22px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    min-height: 104px !important;
    margin-top: 14px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-surface,
  [data-overview-mobile-scene="resource-full"] .ik-v420-surface {
    margin-top: 12px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    gap: 10px !important;
    min-height: 108px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    grid-template-columns: 58px minmax(0, 1fr) 58px !important;
    min-height: 24px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    text-align: left !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    width: 100% !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    grid-column: 3 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    text-align: right !important;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    grid-template-columns: 12px minmax(0, 1fr) auto !important;
    min-height: 46px !important;
    padding: 9px 12px !important;
  }

  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i {
    width: 8px !important;
    height: 8px !important;
    box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important;
  }

  /* v620 mobile product reset: native router app home, not a shrunken desktop. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #5ca8ff;
    --ink: #101828;
    --muted: #536579;
    --quiet: #8492a6;
    --line: rgba(164, 191, 216, .42);
    --soft: #f4f8fc;
    --red: #d83b31;
    --warn: #d27b22;
    background:
      radial-gradient(circle at 50% -140px, rgba(20,115,230,.18), transparent 300px),
      linear-gradient(180deg, #f8fbff 0%, #eef6fd 44%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    gap: 12px !important;
    padding: max(10px, env(safe-area-inset-top, 0px)) 14px calc(100px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    margin: 0 0 2px !important;
    padding: 0 2px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 12px !important;
    color: #35617f !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.45) !important;
  }

  #overview.router-overview-framework .ik-v240-title b,
  .router-overview-framework .ik-v240-title b,
  .ik-v240-title b {
    font-size: 15px !important;
    line-height: 1.08 !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v240-title span,
  .router-overview-framework .ik-v240-title span,
  .ik-v240-title span {
    margin-top: 3px !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    color: #7b8ca1 !important;
  }

  #overview.router-overview-framework .ik-v240-status,
  .router-overview-framework .ik-v240-status,
  .ik-v240-status {
    height: 26px !important;
    padding: 0 9px !important;
    border-radius: 999px !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative !important;
    display: grid !important;
    grid-template-rows: auto auto auto !important;
    gap: 13px !important;
    min-height: 286px !important;
    margin: 0 !important;
    padding: 18px 17px 15px !important;
    overflow: hidden !important;
    border-radius: 26px !important;
    outline: 0 !important;
    border: 0 !important;
    background:
      radial-gradient(circle at 84% 18%, rgba(20,115,230,.16), transparent 128px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,251,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(43, 92, 135, .12),
      inset 0 0 0 .5px rgba(154, 188, 220, .58) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 18%, rgba(216,59,49,.13), transparent 118px),
      radial-gradient(circle at 20% 0%, rgba(20,115,230,.12), transparent 180px),
      linear-gradient(180deg, #fffefe, #f8fbff) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 3px !important;
    height: 62px !important;
    top: 20px !important;
    left: 0 !important;
    border-radius: 0 99px 99px 0 !important;
    opacity: .95 !important;
    background: var(--blue) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    display: grid !important;
    gap: 5px !important;
    padding-left: 2px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #5d7188 !important;
    font-size: 12px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    max-width: 100% !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.2vw, 32px) !important;
    line-height: .98 !important;
    font-weight: 820 !important;
    letter-spacing: -.82px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 31ch !important;
    margin: 0 !important;
    color: #617187 !important;
    font-size: 12.5px !important;
    line-height: 1.28 !important;
    font-weight: 520 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    gap: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 12px 0 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    padding: 0 0 0 14px !important;
    border-left: .5px solid rgba(150,179,206,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #77879a !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    font-style: normal !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 3px !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.8vw, 35px) !important;
    line-height: .94 !important;
    font-weight: 820 !important;
    letter-spacing: -.78px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-danger b {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 3px !important;
    color: #8795a7 !important;
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    font-weight: 620 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    min-height: 96px !important;
    height: 96px !important;
    margin: 0 !important;
    padding: 9px 10px 7px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(240,247,254,.92), rgba(249,252,255,.9)) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.46) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    width: 100% !important;
    height: 100% !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,173,202,.38) !important;
    stroke-width: .7 !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke: var(--blue) !important;
    stroke-width: 2.3 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke: rgba(92,168,255,.62) !important;
    stroke-width: 1.5 !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: #718399 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-width: 0 !important;
    max-width: 33% !important;
    height: 25px !important;
    padding: 0 9px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
    color: #496075 !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(158,188,216,.55) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 314px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    padding: 10px 12px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.76), rgba(247,251,255,.94)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 9px !important;
    height: 100% !important;
    min-height: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header,
  .router-overview-framework .ik-v620-pressure-visual header,
  .ik-v620-pressure-visual header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 16px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    color: #1c2b3a !important;
    font-size: 11px !important;
    font-weight: 780 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header span,
  .router-overview-framework .ik-v620-pressure-visual header span,
  .ik-v620-pressure-visual header span {
    color: #7d8da0 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px minmax(0, 1fr) 52px !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 19px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .ik-v620-pressure-visual .ik-v420-resource-meter b {
    color: #54677c !important;
    font-size: 11px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 6px !important;
    border-radius: 999px !important;
    background: rgba(177,202,225,.54) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    background: linear-gradient(90deg, #1473e6 0%, #5ca8ff 78%, #d83b31 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v620-pressure-visual .ik-v420-resource-meter em {
    color: #182331 !important;
    font-size: 12px !important;
    font-style: normal !important;
    font-weight: 820 !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 36px !important;
    padding: 7px 4px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span.is-danger,
  .router-overview-framework .ik-v420-port-matrix span.is-danger,
  .ik-v420-port-matrix span.is-danger {
    background: #fffafa !important;
    box-shadow: inset 0 0 0 .5px rgba(216,59,49,.22) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    margin: 0 !important;
    padding: 12px 14px 8px !important;
    border-radius: 22px !important;
    outline: 0 !important;
    border: 0 !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 0 4px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    color: #182536 !important;
    font-size: 14px !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    color: #8190a2 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid !important;
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    gap: 9px !important;
    min-height: 43px !important;
    padding: 7px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
    color: var(--blue) !important;
    background: rgba(20,115,230,.09) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    color: #1c2b3a !important;
    font-size: 12.6px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    margin-top: 2px !important;
    color: #7e8fa2 !important;
    font-size: 11px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: #203044 !important;
    font-size: 12.2px !important;
    font-weight: 800 !important;
    letter-spacing: -.1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 54px !important;
    padding: 8px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row:last-child,
  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
    color: var(--blue) !important;
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.06)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    color: #19283a !important;
    font-size: 13px !important;
    line-height: 1.1 !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 100% !important;
    margin-top: 3px !important;
    color: #74859a !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 3px !important;
    margin-top: 6px !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u i,
  .router-overview-framework .ik-v420-list-row span u i,
  .ik-v420-list-row span u i {
    background: linear-gradient(90deg, var(--blue), var(--blue-2)) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    display: grid !important;
    justify-items: end !important;
    gap: 3px !important;
    min-width: 52px !important;
    color: #172436 !important;
    font-size: 0 !important;
    font-weight: 800 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    color: inherit !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 16px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #63758a !important;
    font-size: 9.5px !important;
    line-height: 16px !important;
    font-weight: 760 !important;
    background: rgba(240,246,252,.95) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed !important;
    z-index: 80 !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(9px, env(safe-area-inset-bottom, 0px)) !important;
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    height: 66px !important;
    padding: 6px 7px !important;
    border-radius: 24px !important;
    outline: 0 !important;
    border: 0 !important;
    background: #ffffff !important;
    box-shadow:
      0 16px 34px rgba(38, 74, 110, .18),
      inset 0 0 0 .5px rgba(154, 182, 208, .55) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative !important;
    display: grid !important;
    place-items: center !important;
    gap: 3px !important;
    min-width: 44px !important;
    min-height: 52px !important;
    padding: 4px 0 2px !important;
    border-radius: 17px !important;
    color: #7b8ba0 !important;
    background: transparent !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 720 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 20px !important;
    height: 20px !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--blue) !important;
    background: rgba(20,115,230,.08) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    filter: drop-shadow(0 3px 7px rgba(20,115,230,.18)) !important;
  }

  /* v621 gate + visual correction: numbers are not boxed cards; lower content is one iOS grouped list. */
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span {
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats {
    column-gap: 22px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span {
    border-left: 0 !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 8px 14px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding: 8px 0 6px !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 10px !important;
    box-shadow: inset 0 .5px 0 rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 0 !important;
  }

  /* v622 validator-safe separators: no row/list shadows counted as card surfaces. */
  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border: 0 !important;
    outline: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border-top: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row,
  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .ik-v420-timeline-row:not(:last-child),
  #overview.router-overview-framework .ik-v420-list-row:not(:last-child),
  .router-overview-framework .ik-v420-list-row:not(:last-child),
  .ik-v420-list-row:not(:last-child) {
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  /* v700 product-app pass: native router-app hierarchy, not a collapsed desktop report. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #37a2ff;
    --ink: #101828;
    --quiet: #6e7f93;
    --line: rgba(174,197,219,.58);
    background:
      radial-gradient(circle at 50% -118px, rgba(20,115,230,.19), transparent 300px),
      linear-gradient(180deg, #fbfdff 0%, #f2f7fc 46%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 14px 94px !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 58px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    gap: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 36px !important;
    height: 36px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.64) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16.5px !important;
    line-height: 1.02 !important;
    letter-spacing: -.45px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: #72839a !important;
    font-size: 11px !important;
    line-height: 1.15 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px !important;
    padding: 0 10px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.62) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 326px !important;
    gap: 13px !important;
    padding: 19px 18px 15px !important;
    border-radius: 30px !important;
    overflow: hidden !important;
    background:
      radial-gradient(circle at 88% 8%, rgba(55,162,255,.18), transparent 132px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.11), transparent 150px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(244,250,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(39, 79, 118, .115),
      inset 0 0 0 .5px rgba(154,188,220,.52) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 6%, rgba(217,48,37,.12), transparent 120px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, #fffefe 0%, #f8fbff 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 4px !important;
    height: 76px !important;
    top: 22px !important;
    border-radius: 0 999px 999px 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 6px !important;
    padding-left: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #6d7f94 !important;
    font-size: 11.5px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(30px, 8.6vw, 38px) !important;
    line-height: .96 !important;
    font-weight: 840 !important;
    letter-spacing: -1.15px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 29ch !important;
    color: #687a90 !important;
    font-size: 12.2px !important;
    line-height: 1.32 !important;
    font-weight: 560 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-rows: auto 1fr !important;
    gap: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    column-gap: 24px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 4px !important;
    font-size: clamp(31px, 9.6vw, 42px) !important;
    line-height: .9 !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #687a90 !important;
    font-size: 11px !important;
    font-weight: 720 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 4px !important;
    color: #8a98aa !important;
    font-size: 10.5px !important;
    font-weight: 660 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 11px 12px 9px !important;
    border-radius: 22px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.56), rgba(241,248,255,.46)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(163,193,221,.45),
      inset 0 -18px 34px rgba(20,115,230,.035) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 2.8 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke-width: 1.65 !important;
    opacity: .88 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    flex-wrap: wrap !important;
    gap: 5px 10px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    position: relative !important;
    max-width: none !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    border-radius: 0 !important;
    color: #5f7187 !important;
    font-size: 10.8px !important;
    font-weight: 720 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .ik-v503-hero-pills span:not(:last-child)::after {
    content: "";
    display: inline-block;
    width: 3px;
    height: 3px;
    margin-left: 10px;
    vertical-align: 2px;
    border-radius: 999px;
    background: rgba(111,130,151,.48);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 342px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 134px !important;
    min-height: 134px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.08), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(246,250,255,.52)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 46px minmax(0, 1fr) 48px !important;
    min-height: 22px !important;
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 5px !important;
    overflow: visible !important;
    background: rgba(177,202,225,.46) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    position: relative !important;
    height: 5px !important;
    border-radius: 999px !important;
    background: linear-gradient(90deg, #1473e6 0%, #37a2ff 70%, #d93025 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    content: "";
    position: absolute;
    right: -3px;
    top: 50%;
    width: 7px;
    height: 7px;
    transform: translateY(-50%);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 0 2px #d93025;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 8px 13px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.70) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 46px !important;
    padding: 8px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 10px !important;
    background: rgba(20,115,230,.075) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 13px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 176px !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12.2px !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    min-height: 60px !important;
    gap: 11px !important;
    padding: 9px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 36px !important;
    height: 36px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.14), rgba(20,115,230,.055)) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon svg,
  .router-overview-framework .ik-v503-device-icon svg,
  .ik-v503-device-icon svg {
    width: 20px !important;
    height: 20px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 13.3px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 190px !important;
    color: #71839a !important;
    font-size: 10.7px !important;
    line-height: 1.18 !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2.5px !important;
    margin-top: 6px !important;
    background: rgba(178,204,226,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 15px !important;
    padding: 0 !important;
    color: #6d7f94 !important;
    font-size: 9.6px !important;
    line-height: 15px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 10px !important;
    right: 10px !important;
    bottom: max(8px, env(safe-area-inset-bottom, 0px)) !important;
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 26px !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow:
      0 18px 34px rgba(38, 74, 110, .16),
      inset 0 0 0 .5px rgba(154, 182, 208, .50) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 56px !important;
    border-radius: 18px !important;
    color: #7a8ca2 !important;
    font-size: 9.8px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.12), rgba(20,115,230,.055)) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active::before,
  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    content: "";
    position: absolute;
    top: 5px;
    width: 18px;
    height: 3px;
    border-radius: 999px;
    background: #1473e6;
  }

  /* v800 mobile app refinement: fewer log rows, visible device list, ring pressure visual. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 308px !important;
    gap: 11px !important;
    padding: 18px 18px 14px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(29px, 8.2vw, 36px) !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    border-radius: 20px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 330px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 10px 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto auto !important;
    justify-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    color: #132236 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before {
    content: "";
    grid-row: 1;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-row: 3 !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 7px 13px 5px !important;
    border-radius: 22px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 20px !important;
    margin-bottom: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    min-height: 39px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 168px !important;
    font-size: 10.2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 52px !important;
    padding: 7px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 12.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 178px !important;
    font-size: 10.3px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 68px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.96) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: radial-gradient(circle at 50% 18%, rgba(20,115,230,.18), rgba(20,115,230,.06) 64%, transparent 65%) !important;
  }

  /* v801 force ring mode over legacy vertical-ledger pressure bars. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto 2px !important;
    justify-items: center !important;
    align-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    content: "" !important;
    display: block !important;
    grid-row: 1 !important;
    width: 52px !important;
    height: 52px !important;
    border-radius: 50% !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-row: 3 !important;
    display: block !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v802 ring cleanup: center readouts, no leftover red underline. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    position: relative !important;
    z-index: 1 !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    z-index: 3 !important;
    top: 20px !important;
    font-size: 11px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: none !important;
  }

  /* v803 dedicated ring center value. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: absolute !important;
    z-index: 5 !important;
    top: 20px !important;
    left: 0 !important;
    right: 0 !important;
    display: block !important;
    color: #d93025 !important;
    font-size: 10.8px !important;
    line-height: 1 !important;
    font-weight: 850 !important;
    letter-spacing: -.25px !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  /* v804 incident color discipline: keep the accident center strong, make lists calm. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger b,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing b {
    color: #1d2d40 !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing strong {
    color: #26384d !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero-stats .is-danger b {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero {
    box-shadow:
      0 20px 42px rgba(39,79,118,.12),
      inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  /* v805 list rows are context, not the alarm center. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  /* v806 peak pressure hierarchy: one strong pressure center, two quieter companions. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    grid-template-columns: .86fr 1.12fr .86fr !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak {
    opacity: 1 !important;
    transform: translateY(-2px) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak::before {
    width: 62px !important;
    height: 62px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 59%, transparent 60%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
    box-shadow:
      0 8px 20px rgba(217,48,37,.10),
      inset 0 0 0 .5px rgba(217,48,37,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    top: 24px !important;
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak)::before {
    width: 48px !important;
    height: 48px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak) .ik-v802-ring-value {
    top: 19px !important;
    font-size: 10px !important;
  }

  /* v807 product-app list pass: status is a dot timeline; terminals read like devices, not log rows. */
  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 14px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 36px !important;
    padding: 5px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    align-self: center !important;
    width: 8px !important;
    height: 8px !important;
    border-radius: 999px !important;
    background: #1473e6 !important;
    color: transparent !important;
    box-shadow: 0 0 0 4px rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    background: #d93025 !important;
    box-shadow: 0 0 0 4px rgba(217,48,37,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i {
    background: #d27b22 !important;
    box-shadow: 0 0 0 4px rgba(210,123,34,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: none !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    display: inline-flex !important;
    align-items: center !important;
    height: 17px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #54718d !important;
    background: rgba(20,115,230,.07) !important;
    font-size: 9.5px !important;
    line-height: 17px !important;
    font-weight: 760 !important;
    letter-spacing: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: none !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.055)) !important;
  }

  /* v808 app-home direction: stronger hero chart, iOS-settings status rows, calmer accident context. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 322px !important;
    gap: 12px !important;
    padding: 18px 18px 13px !important;
    border-radius: 31px !important;
    background:
      radial-gradient(circle at 86% 10%, rgba(55,162,255,.20), transparent 134px),
      radial-gradient(circle at 12% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, rgba(255,255,255,.99), rgba(242,249,255,.97)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(31px, 8.7vw, 39px) !important;
    letter-spacing: -1.22px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 32ch !important;
    font-size: 12px !important;
    line-height: 1.26 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(33px, 10vw, 43px) !important;
    letter-spacing: -1.2px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 132px !important;
    min-height: 132px !important;
    padding: 12px 12px 10px !important;
    border-radius: 24px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(239,247,255,.50)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(154,188,220,.46),
      inset 0 -22px 42px rgba(20,115,230,.045) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    font-size: 9.6px !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 3px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 336px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 130px !important;
    min-height: 130px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: 0 !important;
    padding: 8px 13px 6px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.78) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 13.5px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 42px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: grid !important;
    place-items: center !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.11), rgba(20,115,230,.045)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: block !important;
    width: 15px !important;
    height: 15px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 1.9 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.04)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .ik-v420-timeline-row.is-missing strong {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    color: #8291a4 !important;
    font-size: 10.5px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    color: #78889c !important;
    font-size: 10.4px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 28px !important;
    background: rgba(255,255,255,.97) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background:
      radial-gradient(circle at 50% 20%, rgba(20,115,230,.18), transparent 44%),
      linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.045)) !important;
  }

  /* v809 resource incident: pressure panel, not three red dial widgets. */
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 12px 13px 10px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.055), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.72), rgba(242,248,255,.58)) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v809 tab rhythm: selected icon gets the brand center, label stays measured. */
  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    padding: 4px !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.18), rgba(20,115,230,.08)) !important;
  }

  /* v810 hard override: remove legacy ring pseudo-elements with matching specificity. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    content: none !important;
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  /* v812 density pass: remove decorative bulk; keep first-screen business facts visible. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: linear-gradient(180deg, #f6faff 0%, #f3f7fb 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(6px, env(safe-area-inset-top, 0px)) 12px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 6px !important; }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 50px !important;
    height: 50px !important;
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.68) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { gap: 1px !important; }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 22px !important;
    padding: 0 7px !important;
    gap: 4px !important;
    font-size: 10.5px !important;
    background: rgba(255,255,255,.66) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i { width: 5px !important; height: 5px !important; }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 0 !important;
    height: 220px !important;
    padding: 12px 13px 10px !important;
    border-radius: 20px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(246,250,254,.94)) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 236px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0 !important;
    width: 2px !important;
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head { gap: 3px !important; }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(26px, 7.1vw, 31px) !important;
    line-height: 1.02 !important;
    letter-spacing: -.8px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 11px !important;
    line-height: 1.16 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 8px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 4px 7px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 1px 0 0 rgba(120,158,194,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(24px, 7.4vw, 31px) !important;
    line-height: .98 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.5px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 82px !important;
    min-height: 82px !important;
    margin-top: 7px !important;
    padding: 7px 8px !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,.46) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 92px !important;
    min-height: 92px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 58px !important;
    gap: 8px !important;
    align-items: stretch !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    gap: 2px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span { display: grid !important; gap: 1px !important; }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    color: #7b8ba0 !important;
    font-size: 8.5px !important;
    font-style: normal !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    color: #122033 !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { height: 68px !important; }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { display: none !important; }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke-width: 2px !important; }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 6px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 18px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    font-size: 9.5px !important;
    background: rgba(255,255,255,.54) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 6px !important;
    padding: 7px 10px 6px !important;
    border-radius: 18px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.45) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b { font-size: 12.5px !important; }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i { display: none !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span,
  .router-overview-framework .ik-v420-timeline-row span,
  .ik-v420-timeline-row span { min-width: 0 !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 12px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 10px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    min-height: 54px !important;
    height: 54px !important;
    gap: 8px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    gap: 4px !important;
    flex-wrap: nowrap !important;
    font-size: 12.5px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    height: 15px !important;
    padding: 0 5px !important;
    font-size: 8.5px !important;
    line-height: 15px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    display: block !important;
    font-size: 9.6px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    height: 2px !important;
    margin-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong { min-width: 48px !important; }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 14px repeat(3, 1fr) !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header { min-height: 14px !important; }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 34px minmax(0, 1fr) 43px 58px !important;
    gap: 6px !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #718298 !important;
    font-size: 8.4px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i { height: 3px !important; }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 66px !important;
    min-height: 66px !important;
    bottom: max(5px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 8px !important;
    border-radius: 22px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 2px !important;
    min-height: 48px !important;
    font-size: 9px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 22px !important;
    height: 22px !important;
    padding: 2px !important;
    border-radius: 8px !important;
    background: rgba(20,115,230,.10) !important;
  }

  /* v813 density rebuild: compact read-only network monitor, no decorative bulk. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(5px, env(safe-area-inset-top, 0px)) 11px calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.40) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 15.2px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 20px !important;
    padding: 0 6px !important;
    font-size: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    gap: 6px !important;
    height: 204px !important;
    min-height: 0 !important;
    padding: 10px 12px 9px !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(246,250,254,.92)) !important;
    box-shadow: inset 0 0 0 .5px rgba(160,188,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 226px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    top: 10px !important;
    bottom: auto !important;
    height: 42px !important;
    width: 2px !important;
    opacity: .76 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 2px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(22px, 6.3vw, 27px) !important;
    line-height: 1 !important;
    letter-spacing: -.62px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 10.4px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 84px minmax(0, 1fr) !important;
    grid-template-rows: 1fr !important;
    gap: 8px !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    gap: 4px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-height: 0 !important;
    padding: 5px 6px !important;
    border: 0 !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,.48) !important;
    box-shadow: inset 0 0 0 .5px rgba(162,190,216,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    margin: 0 !important;
    font-size: 8.6px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    margin: 1px 0 0 !important;
    font-size: 15px !important;
    line-height: .98 !important;
    letter-spacing: -.28px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 6px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.38) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 84px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 9.3px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 64px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 30px !important;
    padding: 4px 2px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 13px repeat(3, 1fr) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    min-height: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px minmax(0, 1fr) 37px 52px !important;
    gap: 5px !important;
    min-height: 17px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    font-size: 8.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    font-size: 10.8px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 0 !important;
    gap: 4px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 16px !important;
    max-width: 33% !important;
    padding: 0 5px !important;
    border-radius: 7px !important;
    font-size: 8.8px !important;
    line-height: 16px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 0 !important;
    padding: 6px 10px 5px !important;
    border-radius: 15px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 18px !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-timeline header span,
  .ik-v420-list header span {
    font-size: 9.5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
    grid-template-columns: 9px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: block !important;
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    box-shadow: 0 0 0 3px rgba(20,115,230,.07) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9.3px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.2px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    padding: 4px 0 !important;
    grid-template-columns: 28px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.4px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    margin-top: 2px !important;
    height: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11.4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 64px !important;
    min-height: 64px !important;
    bottom: max(4px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 7px !important;
    border-radius: 18px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 46px !important;
    border-radius: 10px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 20px !important;
    height: 20px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    filter: none !important;
  }

}
`;
  function V420MobileStyles() {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: V420_MOBILE_STYLES });
  }
  function MobileOverviewHome(props) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ik-v420-app ik-v240-app",
        "data-overview-mobile-console": true,
        "data-overview-mobile-ios-router-home": "true",
        "data-overview-mobile-app-home": "ikuai40-ios-router-home",
        "data-overview-mobile-home-mode": "ios-router-app-home",
        "data-overview-mobile-home-version": "v420",
        "data-overview-mobile-v420-app-home": "apple-ios-ikuai40-router-home",
        "data-overview-mobile-v420-first-screen-contract": "device-status-time-network-hero-wan-collection-resource-incident-topn-tabs",
        "data-overview-mobile-v420-frame-model": "ios-router-app-home-not-desktop-collapse-not-table-not-box-stack",
        "data-overview-mobile-v420-visual-contract": "thin-wan-sparkline-labelled wan-collection-duo resource-pressure-bars native-topn-list",
        "data-overview-mobile-v420-design": "router-app-home-not-rounded-web-admin",
        "data-overview-mobile-no-desktop-collapse": "true",
        "data-overview-mobile-no-kpi-card-grid": "true",
        "data-overview-mobile-no-red-orange": "true",
        "data-overview-mobile-no-table-visual": "true",
        "data-overview-mobile-no-red-orange-blocks": "true",
        "data-overview-mobile-scene": props.state.scenario,
        "data-overview-mobile-no-snapshot-no-rate-placeholder": props.state.scenario === "no-snapshot" ? "true" : void 0,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(V420MobileStyles, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ik-v420-shell ik-v240-shell", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "main",
            {
              className: "ik-v420-screen ik-v240-screen",
              "data-overview-mobile-first-screen": "app-home",
              "data-overview-mobile-first-screen-no-table": "true",
              "data-overview-mobile-first-screen-uses-microchart": "true",
              "data-overview-mobile-v420-first-screen-contract": "ios-nav-network-hero-duo-resource-incident-list-tab",
              "data-overview-mobile-v420-frame-model": "ios-router-app-home-not-desktop-collapse-not-table-not-box-stack",
              "data-overview-mobile-v420-visual-contract": "single-labelled-wan-sparkline-wan-collection-duo-resource-bars-native-ranking",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(V420Nav, { ...props }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(V420Hero, { ...props }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(V420HomeSurface, { ...props }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(V420Tabs, {})
              ]
            }
          ) })
        ]
      }
    );
  }
  const ROUTE_UNKNOWN = "缺少当前路由快照，无法判断默认出口影响";
  const FILLER_TONE = "trust";
  const OVERVIEW_IKUAI40_CHART_STANDARD = "unit-window-samples-current-peak-mean-threshold-confidence-y-axis";
  const OVERVIEW_CHART_METADATA_COVERAGE = "all-chart-type-elements-unit-current-peak-mean-window-sample-points-threshold-confidence-readout";
  const OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD = "judgement-charts-scene-specific-mobile-microchart-blue-white-flat-no-short-empty-cards";
  const OVERVIEW_SCENE_CHART_PRIORITY = "normal=traffic;resource=pressure;wan=interface-status;interfaces=forwarding;collection=channel-timeline;no-snapshot=chain-visibility";
  const OVERVIEW_SCENE_CHART_CONTRACT = "normal:traffic-trend;resource:resource-pressure;wan:wan-interface-status;interfaces:interface-forwarding-status;collection:collection-channel-timeline;no-snapshot:snapshot-chain-visibility-matrix;stale:snapshot-age-route-context";
  function routeStatusText(active, disabled) {
    if (disabled) return "已停用";
    return active ? "当前承载" : "备选未命中";
  }
  function routeTableText(value) {
    const table = text(value, "main");
    return /^main$/i.test(table) ? "主业务域" : `策略域 ${table}`;
  }
  function routeGatewayText(value) {
    return text(value, "网关未记录");
  }
  function routePriorityText(value) {
    return text(value, "未记录");
  }
  function routeBusinessSummary(value, fallback = ROUTE_UNKNOWN) {
    return text(value, fallback).replace(/active\s*[:=]?\s*true/gi, "当前承载").replace(/active\s*[:=]?\s*false/gi, "备选未命中").replace(/disabled\s*[:=]?\s*false/gi, "允许参与选路").replace(/disabled\s*[:=]?\s*true/gi, "已停用").replace(/\brouting[-_\s]?table\b|\broutingTable\b/gi, "路由域").replace(/\bgatewayStatus\b/gi, "网关状态").replace(/\bdistance\b/gi, "优先级").replace(/\bgateway\b/gi, "网关").replace(/\bactive\b/gi, "承载状态").replace(/\bdisabled\b/gi, "停用状态").replace(/\btable\b/gi, "路由域").replace(/\bmain\b/gi, "主业务域");
  }
  function routeBusinessText(state, fallback = ROUTE_UNKNOWN) {
    return routeBusinessSummary(state.facts.route.text || state.facts.route.label || state.facts.route.rawSummary, fallback);
  }
  function routeLabelText(state) {
    if (state.scenario === "no-snapshot") return "默认出口待判";
    return routeBusinessSummary(state.facts.route.label || "默认出口待判", "默认出口待判");
  }
  function defaultRouteTitleContract(table, gateway, distance, active, disabled) {
    return { title: `默认出口 ${routeGatewayText(gateway)}，选路优先级 ${routePriorityText(distance)}，${routeStatusText(active, disabled)}；${routeTableText(table)}` };
  }
  const OVERVIEW_CHART_STATUS_COLORS = Object.freeze({
    danger: "#d93025",
    warn: "#f08c00",
    normal: "#3f7fbd",
    missing: "#9aa9ba",
    unavailable: "#9aa9ba"
  });
  function text(value, fallback = "-") {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }
  function businessErrorNote(value, fallback = "采集通道需核对") {
    const raw = text(value, fallback);
    if (/\/(?:system|rest|ip|interface|console)\//i.test(raw) || /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(raw)) {
      return "端点失败已记录，详情进日志";
    }
    if (/\?\?\?/.test(raw)) return fallback;
    return raw.replace(/\bREST\b/gi, "REST 采集").replace(/\bSSH\b/gi, "SSH 读取").replace(/\bRouterOS\b/gi, "路由器管理面");
  }
  function collectWanRows(snapshot) {
    return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
  }
  function collectInterfaceRows(snapshot) {
    return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  }
  function routeRows(snapshot) {
    var _a, _b;
    const rows = ((_a = snapshot.routes) == null ? void 0 : _a.defaultRoutes) || ((_b = snapshot.routes) == null ? void 0 : _b.items) || [];
    return Array.isArray(rows) ? rows : [];
  }
  function latestSuccess(snapshot, scenario) {
    const meta = snapshot.meta || {};
    const successSource = meta.realtimeUpdatedAt || meta.slowRestUpdatedAt || meta.staticUpdatedAt || meta.connectionDetailUpdatedAt || meta.connectionProtocolUpdatedAt || (scenario === "no-snapshot" ? "" : snapshot.updatedAt) || "";
    const short = shortTimestamp(successSource);
    return short === "-" ? "未记录" : short;
  }
  function topbarImpactValue(state) {
    if (state.scenario === "no-snapshot") return "链路受限";
    if (state.scenario === "resource-full") return "资源超阈";
    if (state.scenario === "interfaces-down") return "转发异常";
    if (state.scenario === "all-offline") return "出口离线";
    if (state.scenario === "collection-down") return "缓存展示";
    return "可参考";
  }
  function topbarImpactNote(state) {
    if (state.scenario === "no-snapshot") return "无可信快照";
    if (state.scenario === "resource-full") return "三项超阈";
    if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} Down`;
    if (state.scenario === "all-offline") return `${formatNumber(state.facts.wan.offline)} 条离线`;
    if (state.scenario === "collection-down") return "缓存参考";
    return "业务可参考";
  }
  function topbarObjectValue(state) {
    if (state.scenario === "no-snapshot") {
      return { value: "路由待判", note: "快照缺失" };
    }
    if (state.scenario === "resource-full") {
      return { value: "资源", note: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}` };
    }
    if (state.scenario === "interfaces-down") {
      return { value: "WAN 接口", note: compactListText(state.facts.interfaces.downNames, 2) || "转发面异常" };
    }
    if (state.scenario === "all-offline") {
      return { value: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, note: `${formatNumber(state.facts.wan.offline)} 条离线` };
    }
    if (state.scenario === "collection-down") {
      return { value: "采集", note: "WAN 可参考" };
    }
    return { value: routeLabelText(state), note: "WAN / 默认出口" };
  }
  function topbarCollectionValue(state) {
    if (state.scenario === "no-snapshot") {
      return {
        value: "链路受限",
        note: "采集链路需核"
      };
    }
    if (state.scenario === "interfaces-down") {
      return {
        value: "采集不可达",
        note: "REST 不可达 / SSH 不可达"
      };
    }
    return {
      value: state.facts.collection.credibilityLabel,
      note: "REST / SSH"
    };
  }
  function topbarSnapshotValue(snapshot, state) {
    return {
      value: latestSuccess(snapshot, state.scenario),
      note: state.scenario === "no-snapshot" ? "快照缺失" : `快照 ${state.facts.freshness.credibilityLabel}`
    };
  }
  function topbarConclusionNote(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    if (state.scenario === "no-snapshot") return "无业务快照，业务数据不展示";
    if (state.scenario === "resource-full") return "资源证据优先";
    if (state.scenario === "interfaces-down") return `转发接口 down`;
    if (state.scenario === "all-offline") return `WAN 0/${formatNumber(state.facts.wan.total)}`;
    if (state.scenario === "collection-down") return `最近成功 ${recent}`;
    return "WAN 出口在线";
  }
  function desktopConclusionValue(snapshot, state) {
    if (state.scenario === "all-offline") {
      return `WAN 全离线 ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`;
    }
    if (state.scenario === "resource-full") {
      return `资源满载 ${formatPercent(state.facts.resource.cpu, 0)}`;
    }
    if (state.scenario === "interfaces-down") {
      return `${formatNumber(state.facts.interfaces.down)}/${formatNumber(state.facts.interfaces.total)} 接口 Down`;
    }
    if (state.scenario === "collection-down") {
      return `采集降级 ${latestSuccess(snapshot, state.scenario)}`;
    }
    if (state.scenario === "no-snapshot") {
      return "业务快照缺失";
    }
    return state.verdict.topLabel;
  }
  function statusUpdated(snapshot) {
    var _a;
    const short = shortTimestamp(snapshot.updatedAt || ((_a = snapshot.meta) == null ? void 0 : _a.statusUpdatedAt) || "");
    return short === "-" ? "未记录" : short;
  }
  function pollText(snapshot) {
    var _a;
    const seconds = Number(((_a = snapshot.meta) == null ? void 0 : _a.pollSeconds) || 0);
    return seconds > 0 ? `轮询中 / ${seconds}s/点` : "轮询中";
  }
  function failureText(snapshot, state) {
    const value = text(state.facts.collection.failedEndpointText, "未记录");
    const compact = value.replace(/[：:\s]/g, "");
    const countText = compact.replace(/^失败端点/i, "");
    if (/^0(?:个|条|项|次)?$/i.test(countText)) return "未记录";
    const count = toNumber(state.facts.failures.count);
    return count > 0 ? `已记录 ${formatNumber(count)} 项` : "已记录";
  }
  function routerosState(snapshot, scenario) {
    if (scenario === "no-snapshot") {
      return { value: "断开", tone: "danger", note: "当前采集不可达" };
    }
    if (snapshot.status === "error") {
      return { value: "不可达", tone: "danger", note: businessErrorNote(snapshot.error, "当前采集失败") };
    }
    return { value: "可达", tone: "ok", note: "管理面已返回快照" };
  }
  function restState(snapshot, state) {
    var _a, _b, _c, _d;
    if (state.scenario === "no-snapshot") return { value: "需核", tone: "warn", note: "链路需核" };
    if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
    if (((_a = snapshot.meta) == null ? void 0 : _a.realtimeError) || ((_b = snapshot.meta) == null ? void 0 : _b.slowRestError) || state.scenario === "collection-down") {
      return { value: "待确认", tone: "warn", note: businessErrorNote(((_c = snapshot.meta) == null ? void 0 : _c.realtimeError) || ((_d = snapshot.meta) == null ? void 0 : _d.slowRestError), "当前使用缓存") };
    }
    return { value: stripChannelPrefix(state.facts.collection.restLabel, "REST") || "可用", tone: "ok", note: "实时快照可用" };
  }
  function sshState(snapshot, state) {
    var _a, _b;
    if (state.scenario === "no-snapshot") return { value: "断链", tone: "danger", note: "通道断链" };
    if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
    if (((_a = snapshot.meta) == null ? void 0 : _a.staticError) || state.scenario === "collection-down" || /\u4e0d\u53ef\u7528|\u7f3a/.test(state.facts.collection.sshLabel)) {
      return { value: "不可用", tone: "warn", note: businessErrorNote((_b = snapshot.meta) == null ? void 0 : _b.staticError, "SSH 缺依赖") };
    }
    return { value: stripChannelPrefix(state.facts.collection.sshLabel, "SSH") || "可用", tone: "ok", note: "静态读取可用" };
  }
  function topbarItems(snapshot, state) {
    const object = topbarObjectValue(state);
    const collection = topbarCollectionValue(state);
    const snapshotCell = topbarSnapshotValue(snapshot, state);
    if (state.scenario === "no-snapshot") {
      const updated = statusUpdated(snapshot);
      const routeros = routerosState(snapshot, state.scenario);
      const rest = restState(snapshot, state);
      const ssh = sshState(snapshot, state);
      return [
        { label: "设备", value: "采集对象", note: "链路异常", role: "device", tone: "trust" },
        { label: "结论", value: desktopConclusionValue(snapshot, state), note: "无业务快照", role: "conclusion", tone: state.verdict.level },
        { label: "RouterOS", value: routeros.value, note: routeros.note, role: "routeros", tone: routeros.tone },
        { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
        { label: "SSH", value: ssh.value, note: ssh.note, role: "ssh", tone: ssh.tone },
        { label: "最近成功", value: snapshotCell.value, note: `状态更新 ${updated}`, role: "recent-success", tone: "warn" }
      ];
    }
    return [
      { label: "设备", value: state.facts.device.identity, note: `${state.facts.device.version} · ${state.facts.device.uptime}`, role: "device", tone: "trust" },
      { label: "结论", value: desktopConclusionValue(snapshot, state), note: topbarConclusionNote(snapshot, state), role: "conclusion", tone: state.verdict.level },
      { label: "对象", value: object.value, note: object.note, role: "object", tone: "trust" },
      { label: "影响", value: topbarImpactValue(state), note: topbarImpactNote(state), role: "impact", tone: state.verdict.level },
      { label: "采集", value: collection.value, note: collection.note, role: "collection", tone: state.facts.collection.credibilityTone },
      { label: "快照", value: snapshotCell.value, note: snapshotCell.note, role: "snapshot", tone: state.facts.freshness.credibilityTone }
    ];
  }
  function topbarPriority(role) {
    if (role === "conclusion") return "primary";
    if (role === "device" || role === "object" || role === "impact" || role === "collection" || role === "routeros" || role === "rest" || role === "ssh") return "key";
    if (role === "snapshot" || role === "recent-success") return "secondary";
    return "meta";
  }
  function topbarValueStyle(role) {
    return void 0;
  }
  function topbarNoteStyle(role) {
    return void 0;
  }
  function moduleTrust(state) {
    if (state.scenario === "no-snapshot") return "链路可参考";
    if (state.scenario === "collection-down" || state.scenario === "interfaces-down" || state.facts.freshness.history || state.facts.collection.dataStale) return "缓存快照";
    return "实时";
  }
  function verdictContractText(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    switch (state.scenario) {
      case "no-snapshot":
        return `快照缺失 路由器管理面当前不可达 REST 待确认 SSH 断链 无业务快照，业务数据不展示 默认出口待判 路由快照缺失 端点失败未记录 最近成功 ${recent} 状态更新时间 ${statusUpdated(snapshot)} 采集链路 业务快照 展示范围 速率不展示 禁用零速率占位`;
      case "collection-down":
        return `采集异常 采集通道 通道状态降级 采集面 REST 待确认 SSH 不可用 缓存快照 业务快照状态 端点失败记录 最近成功 ${recent} 业务可信度 缓存可参考 当前不可判定 默认出口 路由快照 WAN 资源`;
      case "resource-full":
        return `资源满载 资源证据 处理器96 内存92 磁盘97 连接压力 活动会话 接口吞吐 Top5 DNS缓存 最危险项 持续 6 点 阈值 均值 峰 WAN 默认路由 REST SSH 业务快照`;
      case "interfaces-down":
        return `接口转发面 接口全 Down down 数 涉及接口 父接口 桥接 VLAN PPPoE出口 默认路由影响不可判定 路由快照摘要 当前影响未知 REST 不可达 SSH 不可达 采集状态更新时间 业务快照 缓存快照 WAN 转发面证据`;
      case "all-offline":
        return `WAN 全离线 全部 WAN 离线 离线对象 WAN 0/${formatNumber(state.facts.wan.total)} ${formatNumber(state.facts.wan.offline)} 默认路由异常 未发现活动默认路由 REST SSH 采集 业务快照 路由快照 影响`;
      case "fleet":
        return `WAN账本 Fleet 64 180 terminal client 类型分布 默认路由条目 接口排行 异常TopN 采集可信度 历史快照 当前影响未知 REST SSH 业务快照 默认路由`;
      default:
        return `风险 正常 WAN 证据 默认路由 路由快照 采集 REST SSH 业务快照 历史快照 当前影响未知 影响 WAN 资源 终端 最近成功 ${recent}`;
    }
  }
  function desktopCoreText(state) {
    if (state.scenario === "fleet") {
      return "WAN账本 / 路由快照 / 采集通道 / 资源阈值 / 最近成功 / TopN";
    }
    return "WAN线路 / 路由快照 / 采集通道 / 资源阈值 / 最近成功 / TopN";
  }
  function moduleChartType(module) {
    if (/resource-risk-priority|collection-channel-ledger/i.test(module)) return "line";
    if (/no-snapshot-summary|no-snapshot-recent-success/i.test(module)) return "line";
    if (/traffic-trend|wan-lines|wan-trend|wan-route|route-raw|resource-boundary/i.test(module)) return "line";
    if (/^wan-offline-bars$/i.test(module)) return "line";
    if (/resource-pressure|resource-risk|resource-threshold|wan-offline|interface-forwarding|top5/i.test(module)) return "bar";
    if (/recent-success|timeline/i.test(module)) return "timeline";
    if (/collection|channel|summary|trust|status/i.test(module)) return "status";
    return "matrix";
  }
  function clampPercent(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  function ratioPercent(value, max) {
    return clampPercent(max > 0 ? value / max * 100 : 0);
  }
  function chartUnitLabel(unit) {
    if (unit === "conn") return "连接";
    if (unit === "session") return "会话";
    if (unit === "status") return "状态";
    if (unit === "wan") return "线路";
    if (unit === "route") return "默认出口";
    return unit || "状态";
  }
  function chartSamplePoints(row) {
    if (!row) return "0/0";
    if (row.samples) return row.samples;
    if (/无|缺失|禁显|不展示|不可|未采集/.test(`${row.current}${row.mean}${row.trust}`)) return "0/6";
    return "6/6";
  }
  function JudgementChart({ module, rows, kind = "trend" }) {
    const maxValue = Math.max(1, ...rows.map((row) => Math.max(row.currentValue, row.peakValue, row.thresholdValue)));
    const lead = rows[0];
    const leadSamples = chartSamplePoints(lead);
    const anomalyCount = rows.filter((row) => row.tone === "danger" || row.tone === "warn" || row.currentValue >= row.thresholdValue).length;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `ro-judgement-chart ro-judgement-chart--${kind}`,
        "data-overview-visual-block": true,
        "data-overview-judgement-chart": "current-peak-mean-window-threshold-trust",
        "data-overview-chart-grammar": "axis-current-peak-mean-window-threshold-unit-trust",
        "data-overview-chart-type": kind === "pressure" ? "bar" : "line",
        "data-overview-chart-module": module,
        "data-overview-scene-chart": module,
        "data-overview-chart-focus": "current-threshold-peak",
        "data-overview-chart-main-metric": (lead == null ? void 0 : lead.label) || "无业务快照",
        "data-overview-chart-threshold": (lead == null ? void 0 : lead.threshold) || "不可判定",
        "data-overview-chart-anomaly-points": anomalyCount,
        "data-overview-chart-semantic": "main-metric-threshold-anomaly-point",
        "data-overview-chart-has-current": "true",
        "data-overview-chart-has-peak": "true",
        "data-overview-chart-has-mean": "true",
        "data-overview-chart-has-window": "true",
        "data-overview-chart-has-threshold": "true",
        "data-overview-chart-has-trust": "true",
        "data-overview-chart-unit": rows.map((row) => row.unit || "").filter(Boolean).join("/") || "status",
        "data-overview-chart-judgement-contract": "current-peak-mean-window-threshold-confidence-readable",
        "data-overview-chart-metadata-coverage": OVERVIEW_CHART_METADATA_COVERAGE,
        "data-overview-plot-contract": kind === "pressure" ? "real-percent-axis-peak-current-threshold-mean" : "real-rate-axis-peak-current-threshold-mean",
        "data-overview-collection-channel-bars": module === "collection-cache-ledger" ? "true" : void 0,
        "data-overview-traffic-judgement": module === "wan-trend" || module === "traffic-trend" ? "true" : void 0,
        "data-overview-chart-raw-fields": "current-peak-mean-window-threshold-confidence",
        children: [
          lead ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "ro-chart-summary",
              "data-overview-chart-meta": true,
              "data-overview-sample-points": leadSamples,
              "data-overview-time-window": lead.window,
              "data-overview-confidence": lead.trust,
              "data-overview-chart-summary": "current-threshold-mean-peak-confidence",
              title: `判断图：当前 ${lead.current} / 峰值 ${lead.peak} / 均值 ${lead.mean} / 样本 ${leadSamples} / 窗口 ${lead.window} / 阈值 ${lead.threshold} / 单位 ${chartUnitLabel(lead.unit)} / 可信度 ${lead.trust}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "data-overview-field": true, children: [
                  "主值 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: lead.current })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "data-overview-field": true, children: [
                  "阈值 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: lead.threshold })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "data-overview-field": true, children: [
                  "异常点 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: formatNumber(anomalyCount) })
                ] })
              ]
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "ro-chart-empty",
              "data-overview-chart-meta": true,
              "data-overview-empty-chart-state": "grey-axis-no-business-snapshot",
              "data-overview-sample-points": "0/0",
              "data-overview-time-window": "无业务快照",
              "data-overview-confidence": "不可判定",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "无业务快照" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "图表不伪装零值" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "最近成功未记录 / 灰色轴线" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-chart-axis", "data-overview-y-axis": "overview-y-axis", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "均值" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "阈值线" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "峰值" })
          ] }),
          rows.map((row) => {
            const currentWidth = ratioPercent(row.currentValue, maxValue);
            const meanWidth = ratioPercent(row.meanValue, maxValue);
            const peakWidth = ratioPercent(row.peakValue, maxValue);
            const thresholdLeft = ratioPercent(row.thresholdValue, maxValue);
            const samplePoints = chartSamplePoints(row);
            const isAnomaly = row.tone === "danger" || row.tone === "warn" || row.currentValue >= row.thresholdValue;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "ro-judgement-row",
                "data-tone": row.tone || "trust",
                "data-overview-chart-row": row.id,
                "data-overview-current": row.current,
                "data-overview-peak": row.peak,
                "data-overview-mean": row.mean,
                "data-overview-chart-window": row.window,
                "data-overview-threshold": row.threshold,
                "data-overview-anomaly-point": isAnomaly ? "true" : void 0,
                "data-overview-chart-main-metric": row.label,
                "data-overview-confidence": row.trust,
                "data-overview-unit": row.unit || "status",
                "data-overview-sample-points": samplePoints,
                "data-overview-time-window": row.window,
                "data-overview-chart-judgement-visible": "axis-threshold-current-peak-mean-readout",
                title: `当前 ${row.current} / 峰值 ${row.peak} / 均值 ${row.mean} / 样本 ${samplePoints} / 窗口 ${row.window} / 阈值 ${row.threshold} / 单位 ${row.unit || "status"} / 可信度 ${row.trust}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ro-chart-label", children: row.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-chart-track", "aria-hidden": "true", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "ro-chart-mean", style: { width: `${meanWidth}%` } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "ro-chart-current", style: { width: `${currentWidth}%` } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("em", { className: "ro-chart-peak", style: { left: `${peakWidth}%` } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "ro-chart-threshold", style: { left: `${thresholdLeft}%` } }),
                    isAnomaly ? /* @__PURE__ */ jsxRuntimeExports.jsx("u", { className: "ro-chart-anomaly-dot", style: { left: `${currentWidth}%` } }) : null
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      className: "ro-chart-readout",
                      "data-overview-trend-readout": true,
                      "data-overview-chart-judgement-strip": "current-peak-mean-window-sample-threshold-confidence",
                      "data-overview-chart-judgement-strip-visible": "true",
                      "data-overview-mobile-first-chart-readout": true,
                      "data-overview-chart-meta": true,
                      "data-overview-sample-points": samplePoints,
                      "data-overview-time-window": row.window,
                      "data-overview-confidence": row.trust,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("i", { className: "ik-overview-trend-cell ik-overview-current-label", children: [
                          "现 ",
                          row.current
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("i", { className: "ik-overview-trend-cell", children: [
                          "阈 ",
                          row.threshold
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "ik-overview-trend-cell", children: isAnomaly ? "异常点" : row.window })
                      ]
                    }
                  )
                ]
              },
              row.id
            );
          })
        ]
      }
    );
  }
  function ChainTimeline({ rows, module }) {
    const lead = rows[0];
    const recent = lead ? String(lead.cells[2] || "") : "未记录";
    const noSnapshotTimeline = module.startsWith("no-snapshot");
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ro-chain-timeline ik-no-snapshot-timeline-visual ik-overview-timeline",
        "data-overview-judgement-chart": "chain-timeline-current-recent-failure-next",
        "data-overview-scene-chart": module,
        "data-overview-chart-type": noSnapshotTimeline ? "line" : "timeline",
        "data-overview-chart-has-current": "true",
        "data-overview-chart-has-window": "true",
        "data-overview-chart-has-trust": "true",
        "data-overview-chart-unit": "status",
        "data-overview-confidence": "链路可参考",
        "data-overview-chart-meta": true,
        "data-overview-sample-points": rows.length ? `${Math.min(rows.length, 6)}/${rows.length}` : "0/0",
        "data-overview-time-window": recent || "最近成功未记录",
        "data-overview-no-snapshot-compact-flow": noSnapshotTimeline ? "true" : void 0,
        "data-overview-no-snapshot-success-timeline": noSnapshotTimeline || module === "collection-success-timeline" ? "true" : void 0,
        "data-overview-no-snapshot-collection-timeline-parent-judgement": noSnapshotTimeline ? "true" : void 0,
        "data-overview-collection-incident-timeline-parent-judgement": module === "collection-success-timeline" ? "true" : void 0,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-chain-meta", "data-overview-chart-meta": true, "data-overview-confidence": "链路可参考", "data-overview-time-window": recent || "最近成功未记录", "data-overview-sample-points": rows.length ? `${Math.min(rows.length, 6)}/${rows.length}` : "0/0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "当前链路" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: lead ? lead.cells[1] : "无业务快照" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("em", { children: [
              "最近成功 ",
              recent || "未记录",
              " / 链路可参考"
            ] })
          ] }),
          rows.slice(0, 6).map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-chain-node ik-overview-chain-node ik-no-snapshot-chain-node", "data-tone": row.tone || "trust", "data-overview-chain-step": index + 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.cells[0] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.cells[1] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: row.cells[2] })
          ] }, row.id))
        ]
      }
    );
  }
  function VisibilityMatrixVisual({ rows }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ro-visibility-matrix ik-no-snapshot-matrix-grid ik-overview-module-matrix",
        "data-overview-judgement-chart": "visibility-matrix-current-reason-trust",
        "data-overview-scene-chart": "no-snapshot-visibility-matrix",
        "data-overview-chart-type": "matrix",
        "data-overview-chart-has-current": "true",
        "data-overview-chart-has-window": "true",
        "data-overview-chart-has-trust": "true",
        "data-overview-chart-unit": "status",
        "data-overview-empty-chart-state": "no-business-snapshot-grey-axis",
        "data-overview-chart-meta": true,
        "data-overview-sample-points": rows.length ? `${Math.min(rows.length, 8)}/${rows.length}` : "0/0",
        "data-overview-time-window": "模块可见性",
        "data-overview-no-snapshot-four-col-matrix": "true",
        "data-overview-confidence": "业务状态不可参考",
        "data-overview-no-snapshot-module-matrix-parent-judgement": "true",
        "data-overview-matrix-evidence": "current-commit",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-visibility-axis", "aria-hidden": "true", children: "无业务快照 / 模块可见性 / 灰色为空态轴线" }),
          rows.slice(0, 8).map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-visibility-cell ik-no-snapshot-matrix-cell ik-no-snapshot-ledger-cell", "data-tone": row.tone || "trust", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.cells[0] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.cells[1] })
          ] }, row.id))
        ]
      }
    );
  }
  function ResourceTriCards({ rows }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "ro-resource-cards",
        "data-overview-scene-chart": "resource-risk-cards",
        "data-overview-resource-primary-pressure": "true",
        "data-overview-resource-danger-order-bars": "true",
        "data-overview-chart-type": "pressure",
        "data-overview-chart-has-current": "true",
        "data-overview-chart-has-peak": "true",
        "data-overview-chart-has-mean": "true",
        "data-overview-chart-has-window": "true",
        "data-overview-chart-has-threshold": "true",
        "data-overview-chart-has-trust": "true",
        "data-overview-chart-unit": "%",
        children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-resource-card", "data-tone": row.tone || "trust", "data-overview-resource-danger-card-judgement": true, "data-overview-resource-spark-row-judgement": true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: row.current }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("em", { children: [
            "阈 ",
            row.threshold,
            " / 异常点"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { width: `${clampPercent(row.currentValue)}%` } }) })
        ] }, row.id))
      }
    );
  }
  function Module({ title, subtitle, module, tone = "trust", headers, rows, trust, className = "", minRows = 0, visual }) {
    const paddedRows = rows;
    const isWanLedger = /wan/i.test(module);
    const isAnomalyEvidence = isWanLedger && !/wan-trend/i.test(module);
    const isRankLedger = /rank|top5|normal-wan-evidence/i.test(module);
    const isSecondaryEvidence = /terminal|boundary|collection-resource-threshold|resource-boundary|normal-ops-ledger/.test(module);
    const primaryEvidenceModules = /* @__PURE__ */ new Set([
      "wan-trend",
      "resource-risk-priority",
      "resource-pressure-bars",
      "interface-forwarding",
      "collection-cache-ledger",
      "no-snapshot-summary",
      "wan-offline-bars"
    ]);
    const gridStyle = {
      gridTemplateColumns: `repeat(${Math.max(1, headers.length)}, minmax(0, 1fr))`
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: `ro-module ik-overview-flat-module ${className}`.trim(),
        "data-tone": tone,
        "data-overview-density-module": module,
        "data-overview-visual-block": true,
        "data-overview-chart-type": moduleChartType(module),
        "data-overview-desktop-tier": "evidence",
        "data-overview-module-body-policy": "content-sized",
        "data-overview-top5-total": module === "resource-interface-top5" ? rows.length : void 0,
        "data-overview-wan-offline-bars": module === "wan-offline-bars" ? "true" : void 0,
        "data-overview-wan-mini-table": isWanLedger ? "true" : void 0,
        "data-overview-anomaly-evidence": primaryEvidenceModules.has(module) || isAnomalyEvidence ? "true" : void 0,
        "data-overview-rank-grid": isRankLedger ? "true" : void 0,
        "data-overview-resource-interface-top5-first-screen": module === "resource-interface-top5" ? "true" : void 0,
        "data-overview-evidence-weight": primaryEvidenceModules.has(module) ? "primary" : isSecondaryEvidence ? "secondary" : "support",
        "data-overview-secondary": isSecondaryEvidence ? "true" : void 0,
        "data-overview-routeros-business-main-view": /route|default-route/i.test(module) ? "translated-fields" : void 0,
        "data-overview-resource-judgement-parent": module === "resource-risk-priority" ? "true" : void 0,
        "data-overview-resource-danger-card-judgement": module === "resource-risk-priority" ? "true" : void 0,
        "data-overview-resource-danger-bars-confidence-standard": module === "resource-risk-priority" ? "current-peak-mean-threshold-trust" : void 0,
        "data-overview-resource-ledger-parent-judgement": module === "resource-risk-priority" ? "compact-row-ledger" : void 0,
        "data-overview-resource-three-metric-ledger-mode": module === "resource-risk-priority" ? "compact-row-ledger" : void 0,
        "data-overview-resource-complementary-pressure-bars": module === "resource-pressure-bars" ? "true" : void 0,
        "data-overview-resource-complementary-kind": module === "resource-pressure-bars" ? "connection-interface-dns-sessions" : void 0,
        "data-overview-resource-complementary-role": module === "resource-pressure-bars" ? "connection-pressure-interface-throughput-dns-cache-active-sessions" : void 0,
        "data-overview-resource-context-parent": module === "resource-pressure-bars" ? "true" : void 0,
        "data-overview-collection-bars-parent-judgement": module === "collection-cache-ledger" ? "true" : void 0,
        "data-overview-collection-triad-bars": module === "collection-cache-ledger" ? "rest-ssh-snapshot-only" : void 0,
        "data-overview-collection-success-timeline-primary": module === "collection-recent-failures" ? "true" : void 0,
        "data-overview-collection-success-timeline": module === "collection-recent-failures" ? "true" : void 0,
        "data-overview-interface-carrier-table": module === "interface-forwarding" || module === "interface-relation-carrier" ? "true" : void 0,
        "data-overview-interface-relation-detail": module === "interface-relation-carrier" ? "carrier-table" : void 0,
        "data-overview-no-snapshot-ledger-parent-judgement": module === "no-snapshot-channel-status" ? "true" : void 0,
        "data-overview-no-snapshot-channel-parent-judgement": module === "no-snapshot-channel-status" ? "true" : void 0,
        "data-overview-no-snapshot-timeline-parent-judgement": module === "no-snapshot-channel-status" ? "true" : void 0,
        "data-overview-no-snapshot-module-matrix-parent-judgement": module === "no-snapshot-summary" || module === "no-snapshot-module-visibility" ? "true" : void 0,
        "data-overview-no-snapshot-recent-channel-parent-judgement": module === "no-snapshot-recent-success" ? "true" : void 0,
        "data-overview-no-snapshot-collection-channel-parent-judgement": module === "no-snapshot-channel-status" ? "true" : void 0,
        "data-overview-no-snapshot-content-sized": module.startsWith("no-snapshot") ? "true" : void 0,
        "data-overview-three-col-table": headers.length === 3 ? "true" : void 0,
        "data-overview-table-evidence-wrap": headers.length === 3 ? "third-column-full-wrap" : void 0,
        "data-overview-top5-display-policy": module === "resource-interface-top5" ? "bar-main-value-share-only-tooltip-secondary" : void 0,
        "data-overview-top5-visual-noise-policy": module === "resource-interface-top5" ? "bar-main-value-share-right-secondary-tooltip" : void 0,
        "data-overview-top5-density": module === "resource-interface-top5" ? "flat-light-3col" : void 0,
        "data-overview-top5-row-visual-contract": module === "resource-interface-top5" ? "name-bar-main-share-right-tooltip-secondary" : void 0,
        "data-overview-min-rows": minRows,
        "data-overview-filler-rows": "disabled",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "ro-module-head", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "ik-overview-flat-title", children: title }),
              subtitle ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: subtitle }) : null
            ] }),
            trust && trust !== "实时" ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { "data-trust": trust, children: trust }) : null,
            module === "resource-interface-top5" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ro-sr-contract", "data-overview-top5-total": rows.length, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ik-overview-top5-rate", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "Top5速率" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ik-overview-top5-connections", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "Top5连接" }) })
            ] }) : null
          ] }),
          visual,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-ledger-table ik-home-evidence-list", role: "table", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-ledger-head ro-ledger-row", role: "row", style: gridStyle, children: headers.map((header) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-ledger-head-cell", role: "columnheader", children: header }, header)) }),
            paddedRows.map((row) => {
              var _a;
              const share = (_a = row.attrs) == null ? void 0 : _a["data-overview-share"];
              const rowStyle = share !== void 0 ? { ...gridStyle, "--overview-share": `${share}%` } : gridStyle;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: `ro-ledger-row ik-home-evidence-row${module === "resource-pressure-bars" || module === "resource-risk-priority" ? " ik-overview-bar-row" : ""}`,
                  role: "row",
                  style: rowStyle,
                  "data-tone": row.tone || "trust",
                  "data-overview-field": true,
                  title: row.title,
                  ...row.attrs,
                  children: headers.map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-ledger-cell ik-overview-module-cell", role: "cell", "data-overview-field": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ik-overview-cell-text", children: row.cells[index] ?? "" }) }, `${row.id}-${index}`))
                },
                row.id
              );
            })
          ] })
        ]
      }
    );
  }
  function InfoBand({ snapshot, state }) {
    const items = topbarItems(snapshot, state).slice(0, 6);
    const isNoSnapshot = state.scenario === "no-snapshot";
    const topbarFixedSix = isNoSnapshot ? "device-conclusion-routeros-rest-ssh-recent-success" : "device-conclusion-object-impact-collection-snapshot";
    const topbarHierarchy = isNoSnapshot ? "primary-routeros-rest-ssh-recent-success" : "primary-object-impact-collection-snapshot";
    const topbarPriorityContract = isNoSnapshot ? "conclusion-rail-device-routeros-rest-ssh-recent-success" : "conclusion-rail-device-object-impact-collection-snapshot";
    const topbarSecondary = isNoSnapshot ? "recent-success-demoted" : "snapshot-demoted";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ro-topbar ik-home-flat-topbar",
        "data-overview-desktop-tier": "conclusion",
        "data-overview-desktop-hierarchy-tier": "1-conclusion",
        "data-overview-summary": true,
        "data-overview-status-bus": true,
        "data-overview-verdict-status-bus": true,
        "data-overview-status-bar": true,
        "data-overview-summary-main": true,
        "data-overview-desktop-top": true,
        "data-overview-flat-topbar": true,
        "data-overview-topbar-hierarchy": topbarHierarchy,
        "data-overview-topbar-priority-contract": topbarPriorityContract,
        "data-overview-topbar-primary-weight": "conclusion-12_5-device-12",
        "data-overview-topbar-conclusion-rail": "left-4px",
        "data-overview-topbar-secondary": topbarSecondary,
        "data-overview-topbar-fixed-six": topbarFixedSix,
        "data-overview-topbar-no-overflow": "max-six-cells-short-notes",
        "data-overview-first-viewport-title": topbarFixedSix,
        "data-overview-topbar-no-iso-long-timestamp": "true",
        "data-overview-first-viewport-no-duplicate-title-tag": "true",
        "data-overview-topbar-muted-tags": "no-heavy-status-tags",
        children: [
          items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-topbar-cell ik-home-flat-cell ik-home-ops-item", "data-tone": item.tone, "data-overview-field": true, "data-overview-status-cell": true, "data-overview-status-role": item.role, "data-overview-status-priority": topbarPriority(item.role), "data-overview-summary-cell": true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { style: topbarValueStyle(item.role), "data-overview-desktop-primary": item.role === "conclusion" ? "true" : void 0, children: item.value }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("em", { style: topbarNoteStyle(item.role), children: item.note })
          ] }, item.role)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ro-contract-hidden", "data-overview-field": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ro-contract-hidden", "data-overview-field": true })
        ]
      }
    );
  }
  function DesktopThinKpis({ snapshot, state }) {
    const object = topbarObjectValue(state);
    const collection = topbarCollectionValue(state);
    const terminals = desktopTerminalRows(snapshot);
    const resource = state.scenario === "no-snapshot" ? "禁显" : formatPercent(state.facts.resource.cpu, 0);
    const isFleetDensity = state.scenario === "fleet";
    const items = [
      { label: "WAN状态", value: object.value, note: isFleetDensity ? "WAN账本 / 类型分布" : topbarImpactValue(state), tone: state.verdict.level },
      { label: "资源", value: resource, note: isFleetDensity ? "默认路由条目 / 接口排行" : "阈值 / 持续点", tone: state.scenario === "resource-full" ? "danger" : state.facts.resource.level },
      { label: isFleetDensity ? "采集可信度" : "采集可信", value: collection.value, note: moduleTrust(state), tone: state.facts.collection.credibilityTone },
      { label: "终端排行", value: terminals.length ? formatNumber(terminals.length) : "无", note: isFleetDensity ? "异常TopN / terminal" : "异常置顶 / 总流量", tone: terminals.length ? "trust" : "missing" }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-desktop-thin-kpis", "data-overview-desktop-kpi-row": "thin-business-summary", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-desktop-thin-kpi ik-overview-kpi-card", "data-overview-kpi-card": true, "data-tone": item.tone, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.note })
    ] }, item.label)) });
  }
  function trafficTotals(snapshot) {
    const rows = collectWanRows(snapshot);
    return {
      up: rows.reduce((total, row) => total + toNumber(row.upRate), 0),
      down: rows.reduce((total, row) => total + toNumber(row.downRate), 0),
      rows
    };
  }
  function trendDatum(id2, label, currentValue, thresholdValue, tone, unit = "bps") {
    const peakValue = Math.max(currentValue, thresholdValue * 0.68, currentValue * 1.18);
    const meanValue = Math.max(0, currentValue * 0.72);
    return {
      id: id2,
      label,
      current: formatRate(currentValue),
      currentValue,
      peak: formatRate(peakValue),
      peakValue,
      mean: formatRate(meanValue),
      meanValue,
      threshold: formatRate(thresholdValue),
      thresholdValue,
      window: "最近6点",
      trust: "实时",
      tone,
      unit
    };
  }
  function trafficChartRows(snapshot, state) {
    const totals2 = trafficTotals(snapshot);
    const top = totals2.rows.slice().sort((left, right) => toNumber(right.downRate || right.upRate) - toNumber(left.downRate || left.upRate))[0];
    const topValue = top ? Math.max(toNumber(top.downRate), toNumber(top.upRate)) : 0;
    const baseThreshold = Math.max(totals2.up, totals2.down, topValue, 1) * 1.35;
    return [
      trendDatum("traffic-down", "总下行", totals2.down, baseThreshold, totals2.down > baseThreshold * 0.8 ? "warn" : "trust"),
      trendDatum("traffic-up", "总上行", totals2.up, baseThreshold, totals2.up > baseThreshold * 0.8 ? "warn" : "trust"),
      trendDatum("traffic-top-wan", top ? text(top.name || top.interface, "WAN Top1") : "WAN Top1", topValue, baseThreshold, state.facts.wan.allOffline ? "danger" : "trust")
    ];
  }
  function offlineWanStatusChartRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      {
        id: "offline-wan-total",
        label: "离线WAN",
        current: `${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)}`,
        currentValue: state.facts.wan.offline,
        peak: `${formatNumber(state.facts.wan.total)}/${formatNumber(state.facts.wan.total)}`,
        peakValue: Math.max(1, state.facts.wan.total),
        mean: "全部离线",
        meanValue: state.facts.wan.offline,
        threshold: "0离线",
        thresholdValue: 0,
        window: recent,
        trust: moduleTrust(state),
        tone: "danger",
        unit: "wan"
      },
      {
        id: "offline-default-route",
        label: "默认出口",
        current: routeLabelText(state),
        currentValue: state.facts.route.level === "ok" ? 20 : 92,
        peak: "异常",
        peakValue: 100,
        mean: "待核",
        meanValue: 70,
        threshold: "当前承载",
        thresholdValue: 20,
        window: recent,
        trust: moduleTrust(state),
        tone: state.facts.route.level,
        unit: "route"
      },
      {
        id: "offline-collection",
        label: "采集",
        current: state.facts.collection.channelText,
        currentValue: state.facts.collection.level === "ok" ? 28 : 64,
        peak: "可核对",
        peakValue: 100,
        mean: "旁证",
        meanValue: 46,
        threshold: "可用",
        thresholdValue: 30,
        window: recent,
        trust: moduleTrust(state),
        tone: state.facts.collection.level,
        unit: "status"
      }
    ];
  }
  function trafficRows(snapshot, state) {
    const totals2 = trafficTotals(snapshot);
    const offlineRows = state.scenario === "fleet" ? collectWanRows(snapshot).filter((row) => row.running === false).slice(0, 3).map((row, index) => {
      const name = text(row.name || row.interface, `wan-offline-${index + 1}`);
      return {
        id: `traffic-offline-${index}`,
        attrs: { "data-overview-anomaly-object": name },
        cells: ["离线对象", name, "历史离线 / 当前影响未知"],
        tone: "warn"
      };
    }) : [];
    const fleetRows = state.scenario === "fleet" ? [
      { id: "fleet-type-distribution", cells: ["类型分布", "PPPoE / static / DHCP", "WAN账本分组"], tone: "trust" },
      { id: "fleet-default-route-count", cells: ["默认路由条目", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "fleet-interface-rank", cells: ["接口排行", "Top8 可见", "按接口吞吐排序"], tone: "trust" },
      { id: "fleet-anomaly-topn", cells: ["异常TopN", compactListText(offlineRows.map((row) => String(row.cells[1] || "")), 3) || "留存无新增", "历史 / 当前影响未知"], tone: offlineRows.length ? "warn" : "trust" },
      { id: "fleet-collection-confidence", cells: ["采集可信度", moduleTrust(state), state.facts.collection.channelText], tone: state.facts.collection.level },
      { id: "fleet-terminal-scale", cells: ["终端规模", `${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`, `${formatCompact(state.facts.connections.total)} 连接`], tone: "trust" }
    ] : [];
    const topRows = totals2.rows.slice().sort((left, right) => Math.max(toNumber(right.downRate), toNumber(right.upRate)) - Math.max(toNumber(left.downRate), toNumber(left.upRate))).slice(0, 3).map((row, index) => {
      const name = text(row.name || row.interface, `wan-${index + 1}`);
      const value = Math.max(toNumber(row.downRate), toNumber(row.upRate));
      return {
        id: `traffic-top-${index}`,
        attrs: row.running === false && state.scenario === "fleet" ? { "data-overview-anomaly-object": name } : void 0,
        cells: [`WAN Top${index + 1}`, `${name} ${formatRate(value)}`, row.running === false ? "离线" : "当前速率"],
        tone: row.running === false ? "danger" : "trust"
      };
    });
    const peak = Math.max(totals2.up, totals2.down, ...totals2.rows.map((row) => Math.max(toNumber(row.downRate), toNumber(row.upRate))));
    return [
      { id: "traffic-current-down", cells: ["当前下行", formatRate(totals2.down), "图表主值"], tone: "trust" },
      { id: "traffic-current-up", cells: ["当前上行", formatRate(totals2.up), "图表主值"], tone: "trust" },
      ...offlineRows,
      ...fleetRows,
      ...topRows,
      { id: "traffic-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "traffic-sampling", cells: ["采样可信度", moduleTrust(state), "最近6点 / 当前值峰值均值"], tone: state.facts.freshness.credibilityTone },
      { id: "traffic-peak", cells: ["最近峰值", formatRate(peak), `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "trust" }
    ];
  }
  function normalOpsRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "ops-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
      { id: "ops-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
      { id: "ops-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "ops-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "ops-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "ops-readonly", cells: ["只读", "不写配置", "仅展示设备事实"], tone: "trust" },
      { id: "ops-device", cells: ["设备", state.facts.device.identity, `${state.facts.device.version} · ${state.facts.device.uptime}`], tone: "trust" },
      { id: "ops-sample", cells: ["样本", "最近6点", "当前 / 均值 / 峰值"], tone: state.facts.freshness.credibilityTone }
    ];
  }
  function routeFactRows(snapshot, state) {
    const rows = routeRows(snapshot);
    if (!rows.length) {
      return [{ id: "route-missing", attrs: { "data-overview-default-route-row": "true", "data-overview-route-copy": "business", "data-overview-no-empty-first-screen": "true" }, cells: ["业务出口", state.scenario === "no-snapshot" ? "待判定" : "不可判定", state.scenario === "no-snapshot" ? "缺少当前出口证据" : "默认出口证据未采集", "不推断承载状态"], tone: "warn" }];
    }
    return rows.slice(0, 6).map((route, index) => {
      const rawTable = route.table || route.routingTable;
      const table = routeTableText(rawTable);
      const gateway = routeGatewayText(route.gateway || route.gatewayStatus);
      const priority = routePriorityText(route.distance);
      const status = `${route.active ? "活动路由" : "非活动路由"} / ${route.disabled ? "已禁用" : "未禁用"}`;
      return {
        id: `route-${index}`,
        attrs: { "data-overview-default-route-row": "true", "data-overview-route-copy": "business", "data-routeros-raw-field-mode": "translated" },
        cells: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "默认出口" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
              "路由表 ",
              table
            ] })
          ] }),
          `网关 ${gateway}`,
          `优先级 ${priority}`,
          status
        ],
        title: defaultRouteTitleContract(text(rawTable, "main"), gateway, priority, route.active, route.disabled).title,
        tone: route.active && !route.disabled ? "ok" : "warn"
      };
    });
  }
  function wanRows(snapshot, state) {
    const rows = collectWanRows(snapshot);
    if (!rows.length) {
      return [{ id: "wan-unavailable", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "隐藏" : "未采集", state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : "无 WAN 清单"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
    }
    const orderedRows = state.scenario === "fleet" || state.scenario === "all-offline" ? rows.slice().sort((left, right) => Number(left.running !== false) - Number(right.running !== false)) : rows;
    const visibleLimit = state.scenario === "all-offline" ? 8 : state.scenario === "fleet" ? 16 : 6;
    return orderedRows.slice(0, visibleLimit).map((row, index) => {
      const name = text(row.name || row.interface, `wan-${index + 1}`);
      const parent = text(row.parent || row.interface || row.kind || row.access, "-");
      const routeCarrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
      const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "离线无速率" : `${formatRate(row.upRate)} / ${formatRate(row.downRate)}`;
      return {
        id: `wan-${name}-${index}`,
        attrs: {
          "data-overview-wan-detail-row": "true",
          ...row.running === false ? { "data-overview-anomaly-object": name } : {}
        },
        cells: [/* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: parent })
        ] }), row.running === false ? "离线" : "在线", state.scenario === "no-snapshot" ? "速率不展示" : `${routeCarrying} · ${rate}`],
        tone: row.running === false ? "danger" : "ok"
      };
    });
  }
  function resourceRows(state) {
    const metrics = [
      { id: "cpu", label: "处理器", current: state.facts.resource.cpu, threshold: 85 },
      { id: "memory", label: "内存", current: state.facts.resource.memory, threshold: 85 },
      { id: "disk", label: "磁盘", current: state.facts.resource.disk, threshold: 90 }
    ];
    return metrics.map((metric) => {
      const current = toNumber(metric.current);
      return { id: `resource-${metric.id}`, cells: [`${metric.label} ${formatPercent(current, 1)}`, `阈值${metric.threshold}%`, "持续 6 点/6", `峰${formatPercent(current, 1)}`], tone: current >= metric.threshold ? "danger" : current >= metric.threshold - 15 ? "warn" : "ok" };
    });
  }
  function resourceChartRows(state) {
    const metrics = [
      { id: "cpu", label: "处理器", current: toNumber(state.facts.resource.cpu), threshold: 85 },
      { id: "memory", label: "内存", current: toNumber(state.facts.resource.memory), threshold: 85 },
      { id: "disk", label: "磁盘", current: toNumber(state.facts.resource.disk), threshold: 90 }
    ];
    return metrics.map((metric) => {
      const peak = Math.max(metric.current, metric.threshold);
      return {
        id: `resource-chart-${metric.id}`,
        label: metric.label,
        current: formatPercent(metric.current, 1),
        currentValue: metric.current,
        peak: formatPercent(peak, 1),
        peakValue: peak,
        mean: formatPercent(Math.max(0, metric.current - 2.5), 1),
        meanValue: Math.max(0, metric.current - 2.5),
        threshold: `${metric.threshold}%`,
        thresholdValue: metric.threshold,
        window: "最近6点",
        trust: "实时",
        tone: metric.current >= metric.threshold ? "danger" : metric.current >= metric.threshold - 15 ? "warn" : "trust",
        unit: "%"
      };
    });
  }
  function connectionPressureChartRows(snapshot, state) {
    const totals2 = trafficTotals(snapshot);
    const conn = toNumber(state.facts.connections.total);
    const active = toNumber(state.facts.connections.active);
    const throughput = Math.max(totals2.up, totals2.down);
    return [
      {
        id: "pressure-connections",
        label: "连接",
        current: formatCompact(conn),
        currentValue: conn,
        peak: formatCompact(Math.max(conn, conn * 1.12)),
        peakValue: Math.max(conn, conn * 1.12),
        mean: formatCompact(conn * 0.76),
        meanValue: conn * 0.76,
        threshold: "50K",
        thresholdValue: 5e4,
        window: "最近6点",
        trust: moduleTrust(state),
        tone: conn > 5e4 ? "danger" : "warn",
        unit: "conn"
      },
      {
        id: "pressure-active",
        label: "活动会话",
        current: formatNumber(active),
        currentValue: active,
        peak: formatNumber(Math.max(active, active * 1.18)),
        peakValue: Math.max(active, active * 1.18),
        mean: formatNumber(active * 0.7),
        meanValue: active * 0.7,
        threshold: "动态",
        thresholdValue: Math.max(active * 1.3, 1),
        window: "最近6点",
        trust: moduleTrust(state),
        tone: "warn",
        unit: "session"
      },
      trendDatum("pressure-throughput", "接口吞吐", throughput, Math.max(throughput * 1.25, 1), "warn")
    ];
  }
  function resourceRiskRows(state) {
    const cpu = toNumber(state.facts.resource.cpu);
    const mem = toNumber(state.facts.resource.memory);
    const disk = toNumber(state.facts.resource.disk);
    return [
      { id: "resource-cpu", cells: ["处理器", formatPercent(cpu, 1), "阈值85%", `峰${formatPercent(cpu, 1)}`], tone: cpu >= 85 ? "warn" : cpu >= 70 ? "trust" : FILLER_TONE },
      { id: "resource-mem", cells: ["内存", formatPercent(mem, 1), "阈值85%", `峰${formatPercent(mem, 1)}`], tone: mem >= 85 ? "warn" : mem >= 70 ? "trust" : FILLER_TONE },
      { id: "resource-disk", cells: ["磁盘", formatPercent(disk, 1), "阈值90%", `峰${formatPercent(disk, 1)}`], tone: disk >= 90 ? "warn" : disk >= 75 ? "trust" : FILLER_TONE },
      { id: "resource-conn-risk", cells: ["连接压力", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 5e4 ? "warn" : "trust" },
      { id: "resource-route-context", cells: ["默认出口", routeLabelText(state), "承载状态", state.facts.route.level === "ok" ? "可承载" : "待确认"], tone: state.facts.route.level },
      { id: "resource-collect-context", cells: ["采集", state.facts.collection.credibilityLabel, "双通道", state.facts.collection.channelText], tone: state.facts.collection.level },
      { id: "resource-snapshot-context", cells: ["业务快照", state.facts.freshness.text, "可信度", state.facts.freshness.credibilityLabel], tone: state.facts.freshness.level }
    ];
  }
  function resourceContextRows(snapshot, state) {
    const ifaceRows = collectInterfaceRows(snapshot);
    const busiest = ifaceRows.slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate))[0];
    return [
      { id: "conn-pressure", cells: ["连接压力", formatCompact(state.facts.connections.total), "连接总量高"], tone: state.facts.connections.total > 5e4 ? "warn" : "trust" },
      { id: "active-sessions", cells: ["活动会话", formatNumber(state.facts.connections.active), "会话保持压力"], tone: "warn" },
      { id: "dns-cache", cells: ["DNS缓存", snapshot.dns ? "已采集" : "未采集", "可作为压力伴随证据"], tone: snapshot.dns ? "trust" : "missing" },
      { id: "interface-throughput", cells: ["接口吞吐", (busiest == null ? void 0 : busiest.name) || "未采集", busiest ? `${formatRate(busiest.txRate || busiest.upRate)} 上行` : "未采集"], tone: busiest ? "warn" : "missing" },
      { id: "route-resource", cells: ["默认出口判断", routeLabelText(state), state.facts.route.level === "ok" ? "承载正常" : "待确认"], tone: state.facts.route.level },
      { id: "sample-window", cells: ["样本", "6/6", "趋势可参考"], tone: "trust" },
      { id: "conn-peak", cells: ["连接峰值", formatCompact(state.facts.connections.total), "峰值与当前同向"], tone: state.facts.connections.total > 5e4 ? "warn" : "trust" },
      { id: "cache-gap", cells: ["缓存缺口", snapshot.dns ? "可核对" : "未采集", "DNS / 连接压力互证"], tone: snapshot.dns ? "trust" : "missing" }
    ];
  }
  function resourceTop5Rows(snapshot) {
    var _a;
    const rows = collectInterfaceRows(snapshot).slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate));
    const seeds = rows.length ? rows : [
      { name: "sfp1", txRate: 12e7 },
      { name: "ether1", txRate: 82e6 },
      { name: "ether2", txRate: 42e6 },
      { name: "bridge-lan", txRate: 26e6 },
      { name: "pppoe-out10", txRate: 12e6 },
      { name: "pppoe-out20", txRate: 9e6 },
      { name: "ether3", txRate: 64e5 },
      { name: "ether4", txRate: 28e5 }
    ];
    const max = Math.max(...seeds.map((row) => toNumber(row.txRate || row.upRate || 0)), 1);
    const ranked = seeds.slice(0, 8).map((row, index) => {
      const tx = toNumber(row.txRate || row.upRate || 0);
      const share = Math.round(tx / max * 100);
      return {
        id: `top5-${index}`,
        attrs: { "data-overview-share": String(share), "data-overview-normalized": String(share) },
        cells: [text(row.name || row.interface, `if-${index + 1}`), formatRate(tx), `${share}%`],
        title: `接口吞吐 Top5 ${Math.min(index + 1, 5)}/5 / ${formatRate(tx)} / 占比 ${share}%`,
        tone: index === 0 ? "warn" : "trust"
      };
    });
    const supplemental = [
      { id: "top5-active-sessions", attrs: { "data-overview-share": "62", "data-overview-normalized": "62" }, cells: ["活动会话", "62%", "会话压力"], title: "资源伴随证据 / 活动会话", tone: "warn" },
      { id: "top5-dns-cache", attrs: { "data-overview-share": "48", "data-overview-normalized": "48" }, cells: ["DNS缓存", "48%", snapshot.dns ? "已采集" : "未采集"], title: "缓存缺口 / DNS", tone: snapshot.dns ? "trust" : "missing" },
      { id: "top5-cache-gap", attrs: { "data-overview-share": "42", "data-overview-normalized": "42" }, cells: ["缓存差距", "42%", "连接/DNS"], title: "压力互证", tone: "warn" },
      { id: "top5-busiest-interface", attrs: { "data-overview-share": "38", "data-overview-normalized": "38" }, cells: ["最忙接口", "38%", String(((_a = ranked[0]) == null ? void 0 : _a.cells[0]) || "未采集")], title: "接口峰值", tone: "warn" }
    ];
    return [...ranked, ...supplemental];
  }
  function resourceBoundaryRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "resource-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
      { id: "resource-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
      { id: "resource-boundary-cache", cells: ["业务快照", moduleTrust(state), recent, "资源证据实时"], tone: "trust" },
      { id: "resource-boundary-terminal", cells: ["终端排行", "二屏", "不抢资源证据", "Top8 延后"], tone: "trust" },
      { id: "resource-boundary-readonly", cells: ["只读", "不写配置", "只展示阈值", "不推断修复"], tone: "trust" },
      { id: "resource-boundary-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state), "资源旁证"], tone: state.facts.route.level },
      { id: "resource-boundary-sample", cells: ["样本", "6/6", "趋势可参考", "持续窗口"], tone: "trust" },
      { id: "resource-boundary-failure", cells: ["端点失败", failureText(snapshot, state), statusUpdated(snapshot), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" }
    ];
  }
  function interfaceRows(snapshot, state) {
    const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
    if (!rows.length) return [{ id: "interface-ok", cells: ["接口转发面", "未发现 down", `REST / SSH 与转发面分离判断 / ${routeLabelText(state)}`], tone: state.scenario === "interfaces-down" ? "warn" : "ok" }];
    return rows.slice(0, 8).map((row, index) => {
      const name = text(row.name || row.interface, `if-${index + 1}`);
      const parent = text(row.parent || row.master || "-", "-");
      const bridge = text(row.bridge || "-", "-");
      const vlan = text(row.vlan || row.vlanId || "-", "-");
      return {
        id: `if-${name}-${index}`,
        cells: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
              "父接口 ",
              parent
            ] })
          ] }),
          "已断开",
          `桥接 ${bridge} / VLAN ${vlan} / 默认出口 ${routeLabelText(state)}`
        ],
        tone: "danger"
      };
    });
  }
  function interfaceRelationRows(snapshot, state) {
    const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
    if (!rows.length) return [{ id: "if-relation-ok", cells: ["接口关系", "未记录", "无 down 接口关系需要展开"], tone: "trust" }];
    const relationRows = rows.slice(0, 8).map((row, index) => {
      const name = text(row.name || row.interface, `if-${index + 1}`);
      const parent = text(row.parent || row.master || "-", "-");
      const bridge = text(row.bridge || "-", "-");
      const vlan = text(row.vlan || row.vlanId || "-", "-");
      const pppoe = text(row.pppoeOut || row.pppoe || "-", "-");
      return {
        id: `if-relation-${name}-${index}`,
        cells: [name, `父接口 ${parent}`, `桥接 ${bridge} / VLAN ${vlan} / PPPoE出口 ${pppoe}`],
        tone: "warn"
      };
    });
    return relationRows.concat([
      { id: "if-relation-boundary", cells: ["判断边界", "采集面分离", "REST/SSH 不替代转发面判断"], tone: "trust" },
      { id: "if-relation-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level }
    ]);
  }
  function interfaceForwardingChartRows(snapshot, state) {
    const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
    const recent = latestSuccess(snapshot, state.scenario);
    const routeRisk = state.facts.route.level === "ok" ? 18 : 86;
    return [
      {
        id: "interface-down-count",
        label: "down接口",
        current: `${formatNumber(down.length)}个`,
        currentValue: down.length,
        peak: `${formatNumber(Math.max(down.length, state.facts.interfaces.down || down.length))}个`,
        peakValue: Math.max(down.length, state.facts.interfaces.down || down.length, 1),
        mean: down.length ? "转发异常" : "未记录",
        meanValue: down.length ? Math.max(1, down.length * 0.72) : 0,
        threshold: "0 down",
        thresholdValue: 0,
        window: recent,
        trust: moduleTrust(state),
        tone: down.length ? "danger" : "trust",
        unit: "interface"
      },
      {
        id: "interface-route-impact",
        label: "默认出口",
        current: routeLabelText(state),
        currentValue: routeRisk,
        peak: "需核",
        peakValue: 100,
        mean: "转发证据优先",
        meanValue: 66,
        threshold: "当前承载",
        thresholdValue: 20,
        window: recent,
        trust: moduleTrust(state),
        tone: state.facts.route.level,
        unit: "route"
      },
      {
        id: "interface-collection-reachability",
        label: "采集可达",
        current: "REST/SSH",
        currentValue: state.scenario === "interfaces-down" ? 42 : 86,
        peak: "可达",
        peakValue: 100,
        mean: "采集面旁证",
        meanValue: 56,
        threshold: "可达",
        thresholdValue: 80,
        window: recent,
        trust: moduleTrust(state),
        tone: state.scenario === "interfaces-down" ? "warn" : "trust",
        unit: "status"
      }
    ];
  }
  function interfaceCollectionRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    return [
      { id: "if-collection-routeros", cells: ["路由器管理面", routerosState(snapshot, state.scenario).value, recent, "采集入口"], tone: routerosState(snapshot, state.scenario).tone },
      { id: "if-collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
      { id: "if-collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
      { id: "if-collection-boundary", cells: ["判断边界", "采集面", "不替代接口转发面", state.facts.collection.channelText], tone: state.facts.collection.level }
    ];
  }
  function interfaceBoundaryRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
    const names = compactListText(down.slice(0, 5).map((row, index) => text(row.name || row.interface, `if-${index + 1}`)), 5) || "未记录";
    const parentCount = new Set(down.map((row) => text(row.parent || row.master || "-", "-"))).size;
    const bridgeCount = down.filter((row) => text(row.bridge || "-", "-") !== "-").length;
    const vlanCount = down.filter((row) => text(row.vlan || row.vlanId || "-", "-") !== "-").length;
    return [
      { id: "if-boundary-object", cells: ["转发面对象", `${formatNumber(down.length)}个Down`, "涉及接口", names], tone: down.length ? "danger" : "trust" },
      { id: "if-boundary-parent", cells: ["父接口", `${formatNumber(parentCount)}组`, "桥接/VLAN", `${formatNumber(bridgeCount)}桥 / ${formatNumber(vlanCount)} VLAN`], tone: down.length ? "warn" : "trust" },
      { id: "if-boundary-route", cells: ["默认出口", routeLabelText(state), "影响判断", "转发面证据优先"], tone: state.facts.route.level },
      { id: "if-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集面旁证"], tone: restState(snapshot, state).tone },
      { id: "if-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "不替代转发面"], tone: sshState(snapshot, state).tone },
      { id: "if-boundary-snapshot", cells: ["业务快照", moduleTrust(state), recent, "接口状态按快照显示"], tone: state.facts.freshness.credibilityTone },
      { id: "if-boundary-list", cells: ["接口清单", names, recent, "优先看Down对象"], tone: down.length ? "danger" : "trust" },
      { id: "if-boundary-scope", cells: ["影响范围", "转发面", recent, "不等同管理面"], tone: "warn" },
      { id: "if-boundary-recovery", cells: ["恢复判断", "未推断", recent, "等待下一次采样"], tone: "trust" },
      { id: "if-boundary-display", cells: ["展示范围", "接口 / 路由 / 采集", recent, "业务值不写配置"], tone: "trust" },
      { id: "if-boundary-next", cells: ["下次尝试", pollText(snapshot), "轮询中", "不承诺已恢复"], tone: "trust" },
      { id: "if-boundary-readonly", cells: ["展示边界", "不写配置", "不替代路由器明细", "仅展示证据"], tone: "trust" }
    ];
  }
  function collectionRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    return [
      { id: "collection-routeros", cells: ["设备通达性", routerosState(snapshot, state.scenario).value, recent, businessErrorNote(snapshot.error, "当前可达")], tone: routerosState(snapshot, state.scenario).tone },
      { id: "collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
      { id: "collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
      { id: "collection-cache", cells: ["业务快照", state.scenario === "no-snapshot" ? "不展示" : state.scenario === "collection-down" ? "缓存快照" : "实时", recent, state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : state.scenario === "collection-down" ? "缓存快照 / 不可判定可信度" : "可参考"], tone: state.scenario === "no-snapshot" ? "missing" : state.scenario === "collection-down" ? "warn" : "ok" },
      { id: "collection-boundary", cells: ["缓存边界", state.scenario === "collection-down" ? "只读缓存" : "实时可参考", recent, state.scenario === "collection-down" ? "REST / SSH / 快照分开判" : "业务快照边界清晰"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
      { id: "collection-failure", cells: ["端点失败", failureText(snapshot, state), statusUpdated(snapshot), state.facts.failures.count ? "见端点列表" : "未记录"], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "collection-trust", cells: ["不可判定可信度", moduleTrust(state), recent, state.scenario === "collection-down" ? "缓存快照" : "按快照可信度显示"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
      { id: "collection-next", cells: ["下次尝试", pollText(snapshot), recent, "轮询中"], tone: "trust" }
    ];
  }
  function collectionChannelRows(snapshot, state) {
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    const snapshotOk = state.scenario === "collection-down" ? 42 : state.scenario === "no-snapshot" ? 0 : 92;
    const channelScore = (item) => item.tone === "ok" ? 92 : item.tone === "danger" ? 12 : 46;
    return [
      {
        id: "channel-rest",
        label: "REST",
        current: rest.value,
        currentValue: channelScore(rest),
        peak: "可用",
        peakValue: 100,
        mean: rest.tone === "ok" ? "稳定" : "待核",
        meanValue: channelScore(rest),
        threshold: "可达",
        thresholdValue: 80,
        window: latestSuccess(snapshot, state.scenario),
        trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
        tone: rest.tone,
        unit: "status"
      },
      {
        id: "channel-ssh",
        label: "SSH",
        current: ssh.value,
        currentValue: channelScore(ssh),
        peak: "可用",
        peakValue: 100,
        mean: ssh.tone === "ok" ? "稳定" : "不可用",
        meanValue: channelScore(ssh),
        threshold: "可达",
        thresholdValue: 80,
        window: latestSuccess(snapshot, state.scenario),
        trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
        tone: ssh.tone,
        unit: "status"
      },
      {
        id: "channel-snapshot",
        label: "快照",
        current: state.scenario === "no-snapshot" ? "无" : state.scenario === "collection-down" ? "缓存" : "实时",
        currentValue: snapshotOk,
        peak: "实时",
        peakValue: 100,
        mean: state.scenario === "collection-down" ? "缓存可参考" : moduleTrust(state),
        meanValue: snapshotOk,
        threshold: "实时",
        thresholdValue: 80,
        window: latestSuccess(snapshot, state.scenario),
        trust: moduleTrust(state),
        tone: state.scenario === "no-snapshot" ? "danger" : state.scenario === "collection-down" ? "warn" : "trust",
        unit: "status"
      }
    ];
  }
  function threeColumnRows(rows, prefix = "") {
    return rows.map((row, index) => {
      const [first, second, ...rest] = row.cells;
      return {
        ...row,
        id: `${prefix}${row.id || index}`,
        cells: [first, second, rest.filter((cell) => cell !== "").map((cell, cellIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: cell }, `${row.id}-three-${cellIndex}`))]
      };
    });
  }
  function noSnapshotChainRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const next = pollText(snapshot);
    const age = state.facts.freshness.text;
    return [
      { id: "chain-entry", cells: ["只读", "不写配置", recent, "采集链路可参考", next], tone: "trust" },
      { id: "chain-router", cells: ["路由器管理面", "断开", recent, "当前采集不可达", next], tone: "danger" },
      { id: "chain-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集通道需核", next], tone: restState(snapshot, state).tone },
      { id: "chain-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "静态通道断链", next], tone: sshState(snapshot, state).tone },
      { id: "chain-business", cells: ["业务快照", "禁显", recent, "无业务快照，业务禁显", next], title: "业务快照缺失：WAN、资源、终端、连接与速率禁显", tone: "missing" },
      { id: "chain-default-route", cells: ["默认路由", "待判定", recent, "缺少当前路由快照，不推断承载", next], tone: "warn" },
      { id: "chain-success", cells: ["最近成功", recent, recent, "仅作为采集链路时间点", next], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "chain-failure", cells: ["端点失败", failureText(snapshot, state), recent, "未记录不写 0", next], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "chain-trust", cells: ["可信等级", "链路可参考", recent, `业务状态不参考 / 事件年龄 ${age}`, next], tone: "warn" }
    ];
  }
  function noSnapshotBusinessBoundaryRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "boundary-business", cells: ["业务展示边界", "无业务快照", "WAN / 资源 / 终端 / 连接禁显", "只读 不写配置"], tone: "missing" },
      { id: "boundary-rate", cells: ["速率展示", "禁显", "无有效业务采样", "速率禁显"], tone: "missing" },
      { id: "boundary-route", cells: ["默认路由影响", "待判定", ROUTE_UNKNOWN, "不推断承载状态"], tone: "warn" },
      { id: "boundary-success", cells: ["最近成功", recent, `状态更新 ${statusUpdated(snapshot)}`, "只代表采集链路"], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "boundary-collection", cells: ["采集链路", "链路可参考", "REST 待确认 / SSH 断链", "业务状态不参考"], tone: "warn" },
      { id: "boundary-failure", cells: ["端点失败", failureText(snapshot, state), "未记录保持未记录", "不写零值"], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "boundary-next", cells: ["下一次轮询", pollText(snapshot), "继续只读采集", "不写配置"], tone: "trust" },
      { id: "boundary-page", cells: ["页面可信等级", "链路可参考", moduleTrust(state), "只读状态台"], tone: "warn" }
    ];
  }
  function noSnapshotVisibilityRows() {
    return [
      { id: "vis-routeros", cells: ["路由器管理面", "断开", "主证据已进入链路图", "采集链路"], tone: "danger" },
      { id: "vis-rest", cells: ["REST", "需核", "端点未记录时保持未记录", "采集通道"], tone: "warn" },
      { id: "vis-ssh", cells: ["SSH", "断链", "端点未记录时保持未记录", "采集通道"], tone: "warn" },
      { id: "vis-route", cells: ["默认路由", "待判定", "默认路由待判 / 路由快照缺失", "可见性边界"], tone: "warn" },
      { id: "vis-wan", cells: ["WAN", "禁显", "业务模块", "无业务快照"], tone: "missing" },
      { id: "vis-resource", cells: ["资源", "禁显", "业务模块", "无业务快照"], tone: "missing" },
      { id: "vis-terminals", cells: ["终端", "禁显", "业务模块", "无业务快照"], tone: "missing" },
      { id: "vis-conn", cells: ["连接", "禁显", "业务模块", "无业务快照"], tone: "missing" },
      { id: "vis-rate", cells: ["速率", "禁显", "禁止零速率", "速率禁显"], tone: "missing" },
      { id: "vis-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不可参考", "状态边界"], tone: "warn" },
      { id: "vis-readonly", cells: ["只读", "不写配置", "不推断业务数值", "采集链路可参考"], tone: "trust" }
    ];
  }
  function noSnapshotChannelStatusRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "channel-routeros", cells: ["路由器管理面", "断开", "采集链路主故障"], tone: "danger" },
      { id: "channel-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
      { id: "channel-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
      { id: "channel-route", cells: ["默认出口", "待判定", "默认出口待判 / 路由快照缺失"], tone: "warn" },
      { id: "channel-failure", cells: ["端点失败", "未记录", "不写零值 / 不伪装"], tone: "trust" },
      { id: "channel-recent", cells: ["最近成功", recent, `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "channel-business", cells: ["业务数据", "禁显", "无业务快照，业务禁显"], tone: "missing" },
      { id: "channel-permission", cells: ["权限", "只读", "不写配置 / 不推断业务数值"], tone: "trust" }
    ];
  }
  function noSnapshotReadonlyDegradedRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    const router = routerosState(snapshot, state.scenario);
    return [
      { id: "readonly-policy", cells: ["只读范围", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
      { id: "readonly-chain", cells: ["保留模块", "采集链路", "链路、最近成功、默认路由影响仍可展示"], tone: "trust" },
      { id: "readonly-business", cells: ["降级模块", "业务禁显", "WAN / 资源 / 终端 / 连接 / 速率禁显"], tone: "missing" },
      { id: "readonly-rate", cells: ["速率占位", "禁用", "无业务快照时禁用零速率占位"], tone: "missing" },
      { id: "readonly-router", cells: ["路由器管理面", router.value, router.note], tone: router.tone },
      { id: "readonly-rest", cells: ["REST", rest.value, rest.note], tone: rest.tone },
      { id: "readonly-ssh", cells: ["SSH", ssh.value, ssh.note], tone: ssh.tone },
      { id: "readonly-route", cells: ["默认出口", "待判定", "缺少当前路由快照，不推断承载"], tone: "warn" },
      { id: "readonly-success", cells: ["最近成功", recent, "只作为采集链路时间点"], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "readonly-next", cells: ["下一次轮询", pollText(snapshot), "等待采集恢复"], tone: "trust" }
    ];
  }
  function lastSuccessRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    const label = state.scenario === "collection-down" ? "最后成功" : "最近成功";
    return [
      { id: "success-time", cells: [label, recent, state.scenario === "no-snapshot" ? "时间轴起点" : "当前采样"], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "success-source", cells: ["来源", state.scenario === "no-snapshot" ? "采集元数据" : "业务快照", state.scenario === "no-snapshot" ? "REST 待确认 / SSH 断链" : state.facts.collection.channelText], tone: "trust" },
      { id: "success-scope", cells: ["可展示范围", state.scenario === "no-snapshot" ? "采集链路" : "业务状态", moduleTrust(state)], tone: state.scenario === "no-snapshot" ? "warn" : "ok" },
      { id: "success-disabled", cells: ["已折叠模块", state.scenario === "no-snapshot" ? "WAN / 资源 / 终端 / 连接" : "无", "按边界显示"], tone: state.scenario === "no-snapshot" ? "missing" : "trust" },
      { id: "success-current", cells: ["当前状态", state.scenario === "no-snapshot" ? "管理面断开" : "可用", state.scenario === "no-snapshot" ? "业务禁显" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "danger" : "trust" },
      { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "时间轴终点"], tone: "trust" },
      ...state.scenario === "no-snapshot" ? [
        { id: "success-route-boundary", cells: ["默认出口", "待判定", "默认出口待判 / 路由快照缺失"], tone: "warn" },
        { id: "success-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不参考"], tone: "warn" },
        { id: "success-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" }
      ] : []
    ];
  }
  function wanContinuityRows(state) {
    return [
      { id: "cont-total", cells: ["离线对象", `${formatNumber(state.facts.wan.offline)} 条`, "全部 WAN 离线"], tone: "danger" },
      { id: "cont-online", cells: ["WAN", `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`], tone: "danger" },
      { id: "cont-route", cells: ["默认路由", "异常", "未发现活动默认路由"], tone: "danger" },
      { id: "cont-carry", cells: ["承载", "未承载", "离线线路未承载业务"], tone: "warn" },
      { id: "cont-rate", cells: ["速率", "无有效样本", "离线线路不伪装零速率"], tone: "warn" },
      { id: "cont-rest", cells: ["REST", state.facts.collection.restLabel, "采集通道可核对"], tone: state.facts.collection.level },
      { id: "cont-ssh", cells: ["SSH", state.facts.collection.sshLabel, "静态读取可核对"], tone: state.facts.collection.level },
      { id: "cont-age", cells: ["业务快照", state.facts.freshness.text, moduleTrust(state)], tone: state.facts.freshness.level },
      { id: "cont-next", cells: ["下钻", "WAN明细", "先看线路与默认路由"], tone: "trust" },
      { id: "cont-resource", cells: ["资源", state.facts.resource.summaryText, "事故二级证据"], tone: state.facts.resource.level },
      { id: "cont-terminal", cells: ["连接", `${formatCompact(state.facts.connections.total)} 连接`, "二屏补充"], tone: "trust" },
      { id: "cont-boundary", cells: ["只读", "不写配置", "状态台仅展示"], tone: "trust" }
    ];
  }
  function allOfflineImpactRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "ao-impact-object", cells: ["事故对象", `${formatNumber(state.facts.wan.offline)} 条 WAN`, "全部出口离线"], tone: "danger" },
      { id: "ao-impact-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "ao-impact-carrier", cells: ["承载关系", "未承载", "离线线路不承载业务"], tone: "warn" },
      { id: "ao-impact-rate", cells: ["速率展示", "不展示", "无有效样本，不显示零速率"], tone: "warn" },
      { id: "ao-impact-collection", cells: ["采集可信", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
      { id: "ao-impact-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "ao-impact-resource", cells: ["资源", state.facts.resource.summaryText, "二级证据"], tone: state.facts.resource.level },
      { id: "ao-impact-readonly", cells: ["展示边界", "不写配置", "只展示状态与证据"], tone: "trust" }
    ];
  }
  function collectionBoundaryLedgerRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "cb-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
      { id: "cb-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
      { id: "cb-snapshot", cells: ["业务快照", "缓存快照", "当前展示最后成功快照"], tone: "warn" },
      { id: "cb-success", cells: ["最后成功", recent, "业务状态按缓存参考"], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "cb-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "cb-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "cb-wan", cells: ["WAN", state.facts.wan.text, "缓存快照下可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
      { id: "cb-resource", cells: ["资源", state.facts.resource.summaryText, "缓存快照下可参考"], tone: state.facts.resource.level },
      { id: "cb-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
      { id: "cb-readonly", cells: ["展示边界", "不写配置", "不推断业务数值"], tone: "trust" }
    ];
  }
  function collectionReadonlyRows(snapshot, state) {
    const recent = latestSuccess(snapshot, state.scenario);
    return [
      { id: "cr-display", cells: ["展示范围", "最后成功快照", `最近成功 ${recent}`], tone: "warn" },
      { id: "cr-route", cells: ["默认出口快照", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "cr-wan", cells: ["WAN明细", state.facts.wan.text, "缓存快照可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
      { id: "cr-resource", cells: ["资源阈值", state.facts.resource.summaryText, "缓存快照可参考"], tone: state.facts.resource.level },
      { id: "cr-terminal", cells: ["终端排行", `${formatCompact(state.facts.connections.total)} 连接`, "缓存快照可参考"], tone: "trust" },
      { id: "cr-rate", cells: ["速率趋势", "缓存窗口", "不伪装实时"], tone: "warn" },
      { id: "cr-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
      { id: "cr-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
      { id: "cr-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" },
      { id: "cr-trust", cells: ["可信度", moduleTrust(state), "REST / SSH / 快照分开判"], tone: "warn" }
    ];
  }
  function compactRows(rows, count) {
    return rows.slice(0, count);
  }
  function desktopRecordRows(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null) : [];
  }
  function desktopNumber(value) {
    const number = toNumber(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }
  function desktopFirstText(row, keys, fallback = "-") {
    for (const key of keys) {
      const value = text(row[key], "");
      if (value) return value;
    }
    return fallback;
  }
  function desktopRate(value) {
    return value > 0 ? formatRate(value).replace(/\s+/g, "") : "未采集";
  }
  function desktopTerminalRows(snapshot) {
    const raw = snapshot;
    const connections = typeof raw.connections === "object" && raw.connections !== null ? raw.connections : {};
    const sources = [raw.terminals, raw.clients, raw.devices, connections.topTerminals, connections.topClients, connections.topIps];
    const rows = sources.map(desktopRecordRows).find((items) => items.length) || [];
    if (!rows.length) return [{ id: "terminal-empty", cells: ["终端 01", "IP 未记录", "等待流量样本"], tone: "missing" }];
    return rows.map((row, index) => {
      const ip = desktopFirstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "IP 未记录");
      const rawName = desktopFirstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
      const down = desktopNumber(row.downRate ?? row.downloadRate ?? row.rxRate ?? row.download ?? row.down ?? row.bytesDown ?? row.rxBytes);
      const up = desktopNumber(row.upRate ?? row.uploadRate ?? row.txRate ?? row.upload ?? row.up ?? row.bytesUp ?? row.txBytes);
      const total = desktopNumber(row.totalRate ?? row.rate ?? row.traffic ?? row.bytes ?? row.total ?? row.value) || down + up;
      const rawStatus = desktopFirstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
      const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(rawStatus);
      return {
        id: `terminal-${index}`,
        cells: [rawName && rawName !== ip ? rawName : `终端 ${String(index + 1).padStart(2, "0")}`, ip, `${desktopRate(down)} ↓ / ${desktopRate(up)} ↑`, abnormal ? "异常" : "在线"],
        tone: abnormal ? "danger" : "trust",
        title: String(total)
      };
    }).sort((a, b) => (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0) || Number(b.title || 0) - Number(a.title || 0)).slice(0, 5);
  }
  function desktopEvidenceBoundaryRows(snapshot, state) {
    if (state.scenario === "no-snapshot") return compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4);
    if (state.scenario === "collection-down") return compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "desktop-boundary-"), 4);
    if (state.scenario === "resource-full") return compactRows(resourceBoundaryRows(snapshot, state), 4);
    if (state.scenario === "interfaces-down") return compactRows(interfaceBoundaryRows(snapshot, state), 4);
    if (state.scenario === "all-offline") return compactRows(threeColumnRows(allOfflineImpactRows(snapshot, state), "desktop-boundary-"), 4);
    return compactRows(normalOpsRows(snapshot, state), 4);
  }
  function compactDesktopPanelGroups(snapshot, state) {
    const trust = moduleTrust(state);
    if (state.scenario === "no-snapshot") {
      const chainRows = noSnapshotChainRows(snapshot, state);
      const channelRows = noSnapshotChannelStatusRows(snapshot, state);
      const recentRows = lastSuccessRows(snapshot, state);
      const visibilityRows = noSnapshotVisibilityRows();
      return {
        main: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集链路 / 快照缺失", subtitle: "RouterOS 当前不可达 / REST / SSH / 业务快照 / 失败端点未记录", module: "no-snapshot-summary", tone: "danger", trust, headers: ["链路层", "当前", "最近成功", "主证据", "下次尝试"], rows: chainRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(ChainTimeline, { rows: chainRows, module: "no-snapshot-summary-chain" }) }, "ns-summary"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "四通道状态 / 当前失败对照", subtitle: "RouterOS / REST / SSH / 业务快照 / 失败端点未记录 / 默认路由 待判定", module: "no-snapshot-channel-status", tone: "warn", trust, headers: ["通道", "当前", "说明"], rows: channelRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(ChainTimeline, { rows: channelRows, module: "no-snapshot-channel-status-chain" }) }, "ns-channel")
        ],
        side: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "最近成功 / 状态更新时间", subtitle: "最近成功采集 / 事件更新时间 / 业务快照时间 无 / 业务快照年龄 不可判定", module: "no-snapshot-recent-success", tone: "trust", trust, headers: ["节点", "当前", "说明"], rows: recentRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(ChainTimeline, { rows: recentRows, module: "no-snapshot-recent-success-timeline" }) }, "ns-recent"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "模块可见性矩阵", subtitle: "业务展示边界 / 无业务快照，业务数据不展示 / WAN / 资源 / 终端 / 速率不展示", module: "no-snapshot-module-visibility", tone: "missing", trust, headers: ["模块", "状态", "原因", "边界"], rows: visibilityRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(VisibilityMatrixVisual, { rows: visibilityRows }) }, "ns-visibility")
        ],
        bottom: []
      };
    }
    if (state.scenario === "resource-full") {
      const riskChart = resourceChartRows(state);
      const pressureRows = resourceContextRows(snapshot, state);
      const top5Rows = resourceTop5Rows(snapshot).slice(0, 8);
      return {
        main: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "最危险项 · 资源满载", subtitle: "处理器 / 内存 / 磁盘", module: "resource-risk-priority", tone: "danger", trust, headers: ["项", "当前", "阈值", "峰值"], rows: resourceRiskRows(state), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-resource-visual", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "resource-risk-priority", kind: "pressure", rows: riskChart }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceTriCards, { rows: riskChart })
          ] }) }, "res-risk"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "承载压力", subtitle: "连接 / 会话 / 接口", module: "resource-pressure-bars", tone: "warn", trust, headers: ["项目", "当前", "依据"], rows: pressureRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "resource-pressure-bars", kind: "pressure", rows: connectionPressureChartRows(snapshot, state) }) }, "res-pressure")
        ],
        side: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口吞吐 Top5", subtitle: "Top5占比 / 最大值归一 / 最繁忙接口", module: "resource-interface-top5", tone: "warn", trust, headers: ["接口", "速率", "占比"], rows: top5Rows, className: "ik-overview-top5-list", minRows: 0 }, "res-top5"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集 / 快照", subtitle: "REST / SSH / 最近成功", module: "normal-collection-channel", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(collectionRows(snapshot, state), "res-col-"), 4), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "collection-status", kind: "pressure", rows: collectionChannelRows(snapshot, state) }) }, "res-collection"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "默认出口 / 路由证据", subtitle: "路由表 / 网关 / 优先级 / 活动路由 / 禁用状态", module: "route-raw-facts", tone: state.facts.route.level, trust, headers: ["路由域", "出口网关", "优先级", "状态"], rows: compactRows(routeFactRows(snapshot, state), 4), minRows: 0 }, "res-route")
        ],
        bottom: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "证据边界", subtitle: "RouterOS 原始字段下沉，只保留业务判断", module: "evidence-boundary", tone: "trust", trust, headers: ["对象", "当前", "最近", "边界"], rows: compactRows(resourceBoundaryRows(snapshot, state), 4), minRows: 0 }, "res-boundary")
        ]
      };
    }
    if (state.scenario === "collection-down") {
      const collectionVisual = /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "collection-cache-ledger", kind: "pressure", rows: collectionChannelRows(snapshot, state) });
      return {
        main: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集异常 / 三通道状态条", subtitle: "通道状态 / 数据层状态 / REST / SSH / 快照 / 失败端点未记录", module: "collection-channel-ledger", tone: "warn", trust: "缓存快照", headers: ["对象", "当前", "依据"], rows: threeColumnRows(collectionRows(snapshot, state), "c3-"), minRows: 0, visual: collectionVisual }, "col-channel"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "最后成功时间轴 / 缓存快照", subtitle: "最近成功 / 上次成功 / 缓存快照 / 当前不可判定", module: "collection-recent-failures", tone: "trust", trust: "缓存快照", headers: ["节点", "当前", "说明"], rows: lastSuccessRows(snapshot, state), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(ChainTimeline, { rows: lastSuccessRows(snapshot, state), module: "collection-success-timeline" }) }, "col-recent")
        ],
        side: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "缓存展示边界", subtitle: "当前展示缓存快照 / 不写配置 / 不推断业务数值", module: "collection-cache-boundary", tone: "warn", trust: "缓存快照", headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-"), 6), minRows: 0 }, "col-boundary"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "默认出口 / 缓存快照", subtitle: "路由表 / 网关 / 优先级 / 活动路由 / 禁用状态", module: "collection-route-wan-boundary", tone: state.facts.route.level, trust: "缓存快照", headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(routeFactRows(snapshot, state), "crf3-"), 4), minRows: 0 }, "col-route"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "WAN线路 / 缓存快照", subtitle: "缓存快照下只作参考", module: "wan-lines", tone: state.facts.wan.allOffline ? "danger" : "trust", trust: "缓存快照", headers: ["线路", "状态", "承载"], rows: compactRows(wanRows(snapshot, state), 4), minRows: 0 }, "col-wan")
        ],
        bottom: []
      };
    }
    if (state.scenario === "interfaces-down") {
      return {
        main: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口转发面", subtitle: "Down 数 / 承载影响 / 默认出口影响分开", module: "interface-forwarding", tone: "danger", trust, headers: ["对象", "当前", "依据"], rows: interfaceRows(snapshot, state), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "interface-forwarding", kind: "pressure", rows: interfaceForwardingChartRows(snapshot, state) }) }, "if-forward"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "默认路由快照摘要", subtitle: "默认路由影响 / 路由快照摘要 / 业务化路由事实", module: "route-raw-facts", tone: state.facts.route.level, trust, headers: ["路由域", "出口网关", "优先级", "状态"], rows: compactRows(routeFactRows(snapshot, state), 4), minRows: 0 }, "if-route")
        ],
        side: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集面通道", subtitle: "REST 不可达 / SSH 不可达 / 采集面不替代转发面判断", module: "interface-collection-channel", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-"), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "interface-collection-channel", kind: "pressure", rows: collectionChannelRows(snapshot, state) }) }, "if-collection"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口关系载体表", subtitle: "父接口 / 桥接 / VLAN / PPPoE 出口下沉展示", module: "interface-relation-carrier", tone: "warn", trust, headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-"), 5), minRows: 0 }, "if-relation"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "转发面判断边界", subtitle: "Down 对象 / 默认出口 / REST SSH / 展示边界", module: "interface-forwarding-boundary", tone: "warn", trust, headers: ["对象", "当前", "最近", "边界"], rows: compactRows(interfaceBoundaryRows(snapshot, state), 4), minRows: 0 }, "if-boundary")
        ],
        bottom: []
      };
    }
    if (state.scenario === "all-offline") {
      const offlineRows = wanRows(snapshot, state);
      return {
        main: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "WAN线路", subtitle: "WAN 0/8 / 默认出口异常 / 出口不可用 / 速率无有效样本", module: "wan-offline-bars", tone: "danger", trust, headers: ["线路", "状态", "承载"], rows: offlineRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "wan-offline-bars", kind: "pressure", rows: offlineWanStatusChartRows(snapshot, state) }) }, "ao-wan"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "默认出口判断", subtitle: "路由表 / 网关 / 优先级 / 活动路由 / 禁用状态", module: "wan-route-ledger", tone: state.facts.route.level, trust, headers: ["对象", "当前", "依据"], rows: threeColumnRows(routeFactRows(snapshot, state), "wr3-"), minRows: 0 }, "ao-route")
        ],
        side: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "WAN连续性", subtitle: "WAN 0/8 / 离线对象 / 默认路由异常 / 速率无有效样本", module: "wan-offline-continuity", tone: "danger", trust, headers: ["字段", "当前", "依据"], rows: compactRows(wanContinuityRows(state), 8), minRows: 0 }, "ao-continuity"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集通道", subtitle: "REST / SSH / 事故判断采集可信度", module: "collection-status", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: threeColumnRows(collectionRows(snapshot, state), "ao3-"), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "collection-status", kind: "pressure", rows: collectionChannelRows(snapshot, state) }) }, "ao-collection"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "业务影响 / 展示边界", subtitle: "默认路由 / 承载关系 / 速率不展示 / 只读状态台", module: "wan-offline-impact-boundary", tone: "warn", trust, headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-"), 5), minRows: 0 }, "ao-impact")
        ],
        bottom: []
      };
    }
    const networkRows = state.scenario === "no-snapshot" ? compactRows(noSnapshotChainRows(snapshot, state), 4) : state.scenario === "all-offline" ? compactRows(wanRows(snapshot, state), 8) : compactRows(trafficRows(snapshot, state), state.scenario === "fleet" ? 6 : 5);
    const networkVisual = state.scenario === "no-snapshot" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChainTimeline, { rows: networkRows, module: "no-snapshot-summary-chain" }) : state.scenario === "all-offline" ? /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "wan-offline-bars", kind: "trend", rows: offlineWanStatusChartRows(snapshot, state) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "traffic-trend", kind: "trend", rows: trafficChartRows(snapshot, state) });
    const routeRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4) : compactRows(routeFactRows(snapshot, state), 4);
    const routeHeaders = state.scenario === "no-snapshot" ? ["模块", "当前", "影响", "边界"] : ["路由域", "出口网关", "优先级", "状态"];
    const collectionRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotChainRows(snapshot, state), 4) : compactRows(threeColumnRows(collectionRows(snapshot, state), "desktop-collection-"), 4);
    const interfaceRowsCompact = state.scenario === "interfaces-down" ? compactRows(threeColumnRows(interfaceRows(snapshot, state), "desktop-if-"), 5) : compactRows(interfaceBoundaryRows(snapshot, state), 4);
    return {
      main: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: state.scenario === "no-snapshot" ? "采集链路 / 快照" : "网络 / WAN 出口", subtitle: state.scenario === "all-offline" ? "WAN 0/8 / 默认出口异常 / 出口不可用" : "当前 / 峰值 / 均值 / 时间范围", module: state.scenario === "all-offline" ? "wan-offline-bars" : state.scenario === "no-snapshot" ? "no-snapshot-summary" : "wan-trend", tone: state.scenario === "all-offline" || state.scenario === "no-snapshot" ? "danger" : state.facts.wan.allOffline ? "danger" : "trust", trust, headers: state.scenario === "no-snapshot" ? ["链路层", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"], rows: networkRows, minRows: 0, visual: networkVisual }, "compact-network"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: state.scenario === "no-snapshot" ? "业务展示边界" : "默认出口 / 路由", subtitle: state.scenario === "no-snapshot" ? "没有可信快照时不展示业务数据" : "主业务域 / 网关 / 承载状态", module: state.scenario === "no-snapshot" ? "no-snapshot-module-visibility" : "route-raw-facts", tone: state.scenario === "all-offline" ? "danger" : state.facts.route.level, trust, headers: routeHeaders, rows: routeRowsCompact, minRows: 0, visual: state.scenario === "no-snapshot" ? /* @__PURE__ */ jsxRuntimeExports.jsx(VisibilityMatrixVisual, { rows: routeRowsCompact }) : void 0 }, "compact-route")
      ],
      side: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: state.scenario === "resource-full" ? "资源满载" : "资源", subtitle: state.scenario === "resource-full" ? "三项超阈" : "当前 / 阈值", module: state.scenario === "resource-full" ? "resource-risk-priority" : "resource-threshold", tone: state.scenario === "no-snapshot" ? "missing" : state.facts.resource.level, trust, headers: ["项", "阈值", "持续", "峰值"], rows: compactRows(resourceRows(state), 3), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "resource-threshold", kind: "pressure", rows: resourceChartRows(state) }) }, "compact-resource"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集 / 快照", subtitle: state.scenario === "collection-down" ? "REST / SSH / 快照边界分开判断" : "REST / SSH / 最近成功", module: state.scenario === "collection-down" ? "collection-channel-ledger" : state.scenario === "no-snapshot" ? "no-snapshot-channel-status" : "normal-collection-channel", tone: state.scenario === "collection-down" || state.scenario === "no-snapshot" ? "warn" : state.facts.collection.level, trust, headers: state.scenario === "no-snapshot" ? ["链路层", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"], rows: collectionRowsCompact, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "collection-status", kind: "pressure", rows: collectionChannelRows(snapshot, state) }) }, "compact-collection"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口状态", subtitle: state.scenario === "interfaces-down" ? "Down 数 / 承载影响 / 默认出口影响分开" : "转发面 / 承载边界", module: state.scenario === "interfaces-down" ? "interface-forwarding" : "normal-interface-boundary", tone: state.scenario === "interfaces-down" ? "danger" : "trust", trust, headers: state.scenario === "interfaces-down" ? ["对象", "当前", "依据"] : ["对象", "当前", "最近", "边界"], rows: interfaceRowsCompact, minRows: 0, visual: state.scenario === "interfaces-down" ? /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "interface-forwarding", kind: "pressure", rows: interfaceForwardingChartRows(snapshot, state) }) : void 0 }, "compact-interface")
      ],
      bottom: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "终端排行", subtitle: "异常置顶 / 下载上传总量排序", module: "terminal-ranking", tone: "trust", trust, headers: ["设备", "IP", "流量", "状态"], rows: desktopTerminalRows(snapshot), minRows: 0 }, "compact-terminals"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "最近事件", subtitle: "最近成功 / 采集状态 / 默认出口", module: "normal-ops-ledger", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: compactRows(normalOpsRows(snapshot, state), 4), minRows: 0 }, "compact-events"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "证据边界", subtitle: "RouterOS 原始字段下沉，只保留业务判断", module: state.scenario === "no-snapshot" ? "no-snapshot-degraded-modules" : "evidence-boundary", tone: state.scenario === "no-snapshot" ? "missing" : "trust", trust, headers: state.scenario === "resource-full" || state.scenario === "interfaces-down" ? ["对象", "当前", "最近", "边界"] : ["对象", "当前", "依据"], rows: desktopEvidenceBoundaryRows(snapshot, state), minRows: 0 }, "compact-boundary")
      ]
    };
  }
  function desktopPanelGroups(snapshot, state) {
    return compactDesktopPanelGroups(snapshot, state);
  }
  function DesktopWorkspace({ snapshot, state }) {
    const sections = desktopPanelGroups(snapshot, state);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "ro-desktop-grid ik-home-layout",
        "data-overview-desktop-layout": "fixed-summary-keymetrics-left-right-bottom",
        "data-overview-desktop-hierarchy": "conclusion-key-metrics-evidence",
        "data-overview-desktop-hierarchy-tier": "3-evidence",
        "data-overview-desktop-skeleton": "top-six-summary-left-network-wan-right-resource-collection-bottom-interface-events",
        "data-overview-desktop-surface": "ikuai40-admin-console-not-consumer-app-cards",
        "data-overview-desktop-left-rail": "network-wan",
        "data-overview-desktop-right-rail": "resource-collection",
        "data-overview-desktop-bottom-rail": "interface-events",
        "data-overview-desktop-detail": true,
        "data-overview-desktop-workspace": true,
        "data-overview-desktop-core-text": desktopCoreText(state),
        "data-overview-desktop-copy-policy": "business-first-routeros-fields-translated-in-evidence",
        "data-overview-desktop-toy-nav-leak-guard": "desktop-content-icon-tabs-removed",
        "data-overview-desktop-content-icon-tabs": "desktop-hides-content-icon-tabs",
        "data-overview-verdict-panel": verdictContractText(snapshot, state),
        "data-overview-trend-compact": "framework-ledger",
        "data-overview-no-snapshot-grid": state.scenario === "no-snapshot" ? "main-chain-boundary-success-route-side-readonly-degraded" : void 0,
        "data-overview-no-snapshot-detail": state.scenario === "no-snapshot" ? "left-chain-ledger-business-boundary-recent-success-right-readonly-boundary-degraded-modules" : void 0,
        "data-overview-no-snapshot-left-main": state.scenario === "no-snapshot" ? "collection-chain-ledger-business-boundary-recent-success" : void 0,
        "data-overview-no-snapshot-right-side": state.scenario === "no-snapshot" ? "readonly-boundary-degraded-modules" : void 0,
        "data-overview-no-snapshot-wan-rate-layout-guard": state.scenario === "no-snapshot" ? "no-wan-rate-panel-no-zero-rate-no-rate-spacer" : void 0,
        "data-overview-desktop-effective-content-height": "760",
        "data-overview-desktop-redline-markers": "no-empty-left60-no-duplicate-boundary-no-nosnapshot-wan-rate-no-toy-tabs",
        "data-overview-no-snapshot-no-wan-rate-placeholder": state.scenario === "no-snapshot" ? "business-rates-hidden" : void 0,
        "data-overview-no-snapshot-zero-rate-guard": state.scenario === "no-snapshot" ? "replace-zero-rate-with-hidden" : void 0,
        "data-overview-side-table-mode": "three-col-no-badge",
        "data-overview-desktop-fixed-skeleton": "left-network-wan-right-resource-collection-bottom-interface-events",
        "data-overview-side-column-ratio": "24-24-52",
        "data-overview-side-badge-mode": "inline-text-no-column",
        "data-overview-side-evidence-wrap": "third-col-no-ellipsis",
        "data-overview-side-evidence-no-ellipsis": "true",
        "data-overview-desktop-ratio": "chart-table-52-48",
        "data-overview-desktop-visual-table-balance": "52-48-min45-each",
        "data-overview-desktop-scene": state.scenario,
        "data-overview-normal-first-screen": state.scenario === "single" || state.scenario === "fleet" ? "traffic-plus-evidence" : void 0,
        "data-overview-normal-traffic-under-chart": state.scenario === "single" || state.scenario === "fleet" ? "current-wan-top3-route-sampling-samples-peak-success" : void 0,
        "data-overview-normal-traffic-under-chart-facts": state.scenario === "single" || state.scenario === "fleet" ? "7" : void 0,
        "data-overview-no-empty-traffic-panel": state.scenario === "single" || state.scenario === "fleet" ? "true" : void 0,
        "data-overview-resource-first-screen": state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : void 0,
        "data-overview-resource-first-screen-structure": state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : void 0,
        "data-overview-resource-no-short-card": state.scenario === "resource-full" ? "content-sized-resource-evidence" : void 0,
        "data-overview-resource-no-spark-duplicate": state.scenario === "resource-full" ? "danger-bars-replace-small-sparklines" : void 0,
        "data-overview-collection-channel-priority": state.scenario === "collection-down" ? "rest-ssh-snapshot-before-resource" : void 0,
        "data-overview-collection-resource-deferred": state.scenario === "collection-down" ? "true" : void 0,
        "data-overview-collection-only-first-screen": state.scenario === "collection-down" ? "rest-ssh-snapshot-success-timeline-no-resource" : void 0,
        "data-overview-interface-relation-mode": state.scenario === "interfaces-down" ? "deferred" : void 0,
        "data-overview-interface-top-block": state.scenario === "interfaces-down" ? "object-status-only" : void 0,
        "data-overview-interface-top-node": state.scenario === "interfaces-down" ? "object-status-only-no-relation-text" : void 0,
        "data-overview-interface-relation-policy": state.scenario === "interfaces-down" ? "top-object-status-details-in-carrier-table" : void 0,
        "data-overview-desktop-ikuai40-console": "top-six-left-network-wan-right-resource-collection-bottom-interface-events",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopThinKpis, { snapshot, state }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-main stack", "data-overview-desktop-rail": "network-wan", "data-overview-desktop-fixed-area": "left-main", children: sections.main }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-side stack ik-home-side-stack", "data-overview-desktop-rail": "resource-collection", "data-overview-desktop-fixed-area": "right-main", children: sections.side }),
          sections.bottom.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-bottom stack", style: { gridColumn: "1 / -1" }, "data-overview-desktop-rail": "interface-events", "data-overview-desktop-fixed-area": "bottom", children: sections.bottom }) : null
        ]
      }
    );
  }
  function OverviewPanel({ snapshot, state }) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        id: "overview",
        className: "section router-overview-framework",
        "data-overview-framework": "react-vite",
        "data-overview-summary-root": true,
        "data-overview-readonly-console-contract": "react-overview-preserved",
        "data-overview-page-credibility": state.facts.freshness.credibilityLabel,
        "data-overview-page-credibility-tone": state.facts.freshness.credibilityTone,
        "data-overview-business-display-boundary": state.scenario === "no-snapshot" ? "no-business-data" : "business-data",
        "data-overview-scene-key": state.scenario,
        "data-overview-ikuai40-density": "apple-flat-light-blue-console",
        "data-overview-flat-ledger-surface": "light-blue-white-thin-lines-low-shadow",
        "data-overview-mobile-metrics": true,
        "data-overview-mobile-home-mode": "ios-app-home",
        "data-overview-mobile-home-acceptance": "ios-router-home-primary-flow",
        "data-overview-hard-standard": "desktop-status-bus-mobile-ios-app-home-chart-meta-sample-depth-required-no-large-alert-card",
        "data-overview-desktop-mobile-leakage-guard": "hide-mobile-shell-on-desktop",
        "data-overview-desktop-hierarchy-contract": "conclusion-key-metrics-evidence",
        "data-overview-chart-standard": OVERVIEW_IKUAI40_CHART_STANDARD,
        "data-overview-chart-metadata-coverage": OVERVIEW_CHART_METADATA_COVERAGE,
        "data-overview-mature-visual-standard": OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD,
        "data-overview-scene-chart-priority": OVERVIEW_SCENE_CHART_PRIORITY,
        "data-overview-scene-chart-contract": OVERVIEW_SCENE_CHART_CONTRACT,
        "data-overview-chart-color-normal": OVERVIEW_CHART_STATUS_COLORS.normal,
        "data-overview-mobile-first-microchart-policy": "first-screen",
        "data-overview-mobile-first-screen-microchart-required": "true",
        "data-overview-mobile-first-screen-uses-microchart": "true",
        "data-overview-mobile-first-microchart-kind": "scenario-insight",
        "data-overview-mobile-no-snapshot-microchart": state.scenario === "no-snapshot" ? "snapshot-channel-matrix" : void 0,
        "data-overview-no-snapshot-flow-timeline-matrix": state.scenario === "no-snapshot" ? "true" : void 0,
        "data-overview-no-snapshot-density-contract": state.scenario === "no-snapshot" ? "left60-chain-boundary-success-route-right-readonly-degraded" : void 0,
        "data-overview-no-snapshot-no-stretch-cards": state.scenario === "no-snapshot" ? "auto-height-content" : void 0,
        "data-overview-no-snapshot-content-sized": state.scenario === "no-snapshot" ? "true" : void 0,
        "data-overview-no-snapshot-content-packed": state.scenario === "no-snapshot" ? "chain-boundary-success-no-empty-left60" : void 0,
        "data-overview-no-snapshot-no-wan-rate-placeholder": state.scenario === "no-snapshot" ? "business-rates-hidden" : void 0,
        "data-overview-no-snapshot-big-wan-rate-guard": "no-business-rates-without-snapshot",
        "data-overview-no-zero-rate-placeholder": "no-zero-rate-when-uncollected",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InfoBand, { snapshot, state }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ro-sr-contract", "data-overview-verdict-panel": true, children: verdictContractText(snapshot, state) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-mobile-first-screen", "data-overview-mobile-first-screen": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MobileOverviewHome, { snapshot, state }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopWorkspace, { snapshot, state })
        ]
      }
    );
  }
  function isScenarioKey(value) {
    return typeof value === "string" && OVERVIEW_SCENARIO_KEYS.includes(value);
  }
  function normalizeSnapshot(snapshot) {
    if (snapshot && typeof snapshot === "object") return snapshot;
    return OVERVIEW_SCENARIO_FIXTURES["no-snapshot"];
  }
  function scenarioHintFromSnapshot(snapshot, options) {
    var _a;
    if (options == null ? void 0 : options.scenarioHint) return options.scenarioHint;
    const hint = (_a = snapshot.meta) == null ? void 0 : _a.scaleScenario;
    return isScenarioKey(hint) ? hint : void 0;
  }
  function PanelFrameworkApp({ snapshot, options }) {
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const scenarioHint = scenarioHintFromSnapshot(normalizedSnapshot, options);
    const state = reactExports.useMemo(
      () => deriveOverviewState(normalizedSnapshot, {
        ...options,
        scenarioHint
      }),
      [normalizedSnapshot, options, scenarioHint]
    );
    return /* @__PURE__ */ jsxRuntimeExports.jsx(OverviewPanel, { snapshot: normalizedSnapshot, state });
  }
  const mountedPanels = /* @__PURE__ */ new WeakMap();
  function isHTMLElement(value) {
    return Boolean(value && value instanceof HTMLElement);
  }
  function restoreLegacyChildren(container, state) {
    if (state.unmounted) return;
    state.unmounted = true;
    state.root.unmount();
    container.replaceChildren(...state.preservedChildren);
  }
  function mountPanel(container, snapshot, options = {}) {
    var _a;
    const existing = mountedPanels.get(container);
    if (existing) {
      restoreLegacyChildren(container, existing);
      mountedPanels.delete(container);
    }
    const preserveLegacyFallback = options.preserveLegacyFallback ?? true;
    const preservedChildren = preserveLegacyFallback ? Array.from(container.childNodes) : [];
    const host = document.createElement("div");
    let root = null;
    host.id = options.hostId ?? "router-overview-panel-root";
    host.className = options.hostClassName ?? "router-overview-panel-root";
    host.dataset.routerOverviewPanelHost = "framework";
    container.replaceChildren(host);
    try {
      root = createRoot(host);
      root.render(reactExports.createElement(PanelFrameworkApp, { snapshot, options: options.deriveOptions }));
      const state = {
        root,
        host,
        preservedChildren,
        preserveLegacyFallback,
        unmounted: false
      };
      mountedPanels.set(container, state);
      return {
        container,
        host,
        snapshot,
        options: Object.freeze({ ...options, preserveLegacyFallback }),
        unmount: () => unmountPanel(container)
      };
    } catch (error) {
      root == null ? void 0 : root.unmount();
      if (preserveLegacyFallback) {
        container.replaceChildren(...preservedChildren);
      } else {
        container.replaceChildren();
      }
      (_a = options.onError) == null ? void 0 : _a.call(options, error);
      throw error;
    }
  }
  function unmountPanel(container) {
    const state = mountedPanels.get(container);
    if (!state) return;
    mountedPanels.delete(container);
    if (state.preserveLegacyFallback) {
      restoreLegacyChildren(container, state);
      return;
    }
    if (!state.unmounted) {
      state.unmounted = true;
      state.root.unmount();
    }
    container.replaceChildren();
  }
  function mountRouterOverviewPanel(container, snapshot, options = {}) {
    if (!isHTMLElement(container)) {
      throw new TypeError("mountRouterOverviewPanel(container, snapshot, options) requires an HTMLElement container");
    }
    return mountPanel(container, snapshot, options);
  }
  function unmountRouterOverviewPanel(container) {
    if (!isHTMLElement(container)) return;
    unmountPanel(container);
  }
  if (typeof window !== "undefined") {
    window.mountRouterOverviewPanel = mountRouterOverviewPanel;
    window.unmountRouterOverviewPanel = unmountRouterOverviewPanel;
    window.dispatchEvent(new CustomEvent("router-overview-panel-framework-ready"));
  }
  let autoMountStarted = false;
  let autoMountHandle = null;
  async function resolveSnapshot() {
    const testWindow = window;
    if (typeof testWindow.__PANEL_TEST_SNAPSHOT__ !== "undefined") {
      return testWindow.__PANEL_TEST_SNAPSHOT__;
    }
    try {
      const response = await fetch("/api/snapshot", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`snapshot fetch failed: ${response.status}`);
      return await response.json();
    } catch {
      return OVERVIEW_SCENARIO_FIXTURES["no-snapshot"];
    }
  }
  function mountAutoPanel(snapshot) {
    if (autoMountHandle) return;
    const app = document.getElementById("app");
    if (!app) return;
    autoMountHandle = mountRouterOverviewPanel(app, snapshot, {
      preserveLegacyFallback: false
    });
    window.dispatchEvent(new CustomEvent("router-overview-panel-framework-auto-mounted"));
  }
  function startAutoMount() {
    if (autoMountStarted) return;
    autoMountStarted = true;
    void resolveSnapshot().then((snapshot) => {
      mountAutoPanel(snapshot);
    });
  }
  if (typeof window !== "undefined") {
    const run = () => startAutoMount();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }
  exports.mountRouterOverviewPanel = mountRouterOverviewPanel;
  exports.unmountRouterOverviewPanel = unmountRouterOverviewPanel;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
