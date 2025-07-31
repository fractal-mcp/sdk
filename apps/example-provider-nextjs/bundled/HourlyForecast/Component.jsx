import { useState as g, useEffect as A, useMemo as C } from "react";
var k = { exports: {} }, j = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var L = Symbol.for("react.transitional.element"), R = Symbol.for("react.fragment");
function M(s, n, r) {
  var t = null;
  if (r !== void 0 && (t = "" + r), n.key !== void 0 && (t = "" + n.key), "key" in n) {
    r = {};
    for (var i in n)
      i !== "key" && (r[i] = n[i]);
  } else r = n;
  return n = r.ref, {
    $$typeof: L,
    type: s,
    key: t,
    ref: n !== void 0 ? n : null,
    props: r
  };
}
j.Fragment = R;
j.jsx = M;
j.jsxs = M;
k.exports = j;
var e = k.exports;
class D {
  constructor(n) {
    this.handlers = /* @__PURE__ */ new Map(), this.pendingRequests = /* @__PURE__ */ new Map(), this.port = n.port, this.setupListeners();
  }
  setupListeners() {
    this.port.onmessage = async ({ data: n }) => {
      const r = n || {};
      if (r.kind === "request") {
        const t = r.payload, i = this.handlers.get(t.type);
        if (i)
          try {
            const o = await i(t);
            this.port.postMessage({ id: r.id, kind: "success", payload: o });
          } catch (o) {
            const l = o;
            this.port.postMessage({ id: r.id, kind: "error", error: l.message });
          }
        else
          console.error("[messaging] Command not found", t.type), this.port.postMessage({ id: r.id, kind: "error", error: "Command not found" });
      } else if (r.kind == "event") {
        const t = r.payload, i = this.handlers.get(t.type);
        i ? i(t) : console.warn("[messaging] Event not handled", t.type);
      } else if (r.kind == "success") {
        const t = this.pendingRequests.get(r.id);
        t && (t.timeout && clearTimeout(t.timeout), this.pendingRequests.delete(r.id), t.resolve(r.payload));
      } else if (r.kind == "error") {
        const t = this.pendingRequests.get(r.id);
        t && (t.timeout && clearTimeout(t.timeout), this.pendingRequests.delete(r.id), t.reject(new Error(r.error)));
      }
    };
  }
  // Sends a request and expects a response back
  request(n, r) {
    const t = crypto.randomUUID();
    return console.log("messaging is sending request", t), this.port.postMessage({
      kind: "request",
      id: t,
      payload: { type: n, data: r }
    }), new Promise((i, o) => {
      this.pendingRequests.set(t, { resolve: i, reject: o });
    });
  }
  // Sends an event to the consumer, does not expect a response back
  emit(n, r) {
    this.port.postMessage({
      kind: "event",
      id: crypto.randomUUID(),
      payload: { type: n, data: r }
    });
  }
  on(n, r) {
    this.handlers.set(n, r);
  }
}
const u = {};
function v(s) {
  let n = null;
  return s.id ? n = document.getElementById(s.id) : s.xpath && (n = document.evaluate(s.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue), n;
}
let T = !1;
const _ = window.__FRACTAL_DATA__;
let y = null;
const E = new Promise((s) => {
  y = s;
});
function S() {
  if (T)
    return;
  const s = (n) => {
    var r;
    if (((r = n.data) == null ? void 0 : r.type) === "INIT_PORT" && n.ports[0]) {
      u.current = new D({ port: n.ports[0] });
      const t = document.getElementById("root") || document.documentElement;
      let i = 0, o = 0;
      const l = () => {
        var x;
        const a = t.clientWidth, c = t.clientHeight;
        (a !== i || c !== o) && (i = a, o = c, (x = u.current) == null || x.emit("resize", {
          name: "",
          params: { width: a, height: c }
        }));
      };
      new ResizeObserver(() => l()).observe(t), l(), u.current.on("click", async (a) => {
        const { id: c, xpath: x } = a.data.params, h = v({ id: c, xpath: x });
        return h instanceof HTMLElement ? (h.click(), "ok") : "not found";
      }), u.current.on("enterText", async (a) => {
        const { id: c, xpath: x, text: h } = a.data.params, f = v({ id: c, xpath: x });
        return f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement ? (f.value = h, "ok") : "not found";
      }), u.current.on("queryDom", async (a) => document.documentElement.outerHTML), y == null || y();
    }
  };
  window.addEventListener("message", s), T = !0, window.parent.postMessage({ type: "READY" }, "*");
}
function $() {
  A(() => {
    S();
  }, []);
  const s = (r, t) => {
    E.then(() => {
      var i;
      (i = u.current) == null || i.emit(r, t);
    });
  };
  async function n(r, t) {
    if (await E, !u.current)
      throw new Error("Messaging not initialized");
    const i = t;
    return u.current.request(r, i);
  }
  return { emit: s, request: n };
}
function q() {
  const [s] = g({
    data: _,
    isLoading: !1,
    error: null
  }), { request: n } = $();
  async function r(i, o) {
    return await n("action", { name: i, params: o });
  }
  async function t(i, o) {
    await n("navigate", { name: i, params: o });
  }
  return {
    executeAction: r,
    navigate: t,
    ...s
  };
}
function H() {
  const { data: s, error: n } = q(), [r, t] = g("temperature"), [i, o] = g(null), [l, d] = g(null), a = C(() => {
    if (!s || !s.properties || !s.properties.periods)
      return [];
    const m = (p) => new Date(p).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: !0
    });
    return s.properties.periods.slice(0, 24).map((p, w) => {
      var b, N;
      return {
        index: w,
        time: m(p.startTime),
        temperature: p.temperature || 0,
        precipitation: ((b = p.probabilityOfPrecipitation) == null ? void 0 : b.value) || 0,
        windSpeed: parseFloat(((N = p.windSpeed) == null ? void 0 : N.replace(/[^\d.]/g, "")) || "0"),
        windDirection: p.windDirection,
        shortForecast: p.shortForecast,
        period: p
      };
    });
  }, [s]);
  if (n)
    return /* @__PURE__ */ e.jsx("div", { className: "flex items-center justify-center p-6", children: /* @__PURE__ */ e.jsxs("div", { className: "text-red-600", children: [
      "Error: ",
      n.message
    ] }) });
  if (!s || !s.properties || !s.properties.periods)
    return /* @__PURE__ */ e.jsx("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 w-full", children: /* @__PURE__ */ e.jsxs("div", { className: "text-gray-600 text-center", children: [
      /* @__PURE__ */ e.jsx("h3", { className: "font-medium text-sm", children: "No Hourly Forecast Data" }),
      /* @__PURE__ */ e.jsx("p", { className: "text-xs mt-1", children: "Hourly forecast information is not available." })
    ] }) });
  const { periods: c, generatedAt: x } = s.properties, h = x ? new Date(x) : /* @__PURE__ */ new Date(), f = [
    { id: "temperature", label: "Temperature", icon: "🌡️", color: "from-orange-400 to-red-500" },
    { id: "precipitation", label: "Precipitation", icon: "🌧️", color: "from-blue-400 to-blue-600" },
    { id: "wind", label: "Wind & Conditions", icon: "💨", color: "from-green-400 to-emerald-600" }
  ];
  return /* @__PURE__ */ e.jsxs("div", { className: "bg-white border border-gray-200 rounded-lg shadow-sm p-3 w-full h-full flex flex-col", children: [
    /* @__PURE__ */ e.jsxs("div", { className: "mb-3", children: [
      /* @__PURE__ */ e.jsx("h2", { className: "text-lg font-bold text-gray-900 mb-1", children: "Hourly Forecast" }),
      /* @__PURE__ */ e.jsxs("p", { className: "text-gray-600 text-xs", children: [
        "National Weather Service • Generated: ",
        h.toLocaleString()
      ] })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "mb-3", children: /* @__PURE__ */ e.jsx("nav", { className: "flex space-x-1 bg-gray-100 rounded-lg p-1", children: f.map((m) => /* @__PURE__ */ e.jsxs(
      "button",
      {
        onClick: () => t(m.id),
        className: `flex-1 py-2 px-2 font-medium text-xs transition-all duration-200 rounded-md ${r === m.id ? `bg-gradient-to-r ${m.color} text-white shadow-md` : "text-gray-600 hover:text-gray-900 hover:bg-white"}`,
        children: [
          /* @__PURE__ */ e.jsx("span", { className: "mr-1", children: m.icon }),
          /* @__PURE__ */ e.jsx("span", { className: "hidden sm:inline", children: m.label }),
          /* @__PURE__ */ e.jsx("span", { className: "sm:hidden", children: m.label.split(" ")[0] })
        ]
      },
      m.id
    )) }) }),
    /* @__PURE__ */ e.jsxs("div", { children: [
      r === "temperature" && /* @__PURE__ */ e.jsx(W, { data: a, hoveredPoint: i, setHoveredPoint: o }),
      r === "precipitation" && /* @__PURE__ */ e.jsx(F, { data: a, hoveredBar: l, setHoveredBar: d }),
      r === "wind" && /* @__PURE__ */ e.jsx(G, { data: a })
    ] }),
    /* @__PURE__ */ e.jsx("div", { className: "mt-2 text-xs text-gray-400 text-center", children: "Data from National Weather Service" })
  ] });
}
function W({ data: s, hoveredPoint: n, setHoveredPoint: r }) {
  const t = Math.max(...s.map((l) => l.temperature)), i = Math.min(...s.map((l) => l.temperature)), o = t - i || 1;
  return /* @__PURE__ */ e.jsxs("div", { className: "bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-100 h-full flex flex-col", children: [
    /* @__PURE__ */ e.jsx("h3", { className: "text-md font-bold mb-2 text-gray-800 flex items-center", children: "🌡️ Temperature Trend (24h)" }),
    /* @__PURE__ */ e.jsx("div", { className: "flex-1 bg-white rounded-lg p-2 shadow-sm", children: /* @__PURE__ */ e.jsxs("svg", { width: "100%", height: "100%", viewBox: "0 0 400 180", className: "overflow-visible", children: [
      /* @__PURE__ */ e.jsxs("defs", { children: [
        /* @__PURE__ */ e.jsxs("linearGradient", { id: "tempGradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
          /* @__PURE__ */ e.jsx("stop", { offset: "0%", stopColor: "rgba(251, 146, 60, 0.3)" }),
          /* @__PURE__ */ e.jsx("stop", { offset: "100%", stopColor: "rgba(251, 146, 60, 0.1)" })
        ] }),
        /* @__PURE__ */ e.jsxs("linearGradient", { id: "tempLine", x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [
          /* @__PURE__ */ e.jsx("stop", { offset: "0%", stopColor: "#f97316" }),
          /* @__PURE__ */ e.jsx("stop", { offset: "50%", stopColor: "#ef4444" }),
          /* @__PURE__ */ e.jsx("stop", { offset: "100%", stopColor: "#dc2626" })
        ] })
      ] }),
      [0, 1, 2, 3].map((l) => /* @__PURE__ */ e.jsx(
        "line",
        {
          x1: "30",
          y1: 20 + l * 35,
          x2: "370",
          y2: 20 + l * 35,
          stroke: "#f3f4f6",
          strokeWidth: "1"
        },
        l
      )),
      /* @__PURE__ */ e.jsx(
        "path",
        {
          d: `M 30 140 ${s.map((l, d) => {
            const a = 30 + d * (340 / (s.length - 1)), c = 140 - (l.temperature - i) / o * 100;
            return `L ${a} ${c}`;
          }).join(" ")} L 370 140 Z`,
          fill: "url(#tempGradient)"
        }
      ),
      /* @__PURE__ */ e.jsx(
        "path",
        {
          d: s.map((l, d) => {
            const a = 30 + d * (340 / (s.length - 1)), c = 140 - (l.temperature - i) / o * 100;
            return `${d === 0 ? "M" : "L"} ${a} ${c}`;
          }).join(" "),
          fill: "none",
          stroke: "url(#tempLine)",
          strokeWidth: "2.5",
          className: "drop-shadow-sm"
        }
      ),
      s.map((l, d) => {
        const a = 30 + d * (340 / (s.length - 1)), c = 140 - (l.temperature - i) / o * 100;
        return /* @__PURE__ */ e.jsx(
          "circle",
          {
            cx: a,
            cy: c,
            r: n === d ? "4" : "2.5",
            fill: "white",
            stroke: "#ef4444",
            strokeWidth: "2",
            className: "cursor-pointer transition-all duration-200 drop-shadow-sm",
            onMouseEnter: () => r(d),
            onMouseLeave: () => r(null)
          },
          d
        );
      }),
      s.filter((l, d) => d % 3 === 0).map((l, d) => {
        const a = d * 3, c = 30 + a * (340 / (s.length - 1));
        return /* @__PURE__ */ e.jsx(
          "text",
          {
            x: c,
            y: "160",
            textAnchor: "middle",
            className: "text-xs fill-gray-600 font-medium",
            children: l.time
          },
          a
        );
      }),
      [i, t].map((l, d) => /* @__PURE__ */ e.jsxs(
        "text",
        {
          x: "20",
          y: 145 - d * 100,
          textAnchor: "end",
          className: "text-xs fill-gray-700 font-semibold",
          children: [
            Math.round(l),
            "°"
          ]
        },
        d
      )),
      n !== null && /* @__PURE__ */ e.jsxs("g", { children: [
        /* @__PURE__ */ e.jsx(
          "rect",
          {
            x: 30 + n * (340 / (s.length - 1)) - 25,
            y: 140 - (s[n].temperature - i) / o * 100 - 35,
            width: "50",
            height: "25",
            fill: "rgba(0,0,0,0.9)",
            rx: "4",
            className: "drop-shadow-lg"
          }
        ),
        /* @__PURE__ */ e.jsxs(
          "text",
          {
            x: 30 + n * (340 / (s.length - 1)),
            y: 140 - (s[n].temperature - i) / o * 100 - 22,
            textAnchor: "middle",
            className: "text-xs fill-white font-bold",
            children: [
              s[n].temperature,
              "°F"
            ]
          }
        ),
        /* @__PURE__ */ e.jsx(
          "text",
          {
            x: 30 + n * (340 / (s.length - 1)),
            y: 140 - (s[n].temperature - i) / o * 100 - 12,
            textAnchor: "middle",
            className: "text-xs fill-orange-200",
            children: s[n].time
          }
        )
      ] })
    ] }) })
  ] });
}
function F({ data: s, hoveredBar: n, setHoveredBar: r }) {
  return /* @__PURE__ */ e.jsxs("div", { className: "bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100 h-full flex flex-col", children: [
    /* @__PURE__ */ e.jsx("h3", { className: "text-md font-bold mb-2 text-gray-800 flex items-center", children: "🌧️ Precipitation Probability (24h)" }),
    /* @__PURE__ */ e.jsx("div", { className: "flex-1 bg-white rounded-lg p-2 shadow-sm", children: /* @__PURE__ */ e.jsxs("svg", { width: "100%", height: "100%", viewBox: "0 0 400 180", className: "overflow-visible", children: [
      /* @__PURE__ */ e.jsx("defs", { children: /* @__PURE__ */ e.jsxs("linearGradient", { id: "rainGradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
        /* @__PURE__ */ e.jsx("stop", { offset: "0%", stopColor: "#3b82f6" }),
        /* @__PURE__ */ e.jsx("stop", { offset: "100%", stopColor: "#1d4ed8" })
      ] }) }),
      [0, 25, 50, 75, 100].map((t) => /* @__PURE__ */ e.jsx(
        "line",
        {
          x1: "30",
          y1: 140 - t * 1.1,
          x2: "370",
          y2: 140 - t * 1.1,
          stroke: "#f3f4f6",
          strokeWidth: "1"
        },
        t
      )),
      s.map((t, i) => {
        const o = 30 + i * (340 / s.length), l = 340 / s.length * 0.8, d = t.precipitation / 100 * 110, a = n === i;
        return /* @__PURE__ */ e.jsx(
          "rect",
          {
            x: o - l / 2,
            y: 140 - d,
            width: l,
            height: d,
            fill: "url(#rainGradient)",
            className: "cursor-pointer transition-all duration-200",
            onMouseEnter: () => r(i),
            onMouseLeave: () => r(null),
            opacity: a ? 1 : t.precipitation === 0 ? 0.3 : 0.8,
            rx: "2"
          },
          i
        );
      }),
      s.filter((t, i) => i % 3 === 0).map((t, i) => {
        const o = i * 3, l = 30 + o * (340 / s.length);
        return /* @__PURE__ */ e.jsx(
          "text",
          {
            x: l,
            y: "160",
            textAnchor: "middle",
            className: "text-xs fill-gray-600 font-medium",
            children: t.time
          },
          o
        );
      }),
      [0, 50, 100].map((t) => /* @__PURE__ */ e.jsxs(
        "text",
        {
          x: "20",
          y: 145 - t * 1.1,
          textAnchor: "end",
          className: "text-xs fill-gray-700 font-semibold",
          children: [
            t,
            "%"
          ]
        },
        t
      )),
      n !== null && /* @__PURE__ */ e.jsxs("g", { children: [
        /* @__PURE__ */ e.jsx(
          "rect",
          {
            x: 30 + n * (340 / s.length) - 20,
            y: 140 - s[n].precipitation / 100 * 110 - 30,
            width: "40",
            height: "20",
            fill: "rgba(0,0,0,0.9)",
            rx: "4",
            className: "drop-shadow-lg"
          }
        ),
        /* @__PURE__ */ e.jsxs(
          "text",
          {
            x: 30 + n * (340 / s.length),
            y: 140 - s[n].precipitation / 100 * 110 - 18,
            textAnchor: "middle",
            className: "text-xs fill-white font-bold",
            children: [
              s[n].precipitation,
              "%"
            ]
          }
        )
      ] })
    ] }) })
  ] });
}
function G({ data: s }) {
  const n = Math.max(...s.map((r) => r.windSpeed), 1);
  return /* @__PURE__ */ e.jsxs("div", { className: "bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100 h-full flex flex-col", children: [
    /* @__PURE__ */ e.jsx("h3", { className: "text-md font-bold mb-2 text-gray-800 flex items-center", children: "💨 Wind Conditions (24h)" }),
    /* @__PURE__ */ e.jsx("div", { className: "flex-1 bg-white rounded-lg p-2 shadow-sm mb-3", children: /* @__PURE__ */ e.jsxs("svg", { width: "100%", height: "100%", viewBox: "0 0 400 120", className: "overflow-visible", children: [
      /* @__PURE__ */ e.jsx("defs", { children: /* @__PURE__ */ e.jsxs("linearGradient", { id: "windGradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
        /* @__PURE__ */ e.jsx("stop", { offset: "0%", stopColor: "rgba(34, 197, 94, 0.4)" }),
        /* @__PURE__ */ e.jsx("stop", { offset: "100%", stopColor: "rgba(34, 197, 94, 0.1)" })
      ] }) }),
      /* @__PURE__ */ e.jsx(
        "path",
        {
          d: `M 30 100 ${s.map((r, t) => {
            const i = 30 + t * (340 / (s.length - 1)), o = 100 - r.windSpeed / n * 70;
            return `L ${i} ${o}`;
          }).join(" ")} L 370 100 Z`,
          fill: "url(#windGradient)"
        }
      ),
      /* @__PURE__ */ e.jsx(
        "path",
        {
          d: s.map((r, t) => {
            const i = 30 + t * (340 / (s.length - 1)), o = 100 - r.windSpeed / n * 70;
            return `${t === 0 ? "M" : "L"} ${i} ${o}`;
          }).join(" "),
          fill: "none",
          stroke: "#22c55e",
          strokeWidth: "2"
        }
      ),
      s.filter((r, t) => t % 4 === 0).map((r, t) => {
        const i = t * 4, o = 30 + i * (340 / (s.length - 1));
        return /* @__PURE__ */ e.jsx(
          "text",
          {
            x: o,
            y: "115",
            textAnchor: "middle",
            className: "text-xs fill-gray-600 font-medium",
            children: r.time
          },
          i
        );
      }),
      /* @__PURE__ */ e.jsx("text", { x: "20", y: "105", textAnchor: "end", className: "text-xs fill-gray-600", children: "0" }),
      /* @__PURE__ */ e.jsx("text", { x: "20", y: "35", textAnchor: "end", className: "text-xs fill-gray-600", children: Math.round(n) })
    ] }) }),
    /* @__PURE__ */ e.jsx("div", { className: "bg-white rounded-lg p-2 shadow-sm", children: /* @__PURE__ */ e.jsx("div", { className: "grid grid-cols-4 gap-2", children: s.slice(0, 4).map((r, t) => /* @__PURE__ */ e.jsxs("div", { className: "bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 text-center border border-green-100", children: [
      /* @__PURE__ */ e.jsx("div", { className: "text-xs text-gray-600 mb-1 font-medium", children: r.time }),
      /* @__PURE__ */ e.jsxs("div", { className: "text-xs font-bold text-green-700", children: [
        r.windSpeed,
        " mph"
      ] })
    ] }, t)) }) })
  ] });
}
export {
  H as default
};
