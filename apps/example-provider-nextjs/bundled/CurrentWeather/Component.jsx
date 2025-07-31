import { useState as w, useEffect as E } from "react";
var y = { exports: {} }, p = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var j = Symbol.for("react.transitional.element"), T = Symbol.for("react.fragment");
function N(n, t, e) {
  var s = null;
  if (e !== void 0 && (s = "" + e), t.key !== void 0 && (s = "" + t.key), "key" in t) {
    e = {};
    for (var r in t)
      r !== "key" && (e[r] = t[r]);
  } else e = t;
  return t = e.ref, {
    $$typeof: j,
    type: n,
    key: s,
    ref: t !== void 0 ? t : null,
    props: e
  };
}
p.Fragment = T;
p.jsx = N;
p.jsxs = N;
y.exports = p;
var i = y.exports;
const k = (n) => {
  if (!n || n.value === null) return "N/A";
  const t = n.value, e = n.unitCode === "wmoUnit:degC" ? "C" : n.unitCode === "wmoUnit:degF" ? "F" : n.unitCode.replace("wmoUnit:", "");
  return `${Math.round(t)}°${e}`;
}, R = (n) => {
  if (!n || n.value === null) return "N/A";
  const t = Math.round(n.value), e = n.unitCode.includes("km") ? "km/h" : "mph";
  return `${t} ${e}`;
}, C = (n) => !n || n.value === null ? "N/A" : `${Math.round(n.value)}%`;
class M {
  constructor(t) {
    this.handlers = /* @__PURE__ */ new Map(), this.pendingRequests = /* @__PURE__ */ new Map(), this.port = t.port, this.setupListeners();
  }
  setupListeners() {
    this.port.onmessage = async ({ data: t }) => {
      const e = t || {};
      if (e.kind === "request") {
        const s = e.payload, r = this.handlers.get(s.type);
        if (r)
          try {
            const a = await r(s);
            this.port.postMessage({ id: e.id, kind: "success", payload: a });
          } catch (a) {
            const u = a;
            this.port.postMessage({ id: e.id, kind: "error", error: u.message });
          }
        else
          console.error("[messaging] Command not found", s.type), this.port.postMessage({ id: e.id, kind: "error", error: "Command not found" });
      } else if (e.kind == "event") {
        const s = e.payload, r = this.handlers.get(s.type);
        r ? r(s) : console.warn("[messaging] Event not handled", s.type);
      } else if (e.kind == "success") {
        const s = this.pendingRequests.get(e.id);
        s && (s.timeout && clearTimeout(s.timeout), this.pendingRequests.delete(e.id), s.resolve(e.payload));
      } else if (e.kind == "error") {
        const s = this.pendingRequests.get(e.id);
        s && (s.timeout && clearTimeout(s.timeout), this.pendingRequests.delete(e.id), s.reject(new Error(e.error)));
      }
    };
  }
  // Sends a request and expects a response back
  request(t, e) {
    const s = crypto.randomUUID();
    return console.log("messaging is sending request", s), this.port.postMessage({
      kind: "request",
      id: s,
      payload: { type: t, data: e }
    }), new Promise((r, a) => {
      this.pendingRequests.set(s, { resolve: r, reject: a });
    });
  }
  // Sends an event to the consumer, does not expect a response back
  emit(t, e) {
    this.port.postMessage({
      kind: "event",
      id: crypto.randomUUID(),
      payload: { type: t, data: e }
    });
  }
  on(t, e) {
    this.handlers.set(t, e);
  }
}
const l = {};
function f(n) {
  let t = null;
  return n.id ? t = document.getElementById(n.id) : n.xpath && (t = document.evaluate(n.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue), t;
}
let g = !1;
const _ = window.__FRACTAL_DATA__;
let x = null;
const v = new Promise((n) => {
  x = n;
});
function D() {
  if (g)
    return;
  const n = (t) => {
    var e;
    if (((e = t.data) == null ? void 0 : e.type) === "INIT_PORT" && t.ports[0]) {
      l.current = new M({ port: t.ports[0] });
      const s = document.getElementById("root") || document.documentElement;
      let r = 0, a = 0;
      const u = () => {
        var d;
        const o = s.clientWidth, c = s.clientHeight;
        (o !== r || c !== a) && (r = o, a = c, (d = l.current) == null || d.emit("resize", {
          name: "",
          params: { width: o, height: c }
        }));
      };
      new ResizeObserver(() => u()).observe(s), u(), l.current.on("click", async (o) => {
        const { id: c, xpath: d } = o.data.params, m = f({ id: c, xpath: d });
        return m instanceof HTMLElement ? (m.click(), "ok") : "not found";
      }), l.current.on("enterText", async (o) => {
        const { id: c, xpath: d, text: m } = o.data.params, h = f({ id: c, xpath: d });
        return h instanceof HTMLInputElement || h instanceof HTMLTextAreaElement ? (h.value = m, "ok") : "not found";
      }), l.current.on("queryDom", async (o) => document.documentElement.outerHTML), x == null || x();
    }
  };
  window.addEventListener("message", n), g = !0, window.parent.postMessage({ type: "READY" }, "*");
}
function q() {
  E(() => {
    D();
  }, []);
  const n = (e, s) => {
    v.then(() => {
      var r;
      (r = l.current) == null || r.emit(e, s);
    });
  };
  async function t(e, s) {
    if (await v, !l.current)
      throw new Error("Messaging not initialized");
    const r = s;
    return l.current.request(e, r);
  }
  return { emit: n, request: t };
}
function A() {
  const [n] = w({
    data: _,
    isLoading: !1,
    error: null
  }), { request: t } = q();
  async function e(r, a) {
    return await t("action", { name: r, params: a });
  }
  async function s(r, a) {
    await t("navigate", { name: r, params: a });
  }
  return {
    executeAction: e,
    navigate: s,
    ...n
  };
}
function H() {
  const { navigate: n, data: t, error: e } = A();
  console.log("WTF", t, e);
  const s = "bg-white border border-gray-200 rounded-lg shadow-sm p-2 sm:p-3 w-full min-h-[180px]";
  if (e)
    return /* @__PURE__ */ i.jsx("div", { className: s, children: /* @__PURE__ */ i.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ i.jsxs("div", { className: "text-red-600", children: [
      "Error: ",
      e.message
    ] }) }) });
  if (!t || !t.properties)
    return /* @__PURE__ */ i.jsx("div", { className: s, children: /* @__PURE__ */ i.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ i.jsxs("div", { className: "text-gray-600 text-center", children: [
      /* @__PURE__ */ i.jsx("h3", { className: "font-medium text-sm", children: "No Weather Data" }),
      /* @__PURE__ */ i.jsx("p", { className: "text-xs mt-1", children: "Weather information is not available." })
    ] }) }) });
  const { properties: r } = t, a = r.timestamp ? new Date(r.timestamp) : /* @__PURE__ */ new Date();
  return /* @__PURE__ */ i.jsxs("div", { className: s, children: [
    /* @__PURE__ */ i.jsxs("div", { className: "flex justify-between items-start mb-2", children: [
      /* @__PURE__ */ i.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ i.jsx("h2", { className: "text-base sm:text-lg font-bold text-gray-900 truncate", children: "Current Weather" }),
        /* @__PURE__ */ i.jsx("p", { className: "text-gray-600 text-xs", children: "National Weather Service" })
      ] }),
      /* @__PURE__ */ i.jsx("div", { className: "text-right ml-2", children: /* @__PURE__ */ i.jsx("div", { className: "text-xl sm:text-2xl font-bold text-gray-900", children: k(r.temperature) }) })
    ] }),
    /* @__PURE__ */ i.jsxs("div", { className: "mb-2", children: [
      /* @__PURE__ */ i.jsx("div", { className: "text-sm font-medium mb-1 text-gray-800 line-clamp-1", children: r.textDescription || "Current Conditions" }),
      /* @__PURE__ */ i.jsxs("div", { className: "text-gray-500 text-xs", children: [
        "Last updated: ",
        a.toLocaleTimeString()
      ] })
    ] }),
    /* @__PURE__ */ i.jsxs("div", { className: "flex gap-1 text-xs mb-2", children: [
      /* @__PURE__ */ i.jsxs("div", { className: "bg-gray-50 rounded px-2 py-1 flex-1", children: [
        /* @__PURE__ */ i.jsx("span", { className: "text-gray-500", children: "Humidity:" }),
        /* @__PURE__ */ i.jsx("span", { className: "font-semibold text-gray-900 ml-1", children: r.relativeHumidity ? C(r.relativeHumidity) : "N/A" })
      ] }),
      /* @__PURE__ */ i.jsxs("div", { className: "bg-gray-50 rounded px-2 py-1 flex-1", children: [
        /* @__PURE__ */ i.jsx("span", { className: "text-gray-500", children: "Wind:" }),
        /* @__PURE__ */ i.jsx("span", { className: "font-semibold text-gray-900 ml-1", children: R(r.windSpeed) })
      ] })
    ] }),
    /* @__PURE__ */ i.jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ i.jsx(
        "button",
        {
          onClick: () => n("get_hourly_forecast", { location: "San Francisco" }),
          className: "w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs",
          children: "View Hourly Forecast"
        }
      ),
      /* @__PURE__ */ i.jsx("div", { className: "text-xs text-gray-400 text-center", children: "Data from National Weather Service" })
    ] })
  ] });
}
export {
  H as default
};
