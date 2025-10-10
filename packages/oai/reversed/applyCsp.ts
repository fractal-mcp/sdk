/**
 * Reimplementation of the logic from `apply-csp-oMEag3sR.js`.
 *
 * The sandbox injects a Content Security Policy meta tag to control which
 * origins are available to user code. The minified bundle keeps a small
 * whitelist of first-party CDNs and merges it with user supplied
 * configuration. The reimplementation below restores descriptive names and
 * documents the comparison rules that prevent loosening the policy.
 *
 * Minified identifier map:
 *   - `f` → `DEFAULT_THIRD_PARTY_DOMAINS`
 *   - `C` → `ALLOWED_PROTOCOLS`
 *   - `m` → `normalizeDomainList`
 *   - `p` → `coerceToSpaceSeparatedList`
 *   - `L` → `buildMetaTagContents`
 *   - `d` → `previousConfiguration`
 *   - `i` → `currentMetaTag`
 *   - `S` → `normalizeDirectiveTokens`
 *   - `h` → `compareTokenSets`
 *   - `$` → `comparePolicies`
 *   - `q` → `createMetaElement`
 *   - `v` → `applyContentSecurityPolicy`
 */

const DEFAULT_THIRD_PARTY_DOMAINS = [
  "cdn.tailwindcss.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "*.oaiusercontent.com",
  "threejs.org",
];

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "wss:"]);

export interface CspConfiguration {
  resourceDomains?: string[] | null;
  connectDomains?: string[] | null;
  /**
   * Trusted environments can provide fully qualified directive values
   * (including schemes other than HTTP/S and WS). When false we downgrade each
   * entry to its origin to avoid schema or credential leakage.
   */
  isTrusted?: boolean;
}

interface NormalizedCspConfiguration {
  resourceDomains: string[];
  connectDomains: string[];
  isTrusted: boolean;
}

type Strictness = "more" | "less" | "equal";

const TOKEN_PATTERN = /^[^\s;,'\"]+$/;

function ensureAbsoluteUrl(candidate: string): URL | null {
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function normalizeDomainList(
  domains: Iterable<string | null | undefined>,
  allowArbitraryTokens: boolean,
): string[] {
  const result = new Set<string>();

  for (const rawValue of domains) {
    if (!rawValue) continue;

    let trimmed = rawValue.trim();
    if (!trimmed) continue;

    if (!/^(?:https?|wss?):/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }

    const url = ensureAbsoluteUrl(trimmed);
    if (!allowArbitraryTokens) {
      if (!url || !ALLOWED_PROTOCOLS.has(url.protocol)) {
        continue;
      }
    }

    if (url && (url.username || url.password)) {
      continue;
    }

    const token = allowArbitraryTokens ? trimmed : url?.origin;
    if (!token) continue;
    if (!TOKEN_PATTERN.test(token)) continue;

    result.add(token);
  }

  return Array.from(result.values());
}

function coerceToSpaceSeparatedList(values: string[]): string {
  return values
    .filter(Boolean)
    .map((value) => (value.startsWith("http") ? value : `https://${value}`))
    .join(" ");
}

function buildMetaTagContents(config: NormalizedCspConfiguration): string {
  const resourceList = coerceToSpaceSeparatedList([
    ...DEFAULT_THIRD_PARTY_DOMAINS,
    ...normalizeDomainList(config.resourceDomains, config.isTrusted),
  ]);

  const connectList = coerceToSpaceSeparatedList([
    ...DEFAULT_THIRD_PARTY_DOMAINS,
    ...normalizeDomainList(config.connectDomains, config.isTrusted),
  ]);

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' 'unsafe-eval' blob: ${resourceList}`,
    "worker-src 'self' blob:",
    `style-src 'self' 'unsafe-inline' ${resourceList}`,
    `style-src-elem 'self' 'unsafe-inline' ${resourceList}`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: ${resourceList}`,
    `font-src 'self' ${resourceList}`,
    `connect-src 'self' ${connectList}`,
    `media-src 'self' data: ${resourceList}`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].filter(Boolean);

  return `<meta http-equiv="Content-Security-Policy" content="${directives.join("; ")}">`;
}

function sanitizeConfiguration(config: CspConfiguration): NormalizedCspConfiguration {
  return {
    resourceDomains: config.resourceDomains ?? [],
    connectDomains: config.connectDomains ?? [],
    isTrusted: Boolean(config.isTrusted),
  };
}

function normalizeDirectiveTokens(values: readonly (string | null | undefined)[]): string[] {
  if (!values || values.length === 0) return [];
  if (values.some((value) => value?.trim().toLowerCase() === "'none'")) {
    return [];
  }

  if (values.some((value) => value?.trim() === "*")) {
    return ["*"];
  }

  const normalized = new Set<string>();
  for (const token of values) {
    const trimmed = token?.trim().toLowerCase();
    if (trimmed) normalized.add(trimmed);
  }
  return Array.from(normalized.values());
}

function compareTokenSets(current: string[], next: string[]): Strictness {
  const hasWildcard = current.includes("*");
  const nextHasWildcard = next.includes("*");

  if (hasWildcard && !nextHasWildcard) return "more";
  if (!hasWildcard && nextHasWildcard) return "less";
  if (hasWildcard && nextHasWildcard) return "equal";

  const currentSet = new Set(current);
  const nextSet = new Set(next);

  const nextWithinCurrent = Array.from(nextSet).every((token) => currentSet.has(token));
  const currentWithinNext = Array.from(currentSet).every((token) => nextSet.has(token));

  if (nextWithinCurrent && currentWithinNext) return "equal";
  if (nextWithinCurrent && nextSet.size < currentSet.size) return "more";
  return "less";
}

function comparePolicies(
  previous: NormalizedCspConfiguration | null,
  next: NormalizedCspConfiguration,
): Strictness {
  if (!previous) {
    return "more";
  }

  let isStricter = false;

  const resourceComparison = compareTokenSets(
    normalizeDirectiveTokens(previous.resourceDomains),
    normalizeDirectiveTokens(next.resourceDomains),
  );

  if (resourceComparison === "less") return "less";
  if (resourceComparison === "more") isStricter = true;

  const connectComparison = compareTokenSets(
    normalizeDirectiveTokens(previous.connectDomains),
    normalizeDirectiveTokens(next.connectDomains),
  );

  if (connectComparison === "less") return "less";
  if (connectComparison === "more") isStricter = true;

  return isStricter ? "more" : "equal";
}

function createMetaElement(metaMarkup: string): HTMLMetaElement {
  const container = document.createElement("div");
  container.innerHTML = metaMarkup.trim();

  const meta = container.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!meta) {
    throw new Error("buildMetaTag() did not produce a CSP <meta> tag");
  }

  return meta;
}

let previousConfiguration: NormalizedCspConfiguration | null = null;
let currentMetaTag: HTMLMetaElement | null = null;

export function applyContentSecurityPolicy(configuration: CspConfiguration | null | undefined): void {
  if (!configuration) return;

  const normalized = sanitizeConfiguration(configuration);
  const comparison = comparePolicies(previousConfiguration, normalized);

  if (comparison === "less") {
    throw new Error("CSP is being loosened");
  }

  if (comparison === "equal") {
    return;
  }

  const markup = buildMetaTagContents(normalized);
  const metaElement = createMetaElement(markup);

  if (currentMetaTag?.isConnected) {
    currentMetaTag.replaceWith(metaElement);
  } else {
    const existingTag = document.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingTag) {
      existingTag.replaceWith(metaElement);
    } else {
      document.head.appendChild(metaElement);
    }
  }

  currentMetaTag = metaElement;
  previousConfiguration = normalized;
}
