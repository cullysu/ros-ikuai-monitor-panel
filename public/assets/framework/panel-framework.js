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
  "children dangerouslySetInn…111929 tokens truncated…dule,
          {
            title: "最危险项 · 资源过载",
            subtitle: "CPU / 内存 / 磁盘 · 阈值、持续时间与峰值",
            module: "resource-risk-priority",
            tone: "danger",
            trust,
            headers: ["项", "当前", "阈值", "峰值"],
            rows: resourceRiskRows(state),
            minRows: 0,
            visual: /* @__PURE__ */ jsxRuntimeExports.jsx(VisualStack, { snapshot, state, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourcePressureLedgerVisual, { rows: riskChart }) })
          },
          "res-risk"
        )
      ],
      side: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "连接压力", subtitle: "连接压力 / 活动会话 / DNS缓存 / 接口", module: "resource-pressure-bars", tone: "warn", trust, headers: ["项目", "当前", "依据"], rows: pressureRows, minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(JudgementChart, { module: "resource-pressure-bars", kind: "pressure", rows: connectionPressureChartRows(snapshot, state) }) }, "res-pressure"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "采集 / 快照", subtitle: "REST / SSH / 成功", module: "normal-collection-channel", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: compactRows(threeColumnRows(collectionRows(snapshot, state), "res-col-"), 4), minRows: 0, visual: /* @__PURE__ */ jsxRuntimeExports.jsx(ChannelMatrixVisual, { module: "collection-status", rows: collectionChannelRows(snapshot, state) }) }, "res-collection"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口状态", subtitle: "承载 / 边界", module: "normal-interface-boundary", tone: "trust", trust, headers: ["对象", "当前", "最近", "边界"], rows: compactRows(interfaceBoundaryRows(snapshot, state), 4), minRows: 0, collapsed: true }, "res-interface")
      ],
      bottom: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "接口吞吐 Top5", subtitle: "接口吞吐 Top5 / 占比 / 资源影响", module: "resource-interface-top5", tone: "warn", trust, headers: ["接口", "速率", "占比"], rows: compactRows(top5Rows, 5), className: "ik-overview-top5-list", minRows: 0 }, "res-top5"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "最近事件", subtitle: "采集与资源状态变化", module: "normal-ops-ledger", tone: state.facts.collection.level, trust, headers: ["对象", "当前", "依据"], rows: compactRows(normalOpsRows(snapshot, state), 4), minRows: 0 }, "res-events"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Module, { title: "证据 / 原始字段", subtitle: "默认收起 · 仅用于审计", module: "evidence-boundary", tone: "trust", trust, headers: ["对象", "当前", "依据"], rows: compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "res-boundary-")], 4), minRows: 0, collapsedEvidence: true }, "res-boundary")
      ]
    };
  }
  function buildDesktopOverviewScene(snapshot, state) {
    switch (state.scenario) {
      case "no-snapshot":
        return buildNoSnapshotDesktopScene(snapshot, state);
      case "resource-full":
        return buildResourceFullDesktopScene(snapshot, state);
      case "collection-down":
        return buildCollectionDownDesktopScene(snapshot, state);
      case "interfaces-down":
        return buildInterfacesDownDesktopScene(snapshot, state);
      case "all-offline":
        return buildAllOfflineDesktopScene(snapshot, state);
      default:
        return buildDefaultDesktopScene(snapshot, state);
    }
  }
  function nextAction(state) {
    switch (state.scenario) {
      case "all-offline":
        return { value: "核对默认出口", note: "线路、网关与承载接口", tone: "danger" };
      case "no-snapshot":
        return { value: "恢复采集快照", note: "先核 RouterOS / REST / SSH", tone: "warn" };
      case "collection-down":
        return { value: "核对采集通道", note: "业务转发不作异常推断", tone: "warn" };
      case "resource-full":
        return { value: "先降低连接压力", note: "再看接口吞吐与活动会话", tone: "danger" };
      case "interfaces-down":
        return { value: "核对 Down 接口", note: "确认默认出口承载关系", tone: "warn" };
      default:
        return null;
    }
  }
  function DesktopDecisionRail({ snapshot, state }) {
    const presentation = desktopPresentation(snapshot, state);
    const credibility = presentation.incidentSummary.find((item) => item.label === "可信度");
    const action = nextAction(state);
    if (!action) return null;
    const items = [
      { label: "下一步", value: action.value, note: action.note, tone: action.tone },
      {
        label: "可信度",
        value: (credibility == null ? void 0 : credibility.value) || presentation.readonlyJudgement,
        note: (credibility == null ? void 0 : credibility.note) || "只读判断，不写入 RouterOS",
        tone: (credibility == null ? void 0 : credibility.tone) || state.verdict.level
      }
    ];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        className: "ro-desktop-decision-rail",
        "aria-label": "桌面判断与处置",
        "data-overview-desktop-kpi-row": "next-action-credibility",
        "data-overview-desktop-decision-rail": "action-and-credibility",
        children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-desktop-thin-kpi ik-overview-kpi-card", "data-overview-desktop-decision-role": item.label, "data-tone": item.tone, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: item.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: item.note })
        ] }, item.label))
      }
    );
  }
  function DesktopWorkspace({ snapshot, state }) {
    const sections = buildDesktopOverviewScene(snapshot, state);
    const hasDecisionRail = state.scenario !== "single" && state.scenario !== "fleet";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `ro-desktop-grid ik-home-layout${hasDecisionRail ? "" : " is-normal-scene"}`,
        "data-overview-desktop-hierarchy": "conclusion-key-metrics-evidence",
        "data-overview-desktop-hierarchy-tier": "3-evidence",
        "data-overview-desktop-detail": true,
        "data-overview-desktop-workspace": true,
        "data-overview-no-snapshot-detail": state.scenario === "no-snapshot" ? "business-data-unavailable-recovery-evidence-deferred" : void 0,
        "data-overview-desktop-scene": state.scenario,
        children: [
          hasDecisionRail ? /* @__PURE__ */ jsxRuntimeExports.jsx(DesktopDecisionRail, { snapshot, state }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-main stack", children: sections.main }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-side stack ik-home-side-stack", children: sections.side }),
          sections.bottom.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ro-col is-bottom stack", style: { gridColumn: "1 / -1" }, children: sections.bottom }) : null
        ]
      }
    );
  }
  function StatusVerdict({ snapshot, state }) {
    const allItems = topbarItems(snapshot, state).slice(0, 6);
    const isNoSnapshot = state.scenario === "no-snapshot";
    const items = isNoSnapshot ? allItems : allItems.filter((item) => ["conclusion", "impact", "collection", "snapshot"].includes(item.role));
    const topbarOrder = isNoSnapshot ? "conclusion-device-routeros-rest-ssh-recent-success" : "conclusion-impact-collection-snapshot";
    const topbarHierarchy = isNoSnapshot ? "primary-conclusion-device-routeros-rest-ssh-recent-success" : "primary-conclusion-impact-collection-snapshot";
    const topbarPriorityContract = isNoSnapshot ? "conclusion-first-device-routeros-rest-ssh-recent-success" : "conclusion-first-impact-collection-snapshot";
    const topbarSecondary = isNoSnapshot ? "recent-success-demoted" : "snapshot-demoted";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `ro-topbar ik-home-flat-topbar${isNoSnapshot ? "" : " is-compact-facts"}`,
        "data-overview-desktop-tier": "conclusion",
        "data-overview-desktop-hierarchy-tier": "1-conclusion",
        "data-overview-summary": true,
        "data-overview-status-bus": true,
        "data-overview-verdict-status-bus": true,
        "data-overview-status-bar": true,
        "data-overview-desktop-v1040-status-bus": "flat-summary-bus-key-value-no-field-boxes",
        "data-overview-desktop-v1068-status-bus": "control-console-summary-bus-flat-critical-value-rail",
        "data-overview-desktop-v1068-status-bus-order": topbarOrder,
        "data-overview-desktop-v1068-status-bus-no-table-header": "true",
        "data-overview-desktop-v1068-status-bus-value-rail": "conclusion-first-low-noise",
        "data-overview-summary-main": true,
        "data-overview-desktop-top": true,
        "data-overview-flat-topbar": true,
        "data-overview-topbar-hierarchy": topbarHierarchy,
        "data-overview-topbar-priority-contract": topbarPriorityContract,
        "data-overview-topbar-primary-weight": "conclusion-12_5-device-12",
        "data-overview-topbar-conclusion-rail": "left-4px",
        "data-overview-topbar-secondary": topbarSecondary,
        "data-overview-topbar-fixed-six": topbarOrder,
        "data-overview-topbar-no-overflow": isNoSnapshot ? "max-six-cells-short-notes" : "four-facts-conclusion-first",
        "data-overview-first-viewport-title": topbarOrder,
        "data-overview-topbar-no-iso-long-timestamp": "true",
        "data-overview-first-viewport-no-duplicate-title-tag": "true",
        "data-overview-topbar-muted-tags": "no-heavy-status-tags",
        children: [
          items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ro-topbar-cell ik-home-flat-cell ik-home-ops-item", "data-tone": item.tone, "data-overview-field": true, "data-overview-status-cell": true, "data-overview-status-role": item.role, "data-overview-status-priority": topbarPriority(item.role), "data-overview-summary-cell": true, "data-overview-desktop-v1068-status-cell": "label-value-note", children: [
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
  const OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT = "low-noise-console-tokens-color-type-space-radius-state-chart";
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
        "data-overview-low-noise-console-token-contract": OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT,
        "data-overview-scene-key": state.scenario,
        "data-overview-ikuai40-density": "apple-flat-light-blue-console",
        "data-overview-flat-ledger-surface": "light-blue-white-thin-lines-low-shadow",
        "data-overview-mobile-metrics": true,
        "data-overview-mobile-home-mode": "ios-app-home",
        "data-overview-mobile-home-acceptance": "ios-router-home-primary-flow",
        "data-overview-hard-standard": "desktop-status-bus-mobile-ios-app-home-chart-meta-sample-depth-required-no-large-alert-card",
        "data-overview-desktop-mobile-leakage-guard": "hide-mobile-shell-on-desktop",
        "data-overview-desktop-hierarchy-contract": "conclusion-key-metrics-evidence",
        "data-overview-desktop-v1030-nav-polish": "short-ikuai-left-rail-low-noise-status-bus",
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusVerdict, { snapshot, state }),
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
