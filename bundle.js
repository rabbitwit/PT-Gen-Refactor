var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  static {
    __name(this, "HTTPException");
  }
  res;
  status;
  /**
  * Creates an instance of `HTTPException`.
  * @param status - HTTP status code for the exception. Defaults to 500.
  * @param options - Additional options for the exception.
  */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
  * Returns the response object associated with the exception.
  * If a response object is not provided, a new response is created with the error message and status code.
  * @returns The response object.
  */
  getResponse() {
    if (this.res) return new Response(this.res.body, {
      status: this.status,
      headers: this.res.headers
    });
    return new Response(this.message, { status: this.status });
  }
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType2) => mediaType2.toLowerCase()) } }).formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType2 = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType2 === "multipart/form-data" || mediaType2 === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers2 = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers2.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)(?:__proto__|constructor\.prototype)\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath2) => {
  const { groups, path } = extractGroupsFromPath(routePath2);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^(?:${match2[2]})(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^(?:${match2[2]})$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var decodeURIWithPreservedPercent = /* @__PURE__ */ __name((value) => decodeURI(value.includes("%25") ? value.replace(/%25/g, "%2525") : value), "decodeURIWithPreservedPercent");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.charCodeAt(0) === 47 ? 0 : url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      const decoded = tryDecode(path, decodeURIWithPreservedPercent);
      if (/%(?![0-9A-Fa-f]{2})/.test(path)) {
        const rewritten = new URL("http://localhost");
        rewritten.pathname = decoded.replace(/[\\\t\n\r]/g, encodeURIComponent);
        if (tryDecode(rewritten.pathname, decodeURIWithPreservedPercent) !== decoded) return tryDecode(path.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"), decodeURIWithPreservedPercent);
      }
      return decoded;
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && !/[%+&=]/.test(key)) {
    const queryIndex = url.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers2) => {
  return {
    "Content-Type": contentType,
    ...headers2
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers2 = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers2.delete(name);
    else if (options?.append) headers2.append(name, value);
    else headers2.set(name, value);
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers2) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers2) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers2) if (++count > 1 || typeof headers2[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers2) {
        const v = headers2[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers2
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = /* @__PURE__ */ __name((data, arg, headers2) => this.#newResponse(data, arg, headers2), "body");
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = /* @__PURE__ */ __name((text2, arg, headers2) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers2 && !this.finalized ? new Response(text2) : this.#newResponse(text2, arg, setDefaultContentType(TEXT_PLAIN, headers2));
  }, "text");
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = /* @__PURE__ */ __name((object, arg, headers2) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers2));
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers2) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers2)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/helper/route/index.js
var matchedRoutes = /* @__PURE__ */ __name((c) => c.req[GET_MATCH_RESULT][0].map(([[, route]]) => route), "matchedRoutes");
var routePath = /* @__PURE__ */ __name((c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.path ?? "", "routePath");

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/utils/mount.js
var countTrailingSlashes = /* @__PURE__ */ __name((path) => {
  let index = path.length;
  while (index > 0 && path.charCodeAt(index - 1) === 47) index--;
  return path.length - index;
}, "countTrailingSlashes");
var getPathPrefixLength = /* @__PURE__ */ __name((c, pathPrefix, routePath2) => {
  if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
  const path = c.req.path;
  const matchResult = c.req[GET_MATCH_RESULT];
  const paramNames = /* @__PURE__ */ new Set();
  let length = 0;
  for (const part of splitRoutingPath(pathPrefix)) {
    if (part[0] === ":" && part.endsWith("}?")) throw new Error(`mount(): Optional regular expression parameters are not supported in "${routePath2}".`);
    const pattern = getPattern(part);
    if (pattern && pattern !== "*") {
      const name = pattern[1];
      if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath2}".`);
      paramNames.add(name);
    }
    if (pattern && pattern !== "*" && pattern[2] !== true) {
      const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
      length += value.length + 1;
    } else if (pattern || part.endsWith("*")) {
      const end = path.indexOf("/", length + 1);
      length = end === -1 ? path.length : end;
    } else length += part.length + 1;
  }
  return length;
}, "getPathPrefixLength");
var createMountedRequest = /* @__PURE__ */ __name((c, pathPrefix, routePath2) => {
  if (/[^/]\*$/.test(routePath2)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath2}".`);
  const prefixLength = getPathPrefixLength(c, pathPrefix, routePath2);
  const path = c.req.path.slice(prefixLength) || "/";
  if (prefixLength > c.req.path.length || path[0] !== "/" || /\/(?:\.|%2e){1,2}(?:\/|$)/i.test(path)) throw new HTTPException(400, { message: "Invalid mounted path" });
  const rawUrl = c.req.raw.url;
  if (/^[^/?#]*\/\/[^/?#\\]*[?#\\]/.test(rawUrl)) throw new HTTPException(400, { message: "Invalid mounted path" });
  const rawPathEnd = rawUrl.search(/[?#]/);
  const rawTrailingSlashes = countTrailingSlashes(rawPathEnd === -1 ? rawUrl : rawUrl.slice(0, rawPathEnd));
  if (rawTrailingSlashes > 1 && countTrailingSlashes(c.req.path) === rawTrailingSlashes - 1) throw new HTTPException(400, { message: "Invalid mounted path" });
  const url = new URL(rawUrl);
  url.pathname = path.replace(/[\\\t\n\r]/g, encodeURIComponent);
  if (path.includes("%")) {
    let decoded;
    try {
      decoded = decodeURI(path);
    } catch {
    }
    if (decoded === void 0) {
      if (tryDecode(url.pathname, (value) => decodeURI(value.replace(/%25/g, "%2525"))) !== path) throw new HTTPException(400, { message: "Invalid mounted path" });
    }
  }
  return new Request(url, c.req.raw);
}, "createMountedRequest");

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class Hono2 {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  * @throws {Error} If automatic request rewriting encounters duplicate path parameter names or an optional regular expression parameter.
  * @throws {HTTPException} With status 400 if automatic request rewriting cannot safely preserve the routed path.
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    const defaultReplaceRequest = /* @__PURE__ */ __name((c) => {
      const mountedRoutePath = routePath(c);
      return createMountedRequest(c, mountedRoutePath.replace(/\/?\*$/, ""), mountedRoutePath);
    }, "defaultReplaceRequest");
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
      if (res) return res;
      await next();
    }, "handler");
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  }, "request");
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === "[^]*" || a === "(?:|/[^]*)") return b === "[^]*" ? -1 : 1;
  else if (b === "[^]*" || b === "(?:|/[^]*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class Node2 {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, keys) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ONLY_WILDCARD_REG_EXP_STR
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        keys.push(regexpStr);
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        keys.push(token);
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    const keys = [];
    if (isStatic) {
      this.#root.insert(path.split(""), -1, [], this.#context, keys);
      this.paths[path] = [
        -1,
        [],
        keys
      ];
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
    this.paths[path] = [
      this.#index++,
      paramAssoc,
      keys
    ];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
  const tail = keys[keys.length - 1];
  return tail === "[^]*" || tail === "(?:|/[^]*)";
}
__name(endsWithWildcard, "endsWithWildcard");
function covers(wildcard, target) {
  const last = wildcard.length - 1;
  for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
  return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
__name(covers, "covers");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #handlers;
  #tries;
  constructor() {
    this.#handlers = { ["ALL"]: [] };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const handlers = this.#handlers;
    if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    const tries = this.#tries;
    if (!handlers[method]) {
      tries[method] = new Trie();
      handlers[method] = [...handlers["ALL"]];
      for (const p in tries["ALL"].paths) this.#insertPath(method, p);
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(handlers) : [method];
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!tries[m].paths[path2]) this.#insertPath(m, path2);
      handlers[m].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
    this.#handlers = this.#tries = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const handlers = this.#handlers[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    const own = createNullObject();
    const entries = handlers.map(([h, p], i) => {
      (own[p] ??= []).push(i);
      return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
        map[key] = paramReplacementMap[varIndex];
        return map;
      }, createNullObject())];
    });
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path];
      const indexes = [...own[path]];
      for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
      const data = indexes.sort((a, b) => a - b).map((i) => entries[i]);
      if (index === -1) {
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
      } else handlerData[index] = data;
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  static {
    __name(this, "Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    const methodMap = createNullObject();
    methodMap[method] = {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    };
    curNode.#methods.push(methodMap);
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// src/lib/env.ts
function processEnv() {
  return globalThis.process?.env;
}
__name(processEnv, "processEnv");
function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const start = trimmed[0];
  const end = trimmed[trimmed.length - 1];
  if (start === "'" && end === "'") return trimmed.slice(1, -1);
  if (start === '"' && end === '"') {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}
__name(unquoteEnvValue, "unquoteEnvValue");
function readEnv(env, key) {
  const fromBindings = env?.[key];
  if (typeof fromBindings === "string" && fromBindings.trim().length > 0) {
    return unquoteEnvValue(fromBindings);
  }
  const fromProcess = processEnv()?.[key];
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return unquoteEnvValue(fromProcess);
  }
  return void 0;
}
__name(readEnv, "readEnv");
function readBoolean(env, key, fallback = false) {
  const raw2 = readEnv(env, key)?.toLowerCase();
  if (raw2 === void 0) return fallback;
  return raw2 === "1" || raw2 === "true" || raw2 === "yes" || raw2 === "on";
}
__name(readBoolean, "readBoolean");
function readNumber(env, key, fallback) {
  const raw2 = readEnv(env, key);
  if (!raw2) return fallback;
  const parsed = Number.parseInt(raw2, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
__name(readNumber, "readNumber");
function readNonNegativeNumber(env, key, fallback) {
  const raw2 = readEnv(env, key);
  if (!raw2) return fallback;
  const parsed = Number.parseInt(raw2, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
__name(readNonNegativeNumber, "readNonNegativeNumber");
function splitBackendUrls(raw2) {
  if (!raw2) return [];
  const seen = /* @__PURE__ */ new Set();
  const urls = [];
  for (const part of raw2.split(/[\s,;]+/)) {
    const url = part.trim().replace(/\/+$/, "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
__name(splitBackendUrls, "splitBackendUrls");

// src/version.ts
var VERSION = "2.0.0";
var API_VERSION = VERSION;

// src/config.ts
var WAF_TTL_MS = 24e4;
var EXPLICIT_RUNTIMES = /* @__PURE__ */ new Set(["node", "bun", "edge"]);
var DEFAULT_RATING_REFRESH_SECONDS = 15 * 24 * 60 * 60;
function normalizeRatingRefresh(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(30 * 24 * 60 * 60, Math.max(30, Math.floor(value)));
}
__name(normalizeRatingRefresh, "normalizeRatingRefresh");
function detectRuntime(override) {
  const forced = override?.toLowerCase();
  if (forced && EXPLICIT_RUNTIMES.has(forced)) return forced;
  const scope = globalThis;
  if (scope.navigator?.userAgent === "Cloudflare-Workers") return "edge";
  if (typeof scope.EdgeRuntime !== "undefined") return "edge";
  if (typeof scope.Bun !== "undefined") return "bun";
  return "node";
}
__name(detectRuntime, "detectRuntime");
function resolveConfig(env) {
  const runtime = detectRuntime(readEnv(env, "RUNTIME"));
  const host = globalThis.process?.platform;
  const isLocal = readBoolean(env, "IS_LOCAL") || readEnv(env, "NODE_ENV") === "development" || host !== "linux";
  const canUseBrowser = runtime === "node";
  return {
    runtime,
    apiToken: readEnv(env, "API_TOKEN"),
    authSecret: readEnv(env, "AUTH_SECRET"),
    sessionTtlSeconds: Math.min(86400, Math.max(60, readNumber(env, "SESSION_TTL_SECONDS", 1800))),
    // 前导零 bit 数：12 约 4096 次哈希，浏览器通常几百毫秒内完成
    powDifficulty: Math.min(20, Math.max(8, readNumber(env, "POW_DIFFICULTY", 12))),
    imdbCookie: readEnv(env, "IMDB_COOKIE"),
    imdbWafToken: readEnv(env, "IMDB_WAF_TOKEN"),
    cacheTtlSeconds: readNumber(env, "CACHE_TTL_SECONDS", 600),
    // 命中缓存后每隔多少秒回源比对一次评分；<=0 关闭，正数限制在 30 秒–30 天
    ratingRefreshSeconds: normalizeRatingRefresh(readNonNegativeNumber(env, "RATING_REFRESH_SECONDS", DEFAULT_RATING_REFRESH_SECONDS)),
    requestTimeoutMs: readNumber(env, "REQUEST_TIMEOUT_MS", 3e4),
    htmlTimeoutMs: readNumber(env, "HTML_TIMEOUT_MS", 2e4),
    browserTokenTimeoutMs: readNumber(env, "BROWSER_TOKEN_TIMEOUT_MS", 25e3),
    castLeadLimit: Math.min(readNumber(env, "CAST_LEAD_LIMIT", 10), 50),
    castSupportingLimit: Math.min(readNumber(env, "CAST_SUPPORTING_LIMIT", 20), 100),
    castVoiceLimit: Math.min(readNumber(env, "CAST_VOICE_LIMIT", 5), 50),
    // 0 关闭限流（只建议本地调试时使用）
    rateLimitMax: readNonNegativeNumber(env, "RATE_LIMIT_MAX", 60),
    isLocal,
    playwrightExecutablePath: readEnv(env, "PLAYWRIGHT_EXECUTABLE_PATH"),
    canUseBrowser,
    doubanCookie: readEnv(env, "DOUBAN_COOKIE"),
    doubanCookieExpiresAt: readEnv(env, "DOUBAN_COOKIE_EXPIRES_AT"),
    telegramBotToken: readEnv(env, "TELEGRAM_BOT_TOKEN"),
    telegramChatId: readEnv(env, "TELEGRAM_CHAT_ID"),
    imdbBackendUrl: readEnv(env, "IMDB_BACKEND_URL"),
    imdbBackendUrls: splitBackendUrls(readEnv(env, "IMDB_BACKEND_URL")),
    imdbBackendToken: readEnv(env, "IMDB_BACKEND_TOKEN"),
    doubanBackendUrl: readEnv(env, "DOUBAN_BACKEND_URL"),
    doubanBackendUrls: splitBackendUrls(readEnv(env, "DOUBAN_BACKEND_URL")),
    doubanBackendToken: readEnv(env, "DOUBAN_BACKEND_TOKEN"),
    tmdbApiKey: readEnv(env, "TMDB_API_KEY"),
    traktClientId: readEnv(env, "TRAKT_API_CLIENT_ID"),
    traktAccessToken: readEnv(env, "TRAKT_ACCESS_TOKEN"),
    qqCookie: readEnv(env, "QQ_COOKIE"),
    bangumiAccessToken: readEnv(env, "BANGUMI_ACCESS_TOKEN")
  };
}
__name(resolveConfig, "resolveConfig");
function canUseHtmlFallback(config) {
  return config.canUseBrowser || Boolean(config.imdbCookie) || Boolean(config.imdbWafToken);
}
__name(canUseHtmlFallback, "canUseHtmlFallback");
function canUseImdb(_config) {
  return true;
}
__name(canUseImdb, "canUseImdb");
function hasImdbBackend(config) {
  return config.imdbBackendUrls.length > 0;
}
__name(hasImdbBackend, "hasImdbBackend");
function hasDoubanBackend(config) {
  return config.doubanBackendUrls.length > 0;
}
__name(hasDoubanBackend, "hasDoubanBackend");

// src/lib/errors.ts
var ErrorCode = {
  OK: "OK",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  RATE_LIMITED: "RATE_LIMITED",
  UPSTREAM_CHALLENGE: "UPSTREAM_CHALLENGE",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT",
  UPSTREAM_BLOCKED: "UPSTREAM_BLOCKED",
  DOUBAN_COOKIE_EXPIRED: "DOUBAN_COOKIE_EXPIRED",
  INVALID_IMDB_ID: "INVALID_IMDB_ID",
  INVALID_DOUBAN_ID: "INVALID_DOUBAN_ID",
  INVALID_SOURCE_ID: "INVALID_SOURCE_ID",
  CONFIG_REQUIRED: "CONFIG_REQUIRED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};
var STATUS_BY_CODE = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  UPSTREAM_CHALLENGE: 503,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_BLOCKED: 403,
  DOUBAN_COOKIE_EXPIRED: 403,
  INVALID_IMDB_ID: 400,
  INVALID_DOUBAN_ID: 400,
  INVALID_SOURCE_ID: 400,
  CONFIG_REQUIRED: 501,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500
};
var NUMBER_BY_CODE = {
  OK: 2e4,
  BAD_REQUEST: 4e4,
  INVALID_IMDB_ID: 40001,
  INVALID_DOUBAN_ID: 40002,
  INVALID_SOURCE_ID: 40003,
  CONFIG_REQUIRED: 50101,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  UPSTREAM_BLOCKED: 40301,
  DOUBAN_COOKIE_EXPIRED: 40302,
  NOT_FOUND: 40400,
  METHOD_NOT_ALLOWED: 40500,
  RATE_LIMITED: 42900,
  INTERNAL_ERROR: 5e4,
  NOT_IMPLEMENTED: 50100,
  UPSTREAM_ERROR: 50200,
  UPSTREAM_CHALLENGE: 50300,
  UPSTREAM_TIMEOUT: 50400
};
function toNumberCode(code) {
  return NUMBER_BY_CODE[code];
}
__name(toNumberCode, "toNumberCode");
var ApiError = class _ApiError extends Error {
  static {
    __name(this, "ApiError");
  }
  /** 字符串符号，用于日志与 `error.type` */
  symbol;
  /** 数字业务码，用于响应体的 `code` */
  code;
  status;
  details;
  retryable;
  retryAfterSeconds;
  constructor(symbol, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.symbol = symbol;
    this.code = toNumberCode(symbol);
    this.status = STATUS_BY_CODE[symbol];
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
  static badRequest(message, details) {
    return new _ApiError(ErrorCode.BAD_REQUEST, message, { details });
  }
  static unauthorized(message = "\u7F3A\u5C11\u6216\u65E0\u6548\u7684 API Token") {
    return new _ApiError(ErrorCode.UNAUTHORIZED, message);
  }
  static notFound(message = "\u8D44\u6E90\u4E0D\u5B58\u5728", details) {
    return new _ApiError(ErrorCode.NOT_FOUND, message, { details });
  }
  static invalidImdbId(value) {
    return new _ApiError(
      ErrorCode.INVALID_IMDB_ID,
      `\u65E0\u6548\u7684 IMDb ID: "${value}"\uFF0C\u5E94\u5F62\u5982 tt0111161 \u6216 0111161`
    );
  }
  static upstreamTimeout(message = "\u4E0A\u6E38\u8BF7\u6C42\u8D85\u65F6", details) {
    return new _ApiError(ErrorCode.UPSTREAM_TIMEOUT, message, {
      details,
      retryable: true,
      retryAfterSeconds: 10
    });
  }
  static upstreamChallenge(message = "IMDb \u89E6\u53D1\u4E86 WAF \u6311\u6218\uFF0C\u6682\u65F6\u65E0\u6CD5\u83B7\u53D6\u6570\u636E") {
    return new _ApiError(ErrorCode.UPSTREAM_CHALLENGE, message, {
      retryable: true,
      retryAfterSeconds: 30,
      details: { hint: "\u7B49\u5F85 1-5 \u5206\u949F\u540E\u91CD\u8BD5\uFF0C\u6216\u4E3A\u5F53\u524D\u8FD0\u884C\u65F6\u914D\u7F6E\u6709\u6548\u7684\u4EE3\u7406 / IMDB_COOKIE" }
    });
  }
  static upstreamError(message = "\u4E0A\u6E38\u8FD4\u56DE\u5F02\u5E38\u72B6\u6001", details) {
    return new _ApiError(ErrorCode.UPSTREAM_ERROR, message, { details, retryable: true });
  }
  static internal(message = "\u670D\u52A1\u5185\u90E8\u9519\u8BEF", cause) {
    return new _ApiError(ErrorCode.INTERNAL_ERROR, message, { cause });
  }
  static notImplemented(message, details) {
    return new _ApiError(ErrorCode.NOT_IMPLEMENTED, message, { details });
  }
};
function isApiError(error) {
  return error instanceof ApiError;
}
__name(isApiError, "isApiError");
function toApiError(error) {
  if (isApiError(error)) return error;
  if (error instanceof Error) {
    if (error.name === "TimeoutError") return ApiError.upstreamTimeout(error.message);
    return ApiError.internal(error.message, error);
  }
  return ApiError.internal(typeof error === "string" ? error : "\u672A\u77E5\u9519\u8BEF", error);
}
__name(toApiError, "toApiError");

// src/lib/response.ts
function baseMeta(ctx) {
  return {
    requestId: ctx.requestId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    durationMs: Math.max(0, Date.now() - ctx.startedAt),
    version: API_VERSION,
    cached: ctx.cached ?? false,
    ...ctx.source ? { source: ctx.source } : {}
  };
}
__name(baseMeta, "baseMeta");
function successEnvelope(data, ctx, message = "OK") {
  return {
    code: toNumberCode(ErrorCode.OK),
    message,
    data,
    error: null,
    meta: baseMeta(ctx)
  };
}
__name(successEnvelope, "successEnvelope");
function errorEnvelope(error, ctx) {
  return {
    code: error.code,
    message: error.message,
    data: null,
    error: {
      type: error.symbol,
      ...error.details !== void 0 ? { details: error.details } : {},
      retryable: error.retryable
    },
    meta: baseMeta(ctx)
  };
}
__name(errorEnvelope, "errorEnvelope");
var ALLOWED_METHOD_HEADERS = "GET, HEAD, OPTIONS";
function buildResponseHeaders(options) {
  const headers2 = new Headers();
  headers2.set("Content-Type", "application/json; charset=utf-8");
  headers2.set("X-Request-Id", options.requestId);
  headers2.set("X-API-Version", API_VERSION);
  headers2.set("X-Response-Time", `${Math.max(0, Date.now() - options.startedAt)}ms`);
  if (options.code !== void 0) headers2.set("X-Business-Code", String(options.code));
  if (options.source) headers2.set("X-Data-Source", options.source);
  if (options.cache) {
    headers2.set("X-Cache", options.cache === "hit" ? "HIT" : options.cache === "miss" ? "MISS" : "BYPASS");
  }
  if (options.status === 200 && options.cacheTtlSeconds && options.cache !== "bypass") {
    const ttl = options.cacheTtlSeconds;
    headers2.set(
      "Cache-Control",
      `public, max-age=${Math.floor(ttl / 2)}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`
    );
  } else if (options.status >= 400) {
    headers2.set("Cache-Control", "no-store");
  } else {
    headers2.set("Cache-Control", "no-cache");
  }
  if (options.rateLimit) {
    headers2.set("X-RateLimit-Limit", String(options.rateLimit.limit));
    headers2.set("X-RateLimit-Remaining", String(options.rateLimit.remaining));
    headers2.set("X-RateLimit-Reset", String(Math.ceil(options.rateLimit.resetAt / 1e3)));
  }
  if (options.retryAfterSeconds) {
    headers2.set("Retry-After", String(options.retryAfterSeconds));
  }
  if (options.origin) {
    headers2.set("Access-Control-Allow-Origin", options.origin);
    headers2.set(
      "Access-Control-Expose-Headers",
      "X-Request-Id, X-API-Version, X-Data-Source, X-Business-Code, X-Cache, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Response-Time, Retry-After"
    );
    headers2.set("Access-Control-Allow-Credentials", "true");
  }
  headers2.set(
    "Vary",
    options.varyAuthorization ? "Accept-Encoding, Origin, Authorization" : "Accept-Encoding, Origin"
  );
  headers2.set("X-Content-Type-Options", "nosniff");
  return headers2;
}
__name(buildResponseHeaders, "buildResponseHeaders");
function corsPreflightHeaders(origin) {
  const headers2 = new Headers();
  if (origin) {
    headers2.set("Access-Control-Allow-Origin", origin);
    headers2.set("Access-Control-Allow-Credentials", "true");
  }
  headers2.set("Access-Control-Allow-Methods", ALLOWED_METHOD_HEADERS);
  headers2.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Request-Id, X-API-Key"
  );
  headers2.set("Access-Control-Max-Age", "86400");
  headers2.set("Vary", "Origin");
  return headers2;
}
__name(corsPreflightHeaders, "corsPreflightHeaders");
function jsonResponse(body, headers2, status) {
  return new Response(JSON.stringify(body), { status, headers: headers2 });
}
__name(jsonResponse, "jsonResponse");
function sendSuccess(data, ctx, options = {}) {
  const headers2 = buildResponseHeaders({
    status: 200,
    requestId: ctx.requestId,
    startedAt: ctx.startedAt,
    code: toNumberCode(ErrorCode.OK),
    cache: options.cache,
    cacheTtlSeconds: options.cacheTtlSeconds,
    source: ctx.source ?? options.source,
    rateLimit: options.rateLimit,
    origin: options.origin,
    varyAuthorization: options.varyAuthorization
  });
  return jsonResponse(successEnvelope(data, ctx, options.message ?? "OK"), headers2, 200);
}
__name(sendSuccess, "sendSuccess");
function sendError(error, ctx, options = {}) {
  const apiError = toApiError(error);
  const headers2 = buildResponseHeaders({
    status: apiError.status,
    requestId: ctx.requestId,
    startedAt: ctx.startedAt,
    code: apiError.code,
    origin: options.origin,
    rateLimit: options.rateLimit,
    retryAfterSeconds: apiError.retryAfterSeconds
  });
  return jsonResponse(errorEnvelope(apiError, ctx), headers2, apiError.status);
}
__name(sendError, "sendError");

// src/middleware/context.ts
function newRequestId() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
__name(newRequestId, "newRequestId");
async function contextMiddleware(c, next) {
  c.set("config", resolveConfig(c.env));
  c.set("requestId", c.req.header("x-request-id")?.trim() || newRequestId());
  c.set("startedAt", Date.now());
  const origin = c.req.header("origin") ?? null;
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsPreflightHeaders(origin) });
  }
  await next();
}
__name(contextMiddleware, "contextMiddleware");

// src/middleware/etag.ts
var MAX_HASH_BYTES = 512 * 1024;
function normalizeTag(tag) {
  return tag.trim().replace(/^W\//i, "");
}
__name(normalizeTag, "normalizeTag");
function matchesIfNoneMatch(header, etag) {
  if (!header) return false;
  if (header.trim() === "*") return true;
  const target = normalizeTag(etag);
  return header.split(",").some((part) => normalizeTag(part) === target);
}
__name(matchesIfNoneMatch, "matchesIfNoneMatch");
async function hashBody(text2) {
  const bytes = new TextEncoder().encode(text2);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  let hex = "";
  for (let index = 0; index < 8; index++) hex += digest[index].toString(16).padStart(2, "0");
  return hex;
}
__name(hashBody, "hashBody");
function canonicalBody(text2) {
  try {
    const parsed = JSON.parse(text2);
    if (parsed && typeof parsed === "object" && "code" in parsed && "meta" in parsed) {
      return JSON.stringify({
        code: parsed.code,
        data: parsed.data,
        error: parsed.error,
        version: parsed.meta?.version
      });
    }
  } catch {
  }
  return text2;
}
__name(canonicalBody, "canonicalBody");
async function etagMiddleware(c, next) {
  await next();
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD") return;
  const response = c.res;
  if (response.status !== 200) return;
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) return;
  const body = await response.clone().text();
  const headers2 = new Headers(response.headers);
  if (body.length <= MAX_HASH_BYTES) {
    const etag = `W/"${await hashBody(canonicalBody(body))}"`;
    headers2.set("ETag", etag);
    if (matchesIfNoneMatch(c.req.header("if-none-match"), etag)) {
      headers2.delete("content-length");
      c.res = new Response(null, { status: 304, headers: headers2 });
      return;
    }
  }
  c.res = new Response(method === "HEAD" ? null : body, { status: response.status, headers: headers2 });
}
__name(etagMiddleware, "etagMiddleware");

// src/lib/rate-limit.ts
var RateLimiter = class {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
  limit;
  windowMs;
  static {
    __name(this, "RateLimiter");
  }
  buckets = /* @__PURE__ */ new Map();
  check(key) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
      if (this.buckets.size > 1e4) this.cleanup(now);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt
    };
  }
  cleanup(now) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
};

// src/lib/session.ts
var CHALLENGE_PREFIX = "ptg1";
var SESSION_PREFIX = "s1";
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var CHALLENGE_TTL_SECONDS = 120;
var MAX_SOLUTION_LENGTH = 64;
var SESSION_COOKIE = "ptg_session";
var keyCache = /* @__PURE__ */ new Map();
function hmacKey(secret) {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    keyCache.set(secret, key);
  }
  return key;
}
__name(hmacKey, "hmacKey");
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
__name(base64UrlToBytes, "base64UrlToBytes");
function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}
__name(randomToken, "randomToken");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
__name(safeEqual, "safeEqual");
async function sign(secret, data) {
  const digest = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(digest));
}
__name(sign, "sign");
function splitToken(token, prefix) {
  const pieces = token.split(".");
  if (pieces.length !== 3 || pieces[0] !== prefix) return null;
  if (!pieces[1] || !pieces[2]) return null;
  return { part: pieces[1], signature: pieces[2] };
}
__name(splitToken, "splitToken");
function decodePayload(part) {
  try {
    return JSON.parse(decoder.decode(base64UrlToBytes(part)));
  } catch {
    return null;
  }
}
__name(decodePayload, "decodePayload");
function asObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
__name(asObject, "asObject");
function leadingZeroBits(bytes) {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}
__name(leadingZeroBits, "leadingZeroBits");
async function createChallenge(secret, difficulty, ttlSeconds = CHALLENGE_TTL_SECONDS) {
  const payload = {
    v: 1,
    n: randomToken(),
    e: Date.now() + ttlSeconds * 1e3,
    d: difficulty
  };
  const part = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(secret, `${CHALLENGE_PREFIX}.${part}`);
  return {
    challenge: `${CHALLENGE_PREFIX}.${part}.${signature}`,
    difficulty,
    expiresAt: payload.e
  };
}
__name(createChallenge, "createChallenge");
async function verifyChallenge(secret, challenge, solution) {
  const parsed = splitToken(challenge, CHALLENGE_PREFIX);
  if (!parsed) return false;
  if (typeof solution !== "string" || solution.length < 1 || solution.length > MAX_SOLUTION_LENGTH) {
    return false;
  }
  const expected = await sign(secret, `${CHALLENGE_PREFIX}.${parsed.part}`);
  if (!safeEqual(parsed.signature, expected)) return false;
  const payload = asObject(decodePayload(parsed.part));
  if (!payload || payload.v !== 1) return false;
  if (typeof payload.e !== "number" || payload.e < Date.now()) return false;
  if (typeof payload.d !== "number" || payload.d < 1 || payload.d > 24) return false;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${challenge}:${solution}`)
  );
  return leadingZeroBits(new Uint8Array(digest)) >= payload.d;
}
__name(verifyChallenge, "verifyChallenge");
async function createSession(secret, ttlSeconds) {
  const now = Date.now();
  const payload = {
    v: 1,
    sid: randomToken(),
    iat: now,
    exp: now + ttlSeconds * 1e3
  };
  const part = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(secret, `${SESSION_PREFIX}.${part}`);
  return {
    token: `${SESSION_PREFIX}.${part}.${signature}`,
    payload,
    maxAge: ttlSeconds
  };
}
__name(createSession, "createSession");
async function verifySession(secret, token) {
  if (!token) return null;
  const parsed = splitToken(token, SESSION_PREFIX);
  if (!parsed) return null;
  const expected = await sign(secret, `${SESSION_PREFIX}.${parsed.part}`);
  if (!safeEqual(parsed.signature, expected)) return null;
  const payload = asObject(decodePayload(parsed.part));
  if (!payload || payload.v !== 1) return null;
  if (typeof payload.sid !== "string" || !payload.sid) return null;
  if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;
  if (payload.exp <= Date.now()) return null;
  if (payload.iat > Date.now() + 6e4) return null;
  return {
    v: 1,
    sid: payload.sid,
    iat: payload.iat,
    exp: payload.exp
  };
}
__name(verifySession, "verifySession");
function readCookie(header, name) {
  if (!header) return void 0;
  for (const piece of header.split(";")) {
    const trimmed = piece.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    try {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    } catch {
      return void 0;
    }
  }
  return void 0;
}
__name(readCookie, "readCookie");
function cookieSuffix(secure) {
  return `; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
__name(cookieSuffix, "cookieSuffix");
function serializeSessionCookie(token, maxAgeSeconds, secure) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAgeSeconds}${cookieSuffix(secure)}`;
}
__name(serializeSessionCookie, "serializeSessionCookie");
function serializeClearedSessionCookie(secure) {
  return `${SESSION_COOKIE}=; Max-Age=0${cookieSuffix(secure)}`;
}
__name(serializeClearedSessionCookie, "serializeClearedSessionCookie");
function isSecureRequest(url, forwardedProto) {
  try {
    if (new URL(url).protocol === "https:") return true;
  } catch {
  }
  return forwardedProto?.split(",")[0]?.trim().toLowerCase() === "https";
}
__name(isSecureRequest, "isSecureRequest");

// src/middleware/index.ts
function safeEqual2(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
__name(safeEqual2, "safeEqual");
function extractBearer(header) {
  if (!header) return void 0;
  const match2 = header.match(/^Bearer\s+(.+)$/i);
  return match2?.[1]?.trim() || void 0;
}
__name(extractBearer, "extractBearer");
async function authMiddleware(c, next) {
  const config = c.get("config");
  const token = config.apiToken?.trim();
  const secret = config.authSecret?.trim();
  if (!token && !secret) {
    await next();
    return;
  }
  if (c.req.path.startsWith("/api/auth/")) {
    await next();
    return;
  }
  const provided = extractBearer(c.req.header("authorization")) ?? c.req.header("x-api-key")?.trim() ?? c.req.query("key")?.trim();
  if (token && provided && safeEqual2(provided, token)) {
    await next();
    return;
  }
  if (secret) {
    const sessionToken = readCookie(c.req.header("cookie"), SESSION_COOKIE);
    const session = await verifySession(secret, sessionToken);
    if (session) {
      c.set("session", session);
      await next();
      return;
    }
  }
  throw ApiError.unauthorized("\u9700\u8981 API Token \u6216\u6709\u6548 UI \u4F1A\u8BDD");
}
__name(authMiddleware, "authMiddleware");
var limiters = /* @__PURE__ */ new Map();
function limiter(kind, limit) {
  const key = `${kind}:${limit}`;
  let instance = limiters.get(key);
  if (!instance) {
    instance = new RateLimiter(limit, 6e4);
    limiters.set(key, instance);
  }
  return instance;
}
__name(limiter, "limiter");
function stricter(a, b) {
  return b.remaining < a.remaining ? b : a;
}
__name(stricter, "stricter");
async function rateLimitMiddleware(c, next) {
  const config = c.get("config");
  const limit = config.rateLimitMax;
  if (limit <= 0) {
    await next();
    return;
  }
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  let result = limiter("ip", limit).check(ip);
  const session = c.get("session");
  if (session) {
    result = stricter(result, limiter("session", limit).check(session.sid));
  }
  c.set("rateLimit", result);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1e3));
    throw new ApiError("RATE_LIMITED", `\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7 ${retryAfter} \u79D2\u540E\u91CD\u8BD5`, {
      retryable: true,
      retryAfterSeconds: retryAfter,
      details: { limit: result.limit }
    });
  }
  await next();
}
__name(rateLimitMiddleware, "rateLimitMiddleware");

// src/lib/redirect.ts
var MAX_REDIRECTS = 5;
function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
__name(isRedirectStatus, "isRedirectStatus");
function tooManyRedirectsError(url) {
  return new Error(`\u91CD\u5B9A\u5411\u6B21\u6570\u8D85\u8FC7 ${MAX_REDIRECTS} \u6B21: ${url}`);
}
__name(tooManyRedirectsError, "tooManyRedirectsError");
function nextRedirectRequest(target, location, method, body, status) {
  const nextTarget = new URL(location, target);
  if (status === 303 || (status === 301 || status === 302) && method === "POST") {
    return { target: nextTarget, method: "GET", body: void 0 };
  }
  return { target: nextTarget, method, body };
}
__name(nextRedirectRequest, "nextRedirectRequest");

// src/lib/edge-socket.ts
var MAX_BODY_BYTES = 12 * 1024 * 1024;
var MAX_HEADER_BYTES = 64 * 1024;
var connectLoader = null;
function loadConnect() {
  if (!connectLoader) {
    const specifier = "cloudflare:sockets";
    connectLoader = import(specifier).then((module) => module.connect);
  }
  return connectLoader;
}
__name(loadConnect, "loadConnect");
function normalizePort(port) {
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 443;
}
__name(normalizePort, "normalizePort");
function targetPort(target) {
  return normalizePort(Number.parseInt(target.port || "443", 10));
}
__name(targetPort, "targetPort");
function encode(value) {
  return new TextEncoder().encode(value);
}
__name(encode, "encode");
function concat(chunks, total) {
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}
__name(concat, "concat");
function timeoutError(url, timeoutMs) {
  const error = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
  error.name = "TimeoutError";
  return error;
}
__name(timeoutError, "timeoutError");
var DESCRIBED = /* @__PURE__ */ Symbol("connectErrorDescribed");
function describeConnectError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error[DESCRIBED]) return message;
  if (/TCP Loop detected/i.test(message)) {
    return `${message}\uFF08Cloudflare \u8BA4\u4E3A\u8FD9\u6761\u8FDE\u63A5\u4F1A\u7ED5\u56DE\u81EA\u8EAB\u7F51\u7EDC\uFF1A\u76EE\u6807\u53EF\u80FD\u662F Cloudflare IP \u6BB5\u3002\u82E5\u6362\u4EFB\u610F\u76EE\u6807\u90FD\u62A5\u8FD9\u4E2A\u9519\uFF0C\u8BF4\u660E\u5F53\u524D Worker \u5EFA\u7ACB\u4E0D\u4E86\u88F8 TCP\uFF0C\u6B64\u65F6\u53EA\u80FD\u7528 fetch \u51FA\u7F51\uFF09`;
  }
  if (/cannot connect to the specified address/i.test(message)) {
    return `${message}\uFF08\u76EE\u6807\u662F Cloudflare IP \u6BB5 / localhost / \u5185\u7F51\u5730\u5740\uFF0CWorkers \u7981\u6B62\u8FDE\u51FA\uFF09`;
  }
  return message;
}
__name(describeConnectError, "describeConnectError");
function mapConnectError(error) {
  if (error instanceof Error && error.name === "TimeoutError") return error;
  const mapped = new Error(describeConnectError(error));
  mapped[DESCRIBED] = true;
  return mapped;
}
__name(mapConnectError, "mapConnectError");
function openSocket(connect, address, options) {
  try {
    return connect(address, options);
  } catch (error) {
    throw mapConnectError(error);
  }
}
__name(openSocket, "openSocket");
function createWatchdog(close, timeoutMs, url) {
  let expired = false;
  const timer = setTimeout(
    () => {
      expired = true;
      close();
    },
    Math.max(0, timeoutMs)
  );
  return {
    clear() {
      clearTimeout(timer);
    },
    wrap(error) {
      if (expired) return timeoutError(url, timeoutMs);
      return error instanceof Error ? error : new Error(String(error));
    }
  };
}
__name(createWatchdog, "createWatchdog");
function protocolError(message) {
  throw new Error(message);
}
__name(protocolError, "protocolError");
function buildRequestBytes(target, options) {
  const headers2 = /* @__PURE__ */ new Map();
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    headers2.set(key.toLowerCase(), value);
  }
  headers2.delete("accept-encoding");
  headers2.set("accept-encoding", "gzip, deflate");
  headers2.set("connection", "close");
  if (!headers2.has("host")) headers2.set("host", target.host);
  const body = options.body;
  if (body !== void 0) headers2.set("content-length", String(encode(body).byteLength));
  const path = `${target.pathname || "/"}${target.search}`;
  const lines = [`${options.method ?? "GET"} ${path} HTTP/1.1`];
  for (const [key, value] of headers2) lines.push(`${key}: ${value}`);
  return encode(`${lines.join("\r\n")}\r
\r
${body ?? ""}`);
}
__name(buildRequestBytes, "buildRequestBytes");
function decodeChunked(body) {
  const chunks = [];
  let total = 0;
  let offset = 0;
  while (offset < body.byteLength) {
    let lineEnd = -1;
    for (let i = offset; i < body.byteLength - 1; i += 1) {
      if (body[i] === 13 && body[i + 1] === 10) {
        lineEnd = i;
        break;
      }
    }
    if (lineEnd === -1) break;
    const size = Number.parseInt(new TextDecoder("latin1").decode(body.subarray(offset, lineEnd)).trim(), 16);
    if (!Number.isFinite(size) || size <= 0) break;
    const start = lineEnd + 2;
    const chunk = body.subarray(start, start + size);
    chunks.push(chunk);
    total += chunk.byteLength;
    offset = start + size + 2;
  }
  return concat(chunks, total);
}
__name(decodeChunked, "decodeChunked");
async function decodeBody(body, contentEncoding) {
  const encoding = contentEncoding?.split(",").pop()?.trim().toLowerCase();
  if (!encoding || encoding === "identity") return body;
  if (encoding !== "gzip" && encoding !== "x-gzip" && encoding !== "deflate") return body;
  const format = encoding === "deflate" ? "deflate" : "gzip";
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
__name(decodeBody, "decodeBody");
async function exchange(tunnel, target, options, timeoutMs) {
  const watchdog = createWatchdog(
    () => void tunnel.close().catch(() => void 0),
    timeoutMs,
    target.toString()
  );
  const writer = tunnel.writable.getWriter();
  const reader = tunnel.readable.getReader();
  let finished = false;
  try {
    await writer.write(buildRequestBytes(target, options));
    const chunks = [];
    let total = 0;
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) protocolError("\u4E0A\u6E38\u54CD\u5E94\u4F53\u8D85\u8FC7\u4E0A\u9650");
    }
    const merged = concat(chunks, total);
    let headerEnd = -1;
    for (let i = 0; i < merged.byteLength - 3; i += 1) {
      if (merged[i] === 13 && merged[i + 1] === 10 && merged[i + 2] === 13 && merged[i + 3] === 10) {
        headerEnd = i;
        break;
      }
    }
    if (headerEnd === -1) protocolError("\u4E0A\u6E38\u54CD\u5E94\u7F3A\u5C11 HTTP \u5934");
    if (headerEnd > MAX_HEADER_BYTES) protocolError("\u4E0A\u6E38\u54CD\u5E94\u5934\u8FC7\u957F");
    finished = true;
    const head = new TextDecoder("latin1").decode(merged.subarray(0, headerEnd));
    const rest = merged.subarray(headerEnd + 4);
    const [statusLine, ...headerLines] = head.split("\r\n");
    const statusMatch = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/.exec(statusLine ?? "");
    const status = Number.parseInt(statusMatch?.[1] ?? "0", 10);
    if (!status) protocolError(`\u4E0A\u6E38\u8FD4\u56DE\u4E86\u65E0\u6CD5\u89E3\u6790\u7684\u54CD\u5E94: ${statusLine ?? ""}`);
    const headers2 = new Headers();
    for (const line of headerLines) {
      const separator = line.indexOf(":");
      if (separator <= 0) continue;
      headers2.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
    const transferEncoding = headers2.get("transfer-encoding")?.toLowerCase() ?? "";
    const contentEncoding = headers2.get("content-encoding");
    const rawBody = transferEncoding.includes("chunked") ? decodeChunked(rest) : rest;
    const body = await decodeBody(rawBody, contentEncoding);
    headers2.delete("transfer-encoding");
    headers2.delete("content-encoding");
    headers2.delete("content-length");
    return new Response(body, { status, statusText: statusMatch?.[2] ?? "", headers: headers2 });
  } catch (error) {
    throw watchdog.wrap(error);
  } finally {
    watchdog.clear();
    if (finished) {
      writer.releaseLock();
      reader.releaseLock();
    }
    void tunnel.close().catch(() => void 0);
  }
}
__name(exchange, "exchange");
function createTunnelClient(label, open) {
  return {
    label,
    async request(rawUrl, options) {
      const redirectMode = options.redirect ?? "follow";
      let target = new URL(rawUrl);
      let method = options.method ?? "GET";
      let body = options.body;
      const deadline = Date.now() + options.timeoutMs;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw timeoutError(rawUrl, options.timeoutMs);
        const tunnel = await open(target, deadline);
        const response = await exchange(
          tunnel,
          target,
          { ...options, method, body },
          Math.max(1, deadline - Date.now())
        );
        const location = response.headers.get("location");
        const redirectable = Boolean(location) && isRedirectStatus(response.status);
        if (redirectMode === "manual" || !redirectable) return response;
        if (hop === MAX_REDIRECTS) break;
        ({
          target,
          method,
          body
        } = nextRedirectRequest(target, location, method, body, response.status));
      }
      throw tooManyRedirectsError(rawUrl);
    }
  };
}
__name(createTunnelClient, "createTunnelClient");
var DOH_CACHE_TTL_MS = 60 * 1e3;
var dohCache = /* @__PURE__ */ new Map();
var DOH_ENDPOINTS = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];
async function resolveHostnameViaDoh(hostname) {
  const cached = dohCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.ip;
  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(3e3)
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const ip = (payload.Answer ?? []).find((answer) => answer.type === 1 && answer.data)?.data;
      if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) continue;
      dohCache.set(hostname, { ip, expiresAt: Date.now() + DOH_CACHE_TTL_MS });
      return ip;
    } catch {
    }
  }
  return "";
}
__name(resolveHostnameViaDoh, "resolveHostnameViaDoh");
function isUnsupportedHostnameOption(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /unsupported expectedServerHostname/i.test(message);
}
__name(isUnsupportedHostnameOption, "isUnsupportedHostnameOption");
function openTls(raw2, connectHost, serverHostname) {
  if (connectHost.toLowerCase() === serverHostname.toLowerCase()) return raw2.startTls();
  return raw2.startTls({ expectedServerHostname: serverHostname });
}
__name(openTls, "openTls");
async function openDirectTls(connect, address, serverHostname, url, deadline) {
  const viaIp = address.hostname.toLowerCase() !== serverHostname.toLowerCase();
  const raw2 = openSocket(connect, address, {
    secureTransport: "starttls",
    allowHalfOpen: false
  });
  raw2.closed.catch(() => void 0);
  const watchdog = createWatchdog(
    () => void raw2.close().catch(() => void 0),
    deadline - Date.now(),
    url
  );
  try {
    await raw2.opened;
    const tls = openTls(raw2, address.hostname, serverHostname);
    tls.closed.catch(() => void 0);
    await tls.opened;
    return tls;
  } catch (error) {
    await raw2.close().catch(() => void 0);
    if (viaIp && isUnsupportedHostnameOption(error)) {
      throw new Error(
        `\u5F53\u524D\u8FD0\u884C\u65F6\u4E0D\u652F\u6301 startTls({expectedServerHostname})\uFF0C\u65E0\u6CD5\u6309 IP \u8FDE\u63A5 ${serverHostname}\uFF1B\u8BF7\u6539\u7528\u57DF\u540D\u5EFA\u8FDE\u6216\u5173\u95ED socket \u901A\u9053`
      );
    }
    throw mapConnectError(watchdog.wrap(error));
  } finally {
    watchdog.clear();
  }
}
__name(openDirectTls, "openDirectTls");
function createDirectSocketClient() {
  return createTunnelClient("socket:direct", async (target, deadline) => {
    const connect = await loadConnect();
    const port = targetPort(target);
    try {
      return await openDirectTls(
        connect,
        { hostname: target.hostname, port },
        target.hostname,
        target.toString(),
        deadline
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/TCP Loop detected/i.test(message)) throw error;
      const ip = await resolveHostnameViaDoh(target.hostname);
      if (!ip) throw error;
      return openDirectTls(connect, { hostname: ip, port }, target.hostname, target.toString(), deadline);
    }
  });
}
__name(createDirectSocketClient, "createDirectSocketClient");

// src/lib/timeout.ts
function isTimeoutError(error) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}
__name(isTimeoutError, "isTimeoutError");
function abortableTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return { signal: controller.signal, clear: /* @__PURE__ */ __name(() => clearTimeout(timer), "clear") };
}
__name(abortableTimeout, "abortableTimeout");
async function fetchWithTimeout(url, init, timeoutMs = 8e3) {
  const { signal, clear } = abortableTimeout(timeoutMs);
  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clear();
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");

// src/lib/http.ts
function normalizeHeaders(base) {
  return { ...base ?? {} };
}
__name(normalizeHeaders, "normalizeHeaders");
function wrapTimeoutError(error, url, timeoutMs) {
  if (isTimeoutError(error)) {
    const timeoutError2 = new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    timeoutError2.name = "TimeoutError";
    return timeoutError2;
  }
  return error instanceof Error ? error : new Error(String(error));
}
__name(wrapTimeoutError, "wrapTimeoutError");
var directClient = {
  label: "direct",
  async request(url, options) {
    const { signal, clear } = abortableTimeout(options.timeoutMs);
    try {
      return await fetch(url, {
        method: options.method ?? "GET",
        headers: normalizeHeaders(options.headers),
        body: options.body,
        redirect: options.redirect ?? "follow",
        signal
      });
    } catch (error) {
      throw wrapTimeoutError(error, url, options.timeoutMs);
    } finally {
      clear();
    }
  }
};
var edgeDirectClient = null;
function isImdbHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "imdb.com" || host.endsWith(".imdb.com");
  } catch {
    return false;
  }
}
__name(isImdbHost, "isImdbHost");
function getEdgeDirectClient() {
  if (!edgeDirectClient) {
    const socketClient = normalizeUpstreamErrors(createDirectSocketClient());
    const fetchClient = normalizeUpstreamErrors(directClient);
    edgeDirectClient = {
      label: "edge:direct",
      async request(url, options) {
        if (!isImdbHost(url)) return fetchClient.request(url, options);
        try {
          return await socketClient.request(url, options);
        } catch (error) {
          if (isApiError(error) && error.symbol === ErrorCode.UPSTREAM_TIMEOUT) throw error;
          const reason = error instanceof Error ? error.message : String(error);
          console.warn(`[fetch] socket \u76F4\u8FDE ${url} \u5931\u8D25\uFF08${reason}\uFF09\uFF0C\u6539\u7528 fetch`);
          return fetchClient.request(url, options);
        }
      }
    };
  }
  return edgeDirectClient;
}
__name(getEdgeDirectClient, "getEdgeDirectClient");
function normalizeUpstreamErrors(client) {
  return {
    label: client.label,
    async request(url, options) {
      try {
        return await client.request(url, options);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error instanceof Error && error.name === "TimeoutError") {
          throw ApiError.upstreamTimeout(`\u4E0A\u6E38\u8BF7\u6C42\u8D85\u65F6: ${url}`);
        }
        throw ApiError.upstreamError(`\u4E0A\u6E38\u8BF7\u6C42\u5931\u8D25: ${url}`, {
          url,
          channel: client.label,
          cause: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };
}
__name(normalizeUpstreamErrors, "normalizeUpstreamErrors");
var clientCache = /* @__PURE__ */ new Map();
function getHttpClient(config) {
  let client = clientCache.get(config.runtime);
  if (!client) {
    client = normalizeUpstreamErrors(config.runtime === "edge" ? getEdgeDirectClient() : directClient);
    clientCache.set(config.runtime, client);
  }
  return Promise.resolve(client);
}
__name(getHttpClient, "getHttpClient");

// src/lib/ids.ts
function normalizeDoubanId(raw2) {
  const trimmed = raw2.trim();
  if (!/^\d{4,12}$/.test(trimmed)) {
    throw new ApiError("INVALID_DOUBAN_ID", `\u65E0\u6548\u7684\u8C46\u74E3 ID: "${raw2}"\uFF0C\u5E94\u4E3A\u7EAF\u6570\u5B57\uFF08\u5982 1292052\uFF09`);
  }
  return trimmed;
}
__name(normalizeDoubanId, "normalizeDoubanId");
function normalizeImdbId(raw2) {
  const trimmed = raw2.trim().toLowerCase();
  const withPrefix = trimmed.match(/^tt(\d{7,9})$/);
  if (withPrefix) return `tt${withPrefix[1]}`;
  const digitsOnly = trimmed.match(/^(\d{1,9})$/);
  if (digitsOnly) {
    const padded = digitsOnly[1].padStart(7, "0");
    if (padded.length > 9) throw ApiError.invalidImdbId(raw2);
    return `tt${padded}`;
  }
  throw ApiError.invalidImdbId(raw2);
}
__name(normalizeImdbId, "normalizeImdbId");
var TYPE_ALIASES = {
  tmdb: { movie: "movie", tv: "tv" },
  trakt: {
    movie: "movie",
    movies: "movie",
    film: "movie",
    show: "show",
    shows: "show",
    series: "show",
    tv: "show"
  }
};
var PREFIXED_ID = /^(movie|tv|show|movies|shows|film|series):(.+)$/i;
function normalizeDetailId(site, rawId, rawType) {
  let id = rawId.trim();
  if (!id) throw ApiError.badRequest("\u7F3A\u5C11\u6761\u76EE ID");
  let type = rawType?.trim().toLowerCase() || void 0;
  if (site === "tmdb" || site === "trakt") {
    const prefixed = id.match(PREFIXED_ID);
    if (prefixed) {
      type = type ?? prefixed[1].toLowerCase();
      id = prefixed[2].trim();
    }
    const normalized = type ? TYPE_ALIASES[site][type] : void 0;
    if (type && !normalized) {
      throw ApiError.badRequest(`\u4E0D\u652F\u6301\u7684 ${site} \u5A92\u4F53\u7C7B\u578B: ${type}`, {
        types: Object.keys(TYPE_ALIASES[site])
      });
    }
    type = normalized;
  } else {
    type = void 0;
  }
  if (site === "douban") id = normalizeDoubanId(id);
  else if (site === "imdb") id = normalizeImdbId(id);
  return { sid: id, type };
}
__name(normalizeDetailId, "normalizeDetailId");

// src/lib/cache.ts
var TtlCache = class {
  constructor(ttlMs, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }
  ttlMs;
  maxEntries;
  static {
    __name(this, "TtlCache");
  }
  store = /* @__PURE__ */ new Map();
  get(key) {
    const hit = this.store.get(key);
    if (!hit) return void 0;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return void 0;
    }
    return hit.value;
  }
  set(key, value, ttlMs = this.ttlMs) {
    if (this.store.size >= this.maxEntries) this.evict();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  evict() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      this.store.delete(oldest.value);
    }
  }
};

// src/lib/persistent-cache.ts
var D1_MAX_VALUE_BYTES = 9e5;
var ENVELOPE_VERSION = 1;
var encoder2 = new TextEncoder();
var EO_BINDING_KEYS = ["BLOB", "EO_BLOB", "EO_BUCKET", "BUCKET", "COS", "STORAGE"];
var VERCEL_BLOB_API = "https://vercel.com/api/blob";
var VERCEL_BLOB_API_VERSION = "13";
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
__name(describe, "describe");
var RATING_KEY_RE = /^(?:[a-z0-9]+_)*(?:rating|score)(?:_average)?$/i;
function ratingSignature(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value;
  const source = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? { ...record.data, ...record } : record;
  const parts = [];
  for (const key of Object.keys(source).sort()) {
    if (!RATING_KEY_RE.test(key)) continue;
    const raw2 = source[key];
    if (raw2 === void 0 || raw2 === null) continue;
    parts.push(`${key}=${normalizeRating(raw2)}`);
  }
  return parts.join("&");
}
__name(ratingSignature, "ratingSignature");
function normalizeRating(raw2) {
  if (typeof raw2 === "number") return Number.isFinite(raw2) ? String(raw2) : "";
  const text2 = String(raw2).trim();
  const match2 = text2.match(/-?\d+(?:\.\d+)?/);
  return match2 ? match2[0] : text2;
}
__name(normalizeRating, "normalizeRating");
var OBJECT_KEY_SUFFIX = ".json";
function withObjectSuffix(key) {
  return key.endsWith(OBJECT_KEY_SUFFIX) ? key : `${key}${OBJECT_KEY_SUFFIX}`;
}
__name(withObjectSuffix, "withObjectSuffix");
function withoutObjectSuffix(key) {
  if (!key.endsWith(OBJECT_KEY_SUFFIX)) return void 0;
  const bare = key.slice(0, -OBJECT_KEY_SUFFIX.length);
  return bare || void 0;
}
__name(withoutObjectSuffix, "withoutObjectSuffix");
function buildCacheKeys(source, resourceId, subType) {
  if (!source) return { r2: withObjectSuffix(resourceId), d1: resourceId };
  if (subType) {
    return {
      r2: withObjectSuffix(`${source}/${subType}/${resourceId}`),
      d1: `${source}_${subType}_${resourceId}`
    };
  }
  return { r2: withObjectSuffix(`${source}/${resourceId}`), d1: `${source}_${resourceId}` };
}
__name(buildCacheKeys, "buildCacheKeys");
function buildVariantKeys(source, resourceId, subType, full = true) {
  const variant = [subType?.trim() || null, full ? null : "base"].filter(Boolean).join("_");
  return buildCacheKeys(source, resourceId, variant || null);
}
__name(buildVariantKeys, "buildVariantKeys");
var registeredFs;
var registeredEo;
function asObjectStore(value) {
  if (!value || typeof value !== "object") return void 0;
  const candidate = value;
  if (typeof candidate.prepare === "function") return void 0;
  if (typeof candidate.get !== "function" || typeof candidate.put !== "function") return void 0;
  return candidate;
}
__name(asObjectStore, "asObjectStore");
function pickFromRecord(record) {
  if (!record) return void 0;
  for (const name of EO_BINDING_KEYS) {
    const found = asObjectStore(record[name]);
    if (found) return found;
  }
  const nested = record.eo;
  if (nested && typeof nested === "object") {
    const child = nested;
    for (const name of EO_BINDING_KEYS) {
      const found = asObjectStore(child[name]);
      if (found) return found;
    }
    return asObjectStore(child.blob) ?? asObjectStore(child.bucket);
  }
  return void 0;
}
__name(pickFromRecord, "pickFromRecord");
function pickEoStore(env) {
  const fromEnv = pickFromRecord(env);
  if (fromEnv) return fromEnv;
  return pickFromRecord(globalThis) ?? registeredEo;
}
__name(pickEoStore, "pickEoStore");
function normalizeBlobStoreId(value) {
  const trimmed = value?.trim();
  if (!trimmed) return void 0;
  return trimmed.startsWith("store_") ? trimmed.slice("store_".length) : trimmed;
}
__name(normalizeBlobStoreId, "normalizeBlobStoreId");
function parseStoreIdFromReadWriteToken(token) {
  const parts = token.trim().split("_");
  return parts[0] === "vercel" && parts[1] === "blob" && parts[2] === "rw" ? normalizeBlobStoreId(parts[3]) : void 0;
}
__name(parseStoreIdFromReadWriteToken, "parseStoreIdFromReadWriteToken");
function resolveBlobAccess(env) {
  const raw2 = readEnv(env, "BLOB_ACCESS")?.toLowerCase();
  return raw2 === "public" ? "public" : "private";
}
__name(resolveBlobAccess, "resolveBlobAccess");
function resolveVercelBlobStore(env) {
  const access = resolveBlobAccess(env);
  const rwToken = readEnv(env, "BLOB_READ_WRITE_TOKEN") ?? readEnv(env, "VERCEL_BLOB_READ_WRITE_TOKEN");
  const storeIdFromEnv = normalizeBlobStoreId(readEnv(env, "BLOB_STORE_ID"));
  if (rwToken) {
    return {
      token: rwToken,
      storeId: parseStoreIdFromReadWriteToken(rwToken) ?? storeIdFromEnv,
      access
    };
  }
  const oidc = readEnv(env, "VERCEL_OIDC_TOKEN");
  if (oidc && storeIdFromEnv) {
    return { token: oidc, storeId: storeIdFromEnv, access };
  }
  return void 0;
}
__name(resolveVercelBlobStore, "resolveVercelBlobStore");
function createCacheStore(env) {
  const flag = readEnv(env, "ENABLED_CACHE")?.toLowerCase();
  return {
    enabled: flag !== "false",
    r2: env?.R2_BUCKET,
    d1: env?.DB,
    blob: resolveVercelBlobStore(env),
    eo: pickEoStore(env),
    fs: registeredFs
  };
}
__name(createCacheStore, "createCacheStore");
function hasPersistentCache(store) {
  return Boolean(store?.enabled && (store.r2 || store.d1 || store.blob || store.eo || store.fs));
}
__name(hasPersistentCache, "hasPersistentCache");
function describeCacheStore(store) {
  if (!store?.enabled) return [];
  const layers = [];
  if (store.r2) layers.push("r2");
  if (store.d1) layers.push("d1");
  if (store.blob) layers.push("blob");
  if (store.eo) layers.push("eo");
  if (store.fs) layers.push("fs");
  return layers;
}
__name(describeCacheStore, "describeCacheStore");
function encode2(value) {
  const envelope2 = {
    v: ENVELOPE_VERSION,
    ts: Date.now(),
    data: value
  };
  return JSON.stringify(envelope2);
}
__name(encode2, "encode");
function decode(text2, ttlSeconds) {
  let parsed;
  try {
    parsed = JSON.parse(text2);
  } catch {
    return void 0;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
  const candidate = parsed;
  const wrapped = candidate.v === ENVELOPE_VERSION && typeof candidate.ts === "number" && "data" in candidate;
  if (wrapped && ttlSeconds !== void 0) {
    const ageSeconds = (Date.now() - candidate.ts) / 1e3;
    if (ageSeconds > ttlSeconds) return void 0;
  }
  return {
    value: wrapped ? candidate.data : parsed,
    cachedAt: wrapped ? candidate.ts : void 0
  };
}
__name(decode, "decode");
function blobObjectUrl(storeId, key, access) {
  const path = key.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `https://${storeId}.${access}.blob.vercel-storage.com/${path}`;
}
__name(blobObjectUrl, "blobObjectUrl");
function vercelBlobAuthHeaders(blob) {
  const headers2 = {
    authorization: `Bearer ${blob.token}`,
    "x-api-version": VERCEL_BLOB_API_VERSION
  };
  if (blob.storeId) headers2["x-vercel-blob-store-id"] = blob.storeId;
  return headers2;
}
__name(vercelBlobAuthHeaders, "vercelBlobAuthHeaders");
async function blobErrorDetail(response) {
  const text2 = await response.text().catch(() => "");
  return text2 ? `${response.status}: ${text2.slice(0, 300)}` : String(response.status);
}
__name(blobErrorDetail, "blobErrorDetail");
async function readFirstObjectKey(key, read) {
  const hit = await read(key);
  if (hit) return hit;
  const legacy = withoutObjectSuffix(key);
  if (!legacy) return void 0;
  return read(legacy);
}
__name(readFirstObjectKey, "readFirstObjectKey");
async function readR2(store, key) {
  if (!store.r2) return void 0;
  return readFirstObjectKey(key, async (candidate) => {
    try {
      const object = await store.r2.get(candidate);
      if (!object) return void 0;
      const text2 = await object.text();
      if (!text2) return void 0;
      console.info(`[Cache Hit] R2 for: ${candidate}`);
      return text2;
    } catch (error) {
      console.warn(`[Cache] R2 read failed for ${candidate}:`, describe(error));
      return void 0;
    }
  });
}
__name(readR2, "readR2");
async function readD1(store, key) {
  if (!store.d1) return void 0;
  try {
    const row = await store.d1.prepare("SELECT data FROM cache WHERE key = ?").bind(key).first();
    if (!row?.data) return void 0;
    console.info(`[Cache Hit] D1 for: ${key}`);
    return row.data;
  } catch (error) {
    console.warn(`[Cache] D1 read failed for ${key}:`, describe(error));
    return void 0;
  }
}
__name(readD1, "readD1");
async function readBlobViaHead(blob, key) {
  const headUrl = `${VERCEL_BLOB_API}?url=${encodeURIComponent(key)}`;
  const head = await fetchWithTimeout(headUrl, {
    method: "GET",
    headers: vercelBlobAuthHeaders(blob)
  });
  if (head.status === 404) return void 0;
  if (!head.ok) throw new Error(`blob head ${await blobErrorDetail(head)}`);
  const meta = await head.json();
  const blobUrl = meta.downloadUrl || meta.url;
  if (!blobUrl) return void 0;
  const body = await fetchWithTimeout(blobUrl, {
    headers: vercelBlobAuthHeaders(blob)
  });
  if (body.status === 404) return void 0;
  if (!body.ok) throw new Error(`blob get ${await blobErrorDetail(body)}`);
  const text2 = await body.text();
  return text2 || void 0;
}
__name(readBlobViaHead, "readBlobViaHead");
async function readBlob(store, key) {
  if (!store.blob) return void 0;
  const blob = store.blob;
  return readFirstObjectKey(key, async (candidate) => {
    try {
      if (blob.storeId) {
        const direct = await fetchWithTimeout(blobObjectUrl(blob.storeId, candidate, blob.access), {
          headers: vercelBlobAuthHeaders(blob)
        });
        if (direct.ok) {
          const text2 = await direct.text();
          if (text2) {
            console.info(`[Cache Hit] Blob for: ${candidate}`);
            return text2;
          }
        }
        if (direct.status !== 404 && direct.status !== 403 && direct.status !== 401) {
          console.warn(`[Cache] Blob read failed for ${candidate}: blob get ${await blobErrorDetail(direct)}`);
          return void 0;
        }
      }
      const viaHead = await readBlobViaHead(blob, candidate);
      if (viaHead) {
        console.info(`[Cache Hit] Blob for: ${candidate}`);
        return viaHead;
      }
      return void 0;
    } catch (error) {
      console.warn(`[Cache] Blob read failed for ${candidate}:`, describe(error));
      return void 0;
    }
  });
}
__name(readBlob, "readBlob");
async function unwrapObjectValue(raw2) {
  if (raw2 == null) return void 0;
  if (typeof raw2 === "string") return raw2 || void 0;
  if (raw2 instanceof Uint8Array) {
    return raw2.byteLength > 0 ? new TextDecoder().decode(raw2) : void 0;
  }
  if (typeof Response !== "undefined" && raw2 instanceof Response) {
    if (raw2.status === 404) return void 0;
    const text2 = await raw2.text();
    return text2 || void 0;
  }
  if (typeof raw2 === "object") {
    const object = raw2;
    if (typeof object.text === "function") {
      const text2 = await object.text();
      return text2 || void 0;
    }
    if (typeof object.body === "string") return object.body || void 0;
    if (typeof object.value === "string") return object.value || void 0;
    if (typeof object.arrayBuffer === "function") {
      const buffer = await object.arrayBuffer();
      return buffer.byteLength > 0 ? new TextDecoder().decode(buffer) : void 0;
    }
  }
  return void 0;
}
__name(unwrapObjectValue, "unwrapObjectValue");
async function readEo(store, key) {
  if (!store.eo) return void 0;
  return readFirstObjectKey(key, async (candidate) => {
    try {
      const text2 = await unwrapObjectValue(await store.eo.get(candidate));
      if (!text2) return void 0;
      console.info(`[Cache Hit] EO Blob for: ${candidate}`);
      return text2;
    } catch (error) {
      console.warn(`[Cache] EO read failed for ${candidate}:`, describe(error));
      return void 0;
    }
  });
}
__name(readEo, "readEo");
async function readFs(store, key) {
  if (!store.fs) return void 0;
  return readFirstObjectKey(key, async (candidate) => {
    try {
      const text2 = await store.fs.read(candidate);
      if (!text2) return void 0;
      console.info(`[Cache Hit] FS for: ${candidate}`);
      return text2;
    } catch (error) {
      console.warn(`[Cache] FS read failed for ${candidate}:`, describe(error));
      return void 0;
    }
  });
}
__name(readFs, "readFs");
async function readCache(store, keys, ttlSeconds) {
  if (!store || !hasPersistentCache(store)) return void 0;
  const layers = [
    { name: "r2", read: /* @__PURE__ */ __name(() => readR2(store, keys.r2), "read") },
    { name: "d1", read: /* @__PURE__ */ __name(() => readD1(store, keys.d1), "read") },
    { name: "blob", read: /* @__PURE__ */ __name(() => readBlob(store, keys.r2), "read") },
    { name: "eo", read: /* @__PURE__ */ __name(() => readEo(store, keys.r2), "read") },
    { name: "fs", read: /* @__PURE__ */ __name(() => readFs(store, keys.r2), "read") }
  ];
  for (const layer of layers) {
    const text2 = await layer.read();
    if (!text2) continue;
    const decoded = decode(text2, ttlSeconds);
    if (decoded) return { ...decoded, layer: layer.name };
  }
  return void 0;
}
__name(readCache, "readCache");
async function writeR2(store, key, json) {
  if (!store.r2) return;
  try {
    await store.r2.put(key, json, {
      httpMetadata: { contentType: "application/json" }
    });
    console.info(`[Cache Write] R2 for: ${key}`);
  } catch (error) {
    console.warn(`[Cache] R2 write failed for ${key}:`, describe(error));
  }
}
__name(writeR2, "writeR2");
async function writeD1(store, key, json) {
  if (!store.d1) return;
  if (encoder2.encode(json).length > D1_MAX_VALUE_BYTES) {
    console.warn(`[Cache] Skip D1 write for ${key}: value exceeds 900 KB`);
    return;
  }
  try {
    await store.d1.prepare("INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)").bind(key, json, Date.now()).run();
    console.info(`[Cache Write] D1 for: ${key}`);
  } catch (error) {
    console.warn(`[Cache] D1 write failed for ${key}:`, describe(error));
  }
}
__name(writeD1, "writeD1");
async function writeBlob(store, key, json) {
  if (!store.blob) return;
  try {
    const url = `${VERCEL_BLOB_API}?pathname=${encodeURIComponent(key)}`;
    const response = await fetchWithTimeout(url, {
      method: "PUT",
      headers: {
        ...vercelBlobAuthHeaders(store.blob),
        "x-vercel-blob-access": store.blob.access,
        "x-content-type": "application/json",
        "x-add-random-suffix": "0",
        "x-allow-overwrite": "1"
      },
      body: json
    });
    if (!response.ok) {
      console.warn(`[Cache] Blob write failed for ${key}: blob put ${await blobErrorDetail(response)}`);
      return;
    }
    console.info(`[Cache Write] Blob for: ${key}`);
  } catch (error) {
    console.warn(`[Cache] Blob write failed for ${key}:`, describe(error));
  }
}
__name(writeBlob, "writeBlob");
async function writeEo(store, key, json) {
  if (!store.eo) return;
  try {
    await store.eo.put(key, json, { contentType: "application/json" });
    console.info(`[Cache Write] EO Blob for: ${key}`);
  } catch (error) {
    console.warn(`[Cache] EO write failed for ${key}:`, describe(error));
  }
}
__name(writeEo, "writeEo");
async function writeFs(store, key, json) {
  if (!store.fs) return;
  try {
    await store.fs.write(key, json);
    console.info(`[Cache Write] FS for: ${key}`);
  } catch (error) {
    console.warn(`[Cache] FS write failed for ${key}:`, describe(error));
  }
}
__name(writeFs, "writeFs");
async function writeCache(store, keys, value) {
  if (!store?.enabled || value === void 0 || value === null) return;
  let json;
  try {
    json = encode2(value);
  } catch (error) {
    console.warn("[Cache] serialize failed:", describe(error));
    return;
  }
  await Promise.all([
    writeR2(store, keys.r2, json),
    writeD1(store, keys.d1, json),
    writeBlob(store, keys.r2, json),
    writeEo(store, keys.r2, json),
    writeFs(store, keys.r2, json)
  ]);
}
__name(writeCache, "writeCache");
var ratingRevalidations = /* @__PURE__ */ new Map();
var lastRatingCheck = /* @__PURE__ */ new Map();
async function readThrough(options) {
  const { memory, memoryKey, store, keys, ttlSeconds, ratingRefreshSeconds = 0, databaseFallback, loader } = options;
  const intervalMs = Math.max(0, ratingRefreshSeconds) * 1e3;
  const canRefresh = intervalMs > 0;
  const revalidationKey = `${memoryKey}\0${keys?.r2 ?? ""}\0${keys?.d1 ?? ""}`;
  const isDue = /* @__PURE__ */ __name((checkedAt) => canRefresh && (checkedAt === void 0 || Date.now() - checkedAt >= intervalMs), "isDue");
  const isFailed = /* @__PURE__ */ __name((value2) => Boolean(value2 && typeof value2 === "object" && value2.success === false), "isFailed");
  const revalidate = /* @__PURE__ */ __name(async (cached, layer2, checkedAt) => {
    if (!isDue(checkedAt)) return { value: cached, layer: layer2 };
    const pending = ratingRevalidations.get(revalidationKey);
    if (pending) return pending;
    const task = (async () => {
      try {
        const fresh = await loader();
        memory?.set(memoryKey, fresh);
        lastRatingCheck.set(revalidationKey, Date.now());
        const failed = isFailed(fresh);
        if (failed) return { value: cached, layer: layer2 };
        const changed = ratingSignature(fresh) !== ratingSignature(cached);
        if (changed && keys && hasPersistentCache(store)) {
          await writeCache(store, keys, fresh);
          console.info(`[Cache Rating] updated ${keys.r2 || keys.d1}`);
        }
        return { value: fresh, layer: layer2 };
      } catch (error) {
        lastRatingCheck.set(revalidationKey, Date.now());
        console.warn(
          `[Cache Rating] refresh failed for ${keys?.r2 ?? memoryKey}:`,
          describe(error)
        );
        return { value: cached, layer: layer2 };
      } finally {
        ratingRevalidations.delete(revalidationKey);
      }
    })();
    ratingRevalidations.set(
      revalidationKey,
      task
    );
    return task;
  }, "revalidate");
  const memoryHit = memory?.get(memoryKey);
  if (memoryHit !== void 0) {
    const checkedAt = lastRatingCheck.get(revalidationKey);
    if (!isDue(checkedAt)) return { value: memoryHit, layer: "memory" };
    return revalidate(memoryHit, "memory", checkedAt);
  }
  if (keys) {
    const hit = await readCache(store, keys, ttlSeconds);
    if (hit) {
      memory?.set(memoryKey, hit.value);
      const checkedAt = lastRatingCheck.get(revalidationKey) ?? hit.cachedAt ?? Date.now();
      lastRatingCheck.set(revalidationKey, checkedAt);
      if (!isDue(checkedAt)) return { value: hit.value, layer: hit.layer };
      return revalidate(hit.value, hit.layer, checkedAt);
    }
  }
  let value;
  let layer;
  if (databaseFallback) {
    value = await databaseFallback();
    if (value !== void 0) layer = "database";
  }
  if (value === void 0) value = await loader();
  memory?.set(memoryKey, value);
  lastRatingCheck.set(revalidationKey, Date.now());
  if (keys && !isFailed(value)) await writeCache(store, keys, value);
  return { value, layer };
}
__name(readThrough, "readThrough");

// src/lib/time.ts
function parseTimestampMs(value) {
  const raw2 = value?.trim();
  if (!raw2) return null;
  const digits = /^\d+$/.test(raw2);
  const n = digits ? Number(raw2) : Date.parse(raw2);
  if (!Number.isFinite(n)) return null;
  return digits && n < 1e12 ? n * 1e3 : n;
}
__name(parseTimestampMs, "parseTimestampMs");
function toIso(timestamp) {
  return new Date(timestamp).toISOString();
}
__name(toIso, "toIso");
function remainingSeconds(expiresAtMs, now = Date.now()) {
  if (expiresAtMs === null) return null;
  return Math.max(0, Math.floor((expiresAtMs - now) / 1e3));
}
__name(remainingSeconds, "remainingSeconds");
function timestampFields(value, now = Date.now()) {
  const ms = parseTimestampMs(value);
  return {
    ms,
    iso: ms === null ? null : toIso(ms),
    remainingSeconds: remainingSeconds(ms, now)
  };
}
__name(timestampFields, "timestampFields");

// src/format/helpers.ts
function ensureArray(value) {
  if (value === null || value === void 0) return [];
  return Array.isArray(value) ? value : [value];
}
__name(ensureArray, "ensureArray");
function safe(value, fallback = "") {
  if (value === null || value === void 0) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  return String(value);
}
__name(safe, "safe");
function formatActorList(actors) {
  if (Array.isArray(actors)) {
    return actors.map((actor) => {
      if (typeof actor === "string") return actor.trim();
      if (actor && typeof actor === "object") {
        const item = actor;
        return safe(item.name ?? item.name_cn ?? item.actor);
      }
      return "";
    }).filter(Boolean).join(" / ");
  }
  return safe(actors);
}
__name(formatActorList, "formatActorList");
function formatCharacters(chars = []) {
  return chars.filter(Boolean).map((item) => {
    const character = item;
    const name = safe(character.name);
    const nameCn = safe(character.name_cn);
    const actors = formatActorList(character.actors);
    const title = nameCn ? `${name} (${nameCn})` : name || nameCn;
    if (!title) return null;
    return actors ? `${title}: ${actors}` : title;
  }).filter((value) => Boolean(value));
}
__name(formatCharacters, "formatCharacters");

// src/format/generators.ts
var MAX_WIDTH = 125;
var isValidArray = /* @__PURE__ */ __name((arr) => Array.isArray(arr) && arr.length > 0, "isValidArray");
var unwrapMediaData = /* @__PURE__ */ __name((raw2) => {
  if (!raw2 || typeof raw2 !== "object") return raw2 || {};
  const inner = raw2.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && (inner.introduction || inner.plot || inner.description || inner.chinese_title || inner.poster || inner.name || inner.imdb_rating || inner.douban_rating)) {
    return { ...raw2, ...inner };
  }
  return raw2;
}, "unwrapMediaData");
var COUNTRY_ALIASES = {
  USA: "United States",
  US: "United States",
  "United States of America": "United States",
  UK: "United Kingdom",
  "Great Britain": "United Kingdom",
  "Hong Kong SAR": "Hong Kong",
  "Hong Kong SAR China": "Hong Kong",
  "Taiwan, Province of China": "Taiwan"
};
var normalizeCountry = /* @__PURE__ */ __name((value) => {
  const country = String(value ?? "").trim();
  return COUNTRY_ALIASES[country] || country;
}, "normalizeCountry");
var PREFERRED_COUNTRIES = ["United States", "United Kingdom", "Taiwan", "Hong Kong"];
var selectPreferredCountries = /* @__PURE__ */ __name((items, countryOf, max = 5) => {
  const preferred = /* @__PURE__ */ new Map();
  const others = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of items) {
    const country = normalizeCountry(countryOf(item));
    if (PREFERRED_COUNTRIES.includes(country)) {
      if (!preferred.has(country)) preferred.set(country, item);
      continue;
    }
    const key = country || "__unknown__";
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(item);
  }
  const ordered = PREFERRED_COUNTRIES.map((country) => preferred.get(country)).filter(Boolean);
  return [...ordered, ...others].slice(0, max);
}, "selectPreferredCountries");
var formatTenScore = /* @__PURE__ */ __name((score, votes) => {
  if (score == null || score === "") return "";
  const text2 = String(score).trim();
  if (!text2) return "";
  if (/\/\s*10\s+from\s+/i.test(text2)) return text2;
  const voteText = votes != null && String(votes).trim() !== "" ? String(votes).trim() : "";
  const scoreOnly = text2.replace(/\s*\/\s*10\s*$/i, "").trim();
  if (voteText) return `${scoreOnly} / 10 from ${voteText} users`;
  return text2;
}, "formatTenScore");
var formatDoubanCast = /* @__PURE__ */ __name((person) => {
  const rawName = String(person?.name || "").trim();
  if (!rawName) return "";
  const name = /^[\u4e00-\u9fff]{2}$/.test(rawName) ? `${rawName[0]}\u3000${rawName[1]}` : rawName;
  const character = String(person?.character || "").trim();
  return character ? `${name} (${character})` : name;
}, "formatDoubanCast");
var processPersonField = /* @__PURE__ */ __name((personData, label) => {
  let content = "";
  if (Array.isArray(personData)) {
    content = personData.join(" / ").trim();
  } else if (typeof personData === "string") {
    content = personData.split(/[、\/,]/).map((p) => p.trim()).filter(Boolean).join(" / ");
  }
  return content ? formatWrappedLine({ label, content, maxWidth: MAX_WIDTH }) : null;
}, "processPersonField");
var wrapTextWithIndent = /* @__PURE__ */ __name((text2, maxWidth, indentString) => {
  const indentWidth = getStringVisualLength(indentString);
  const contentWidth = maxWidth - indentWidth;
  if (contentWidth <= 0) {
    return indentString + text2;
  }
  const result = [];
  const paragraphs = String(text2 ?? "").replace(/\r\n/g, "\n").split("\n");
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }
    const tokens = paragraph.match(
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ufe30-\ufe6f]|[^\s\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\ufe30-\ufe6f]+\s*/g
    ) || [];
    let currentLine = "";
    let currentLineWidth = 0;
    const flush = /* @__PURE__ */ __name(() => {
      if (!currentLine) return;
      result.push(indentString + currentLine.trimEnd());
      currentLine = "";
      currentLineWidth = 0;
    }, "flush");
    for (const token of tokens) {
      const tokenWidth = getStringVisualLength(token);
      if (currentLineWidth + tokenWidth <= contentWidth) {
        currentLine += token;
        currentLineWidth += tokenWidth;
        continue;
      }
      flush();
      if (tokenWidth <= contentWidth) {
        currentLine = token;
        currentLineWidth = tokenWidth;
        continue;
      }
      for (const char of token) {
        const width = charVisualWidth(char.charCodeAt(0));
        if (currentLineWidth + width > contentWidth) {
          result.push(indentString + currentLine);
          currentLine = "";
          currentLineWidth = 0;
        }
        currentLine += char;
        currentLineWidth += width;
      }
    }
    flush();
  }
  return result.join("\n");
}, "wrapTextWithIndent");
var charVisualWidth = /* @__PURE__ */ __name((charCode) => charCode >= 4352 && charCode <= 4447 || // 假名、注音、CJK 部首/笔画、CJK 统一表意文字、扩展 A、彝族文字等
charCode >= 11904 && charCode <= 42191 && charCode !== 12351 || charCode >= 44032 && charCode <= 55203 || charCode >= 63744 && charCode <= 64255 || charCode >= 65040 && charCode <= 65049 || charCode >= 65072 && charCode <= 65135 || charCode >= 65281 && charCode <= 65376 || charCode >= 65504 && charCode <= 65510 || charCode === 9673 ? 2 : 1, "charVisualWidth");
var DESCRIPTION_MAX_WIDTH = 110;
var LIST_MAX_WIDTH = 100;
var FIELD_MARKER = "\u25C9\u3000";
var FIELD_MARKER_WIDTH = 4;
var getStringVisualLength = /* @__PURE__ */ __name((str) => {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    length += charVisualWidth(str.charCodeAt(i));
  }
  return length;
}, "getStringVisualLength");
var ENGLISH_INDENT = "\0";
var plainFieldLabel = /* @__PURE__ */ __name((name) => `${FIELD_MARKER}${name}${ENGLISH_INDENT}`, "plainFieldLabel");
var alignEnglishFieldLabels = /* @__PURE__ */ __name((text2) => {
  const lines = String(text2).split("\n");
  const markerLen = FIELD_MARKER.length;
  let maxNameWidth = 0;
  for (const line of lines) {
    if (line.startsWith(ENGLISH_INDENT)) continue;
    const index = line.indexOf(ENGLISH_INDENT);
    if (index > markerLen) {
      maxNameWidth = Math.max(maxNameWidth, index - markerLen);
    }
  }
  if (maxNameWidth === 0) return text2;
  const keyWidth = FIELD_MARKER_WIDTH + maxNameWidth + 1;
  const indent = " ".repeat(keyWidth);
  return lines.map((line) => {
    if (line.startsWith(ENGLISH_INDENT)) {
      return indent + line.slice(ENGLISH_INDENT.length);
    }
    const index = line.indexOf(ENGLISH_INDENT);
    if (index <= 0) return line;
    const label = line.slice(0, index);
    const value = line.slice(index + ENGLISH_INDENT.length).trimStart();
    if (!value) return label;
    return label + " ".repeat(keyWidth - getStringVisualLength(label)) + value;
  }).join("\n");
}, "alignEnglishFieldLabels");
var formatEnglishActor = /* @__PURE__ */ __name((person) => {
  if (person == null) return "";
  if (typeof person === "string") return person.trim();
  const name = String(person.name || person.person?.name || "").trim();
  if (!name) return "";
  const character = String(person.character ?? "").trim();
  return character ? `${name} (${character})` : name;
}, "formatEnglishActor");
var formatEnglishList = /* @__PURE__ */ __name((label, content, separator = " / ") => {
  const text2 = String(content).trim();
  if (!text2) return label.trimEnd();
  return formatWrappedLine({
    label,
    content: text2,
    maxWidth: LIST_MAX_WIDTH,
    separator,
    // 续行缩进在 alignEnglishFieldLabels 里按最终列宽统一替换。
    indent: ENGLISH_INDENT
  });
}, "formatEnglishList");
var indentFromLabel = /* @__PURE__ */ __name((label) => Array.from(label, (ch) => {
  if (ch === " " || ch === "	" || ch === "\u3000") return ch;
  return charVisualWidth(ch.charCodeAt(0)) === 2 ? "\u3000" : " ";
}).join(""), "indentFromLabel");
var formatWrappedLine = /* @__PURE__ */ __name(({ label, content, maxWidth, separator = " / ", indent }) => {
  if (!content || content.trim() === "") {
    return label;
  }
  const items = content.split(separator);
  const labelVisualWidth = getStringVisualLength(label);
  const indentString = indent ?? indentFromLabel(label);
  const separatorVisualWidth = getStringVisualLength(separator);
  let lines = [];
  let currentLine = label;
  let currentLineVisualWidth = labelVisualWidth;
  items.forEach((item, index) => {
    const itemVisualWidth = getStringVisualLength(item);
    if (index > 0 && currentLineVisualWidth + separatorVisualWidth + itemVisualWidth > maxWidth) {
      lines.push(currentLine.trimEnd() + separator.trimEnd());
      currentLine = indentString + item;
      currentLineVisualWidth = labelVisualWidth + itemVisualWidth;
    } else {
      if (index === 0) {
        currentLine += item;
        currentLineVisualWidth += itemVisualWidth;
      } else {
        currentLine += separator + item;
        currentLineVisualWidth += separatorVisualWidth + itemVisualWidth;
      }
    }
  });
  lines.push(currentLine);
  return lines.join("\n");
}, "formatWrappedLine");
var processRequirements = /* @__PURE__ */ __name((reqText, title) => {
  if (typeof reqText !== "string" || !reqText) {
    return "";
  }
  const cleaned = cleanHtml(reqText);
  const lines = cleaned.split("\n").map((line) => line.trim()).filter((line) => Boolean(line));
  if (lines.length === 0) return "";
  const result = [];
  result.push(`\u25C9\u3000${title}`);
  let buffer = [];
  const labelSet = /* @__PURE__ */ new Set([
    "minimum:",
    "recommended:",
    "minimum",
    "recommended",
    "\u6700\u4F4E\u914D\u7F6E:",
    "\u63A8\u8350\u914D\u7F6E:",
    "\u6700\u4F4E\u914D\u7F6E",
    "\u63A8\u8350\u914D\u7F6E"
  ]);
  const appendWrapped = /* @__PURE__ */ __name((bufLines, indent = "    ", max = 80) => {
    for (let i = 0; i < bufLines.length; i++) {
      const line = bufLines[i];
      const wrapped = wrapLines(line, indent, max);
      if (Array.isArray(wrapped)) {
        result.push(...wrapped);
      } else {
        result.push(wrapped);
      }
    }
  }, "appendWrapped");
  for (const rawLine of lines) {
    if (!rawLine) continue;
    const line = rawLine.trim();
    const lower = line.toLowerCase();
    if (labelSet.has(lower) || labelSet.has(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }
    if (/^(additional notes|附注事项|备注)[:：]?\s*/i.test(line)) {
      if (buffer.length > 0) {
        appendWrapped(buffer);
        buffer = [];
      }
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length > 0) {
    appendWrapped(buffer);
  }
  result.push("");
  return result.join("\n");
}, "processRequirements");
var cleanHtml = /* @__PURE__ */ __name((html) => {
  if (!html) {
    return "";
  }
  return String(html).replace(/<br\s*\/?>/gi, "\n").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<\/?(?:strong|ul|li)[^>]*>/gi, "").replace(/<\/?[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\r\n/g, "\n").trim();
}, "cleanHtml");
var wrapLines = /* @__PURE__ */ __name((text2, indent = "  ", max = 80) => {
  if (!text2) {
    return "";
  }
  if (max <= 0) {
    max = 80;
  }
  if (indent.length >= max) {
    indent = "  ";
  }
  const words = String(text2).split(/\s+/);
  let currentLine = indent;
  const lines = [];
  for (const word of words) {
    if (word.length >= max - indent.length) {
      if (currentLine !== indent) {
        lines.push(currentLine);
      }
      lines.push(indent + word);
      currentLine = indent;
      continue;
    }
    const separator = currentLine === indent ? "" : " ";
    if (currentLine.length + separator.length + word.length > max) {
      lines.push(currentLine);
      currentLine = indent + word;
    } else {
      currentLine += separator + word;
    }
  }
  if (currentLine !== indent) {
    lines.push(currentLine);
  }
  return lines.join("\n");
}, "wrapLines");
var generateDoubanFormat = /* @__PURE__ */ __name((raw2) => {
  const data = unwrapMediaData(raw2);
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]
`);
  if (data.chinese_title) {
    lines.push(`\u25C9\u3000\u7247\u3000\u3000\u540D\u3000${data.chinese_title}`);
  } else if (data.foreign_title) {
    lines.push(`\u25C9\u3000\u7247\u3000\u3000\u540D\u3000${data.foreign_title}`);
  }
  if (data.aka && data.aka.length)
    lines.push(`\u25C9\u3000\u8BD1\u3000\u3000\u540D\u3000${data.aka.join(" / ").trim()}`);
  if (data.year) lines.push(`\u25C9\u3000\u5E74\u3000\u3000\u4EE3\u3000${data.year}`);
  if (data.region && data.region.length)
    lines.push(`\u25C9\u3000\u4EA7\u3000\u3000\u5730\u3000${data.region.join(" / ")}`);
  if (data.genre && data.genre.length)
    lines.push(`\u25C9\u3000\u7C7B\u3000\u3000\u522B\u3000${data.genre.join(" / ")}`);
  if (data.language && data.language.length)
    lines.push(`\u25C9\u3000\u8BED\u3000\u3000\u8A00\u3000${data.language.join(" / ")}`);
  if (data.duration) lines.push(`\u25C9\u3000\u7247\u3000\u3000\u957F\u3000${data.duration}`);
  if (data.playdate && data.playdate.length)
    lines.push(`\u25C9\u3000\u4E0A\u6620\u65E5\u671F\u3000${data.playdate.join(" / ")}`);
  const imdbRating = formatTenScore(
    data.imdb_rating || data.imdb_rating_average,
    data.imdb_votes || data.imdb_vote_count
  );
  if (data.imdb_id && imdbRating) {
    lines.push(`\u25C9\u3000IMDb\u8BC4\u5206\u3000${imdbRating}`);
  }
  if (data.imdb_link) lines.push(`\u25C9\u3000IMDb\u94FE\u63A5\u3000${data.imdb_link}`);
  const doubanRating = formatTenScore(
    data.douban_rating || data.douban_rating_average,
    data.douban_votes || data.votes
  );
  lines.push(`\u25C9\u3000\u8C46\u74E3\u8BC4\u5206\u3000${doubanRating || data.douban_rating || ""}`);
  const doubanLink = data.douban_link || data.link;
  if (doubanLink) lines.push(`\u25C9\u3000\u8C46\u74E3\u94FE\u63A5\u3000${doubanLink}`);
  if (data.tags && data.tags.length)
    lines.push(`\u25C9\u3000\u6807\u3000\u3000\u7B7E\u3000${data.tags.slice(0, 5).join(" | ")}`);
  if (data.episodes) lines.push(`\u25C9\u3000\u96C6\u3000\u3000\u6570\u3000${data.episodes}`);
  if (data.director && data.director.length)
    lines.push(`\u25C9\u3000\u5BFC\u3000\u3000\u6F14\u3000${data.director.map((x) => x.name).join(" / ")}`);
  if (data.writer && data.writer.length) {
    const content = data.writer.map((x) => x.name).join(" / ").trim();
    lines.push(`\u25C9\u3000\u7F16\u3000\u3000\u5267\u3000${content}`);
  }
  if (data.cast && data.cast.length) {
    const castNames = data.cast.map(formatDoubanCast).filter(Boolean);
    if (castNames.length) {
      lines.push(
        [
          `\u25C9\u3000\u4E3B\u3000\u3000\u6F14\u3000${castNames[0]}`,
          ...castNames.slice(1).map((name) => `\u3000\u3000\u3000\u3000\u3000\u3000\u3000${name}`)
        ].join("\n")
      );
    }
  }
  const introduction = data.introduction || data.summary || data.description || data.plot || "";
  if (introduction) {
    lines.push(`
\u25C9\u3000\u7B80\u3000\u3000\u4ECB
`);
    lines.push(`\u3000\u3000${String(introduction).replace(/\n/g, "\n\u3000\u3000")}`);
  }
  if (data.awards && Array.isArray(data.awards) && data.awards.length) {
    lines.push(`
\u25C9\u3000\u83B7\u5956\u60C5\u51B5
`);
    const awardsLines = data.awards.map((awardBlock, index) => {
      if (typeof awardBlock === "string") {
        return `\u3000\u3000${awardBlock}`;
      } else if (awardBlock && awardBlock.festival && Array.isArray(awardBlock.awards)) {
        const festivalLine = `${index === 0 ? "" : "\n"}${awardBlock.festival}`;
        const awardsLines2 = awardBlock.awards.map((award) => `\u3000\u3000${award}`);
        return [festivalLine, ...awardsLines2].join("\n");
      }
      return "";
    }).filter((line) => line !== "");
    lines.push(awardsLines.join("\n"));
  }
  return lines.join("\n").trim();
}, "generateDoubanFormat");
var generateImdbFormat = /* @__PURE__ */ __name((raw2) => {
  const data = unwrapMediaData(raw2);
  const lines = [];
  const releaseInfo = [];
  const field = /* @__PURE__ */ __name((name, content) => {
    if (content == null || String(content).trim() === "") return;
    lines.push(plainFieldLabel(name) + content);
  }, "field");
  const wrappedField = /* @__PURE__ */ __name((name, content) => {
    if (content == null || String(content).trim() === "") return;
    lines.push(
      formatEnglishList(plainFieldLabel(name), String(content).trim())
    );
  }, "wrappedField");
  lines.push(`[img]${data.image ?? data.poster}[/img]
`);
  field("Title", data.original_title || data.name);
  if (data.type && typeof data.type === "string") {
    field("Type", data.type.charAt(0).toUpperCase() + data.type.slice(1));
  }
  field("Year", data.year);
  if (Array.isArray(data.origin_country) && data.origin_country.length) {
    field("Country", data.origin_country.join(" / "));
  }
  if (Array.isArray(data.languages) && data.languages.length) {
    wrappedField("Language", data.languages.join(" / "));
  }
  const genres = Array.isArray(data.genres) ? data.genres : Array.isArray(data.genre) ? data.genre : [];
  if (genres.length) {
    wrappedField("Genres", genres.join(" / "));
  }
  if (data.episodes && data.episodes > 0) {
    field("Episodes", data.episodes);
    if (data.seasons && Array.isArray(data.seasons) && data.seasons.length > 0) {
      field("Seasons", data.seasons.length);
    }
  }
  if (data.type === "tv" && data.runtime) {
    field("Duration", data.runtime);
  } else if (data.runtime) {
    field("Runtime", data.runtime);
  }
  const imdbRating = formatTenScore(
    data.rating ?? data.imdb_rating,
    data.vote_count ?? data.imdb_votes
  );
  field("Rating", imdbRating);
  field("Link", data.link || data.imdb_link);
  if (data.release_date) {
    const formattedDate = `${data.release_date.year}-${String(
      data.release_date.month
    ).padStart(2, "0")}-${String(data.release_date.day).padStart(2, "0")}`;
    releaseInfo.push({
      date: formattedDate,
      country: normalizeCountry(data.release_date.country)
    });
  }
  if (data.release && data.release.length) {
    data.release.forEach((item) => {
      if (item.date) {
        let formattedDate = item.date;
        const dateMatch = item.date.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
        if (dateMatch) {
          const [, monthStr, day, year] = dateMatch;
          const months = {
            January: "01",
            February: "02",
            March: "03",
            April: "04",
            May: "05",
            June: "06",
            July: "07",
            August: "08",
            September: "09",
            October: "10",
            November: "11",
            December: "12"
          };
          const month = months[monthStr] || "01";
          formattedDate = `${year}-${month}-${day.padStart(2, "0")}`;
        }
        releaseInfo.push({
          date: formattedDate,
          country: normalizeCountry(item.country)
        });
      }
    });
  }
  if (releaseInfo.length > 0) {
    const selected = selectPreferredCountries(
      releaseInfo,
      (item) => item.country,
      5
    );
    wrappedField(
      "Released",
      selected.map((item) => item.country ? `${item.date} (${item.country})` : item.date).join(" / ")
    );
  }
  if (data.aka && data.aka.length) {
    const akaEntries = data.aka.map((item) => {
      if (typeof item === "string") {
        return { title: item, country: "" };
      }
      return {
        title: item.title || "",
        country: normalizeCountry(item.country)
      };
    }).filter((item) => item.title);
    const selected = selectPreferredCountries(akaEntries, (item) => item.country, 5);
    if (selected.length > 0) {
      wrappedField(
        "AKA",
        selected.map((item) => item.country ? `${item.title} (${item.country})` : item.title).join(" / ")
      );
    }
  }
  if (data.keywords && data.keywords.length) {
    const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];
    wrappedField("Keywords", keywords.slice(0, 5).join(" | ").trim());
  }
  if (data.directors && data.directors.length) {
    const directors = Array.isArray(data.directors) ? data.directors : [data.directors];
    wrappedField(
      "Director",
      directors.map((i) => i.name || i).join(" / ").trim()
    );
  }
  if (data.writers && data.writers.length) {
    const writers = Array.isArray(data.writers) ? data.writers : [data.writers];
    wrappedField(
      "Writer",
      writers.map((i) => i.name || i).join(" / ").trim()
    );
  }
  if (data.cast && data.cast.length) {
    wrappedField(
      "Cast",
      data.cast.map(formatEnglishActor).filter(Boolean).join(" / ").trim()
    );
  }
  const plot = data.plot || data.description || data.introduction;
  if (plot) {
    const descLabel = plainFieldLabel("Plot").trimEnd();
    lines.push(
      "",
      descLabel,
      "",
      wrapTextWithIndent(String(plot).trim(), DESCRIPTION_MAX_WIDTH, "\u3000\u3000")
    );
  }
  return alignEnglishFieldLabels(lines.join("\n").trim());
}, "generateImdbFormat");
var generateTmdbFormat = /* @__PURE__ */ __name((raw2) => {
  const data = unwrapMediaData(raw2);
  const lines = [];
  const field = /* @__PURE__ */ __name((label, content) => {
    if (content == null || String(content).trim() === "") return;
    lines.push(`\u25C9\u3000${label}\u3000${String(content).trim()}`);
  }, "field");
  const withMinutes = /* @__PURE__ */ __name((value) => {
    const text2 = String(value ?? "").trim();
    if (!text2 || text2 === "0") return "";
    return /^\d+(?:\s*\/\s*\d+)*$/.test(text2) ? `${text2}\u5206\u949F` : text2;
  }, "withMinutes");
  const isMovie = data.release_date && !data.first_air_date || data.tmdb_id && typeof data.tmdb_id === "string" && data.tmdb_id.includes("movie");
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  field("\u7247\u3000\u3000\u540D", data.title || data.original_title || "N/A");
  field("\u539F\u3000\u3000\u540D", data.original_title || "N/A");
  field("\u5E74\u3000\u3000\u4EE3", data.year || "N/A");
  field(
    "\u4EA7\u3000\u3000\u5730",
    data.countries && data.countries.length ? data.countries.join(" / ") : "N/A"
  );
  field(
    "\u7C7B\u3000\u3000\u522B",
    data.genres && data.genres.length ? data.genres.join(" / ") : "N/A"
  );
  field(
    "\u8BED\u3000\u3000\u8A00",
    data.languages && data.languages.length ? data.languages.join(" / ") : "N/A"
  );
  if (isMovie) {
    field("\u4E0A\u6620\u65E5\u671F", data.release_date || "N/A");
    field("\u7247\u3000\u3000\u957F", withMinutes(data.runtime) || "N/A");
  } else {
    field("\u9996\u64AD\u65E5\u671F", data.first_air_date || "N/A");
    field("\u96C6\u3000\u3000\u6570", data.number_of_episodes || "N/A");
    field("\u5B63\u3000\u3000\u6570", data.number_of_seasons || "N/A");
    field("\u5355\u96C6\u7247\u957F", withMinutes(data.episode_run_time) || "N/A");
  }
  const imdbRating = formatTenScore(
    data.imdb_rating || data.imdb_rating_average,
    data.imdb_votes || data.imdb_vote_count
  );
  if (data.imdb_id && imdbRating) {
    field("IMDb\u8BC4\u5206", imdbRating);
  }
  field("IMDb\u94FE\u63A5", data.imdb_link);
  field("TMDB\u8BC4\u5206", data.tmdb_rating || "0.0 / 10 from 0 users");
  if (data.tmdb_id) {
    const rawId = String(data.tmdb_id);
    const [typeFromId, ...idParts] = rawId.includes("/") ? rawId.split("/") : [];
    const mediaType2 = typeFromId || (isMovie ? "movie" : "tv");
    const mediaId = idParts.length ? idParts.join("/") : rawId;
    field(
      "TMDB\u94FE\u63A5",
      `https://www.themoviedb.org/${mediaType2}/${mediaId}/`
    );
  }
  if (data.directors && data.directors.length) {
    field(
      "\u5BFC\u3000\u3000\u6F14",
      data.directors.filter((d) => d && d.name).map((d) => d.name).join(" / ")
    );
  }
  if (data.writers && data.writers.length) {
    field(
      "\u7F16\u3000\u3000\u5267",
      data.writers.filter((w) => w && w.name).map((w) => w.name).join(" / ")
    );
  }
  if (data.cast && data.cast.length) {
    const castNames = data.cast.slice(0, 15).map(formatDoubanCast).filter(Boolean);
    if (castNames.length) {
      lines.push(
        [
          `\u25C9\u3000\u4E3B\u3000\u3000\u6F14\u3000${castNames[0]}`,
          ...castNames.slice(1).map((name) => `\u3000\u3000\u3000\u3000\u3000\u3000\u3000${name}`)
        ].join("\n")
      );
    }
  }
  if (data.overview) {
    const overview = String(data.overview).trim();
    lines.push("", "\u25C9\u3000\u7B80\u3000\u3000\u4ECB", "", `\u3000\u3000${overview.replace(/\n/g, "\n\u3000\u3000")}`);
  }
  return lines.join("\n").trim();
}, "generateTmdbFormat");
var generateMelonFormat = /* @__PURE__ */ __name((data) => {
  const lines = [];
  if (data.poster) {
    lines.push(`[img]${data.poster}[/img]
`);
  }
  lines.push(`\u25C9\u3000\u4E13\u8F91\u540D\u79F0\u3000${data.title || "N/A"}`);
  lines.push(`\u25C9\u3000\u6B4C\u3000\u3000\u624B\u3000${data.artists && data.artists.length ? data.artists.join(" / ") : "N/A"}`);
  lines.push(`\u25C9\u3000\u53D1\u884C\u65E5\u671F\u3000${data.release_date || "N/A"}`);
  lines.push(`\u25C9\u3000\u4E13\u8F91\u7C7B\u578B\u3000${data.album_type || "N/A"}`);
  lines.push(`\u25C9\u3000\u8BC4\u3000\u3000\u5206\u3000${data.rating || "N/A"}`);
  lines.push(`\u25C9\u3000\u6D41\u3000\u3000\u6D3E\u3000${data.genres && data.genres.length ? data.genres.join(" / ").trim() : "N/A"}`);
  lines.push(`\u25C9\u3000\u53D1\u884C\u516C\u53F8\u3000${data.publisher || "N/A"}`);
  lines.push(`\u25C9\u3000\u5236\u4F5C\u516C\u53F8\u3000${data.planning || "N/A"}`);
  lines.push(`\u25C9\u3000\u4E13\u8F91\u94FE\u63A5\u3000${data.melon_link}`);
  if (data.description) {
    lines.push("");
    lines.push("\u25C9\u3000\u4E13\u8F91\u4ECB\u7ECD\n");
    lines.push(`\u3000\u3000${data.description.replace(/\n/g, "\n\u3000\u3000")}`);
  }
  if (data.tracks && data.tracks.length) {
    lines.push("");
    lines.push("\u25C9\u3000\u6B4C\u66F2\u5217\u8868\n");
    data.tracks.forEach((t) => {
      const artists = t.artists && t.artists.length ? ` (${t.artists.join(", ")})` : "";
      lines.push(`\u3000\u3000${t.number || "-"}. ${t.title}${artists}`);
    });
  }
  return lines.join("\n").trim();
}, "generateMelonFormat");
var generateBangumiFormat = /* @__PURE__ */ __name((data) => {
  if (!data || typeof data !== "object") return "";
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  lines.push(`\u25C9\u3000\u7247\u3000\u3000\u540D\u3000${data.name}`);
  lines.push(`\u25C9\u3000\u8BD1\u3000\u3000\u540D\u3000${data.name_cn}`);
  if (isValidArray(data.aka)) {
    lines.push(
      formatWrappedLine({
        label: "\u25C9\u3000\u522B\u3000\u3000\u540D\u3000",
        content: data.aka.join(" / "),
        maxWidth: MAX_WIDTH
      })
    );
  }
  if (data.type) lines.push(`\u25C9\u3000\u7C7B\u3000\u3000\u578B\u3000${data.type}`);
  if (data.eps) lines.push(`\u25C9\u3000\u8BDD\u3000\u3000\u6570\u3000${data.eps}`);
  if (data.date) lines.push(`\u25C9\u3000\u9996\u3000\u3000\u64AD\u3000${data.date}`);
  if (data.year) lines.push(`\u25C9\u3000\u5E74\u3000\u3000\u4EFD\u3000${data.year}\u5E74`);
  if (data.bgm_rating) lines.push(`\u25C9\u3000\u8BC4\u3000\u3000\u5206\u3000${data.bgm_rating}`);
  lines.push(`\u25C9\u3000\u94FE\u3000\u3000\u63A5\u3000${data.link}`);
  if (data.platform) lines.push(`\u25C9\u3000\u64AD\u653E\u5E73\u53F0\u3000${data.platform}`);
  if (isValidArray(data.tags)) {
    lines.push(
      formatWrappedLine({
        label: "\u25C9\u3000\u6807\u3000\u3000\u7B7E\u3000",
        content: data.tags.join(" / "),
        maxWidth: MAX_WIDTH
      })
    );
  }
  const directorLine = processPersonField(data.director, "\u25C9\u3000\u5BFC\u3000\u3000\u6F14\u3000");
  if (directorLine) lines.push(directorLine);
  const writerLine = processPersonField(data.writer, "\u25C9\u3000\u811A\u3000\u3000\u672C\u3000");
  if (writerLine) lines.push(writerLine);
  if (isValidArray(data.characters)) {
    const charList = formatCharacters(ensureArray(data.characters));
    const content = charList.slice(0, 20).join(" / ").trim();
    lines.push(
      formatWrappedLine({
        label: "\u25C9\u3000\u89D2\u8272\u4FE1\u606F\u3000",
        content,
        maxWidth: 125
      })
    );
  }
  if (data.summary) {
    lines.push("", "\u25C9\u3000\u7B80\u3000\u3000\u4ECB", `\u3000\u3000${data.summary.replace(/\n/g, "\n\u3000\u3000")}`);
  }
  return lines.join("\n").trim();
}, "generateBangumiFormat");
var generateSteamFormat = /* @__PURE__ */ __name((data) => {
  const lines = [];
  if (data.header_image) lines.push(`[img]${data.header_image}[/img]
`);
  lines.push(`\u25C9\u3000\u6E38\u620F\u540D\u79F0\u3000${data.name}`);
  if (data.type && data.type !== "game") {
    lines.push(`\u25C9\u3000\u6761\u76EE\u7C7B\u578B\u3000${data.type}`);
  }
  lines.push(`\u25C9\u3000\u53D1\u884C\u65E5\u671F\u3000${data.release_date}`);
  if (data.developers && data.developers.length) {
    lines.push(`\u25C9\u3000\u5F00\u53D1\u516C\u53F8\u3000${data.developers.join(", ")}`);
  }
  if (data.publishers && data.publishers.length) {
    lines.push(`\u25C9\u3000\u53D1\u884C\u516C\u53F8\u3000${data.publishers.join(", ")}`);
  }
  if (data.genres && data.genres.length) {
    lines.push(`\u25C9\u3000\u6E38\u620F\u7C7B\u578B\u3000${data.genres.join(" / ")}`);
  }
  if (data.supported_languages) {
    const cleanedLanguages = cleanHtml(data.supported_languages).replace(/\*具有完全音频支持的语言.*/g, "").replace(/\*/g, "").split(/[,，]/).map((item) => item.trim()).filter(Boolean).join(" / ");
    if (cleanedLanguages) lines.push(`\u25C9\u3000\u652F\u6301\u8BED\u8A00\u3000${cleanedLanguages}`);
  }
  if (data.price) {
    if (data.price.discount > 0 && data.price.initial) {
      lines.push(`\u25C9\u3000\u539F\u3000\u3000\u4EF7\u3000${data.price.initial} ${data.price.currency}`);
      lines.push(
        `\u25C9\u3000\u73B0\u3000\u3000\u4EF7\u3000${data.price.final} ${data.price.currency} (\u6298\u6263${data.price.discount}%)`
      );
    } else if (data.price.final) {
      lines.push(`\u25C9\u3000\u4EF7\u3000\u3000\u683C\u3000${data.price.final} ${data.price.currency}`);
    }
  }
  if (data.platforms) {
    const platforms = [];
    if (data.platforms.windows) platforms.push("Windows");
    if (data.platforms.mac) platforms.push("Mac");
    if (data.platforms.linux) platforms.push("Linux");
    if (platforms.length) lines.push(`\u25C9\u3000\u652F\u6301\u5E73\u53F0\u3000${platforms.join(", ")}`);
  }
  if (data.categories && data.categories.length) {
    lines.push(
      formatWrappedLine({
        label: "\u25C9\u3000\u5206\u7C7B\u6807\u7B7E\u3000",
        content: data.categories.slice(0, 5).join(" / "),
        maxWidth: MAX_WIDTH
      })
    );
  }
  lines.push(`\u25C9\u3000\u94FE\u3000\u3000\u63A5\u3000https://store.steampowered.com/app/${data.sid}/`);
  if (data.about_the_game) {
    const INDENT = "\u3000\u3000";
    const plain = data.about_the_game.replace(/<\/(h2|p|li|ul|div|ol)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "\xB7 ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
    const textLines = plain.split("\n").map((line) => line.trim()).filter(Boolean);
    if (textLines.length > 0) {
      lines.push("", "\u25C9\u3000\u7B80\u3000\u3000\u4ECB");
      for (const line of textLines) {
        lines.push(wrapTextWithIndent(line, MAX_WIDTH, INDENT));
      }
      lines.push("");
    }
  }
  if (data.pc_requirements && data.pc_requirements.minimum) {
    lines.push(processRequirements(data.pc_requirements.minimum, "\u6700\u4F4E\u914D\u7F6E"));
  }
  if (data.pc_requirements && data.pc_requirements.recommended) {
    lines.push(
      processRequirements(data.pc_requirements.recommended, "\u63A8\u8350\u914D\u7F6E")
    );
  }
  if (data.screenshots && data.screenshots.length) {
    lines.push("\u25C9\u3000\u6E38\u620F\u622A\u56FE");
    for (const s of data.screenshots) {
      if (s.path_full) lines.push(`[img]${s.path_full}[/img]`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}, "generateSteamFormat");
var formatHongguoScore = /* @__PURE__ */ __name((value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(1);
}, "formatHongguoScore");
var formatHongguoCount = /* @__PURE__ */ __name((value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1e8) return `${Number((n / 1e8).toFixed(1))}\u4EBF`;
  if (n >= 1e4) return `${Number((n / 1e4).toFixed(1))}\u4E07`;
  return String(Math.round(n));
}, "formatHongguoCount");
var generateHongguoFormat = /* @__PURE__ */ __name((data) => {
  const lines = [];
  if (data.poster_url) {
    lines.push(`[img]${data.poster_url}[/img]`, "");
  }
  lines.push(`\u25C9\u3000\u7247\u3000\u3000\u540D\u3000${data.chinese_title}`);
  if (isValidArray(data.genres)) {
    lines.push(`\u25C9\u3000\u7C7B\u3000\u3000\u522B\u3000${data.genres.join(" / ")}`);
  }
  const ratingText = formatHongguoScore(data.rating);
  if (ratingText) lines.push(`\u25C9\u3000\u8BC4\u3000\u3000\u5206\u3000${ratingText}`);
  const likeText = formatHongguoCount(data.like_count);
  if (likeText) lines.push(`\u25C9\u3000\u70B9\u3000\u3000\u8D5E\u3000${likeText}`);
  const favoriteText = formatHongguoCount(data.favorite_count);
  if (favoriteText) lines.push(`\u25C9\u3000\u6536\u3000\u3000\u85CF\u3000${favoriteText}`);
  if (data.episodes) {
    lines.push(`\u25C9\u3000\u96C6\u3000\u3000\u6570\u3000${data.episodes}`);
  }
  if (isValidArray(data.actors)) {
    const actorsFormatted = data.actors.map(
      (actor) => actor.sub_title ? `${actor.nickname} (${actor.sub_title})` : actor.nickname
    ).join(" / ");
    lines.push(`\u25C9\u3000\u4E3B\u3000\u3000\u6F14\u3000${actorsFormatted}`);
  }
  if (data.synopsis) {
    lines.push("\u25C9\u3000\u7B80\u3000\u3000\u4ECB", `\u3000\u3000${data.synopsis.replace(/\n/g, "\n\u3000\u3000")}`);
  }
  return lines.join("\n").trim();
}, "generateHongguoFormat");
var generateQQMusicFormat = /* @__PURE__ */ __name((data) => {
  if (!data || typeof data !== "object") {
    return "";
  }
  const lines = [];
  if (data.cover) {
    lines.push(`[img]${data.cover}[/img]`, "");
  }
  if (data.name) {
    lines.push(`\u25C9\u3000\u4E13\u8F91\u540D\u79F0\u3000${data.name}`);
  }
  if (Array.isArray(data.singer) && data.singer.length > 0) {
    const singers = data.singer.map((s) => s.name).join(" / ");
    lines.push(`\u25C9\u3000\u6B4C\u3000\u3000\u624B\u3000${singers}`);
  }
  if (data.albumType) {
    lines.push(`\u25C9\u3000\u4E13\u8F91\u7C7B\u578B\u3000${data.albumType}`);
  }
  if (data.language) {
    lines.push(`\u25C9\u3000\u8BED\u3000\u3000\u79CD\u3000${data.language}`);
  }
  if (data.company) {
    lines.push(`\u25C9\u3000\u53D1\u884C\u516C\u53F8\u3000${data.company}`);
  }
  if (data.publishTime) {
    lines.push(`\u25C9\u3000\u53D1\u884C\u65F6\u95F4\u3000${data.publishTime}`);
  }
  if (data.desc) {
    lines.push(
      "",
      "\u25C9\u3000\u4E13\u8F91\u4ECB\u7ECD",
      `  ${data.desc.replace(/\n/g, "\n\n  ")}`,
      ""
    );
  }
  if (Array.isArray(data.songList) && data.songList.length > 0) {
    lines.push("\n\u25C9\u3000\u6B4C\u66F2\u5217\u8868");
    data.songList.forEach((song, index) => {
      const singerNames = Array.isArray(song.singer) && song.singer.length > 0 ? song.singer.map((s) => s.name).join(" / ") : "";
      lines.push(
        `\u3000${(index + 1).toString().padStart(2, " ")}. ${song.name}` + (song.sub_name ? ` (${song.sub_name})` : "") + (singerNames ? ` - ${singerNames}` : "") + (song.playTime ? ` [${song.playTime}]` : "")
      );
    });
  }
  return lines.join("\n");
}, "generateQQMusicFormat");
var generateDoubanBookFormat = /* @__PURE__ */ __name((data) => {
  if (!data || typeof data !== "object") {
    return "";
  }
  const lines = [];
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  lines.push(`\u25C9\u3000\u4E66\u3000\u3000\u540D\u3000${data.title}`);
  if (data.original_title) {
    lines.push(`\u25C9\u3000\u539F\u3000\u3000\u540D\u3000${data.original_title}`);
  }
  if (Array.isArray(data.author) && data.author.length) {
    lines.push(`\u25C9\u3000\u4F5C\u3000\u3000\u8005\u3000${data.author.join(" / ").trim()}`);
  }
  if (Array.isArray(data.translator) && data.translator.length) {
    lines.push(`\u25C9\u3000\u7FFB\u3000\u3000\u8BD1\u3000${data.translator.join(" / ").trim()}`);
  }
  if (data.publisher) lines.push(`\u25C9\u3000\u51FA\u7248\u516C\u53F8\u3000${data.publisher}`);
  if (data.year) lines.push(`\u25C9\u3000\u51FA\u7248\u65E5\u671F\u3000${data.year}`);
  if (data.pages) lines.push(`\u25C9\u3000\u9875\u3000\u3000\u6570\u3000${data.pages}`);
  if (data.pricing) lines.push(`\u25C9\u3000\u5B9A\u3000\u3000\u4EF7\u3000${data.pricing}`);
  if (data.binding) lines.push(`\u25C9\u3000\u88C5\u3000\u3000\u5E27\u3000${data.binding}`);
  if (data.series) lines.push(`\u25C9\u3000\u4E1B\u3000\u3000\u4E66\u3000${data.series}`);
  if (data.isbn) lines.push(`\u25C9\u3000\u4E66\u3000\u3000\u53F7\u3000${data.isbn}`);
  if (data.rating && data.votes) {
    lines.push(`\u25C9\u3000\u8C46\u74E3\u8BC4\u5206\u3000${data.rating} / 10 from ${data.votes} users`);
  }
  if (data.link) lines.push(`\u25C9\u3000\u8C46\u74E3\u94FE\u63A5\u3000${data.link}`);
  if (data.introduction) {
    const formattedIntro = String(data.introduction).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => `\u3000\u3000${line}`).join("\n\n");
    lines.push("\n\u25C9\u3000\u7B80\u3000\u3000\u4ECB\n", formattedIntro);
  }
  return lines.join("\n");
}, "generateDoubanBookFormat");
var formatTraktDate = /* @__PURE__ */ __name((value) => {
  const raw2 = String(value ?? "").trim();
  if (!raw2) return "";
  const ms = parseTimestampMs(raw2);
  return ms === null ? raw2 : toIso(ms).slice(0, 10);
}, "formatTraktDate");
var capitalizeWords = /* @__PURE__ */ __name((value) => String(value).replace(
  /(^|[\s-])([a-z])/g,
  (_, separator, char) => separator + char.toUpperCase()
), "capitalizeWords");
var generateTraktFormat = /* @__PURE__ */ __name((raw2) => {
  if (!raw2 || typeof raw2 !== "object") {
    return "";
  }
  const data = unwrapMediaData(raw2);
  const lines = [];
  const isMovie = data.type === "movie";
  const isShow = data.type === "tv" || data.type === "show";
  const field = /* @__PURE__ */ __name((name, content) => {
    if (content == null || String(content).trim() === "") return;
    lines.push(plainFieldLabel(name) + content);
  }, "field");
  const listField = /* @__PURE__ */ __name((name, content, separator = " / ") => {
    if (content == null || String(content).trim() === "") return;
    lines.push(
      formatEnglishList(plainFieldLabel(name), String(content).trim(), separator)
    );
  }, "listField");
  const personName2 = /* @__PURE__ */ __name((person) => typeof person === "string" ? person.trim() : String(person?.name ?? person?.person?.name ?? "").trim(), "personName");
  if (data.poster) lines.push(`[img]${data.poster}[/img]`, "");
  field("Title", data.title);
  field("Type", isMovie ? "Movie" : isShow ? "TV Show" : data.type);
  if (isMovie && data.year) {
    field("Year", data.year);
  }
  field("Country", data.country);
  if (Array.isArray(data.language) && data.language.length) {
    listField("Language", data.language.join(" / "));
  }
  field("Cert", data.certification);
  if (isMovie && data.runtime) {
    field("Runtime", `${data.runtime} minutes`);
  } else if (isShow && data.runtime) {
    field("Duration", `${data.runtime} minutes`);
  }
  if (isShow) {
    const seasons = Array.isArray(data.seasons) ? data.seasons.filter((season) => Number(season?.number) > 0) : [];
    const totalSeasons = seasons.length;
    const totalEpisodes = seasons.reduce((sum, season) => sum + (Number(season.episodeCount) || 0), 0) || Number(data.aired_episodes) || 0;
    if (totalSeasons > 0) field("Seasons", totalSeasons);
    if (totalEpisodes > 0) field("Episodes", totalEpisodes);
  }
  if (isMovie && data.released) {
    field("Released", formatTraktDate(data.released));
  } else if (isShow && (data.first_aired || data.year)) {
    field("Aired", formatTraktDate(data.first_aired) || data.year);
  }
  if (data.rating) {
    field("Rating", data.rating_format || data.rating);
  }
  if (Array.isArray(data.genres) && data.genres.length > 0) {
    listField("Genres", data.genres.map(capitalizeWords).join(" / "));
  }
  field("IMDb", data.imdb_link);
  field("Trakt", data.trakt_link);
  field("TMDB", data.tmdb_link);
  field("TVDB", data.tvdb_link);
  if (Array.isArray(data.people?.directors) && data.people.directors.length > 0) {
    listField("Director", data.people.directors.map(personName2).filter(Boolean).join(" / "));
  }
  if (Array.isArray(data.people?.writers) && data.people.writers.length > 0) {
    listField("Writer", data.people.writers.map(personName2).filter(Boolean).join(" / "));
  }
  if (Array.isArray(data.people?.cast) && data.people.cast.length > 0) {
    const actors = data.people.cast.slice(0, 10).map(formatEnglishActor).filter(Boolean);
    if (actors.length) {
      listField("Cast", actors.join(" / "));
    }
  }
  if (data.overview) {
    const descLabel = plainFieldLabel("Plot").trimEnd();
    const overview = String(data.overview).trim();
    lines.push(
      "",
      descLabel,
      "",
      wrapTextWithIndent(overview, DESCRIPTION_MAX_WIDTH, "\u3000\u3000")
    );
  }
  return alignEnglishFieldLabels(lines.join("\n").trim());
}, "generateTraktFormat");

// src/format/index.ts
var FORMATTERS = {
  douban: generateDoubanFormat,
  douban_book: generateDoubanBookFormat,
  imdb: generateImdbFormat,
  bangumi: generateBangumiFormat,
  tmdb: generateTmdbFormat,
  trakt: generateTraktFormat,
  steam: generateSteamFormat,
  melon: generateMelonFormat,
  hongguo: generateHongguoFormat,
  qq_music: generateQQMusicFormat
};
function unwrapMediaData2(raw2) {
  if (!raw2 || typeof raw2 !== "object") return raw2;
  const inner = raw2.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && [
    "introduction",
    "plot",
    "description",
    "chinese_title",
    "poster",
    "name",
    "imdb_rating",
    "douban_rating"
  ].some((key) => key in inner)) {
    return { ...raw2, ...inner };
  }
  return raw2;
}
__name(unwrapMediaData2, "unwrapMediaData");
function generateFormat(site, data) {
  const formatter = FORMATTERS[site];
  if (!formatter) return "";
  try {
    return formatter(unwrapMediaData2(data)) || "";
  } catch (error) {
    console.warn(`[format] ${site} \u683C\u5F0F\u5316\u5931\u8D25:`, error instanceof Error ? error.message : error);
    return "";
  }
}
__name(generateFormat, "generateFormat");
function attachFormat(site, data) {
  return { ...data, format: generateFormat(site, data) };
}
__name(attachFormat, "attachFormat");
function ensureFormat(site, data) {
  const record = data;
  const hasFormat = typeof record.format === "string" && record.format.length > 0;
  if (!("format_copy" in record)) {
    return hasFormat ? data : attachFormat(site, data);
  }
  const clean = { ...record };
  delete clean.format_copy;
  return hasFormat ? clean : attachFormat(site, clean);
}
__name(ensureFormat, "ensureFormat");

// src/lib/static-database.ts
var DATABASE_MIRRORS = [
  "https://cdn.jsdelivr.net/gh/rabbitwit/PT-Gen-Database@main",
  "https://raw.githubusercontent.com/rabbitwit/PT-Gen-Database/main"
];
var DATABASE_TIMEOUT_MS = 6e3;
var MISS_TTL_MS = 10 * 60 * 1e3;
var misses = new TtlCache(MISS_TTL_MS, 2e3);
var inFlight = /* @__PURE__ */ new Map();
function databaseMirrors(env) {
  const custom = readEnv(env, "DATABASE_BASE_URL");
  if (!custom) return [...DATABASE_MIRRORS];
  return custom.split(",").map((item) => item.trim().replace(/\/+$/, "")).filter(Boolean);
}
__name(databaseMirrors, "databaseMirrors");
function candidatePaths(site, keys) {
  const full = keys.r2;
  const parts = full.split("/");
  const file = parts.pop() ?? "";
  const dirs = parts;
  const paths = [];
  const push = /* @__PURE__ */ __name((path) => {
    if (path && !paths.includes(path)) paths.push(path);
  }, "push");
  const baseStripped = dirs.map((dir) => {
    if (dir === "base") return null;
    if (dir.endsWith("_base")) return dir.slice(0, -"_base".length);
    return dir;
  });
  const isBaseVariant = baseStripped.some((dir, index) => dir !== dirs[index]);
  push(
    isBaseVariant ? [...baseStripped.filter((dir) => dir !== null), file].join("/") : full
  );
  if (site === "trakt") {
    const id = file.replace(/\.json$/, "");
    if (/^\d+$/.test(id)) return [];
    push(["trakt", file].join("/"));
  }
  return paths;
}
__name(candidatePaths, "candidatePaths");
async function fetchEntry(mirrors, path) {
  for (const base of mirrors) {
    try {
      const response = await fetchWithTimeout(
        `${base}/${path}`,
        { headers: { "user-agent": "PT-Gen-Refactor" } },
        DATABASE_TIMEOUT_MS
      );
      if (response.status === 404) continue;
      if (!response.ok) {
        console.warn(`[Database] ${base} returned ${response.status} for ${path}`);
        continue;
      }
      const parsed = await response.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return void 0;
    } catch (error) {
      console.warn(
        `[Database] ${base} failed for ${path}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  return void 0;
}
__name(fetchEntry, "fetchEntry");
async function loadStaticDatabase(env, site, keys) {
  if (readEnv(env, "ENABLED_DATABASE")?.toLowerCase() === "false") return void 0;
  const paths = candidatePaths(site, keys);
  if (paths.length === 0) return void 0;
  const missKey = paths[0];
  if (misses.get(missKey)) return void 0;
  let task = inFlight.get(missKey);
  if (!task) {
    task = (async () => {
      const mirrors = databaseMirrors(env);
      for (const path of paths) {
        const entry = await fetchEntry(mirrors, path);
        if (entry) {
          if (entry.success === false) return void 0;
          return { entry, path };
        }
      }
      return void 0;
    })();
    inFlight.set(missKey, task);
  }
  try {
    const found = await task;
    if (!found) {
      misses.set(missKey, true);
      return void 0;
    }
    console.info(`[Database Hit] ${found.path}`);
    return attachFormat(site, found.entry);
  } finally {
    inFlight.delete(missKey);
  }
}
__name(loadStaticDatabase, "loadStaticDatabase");

// src/lib/coerce.ts
function asText(value) {
  if (value === null || value === void 0) return "";
  return typeof value === "string" ? value : String(value);
}
__name(asText, "asText");
function asTrimmed(value) {
  return asText(value).trim();
}
__name(asTrimmed, "asTrimmed");
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
__name(asRecord, "asRecord");
function asUnknownList(value) {
  return Array.isArray(value) ? value : [];
}
__name(asUnknownList, "asUnknownList");
function asStringList(value) {
  return asUnknownList(value).map((item) => asTrimmed(item)).filter(Boolean);
}
__name(asStringList, "asStringList");
function uniqueBy(items, keyOf) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
__name(uniqueBy, "uniqueBy");

// src/lib/cast-select.ts
function selectCastByLimits(lead, supporting, voice, limits) {
  return [
    ...lead.slice(0, limits.lead),
    ...supporting.slice(0, limits.supporting),
    ...voice.slice(0, limits.voice)
  ];
}
__name(selectCastByLimits, "selectCastByLimits");

// src/imdb/graphql-client.ts
var GRAPHQL_ENDPOINT = "https://api.graphql.imdb.com/";
var GRAPHQL_HEADERS = {
  "content-type": "application/json",
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  origin: "https://www.imdb.com",
  referer: "https://www.imdb.com/",
  "x-imdb-client-name": "imdb-web-next-localized",
  "x-imdb-client-query-version": "1",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty"
};
async function graphqlQuery(client, config, query, variables) {
  const response = await client.request(GRAPHQL_ENDPOINT, {
    method: "POST",
    timeoutMs: config.requestTimeoutMs,
    headers: GRAPHQL_HEADERS,
    body: JSON.stringify({ query, variables })
  });
  if (response.status === 403) {
    throw new ApiError(
      "UPSTREAM_BLOCKED",
      "IMDb GraphQL \u62D2\u7EDD\u4E86\u5F53\u524D\u51FA\u53E3 IP\uFF08403\uFF09\uFF0C\u8BF7\u914D\u7F6E\u5916\u90E8\u540E\u7AEF\u6216\u6362\u4E00\u4E2A\u51FA\u53E3\u91CD\u8BD5",
      { retryable: false, details: { hint: "\u53C2\u8003 IMDB_BACKEND_URL \u914D\u7F6E\u9879" } }
    );
  }
  if (response.status === 429) {
    throw new ApiError(
      "UPSTREAM_ERROR",
      "IMDb GraphQL \u8FD4\u56DE HTTP 429\uFF08\u5F53\u524D\u51FA\u53E3 IP \u88AB\u9650\u6D41\uFF09",
      {
        retryable: true,
        retryAfterSeconds: 10,
        details: {
          status: 429,
          egress: client.label,
          hint: "IMDb \u5BF9\u6570\u636E\u4E2D\u5FC3 IP \u9650\u6D41\u4E25\u91CD\uFF0C\u4E0E\u90E8\u7F72\u5728\u54EA\u5BB6\u5E73\u53F0\u65E0\u5173\u3002\u53EF\u8C03\u7528 GET /api/egress \u67E5\u770B\u5B9E\u9645\u51FA\u53E3 IP \u4E0E\u63A2\u6D4B\u7ED3\u679C\uFF1B\u6216\u914D\u7F6E IMDB_BACKEND_URL \u6539\u7531\u5916\u90E8\u540E\u7AEF\u4EE3\u53D6"
        }
      }
    );
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`IMDb GraphQL \u8FD4\u56DE HTTP ${response.status}`, {
      status: response.status
    });
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw ApiError.upstreamError("IMDb GraphQL \u8FD4\u56DE\u7684\u4E0D\u662F\u5408\u6CD5 JSON", {
      status: response.status
    });
  }
  if (payload.errors?.length) {
    const message = payload.errors.map((item) => item.message).join("; ");
    throw ApiError.upstreamError(`IMDb GraphQL \u67E5\u8BE2\u5931\u8D25: ${message}`, {
      code: payload.errors[0]?.extensions?.code
    });
  }
  return payload.data ?? null;
}
__name(graphqlQuery, "graphqlQuery");

// src/imdb/graphql.ts
var TITLE_QUERY = `query TitleDetails($id: ID!, $castCount: Int!, $withAka: Boolean!) {
  title(id: $id) {
    id
    titleText { text }
    originalTitleText { text }
    releaseYear { year }
    titleType { id text }
    primaryImage { url }
    ratingsSummary { aggregateRating voteCount }
    plot { plotText { plainText } }
    runtime { seconds displayableProperty { value { plainText } } }
    genres { genres { id text } }
    spokenLanguages { spokenLanguages { id text } }
    countriesOfOrigin { countries { id text } }
    releaseDate { year month day country { id text } }
    keywords(first: 10) { edges { node { text } } }
    episodes { episodes(first: 1) { total } seasons { number } }
    principalCredits {
      category { id }
      credits {
        category { id }
        name { id nameText { text } primaryImage { url } }
        ... on Cast { characters { name } attributes { text } }
      }
    }
    credits(first: $castCount, filter: { categories: ["actor", "actress"] }) {
      edges {
        node {
          category { id }
          name { id nameText { text } primaryImage { url } }
          ... on Cast { characters { name } attributes { text } }
        }
      }
    }
    directors: credits(first: 250, filter: { categories: ["director"] }) {
      edges { node { name { nameText { text } } } }
    }
    writers: credits(first: 250, filter: { categories: ["writer"] }) {
      edges { node { name { nameText { text } } } }
    }
    akas(first: 20) @include(if: $withAka) {
      edges { node { text country { id text } language { id text } } }
    }
    releaseDates(first: 20) @include(if: $withAka) {
      edges { node { country { id text } day month year } }
    }
    certificates(first: 20) @include(if: $withAka) {
      edges { node { country { id text } rating } }
    }
  }
}`;
var SEARCH_QUERY = `query SearchTitles(
  $query: String!
  $first: Int!
  $exact: Boolean
  $startDate: Date
  $endDate: Date
) {
  mainSearch(
    first: $first
    options: {
      searchTerm: $query
      type: TITLE
      includeAdult: false
      isExactMatch: $exact
      titleSearchOptions: {
        type: SEARCH_TYPES_PLACEHOLDER
        releaseDateRange: { start: $startDate, end: $endDate }
      }
    }
  ) {
    edges {
      node {
        entity {
          ... on Title {
            id
            titleText { text }
            originalTitleText { text }
            releaseYear { year }
            titleType { id text }
            ratingsSummary { aggregateRating voteCount }
            plot { plotText { plainText } }
            primaryImage { url }
          }
        }
      }
    }
  }
}`;
function unique(values) {
  return uniqueBy(
    values.map((value) => value?.trim() ?? ""),
    (text2) => text2
  );
}
__name(unique, "unique");
function namesFrom(credits) {
  const edges = credits?.edges ?? [];
  return unique(edges.map((edge) => edge.node?.name?.nameText?.text));
}
__name(namesFrom, "namesFrom");
function creditAttributes(node) {
  return unique((node.attributes ?? []).map((item) => item?.text));
}
__name(creditAttributes, "creditAttributes");
function isVoiceCredit(attributes) {
  return attributes.some((text2) => /voice/i.test(text2));
}
__name(isVoiceCredit, "isVoiceCredit");
function toPersonEntry(node) {
  const name = node.name?.nameText?.text?.trim();
  if (!name) return null;
  const nameId = node.name?.id;
  return {
    name,
    link: nameId ? `https://www.imdb.com/name/${nameId}/` : "",
    role: node.category?.id?.trim().toLowerCase() || "actor",
    image: node.name?.primaryImage?.url ?? "",
    character: node.characters?.[0]?.name?.trim() || ""
  };
}
__name(toPersonEntry, "toPersonEntry");
function buildCast(node, limits) {
  const principal = (node.principalCredits ?? []).find(
    (group) => group?.category?.id === "cast"
  );
  const leadIds = new Set(
    (principal?.credits ?? []).map((credit) => credit?.name?.id).filter((id) => Boolean(id))
  );
  const leadNames = new Set(
    (principal?.credits ?? []).map((credit) => credit?.name?.nameText?.text?.trim()).filter((name) => Boolean(name))
  );
  const seen = /* @__PURE__ */ new Set();
  const push = /* @__PURE__ */ __name((member, bucket) => {
    if (!member) return;
    if (seen.has(member.name)) return;
    seen.add(member.name);
    bucket.push(member);
  }, "push");
  const voice = [];
  const lead = [];
  const supporting = [];
  for (const credit of principal?.credits ?? []) {
    push(toPersonEntry(credit), lead);
  }
  for (const edge of node.credits?.edges ?? []) {
    const isLead = leadIds.has(edge.node?.name?.id ?? "") || leadNames.has(edge.node?.name?.nameText?.text?.trim() ?? "");
    if (isLead) continue;
    const member = toPersonEntry(edge.node ?? {});
    if (!member) continue;
    if (isVoiceCredit(creditAttributes(edge.node ?? {}))) push(member, voice);
    else push(member, supporting);
  }
  return selectCastByLimits(lead, supporting, voice, limits);
}
__name(buildCast, "buildCast");
function mapTitleNode(node, imdbId, options) {
  const cast = buildCast(node, options.castLimits);
  const releaseDateNode = node.releaseDate;
  const data = {
    success: true,
    site: "imdb",
    sid: node.id || imdbId,
    link: `https://www.imdb.com/title/${node.id || imdbId}/`,
    title: node.titleText?.text?.trim() ?? "",
    original_title: node.originalTitleText?.text?.trim() ?? "",
    image: node.primaryImage?.url ?? "",
    year: node.releaseYear?.year ?? 0,
    type: (node.titleType?.id ?? "").toLowerCase(),
    genres: unique((node.genres?.genres ?? []).map((item) => item?.text)),
    plot: node.plot?.plotText?.plainText?.trim() ?? "",
    runtime: node.runtime?.displayableProperty?.value?.plainText ?? "",
    runtime_seconds: node.runtime?.seconds ?? 0,
    rating: node.ratingsSummary?.aggregateRating ?? 0,
    vote_count: node.ratingsSummary?.voteCount ?? 0,
    languages: unique((node.spokenLanguages?.spokenLanguages ?? []).map((item) => item?.text)),
    origin_country: unique((node.countriesOfOrigin?.countries ?? []).map((item) => item?.text)),
    release_date: {
      year: releaseDateNode?.year ?? 0,
      month: releaseDateNode?.month ?? 0,
      day: releaseDateNode?.day ?? 0,
      country: releaseDateNode?.country?.text ?? ""
    },
    episodes: node.episodes?.episodes?.total ?? 0,
    seasons: (node.episodes?.seasons ?? []).map((season) => season?.number).filter((value) => typeof value === "number"),
    keywords: unique((node.keywords?.edges ?? []).map((edge) => edge.node?.text)),
    cast,
    directors: namesFrom(node.directors),
    writers: namesFrom(node.writers),
    aka: [],
    release: [],
    certificates: []
  };
  if (options.withAka) {
    const akas = (node.akas?.edges ?? []).map((edge) => ({
      country: edge.node?.country?.text ?? "",
      title: edge.node?.text ?? "",
      note: edge.node?.language?.text ?? ""
    })).filter((item) => item.title);
    const release = (node.releaseDates?.edges ?? []).map((edge) => {
      const { year, month, day } = edge.node ?? {};
      const date = year != null ? [year, month, day].filter((part) => part != null).map((part, index) => index === 0 ? String(part) : String(part).padStart(2, "0")).join("-") : "";
      return {
        country: edge.node?.country?.text ?? "",
        date,
        event: ""
      };
    }).filter((item) => item.country || item.date);
    const certificates = (node.certificates?.edges ?? []).map((edge) => ({
      country: edge.node?.country?.text ?? "",
      rating: edge.node?.rating ?? ""
    })).filter((item) => Boolean(item.country && item.rating));
    data.aka = akas;
    data.release = release;
    data.certificates = certificates;
  }
  return data;
}
__name(mapTitleNode, "mapTitleNode");
function isGhostNode(node) {
  return !node.titleText?.text && !node.originalTitleText?.text && !node.titleType?.id;
}
__name(isGhostNode, "isGhostNode");
async function fetchTitleViaGraphql(client, config, imdbId, options) {
  const castLimits = {
    lead: config.castLeadLimit,
    supporting: config.castSupportingLimit,
    voice: config.castVoiceLimit
  };
  const data = await graphqlQuery(client, config, TITLE_QUERY, {
    id: imdbId,
    castCount: castLimits.lead + castLimits.supporting + castLimits.voice,
    withAka: options.full
  });
  const node = data?.title;
  if (!node || isGhostNode(node)) return null;
  return mapTitleNode(node, imdbId, { withAka: options.full, castLimits });
}
__name(fetchTitleViaGraphql, "fetchTitleViaGraphql");
function buildSearchQuery(types) {
  if (!types || types.length === 0) {
    return SEARCH_QUERY.replace("SEARCH_TYPES_PLACEHOLDER", "null");
  }
  return SEARCH_QUERY.replace("SEARCH_TYPES_PLACEHOLDER", `[${types.join(", ")}]`);
}
__name(buildSearchQuery, "buildSearchQuery");
async function searchViaGraphql(client, config, query, limit, filter = {}) {
  const data = await graphqlQuery(client, config, buildSearchQuery(filter.types), {
    query,
    first: limit,
    exact: filter.exact ?? null,
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null
  });
  const edges = data?.mainSearch?.edges ?? [];
  const items = [];
  for (const edge of edges) {
    const entity = edge?.node?.entity;
    if (!entity?.id) continue;
    items.push({
      id: entity.id,
      title: entity.titleText?.text?.trim() || entity.originalTitleText?.text?.trim() || "",
      year: entity.releaseYear?.year ?? 0,
      subtype: entity.titleType?.id ?? "",
      subtitle: entity.plot?.plotText?.plainText?.trim() || "",
      rating: entity.ratingsSummary?.aggregateRating ?? 0,
      image: entity.primaryImage?.url ?? ""
    });
  }
  return items;
}
__name(searchViaGraphql, "searchViaGraphql");

// src/lib/json-backend.ts
async function tryBackendEndpoints(endpoints, run, label) {
  if (endpoints.length === 0) {
    throw ApiError.notImplemented(`\u672A\u914D\u7F6E ${label} \u540E\u7AEF\u5730\u5740`);
  }
  let lastError;
  for (let index = 0; index < endpoints.length; index++) {
    const base = endpoints[index];
    try {
      return await run(base);
    } catch (error) {
      lastError = error;
      const next = endpoints[index + 1];
      if (next) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[${label}] ${base} \u5931\u8D25\uFF08${message}\uFF09\uFF0C\u6539\u7528\u4E0B\u4E00\u4E2A\u7AEF\u70B9`);
      }
    }
  }
  throw lastError;
}
__name(tryBackendEndpoints, "tryBackendEndpoints");
var V1_ROOT_PATH = /\/api\/v1$/i;
var V1_PATH = /\/api\/v1(\/.*)?$/i;
function v1BackendUrl(base, resource2, segments, params = {}, label = "\u540E\u7AEF\u5730\u5740") {
  let url;
  try {
    url = new URL(base);
  } catch {
    throw ApiError.upstreamError(`${label} \u4E0D\u662F\u5408\u6CD5\u7684 URL`, { url: base });
  }
  let path = url.pathname.replace(/\/+$/, "");
  if (path === "" || path === "/") path = "/api/v1";
  if (!V1_PATH.test(path)) {
    throw ApiError.upstreamError(`${label} \u5FC5\u987B\u6307\u5411 /api/v1 \u6216 /api/v1/${resource2}`, { url: base });
  }
  if (V1_ROOT_PATH.test(path)) path = `${path}/${resource2}`;
  for (const segment of segments) {
    path += `/${encodeURIComponent(String(segment))}`;
  }
  url.pathname = path || "/";
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0 || value === "") {
      url.searchParams.delete(key);
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
__name(v1BackendUrl, "v1BackendUrl");
async function fetchJsonBackend(client, url, options) {
  const headers2 = { accept: "application/json" };
  if (options.token) headers2.authorization = `Bearer ${options.token}`;
  const response = await client.request(url, {
    method: "GET",
    timeoutMs: options.timeoutMs,
    headers: headers2
  });
  const { status } = response;
  const body = await response.text();
  if (status === 401 || status === 403) {
    throw ApiError.upstreamError(options.authFailed, {
      status,
      upstream: options.upstream
    });
  }
  if (status === 404) {
    throw ApiError.notFound(options.notFound || `${options.upstream} \u672A\u627E\u5230\u8D44\u6E90`);
  }
  if (status >= 400) {
    throw ApiError.upstreamError(`${options.upstream} \u8FD4\u56DE HTTP ${status}`, {
      status,
      upstream: options.upstream
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw ApiError.upstreamError(`${options.upstream} \u8FD4\u56DE\u7684\u4E0D\u662F\u5408\u6CD5 JSON`, {
      upstream: options.upstream
    });
  }
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  if (!record || typeof record.code !== "number") {
    throw ApiError.upstreamError(`${options.upstream} \u8FD4\u56DE\u4E86\u672A\u77E5\u683C\u5F0F`, {
      upstream: options.upstream
    });
  }
  if (record.code !== 2e4) {
    const message = typeof record.message === "string" && record.message ? record.message : `${options.upstream} \u8FD4\u56DE\u4E1A\u52A1\u9519\u8BEF ${record.code}`;
    throw ApiError.upstreamError(message, {
      upstream: options.upstream,
      code: record.code,
      details: record.error
    });
  }
  return record.data ?? null;
}
__name(fetchJsonBackend, "fetchJsonBackend");

// src/imdb/backend.ts
function buildBackendUrl(base, params) {
  if (params.action === "search") {
    return v1BackendUrl(
      base,
      "imdb",
      ["search"],
      {
        q: params.q,
        limit: params.limit,
        type: params.type,
        exact: params.exact,
        year_from: params.year_from,
        year_to: params.year_to
      },
      "IMDB_BACKEND_URL"
    );
  }
  if (params.action === "rating") {
    return v1BackendUrl(base, "imdb", [params.id], { full: "false" }, "IMDB_BACKEND_URL");
  }
  return v1BackendUrl(
    base,
    "imdb",
    [params.id],
    params.full === "0" ? { full: "false" } : {},
    "IMDB_BACKEND_URL"
  );
}
__name(buildBackendUrl, "buildBackendUrl");
async function callBackend(client, config, params) {
  if (config.imdbBackendUrls.length === 0) {
    throw ApiError.notImplemented("\u672A\u914D\u7F6E IMDB_BACKEND_URL\uFF0C\u65E0\u6CD5\u5728\u8FB9\u7F18\u8FD0\u884C\u65F6\u8BBF\u95EE IMDb", {
      hint: "\u90E8\u7F72\u5916\u90E8\u540E\u7AEF\u540E\u628A\u5730\u5740\u586B\u5165 IMDB_BACKEND_URL\uFF08\u586B https://<host>/api/v1/imdb \u6216 /api/v1\uFF09"
    });
  }
  return tryBackendEndpoints(
    config.imdbBackendUrls,
    async (base) => {
      const payload = await fetchJsonBackend(client, buildBackendUrl(base, params), {
        timeoutMs: config.requestTimeoutMs,
        token: config.imdbBackendToken,
        upstream: "imdb-backend",
        authFailed: "IMDb \u540E\u7AEF\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 IMDB_BACKEND_TOKEN",
        notFound: params.action === "title" ? `IMDb \u4E0A\u672A\u627E\u5230\u6761\u76EE ${params.id}` : `IMDb \u4E0A\u672A\u627E\u5230\u5339\u914D ${params.q}`
      });
      const record = asRecord(payload);
      if (!record) {
        throw ApiError.upstreamError("IMDb \u540E\u7AEF\u672A\u8FD4\u56DE\u6570\u636E", { upstream: "imdb-backend" });
      }
      return record;
    },
    "imdb-backend"
  );
}
__name(callBackend, "callBackend");
async function fetchTitleViaBackend(client, config, imdbId, options) {
  return await callBackend(client, config, {
    action: "title",
    id: imdbId,
    full: options.full ? "1" : "0"
  });
}
__name(fetchTitleViaBackend, "fetchTitleViaBackend");
async function fetchRatingViaBackend(client, config, imdbId) {
  const data = await callBackend(client, config, {
    action: "rating",
    id: imdbId
  });
  const rating = Number(data.rating) || 0;
  const votes = Number(data.vote_count) || 0;
  return rating > 0 ? { rating, votes } : null;
}
__name(fetchRatingViaBackend, "fetchRatingViaBackend");
async function searchViaBackend(client, config, query, limit, filter = {}) {
  const params = {
    action: "search",
    q: query,
    limit: String(limit)
  };
  if (filter.types?.length) params.type = filter.types.join(",");
  if (filter.exact) params.exact = "true";
  if (filter.startDate) params.year_from = filter.startDate.slice(0, 4);
  if (filter.endDate) params.year_to = filter.endDate.slice(0, 4);
  const data = await callBackend(client, config, params);
  return data.items ?? [];
}
__name(searchViaBackend, "searchViaBackend");

// src/lib/cookie.ts
function parseCookieString(raw2) {
  const jar = {};
  for (const part of raw2.split(";")) {
    const pair = part.trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}
__name(parseCookieString, "parseCookieString");
function cookieHeader(jar) {
  return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join("; ");
}
__name(cookieHeader, "cookieHeader");
function normalizeCookieHeader(raw2) {
  return cookieHeader(parseCookieString(raw2));
}
__name(normalizeCookieHeader, "normalizeCookieHeader");
function mergeCookieHeaders(base, extra) {
  return cookieHeader({ ...parseCookieString(base), ...parseCookieString(extra) });
}
__name(mergeCookieHeaders, "mergeCookieHeaders");

// src/imdb/waf.ts
var CHALLENGE_STATUS = 202;
var CHALLENGE_MARKERS = ["window.gokuProps", "aws-waf-token", "awsWafCookieDomainList", "AwsWafIntegration"];
var WAF_COOKIE_NAME = "aws-waf-token";
var cookieState = null;
var pendingToken = null;
var browserUnavailable = false;
function isChallengeResponse(status, body) {
  if (hasNextData(body)) return false;
  if (status === CHALLENGE_STATUS) return true;
  if (!body) return false;
  return CHALLENGE_MARKERS.some((marker) => body.includes(marker));
}
__name(isChallengeResponse, "isChallengeResponse");
function hasNextData(html) {
  return Boolean(html && html.includes('id="__NEXT_DATA__"'));
}
__name(hasNextData, "hasNextData");
function resetChallengeState() {
  cookieState = null;
  pendingToken = null;
}
__name(resetChallengeState, "resetChallengeState");
function cookieHeaderFromResponse(response) {
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : (response.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=)/);
  const pairs = [];
  for (const raw2 of setCookies) {
    const pair = raw2.split(";", 1)[0]?.trim();
    if (pair && pair.includes("=")) pairs.push(pair);
  }
  return pairs.join("; ");
}
__name(cookieHeaderFromResponse, "cookieHeaderFromResponse");
function rememberCookiesFromResponse(response) {
  const extra = cookieHeaderFromResponse(response);
  if (!extra) return;
  cookieState = {
    cookieHeader: cookieState ? mergeCookieHeaders(cookieState.cookieHeader, extra) : extra,
    expiresAt: Date.now() + WAF_TTL_MS,
    origin: "response"
  };
}
__name(rememberCookiesFromResponse, "rememberCookiesFromResponse");
function browserUserAgent(version) {
  const major = version.split(".")[0] || "131";
  const host = globalThis.process?.platform;
  const platform = host === "darwin" ? "Macintosh; Intel Mac OS X 10_15_7" : host === "win32" ? "Windows NT 10.0; Win64; x64" : "X11; Linux x86_64";
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}
__name(browserUserAgent, "browserUserAgent");
async function waitForCdp(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        await response.body?.cancel();
        return;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("\u6D4F\u89C8\u5668\u542F\u52A8\u8D85\u65F6\uFF1A\u8C03\u8BD5\u7AEF\u53E3\u4E0D\u53EF\u7528");
}
__name(waitForCdp, "waitForCdp");
async function findFreePort(createServer) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => port > 0 ? resolve(port) : reject(new Error("\u65E0\u6CD5\u5206\u914D\u8C03\u8BD5\u7AEF\u53E3")));
    });
  });
}
__name(findFreePort, "findFreePort");
async function acquireTokenWithBrowser(config) {
  if (!config.canUseBrowser || browserUnavailable) return null;
  let browser = null;
  let child = null;
  let profileDir = "";
  try {
    const playwrightModule = "playwright-core";
    const playwright = await import(playwrightModule);
    const fsModule = "node:fs/promises";
    const pathModule = "node:path";
    const osModule = "node:os";
    const cpModule = "node:child_process";
    const netModule = "node:net";
    const [fs, path, os, cp, net] = await Promise.all([
      import(fsModule),
      import(pathModule),
      import(osModule),
      import(cpModule),
      import(netModule)
    ]);
    profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "imdb-browser-"));
    let executablePath;
    let baseArgs;
    if (config.isLocal) {
      executablePath = config.playwrightExecutablePath || playwright.chromium.executablePath();
      baseArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--headless=new"
      ];
    } else {
      const chromiumModule = "@sparticuz/chromium";
      const sparticuz = await import(chromiumModule);
      executablePath = await sparticuz.default.executablePath();
      baseArgs = sparticuz.default.args;
    }
    const debugPort = await findFreePort(net.createServer);
    const args = [
      ...baseArgs,
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`
    ];
    const spawned = cp.spawn(executablePath, args, { stdio: "ignore" });
    child = spawned;
    const startupFailure = new Promise((_, reject) => {
      spawned.once("error", reject);
      spawned.once("exit", (code) => reject(new Error(`\u6D4F\u89C8\u5668\u8FDB\u7A0B\u63D0\u524D\u9000\u51FA\uFF08code=${code}\uFF09`)));
    });
    void startupFailure.catch(() => void 0);
    const readyPromise = waitForCdp(debugPort, Math.min(config.browserTokenTimeoutMs, 2e4));
    void readyPromise.catch(() => void 0);
    await Promise.race([readyPromise, startupFailure]);
    browser = await playwright.chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = await browser.newContext({
      userAgent: browserUserAgent(browser.version()),
      viewport: { width: 1280, height: 720 },
      locale: "en-US"
    });
    const page = await context.newPage();
    await page.goto("https://www.imdb.com/", {
      waitUntil: "domcontentloaded",
      timeout: config.browserTokenTimeoutMs
    });
    await page.waitForFunction(
      () => document.cookie.includes("aws-waf-token="),
      void 0,
      { timeout: Math.min(config.browserTokenTimeoutMs, 15e3) }
    ).catch(() => void 0);
    const cookies = await context.cookies();
    const wafCookie = cookies.find((item) => item.name === WAF_COOKIE_NAME);
    return wafCookie?.value ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[waf] \u6D4F\u89C8\u5668\u83B7\u53D6 token \u5931\u8D25:", message);
    if (/Executable doesn't exist|Cannot find module|not supported|ENOENT/i.test(message)) {
      browserUnavailable = true;
      console.error("[waf] \u5224\u5B9A\u6D4F\u89C8\u5668\u4E0D\u53EF\u7528\uFF0C\u540E\u7EED\u8BF7\u6C42\u5C06\u8DF3\u8FC7 HTML \u901A\u9053\uFF08\u8BF7\u8FD0\u884C npx playwright install\uFF09");
    }
    return null;
  } finally {
    if (browser) await browser.close().catch(() => void 0);
    if (child) child.kill();
    if (profileDir) {
      const fsModule = "node:fs/promises";
      const fs = await import(fsModule);
      await fs.rm(profileDir, { recursive: true, force: true }).catch(() => void 0);
    }
  }
}
__name(acquireTokenWithBrowser, "acquireTokenWithBrowser");
function cookieStateFromEnv(config) {
  if (config.imdbCookie) {
    const normalized = normalizeCookieHeader(config.imdbCookie);
    if (normalized) {
      return { cookieHeader: normalized, expiresAt: Date.now() + WAF_TTL_MS, origin: "env" };
    }
  }
  if (config.imdbWafToken) {
    const token = config.imdbWafToken.trim().replace(/^aws-waf-token=/, "");
    if (token) {
      return {
        cookieHeader: `${WAF_COOKIE_NAME}=${token}`,
        expiresAt: Date.now() + WAF_TTL_MS,
        origin: "env"
      };
    }
  }
  return null;
}
__name(cookieStateFromEnv, "cookieStateFromEnv");
async function getWafCookie(config, options = {}) {
  if (!options.forceRefresh && cookieState && cookieState.expiresAt > Date.now()) {
    return cookieState;
  }
  if (!options.forceRefresh && pendingToken) return pendingToken;
  const acquireCookie = /* @__PURE__ */ __name(async () => {
    const fromEnv = cookieStateFromEnv(config);
    if (browserUnavailable) return fromEnv;
    const token = await acquireTokenWithBrowser(config);
    const fromBrowser = token ? {
      cookieHeader: fromEnv ? mergeCookieHeaders(fromEnv.cookieHeader, `${WAF_COOKIE_NAME}=${token}`) : `${WAF_COOKIE_NAME}=${token}`,
      expiresAt: Date.now() + WAF_TTL_MS,
      origin: "browser"
    } : null;
    return fromBrowser ?? fromEnv;
  }, "acquireCookie");
  const task = acquireCookie().finally(() => {
    pendingToken = null;
  });
  pendingToken = task;
  const resolved = await task;
  if (resolved) {
    cookieState = resolved;
    if (resolved.origin === "browser") {
      console.log("[waf] \u5DF2\u83B7\u53D6\u65B0\u7684 aws-waf-token\uFF08\u6D4F\u89C8\u5668\uFF09");
    }
  }
  return resolved;
}
__name(getWafCookie, "getWafCookie");
function invalidateWafCookie() {
  resetChallengeState();
}
__name(invalidateWafCookie, "invalidateWafCookie");
function assertCookieStrategy(config) {
  if (!config.canUseBrowser && !config.imdbCookie && !config.imdbWafToken) {
    throw new ApiError(
      "UPSTREAM_CHALLENGE",
      "\u5F53\u524D\u8FD0\u884C\u65F6\u4E0D\u652F\u6301\u542F\u52A8\u6D4F\u89C8\u5668\uFF0C\u4E14\u672A\u914D\u7F6E IMDB_COOKIE / IMDB_WAF_TOKEN",
      {
        retryable: false,
        details: {
          hint: "\u5728 Cloudflare Workers \u4E0A\u8BF7\u914D\u7F6E IMDB_BACKEND_URL\uFF08\u53CA IMDB_BACKEND_TOKEN\uFF09\uFF0C\u6216\u624B\u52A8\u63D0\u4F9B IMDB_COOKIE\uFF08\u6D4F\u89C8\u5668\u8BBF\u95EE imdb.com \u540E\u590D\u5236 aws-waf-token \u7684\u503C\uFF09"
        }
      }
    );
  }
}
__name(assertCookieStrategy, "assertCookieStrategy");

// src/imdb/html.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var DOCUMENT_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1"
};
async function fetchImdbHtml(client, config, url) {
  let lastChallengeBody;
  for (let round = 0; round < 2; round++) {
    const cookie = await getWafCookie(config, { forceRefresh: round > 0 });
    const headers2 = { ...DOCUMENT_HEADERS };
    if (cookie?.cookieHeader) headers2.cookie = cookie.cookieHeader;
    const response = await client.request(url, {
      method: "GET",
      timeoutMs: config.htmlTimeoutMs,
      headers: headers2,
      redirect: "follow"
    });
    const body = await response.text();
    if (isChallengeResponse(response.status, body)) {
      lastChallengeBody = body;
      invalidateWafCookie();
      console.warn(`[html] \u7B2C ${round + 1} \u8F6E\u547D\u4E2D WAF \u6311\u6218 (status=${response.status})`);
      continue;
    }
    if (response.status === 404) {
      throw ApiError.notFound(`IMDb \u9875\u9762\u4E0D\u5B58\u5728: ${url}`);
    }
    if (!response.ok) {
      throw ApiError.upstreamError(`IMDb \u8FD4\u56DE HTTP ${response.status}`, { url, status: response.status });
    }
    rememberCookiesFromResponse(response);
    return { html: body, ok: hasNextData(body) };
  }
  throw new ApiError("UPSTREAM_CHALLENGE", "IMDb \u6301\u7EED\u8FD4\u56DE WAF \u6311\u6218\uFF0C\u65E0\u6CD5\u83B7\u53D6\u9875\u9762", {
    retryable: true,
    retryAfterSeconds: 60,
    details: {
      hint: "\u7A0D\u540E\u91CD\u8BD5\uFF0C\u6216\u624B\u52A8\u8BBE\u7F6E IMDB_COOKIE / IMDB_BACKEND_URL",
      challengeDetected: Boolean(lastChallengeBody)
    }
  });
}
__name(fetchImdbHtml, "fetchImdbHtml");
function extractNextData(html) {
  const match2 = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  const raw2 = match2?.[1]?.trim();
  if (!raw2) return null;
  try {
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
__name(extractNextData, "extractNextData");
function pick(value, fallback) {
  return value === void 0 || value === null ? fallback : value;
}
__name(pick, "pick");
function extractCast(castV2) {
  if (!Array.isArray(castV2) || castV2.length === 0) return [];
  const topGroup = castV2[0];
  const credits = topGroup?.credits;
  if (!Array.isArray(credits)) return [];
  return credits.map((credit) => {
    const nameId = credit?.name?.id;
    const category = String(credit?.category?.id ?? "").toLowerCase();
    return {
      name: credit?.name?.nameText?.text ?? "",
      link: nameId ? `https://www.imdb.com/name/${nameId}/` : "",
      role: category || "actor",
      image: credit?.name?.primaryImage?.url ?? "",
      character: credit?.creditedRoles?.edges?.[0]?.node?.characters?.edges?.[0]?.node?.name ?? ""
    };
  }).filter((item) => Boolean(item.name));
}
__name(extractCast, "extractCast");
function groupHtmlCast(cast, limits) {
  return [
    ...cast.slice(0, limits.lead),
    ...cast.slice(limits.lead, limits.lead + limits.supporting),
    ...cast.slice(limits.lead + limits.supporting, limits.lead + limits.supporting + limits.voice)
  ];
}
__name(groupHtmlCast, "groupHtmlCast");
function extractCrew(crewV2) {
  const directors = [];
  const writers = [];
  if (!Array.isArray(crewV2)) return { directors, writers };
  for (const group of crewV2) {
    const type = String(group?.grouping?.text ?? "").toLowerCase();
    const names = (group?.credits ?? []).map((credit) => credit?.name?.nameText?.text).filter(Boolean);
    if (type.startsWith("director")) directors.push(...names);
    else if (type.startsWith("writer")) writers.push(...names);
  }
  return { directors, writers };
}
__name(extractCrew, "extractCrew");
function mapNextData(nextData, imdbId, options) {
  const props = nextData?.props?.pageProps;
  if (!props) return null;
  const above = props.aboveTheFoldData ?? {};
  const main = props.mainColumnData ?? {};
  const releaseDateData = above.releaseDate;
  const countries = main?.countriesDetails?.countries ?? [];
  return {
    success: true,
    site: "imdb",
    sid: imdbId,
    link: `https://www.imdb.com/title/${imdbId}/`,
    title: above?.titleText?.text ?? "",
    original_title: above?.originalTitleText?.text ?? "",
    image: above?.primaryImage?.url ?? "",
    year: above?.releaseYear?.year ?? 0,
    type: String(
      above?.titleType?.categories?.[0]?.value ?? above?.titleType?.id ?? ""
    ).toLowerCase(),
    genres: (above?.genres?.genres ?? []).map((item) => item.text).filter(Boolean),
    plot: above?.plot?.plotText?.plainText ?? "",
    runtime: above?.runtime?.displayableProperty?.value?.plainText ?? "",
    runtime_seconds: above?.runtime?.seconds ?? 0,
    rating: pick(above?.ratingsSummary?.aggregateRating, 0),
    vote_count: pick(above?.ratingsSummary?.voteCount, 0),
    languages: (main?.spokenLanguages?.spokenLanguages ?? []).map((item) => item.text).filter(Boolean),
    origin_country: countries.map((item) => item.text).filter(Boolean),
    release_date: {
      year: releaseDateData?.year ?? 0,
      month: releaseDateData?.month ?? 0,
      day: releaseDateData?.day ?? 0,
      country: releaseDateData?.country?.text ?? ""
    },
    episodes: main?.episodes?.episodes?.total ?? 0,
    seasons: (main?.episodes?.seasons ?? []).map((season) => season?.number).filter((value) => typeof value === "number"),
    keywords: (above?.keywords?.edges ?? []).map((edge) => edge?.node?.text).filter(Boolean),
    cast: groupHtmlCast(extractCast(main?.castV2), options.castLimits),
    directors: extractCrew(main?.crewV2).directors,
    writers: extractCrew(main?.crewV2).writers,
    aka: [],
    release: [],
    certificates: []
  };
}
__name(mapNextData, "mapNextData");
function extractReleaseInfo(nextData) {
  const categories = nextData?.props?.pageProps?.contentData?.categories ?? [];
  const result = {};
  for (const category of categories) {
    const items = category?.section?.items ?? [];
    if (category?.id === "releases") {
      result.release = items.map((item) => ({
        country: item?.rowTitle ?? "",
        date: item?.listContent?.[0]?.text ?? "",
        event: item?.listContent?.[0]?.subText ?? ""
      }));
    } else if (category?.id === "akas") {
      result.aka = items.map((item) => ({
        country: item?.rowTitle ?? "",
        title: item?.listContent?.[0]?.text ?? "",
        note: item?.listContent?.[0]?.subText ?? ""
      }));
    }
  }
  return result;
}
__name(extractReleaseInfo, "extractReleaseInfo");

// src/imdb/service.ts
function imdbTitleUrl(imdbId) {
  return `https://www.imdb.com/title/${imdbId}/`;
}
__name(imdbTitleUrl, "imdbTitleUrl");
function logFallback(reason, next) {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.warn(`[fetch] ${message} \u2192 \u6539\u7528 ${next}`);
}
__name(logFallback, "logFallback");
function isNotFound(error) {
  return isApiError(error) && error.symbol === "NOT_FOUND";
}
__name(isNotFound, "isNotFound");
async function fetchTitleViaHtml(client, config, imdbId, options) {
  assertCookieStrategy(config);
  const titlePagePromise = fetchImdbHtml(client, config, imdbTitleUrl(imdbId));
  const releasePagePromise = options.full ? fetchImdbHtml(client, config, `${imdbTitleUrl(imdbId)}releaseinfo/`).catch((error) => {
    logFallback(error, "\u4EC5\u8FD4\u56DE\u4E3B\u9875\u9762\u6570\u636E");
    return null;
  }) : null;
  const [titlePage, releasePage] = await Promise.all([titlePagePromise, releasePagePromise]);
  const nextData = extractNextData(titlePage.html);
  if (!nextData) {
    throw ApiError.upstreamError("\u65E0\u6CD5\u4ECE IMDb \u9875\u9762\u89E3\u6790 __NEXT_DATA__\uFF0C\u53EF\u80FD\u88AB\u5224\u5B9A\u4E3A Bot", { imdbId });
  }
  const data = mapNextData(nextData, imdbId, {
    castLimits: {
      lead: config.castLeadLimit,
      supporting: config.castSupportingLimit,
      voice: config.castVoiceLimit
    }
  });
  if (!data) {
    throw ApiError.upstreamError("IMDb \u9875\u9762\u7ED3\u6784\u5F02\u5E38\uFF08pageProps \u4E3A\u7A7A\uFF09", { imdbId });
  }
  if (releasePage) {
    const releaseNext = extractNextData(releasePage.html);
    if (releaseNext) {
      const { aka, release } = extractReleaseInfo(releaseNext);
      if (aka && aka.length > 0) data.aka = aka;
      if (release && release.length > 0) data.release = release;
    }
  }
  return data;
}
__name(fetchTitleViaHtml, "fetchTitleViaHtml");
async function tryChannels(channels) {
  const failures = [];
  for (let index = 0; index < channels.length; index++) {
    const channel = channels[index];
    try {
      const data = await channel.run();
      return { data, source: channel.name };
    } catch (error) {
      if (isNotFound(error)) throw error;
      failures.push({ name: channel.name, error });
      const next = channels[index + 1]?.name;
      if (next) logFallback(error, next);
    }
  }
  const backendError = failures.find((item) => item.name === "backend")?.error;
  const chosen = backendError ?? failures[failures.length - 1]?.error;
  throw chosen ? normalizeFetchError(chosen) : ApiError.internal("\u6240\u6709\u6570\u636E\u901A\u9053\u5747\u5931\u8D25");
}
__name(tryChannels, "tryChannels");
async function fetchTitle(client, config, imdbId, options) {
  const html = /* @__PURE__ */ __name(() => fetchTitleViaHtml(client, config, imdbId, options), "html");
  const graphql = /* @__PURE__ */ __name(async () => {
    const data = await fetchTitleViaGraphql(client, config, imdbId, options);
    if (!data) throw ApiError.notFound(`IMDb \u4E0A\u672A\u627E\u5230\u6761\u76EE ${imdbId}`);
    return data;
  }, "graphql");
  const channels = [];
  if (hasImdbBackend(config)) {
    channels.push({
      name: "backend",
      run: /* @__PURE__ */ __name(() => fetchTitleViaBackend(client, config, imdbId, options), "run")
    });
  }
  channels.push({ name: "graphql", run: graphql });
  if (config.runtime !== "edge" && canUseHtmlFallback(config)) {
    channels.push({ name: "html", run: html });
    channels.push({ name: "html", run: html });
  }
  return tryChannels(channels);
}
__name(fetchTitle, "fetchTitle");
async function searchTitles(client, config, query, limit, filter = {}) {
  const url = `https://www.imdb.com/search/title/?title=${encodeURIComponent(query)}&s=tt`;
  const build = /* @__PURE__ */ __name((items) => ({
    query,
    url,
    total: items.length,
    items
  }), "build");
  const channels = [];
  if (hasImdbBackend(config)) {
    channels.push({
      name: "backend",
      run: /* @__PURE__ */ __name(async () => build(await searchViaBackend(client, config, query, limit, filter)), "run")
    });
  }
  channels.push({
    name: "graphql",
    run: /* @__PURE__ */ __name(async () => build(await searchViaGraphql(client, config, query, limit, filter)), "run")
  });
  if (config.runtime !== "edge" && canUseHtmlFallback(config)) {
    channels.push({ name: "html", run: /* @__PURE__ */ __name(() => searchViaHtml(client, config, query, limit, url), "run") });
  }
  return tryChannels(channels);
}
__name(searchTitles, "searchTitles");
async function searchViaHtml(client, config, query, limit, url) {
  assertCookieStrategy(config);
  const page = await fetchImdbHtml(client, config, url);
  const nextData = extractNextData(page.html);
  if (!nextData) throw ApiError.upstreamError("\u65E0\u6CD5\u89E3\u6790 IMDb \u641C\u7D22\u9875\u6570\u636E", { query });
  const titleListItems = nextData?.props?.pageProps?.searchResults?.titleResults?.titleListItems ?? [];
  const textOf = /* @__PURE__ */ __name((value) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const record = value;
      if (typeof record.text === "string") return record.text;
      const plotText = record.plotText;
      if (typeof plotText?.plainText === "string") return plotText.plainText;
    }
    return "";
  }, "textOf");
  const numberOf = /* @__PURE__ */ __name((value) => typeof value === "number" ? value : 0, "numberOf");
  const items = titleListItems.slice(0, limit).map((item) => ({
    id: textOf(item?.titleId),
    title: textOf(item?.originalTitleText) || textOf(item?.titleText),
    year: numberOf(item?.releaseYear),
    subtype: textOf(item?.titleType?.id),
    subtitle: textOf(item?.plot),
    rating: numberOf(item?.ratingSummary?.aggregateRating),
    image: textOf(item?.primaryImage?.url)
  }));
  return { query, url, total: items.length, items };
}
__name(searchViaHtml, "searchViaHtml");
function normalizeFetchError(error) {
  if (isApiError(error)) return error;
  if (isTimeoutError(error)) {
    return ApiError.upstreamTimeout(error instanceof Error ? error.message : void 0);
  }
  return ApiError.internal(error instanceof Error ? error.message : String(error), error);
}
__name(normalizeFetchError, "normalizeFetchError");

// src/routes/imdb.ts
var titleCaches = /* @__PURE__ */ new Map();
var searchCaches = /* @__PURE__ */ new Map();
function titleCache(ttl) {
  let cache2 = titleCaches.get(ttl);
  if (!cache2) {
    cache2 = new TtlCache(ttl * 1e3);
    titleCaches.set(ttl, cache2);
  }
  return cache2;
}
__name(titleCache, "titleCache");
function searchCache(ttl) {
  let cache2 = searchCaches.get(ttl);
  if (!cache2) {
    cache2 = new TtlCache(ttl * 1e3);
    searchCaches.set(ttl, cache2);
  }
  return cache2;
}
__name(searchCache, "searchCache");
var SEARCH_TYPES = {
  movie: "MOVIE",
  movies: "MOVIE",
  film: "MOVIE",
  tv: "TV",
  series: "TV",
  tvseries: "TV",
  episode: "TV_EPISODE",
  tvepisode: "TV_EPISODE",
  game: "VIDEO_GAME",
  videogame: "VIDEO_GAME",
  musicvideo: "MUSIC_VIDEO",
  podcast: "PODCAST_SERIES",
  podcastseries: "PODCAST_SERIES",
  podcastepisode: "PODCAST_EPISODE"
};
var SEARCH_TYPE_VALUES = [...new Set(Object.values(SEARCH_TYPES))];
function parseSearchTypes(raw2) {
  const value = raw2?.trim();
  if (!value) return void 0;
  const types = [];
  for (const part of value.split(",")) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    const mapped = SEARCH_TYPES[key];
    if (!mapped) {
      throw ApiError.badRequest(
        `\u672A\u77E5\u7684\u7C7B\u578B "${part.trim()}"\uFF0C\u53EF\u9009\u503C\uFF1A${SEARCH_TYPE_VALUES.join(" / ")}`,
        { example: "type=movie \u6216 type=tv,tv_episode" }
      );
    }
    if (!types.includes(mapped)) types.push(mapped);
  }
  return types.length > 0 ? types : void 0;
}
__name(parseSearchTypes, "parseSearchTypes");
function parseSearchYear(raw2, mode) {
  const value = raw2?.trim();
  if (!value) return void 0;
  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year) || year < 1874 || year > 2100) {
    throw ApiError.badRequest(`\u5E74\u4EFD "${value}" \u975E\u6CD5\uFF0C\u5E94\u5728 1874-2100 \u4E4B\u95F4`);
  }
  return mode === "start" ? `${year}-01-01` : `${year}-12-31`;
}
__name(parseSearchYear, "parseSearchYear");
var imdb = new Hono3();
imdb.get("/search", async (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const query = c.req.query("q")?.trim();
  if (!query) {
    throw ApiError.badRequest("\u7F3A\u5C11\u67E5\u8BE2\u53C2\u6570 q", { example: "/api/imdb/search?q=shawshank" });
  }
  if (query.length > 200) {
    throw ApiError.badRequest("\u67E5\u8BE2\u8BCD\u8FC7\u957F\uFF0C\u6700\u591A 200 \u4E2A\u5B57\u7B26");
  }
  const rawLimit = Number.parseInt(c.req.query("limit") ?? "10", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10;
  const filter = {
    types: parseSearchTypes(c.req.query("type")),
    exact: c.req.query("exact") === "true" ? true : void 0,
    startDate: parseSearchYear(c.req.query("year_from"), "start"),
    endDate: parseSearchYear(c.req.query("year_to"), "end")
  };
  const cacheKey = [
    query.toLowerCase(),
    limit,
    filter.types?.join(",") ?? "",
    filter.exact ? "1" : "",
    filter.startDate ?? "",
    filter.endDate ?? ""
  ].join("::");
  const cache2 = searchCache(config.cacheTtlSeconds);
  const cached = cache2.get(cacheKey);
  if (cached) {
    return sendSuccess(cached.data, { requestId, startedAt, cached: true, source: cached.source }, {
      cache: "hit",
      cacheTtlSeconds: config.cacheTtlSeconds,
      rateLimit: c.get("rateLimit"),
      origin,
      varyAuthorization: Boolean(config.apiToken || config.authSecret)
    });
  }
  const client = await getHttpClient(config);
  const { data, source } = await searchTitles(client, config, query, limit, filter);
  cache2.set(cacheKey, { data, source });
  return sendSuccess(data, { requestId, startedAt, cached: false, source }, {
    cache: "miss",
    cacheTtlSeconds: config.cacheTtlSeconds,
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken)
  });
});
imdb.get("/:id", async (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const imdbId = normalizeImdbId(c.req.param("id"));
  const full = c.req.query("full") !== "false";
  const memory = titleCache(config.cacheTtlSeconds);
  const memoryKey = `${imdbId}::${full ? "full" : "base"}`;
  const keys = buildVariantKeys("imdb", imdbId, null, full);
  let channel;
  const result = await readThrough({
    memory,
    memoryKey,
    store: createCacheStore(c.env),
    keys,
    ttlSeconds: config.cacheTtlSeconds,
    ratingRefreshSeconds: config.ratingRefreshSeconds,
    databaseFallback: /* @__PURE__ */ __name(() => loadStaticDatabase(c.env, "imdb", keys), "databaseFallback"),
    loader: /* @__PURE__ */ __name(async () => {
      const client = await getHttpClient(config);
      const { data: raw2, source } = await fetchTitle(client, config, imdbId, { full });
      channel = source;
      return attachFormat(
        "imdb",
        raw2
      );
    }, "loader")
  });
  const value = ensureFormat("imdb", result.value);
  return sendSuccess(value, { requestId, startedAt, cached: result.layer !== void 0, source: channel }, {
    cache: result.layer ? "hit" : "miss",
    cacheTtlSeconds: config.cacheTtlSeconds,
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken)
  });
});

// node_modules/entities/dist/decode-codepoint.js
var c1 = [
  8364,
  0,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  0,
  381,
  0,
  0,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  0,
  382,
  376
];
function isInvalidCodePoint(codePoint) {
  return codePoint === 0 || codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111;
}
__name(isInvalidCodePoint, "isInvalidCodePoint");
function replaceCodePoint(codePoint) {
  if (isInvalidCodePoint(codePoint)) {
    return 65533;
  }
  if (codePoint >= 128 && codePoint <= 159) {
    return c1[codePoint - 128] || codePoint;
  }
  return codePoint;
}
__name(replaceCodePoint, "replaceCodePoint");
function replaceCodePointXML(codePoint) {
  return isInvalidCodePoint(codePoint) ? 65533 : codePoint;
}
__name(replaceCodePointXML, "replaceCodePointXML");

// node_modules/entities/dist/internal/decode-shared.js
var BASE91_INVERSE = /* @__PURE__ */ (() => {
  const table = new Uint8Array(127);
  let code = 0;
  for (let char = 33; char <= 126; char++) {
    if (char !== 34 && char !== 36 && char !== 92) {
      table[char] = code++;
    }
  }
  return table;
})();
function decodeTrieDict(input, resultLength, atomCount, dict1AtomCount, ngramCount, dictSize) {
  const base = 91;
  const inputLength = input.length;
  const twoCharBias = dictSize * (base - 1);
  let pos = 0;
  const readSlotCode = /* @__PURE__ */ __name(() => {
    const c12 = BASE91_INVERSE[input.charCodeAt(pos++)];
    return c12 < dictSize ? c12 : c12 * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
  }, "readSlotCode");
  const dict2AtomCount = atomCount - dict1AtomCount;
  const slotCount = atomCount + ngramCount;
  const single = new Int32Array(slotCount);
  single.fill(-1, dict1AtomCount, dictSize);
  single.fill(-1, dictSize + dict2AtomCount, slotCount);
  const start = new Int32Array(slotCount);
  const length = new Int32Array(slotCount);
  function decodeDelta(count, off) {
    let previous = 0;
    let slot = off;
    const end = off + count;
    while (slot < end) {
      const code = BASE91_INVERSE[input.charCodeAt(pos++)];
      if (code < 89) {
        previous += code;
        single[slot++] = previous;
      } else if (code === 89) {
        let runLength = BASE91_INVERSE[input.charCodeAt(pos++)] + 2;
        while (runLength--)
          single[slot++] = ++previous;
      } else {
        const next = BASE91_INVERSE[input.charCodeAt(pos++)];
        previous += 89 + // eslint-disable-next-line unicorn/prefer-minimal-ternary -- branches read a different number of side-effecting input bytes
        (next < 90 ? next * base + BASE91_INVERSE[input.charCodeAt(pos++)] : BASE91_INVERSE[input.charCodeAt(pos++)] * 8281 + BASE91_INVERSE[input.charCodeAt(pos++)] * base + BASE91_INVERSE[input.charCodeAt(pos++)]);
        single[slot++] = previous;
      }
    }
  }
  __name(decodeDelta, "decodeDelta");
  decodeDelta(dict1AtomCount, 0);
  decodeDelta(dict2AtomCount, dictSize);
  const references = new Int32Array(ngramCount * 2);
  let poolSize = 0;
  let ngramIndex = 0;
  function readNgramReferences(count, startSlot) {
    for (let index = 0; index < count; index++) {
      const slot = startSlot + index;
      const a = readSlotCode();
      const b = readSlotCode();
      references[ngramIndex * 2] = a;
      references[ngramIndex * 2 + 1] = b;
      ngramIndex += 1;
      start[slot] = poolSize;
      const entryLength = (single[a] < 0 ? length[a] : 1) + (single[b] < 0 ? length[b] : 1);
      length[slot] = entryLength;
      poolSize += entryLength;
    }
  }
  __name(readNgramReferences, "readNgramReferences");
  readNgramReferences(ngramCount - dictSize + dict1AtomCount, dictSize + dict2AtomCount);
  readNgramReferences(dictSize - dict1AtomCount, dict1AtomCount);
  const pool = new Uint16Array(poolSize);
  let write = 0;
  for (let index = 0; index < ngramIndex; index++) {
    for (let half = 0; half < 2; half++) {
      const source = references[index * 2 + half];
      const value = single[source];
      if (value < 0) {
        let read = start[source];
        const readEnd = read + length[source];
        while (read < readEnd)
          pool[write++] = pool[read++];
      } else {
        pool[write++] = value;
      }
    }
  }
  const out = new Uint16Array(resultLength);
  let outIndex = 0;
  while (pos < inputLength) {
    let slot = BASE91_INVERSE[input.charCodeAt(pos++)];
    if (slot >= dictSize) {
      slot = slot * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
    }
    const value = single[slot];
    if (value < 0) {
      let read = start[slot];
      const readEnd = read + length[slot];
      while (read < readEnd)
        out[outIndex++] = pool[read++];
    } else {
      out[outIndex++] = value;
    }
  }
  return out;
}
__name(decodeTrieDict, "decodeTrieDict");

// node_modules/entities/dist/generated/decode-data-html.js
var htmlDecodeTree = /* @__PURE__ */ decodeTrieDict("!}.&u%}'&}*'~!6*)%&,~!J~!J~%L~y<~!R,~~%Lu~~#GD~~#|)1#%}^%}2%+#.##%##%}&%##%'#%##&%#%#'%#&#%#&#'#%%#&#%##%#)%''%&%#%#'%#%%#%%}%%%#%#&(23#%%#&-%0%('1#(##%#'##+%'*.:1}#%#6-+(%'%%#%%%}#L'2351&('%}&/N'(0(/*-%(%%}#'+&T%7.2}#&%&#%#36/5##%&%%#&#%%#))2%%##%&&'0~!#*+&'%1~!%).'3q?&%'1~!.##%6(~!+%%%(Gw'rT~!E#<nA%#jZ~!H%(~!42##~!*31&~!G%U~#)5~#`3~!J~!Z~%]~%Y~%C~!q~!u~#kz~%#~!6'~!D~!U~!?~#T~!c%~!G#'~%7|~!G~!J~!G&~#pb~(Df}#%}*&}#%##%##%##&#-}&'#'&%#.++}%mI,#,@&(}*%}*'%&##&#%##%}&0}#.},U},%}+%}&%}#%##&}B%(}(%}+%)})%##%#&}&%##%&}<%}>%#%&}*%}(%}9%}/%})%}*%}*%}?&}&%}3%}&*#%})%#%#)}#&#-#+*%E%%'%'#%}#*V##&##I}#&&##%&%#&&Qf%%))w/0+&%#(#.%-''''++++7}>%4'',##1,#%#&%##&#'##&#*#9)%&%}#*}%,#+P(%A&%#'&##wSD',9E00#y#@}(+}&%&>~!#~!X}#*}(&&}(&}(,%}%&#+&}#&}I%#%}%)#(},'%#*}4%%#%}(''}#/##(##),%-##%%)#&}(.}&%#&}%%}*&#%},&&}&%}#%*'#%})%}D&}&%}-&}6&#&}-,%}#%})-(~+`~,=?~I9'9%~!,#%})%})%}@%}?%}(~!?~#<~#pP~#BG~#=1#%K+~#?#~%;)~#A~#mF1~#A'~'X%'~#lR~#N~'N~#r~#m#-~#i'?%#'%~#B%##%,%#~#_%#0%~#]732~,w~2+#:&#%&'0%&>%}#>##F+)#%&&#(+_}4&}-%}(&}@&}O7Fdf0@+/v4}&WU##&/0#&'('B#%}.%}'+#%}#%%&#&%#%##+#&#)#6#'#.},%}c%},%#%##%&#&%#&~#>'*-.%##%##%}#%%}%'~#)D1}#%*&~#_%%'(~#S2%'.}#~#=##*'*-%}&'%'##&&~'E%.#&~#M4}%%##&'%#~#O1##%&#'+~#<B%##%%'%+~#;#@%}#&%#&&%#(~#H1}'%'##&&~#?A}&'~#D#%32}'&&&&~#[}'(#%}'~#;C})&}%%#%~#=&%,3}%'(#%%~#^'#&&)#%'~#Y%-~#d-%'~#^%%&#&&&}#~#b~2t*&'~&(~&@~0%~e~3}%*''0})&}+~!9##-}#%-hD*)1fC#%/&/fB#40~!+#)*4~!+~!K'&:~!/*7~!.#~!H~!L':~%x&~!H#~!*~%1~!I#~!+A~#p'~!F~~#-#~,,(~.Z~!V~%;'B'mq-W~!N~%I%#&&#&}#%},%%}'%}+X#%}#&}(%}'%}<%}#%}%%'}'%}:~![)9@~%>~#UA%-%##&~!C%~!-.9:~!1~!-^2/:a~!y,D*J#-5)/4~%23,~#G~!L1~!0X3`~!2+~!!0-~&E~!W~!o,>Y&]~%cZx_&~#O*9#A#'#+I'%#)~!0B*-5A+-((F&*M#)(-7-5+'-3a5Vi~!Y~!?+[)%3),ERHm~!+:D,VG.+)?fB%%*(%)'(#&80%1'8`K8?`+'Z#&O&'H5#*9)A%%5&3))0%39+.*7#()&&*=4@**L)<'_&*+..;(#*+)./&0#3)%')-8(4ixD(&.}%,('aI:,)%,k2231T)I'#/-W7,/'Q#.'Y24+h')37</31&83##&0#),H(?'&?/1##%#&&#%''-%&&&#(&''&#.-'%#%%(,')*'&#&#'##%(%(#%('#&##%%%%('%#%#%%#%#&%##h>w+v<ayvyvcg.uuhKr}g/v|g>u9i[~>g5uI~=RvdwEg;v/g;uk!!TTSx]@RT!U!#!@VBRUU!'UTe-d0c`e&gSdicedFcrdTaqb.kYcAohdYd@a3e+d}dMdtd.aJ#bqcK`dle/e.e'dwdPdodddjbEb}ogd^ofdpduc6j?l%d{drdqc)d7bacOdQ%T#Y)X.sR[yH>6Vyv3[xwLu>vo'!*.[yBacahoj>6Rew3[xqdZa#!a&#^(X-[yG>6Vyu3[xvg3sEr|g.u/Ri9db0T#^(Xa)!-[y;>6Vylg4wKs{JwNZt3@3r=c4Z([xlg;wKt!cpq's@v7A'*a(a+!-a#[y<3Dt?3Dt'>6Vym3[xmg9rxsNJwLZt4~?r?db1T#`-!(Xa,!0[yS>6Vz%NuQs.g4wKtnJwNZtS@3r>c4Z([y%g;wKtrdga8!a(!#&T*Y-Xa#!a0<or[yc3Dtq>6Vz43[y3JwNZtf@3s!Ju}!%Dti:pm3c_%X#tjB5pkd6q!r]u?voC'*-a.a2!0a&a+[yI3DtI3Ds~3DtH>6Vyw3[xx;:s#~<5pKJwNZtE@3r~d`a)!a2T#a.(!+U.X1[yT3Dt`3Dtv>6Vz&3[y&g9rxwzcxstPu.<rAJwLZtT~?r@dZa%!a.&^*Za(/Reu[ya>6Vz23[y1g3sEr}wkg{NuQRg{ci(U#5@b`~,cg#U(2WnH5wugcRh7dX#T(Y,a'Ta!!a,[yZ<]mj>6Vz,3[y+Pv#5ReZKu+=,%!H}7ABwkaS?Rh:BcW(X#<]mrj:ubv/ARekdg%!(!a.*Ta(Y.X1!#sP>Rl*Dt6[y>>6Vyo3Wf*jOvuumvuRgRJuq*!:9<B@bX~3jVv&v@s@5Re[d/rQt{uAvo&a&a*)a2!,0Wf!3Dt0=Bs'>6Re}3[xy~<5s%JwJZt1~Gs)c;&!#2sJkNuXvzq7rxu,Re8dka4!a8(aEZ+a@Y.X1Xa)[yd=Bs(3DtP>6Vz53[y4cX#X&Re:avRe9~<5s&JwJZtQ~Gs*i^rzvdRg+Jv{%!2sbB@bX}kdga,!Za?&^*T1/!a'Dt+[y6>6Vyf3Wf%g/u;s4hGu6?Rh-JvZ,!c%#&RoX54Rivj7uyvf8RgTKvZB%*!2sGh<vu5Rgq<=C::9bb~#dZ#T&Ta6Y.X*Dt>[y93Wf)coZ(T,6VyifluvRgC@95@B@bX~/hFu34cC#T,k/unq8w8Q5RkUklwQuzunq8w8Q5Rk8d/rJu?v8w9)-&!a0a;a&aIWejg3sEr/h1s<DtDJvyZqY5aws3Jvy!&Wei~Hr1:au5@Bag>23E~5c:Z&bX};kKv?w&unuVu5Rjc;>bs)#~@:Rh.=ay<a]C;b`}Vd6s/t{uAvoaxa()!a,a7%-a#a2Dt,[yF2Wo[>6Vyt3[xuNuPRi&NuPwpi#RoWh?vf8Ri%Jv]!%Ri:KvxD!.'2WeAjZu`q9rxu,Re7woeAg-unLq(qA_/*2Wg_g3u5q^9:4E}/jTrxrzv=Wkkd~0UX#^^Xa-a1a5T&a=U1a'*aEa]!a*aPaA-adok[y54Rn>;:p3~Dp5g9rpsFNvZqjg3uJp4~<5p0Pw;5qlJwNZt*@3p1Pw:5p/Ou!5p2JvG'!6Vye=<qnJvh_[xhg3v,Rh3kOwOw-sDuev/Re^dha[a%!%!a+#Ta7)-5TaCaO!aka!a)sf[yb2>Rl!9ARiq5E}Qg=ucRkBE|oJrJ_@Wk~@Wk{JrJ_@Wk|@WkyJrJ_@Wk}@WkzJvO_[y2g-vMRmiKuYC!)&>Ri;>Ri<@3RkNc](X#@9Rk=g5vuRmhKvDB!+'=]meg3u4Rmgd)#Y'Vz3CARmfd`a+!%T'!+#Ta1Ta6TaM-sTDt9[yA9sYd'%Y#s[[xpj:ueunaXRgEjRq,v-vuqdd2'`#6Rev<32@5>:2<E}5xIo9a*X#Y(;5RePJvD_g>vyRgNj8w)v8<wggs:RgXiZt|vjx,hSq3ah!-(~@:Ro/Ou!5RhWj^v(pyw8unRhUdx-UY#^Ua.a3a70!)%UX1TaDa)'omRiRRhE[y:3Dsz=Br,>6Vyj3[xkg6ruwjcqsrPw;5r*Ku]D'Zt-@3r(~?r.i[vwv]dU1a--U#`a4(g/vsRhPOu!5RhLj:rmu9Wo!~@:wdh@g/vsRiTjXuvvNr}:RhBj^v(pyw8unRn]dz1UYa'a+^Y(!aETZalaRY.Ta?a4[yDJw1!#qLsW>6Vyrfzq-pLflpwRe|Js>%!Dt@3Dt&Jvy_[xs~HrnjMuwpsw'RecKu+D#'!t<~Grl~?rjg5u-x,gwp{ah!-(~@:Rg~Ou!5Rh'jXuvvNr}:Rh#cW#X/c;&!#2sLi[v7u7RgpJv)(!iLrxu,Re6j7v@s@5Se[e7d`aW!Za(a`T.a#!a3!&aDa-!9)Dt_=6s+3[x~~DR|h~DS6avhGun5RkZj3w)v-]mkKunB!&*]kb97R|i<ARk<c:Z(6Vy}Juh'!wziMRoS:F|vkLuauJv5vtvQRh1d='T+Y#VyO~DR|jcF#T'7R|g97R|kJv3'!ay<Rj,Jvh&!:ReXcsa6*a+#a#_aIRf9aLRf?c,Z&Rf5Rf7c.Z&Rf;Rf>cQ#%T'p-Rf8Rf=ct#%'(*!,p,Rf4p+Rf6Rf:Rf<d~'Ua%U*^UYa(!a,-!#a4YaTalaEX0a8a<Weo3Dt/3Dsx=Br93Wen~Dr;~<5p<JwNZt2@3p=Pw:5p;Ou!5r3c7&!#:p>3Ds}KvGB)_6Vyk2sM=<r7x'eovA(!hFu1ARf}cV#X&@r5j6rvwQa^Rf3c=Za'wkghJv__g;unRggA53B9=b^}%j6uduo5Jq;!(hIv%2Re`Ou4ARe_e%a#^^^Xa&!a*a2!&a6YaP!*ad!#a:aE/5Rn?[y@>6Vyp;:pE~DrY~<5pBJwNZt8@3pCh=rt3rWPw:5pAJup_[xoNuPpF9c!#'45pD5ARn)d8#X'X*3@rU72s]h>v<<sSjJpqvewOJq/(!hNw'5ReBk0s2u3w/w'5ReE5@Jq.!a+JQ!&WeU23d(#Y&RjG5]jBk!u7w&u0udARjEe#+^^^Ub#!a2/a`Z(agT1!a-a;|@TaG!aS[yV=Re~fow'RguNuPRe?bz#'>RoUWeL>:Cbb|?JwPZtVg6ruRmzJvD'!6Vz(g/vmRh~Jvy_[y(g9voRgyx*cy(#2>Ri2B9b]~9kIw9u7rluJu3Rg]dI#a%UY'@=p%CAx.gQZ&RhwwygtRm{x5g_Z'+ABqR9Woa=Bp&dV#^*Xa'!&@o{g4v]Rk;Jv{!%Rk[wkkiA5RkiwwfUB=x,fUuqC&*!>RfTg8v0RfV~ARfSd;rJsAuAv9wR'ae+/aO!a@aza/a#[yQ@Wg!2Wemg3sEr0JvB_g>uvReWg2v+Re=KupB_+[y!2AbY~-~Hr2AJwD!(h<~El>h<~El?Kun@+_:9b`}Kg-v/Ri3g;vtwyk_9]k_d=&T#*U.6qh@Ab`|K9:H|CJv[!&3Dtex'fDwC%!Rf[9WlMd[(^X,!a%Z06Vz!@WgBg=v~Rgvg,QRe@awd,#Y+jTv|Q~EfWj]uNr|~FRfXdy#Y&^Ua%!aO.!(a)Ua;=!a@aKap!a-,a!Ta]a[rSa]p?[y82sK=Bq~;:p:~<5p8Pw:5p7d'#Y'Wf(;RnRi[u4w&RgJJvG'!6Vyh=<r#ijuuv/sIKuYD'ZtG@3p9~Gr&d2#`(g<vtRgFj`u5w&rqpxRf2CJuY!+:wfnTOu!5Rg}jNs1ucv&RfwJvA!&3@q|BDcC#T,k/unq8w8Q5RkTklwQuzunq8w8Q5Rk9dga#!a'!a=#a0!:+Tb*b@aO.a4!aba8aFJv^}?!VyR~Dr<g;u%Rn.~<5p[x'e`wNZtR@3p]Pw:5pZhNvjBp.woe_g5u-r4JwF!%DtO3:ooc7&!#:p^3DtpLuGw(!+%)Dtk6Vz#2sd=<r8d'#Y([y#<x3gJt`w@!)%}MRiowzikRij=]ilxAf3,U(#B2Rf#g0v-Rm[ck{`U#]giKv3>)!&6Ri154s,KuGB_%@r68r:dJ|t`#X(9<E|u2@H|rx3gJu?w'!+'1Nu7Reg4=H~+9<wxgY95Rm]xLggZ-`(X}U2:Ri4h<uOawRmsJv__5@bb{jbV~3dka#a'a]!,#a+U=a>b6a3b%!/aKa/)!arwve^VyJ;:pR~DpTg3uJpS~<5pOPw;5qmPw:5pNOu!5pQJvG'!6Vyx=<qoJvA!{~Jup!%@qk7Rn/KvyD!}''[xz;>wkh'?Rh,x8gyt`w5D!&),(SgyccRgztJ@3pPB5p#d'(Y#<]mmifubw&RgoJvE&!82s^JvF&!8Rf,ADb]~;x=h'rNu]vK!,%'*0RnORh)4Rh*AqQg-vaRnNg;wHwkh'ba~4cE#Ta*x3gctyw@'!+%RnFRnD<4Rn@hFvK5RnCxWg[#`&a0Ua()`1Rm75Rg[c]%X#qi8Rg^NvdRj>BwzgZauwji7Rm6A4wgg]d1#&(*,.0a#Rm;Rm<Rm=Rm>Rm?Rm@RmARmBe%#^^^Xaea?aC/b+(,!a+a#!a/!>a&Ta<aKbD!2wphBRnk[yPw}hE|.=Br-3Dtm>6Vy~g6urRf.x,hPrNav!%'RnqRo%Ro#Nu;q[Pw;5r+JwNZtM@3r)d'#Y'Weh;xChL#`&RnmRnoKu}>%(!Rne~Bs-;2wjcussJv+'!aYSO}6@B<5?ba~8LrNvj!.%*ROwungw~ng~:9;Ri^>wtnig;wHRnixDh@|(UZ.x1h@|)!#:2<H|*xHn]#-UX'3Ro)z=iT}6ARns=Bwsn_wpnaRncw]aR(#UXa&Ua*a/=]iPd'#Y&Ro'WnXf{QRm2hNvj]nZd`'T~&1`{|`#9b]{}c:'!#Wl{>@=be}]?cl{{U#:5Abb}Jds#^YaF!a*b4a#a3aPa>&Tb!bH!*a_!Eau?/a&RjY<]gj>6Vz*;:pe~DrZg,QRj1JwNZtX@wihspcJvZ&!VyX9WmOJu|!|N2WmHJvh&!]ht~Bpbcn&T(!#RmQ<s7Nu;padH#X'`+WmJ@>RmKCARhnKup=!)&Wf+:RhqNuPpf9c!#'45pd5AwghpARn(Ls@w!%,)!RmP@Wfe<E|IJva!&WmNg8vsRmLd`*.`#Y'Xa!axRn*]hrA8Rhug5s@rXg8u!RmMd8#X'X*3@rV72smdI*#UY&RmICARho~GsgxVgd)Ta'U-Y&Xa!T#RnEWnA@Wffg1uDRi0hFvK5RnBxGnG&#`%owp)@wsf+bX}Ze-*1!a*^^^Ua|!#a.aq&Ya2!a>.a6!a:aO`aJDtL[y`@Wg#>6Vz12@wzoYRoZNuPRi!NuPRhzg=ucRi,@=b`{Yg=ucRi-ACJvB!&Sh[ebSh]ebi`wUuFRm4Jw2_[y0JvB!.<Ju(!&SoG}6Shd}6<Ju(!&SoH}6She}6Kur@._g5vHRieJvx!{L2G{Kx6gd'T#?Rh82Wi5cZ#X(g1w)Rm5dW-Y(Ta#!a)!#aYa=wnfE=su2>>bU{0j9udv:<svj8uQv-7RgHdE%#^'sq9sp=>Bb_{TJv`!&g/r|snj6v(us5d,#Y(56H}[978H}]Jw5!&g1rushJvB!+j;v{u5?zDhd}6}bj;v{u5?zDhe}6}ce*#`(^^^a[aea!=!a6a*aoXb1a.!aAbL!b>,b'aL!aV@Wf|2Wlg3[y/JwNZt^@3piPw:5pgJunZou3@rsJva&!Vy_g<v~Rm#JvG'!6Vz0=<r{Ju{%!:pj@WfsiXuJu3Rm:JvZ&!WfA~Bph@c4Z&Dtwax5rubx(#:awRk1@d,#Y&RfjRfid1#,Y(@Wfp2Wlrg5s@ryKu[@!,'=]ig9wlk?Rk>g5u-rqJvy'!@9RkQcH(T#=>Ri~@<wkj(Wj(KuZB*!&<7rw@9RkRcH(T#=>Ri}@<wkj)Wj)dg(Ta2Xa9X#`-!a*CARhg@@=I}d9x;c~#X%so=<sj>2@@=aybb}XjWv0Q~EfEj3vLv;<d,#Y(56H}`978H}_dgaPaFa'a/!#a3Y0a_a;a|!1(a7-[yE3[xt;:pJNvZrrg3uJrvJwNZt=@3pIh=rt3rxPw:5pGOu!5rpJvG'!6Vys=<rz@c4Z&Dt(ax5rtJvZ!&~BpH@wsfNg-vaRlNci*U#=<wei<F}a5@Jq.!a*JQ!%@qZ23d(#Y&RjH5]jCk!u7w&u0udARjFd/prq=tyvpaEa(a:.!a1aZ(@@=I}:9wpd%=<sX55w_h}@@=I{t=ay<aU@@=I}T=ay<2@@=I})?C9:9au@9Cb]}DP~=x-fAZ(2Wl1=ay<aU@@=I}>5@d##Y+jTv|vV~EfFj]uNpn~FRfGdgaK!Z2&!a8a-Tb({E!acTbM*!a(DtY[yYd'%Y#sl[y*hHvh>Re5x2c{Z}.j4uCvcawRiMd+#X+_x&d!},<5RkX;2Hzw@x,gavfB-!{CcF&T#Roe;RodwWbBg5urRgaKvHC*_6Vz+<4opieuew&Rmq@d]&Y)X,T#X0Rh}<BqP=4qS9:ReMg/ujReNJw0!/<Jui%!bd{kawwnemRelAxUa?a3#*.&UX(Ya+a/RhvRnQ<o}9Wmtd-#Y&RgSRmw9;Rmxay=Rmyg-vaRmuxEhSrNu,v-voC!%(aR.a(a7+1Ro1>Ro5CE{A9b]{@;5x#eO{:g;urRi+KrNA!%(Ro3>Ro79;Ri_Ku@>{;&!x%gX|{KunA_+g5QRj/g3u5Rj#g>uERj%wio/xRhS&!,!#^1U}wba{8>>@=be}qC@:D5ba{7Ku+A&!}x?ba}t>>@=be}se(aA^^^Uat!b0#{pa+awUazbGa#aLb9bgaWac'a5TbS=Br!d1#`%scp_Jvl!#rT>Re0JvX&!VyN=H{Fcm#U&:pY=ReaJv2&!]h0=]nUJvG'!6Vy|=<r%JrM_=]h2@Wlud'#)U'Wf'b]{i=]h/Jvh!&~BpWg=v]RnMx+ny#'Nu;pVwjnu=]nwxJnx,T#`&Reqwjnt=]nvieu9vrRjLLuYwP(#+!th@wih5pX~Gr'g5v/Rh4KunA'!-CARnP@wwiN:Rm_9x'cvw>!|l=<saKvAA!0&3@q}>w^e1bp#&Re2Re3BDx7gH#T|f5H|eKuZ>!%(:qNAH{]Jv6!+3B2B9=b^{X<5<B92:E{ZLvhwA(a;a%!igQuyRmad+#Y}m@3Rh5d8#X'X*:AqUAHzmaxwbh<aXRnVcF}RT#Nw&cj#U(BWnug/vsRntdka)(a3+.Zb7aYYan1!bVa@Xa}[y^@b[{G=H{+hFu73Rj&Pv#5ReQcK%T#sig1v{Rj'Ku+D#'!t]~Grm~?rkKuMB!01d5#`'Vy.ta3Dtu~Hroc8#'{^45s85AwZbP&!#Rn!wghxWn#KvEA!)&2RlA2RlBx:h|#(T,=]j09Wobz>x]z/@awRoTd+#Y(az]hFhCrm4d,#Y+jTv|Q~EfMj]uNr|~FRfOdCa!Xa9_X#@<plJvf!%b`{(9;Rgwc;.!#2x7cw#T|UDb]|T5Ju={(!=@E{&Jv)&!Ab`{'awJvf!~*>>@=be{#KuY>!+&4Ezyi[ugv&RjIdea+T)#UXa&T-T&a!Rh9auRmW=]kLg5vuRn+g3u4Rn-Ow6ARn,hHus5xNk?#UX(U~)/g8v0RkD~AwkkF?Ri.OuNBwkkA?Ri/d|a2`a*^UYa.!aBTZaTa'Xa;!(!2!-a#b2[yC>6Vyq3[xr2Wi?g1rusVh%s?DtF~<5rbJs;%!DtBfswKtCj[uvuSsEu3RgVx3o:u+wN'*Zt;@3rd~Grh~?rfg8w)Lq)qE&-a%!>bI|`jWv0vV~EfCjTv|vV~Ef@j]uNpn~FRfBcK#T']gWNu7x,k7q4ai(0!hHv8<RhmkMu9vrsBuev/RhlCJvB!,g<v{wchh~@:Rhji[vrv{wchi~@:RhkdS&a5UY#Ta!RgPwwiI5BwciI~@:Rh`x'iJvj'!5]iJPu8Bwch]~@:Rhach)U#h3rp]gLh@t|Ax,hTq3ah!-(~@:Ro0Ou!5RhXj^v(pyw8unRhVd|)`,^UYas!a?/a2Z'a^Ta{Tb7Ta(a#!a,Wf&9sZ3DtAadamov=Bqt3[xig8vsRm~>waiL2b`{QJv*_Ouv2qgj<v]v2BqfdR'X*X#Y-@3qr~Gqv~?p6hHv-]glPup5Lq+q?_%*b_{qF{n9b^{rOu4ARhpKvCD!+&~Bqp:5Dbb}nwoiKl&unuTuBv]v+ueunaXRf0=Jvh!0nKufu8v1w&w7q%w&uHrz:Rgnj5w,uxDJq/(!hNw'5ReCk0s2u3w/w'5ReFd>Za&!*UaA=<wkgsRnSJv^!%Refifw3vyRgOKu_B'!,<]gkiiu:w&Rh<=C@a^<B57@2F{[<B5@aW:=3away9A5aW=<B=C@a^<B57@2F{Ie-#`(^^^bCara.b8aza6!/bZ,!adTbnTbOb+aFaS!aAT9@Wf~2Wli3Dtl2@d,#Y&RfnRfmJwJZtN~GqyJva&!VyMg<v~Rm%iXuJu3Rm9Jv[_=]ih9wlkDRkCd1#`(@Wg>2Wls3cH#T(@<Rj*=>Ri|b~'#23s9h<~El.d'#Y&Dtxi^rzvdRl#d*#U%(o|B2s`hJwSaxRmDKv4B&!1:Rmdd5#`'Vx}to~Hq{x'f1v3(!BA5ba|bJv_&!Wfug1v]ReIdO+U/Y#&G}-8wze=Rh{g1v]ReHg/uQRf/by#)ibQwERl/cH#T(@<Rj+=>Ri{cNu+vlax-!(#a0qa9<Rii2;;bU{H;x<i=&X#Rk`<4wwi=C9H~8xAI(Y#<azRi@45wXI<B9;5bb~7dL(X#Xa(+!aL6Vy{g5QqOau:5au2@ay547EzbxOcU(UX-T#Ta#:Cbb|A?wjh/b_|SOw6ARgtihr}u7Rhy<d1#T)X1@@=I|~=ay<2@@=aybb}Sj3vLv;<d,#Y(56H}A978H}@dGpvs@uAu`vcw9*!aFa+ai%(b!aXa8.a?a[ozWey=sU2@G}Nch&U#Rf_WexKu+D#'!t:~Gr`~?r^j]uNr|~FRg*j^psurwJt|RmcKv)@&!)7Rkv~Br[@wxfO:Rl3co#U'6Rezj_q#vIuavjRltwzeyh@vr5JqD0!>aY?C9:9au@9Cb]}9cl#U*5;5<H||jbuus1ucv&Rfvg1v~d/pppzqFr^a--a~!aMat1(hFv;Wiz@@=Izoj5uuv-7Rix~Cw`fk2WlVcZ#X,k)u3vWs@u2]ktg;wEx'fBq(_2Wg/jTv|vV~EfoJv]!15x'hzqG!(P~EfU~CRl_j6v(us5x4i-#T(2WmZ?C2F|d>Kq<aj1!*jTqIsBv=Wl`~Cw`fi2WlWj`v0u*~>RlR=c>Z,k#u3vWs@u2]kr<c1Z+jTqIsBv=Wla~Cw`fm2WlXdmb3!a{(arZa`bkTa%TbQTa-a9+c'!aM!/[yL=Bqug.w'RifhFvyDRj.g>vgwyk^9]k^Jv3_@WfbAARkhJw2_[x|JvB_wkoIRoKwkoJRoLd'(Y#<]gm=<9<H|yd'%_X#skDtb3awwqkgNulRkgdB#^',9:p'hJwSaxRmEBwVb8@4=H|qLu+w50&!)@3qs~?pU>Awwn;;Rn=c:Z'ARn<=<qwKvC@!/&~BqqJv6!&]eVb^z^xRge'/a%+^`#Sge}6<4Rn3=]n0Pw2>Rn8Jw0!&>Rn:>Rn6cY#a7+!a&=<wkaNw~h3z_c5Z{=wjh#=]nLKv^D!&)Vyz=bW|swYb<WetcG#T(2wxa@qVx@gD#Y&b^|V5JwG&!5bb|pg/w&RgD@x=kHs=uAvn!a%%/'+RmSRh694Ro`g-vaRmRhHv-]mlxCcS#`&ba~.5cD#Ta)P~=d,#Y(56H{>978H{Dd_#{2^Y%_+qbbb{6g3sERhsbU{?dfa.,`a(Xa<!aiX#(55RiG54RiHcI#T'WiU3RiVNvdwtfcRlKNvdd,#Y&RlHRlExQgf.1*^T'X#Sgf}6Wn4=]hfPrk>Rn7Jw0!&>Rn5>Rn9Lunw?&a2!,5<oq@@wqfdRlJj5Q~=d,#Y(~ARfcOuN]fdDKw;ay(}i!547E}j?cI#T(@5bV}iCbV}hdv(^^Tb?a40,b##Tbo!a*bR!a<b|a/!aKai!aU[yK=]o^g:v>ReGJwPZtK<7Rh+h<~El,Pv#5ReR@awwxjCg,ulRjDJv6&!]j!z?aQeeg>w=Sh<eeJw;!&axEzOg,Qosc!#*:wkeJ]eJ>x'h-u(!%Ro.w~h.zPdNZ(X,Ya![x{;9ReY;wkgxRiF:x?ap#Y&RmUg<s2Rkod]+UY0TZ'!a&A9sw<=bczLNvuw{gqzNhJwSaxRmCKuLay!#&s_Rf-55b^{uJvZa!!c%#(55Ri654wmiu5RiuawLu,vp!+}^%b_}Y9;wkgxba}o>A9:=b^}zKuh=a''!3awRk3c*'!#aHRk6c+Z&Rk5Rk4Jv)&!awRjSawd9*`#0?C2@EzMj8u<uJ5RmbjQrquJu3x,k>uq@_+=ayb^|W~ARkEOuN]k@7dhzV^X/X&a-#zRzSb`zXcJzTT#2WkVKvDBzW!%FzY9;5bbzWjQrquJu3Jw3%!b`zU=ayb^zQd:#X(T-a!6Vyywxh}=b]{Jg=u1RiAdGp~qHtzv!w(wA+a+a;<!aJaYai'anasb(=azRmV:Cbb{MLq2vb!%')RjuRjrRjtRjqx3jnqCw3!%')Rk(Rk+Rk&Rk)Lq2vb!%')Rj{RjxRjzRjwLq2vb!%')RjsRjpRjfRjex3jcqCw3!%')Rk'Rk*RjkRjl9<CbbzfOu4ARhxLq2vb!%')RjyRjvRjhRjgx=joq*uKvb!%')+-Rk.Rk%Rj~Rk-Rk#Rj}x=jdq*uKvb!%')+-Rk,Rk!Rj|RjmRjjRjidAq&qKs@uAv8Aa.'*-a@a&0!aM@a5[y73Dsy3Ds|3Dt):wxgI2sHJwJZt.~Gqxwsf0ikrzt}Rl0Jvy_[xj~HqzKv_A|D!&WfP8axRoVcf,U#k(v]v+ueunaXRf1Ju}'!g8u#Ri=jQw!sCunLprq>!,')~<5qeGzq9F{W=c##%s5au:5aU3CBE|;d4#X(D!a&6Vygx(b;#(=]ed?C2F{N<capoq2r[a&!aPa9,'Pw;5s:@@=I|,55w_h|@@=IzcP~=x'fCqB_2Wl2>aU@@=I|1OuNBc1Z+jTqIsBv=Wlc~Cw`fl2WlZ~AcTa%!Z+jTqIsBv=Wlb~Cw`fh2WlYk+uNqJsBv=WlSg,u3dca3#UXaMYa)TaB-=cM|7T#<bI}l5@B932:aV2G{BOuNBJq:|M!5Ezt=<B=C@a^<B57@2F{v>cB{/T#=ay<bI{3Jv6!a.6BKq0ah&+!5E}HP~Ef{978BaU@@=Iza<7d#.Y#978BaU@@=IzH~AJq0!(@@=IzG978BaU@@=IzFe,aU*Y&^^^bvJb,b:bFad!a,c2Ta>aL.bo6!a#CbTa'T#Re{2Wlh2@G{yg6t~Ro_NvdRfticuRQRllJv3&!x&c|zs@Jw3!%RflwpfkRlpKuL;%(!Re<@G|C2GzdhIvuBwgjAg-u0RjAKQB%!(GzZ@G|5NuuRl7d='T+Y#Vy[g<v~Rm!==G|>JvA!)@wma=]m1ifuaw&RmnLs@vT'!|/+[y,g:v>ReTJw1!#qX=x!eC{bLu+wT&)ZtZauq_~Graci&U#F|89:r_Lupvq!.)&2RlG8RfaC=x!eF{_h?rpWlmd&'!#X|&]k::xJey#`'T|+<E|&2@H|%dE#(^,g;u.RiEg6vjRiC9xCkA{O|zY#g=ucRmXKs0@!&*@G|m@awRknJuh!,3d(}gY}eJvj!%Rm):Jw3!%Rm+Rm-Ls0w(&!a(a#@b[|6cZ#X'7RkxWgAOu4ARn'dH'U#Y*Vz-Wm'CARm}d]*#a%^a*T'aK!a<9bV{PC=p*Jw4!&SgxcbB5r]idw(wBRmF7xFkt#&`(Rm/Rm8E|!JuY_9:Rl5=wrgr2:bbxd@xXfB(a*#T+!.X0X1Ta/a'T&RlDRfL>RlyARl9b[z[>RfZ:RlL:RfRwlg/ARl;9;RlxKv,A/!%7s69<74=BA5ba{-8Bde#`a<XaKYa1,a'P~=wxfB2bZ}}?C972@@=I}r8@55B9;5bb}G978B2@@=aybb}3j3vLv;<Jw3&!>Rfk=ayb^}4~Ad1#`*@@=aybb{w2@>==<bbz]dx+UY#^UaF!a9!bB'Ya1.!ajXa#%olRhD[y=3Dt#Ov5BrHKuMB%!(Rf^Wep~HrJwkiQjKr|~FRg)Ku+D#'!t5~GrF~?rDdV)UY,Z/_7RkuG{<~BrBg,rlsO:235B@bX}|d?a1!#`(6Vyn5@d##Y+jTv|vV~EfIj]uNpn~FRfH7Lq2vb1!a9-978BaU@@=Iz9978BbU}#~AJq0!(@@=Iz8978BaU@@=Iz7~AJQ|}!978BbU}!JvkaK!AdUa21-U#`a+(g/vsRn~Ou!5RPj:rmu9WhOjXuvvNr}:RhAj^v(pyw8unRn[kPr}p|u7vwv]RiSBd;pppzq@qHQa?(b.!a.a`@.|xa(hFv;Wiyj5uuv-7Riw~Cw`fg2WlU978BbU|wOuNBJqG!(P~EfD~CRlQcZ#X,k)u3vWs@u2]ksg;wEx'f@q1_2Wg.j]uNpn~FRfqJv]!15x'h{qG!(@@=IzK~CRl^j6v(us5x4i,#T(2WmY?C2F{1>Kq<aj1!*jTqIsBv=Wld~Cw`fj2Wl[j`v0u*~>RlT=c>Z,k#u3vWs@u2]kq<c1Z+jTqIsBv=Wle~Cw`fn2Wl]dn1#c(a(b^a2!b/bAT(bj!aDa7bu,a_a{c0!2T0g:v>ReD2@G{42@G{5~DpM~<5rc=Bx6i>{RT#RnI@zCx]y]z:2Jv[!zr5Awyk]9]k]dD(Y+X#6Vz.g=wKtgwhaCwgmTWj2Lu,w%_+/[y-B;b^xeg3u3Rj-2@bX{*KrJ<!+'@Wg(g?QRlC@Jv`!%b[zIwsfII}8JQ_@w|kW|=Jv(%!AqcOuNBJvEzh!bYzjLs@wP#(0!oy@>RkdJwMZtc3Dtd@BcG#T'9bWxg2@2Fznd*#Y+;2x'c}w<zizixNgwa#Z'U+!/!a'!a+w~g~z6wcn{Rn}wcnzRn|5Rh%=]nJg5vuRmvNvdRlvcprJu}w*az*a#!%.a.'Bot9qT]kj@Wg'ay2Gzv@Jv`!%b[zEwsfHI}1;ck#Ux`<Cbbx_Lu+w!a&0*!wko*wwo,So,}6Juqxf!E}PigQuyRm`d3(`#8>Rn%:A5B;bZ~%KvhCa!a2!x>k7#Uxb@b{#xaRk7Jw0!)>wwhlShl}6>wwhmShm}6CJvB!.x'hhvj{!!5Bwkhhbaz}x'hivjz~!5Bwkhibaz|xEhTrNu,v-vpD!a%&/)a3a.,%Ro2t[CE{)@3re9b]{%wjo09:rgc:Z&Ro6=<riifuaw&RmoKrNA!%(Ro4>Ro89;Ri`dSaL'UYzxZb)7Rka3xRhT&!,!#^1U}vbaz{>>@=be}yC@:D5bazzKu+A&!}{?ba}y>>@=be}wxBh[t`u~vJvr!%a!a()a,a0a4RoC=]o;Ju(!%RoGRhdwjh`=]oAg>w#Ro?g5vuRo=NvdRl|Ku]C.!&;RoEJvB!%RoORoMBx'h[v+_?w~h`}~5?w~hd~!xKh]oiptu-utv.vp!#%&a30a@a'a+(a/aOp(o~p!RoDJu(!%RoHRhewjha=]oBNvdRl}g>w#Ro@g5vuRo>c[#X']o<CauRoRAd-#Y':RkpauRoQKu]C.!&;RoFJvB!%RoNRoPBx'h]v+_?w~ha}t5?w~he}ue!/UbhYacXaW^Tc&a;b:a-c/#b&aja1(!cL+!bKbt!bmcRc9aIc?8[yW3Dtt94Rg`Jv}!&SiRMzBhEebShEMNuPRe>x7gL#TzuwjirRipc<Z&>on;>z=h-MSh.Mwqczx'a7vj&!>Re4@=ResJt__NuPRi*NuPRi)j]uNr|~FRfzKrJ>_+@Wfy@Wf]2WocKrJ<!+'@Wg%g/QRl@@Jv`!&awRl<wsfFIzgLu(w*!.*&ShBMwvhIRhI9;RhNx1hK'!#Sn]Mx1hK~0!#:2<H~7cNu+w7D*'1ZtW>Rn1~?rOc:Z&Rn2=<rQ<7wjh&=BSnLMc]#X(6Vz)w[b=a!U#9wzgMc3#&(RgMRitRis<x,gKt`ax!&+SioM=BSilMc3#&(RgKRinRimKurB,!&SiQMzBhDebShDM6BJQ!(P~Efx978B2@@=I}WLrJw!!,a*&@G}O@9wkibRid@@x'fKwC!&SlDMSfLMjUv~Q~EfKKv3@a+!(hFv-]mpx/hYZ(C5RiWz<o/MwkhY?So/M@x,gbvfB*&!SgEM:SoeeehFu3:Rgbda(,^TZa)X/7Sg[eb:2RgI~BrMC@wgkc:wwkcRerx3h(uUvK!&*,SnOM4Sh*MArRg;wHRh(x=h;rJvPwI!a4',a'0@Wg&=BSh/Mg>w=Rh=g3w*wwgGRgGcW(X#;Sg}M2Gzk@Jv`!&awRl=wsfGIz`dKZ*T'Y-:RhR7RhQg5u-p`j6v(us5d,#Y+~Awkia?RicOuNBwkibba}Ld6p~tyu_vbAa'a+!a/'a3aEa8a!>Sh,ebJv{!&Sh@ebSaReb9;SgwebNuPRi(NvdRl)NuPRi'hHu^<Rm^Jvv_@Wl(g;u1Si/ebKu'B&!*Sh?eb@Wl'z@aPeb95Si.ebcpputyvjB)!,&a+0a%ShAMWeK@G}C@WfJ9;RhMwvhH9w{ia}ix,hJvRA1(!zAn[MRhHx1hJ~*!#hFv(BSn[MBJQ!(@@=I~'978B2@@=I}2db.Ua<'X}+T#a0XaG2G}E;wkg|wuh!Rh!x,hZu,@)!&So0MVy)C5RiXACJvB!&5RiY5RiZg8w)cG}*T#2@bU}=KsA>(!a.3wkhZba~(x,h^u(A!&(SoCMRhb5Bz=h[eb?w~hb~6x,h_u(A!&(SoDMRhc5Bz=h]eb?w~hc~6e)aA1T#T,^^^c-bMb&blcPaP(a/!0!bA=b5c@a(!bfbrc#2afwmhARnjwchORnp2Wlf3DtsNvdRl-2@wpa<]m0bx(#:awRk2@Jw3!%RfhwpfgRlnKQB%!(G{V@G|'NuuRl6d='T+Y#VyUg<v~Rl~==G|<Jv+'!aYShC}6@B<5?ba~8@Jw3'!g2QRljhLrpWlOd+#Y'g.w'rIg>w*wgj@g-u0Rj@Lu+wT&)ZtUauq]~GrGci&U#F|39:rELrNvj!.%*RhCwunfw~nf~:9;Ri]>wtnhg;wHRnhx3hDs@v~!/+'@Wfr@9RkSNu&Rlo=@<5GzoKs0@_+@Wl+@awRkmJuh!-3d(}pY#qWJvj!%Rm(:Jw3!%Rm,Rm*de&!1U-U#`)Re;@G|.@9Ri82@wjfvRlq=@<5GzpLvOvr!).&2RlF8Rf`C=x!eE{.Jw3_g2QRlkhLrpWlPde(!#U{s,UXa*Ta'[y'g:v>ReS;x0PZ&RnlRnn~HrKJw1}f!=x!eB|2w]aP(#Xa&a*Ta.Ua2a7=]iOd'#Y&Ro&WnWg;u.RiDg6vjRiBNvdRlzhNvj]nYJuW_2Wm3x)kFze{9d])!a.!,Y01!#&aC!a3RndC=ox~BrC@2b^{pg,rlse7x'ksuq!%Rm.E{xidw(wBRmGx9o+)X#wwo-So-}69:Rl4@xSf@a#XZ'X)X,Ta(/ARl8b[xc>RfY:RlI:RfQwlg.ARl:9;Rlwdn'#^XafaQa1X1TaHTa)@b[{zcZ#X'7RkwWg@Ou4ARn&x)kG#{,g7u/RkGdH'U#Y*Vz'Wm&CARm|bx#(A]gUbUzJj9Q~=d,#Y(56H}l978H{U7d,0#U*2>ABb_xZ978BbU{e~AJQ{g!978BbU{hxMh?ad{oUYZ.x1h?{l!#:2<H{mx3n[t{vl!,&a%3Ro(z=iS}6ARnr=Bwsn^wvn`Rnbd`*T}B0!#^X'BG{c9b]{a>>@=be}F?JvS!&BG{d7BG}(Bde#`a1X,Ya@!a'P~=wxf@2bZ}I56B2@@=aybb}08@55B9;5bb}<j3vLv;<Jw3&!>Rfg=ayb^}&OuNBKuLA!)a!P~=x#fD{f2@>==<bbzl?C972@@=Ix^d6rSu,v7w*C(0a)a6#B+a%!sQ[y?3Dt%3[xn~<5rLOu!5p@Ku+D#'!t7~GrP~?rNKvlaya7'!h+v-5qMg=t|cd,U#5AAaa5Abb{S@52B5@a[@52B5Gx[iXueu;d<#`a(!/549C;ag>23ExY5@Dah89b^~689Jv)!~2b[~1Lv'w(%*!a#bX|aPrmawRe]keu7uhv-q6rxu,q`xTo]/a5aU!bNaDXbi!b-!ao!b<bwA!#5@B932:aV2G|:d-)Y#hJrL>RhG<7@C5<H|_=Cau:5aj5@B932:bJ|ng>vIbs)#?C2F|9jPv0w.vISh-MKvUaz(.!9ABbb|[5;5<H|Eg>unwfh;9:4E|YjQsBt|vjx'hYq3!(?C2F|J:2<BaY?C2F|GOu!5x,g|p{ah!-(?C2F|c9:4E|OjXuvvNr}:Rh&i[w*t|cd+U#jJvsu)vsSn~Mkfrmu9p}u7vwv]So!McW#Xa!ax5@A5aY:5;5<H|>kJv~vYrquJu3x4ib#T)2@SmZM?C2F|Bj:rmu9@xPhI(a*a#U#`a3-5Abb|L~@:RhK9:4E|0@52B5G|#C::aY?C2F|-:2<BaY?C2F|.5Jvk!a)javYrquJu3x4ia#T)2@SmYM?C2F|HAxPhH(!a#U#`a*-5Abb|4~@:RhJ9:4E|R@52B5G|F:2<BaY?C2F|Sc^#Xa2j=Qq5CJvB!-g<v{z;hhM?C2F|Zi[vrv{z;hiM?C2F|XKsA>!a)-g<v{z;h[eb?C2F|]i[vrv{z;h]eb?C2F|^iZu.vix,hZq3ah!.(?C2F|QOu!5ShXM:2<BaY?C2F|P", 13494, 2713, 49, 25, 61);

// node_modules/entities/dist/generated/decode-data-xml.js
var xmlDecodeTree = /* @__PURE__ */ new Uint16Array([
  512,
  26465,
  29036,
  7,
  0,
  2,
  4,
  116,
  24638,
  116,
  24636,
  8693,
  29807,
  24610,
  621,
  1,
  0,
  0,
  3,
  112,
  24614,
  111,
  115,
  24615
]);

// node_modules/entities/dist/internal/bin-trie-flags.js
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["FLAG13"] = 8192] = "FLAG13";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
  BinTrieFlags2[BinTrieFlags2["VALUE_MASK"] = 8191] = "VALUE_MASK";
})(BinTrieFlags || (BinTrieFlags = {}));

// node_modules/entities/dist/decode.js
var CharCodes;
(function(CharCodes3) {
  CharCodes3[CharCodes3["AMP"] = 38] = "AMP";
  CharCodes3[CharCodes3["NUM"] = 35] = "NUM";
  CharCodes3[CharCodes3["SEMI"] = 59] = "SEMI";
  CharCodes3[CharCodes3["EQUALS"] = 61] = "EQUALS";
  CharCodes3[CharCodes3["ZERO"] = 48] = "ZERO";
  CharCodes3[CharCodes3["NINE"] = 57] = "NINE";
  CharCodes3[CharCodes3["LOWER_A"] = 97] = "LOWER_A";
  CharCodes3[CharCodes3["LOWER_X"] = 120] = "LOWER_X";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
function isNumber(code) {
  return code - CharCodes.ZERO >>> 0 <= 9;
}
__name(isNumber, "isNumber");
function isHexadecimalCharacter(code) {
  return (code | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 5;
}
__name(isHexadecimalCharacter, "isHexadecimalCharacter");
function isAlpha(code) {
  return (code | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 25;
}
__name(isAlpha, "isAlpha");
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAlpha(code) || isNumber(code);
}
__name(isEntityInAttributeInvalidEnd, "isEntityInAttributeInvalidEnd");
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
var EntityDecoder = class {
  static {
    __name(this, "EntityDecoder");
  }
  decodeTree;
  emitCodePoint;
  errors;
  /** The current state of the decoder. */
  state = EntityDecoderState.EntityStart;
  /** Characters that were consumed while parsing an entity. */
  consumed = 1;
  /**
   * The result of the entity.
   *
   * For named entities: the trie index of the best legacy match so far
   * (0 = none). For numeric entities: the accumulated code point.
   */
  result = 0;
  /** The current index in the decode tree. */
  treeIndex = 0;
  /**
   * Characters consumed since the last recorded legacy match, plus one.
   * Invariant at the top of the `stateNamedEntity` loop: `excess` equals
   * the number of unrecorded consumed characters + 1.
   */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: False positive (read via destructuring)
  excess = 1;
  /** The mode in which the decoder is operating. */
  decodeMode = DecodingMode.Strict;
  /** The number of characters that have been consumed in the current run. */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: False positive
  runConsumed = 0;
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
  }
  /**
   * Resets the instance to make it reusable.
   * @param decodeMode Entity decoding mode to use.
   */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
    this.runConsumed = 0;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the non-streaming `decodeWithTrie`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(input, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (input.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(input, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(input, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(input, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(input, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(input, offset);
      }
      default: {
        return this.stateNamedEntity(input, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  // eslint-disable-next-line unicorn/consistent-class-member-order
  stateNumericStart(input, offset) {
    if (offset >= input.length) {
      return -1;
    }
    if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(input, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(input, offset);
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML
   * spec. Digit parsing matches the hex loop in `parseNumericEntity`.
   * The accumulated value is preserved for numeric validation callbacks.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(input, offset) {
    const inputLength = input.length;
    let { result } = this;
    let { consumed } = this;
    while (offset < inputLength) {
      const char = input.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        const digit = char <= CharCodes.NINE ? char - CharCodes.ZERO : (char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10;
        result = result * 16 + digit;
        consumed += 1;
        offset += 1;
      } else {
        this.result = result;
        this.consumed = consumed;
        return this.emitNumericEntity(char, 3);
      }
    }
    this.result = result;
    this.consumed = consumed;
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML
   * spec. Digit parsing matches the decimal loop in `parseNumericEntity`.
   * The accumulated value is preserved for numeric validation callbacks.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(input, offset) {
    const inputLength = input.length;
    let { result } = this;
    let { consumed } = this;
    while (offset < inputLength) {
      const digit = input.charCodeAt(offset) - CharCodes.ZERO;
      if (digit >>> 0 > 9) {
        this.result = result;
        this.consumed = consumed;
        return this.emitNumericEntity(digit + CharCodes.ZERO, 2);
      }
      result = result * 10 + digit;
      consumed += 1;
      offset += 1;
    }
    this.result = result;
    this.consumed = consumed;
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    if (this.consumed <= expectedLength) {
      this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint((this.decodeTree === xmlDecodeTree ? replaceCodePointXML : replaceCodePoint)(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Flush locally-tracked walk state back to the fields, then emit the
   * recorded legacy match or reject (cold path — at most once per
   * entity). Called after failed navigation (leaf node, branch miss, or
   * compact-run mismatch). In attribute mode, reject if no legacy was
   * recorded at the current node, if we descended past it, or if the
   * pending input character is an invalid attribute terminator.
   * @param consumed Locally-tracked consumed count.
   * @param excess Locally-tracked excess count.
   * @param char Pending input character (may be the mismatching char).
   * @param valueLength Value length at the current trie node.
   */
  flushAndEmitLegacyOrReject(consumed, excess, char, valueLength) {
    this.consumed = consumed;
    this.excess = excess;
    return this.result === 0 || this.decodeMode === DecodingMode.Attribute && (valueLength === 0 || excess > 1 || isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(input, offset) {
    const { decodeTree } = this;
    const inputLength = input.length;
    const isStrict = this.decodeMode === DecodingMode.Strict;
    let { treeIndex } = this;
    let { excess } = this;
    let { consumed } = this;
    let current = decodeTree[treeIndex];
    while (offset < inputLength) {
      while ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === 0 && (current & BinTrieFlags.JUMP_TABLE) !== 0) {
        const char2 = input.charCodeAt(offset);
        const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
        const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
        if (branchCount === 0) {
          if (char2 !== jumpOffset) {
            return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
          }
          treeIndex += 1;
        } else {
          const slot = char2 - jumpOffset;
          if (slot >>> 0 >= branchCount) {
            return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
          }
          const stored = decodeTree[treeIndex + 1 + slot];
          if (stored === 0) {
            return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
          }
          treeIndex = treeIndex + branchCount + stored & 65535;
        }
        current = decodeTree[treeIndex];
        offset += 1;
        excess += 1;
        if (offset >= inputLength)
          break;
      }
      if (offset >= inputLength)
        break;
      if ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === BinTrieFlags.FLAG13) {
        const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
        let { runConsumed } = this;
        if (runConsumed === 0) {
          const char2 = input.charCodeAt(offset);
          if (char2 !== (current & BinTrieFlags.JUMP_TABLE)) {
            return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
          }
          offset += 1;
          excess += 1;
          runConsumed = 1;
        }
        while (runConsumed < runLength) {
          if (offset >= inputLength) {
            this.treeIndex = treeIndex;
            this.excess = excess;
            this.consumed = consumed;
            this.runConsumed = runConsumed;
            return -1;
          }
          const charIndexInPacked = runConsumed - 1;
          const packedWord = decodeTree[treeIndex + 1 + (charIndexInPacked >> 1)];
          const expectedChar = packedWord >> ((charIndexInPacked & 1) << 3) & 255;
          const char2 = input.charCodeAt(offset);
          if (char2 !== expectedChar) {
            this.runConsumed = 0;
            return this.flushAndEmitLegacyOrReject(consumed, excess, char2, 0);
          }
          offset += 1;
          excess += 1;
          runConsumed += 1;
        }
        this.runConsumed = 0;
        treeIndex += 1 + (runLength >> 1);
        current = decodeTree[treeIndex];
        continue;
      }
      const valueLength = current >>> 14;
      const char = input.charCodeAt(offset);
      if (valueLength !== 0) {
        if (!isStrict && (current & BinTrieFlags.FLAG13) === 0) {
          this.result = treeIndex;
          consumed += excess - 1;
          excess = 1;
        }
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(treeIndex, valueLength, consumed + excess);
        }
        if (valueLength === 1) {
          return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
        }
      }
      const next = determineBranch(decodeTree, current, treeIndex + (valueLength || 1), char);
      if (next < 0) {
        return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
      }
      treeIndex = next;
      current = decodeTree[treeIndex];
      offset += 1;
      excess += 1;
    }
    if (!isStrict && current >>> 14 !== 0 && (current & BinTrieFlags.FLAG13) === 0) {
      this.result = treeIndex;
      consumed += excess - 1;
      excess = 1;
    }
    this.treeIndex = treeIndex;
    this.excess = excess;
    this.consumed = consumed;
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    const { result, decodeTree } = this;
    const valueLength = decodeTree[result] >>> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    this.errors?.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   * @param result The index of the entity in the decode tree.
   * @param valueLength Encoded value length (header plus any value words).
   * @param consumed The number of characters consumed.
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & BinTrieFlags.VALUE_MASK : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   * @returns The number of characters consumed.
   */
  end() {
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      default: {
        return 0;
      }
    }
  }
};
function determineBranch(decodeTree, current, nodeIndex, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (jumpOffset) {
    if (branchCount === 0) {
      return char === jumpOffset ? nodeIndex : -1;
    }
    const slot = char - jumpOffset;
    if (slot >>> 0 >= branchCount)
      return -1;
    const stored = decodeTree[nodeIndex + slot];
    return stored === 0 ? -1 : nodeIndex + branchCount + stored - 1 & 65535;
  }
  if (branchCount === 0)
    return -1;
  const packedKeySlots = branchCount + 1 >> 1;
  const branchEnd = nodeIndex + packedKeySlots + branchCount;
  for (let index = 0; index < branchCount; index++) {
    const packed = decodeTree[nodeIndex + (index >> 1)];
    const key = packed >> ((index & 1) << 3) & 255;
    if (key === char) {
      const pointerIndex = nodeIndex + packedKeySlots + index;
      return branchEnd + decodeTree[pointerIndex] & 65535;
    }
    if (key > char)
      return -1;
  }
  return -1;
}
__name(determineBranch, "determineBranch");

// node_modules/htmlparser2/dist/Tokenizer.js
var CharCodes2;
(function(CharCodes3) {
  CharCodes3[CharCodes3["Tab"] = 9] = "Tab";
  CharCodes3[CharCodes3["NewLine"] = 10] = "NewLine";
  CharCodes3[CharCodes3["FormFeed"] = 12] = "FormFeed";
  CharCodes3[CharCodes3["CarriageReturn"] = 13] = "CarriageReturn";
  CharCodes3[CharCodes3["Space"] = 32] = "Space";
  CharCodes3[CharCodes3["ExclamationMark"] = 33] = "ExclamationMark";
  CharCodes3[CharCodes3["Number"] = 35] = "Number";
  CharCodes3[CharCodes3["Amp"] = 38] = "Amp";
  CharCodes3[CharCodes3["SingleQuote"] = 39] = "SingleQuote";
  CharCodes3[CharCodes3["DoubleQuote"] = 34] = "DoubleQuote";
  CharCodes3[CharCodes3["Dash"] = 45] = "Dash";
  CharCodes3[CharCodes3["Slash"] = 47] = "Slash";
  CharCodes3[CharCodes3["Zero"] = 48] = "Zero";
  CharCodes3[CharCodes3["Nine"] = 57] = "Nine";
  CharCodes3[CharCodes3["Semi"] = 59] = "Semi";
  CharCodes3[CharCodes3["Lt"] = 60] = "Lt";
  CharCodes3[CharCodes3["Eq"] = 61] = "Eq";
  CharCodes3[CharCodes3["Gt"] = 62] = "Gt";
  CharCodes3[CharCodes3["Questionmark"] = 63] = "Questionmark";
  CharCodes3[CharCodes3["UpperA"] = 65] = "UpperA";
  CharCodes3[CharCodes3["LowerA"] = 97] = "LowerA";
  CharCodes3[CharCodes3["UpperF"] = 70] = "UpperF";
  CharCodes3[CharCodes3["LowerF"] = 102] = "LowerF";
  CharCodes3[CharCodes3["UpperZ"] = 90] = "UpperZ";
  CharCodes3[CharCodes3["LowerZ"] = 122] = "LowerZ";
  CharCodes3[CharCodes3["LowerX"] = 120] = "LowerX";
  CharCodes3[CharCodes3["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes2 || (CharCodes2 = {}));
var State;
(function(State2) {
  State2[State2["Text"] = 1] = "Text";
  State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
  State2[State2["InTagName"] = 3] = "InTagName";
  State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
  State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
  State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
  State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
  State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
  State2[State2["InAttributeName"] = 9] = "InAttributeName";
  State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
  State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
  State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
  State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
  State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
  State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
  State2[State2["InDeclaration"] = 16] = "InDeclaration";
  State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
  State2[State2["BeforeComment"] = 18] = "BeforeComment";
  State2[State2["CDATASequence"] = 19] = "CDATASequence";
  State2[State2["DeclarationSequence"] = 20] = "DeclarationSequence";
  State2[State2["InSpecialComment"] = 21] = "InSpecialComment";
  State2[State2["InCommentLike"] = 22] = "InCommentLike";
  State2[State2["SpecialStartSequence"] = 23] = "SpecialStartSequence";
  State2[State2["InSpecialTag"] = 24] = "InSpecialTag";
  State2[State2["InPlainText"] = 25] = "InPlainText";
  State2[State2["InEntity"] = 26] = "InEntity";
})(State || (State = {}));
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
__name(isWhitespace, "isWhitespace");
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
__name(isEndOfTagSection, "isEndOfTagSection");
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
__name(isASCIIAlpha, "isASCIIAlpha");
var QuoteType;
(function(QuoteType2) {
  QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
  QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
  QuoteType2[QuoteType2["Single"] = 2] = "Single";
  QuoteType2[QuoteType2["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
var Sequences = {
  Empty: new Uint8Array(0),
  Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
  // CDATA[
  CdataEnd: new Uint8Array([93, 93, 62]),
  // ]]>
  CommentEnd: new Uint8Array([45, 45, 33, 62]),
  // `--!>`
  Doctype: new Uint8Array([100, 111, 99, 116, 121, 112, 101]),
  // `doctype`
  IframeEnd: new Uint8Array([60, 47, 105, 102, 114, 97, 109, 101]),
  // `</iframe`
  NoembedEnd: new Uint8Array([
    60,
    47,
    110,
    111,
    101,
    109,
    98,
    101,
    100
  ]),
  // `</noembed`
  NoframesEnd: new Uint8Array([
    60,
    47,
    110,
    111,
    102,
    114,
    97,
    109,
    101,
    115
  ]),
  // `</noframes`
  Plaintext: new Uint8Array([
    60,
    47,
    112,
    108,
    97,
    105,
    110,
    116,
    101,
    120,
    116
  ]),
  // `</plaintext`
  ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
  // `<\/script`
  StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
  // `</style`
  TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101]),
  // `</title`
  TextareaEnd: new Uint8Array([
    60,
    47,
    116,
    101,
    120,
    116,
    97,
    114,
    101,
    97
  ]),
  // `</textarea`
  XmpEnd: new Uint8Array([60, 47, 120, 109, 112])
  // `</xmp`
};
var specialStartSequences = /* @__PURE__ */ new Map([
  [Sequences.IframeEnd[2], Sequences.IframeEnd],
  [Sequences.NoembedEnd[2], Sequences.NoembedEnd],
  [Sequences.Plaintext[2], Sequences.Plaintext],
  [Sequences.ScriptEnd[2], Sequences.ScriptEnd],
  [Sequences.TitleEnd[2], Sequences.TitleEnd],
  [Sequences.XmpEnd[2], Sequences.XmpEnd]
]);
var Tokenizer = class {
  static {
    __name(this, "Tokenizer");
  }
  cbs;
  /** The current state the tokenizer is in. */
  state = State.Text;
  /** The read buffer. */
  buffer = "";
  /** The beginning of the section that is currently being read. */
  sectionStart = 0;
  /** The index within the buffer that we are currently looking at. */
  index = 0;
  /** The start of the last entity. */
  entityStart = 0;
  /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
  baseState = State.Text;
  /** For special parsing behavior inside of script and style tags. */
  isSpecial = false;
  /** Indicates whether the tokenizer has been paused. */
  running = true;
  /** The offset of the current buffer. */
  offset = 0;
  xmlMode;
  decodeEntities;
  recognizeSelfClosing;
  entityDecoder;
  constructor({ xmlMode = false, decodeEntities = true, recognizeSelfClosing = xmlMode }, cbs) {
    this.cbs = cbs;
    this.xmlMode = xmlMode;
    this.decodeEntities = decodeEntities;
    this.recognizeSelfClosing = recognizeSelfClosing;
    this.entityDecoder = new EntityDecoder(xmlMode ? xmlDecodeTree : htmlDecodeTree, (cp, consumed) => this.emitCodePoint(cp, consumed));
  }
  reset() {
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.isSpecial = false;
    this.currentSequence = Sequences.Empty;
    this.sequenceIndex = 0;
    this.running = true;
    this.offset = 0;
  }
  write(chunk) {
    this.offset += this.buffer.length;
    this.buffer = chunk;
    this.parse();
  }
  end() {
    if (this.running)
      this.finish();
  }
  pause() {
    this.running = false;
  }
  resume() {
    this.running = true;
    if (this.index < this.buffer.length + this.offset) {
      this.parse();
    }
  }
  stateText(c) {
    if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      this.state = State.BeforeTagName;
      this.sectionStart = this.index;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  currentSequence = Sequences.Empty;
  sequenceIndex = 0;
  enterTagBody() {
    if (this.currentSequence === Sequences.Plaintext) {
      this.currentSequence = Sequences.Empty;
      this.state = State.InPlainText;
    } else if (this.isSpecial) {
      this.state = State.InSpecialTag;
      this.sequenceIndex = 0;
    } else {
      this.state = State.Text;
    }
  }
  /**
   * Match the opening tag name against an HTML text-only tag sequence.
   *
   * Some tags share an initial prefix (`script`/`style`, `title`/`textarea`,
   * `noembed`/`noframes`), so we may switch to an alternate sequence at the
   * first distinguishing byte.  On a successful full match we fall back to
   * the normal tag-name state; a later `>` will enter raw-text, RCDATA, or
   * plaintext mode based on `currentSequence` / `isSpecial`.
   * @param c Current character code point.
   */
  stateSpecialStartSequence(c) {
    const lower = c | 32;
    if (this.sequenceIndex < this.currentSequence.length) {
      if (lower === this.currentSequence[this.sequenceIndex]) {
        this.sequenceIndex++;
        return;
      }
      if (this.sequenceIndex === 3) {
        if (this.currentSequence === Sequences.ScriptEnd && lower === Sequences.StyleEnd[3]) {
          this.currentSequence = Sequences.StyleEnd;
          this.sequenceIndex = 4;
          return;
        }
        if (this.currentSequence === Sequences.TitleEnd && lower === Sequences.TextareaEnd[3]) {
          this.currentSequence = Sequences.TextareaEnd;
          this.sequenceIndex = 4;
          return;
        }
      } else if (this.sequenceIndex === 4 && this.currentSequence === Sequences.NoembedEnd && lower === Sequences.NoframesEnd[4]) {
        this.currentSequence = Sequences.NoframesEnd;
        this.sequenceIndex = 5;
        return;
      }
    } else if (isEndOfTagSection(c)) {
      this.sequenceIndex = 0;
      this.state = State.InTagName;
      this.stateInTagName(c);
      return;
    }
    this.isSpecial = false;
    this.currentSequence = Sequences.Empty;
    this.sequenceIndex = 0;
    this.state = State.InTagName;
    this.stateInTagName(c);
  }
  stateCDATASequence(c) {
    if (c === Sequences.Cdata[this.sequenceIndex]) {
      if (++this.sequenceIndex === Sequences.Cdata.length) {
        this.state = State.InCommentLike;
        this.currentSequence = Sequences.CdataEnd;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      }
    } else {
      this.sequenceIndex = 0;
      if (this.xmlMode) {
        this.state = State.InDeclaration;
        this.stateInDeclaration(c);
      } else {
        this.state = State.InSpecialComment;
        this.stateInSpecialComment(c);
      }
    }
  }
  /**
   * When we wait for one specific character, we can speed things up
   * by skipping through the buffer until we find it.
   * @param c Current character code point.
   * @returns Whether the character was found.
   */
  fastForwardTo(c) {
    while (++this.index < this.buffer.length + this.offset) {
      if (this.buffer.charCodeAt(this.index - this.offset) === c) {
        return true;
      }
    }
    this.index = this.buffer.length + this.offset - 1;
    return false;
  }
  /**
   * Emit a comment token and return to the text state.
   * @param offset Number of characters in the end sequence that have already been matched.
   */
  emitComment(offset) {
    this.cbs.oncomment(this.sectionStart, this.index, offset);
    this.sequenceIndex = 0;
    this.sectionStart = this.index + 1;
    this.state = State.Text;
  }
  /**
   * Comments and CDATA end with `-->` and `]]>`.
   *
   * Their common qualities are:
   * - Their end sequences have a distinct character they start with.
   * - That character is then repeated, so we have to check multiple repeats.
   * - All characters but the start character of the sequence can be skipped.
   * @param c Current character code point.
   */
  stateInCommentLike(c) {
    if (!this.xmlMode && this.currentSequence === Sequences.CommentEnd && this.sequenceIndex <= 1 && /*
     * We're still at the very start of the comment: the only
     * characters consumed since `<!--` are the dashes that
     * advanced sequenceIndex (0 for `<!-->`, 1 for `<!--->`).
     */
    this.index === this.sectionStart + this.sequenceIndex && c === CharCodes2.Gt) {
      this.emitComment(this.sequenceIndex);
    } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === 2 && c === CharCodes2.Gt) {
      this.emitComment(2);
    } else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === this.currentSequence.length - 1 && c !== CharCodes2.Gt) {
      this.sequenceIndex = Number(c === CharCodes2.Dash);
    } else if (c === this.currentSequence[this.sequenceIndex]) {
      if (++this.sequenceIndex === this.currentSequence.length) {
        if (this.currentSequence === Sequences.CdataEnd) {
          this.cbs.oncdata(this.sectionStart, this.index, 2);
        } else {
          this.cbs.oncomment(this.sectionStart, this.index, 3);
        }
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
    } else if (this.sequenceIndex === 0) {
      if (this.fastForwardTo(this.currentSequence[0])) {
        this.sequenceIndex = 1;
      }
    } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      this.sequenceIndex = 0;
    }
  }
  /**
   * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
   *
   * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
   * We allow anything that wouldn't end the tag.
   * @param c Current character code point.
   */
  isTagStartChar(c) {
    return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
  }
  /**
   * Scan raw-text / RCDATA content for the matching end tag.
   *
   * For RCDATA tags (`<title>`, `<textarea>`) entities are decoded inline.
   * For raw-text tags (`<script>`, `<style>`, etc.) we fast-forward to `<`.
   * @param c Current character code point.
   */
  stateInSpecialTag(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      if (isEndOfTagSection(c)) {
        const endOfText = this.index - this.currentSequence.length;
        if (this.sectionStart < endOfText) {
          const actualIndex = this.index;
          this.index = endOfText;
          this.cbs.ontext(this.sectionStart, endOfText);
          this.index = actualIndex;
        }
        this.isSpecial = false;
        this.sectionStart = endOfText + 2;
        this.stateInClosingTagName(c);
        return;
      }
      this.sequenceIndex = 0;
    }
    if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (this.sequenceIndex === 0) {
      if (this.currentSequence === Sequences.TitleEnd || this.currentSequence === Sequences.TextareaEnd) {
        if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      } else if (this.fastForwardTo(CharCodes2.Lt)) {
        this.sequenceIndex = 1;
      }
    } else {
      this.sequenceIndex = Number(c === CharCodes2.Lt);
    }
  }
  stateBeforeTagName(c) {
    if (c === CharCodes2.ExclamationMark) {
      this.state = State.BeforeDeclaration;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Questionmark) {
      if (this.xmlMode) {
        this.state = State.InProcessingInstruction;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      } else {
        this.state = State.InSpecialComment;
        this.sectionStart = this.index;
      }
    } else if (this.isTagStartChar(c)) {
      this.sectionStart = this.index;
      const special = this.xmlMode || this.cbs.isInForeignContext?.() ? void 0 : specialStartSequences.get(c | 32);
      if (special === void 0) {
        this.state = State.InTagName;
      } else {
        this.isSpecial = true;
        this.currentSequence = special;
        this.sequenceIndex = 3;
        this.state = State.SpecialStartSequence;
      }
    } else if (c === CharCodes2.Slash) {
      this.state = State.BeforeClosingTagName;
    } else {
      this.state = State.Text;
      this.stateText(c);
    }
  }
  stateInTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onopentagname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateBeforeClosingTagName(c) {
    if (isWhitespace(c)) {
      if (this.xmlMode) {
      } else {
        this.state = State.InSpecialComment;
        this.sectionStart = this.index;
      }
    } else if (c === CharCodes2.Gt) {
      this.state = State.Text;
      if (!this.xmlMode) {
        this.sectionStart = this.index + 1;
      }
    } else {
      this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
      this.sectionStart = this.index;
    }
  }
  stateInClosingTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterClosingTagName;
      this.stateAfterClosingTagName(c);
    }
  }
  stateAfterClosingTagName(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeAttributeName(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onopentagend(this.index);
      this.enterTagBody();
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Slash) {
      this.state = State.InSelfClosingTag;
    } else if (!isWhitespace(c)) {
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  /**
   * Handle `/` before `>` in an opening tag.
   *
   * In HTML mode, text-only tags ignore the self-closing flag and still enter
   * their raw-text/RCDATA/plaintext state unless self-closing tags are being
   * recognized. In XML mode, or for ordinary tags, the tokenizer returns to
   * regular text parsing after emitting the self-closing callback.
   * @param c Current character code point.
   */
  stateInSelfClosingTag(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onselfclosingtag(this.index);
      this.sectionStart = this.index + 1;
      if (!this.recognizeSelfClosing) {
        this.enterTagBody();
        return;
      }
      this.state = State.Text;
      this.isSpecial = false;
      this.currentSequence = Sequences.Empty;
    } else if (!isWhitespace(c)) {
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateInAttributeName(c) {
    if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
      this.cbs.onattribname(this.sectionStart, this.index);
      this.sectionStart = this.index;
      this.state = State.AfterAttributeName;
      this.stateAfterAttributeName(c);
    }
  }
  stateAfterAttributeName(c) {
    if (c === CharCodes2.Eq) {
      this.state = State.BeforeAttributeValue;
    } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (!isWhitespace(c)) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateBeforeAttributeValue(c) {
    if (c === CharCodes2.DoubleQuote) {
      this.state = State.InAttributeValueDq;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.SingleQuote) {
      this.state = State.InAttributeValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(c)) {
      this.sectionStart = this.index;
      this.state = State.InAttributeValueNq;
      this.stateInAttributeValueNoQuotes(c);
    }
  }
  handleInAttributeValue(c, quote) {
    if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index + 1);
      this.state = State.BeforeAttributeName;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  stateInAttributeValueDoubleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
  }
  stateInAttributeValueSingleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.SingleQuote);
  }
  stateInAttributeValueNoQuotes(c) {
    if (isWhitespace(c) || c === CharCodes2.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(QuoteType.Unquoted, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  /**
   * Distinguish between CDATA, declarations, HTML comments, and HTML bogus
   * comments after `<!`.
   *
   * In HTML mode, only real comments and doctypes stay on declaration paths;
   * everything else becomes a bogus comment terminated by the next `>`.
   * @param c Current character code point.
   */
  stateBeforeDeclaration(c) {
    if (c === CharCodes2.OpeningSquareBracket) {
      this.state = State.CDATASequence;
      this.sequenceIndex = 0;
    } else if (this.xmlMode) {
      this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
    } else if ((c | 32) === Sequences.Doctype[0]) {
      this.state = State.DeclarationSequence;
      this.currentSequence = Sequences.Doctype;
      this.sequenceIndex = 1;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Dash) {
      this.state = State.BeforeComment;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  /**
   * Continue matching `doctype` after `<!d`.
   *
   * A full `doctype` match stays on the declaration path; any other name falls
   * back to an HTML bogus comment, which matches browser behavior for
   * non-doctype `<!...>` constructs.
   * @param c Current character code point.
   */
  stateDeclarationSequence(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      this.state = State.InDeclaration;
      this.stateInDeclaration(c);
    } else if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  stateInDeclaration(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.ondeclaration(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  /**
   * XML processing instructions (`<?...?>`).
   *
   * In HTML mode `<?` is routed to `InSpecialComment` instead, so this
   * state is only reachable in XML mode.
   * @param c Current character code point.
   */
  stateInProcessingInstruction(c) {
    if (c === CharCodes2.Questionmark) {
      this.sequenceIndex = 1;
    } else if (c === CharCodes2.Gt && this.sequenceIndex === 1) {
      this.cbs.onprocessinginstruction(this.sectionStart, this.index - 1);
      this.sequenceIndex = 0;
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.sequenceIndex = Number(this.fastForwardTo(CharCodes2.Questionmark));
    }
  }
  stateBeforeComment(c) {
    if (c === CharCodes2.Dash) {
      this.state = State.InCommentLike;
      this.currentSequence = Sequences.CommentEnd;
      this.sequenceIndex = 0;
      this.sectionStart = this.index + 1;
    } else if (this.xmlMode) {
      this.state = State.InDeclaration;
    } else if (c === CharCodes2.Gt) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InSpecialComment;
    }
  }
  stateInSpecialComment(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  startEntity() {
    this.baseState = this.state;
    this.state = State.InEntity;
    this.entityStart = this.index;
    this.entityDecoder.startEntity(this.xmlMode ? DecodingMode.Strict : this.baseState === State.Text || this.baseState === State.InSpecialTag ? DecodingMode.Legacy : DecodingMode.Attribute);
  }
  stateInEntity() {
    const indexInBuffer = this.index - this.offset;
    const length = this.entityDecoder.write(this.buffer, indexInBuffer);
    if (length >= 0) {
      this.state = this.baseState;
      if (length === 0) {
        this.index -= 1;
      }
    } else {
      if (indexInBuffer < this.buffer.length && this.buffer.charCodeAt(indexInBuffer) === CharCodes2.Amp) {
        this.state = this.baseState;
        this.index -= 1;
        return;
      }
      this.index = this.offset + this.buffer.length - 1;
    }
  }
  /**
   * Remove data that has already been consumed from the buffer.
   */
  cleanup() {
    if (this.running && this.sectionStart !== this.index) {
      if (this.state === State.Text || this.state === State.InPlainText || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
        this.cbs.onattribdata(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }
  shouldContinue() {
    return this.index < this.buffer.length + this.offset && this.running;
  }
  /**
   * Iterates through the buffer, calling the function corresponding to the current state.
   *
   * States that are more likely to be hit are higher up, as a performance improvement.
   */
  parse() {
    while (this.shouldContinue()) {
      const c = this.buffer.charCodeAt(this.index - this.offset);
      switch (this.state) {
        case State.Text: {
          this.stateText(c);
          break;
        }
        case State.InPlainText: {
          this.index = this.buffer.length + this.offset - 1;
          break;
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c);
          break;
        }
        case State.InSpecialTag: {
          this.stateInSpecialTag(c);
          break;
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c);
          break;
        }
        case State.DeclarationSequence: {
          this.stateDeclarationSequence(c);
          break;
        }
        case State.InAttributeValueDq: {
          this.stateInAttributeValueDoubleQuotes(c);
          break;
        }
        case State.InAttributeName: {
          this.stateInAttributeName(c);
          break;
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c);
          break;
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c);
          break;
        }
        case State.BeforeAttributeName: {
          this.stateBeforeAttributeName(c);
          break;
        }
        case State.InTagName: {
          this.stateInTagName(c);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c);
          break;
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c);
          break;
        }
        case State.AfterAttributeName: {
          this.stateAfterAttributeName(c);
          break;
        }
        case State.InAttributeValueSq: {
          this.stateInAttributeValueSingleQuotes(c);
          break;
        }
        case State.BeforeAttributeValue: {
          this.stateBeforeAttributeValue(c);
          break;
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c);
          break;
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c);
          break;
        }
        case State.InAttributeValueNq: {
          this.stateInAttributeValueNoQuotes(c);
          break;
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c);
          break;
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c);
          break;
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c);
          break;
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c);
          break;
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c);
          break;
        }
        case State.InEntity: {
          this.stateInEntity();
          break;
        }
      }
      this.index++;
    }
    this.cleanup();
  }
  finish() {
    if (this.state === State.InEntity) {
      this.entityDecoder.end();
      this.state = this.baseState;
    }
    this.handleTrailingData();
    this.cbs.onend();
  }
  handleTrailingCommentLikeData(endIndex) {
    if (this.state !== State.InCommentLike) {
      return false;
    }
    if (this.currentSequence === Sequences.CdataEnd) {
      if (this.xmlMode) {
        if (this.sectionStart < endIndex) {
          this.cbs.oncdata(this.sectionStart, endIndex, 0);
        }
      } else {
        const cdataStart = this.sectionStart - Sequences.Cdata.length - 1;
        this.cbs.oncomment(cdataStart, endIndex, 0);
      }
    } else {
      const offset = this.xmlMode ? 0 : Math.min(this.sequenceIndex, Sequences.CommentEnd.length - 1);
      this.cbs.oncomment(this.sectionStart, endIndex, offset);
    }
    return true;
  }
  handleTrailingMarkupDeclaration(endIndex) {
    if (this.xmlMode) {
      switch (this.state) {
        case State.InSpecialComment:
        case State.BeforeComment:
        case State.CDATASequence:
        case State.DeclarationSequence:
        case State.InDeclaration: {
          this.cbs.ontext(this.sectionStart, endIndex);
          return true;
        }
        default: {
          return false;
        }
      }
    }
    switch (this.state) {
      case State.BeforeDeclaration:
      case State.InSpecialComment:
      case State.BeforeComment:
      case State.CDATASequence: {
        this.cbs.oncomment(this.sectionStart, endIndex, 0);
        return true;
      }
      case State.DeclarationSequence: {
        if (this.sequenceIndex !== Sequences.Doctype.length) {
          this.cbs.oncomment(this.sectionStart, endIndex, 0);
        }
        return true;
      }
      case State.InDeclaration: {
        return true;
      }
      default: {
        return false;
      }
    }
  }
  /** Handle any trailing data. */
  handleTrailingData() {
    const endIndex = this.buffer.length + this.offset;
    if (this.handleTrailingCommentLikeData(endIndex) || this.handleTrailingMarkupDeclaration(endIndex)) {
      return;
    }
    if (this.sectionStart >= endIndex) {
      return;
    }
    switch (this.state) {
      case State.InTagName:
      case State.BeforeAttributeName:
      case State.BeforeAttributeValue:
      case State.AfterAttributeName:
      case State.InAttributeName:
      case State.InAttributeValueSq:
      case State.InAttributeValueDq:
      case State.InAttributeValueNq:
      case State.InClosingTagName: {
        break;
      }
      default: {
        this.cbs.ontext(this.sectionStart, endIndex);
      }
    }
  }
  emitCodePoint(cp, consumed) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      if (this.sectionStart < this.entityStart) {
        this.cbs.onattribdata(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.onattribentity(cp);
    } else {
      if (this.sectionStart < this.entityStart) {
        this.cbs.ontext(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.ontextentity(cp, this.sectionStart);
    }
  }
};

// node_modules/htmlparser2/dist/Parser.js
var { fromCodePoint } = String;
var formTags = /* @__PURE__ */ new Set([
  "input",
  "option",
  "optgroup",
  "select",
  "button",
  "datalist",
  "textarea"
]);
var pTag = /* @__PURE__ */ new Set(["p"]);
var headingTags = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);
var tableSectionTags = /* @__PURE__ */ new Set(["thead", "tbody"]);
var ddtTags = /* @__PURE__ */ new Set(["dd", "dt"]);
var rtpTags = /* @__PURE__ */ new Set(["rt", "rp"]);
var openImpliesClose = /* @__PURE__ */ new Map([
  ["tr", /* @__PURE__ */ new Set(["tr", "th", "td"])],
  ["th", /* @__PURE__ */ new Set(["th"])],
  ["td", /* @__PURE__ */ new Set(["thead", "th", "td"])],
  ["body", /* @__PURE__ */ new Set(["head", "link", "script"])],
  ["a", /* @__PURE__ */ new Set(["a"])],
  ["li", /* @__PURE__ */ new Set(["li"])],
  ["p", pTag],
  ["h1", headingTags],
  ["h2", headingTags],
  ["h3", headingTags],
  ["h4", headingTags],
  ["h5", headingTags],
  ["h6", headingTags],
  ["select", formTags],
  ["input", formTags],
  ["output", formTags],
  ["button", formTags],
  ["datalist", formTags],
  ["textarea", formTags],
  ["option", /* @__PURE__ */ new Set(["option"])],
  ["optgroup", /* @__PURE__ */ new Set(["optgroup", "option"])],
  ["dd", ddtTags],
  ["dt", ddtTags],
  ["address", pTag],
  ["article", pTag],
  ["aside", pTag],
  ["blockquote", pTag],
  ["details", pTag],
  ["div", pTag],
  ["dl", pTag],
  ["fieldset", pTag],
  ["figcaption", pTag],
  ["figure", pTag],
  ["footer", pTag],
  ["form", pTag],
  ["header", pTag],
  ["hr", pTag],
  ["main", pTag],
  ["nav", pTag],
  ["ol", pTag],
  ["pre", pTag],
  ["section", pTag],
  ["table", pTag],
  ["ul", pTag],
  ["rt", rtpTags],
  ["rp", rtpTags],
  ["tbody", tableSectionTags],
  ["tfoot", tableSectionTags]
]);
var DOCUMENT_TYPE = "doctype";
var voidElements = /* @__PURE__ */ new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var foreignContextElements = /* @__PURE__ */ new Set(["math", "svg"]);
var htmlIntegrationElements = /* @__PURE__ */ new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignObject",
  "desc",
  "title"
]);
var svgTagNameAdjustments = /* @__PURE__ */ new Map([
  ["altglyph", "altGlyph"],
  ["altglyphdef", "altGlyphDef"],
  ["altglyphitem", "altGlyphItem"],
  ["animatecolor", "animateColor"],
  ["animatemotion", "animateMotion"],
  ["animatetransform", "animateTransform"],
  ["clippath", "clipPath"],
  ["feblend", "feBlend"],
  ["fecolormatrix", "feColorMatrix"],
  ["fecomponenttransfer", "feComponentTransfer"],
  ["fecomposite", "feComposite"],
  ["feconvolvematrix", "feConvolveMatrix"],
  ["fediffuselighting", "feDiffuseLighting"],
  ["fedisplacementmap", "feDisplacementMap"],
  ["fedistantlight", "feDistantLight"],
  ["fedropshadow", "feDropShadow"],
  ["feflood", "feFlood"],
  ["fefunca", "feFuncA"],
  ["fefuncb", "feFuncB"],
  ["fefuncg", "feFuncG"],
  ["fefuncr", "feFuncR"],
  ["fegaussianblur", "feGaussianBlur"],
  ["feimage", "feImage"],
  ["femerge", "feMerge"],
  ["femergenode", "feMergeNode"],
  ["femorphology", "feMorphology"],
  ["feoffset", "feOffset"],
  ["fepointlight", "fePointLight"],
  ["fespecularlighting", "feSpecularLighting"],
  ["fespotlight", "feSpotLight"],
  ["fetile", "feTile"],
  ["feturbulence", "feTurbulence"],
  ["foreignobject", "foreignObject"],
  ["glyphref", "glyphRef"],
  ["lineargradient", "linearGradient"],
  ["radialgradient", "radialGradient"],
  ["textpath", "textPath"]
]);
var ForeignContext;
(function(ForeignContext2) {
  ForeignContext2[ForeignContext2["None"] = 0] = "None";
  ForeignContext2[ForeignContext2["Svg"] = 1] = "Svg";
  ForeignContext2[ForeignContext2["MathML"] = 2] = "MathML";
})(ForeignContext || (ForeignContext = {}));
var reNameEnd = /\s|\//;
var Parser = class {
  static {
    __name(this, "Parser");
  }
  options;
  /** The start index of the last event. */
  startIndex = 0;
  /** The end index of the last event. */
  endIndex = 0;
  /**
   * Store the start index of the current open tag,
   * so we can update the start index for attributes.
   */
  openTagStart = 0;
  tagname = "";
  attribname = "";
  attribvalue = "";
  attribs = null;
  stack = [];
  foreignContext;
  cbs;
  lowerCaseTagNames;
  lowerCaseAttributeNames;
  recognizeSelfClosing;
  /** We are parsing HTML. Inverse of the `xmlMode` option. */
  htmlMode;
  tokenizer;
  buffers = [];
  bufferOffset = 0;
  /** The index of the last written buffer. Used when resuming after a `pause()`. */
  writeIndex = 0;
  /** Indicates whether the parser has finished running / `.end` has been called. */
  ended = false;
  constructor(cbs, options = {}) {
    this.options = options;
    this.cbs = cbs ?? {};
    this.htmlMode = !this.options.xmlMode;
    this.lowerCaseTagNames = options.lowerCaseTags ?? this.htmlMode;
    this.lowerCaseAttributeNames = options.lowerCaseAttributeNames ?? this.htmlMode;
    this.recognizeSelfClosing = options.recognizeSelfClosing ?? !this.htmlMode;
    this.tokenizer = new (options.Tokenizer ?? Tokenizer)(this.options, this);
    this.foreignContext = [ForeignContext.None];
    this.cbs.onparserinit?.(this);
  }
  // Tokenizer event handlers
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ontext(start, endIndex) {
    const data = this.getSlice(start, endIndex);
    this.endIndex = endIndex - 1;
    this.cbs.ontext?.(data);
    this.startIndex = endIndex;
  }
  /**
   * @param cp Current Unicode code point.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ontextentity(cp, endIndex) {
    this.endIndex = endIndex - 1;
    this.cbs.ontext?.(fromCodePoint(cp));
    this.startIndex = endIndex;
  }
  /** @internal */
  isInForeignContext() {
    return this.foreignContext[0] !== ForeignContext.None;
  }
  /**
   * Checks if the current tag is a void element. Override this if you want
   * to specify your own additional void elements.
   * @param name Name of the pseudo selector.
   */
  isVoidElement(name) {
    return this.htmlMode && voidElements.has(name);
  }
  /**
   * Read a tag name from the buffer.
   *
   * When `lowerCaseTagNames` is enabled (the default in HTML mode), the name
   * is lowercased and may be adjusted for SVG casing or the `image` → `img`
   * alias.
   * @param start Start index of the tag name in the buffer.
   * @param endIndex End index of the tag name in the buffer.
   */
  readTagName(start, endIndex) {
    const name = this.lowerCaseTagNames ? this.getSlice(start, endIndex).toLowerCase() : this.getSlice(start, endIndex);
    if (!(this.lowerCaseTagNames && this.htmlMode)) {
      return name;
    }
    if (this.foreignContext[0] === ForeignContext.Svg) {
      return svgTagNameAdjustments.get(name) ?? name;
    }
    if (this.foreignContext.length > 1) {
      const adjusted = svgTagNameAdjustments.get(name);
      if (adjusted !== void 0 && this.stack.includes(adjusted)) {
        return adjusted;
      }
    }
    if (!this.isInForeignContext()) {
      return name === "image" ? "img" : name;
    }
    return name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onopentagname(start, endIndex) {
    this.endIndex = endIndex;
    this.emitOpenTag(this.readTagName(start, endIndex));
  }
  emitOpenTag(name) {
    this.openTagStart = this.startIndex;
    this.tagname = name;
    if (this.htmlMode && name === "form" && this.stack.includes("form")) {
      this.tagname = "";
      return;
    }
    const impliesClose = this.htmlMode && openImpliesClose.get(name);
    if (impliesClose) {
      while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
        this.popElement(true);
      }
    }
    if (!this.isVoidElement(name)) {
      this.stack.unshift(name);
      if (this.htmlMode) {
        if (name === "svg") {
          this.foreignContext.unshift(ForeignContext.Svg);
        } else if (name === "math") {
          this.foreignContext.unshift(ForeignContext.MathML);
        } else if (htmlIntegrationElements.has(name)) {
          this.foreignContext.unshift(ForeignContext.None);
        }
      }
    }
    this.cbs.onopentagname?.(name);
    if (this.cbs.onopentag)
      this.attribs = {};
  }
  endOpenTag(isImplied) {
    this.startIndex = this.openTagStart;
    if (this.attribs) {
      this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
      this.attribs = null;
    }
    if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
      this.cbs.onclosetag(this.tagname, true);
    }
    this.tagname = "";
  }
  /**
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onopentagend(endIndex) {
    this.endIndex = endIndex;
    this.endOpenTag(false);
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onclosetag(start, endIndex) {
    this.endIndex = endIndex;
    const name = this.readTagName(start, endIndex);
    if (!this.isVoidElement(name)) {
      const pos = this.stack.indexOf(name);
      if (pos !== -1) {
        for (let index = 0; index < pos; index++) {
          this.popElement(true);
        }
        this.popElement(false);
      } else if (this.htmlMode && name === "p") {
        this.emitOpenTag("p");
        this.closeCurrentTag(true);
      }
    } else if (this.htmlMode && name === "br") {
      this.cbs.onopentagname?.("br");
      this.cbs.onopentag?.("br", {}, true);
      this.cbs.onclosetag?.("br", false);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onselfclosingtag(endIndex) {
    this.endIndex = endIndex;
    if (this.recognizeSelfClosing || this.isInForeignContext()) {
      this.closeCurrentTag(false);
      this.startIndex = endIndex + 1;
    } else {
      this.onopentagend(endIndex);
    }
  }
  /**
   * Pop the top element off the stack, emit a close event, and maintain
   * the foreign context stack.
   * @param implied Whether this close is implied (not from an explicit end tag).
   */
  popElement(implied) {
    const element = this.stack.shift();
    if (this.htmlMode && (foreignContextElements.has(element) || htmlIntegrationElements.has(element))) {
      this.foreignContext.shift();
    }
    this.cbs.onclosetag?.(element, implied);
  }
  closeCurrentTag(isOpenImplied) {
    const name = this.tagname;
    this.endOpenTag(isOpenImplied);
    if (this.stack[0] === name) {
      this.popElement(!isOpenImplied);
    }
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribname(start, endIndex) {
    this.startIndex = start;
    const name = this.getSlice(start, endIndex);
    this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribdata(start, endIndex) {
    this.attribvalue += this.getSlice(start, endIndex);
  }
  /**
   * @param cp Current Unicode code point.
   * @internal
   */
  onattribentity(cp) {
    this.attribvalue += fromCodePoint(cp);
  }
  /**
   * @param quote Quote type used for the current attribute.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onattribend(quote, endIndex) {
    this.endIndex = endIndex;
    this.cbs.onattribute?.(this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? void 0 : null);
    if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue;
    }
    this.attribvalue = "";
  }
  getInstructionName(value) {
    const index = value.search(reNameEnd);
    let name = index < 0 ? value : value.substr(0, index);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    return name;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  ondeclaration(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.htmlMode ? this.lowerCaseTagNames ? DOCUMENT_TYPE : value.slice(0, DOCUMENT_TYPE.length) : this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @internal
   */
  onprocessinginstruction(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @param offset Offset applied when computing parser indices.
   * @internal
   */
  oncomment(start, endIndex, offset) {
    this.endIndex = endIndex;
    this.cbs.oncomment?.(this.getSlice(start, endIndex - offset));
    this.cbs.oncommentend?.();
    this.startIndex = endIndex + 1;
  }
  /**
   * @param start Start index for the current parser event.
   * @param endIndex End index for the current parser event.
   * @param offset Offset applied when computing parser indices.
   * @internal
   */
  oncdata(start, endIndex, offset) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex - offset);
    if (!this.htmlMode || this.options.recognizeCDATA) {
      this.cbs.oncdatastart?.();
      this.cbs.ontext?.(value);
      this.cbs.oncdataend?.();
    } else if (this.isInForeignContext()) {
      this.cbs.ontext?.(value);
    } else {
      this.cbs.oncomment?.(`[CDATA[${value}]]`);
      this.cbs.oncommentend?.();
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onend() {
    if (this.cbs.onclosetag) {
      this.endIndex = this.startIndex;
      for (let index = 0; index < this.stack.length; index++) {
        this.cbs.onclosetag(this.stack[index], true);
      }
    }
    this.cbs.onend?.();
  }
  /**
   * Resets the parser to a blank state, ready to parse a new HTML document
   */
  reset() {
    this.cbs.onreset?.();
    this.tokenizer.reset();
    this.tagname = "";
    this.attribname = "";
    this.attribvalue = "";
    this.attribs = null;
    this.stack.length = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.cbs.onparserinit?.(this);
    this.buffers.length = 0;
    this.foreignContext.length = 0;
    this.foreignContext.unshift(ForeignContext.None);
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
  }
  /**
   * Resets the parser, then parses a complete document and
   * pushes it to the handler.
   * @param data Document to parse.
   */
  parseComplete(data) {
    this.reset();
    this.end(data);
  }
  getSlice(start, end) {
    if (start === end) {
      return "";
    }
    while (start - this.bufferOffset >= this.buffers[0].length) {
      this.shiftBuffer();
    }
    let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
    while (end - this.bufferOffset > this.buffers[0].length) {
      this.shiftBuffer();
      slice += this.buffers[0].slice(0, end - this.bufferOffset);
    }
    return slice;
  }
  shiftBuffer() {
    this.bufferOffset += this.buffers[0].length;
    this.writeIndex--;
    this.buffers.shift();
  }
  /**
   * Parses a chunk of data and calls the corresponding callbacks.
   * @param chunk Chunk to parse.
   */
  write(chunk) {
    if (this.ended) {
      this.cbs.onerror?.(new Error(".write() after done!"));
      return;
    }
    this.buffers.push(chunk);
    if (this.tokenizer.running) {
      this.tokenizer.write(chunk);
      this.writeIndex++;
    }
  }
  /**
   * Parses the end of the buffer and clears the stack, calls onend.
   * @param chunk Optional final chunk to parse.
   */
  end(chunk) {
    if (this.ended) {
      this.cbs.onerror?.(new Error(".end() after done!"));
      return;
    }
    if (chunk)
      this.write(chunk);
    this.ended = true;
    this.tokenizer.end();
  }
  /**
   * Pauses parsing. The parser won't emit events until `resume` is called.
   */
  pause() {
    this.tokenizer.pause();
  }
  /**
   * Resumes parsing after `pause` was called.
   */
  resume() {
    this.tokenizer.resume();
    while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
      this.tokenizer.write(this.buffers[this.writeIndex++]);
    }
    if (this.ended)
      this.tokenizer.end();
  }
};

// node_modules/domelementtype/dist/index.js
var ElementType;
(function(ElementType2) {
  ElementType2["Root"] = "root";
  ElementType2["Text"] = "text";
  ElementType2["Directive"] = "directive";
  ElementType2["Comment"] = "comment";
  ElementType2["Script"] = "script";
  ElementType2["Style"] = "style";
  ElementType2["Tag"] = "tag";
  ElementType2["CDATA"] = "cdata";
  ElementType2["Doctype"] = "doctype";
})(ElementType || (ElementType = {}));
function isTag(element) {
  return element.type === ElementType.Tag || element.type === ElementType.Script || element.type === ElementType.Style;
}
__name(isTag, "isTag");
var Root = ElementType.Root;
var Text = ElementType.Text;
var Directive = ElementType.Directive;
var Comment = ElementType.Comment;
var Script = ElementType.Script;
var Style = ElementType.Style;
var Tag = ElementType.Tag;
var CDATA = ElementType.CDATA;
var Doctype = ElementType.Doctype;

// node_modules/domhandler/dist/node.js
var Node5 = class {
  static {
    __name(this, "Node");
  }
  /** Parent of the node */
  parent = null;
  /** Previous sibling */
  prev = null;
  /** Next sibling */
  next = null;
  /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
  startIndex = null;
  /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
  endIndex = null;
  // Read-write aliases for properties
  /**
   * Same as {@link parent}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get parentNode() {
    return this.parent;
  }
  set parentNode(parent) {
    this.parent = parent;
  }
  /**
   * Same as {@link prev}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get previousSibling() {
    return this.prev;
  }
  set previousSibling(previous) {
    this.prev = previous;
  }
  /**
   * Same as {@link next}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get nextSibling() {
    return this.next;
  }
  set nextSibling(next) {
    this.next = next;
  }
  /**
   * Clone this node, and optionally its children.
   * @param recursive Clone child nodes as well.
   * @returns A clone of the node.
   */
  cloneNode(recursive = false) {
    return cloneNode(this, recursive);
  }
};
var DataNode = class extends Node5 {
  static {
    __name(this, "DataNode");
  }
  data;
  /**
   * @param data The content of the data node
   */
  constructor(data) {
    super();
    this.data = data;
  }
  /**
   * Same as {@link data}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get nodeValue() {
    return this.data;
  }
  set nodeValue(data) {
    this.data = data;
  }
};
var Text2 = class extends DataNode {
  static {
    __name(this, "Text");
  }
  type = ElementType.Text;
  get nodeType() {
    return 3;
  }
};
var Comment2 = class extends DataNode {
  static {
    __name(this, "Comment");
  }
  type = ElementType.Comment;
  get nodeType() {
    return 8;
  }
};
var ProcessingInstruction = class extends DataNode {
  static {
    __name(this, "ProcessingInstruction");
  }
  type = ElementType.Directive;
  name;
  constructor(name, data) {
    super(data);
    this.name = name;
  }
  get nodeType() {
    return 1;
  }
  /** If this is a doctype, the document type name (parse5 only). */
  "x-name";
  /** If this is a doctype, the document type public identifier (parse5 only). */
  "x-publicId";
  /** If this is a doctype, the document type system identifier (parse5 only). */
  "x-systemId";
};
var NodeWithChildren = class extends Node5 {
  static {
    __name(this, "NodeWithChildren");
  }
  children;
  /**
   * @param children Children of the node. Only certain node types can have children.
   */
  constructor(children) {
    super();
    this.children = children;
  }
  // Aliases
  /** First child of the node. */
  get firstChild() {
    return this.children[0] ?? null;
  }
  /** Last child of the node. */
  get lastChild() {
    return this.children.length > 0 ? this.children[this.children.length - 1] : null;
  }
  /**
   * Same as {@link children}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get childNodes() {
    return this.children;
  }
  set childNodes(children) {
    this.children = children;
  }
};
var CDATA2 = class extends NodeWithChildren {
  static {
    __name(this, "CDATA");
  }
  type = ElementType.CDATA;
  get nodeType() {
    return 4;
  }
};
var Document = class extends NodeWithChildren {
  static {
    __name(this, "Document");
  }
  type = ElementType.Root;
  get nodeType() {
    return 9;
  }
};
var Element = class extends NodeWithChildren {
  static {
    __name(this, "Element");
  }
  name;
  attribs;
  type;
  /**
   * @param name Name of the tag, eg. `div`, `span`.
   * @param attribs Object mapping attribute names to attribute values.
   * @param children Children of the node.
   * @param type Node type used for the new node instance.
   */
  constructor(name, attribs, children = [], type = name === "script" ? ElementType.Script : name === "style" ? ElementType.Style : ElementType.Tag) {
    super(children);
    this.name = name;
    this.attribs = attribs;
    this.type = type;
  }
  get nodeType() {
    return 1;
  }
  // DOM Level 1 aliases
  /**
   * Same as {@link name}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get tagName() {
    return this.name;
  }
  set tagName(name) {
    this.name = name;
  }
  get attributes() {
    return Object.keys(this.attribs).map((name) => ({
      name,
      value: this.attribs[name],
      namespace: this["x-attribsNamespace"]?.[name],
      prefix: this["x-attribsPrefix"]?.[name]
    }));
  }
  /** Element namespace (parse5 only). */
  namespace;
  /** Element attribute namespaces (parse5 only). */
  "x-attribsNamespace";
  /** Element attribute namespace-related prefixes (parse5 only). */
  "x-attribsPrefix";
};
function isTag2(node) {
  return isTag(node);
}
__name(isTag2, "isTag");
function isCDATA(node) {
  return node.type === ElementType.CDATA;
}
__name(isCDATA, "isCDATA");
function isText(node) {
  return node.type === ElementType.Text;
}
__name(isText, "isText");
function isComment(node) {
  return node.type === ElementType.Comment;
}
__name(isComment, "isComment");
function isDirective(node) {
  return node.type === ElementType.Directive;
}
__name(isDirective, "isDirective");
function isDocument(node) {
  return node.type === ElementType.Root;
}
__name(isDocument, "isDocument");
function hasChildren(node) {
  return Object.hasOwn(node, "children");
}
__name(hasChildren, "hasChildren");
function cloneNode(node, recursive = false) {
  let result;
  if (isText(node)) {
    result = new Text2(node.data);
  } else if (isComment(node)) {
    result = new Comment2(node.data);
  } else if (isTag2(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new Element(node.name, { ...node.attribs }, children);
    for (const child of children) {
      child.parent = clone;
    }
    if (node.namespace != null) {
      clone.namespace = node.namespace;
    }
    if (node["x-attribsNamespace"]) {
      clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
    }
    if (node["x-attribsPrefix"]) {
      clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
    }
    result = clone;
  } else if (isCDATA(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new CDATA2(children);
    for (const child of children) {
      child.parent = clone;
    }
    result = clone;
  } else if (isDocument(node)) {
    const children = recursive ? cloneChildren(node.children) : [];
    const clone = new Document(children);
    for (const child of children) {
      child.parent = clone;
    }
    if (node["x-mode"]) {
      clone["x-mode"] = node["x-mode"];
    }
    result = clone;
  } else if (isDirective(node)) {
    const instruction = new ProcessingInstruction(node.name, node.data);
    if (node["x-name"] != null) {
      instruction["x-name"] = node["x-name"];
      instruction["x-publicId"] = node["x-publicId"];
      instruction["x-systemId"] = node["x-systemId"];
    }
    result = instruction;
  } else {
    throw new Error(`Not implemented yet: ${node.type}`);
  }
  result.startIndex = node.startIndex;
  result.endIndex = node.endIndex;
  if (node.sourceCodeLocation != null) {
    result.sourceCodeLocation = node.sourceCodeLocation;
  }
  return result;
}
__name(cloneNode, "cloneNode");
function cloneChildren(childs) {
  const children = childs.map((child) => cloneNode(child, true));
  for (let index = 1; index < children.length; index++) {
    children[index].prev = children[index - 1];
    children[index - 1].next = children[index];
  }
  return children;
}
__name(cloneChildren, "cloneChildren");

// node_modules/domhandler/dist/index.js
var defaultOptions = {
  withStartIndices: false,
  withEndIndices: false,
  xmlMode: false
};
var DomHandler = class {
  static {
    __name(this, "DomHandler");
  }
  /** The elements of the DOM */
  dom = [];
  /** The root element for the DOM */
  root = new Document(this.dom);
  /** Called once parsing has completed. */
  callback;
  /** Settings for the handler. */
  options;
  /** Callback whenever a tag is closed. */
  elementCB;
  /** Indicated whether parsing has been completed. */
  done = false;
  /** Stack of open tags. */
  tagStack = [this.root];
  /** A data node that is still being written to. */
  lastNode = null;
  /** Reference to the parser instance. Used for location information. */
  parser = null;
  /**
   * @param callback Called once parsing has completed.
   * @param options Settings for the handler.
   * @param elementCB Callback whenever a tag is closed.
   */
  constructor(callback, options, elementCB) {
    if (typeof options === "function") {
      elementCB = options;
      options = defaultOptions;
    }
    if (typeof callback === "object") {
      options = callback;
      callback = void 0;
    }
    this.callback = callback ?? null;
    this.options = options ?? defaultOptions;
    this.elementCB = elementCB ?? null;
  }
  onparserinit(parser) {
    this.parser = parser;
  }
  // Resets the handler back to starting state
  onreset() {
    this.dom = [];
    this.root = new Document(this.dom);
    this.done = false;
    this.tagStack = [this.root];
    this.lastNode = null;
    this.parser = null;
  }
  // Signals the handler that parsing is done
  onend() {
    if (this.done)
      return;
    this.done = true;
    this.parser = null;
    this.handleCallback(null);
  }
  onerror(error) {
    this.handleCallback(error);
  }
  onclosetag() {
    this.lastNode = null;
    const element = this.tagStack.pop();
    if (this.options.withEndIndices && this.parser) {
      element.endIndex = this.parser.endIndex;
    }
    if (this.elementCB)
      this.elementCB(element);
  }
  onopentag(name, attribs) {
    const type = this.options.xmlMode ? ElementType.Tag : void 0;
    const element = new Element(name, attribs, void 0, type);
    this.addNode(element);
    this.tagStack.push(element);
  }
  ontext(data) {
    const { lastNode } = this;
    if (lastNode && lastNode.type === ElementType.Text) {
      lastNode.data += data;
      if (this.options.withEndIndices && this.parser) {
        lastNode.endIndex = this.parser.endIndex;
      }
    } else {
      const node = new Text2(data);
      this.addNode(node);
      this.lastNode = node;
    }
  }
  oncomment(data) {
    if (this.lastNode && this.lastNode.type === ElementType.Comment) {
      this.lastNode.data += data;
      return;
    }
    const node = new Comment2(data);
    this.addNode(node);
    this.lastNode = node;
  }
  oncommentend() {
    this.lastNode = null;
  }
  oncdatastart() {
    const text2 = new Text2("");
    const node = new CDATA2([text2]);
    this.addNode(node);
    text2.parent = node;
    this.lastNode = text2;
  }
  oncdataend() {
    this.lastNode = null;
  }
  onprocessinginstruction(name, data) {
    const node = new ProcessingInstruction(name, data);
    this.addNode(node);
  }
  handleCallback(error) {
    if (typeof this.callback === "function") {
      this.callback(error, this.dom);
    } else if (error) {
      throw error;
    }
  }
  addNode(node) {
    const parent = this.tagStack[this.tagStack.length - 1];
    const previousSibling = parent.children[parent.children.length - 1];
    if (this.options.withStartIndices && this.parser) {
      node.startIndex = this.parser.startIndex;
    }
    if (this.options.withEndIndices && this.parser) {
      node.endIndex = this.parser.endIndex;
    }
    parent.children.push(node);
    if (previousSibling) {
      node.prev = previousSibling;
      previousSibling.next = node;
    }
    node.parent = parent;
    this.lastNode = null;
  }
};

// node_modules/domutils/dist/stringify.js
function textContent(node) {
  if (Array.isArray(node))
    return node.map(textContent).join("");
  if (hasChildren(node) && !isComment(node)) {
    return textContent(node.children);
  }
  if (isText(node))
    return node.data;
  return "";
}
__name(textContent, "textContent");

// node_modules/domutils/dist/traversal.js
function getChildren(element) {
  return hasChildren(element) ? element.children : [];
}
__name(getChildren, "getChildren");
function getAttributeValue(element, name) {
  const { attribs } = element;
  return attribs?.[name];
}
__name(getAttributeValue, "getAttributeValue");

// node_modules/htmlparser2/dist/index.js
function parseDocument(data, options) {
  const handler = new DomHandler(void 0, options);
  new Parser(handler, options).end(data);
  return handler.root;
}
__name(parseDocument, "parseDocument");

// src/lib/dom.ts
var DomQuery = class _DomQuery {
  constructor(nodes) {
    this.nodes = nodes;
  }
  nodes;
  static {
    __name(this, "DomQuery");
  }
  static load(html) {
    const doc = parseDocument(html, { decodeEntities: true });
    return new _DomQuery(doc.children);
  }
  static isElement(node) {
    const type = node.type;
    return type === "tag" || type === "script" || type === "style";
  }
  get length() {
    return this.nodes.length;
  }
  /** 取第一个匹配元素作为新查询集 */
  first() {
    return new _DomQuery(this.nodes.slice(0, 1));
  }
  /** 全部底层节点（调试用） */
  all() {
    return this.nodes;
  }
  /** 按标签名筛选（含当前节点） */
  tag(name) {
    return new _DomQuery(this.search((el) => el.name === name));
  }
  /**
   * 按 class 筛选。
   *
   * @param className 单个或多个 class，用 `.` 分隔表示"必须全部命中"
   */
  class(className) {
    const required = className.split(".").map((c) => c.trim()).filter(Boolean);
    if (required.length === 0) return new _DomQuery([]);
    return new _DomQuery(
      this.search((el) => {
        const value = getAttributeValue(el, "class");
        if (!value) return false;
        const classes = value.split(/\s+/);
        return required.every((name) => classes.includes(name));
      })
    );
  }
  /** 按 `[attr]` 或 `[attr="value"]` 筛选 */
  attr(expression) {
    const match2 = expression.match(/^([\w:-]+)(?:\s*=\s*["']?([^"']*)["']?)?$/);
    if (!match2) return new _DomQuery([]);
    const [, name, value] = match2;
    return new _DomQuery(
      this.search((el) => {
        const actual = getAttributeValue(el, name);
        if (actual === void 0) return false;
        return value === void 0 ? true : actual === value;
      })
    );
  }
  /** 组合选择器：空格分隔，逐层向下收窄，例如 `div.tags-body a` */
  select(selector) {
    let current = this;
    for (const part of selector.trim().split(/\s+/)) {
      current = current.matchPart(part);
    }
    return current;
  }
  matchPart(part) {
    const tagMatch = part.match(/^([a-zA-Z][\w-]*)/);
    const classMatches = [...part.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    const attrMatches = [...part.matchAll(/\[([^\]]+)]/g)].map((m) => m[1]);
    const tagName = tagMatch?.[1];
    const requiredClasses = classMatches;
    const attrs = attrMatches.map((expr) => {
      const m = expr.match(/^([\w:-]+)(?:\s*=\s*["']?([^"']*)["']?)?$/);
      return { name: m?.[1] ?? "", value: m?.[2] };
    });
    return new _DomQuery(
      this.search((el) => {
        if (tagName && el.name !== tagName) return false;
        if (requiredClasses.length > 0) {
          const value = getAttributeValue(el, "class");
          if (!value) return false;
          const classes = value.split(/\s+/);
          if (!requiredClasses.every((name) => classes.includes(name))) return false;
        }
        for (const { name, value } of attrs) {
          if (!name) continue;
          const actual = getAttributeValue(el, name);
          if (actual === void 0) return false;
          if (value !== void 0 && actual !== value) return false;
        }
        return true;
      })
    );
  }
  /**
   * 单遍深度优先遍历：当前节点集 + 全部后代。
   *
   * `visited` 必不可少：同一个元素可能同时是多个当前节点的后代
   * （例如 `select('div')` 得到 65 个 div，其中嵌套关系会让内部 div 被重复访问），
   * 不记录就会把同一节点产出多次 —— 曾因此让 `div.hd` 的计数从 20 虚增到 120，
   * 奖项名称也被拼接了两遍。
   */
  search(predicate) {
    const out = [];
    const visited = /* @__PURE__ */ new Set();
    const walk = /* @__PURE__ */ __name((nodes) => {
      for (const node of nodes) {
        if (!_DomQuery.isElement(node)) continue;
        if (visited.has(node)) continue;
        visited.add(node);
        if (predicate(node)) out.push(node);
        walk(getChildren(node));
      }
    }, "walk");
    walk(this.nodes);
    return out;
  }
  /** 文本内容（递归拼接） */
  text() {
    return this.nodes.map((node) => textContent(node)).join("");
  }
  /** 去空白后的文本 */
  trimmedText() {
    return this.text().replace(/\s+/g, " ").trim();
  }
  /** 属性值（取第一个命中的） */
  getAttr(name) {
    for (const node of this.nodes) {
      if (!_DomQuery.isElement(node)) continue;
      const value = getAttributeValue(node, name);
      if (value !== void 0) return value;
    }
    return void 0;
  }
  /** 每个匹配元素映射成数组 */
  map(fn) {
    return this.nodes.map((node, index) => fn(new _DomQuery([node]), index));
  }
  /** 每个匹配元素的文本 */
  texts() {
    return this.nodes.map((node) => textContent(node).replace(/\s+/g, " ").trim());
  }
  /**
   * 取该节点之后的兄弟内容文本（豆瓣 `span.pl` 后的字段值）。
   *
   * 对应原实现的 `fetchAnchorText`，但补上两个原来漏掉的情况：
   * - 值直接是文本节点（`制片国家/地区: 美国 / 英国`）
   * - 值包在内联标签里（`片长: <span property="v:runtime">148分钟</span>`）
   *
   * 向后累积直到遇到 `<br>` 或下一个 `<span class="pl">`，二者代表字段结束。
   */
  nextSiblingText() {
    for (const node of this.nodes) {
      const parent = node.parent;
      if (!parent) continue;
      const siblings = getChildren(parent);
      const index = siblings.indexOf(node);
      if (index < 0) continue;
      const parts = [];
      for (let i = index + 1; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling.type === "text") {
          const value2 = cleanDoubanText(sibling.data ?? "");
          if (value2) parts.push(value2);
          continue;
        }
        if (sibling.type !== "tag") continue;
        if (sibling.name === "br") break;
        if (sibling.name === "span" && String(getAttributeValue(sibling, "class") ?? "").includes("pl")) {
          break;
        }
        const value = cleanDoubanText(textContent(sibling));
        if (value) parts.push(value);
      }
      const joined = cleanDoubanText(parts.join(" "));
      if (joined) return joined;
    }
    return "";
  }
};
function cleanDoubanText(text2) {
  if (!text2) return "";
  return text2.trim().replace(/\s+/g, " ").replace(/^[:：]\s*/, "").replace(/\n+/g, " ").trim();
}
__name(cleanDoubanText, "cleanDoubanText");

// src/douban/request.ts
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
var DOUBAN_HEADERS_BASE = {
  "user-agent": USER_AGENT2,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8",
  "cache-control": "max-age=0",
  // 不设 connection：逐跳头应由传输层管理，Bun / Workers 的 fetch 对它的处理不一致
  "upgrade-insecure-requests": "1",
  "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1"
};
var ANTI_BOT_PATTERN = /验证码|检测到有异常请求|机器人程序|访问受限|请先登录|没有访问权限/i;
var NOT_FOUND_PATTERN = /你想访问的页面不存在/;
var DOUBAN_NOT_FOUND = "The corresponding resource does not exist.";
var DOUBAN_ANTI_BOT = "Douban blocked the request (captcha/anti-bot). Provide a valid cookie or try again later.";
function isDoubanAntiBot(html) {
  return Boolean(html && ANTI_BOT_PATTERN.test(html));
}
__name(isDoubanAntiBot, "isDoubanAntiBot");
function isDoubanChallengeStatus(status) {
  return status === 202 || status === 403 || status === 418 || status === 429;
}
__name(isDoubanChallengeStatus, "isDoubanChallengeStatus");
function isDoubanChallengePage(html) {
  return Boolean(html && html.length < 5e3 && /载入中/.test(html));
}
__name(isDoubanChallengePage, "isDoubanChallengePage");
function isDoubanNotFound(html) {
  return Boolean(html && NOT_FOUND_PATTERN.test(html));
}
__name(isDoubanNotFound, "isDoubanNotFound");
function buildDoubanHeaders(jar) {
  const headers2 = { ...DOUBAN_HEADERS_BASE };
  if (jar && Object.keys(jar).length > 0) headers2.cookie = cookieHeader(jar);
  return headers2;
}
__name(buildDoubanHeaders, "buildDoubanHeaders");
function getDoubanCookieJar(config) {
  const manualCookie = config.doubanCookie?.trim();
  return manualCookie ? parseCookieString(manualCookie) : {};
}
__name(getDoubanCookieJar, "getDoubanCookieJar");
function isDoubanBlockedRedirect(status, location) {
  if (![301, 302, 303, 307, 308].includes(status)) return false;
  const target = location ?? "";
  return target.includes("sec.douban.com") || target.includes("accounts.douban.com");
}
__name(isDoubanBlockedRedirect, "isDoubanBlockedRedirect");

// src/lib/rating-format.ts
var EMPTY_RATING = "0.0 / 10 from 0 users";
function formatUserRating(average, votes) {
  const value = typeof average === "number" ? average : Number.parseFloat(average) || 0;
  const count = typeof votes === "number" ? votes : Number.parseInt(String(votes).replace(/\D/g, ""), 10) || 0;
  if (value <= 0) return EMPTY_RATING;
  return `${value.toFixed(1)} / 10 from ${count.toLocaleString("en-US")} users`;
}
__name(formatUserRating, "formatUserRating");
function emptyUserRating() {
  return EMPTY_RATING;
}
__name(emptyUserRating, "emptyUserRating");

// src/douban/cast.ts
function withCharacterMarker(character, role) {
  if (/^[饰配]\s+/.test(character)) return character;
  const marker = role === "\u914D\u97F3" ? "\u914D" : role === "\u6F14\u5458" ? "\u9970" : "";
  return marker ? `${marker} ${character}` : character;
}
__name(withCharacterMarker, "withCharacterMarker");
function parseDoubanRole(raw2, fallbackRole) {
  const text2 = (raw2 ?? "").trim();
  const bracketMatch = text2.match(/[（(]\s*([饰配])\s*([^）)]+)[）)]/);
  const simpleMatch = text2.match(/^([饰配])\s+(.+)$/);
  const character = bracketMatch ? `${bracketMatch[1]} ${bracketMatch[2].trim()}` : simpleMatch ? `${simpleMatch[1]} ${simpleMatch[2].trim()}` : "";
  if (/^配音/.test(text2)) return { role: "\u914D\u97F3", character };
  if (/^演员/.test(text2)) return { role: "\u6F14\u5458", character };
  if (/^导演/.test(text2)) return { role: "\u5BFC\u6F14", character };
  if (/^编剧/.test(text2)) return { role: "\u7F16\u5267", character };
  if (/^[配饰]/.test(text2)) return { role: text2.startsWith("\u914D") ? "\u914D\u97F3" : "\u6F14\u5458", character };
  return { role: fallbackRole, character };
}
__name(parseDoubanRole, "parseDoubanRole");
function peopleFromBackend(value, fallbackRole, requirePrefix) {
  const result = [];
  for (const item of asUnknownList(value)) {
    const raw2 = asRecord(item);
    if (!raw2) continue;
    const name = asTrimmed(raw2.name);
    if (!name) continue;
    const roleText = asTrimmed(raw2.role);
    if (requirePrefix && roleText && !roleText.startsWith(requirePrefix)) continue;
    const parsed = parseDoubanRole(roleText, fallbackRole);
    let character = asTrimmed(raw2.character);
    character = character ? withCharacterMarker(character, parsed.role) : parsed.character;
    result.push({
      name,
      link: asTrimmed(raw2.link),
      role: parsed.role,
      image: asTrimmed(raw2.image ?? raw2.avatar),
      character
    });
  }
  return result;
}
__name(peopleFromBackend, "peopleFromBackend");
function dedupeCelebrities(list) {
  return uniqueBy(list, (item) => item.link || item.name);
}
__name(dedupeCelebrities, "dedupeCelebrities");
function selectDoubanCast(entries, limits) {
  const voice = entries.filter((entry) => entry.role === "\u914D\u97F3");
  const regular = entries.filter((entry) => entry.role !== "\u914D\u97F3");
  if (regular.length === 0) {
    return selectCastByLimits(voice, [], voice.slice(limits.lead), limits);
  }
  return selectCastByLimits(regular, regular.slice(limits.lead), voice, limits);
}
__name(selectDoubanCast, "selectDoubanCast");

// src/douban/backend.ts
function requireDoubanBackendUrls(config, extra) {
  if (config.doubanBackendUrls.length === 0) {
    throw ApiError.notImplemented(
      extra ?? "\u672A\u914D\u7F6E DOUBAN_BACKEND_URL\uFF0C\u65E0\u6CD5\u901A\u8FC7\u5916\u90E8\u540E\u7AEF\u83B7\u53D6\u8C46\u74E3\u6570\u636E",
      extra ? void 0 : { hint: "\u90E8\u7F72 PT-Gen \u5916\u90E8 API \u540E\uFF0C\u628A\u5730\u5740\u586B\u4E3A https://<host>/api/v1/douban\uFF08\u6216 /api/v1\uFF09" }
    );
  }
  return config.doubanBackendUrls;
}
__name(requireDoubanBackendUrls, "requireDoubanBackendUrls");
function callDoubanBackend(client, config, url, notFound) {
  return fetchJsonBackend(client, url, {
    timeoutMs: config.requestTimeoutMs,
    token: config.doubanBackendToken,
    upstream: "douban-backend",
    authFailed: "\u8C46\u74E3\u540E\u7AEF\u9274\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 DOUBAN_BACKEND_TOKEN",
    notFound
  });
}
__name(callDoubanBackend, "callDoubanBackend");
function buildDoubanBackendUrl(base, sid, full = true) {
  return v1BackendUrl(
    base,
    "douban",
    [sid],
    full ? {} : { full: "false" },
    "DOUBAN_BACKEND_URL"
  );
}
__name(buildDoubanBackendUrl, "buildDoubanBackendUrl");
function asAwards(value) {
  const groups = [];
  for (const item of asUnknownList(value)) {
    const raw2 = asRecord(item);
    if (!raw2) continue;
    const festival = asTrimmed(raw2.festival);
    const awards = asStringList(raw2.awards);
    if (festival && awards.length > 0) groups.push({ festival, awards });
  }
  return groups;
}
__name(asAwards, "asAwards");
function ratingOrFallback(raw2, average, votes) {
  return asTrimmed(raw2) || formatUserRating(average, votes);
}
__name(ratingOrFallback, "ratingOrFallback");
function people(raw2, role, requirePrefix) {
  return dedupeCelebrities(peopleFromBackend(raw2, role, requirePrefix));
}
__name(people, "people");
function normalizeDoubanBackendData(raw2, sid, config, options) {
  const imdbId = asTrimmed(raw2.imdb_id);
  const doubanAverage = asTrimmed(raw2.douban_rating_average) || "0.0";
  const doubanVotes = asTrimmed(raw2.douban_votes) || "0";
  const imdbAverage = asTrimmed(raw2.imdb_rating_average) || "0.0";
  const imdbVotes = asTrimmed(raw2.imdb_votes) || "0";
  const full = options.full;
  return {
    success: true,
    site: "douban",
    sid: asTrimmed(raw2.sid) || sid,
    link: asTrimmed(raw2.link) || asTrimmed(raw2.douban_link) || `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`,
    chinese_title: asTrimmed(raw2.chinese_title),
    foreign_title: asTrimmed(raw2.foreign_title),
    year: asTrimmed(raw2.year),
    aka: asStringList(raw2.aka).sort(),
    region: asStringList(raw2.region),
    genre: asStringList(raw2.genre),
    language: asStringList(raw2.language),
    playdate: asStringList(raw2.playdate),
    episodes: asTrimmed(raw2.episodes),
    duration: asTrimmed(raw2.duration),
    introduction: asTrimmed(raw2.introduction),
    poster: asTrimmed(raw2.poster),
    tags: asStringList(raw2.tags),
    douban_rating_average: doubanAverage,
    douban_votes: doubanVotes,
    douban_rating: ratingOrFallback(raw2.douban_rating, doubanAverage, doubanVotes),
    imdb_id: imdbId,
    imdb_link: asTrimmed(raw2.imdb_link) || (imdbId ? `https://www.imdb.com/title/${imdbId}/` : ""),
    imdb_rating_average: imdbAverage,
    imdb_votes: imdbVotes,
    imdb_rating: ratingOrFallback(raw2.imdb_rating, imdbAverage, imdbVotes),
    director: full ? people(raw2.director, "\u5BFC\u6F14", "\u5BFC\u6F14") : [],
    writer: full ? people(raw2.writer, "\u7F16\u5267") : [],
    cast: full ? selectDoubanCast(people(raw2.cast, "\u6F14\u5458"), {
      lead: config.castLeadLimit,
      supporting: config.castSupportingLimit,
      voice: config.castVoiceLimit
    }) : [],
    awards: full ? asAwards(raw2.awards) : []
  };
}
__name(normalizeDoubanBackendData, "normalizeDoubanBackendData");
function pickSearchField(raw2, keys) {
  for (const key of keys) {
    const value = asTrimmed(raw2[key]);
    if (value) return value;
  }
  return "";
}
__name(pickSearchField, "pickSearchField");
function searchItemFromRaw(item) {
  const raw2 = asRecord(item);
  if (!raw2) return null;
  const sid = pickSearchField(raw2, ["sid", "id"]);
  const title = pickSearchField(raw2, ["title", "name"]);
  if (!sid || !title) return null;
  return {
    sid,
    title,
    url: pickSearchField(raw2, ["url", "link"]) || `https://movie.douban.com/subject/${sid}/`,
    subtitle: pickSearchField(raw2, ["subtitle", "description", "episodes"]),
    rating: Number.parseFloat(pickSearchField(raw2, ["rating", "douban_rating_average"])) || 0,
    poster: pickSearchField(raw2, ["poster", "cover", "image"])
  };
}
__name(searchItemFromRaw, "searchItemFromRaw");
function toSearchItems(list) {
  return list.flatMap((item) => {
    const parsed = searchItemFromRaw(item);
    return parsed ? [parsed] : [];
  });
}
__name(toSearchItems, "toSearchItems");
function unwrapSearchItems(payload) {
  const raw2 = asRecord(payload);
  if (!raw2) return [];
  return toSearchItems(asUnknownList(raw2.items));
}
__name(unwrapSearchItems, "unwrapSearchItems");
async function fetchDoubanSubjectViaBackend(client, config, sid, options) {
  return tryBackendEndpoints(
    requireDoubanBackendUrls(config),
    async (base) => {
      const payload = await callDoubanBackend(
        client,
        config,
        buildDoubanBackendUrl(base, sid, options.full),
        `\u8C46\u74E3\u4E0A\u672A\u627E\u5230\u6761\u76EE ${sid}`
      );
      const raw2 = asRecord(payload);
      if (!raw2) {
        throw ApiError.upstreamError("\u8C46\u74E3\u540E\u7AEF\u672A\u8FD4\u56DE\u6570\u636E", { upstream: "douban-backend" });
      }
      return normalizeDoubanBackendData(raw2, sid, config, options);
    },
    "douban-backend"
  );
}
__name(fetchDoubanSubjectViaBackend, "fetchDoubanSubjectViaBackend");
async function searchDoubanViaBackend(client, config, query, limit) {
  const endpoints = requireDoubanBackendUrls(config, "\u672A\u914D\u7F6E DOUBAN_BACKEND_URL");
  return tryBackendEndpoints(
    endpoints,
    async (base) => {
      const url = v1BackendUrl(
        base,
        "douban",
        ["search"],
        { q: query, limit },
        "DOUBAN_BACKEND_URL"
      );
      const items = unwrapSearchItems(await callDoubanBackend(client, config, url)).slice(0, limit);
      return { query, url, total: items.length, items };
    },
    "douban-backend"
  );
}
__name(searchDoubanViaBackend, "searchDoubanViaBackend");

// src/douban/search.ts
function extractSubjectId(href) {
  if (!href) return null;
  const direct = href.match(/movie\.douban\.com\/subject\/(\d+)/);
  if (direct) return direct[1];
  const urlParam = href.match(/[?&]url=([^&]+)/);
  if (urlParam) {
    try {
      const decoded = decodeURIComponent(urlParam[1]);
      const nested = decoded.match(/movie\.douban\.com\/subject\/(\d+)/);
      if (nested) return nested[1];
    } catch {
      return null;
    }
  }
  return null;
}
__name(extractSubjectId, "extractSubjectId");
function normalizePoster(raw2) {
  const value = (raw2 ?? "").trim();
  if (!value || value.startsWith("data:")) return "";
  return value.startsWith("//") ? `https:${value}` : value;
}
__name(normalizePoster, "normalizePoster");
function parseDoubanSearch(html) {
  const $ = DomQuery.load(html);
  const items = [];
  $.select("div").class("result").map((result) => {
    const heading = result.select("h3");
    const link = heading.select("a").first();
    const title = link.trimmedText();
    if (!title) return null;
    const href = link.getAttr("href") ?? "";
    const sid = extractSubjectId(href);
    if (!sid) return null;
    const ratingText = result.select("span").class("rating_nums").trimmedText();
    const rating = ratingText ? Number.parseFloat(ratingText) : Number.NaN;
    const subtitle = result.select("span").class("subject-cast").trimmedText();
    const pic = result.select("div.pic img").first();
    const image = pic.length ? pic : result.select("img").first();
    const poster = normalizePoster(image.getAttr("src") ?? image.getAttr("data-src"));
    items.push({
      sid,
      title,
      url: `https://movie.douban.com/subject/${sid}/`,
      subtitle,
      rating: Number.isFinite(rating) ? rating : 0,
      poster
    });
    return null;
  });
  return items;
}
__name(parseDoubanSearch, "parseDoubanSearch");
function blockedError(reason) {
  return new ApiError("UPSTREAM_BLOCKED", `\u8C46\u74E3\u641C\u7D22\u89E6\u53D1\u4E86\u53CD\u722C\u9A8C\u8BC1\uFF08${reason}\uFF09`, {
    retryable: true,
    retryAfterSeconds: 60,
    details: { hint: "\u914D\u7F6E DOUBAN_COOKIE \u6216\u66F4\u6362\u51FA\u53E3 IP" }
  });
}
__name(blockedError, "blockedError");
async function searchDouban(client, config, query, limit) {
  if (hasDoubanBackend(config)) {
    try {
      return await searchDoubanViaBackend(client, config, query, limit);
    } catch (error) {
      console.warn(
        "[douban] \u540E\u7AEF\u641C\u7D22\u5931\u8D25\uFF0C\u6539\u7528\u7F51\u9875\u641C\u7D22:",
        error instanceof Error ? error.message : error
      );
    }
  }
  const url = `https://www.douban.com/search/?cat=1002&q=${encodeURIComponent(query)}`;
  const jar = getDoubanCookieJar(config);
  const response = await client.request(url, {
    timeoutMs: config.requestTimeoutMs,
    headers: { ...buildDoubanHeaders(jar), referer: "https://movie.douban.com/" },
    redirect: "follow"
  });
  if (isDoubanChallengeStatus(response.status)) {
    throw blockedError(`HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u8C46\u74E3\u641C\u7D22\u8FD4\u56DE HTTP ${response.status}`, { status: response.status });
  }
  const html = await response.text();
  if (/检测到有异常请求|请输入验证码/.test(html) || isDoubanChallengePage(html)) {
    throw blockedError("\u9A8C\u8BC1\u9875");
  }
  const items = parseDoubanSearch(html).slice(0, limit);
  return {
    query,
    url,
    total: items.length,
    items
  };
}
__name(searchDouban, "searchDouban");

// src/douban/cookie-error.ts
var HINT = "\u91CD\u65B0\u767B\u5F55\u8C46\u74E3\u540E\u590D\u5236 Cookie\uFF0C\u5E76\u540C\u6B65\u66F4\u65B0 DOUBAN_COOKIE_EXPIRES_AT";
function throwDoubanCookieExpired(reason, message, extra) {
  throw new ApiError(ErrorCode.DOUBAN_COOKIE_EXPIRED, message, {
    details: { reason, hint: HINT, ...extra }
  });
}
__name(throwDoubanCookieExpired, "throwDoubanCookieExpired");

// src/douban/cookie-notify.ts
var EXPIRY_WARNING_MS = 24 * 60 * 60 * 1e3;
var TELEGRAM_TIMEOUT_MS = 1e4;
var ALERT_RETRY_MS = 5 * 60 * 1e3;
var alertedExpiry = null;
var alertAttemptAt = 0;
async function notifyDoubanCookieExpiry(config) {
  const expiry = timestampFields(config.doubanCookieExpiresAt);
  if (expiry.ms === null || !expiry.iso) return;
  if (!config.telegramBotToken?.trim() || !config.telegramChatId?.trim()) return;
  const now = Date.now();
  if (now < expiry.ms - EXPIRY_WARNING_MS) return;
  if (alertedExpiry === expiry.ms) return;
  if (now - alertAttemptAt < ALERT_RETRY_MS) return;
  alertAttemptAt = now;
  const hours = Math.max(0, Math.round((expiry.ms - now) / 36e5));
  const text2 = now >= expiry.ms ? `PT-Gen: \u8C46\u74E3 Cookie \u5DF2\u8FC7\u671F\uFF08${expiry.iso}\uFF09\uFF0C\u8BF7\u66F4\u65B0 DOUBAN_COOKIE\u3002` : `PT-Gen: \u8C46\u74E3 Cookie \u5C06\u5728\u7EA6 ${hours} \u5C0F\u65F6\u540E\u8FC7\u671F\uFF08${expiry.iso}\uFF09\uFF0C\u8BF7\u53CA\u65F6\u66F4\u65B0 DOUBAN_COOKIE\u3002`;
  if (await sendTelegram(config, text2)) alertedExpiry = expiry.ms;
}
__name(notifyDoubanCookieExpiry, "notifyDoubanCookieExpiry");
async function sendTelegram(config, text2) {
  const token = config.telegramBotToken?.trim();
  const chatId = config.telegramChatId?.trim();
  if (!token || !chatId) return false;
  try {
    const response = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text2,
          disable_web_page_preview: true
        })
      },
      TELEGRAM_TIMEOUT_MS
    );
    if (!response.ok) {
      console.warn(`[douban] Telegram \u544A\u8B66\u5931\u8D25: HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[douban] Telegram \u544A\u8B66\u5931\u8D25:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
__name(sendTelegram, "sendTelegram");

// src/douban/cookie-health.ts
var HEALTH_TTL_MS = 10 * 60 * 1e3;
var cache = null;
var inflight = null;
var loggedTransientHealthFailure = false;
function isTransientUpstreamError(error) {
  if (error instanceof ApiError) {
    return error.symbol === ErrorCode.UPSTREAM_TIMEOUT || error.symbol === ErrorCode.UPSTREAM_ERROR;
  }
  if (isTimeoutError(error)) return true;
  return error instanceof Error && /上游请求超时|timed out|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|fetch failed/i.test(
    error.message
  );
}
__name(isTransientUpstreamError, "isTransientUpstreamError");
function snapshot(config, now = Date.now()) {
  const cookie = config.doubanCookie?.trim() ?? "";
  const expiry = timestampFields(config.doubanCookieExpiresAt, now);
  return {
    cookie,
    expiresAtMs: expiry.ms,
    health: {
      configured: Boolean(cookie),
      valid: null,
      checkedAt: null,
      expiresAt: expiry.iso,
      remainingSeconds: expiry.remainingSeconds
    }
  };
}
__name(snapshot, "snapshot");
function remember(cookie, health, now = Date.now()) {
  cache = { cookie, health, until: now + HEALTH_TTL_MS };
  return health;
}
__name(remember, "remember");
function cachedHealth(cookie, expiresAtMs, now) {
  if (!cache || cache.cookie !== cookie || cache.until <= now) return null;
  return { ...cache.health, remainingSeconds: remainingSeconds(expiresAtMs, now) };
}
__name(cachedHealth, "cachedHealth");
function expiredHealth(base, now) {
  return { ...base, valid: false, checkedAt: toIso(now), reason: "expired" };
}
__name(expiredHealth, "expiredHealth");
function getCachedDoubanCookieHealth(config) {
  const now = Date.now();
  const { cookie, expiresAtMs, health } = snapshot(config, now);
  if (!cookie) return health;
  if (expiresAtMs !== null && now >= expiresAtMs) return expiredHealth(health, now);
  return cachedHealth(cookie, expiresAtMs, now) ?? health;
}
__name(getCachedDoubanCookieHealth, "getCachedDoubanCookieHealth");
function classifyMineResponse(status, location, html) {
  if (status >= 300 && status < 400) {
    if (location.includes("accounts.douban.com")) return { valid: false, reason: "login" };
    if (location.includes("sec.douban.com")) return { valid: null, reason: "blocked" };
    return { valid: null, reason: `redirect:${status}` };
  }
  if (status === 200) {
    return html && isDoubanAntiBot(html) ? { valid: null, reason: "anti-bot" } : { valid: true };
  }
  if (isDoubanChallengeStatus(status)) return { valid: null, reason: "blocked" };
  return { valid: null, reason: `http:${status}` };
}
__name(classifyMineResponse, "classifyMineResponse");
async function checkDoubanCookie(client, config, options = {}) {
  const now = Date.now();
  const { cookie, expiresAtMs, health: base } = snapshot(config, now);
  if (!cookie) return base;
  await notifyDoubanCookieExpiry(config);
  if (expiresAtMs !== null && now >= expiresAtMs) {
    return remember(cookie, expiredHealth(base, now), now);
  }
  if (!options.force) {
    const cached = cachedHealth(cookie, expiresAtMs, now);
    if (cached) return cached;
  }
  if (inflight) return inflight;
  const check = /* @__PURE__ */ __name(async () => {
    const stamped = { ...base, checkedAt: toIso(Date.now()) };
    let health;
    try {
      const response = await client.request("https://www.douban.com/mine/", {
        timeoutMs: Math.min(config.requestTimeoutMs, 8e3),
        headers: buildDoubanHeaders(getDoubanCookieJar(config)),
        redirect: "manual"
      });
      const html = response.status === 200 ? await response.text() : void 0;
      health = {
        ...stamped,
        ...classifyMineResponse(response.status, response.headers.get("location") ?? "", html)
      };
    } catch (error) {
      health = { ...stamped, valid: null, reason: "network" };
      if (isTransientUpstreamError(error)) {
        if (!loggedTransientHealthFailure) {
          loggedTransientHealthFailure = true;
          console.info(
            "[douban] Cookie \u5065\u5EB7\u68C0\u67E5\u6682\u65F6\u65E0\u6CD5\u8FDE\u4E0A\u8C46\u74E3\uFF08\u8D85\u65F6\u6216\u7F51\u7EDC\uFF09\uFF0C\u6309\u672A\u786E\u8BA4\u5904\u7406\uFF0C\u4E0D\u5F71\u54CD\u542F\u52A8"
          );
        }
      } else {
        console.warn("[douban] Cookie \u5065\u5EB7\u68C0\u67E5\u5931\u8D25:", error instanceof Error ? error.message : error);
      }
    }
    return remember(cookie, health);
  }, "check");
  inflight = check().finally(() => {
    inflight = null;
  });
  return inflight;
}
__name(checkDoubanCookie, "checkDoubanCookie");
function markDoubanCookieInvalid(config, reason = "login") {
  const now = Date.now();
  const { cookie, health } = snapshot(config, now);
  const invalid = { ...health, valid: false, checkedAt: toIso(now), reason };
  if (cookie) remember(cookie, invalid, now);
  return invalid;
}
__name(markDoubanCookieInvalid, "markDoubanCookieInvalid");
function expiredMessage(health) {
  const expires = health.expiresAt ? `\uFF08\u8FC7\u671F\u65F6\u95F4 ${health.expiresAt}\uFF09` : "";
  if (health.reason === "expired") return `DOUBAN_COOKIE \u5DF2\u8FC7\u671F${expires}\uFF0C\u8BF7\u66F4\u65B0 DOUBAN_COOKIE`;
  if (health.reason === "blocked") {
    return `DOUBAN_COOKIE \u65E0\u6CD5\u786E\u8BA4\uFF08\u8C46\u74E3\u8981\u6C42\u9A8C\u8BC1\uFF0C\u53EF\u80FD\u5DF2\u5931\u6548\u6216\u51FA\u53E3 IP \u88AB\u98CE\u63A7\uFF09${expires}\uFF0C\u8BF7\u91CD\u65B0\u5BFC\u51FA\u6216\u68C0\u67E5\u51FA\u53E3`;
  }
  return `DOUBAN_COOKIE \u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u4ECE\u6D4F\u89C8\u5668\u5BFC\u51FA${expires}`;
}
__name(expiredMessage, "expiredMessage");
async function assertDoubanCookieUsable(client, config) {
  if (!config.doubanCookie?.trim()) return;
  const health = await checkDoubanCookie(client, config);
  if (health.reason === "network") {
    throw ApiError.upstreamTimeout(
      "\u5F53\u524D\u51FA\u53E3\u65E0\u6CD5\u8FDE\u4E0A\u8C46\u74E3\uFF08\u8D85\u65F6\u6216\u7F51\u7EDC\u4E2D\u65AD\uFF09\uFF0C\u8BE6\u60C5\u8BF7\u6C42\u5DF2\u4E2D\u6B62\u4EE5\u514D\u88AB\u9762\u677F\u53CD\u4EE3\u6390\u6210 502",
      {
        reason: "network",
        hint: "bot-hosting \u7B49\u673A\u623F\u51FA\u53E3\u5E38\u8BBF\u95EE\u4E0D\u4E86\u8C46\u74E3\uFF1B\u8BF7\u914D\u7F6E DOUBAN_BACKEND_URL \u7531\u80FD\u8BBF\u95EE\u8C46\u74E3\u7684\u673A\u5668\u4EE3\u53D6"
      }
    );
  }
  if (health.valid !== false) return;
  throwDoubanCookieExpired(health.reason ?? "login", expiredMessage(health), {
    expiresAt: health.expiresAt,
    checkedAt: health.checkedAt
  });
}
__name(assertDoubanCookieUsable, "assertDoubanCookieUsable");

// src/lib/source.ts
var PATTERNS = [
  { site: "douban_book", regex: /book\.douban\.com\/subject\/(\d+)/i },
  { site: "douban", regex: /movie\.douban\.com\/subject\/(\d+)/i },
  { site: "douban", regex: /douban\.com\/movie\/subject\/(\d+)/i },
  { site: "douban", regex: /douban\.com\/(?:movie|subject)\/(\d+)/i },
  { site: "imdb", regex: /imdb\.com\/title\/(tt\d+)/i },
  { site: "imdb", regex: /^(tt\d{7,9})$/i },
  { site: "bangumi", regex: /(?:bgm\.tv|bangumi\.tv)\/subject\/(\d+)/i },
  { site: "tmdb", regex: /themoviedb\.org\/(movie|tv)\/(\d+)/i, group: 2 },
  { site: "trakt", regex: /trakt\.tv\/(movies|shows)\/([^/?#]+)/i, group: 2 },
  { site: "steam", regex: /store\.steampowered\.com\/app\/(\d+)/i },
  { site: "melon", regex: /melon\.com\/album\/(?:detail\.htm\?albumId=)?(\d+)/i },
  { site: "qq_music", regex: /y\.qq\.com\/n\/ryqq(?:_v\d+)?\/albumDetail\/(\w+)/i },
  { site: "hongguo", regex: /(?:novelquickapp\.com|hongguo)\S*/i }
];
function detectSource(input) {
  const value = input.trim();
  if (!value) return null;
  for (const pattern of PATTERNS) {
    const match2 = value.match(pattern.regex);
    if (!match2) continue;
    if (pattern.site === "tmdb") {
      return {
        site: "tmdb",
        sid: match2[2],
        type: match2[1].toLowerCase() === "tv" ? "tv" : "movie"
      };
    }
    if (pattern.site === "trakt") {
      return {
        site: "trakt",
        sid: match2[2],
        type: match2[1].toLowerCase() === "shows" ? "show" : "movie"
      };
    }
    if (pattern.site === "hongguo") {
      return { site: "hongguo", sid: value };
    }
    return { site: pattern.site, sid: match2[pattern.group ?? 1] };
  }
  return null;
}
__name(detectSource, "detectSource");
function resolveSid(site, input) {
  const value = input.trim();
  if (site === "tmdb" || site === "trakt") {
    const prefixed = value.match(/^(movie|tv|show|movies|shows)[:/](.+)$/i);
    if (prefixed) {
      const rawType = prefixed[1].toLowerCase();
      const type = site === "tmdb" ? rawType === "tv" || rawType === "show" ? "tv" : "movie" : rawType === "show" || rawType === "shows" || rawType === "tv" ? "show" : "movie";
      return { sid: prefixed[2].trim(), type };
    }
  }
  const detected = detectSource(value);
  if (detected && detected.site === site) {
    return { sid: detected.sid, type: detected.type };
  }
  return { sid: value };
}
__name(resolveSid, "resolveSid");

// src/lib/sites.ts
var RESOURCE_SITES = [
  "douban",
  "douban_book",
  "imdb",
  "bangumi",
  "tmdb",
  "trakt",
  "steam",
  "melon",
  "hongguo",
  "qq_music"
];
var SITE_ALIASES = {
  douban: "douban",
  douban_movie: "douban",
  movie: "douban",
  douban_book: "douban_book",
  book: "douban_book",
  imdb: "imdb",
  bangumi: "bangumi",
  bgm: "bangumi",
  tmdb: "tmdb",
  trakt: "trakt",
  steam: "steam",
  melon: "melon",
  hongguo: "hongguo",
  qq_music: "qq_music",
  qqmusic: "qq_music",
  qq: "qq_music"
};
function normalizeSite(raw2) {
  const value = (raw2 ?? "").trim().toLowerCase().replace(/-/g, "_");
  return SITE_ALIASES[value] ?? null;
}
__name(normalizeSite, "normalizeSite");
function isResourceSite(site) {
  return site !== null && RESOURCE_SITES.includes(site);
}
__name(isResourceSite, "isResourceSite");
var SEARCHABLE_SITES = /* @__PURE__ */ new Set(["douban", "imdb", "bangumi", "steam", "tmdb", "trakt"]);
var TYPED_SITES = /* @__PURE__ */ new Set(["tmdb", "trakt"]);
var EXAMPLES = {
  douban: "1292052",
  douban_book: "1084336",
  imdb: "tt0111161",
  bangumi: "414801",
  tmdb: "13",
  trakt: "the-matrix-1999",
  steam: "1245620"
};
var SITE_DESCRIPTORS = RESOURCE_SITES.map((id) => ({
  id,
  aliases: Object.entries(SITE_ALIASES).filter(([alias, site]) => site === id && alias !== id).map(([alias]) => alias),
  search: SEARCHABLE_SITES.has(id),
  typed: TYPED_SITES.has(id),
  example: EXAMPLES[id] ?? ""
}));

// src/imdb/lookup.ts
function imdbTitleLink(imdbId) {
  return imdbId ? `https://www.imdb.com/title/${imdbId}/` : "";
}
__name(imdbTitleLink, "imdbTitleLink");
var BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
var INFO_PAGE = "https://www.douban.com/doubanapp/h5/movie/";
var INFO_PAGE_HEADERS = {
  "user-agent": BROWSER_UA,
  accept: "text/html,application/xhtml+xml",
  "accept-language": "zh-CN,zh;q=0.9"
};
function parseImdbRow(html) {
  const row = /<td>\s*IMDb\s*<\/td>\s*<td>([\s\S]{0,200}?)<\/td>/i.exec(html);
  if (!row) return "";
  const match2 = /tt\d{5,9}/.exec(row[1]);
  return match2 ? match2[0] : "";
}
__name(parseImdbRow, "parseImdbRow");
async function fetchDoubanImdbId(client, config, sid) {
  if (!/^\d+$/.test(sid)) return "";
  const response = await client.request(`${INFO_PAGE}${sid}/desc`, {
    // 反查是加分项，超时要比主流程短，避免拖慢详情接口
    timeoutMs: Math.min(config.requestTimeoutMs, 8e3),
    headers: INFO_PAGE_HEADERS,
    redirect: "follow"
  });
  if (!response.ok) return "";
  return parseImdbRow(await response.text());
}
__name(fetchDoubanImdbId, "fetchDoubanImdbId");
var RATING_ENDPOINT = "https://p.media-imdb.com/static-content/documents/v1/title";
var RATING_HEADERS = {
  "user-agent": BROWSER_UA,
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9"
};
function parseJsonpPayload(text2) {
  const start = text2.indexOf("{");
  const end = text2.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text2.slice(start, end + 1));
  } catch {
    return null;
  }
}
__name(parseJsonpPayload, "parseJsonpPayload");
async function fetchImdbRating(client, config, imdbId) {
  if (hasImdbBackend(config)) {
    return fetchRatingViaBackend(client, config, imdbId);
  }
  const response = await client.request(
    `${RATING_ENDPOINT}/${encodeURIComponent(imdbId)}/ratings%3Fjsonp=imdb.rating.run:imdb.api.title.ratings/data.json`,
    {
      // 评分是加分项，超时要比主流程短
      timeoutMs: Math.min(config.requestTimeoutMs, 8e3),
      headers: RATING_HEADERS
    }
  );
  if (!response.ok) return null;
  const payload = parseJsonpPayload(await response.text());
  const rating = Number(payload?.resource?.rating) || 0;
  const votes = Number(payload?.resource?.ratingCount) || 0;
  return rating > 0 ? { rating, votes } : null;
}
__name(fetchImdbRating, "fetchImdbRating");
function formatImdbRating(rating) {
  if (!rating) {
    return { average: "0.0", votes: "0", formatted: emptyUserRating() };
  }
  const average = rating.rating.toFixed(1);
  return {
    average,
    votes: String(rating.votes),
    formatted: formatUserRating(average, rating.votes)
  };
}
__name(formatImdbRating, "formatImdbRating");
async function resolveImdbRating(client, config, imdbId, logLabel) {
  if (!imdbId || !canUseImdb(config)) return formatImdbRating(null);
  const rating = await fetchImdbRating(client, config, imdbId).catch((error) => {
    console.warn(`[${logLabel}] IMDb \u8BC4\u5206\u83B7\u53D6\u5931\u8D25:`, error instanceof Error ? error.message : error);
    return null;
  });
  return formatImdbRating(rating);
}
__name(resolveImdbRating, "resolveImdbRating");
async function enrichDoubanImdb(client, config, data) {
  if (!data.imdb_id) {
    data.imdb_id = await fetchDoubanImdbId(client, config, data.sid).catch((error) => {
      console.warn("[douban] IMDb ID \u83B7\u53D6\u5931\u8D25:", error instanceof Error ? error.message : error);
      return "";
    });
  }
  if (!data.imdb_id) return;
  data.imdb_link = imdbTitleLink(data.imdb_id);
  if (!canUseImdb(config)) return;
  const formatted = await resolveImdbRating(client, config, data.imdb_id, "douban");
  data.imdb_rating_average = formatted.average;
  data.imdb_votes = formatted.votes;
  data.imdb_rating = formatted.formatted;
}
__name(enrichDoubanImdb, "enrichDoubanImdb");

// src/douban/subject.ts
async function fetchDoubanPage(client, config, url) {
  const jar = getDoubanCookieJar(config);
  const response = await client.request(url, {
    timeoutMs: config.requestTimeoutMs,
    headers: buildDoubanHeaders(jar),
    redirect: "manual"
  });
  const location = response.headers.get("location") ?? void 0;
  const html = await response.text();
  if (isDoubanBlockedRedirect(response.status, location) && (location ?? "").includes("accounts.douban.com")) {
    if (config.doubanCookie?.trim()) {
      markDoubanCookieInvalid(config, "login");
      throwDoubanCookieExpired("login", "DOUBAN_COOKIE \u5DF2\u5931\u6548\uFF08\u8C46\u74E3\u91CD\u5B9A\u5411\u5230\u767B\u5F55\u9875\uFF09\uFF0C\u8BF7\u91CD\u65B0\u5BFC\u51FA");
    }
    throw new ApiError("UPSTREAM_BLOCKED", "\u8C46\u74E3\u8981\u6C42\u767B\u5F55\uFF0C\u5DF2\u7981\u7528\u81EA\u52A8\u6311\u6218\uFF1B\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u6216 DOUBAN_BACKEND_URL", {
      retryable: true,
      retryAfterSeconds: 60,
      details: { hint: "DOUBAN_COOKIE=bid=...; dbsawcv1=..." }
    });
  }
  if (isDoubanBlockedRedirect(response.status, location)) {
    if (config.doubanCookie?.trim()) {
      markDoubanCookieInvalid(config, "blocked");
      throwDoubanCookieExpired(
        "blocked",
        "DOUBAN_COOKIE \u53EF\u80FD\u5DF2\u5931\u6548\uFF0C\u6216\u5F53\u524D\u51FA\u53E3 IP \u88AB\u8C46\u74E3\u98CE\u63A7\uFF1B\u8BF7\u91CD\u65B0\u5BFC\u51FA Cookie \u6216\u66F4\u6362\u51FA\u53E3",
        { hint: "\u91CD\u65B0\u767B\u5F55\u8C46\u74E3\u540E\u590D\u5236 Cookie\uFF1B\u5982\u679C Cookie \u4ECD\u6709\u6548\uFF0C\u8BF7\u68C0\u67E5\u51FA\u53E3 IP \u6216\u914D\u7F6E DOUBAN_BACKEND_URL" }
      );
    }
    throw new ApiError("UPSTREAM_BLOCKED", "\u8C46\u74E3\u8981\u6C42\u9A8C\u8BC1\uFF0C\u5DF2\u7981\u7528\u81EA\u52A8\u6311\u6218\uFF1B\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u6216 DOUBAN_BACKEND_URL", {
      retryable: true,
      retryAfterSeconds: 60,
      details: { hint: "DOUBAN_COOKIE=bid=...; dbsawcv1=..." }
    });
  }
  if (response.status === 404) {
    throw ApiError.notFound(DOUBAN_NOT_FOUND);
  }
  if (isDoubanChallengeStatus(response.status) || isDoubanChallengePage(html) || isDoubanAntiBot(html)) {
    if (config.doubanCookie?.trim()) {
      markDoubanCookieInvalid(config, "blocked");
      throwDoubanCookieExpired(
        "blocked",
        `DOUBAN_COOKIE \u53EF\u80FD\u5DF2\u5931\u6548\uFF0C\u6216\u5F53\u524D\u51FA\u53E3 IP \u88AB\u8C46\u74E3\u98CE\u63A7\uFF08HTTP ${response.status}\uFF09\uFF1B\u8BF7\u91CD\u65B0\u5BFC\u51FA Cookie \u6216\u66F4\u6362\u51FA\u53E3`,
        {
          status: response.status,
          hint: "\u4E91\u4E3B\u673A / \u9762\u677F\u670D\u7684\u51FA\u53E3\u5E38\u89C1\u88AB\u8C46\u74E3\u76F4\u63A5 403\uFF1B\u5982\u6709\u5FC5\u8981\u914D\u7F6E DOUBAN_BACKEND_URL \u6216\u4EE3\u7406"
        }
      );
    }
    throw new ApiError(
      "UPSTREAM_BLOCKED",
      `\u8C46\u74E3\u62D2\u7EDD\u4E86\u8BF7\u6C42\uFF08HTTP ${response.status}\uFF09\uFF0C\u5F53\u524D\u51FA\u53E3\u672A\u901A\u8FC7\u98CE\u63A7\uFF1B\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u6216 DOUBAN_BACKEND_URL`,
      {
        retryable: true,
        retryAfterSeconds: 60,
        details: { status: response.status, hint: "DOUBAN_COOKIE=bid=...; dbsawcv1=..." }
      }
    );
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u8C46\u74E3\u8FD4\u56DE HTTP ${response.status}`, { url, status: response.status });
  }
  return html;
}
__name(fetchDoubanPage, "fetchDoubanPage");
function splitSlash(value) {
  return value.split(" / ").map((item) => item.trim()).filter(Boolean);
}
__name(splitSlash, "splitSlash");
function readInfoField(labels, labelTexts, key) {
  const index = labelTexts.findIndex((text2) => text2.startsWith(key));
  if (index < 0) return "";
  return labels.map((label) => label.nextSiblingText())[index] ?? "";
}
__name(readInfoField, "readInfoField");
function parseJsonLd($) {
  const script = $.select("script").attr('type="application/ld+json"').first();
  const raw2 = script.text();
  if (!raw2?.trim()) return {};
  try {
    const cleaned = raw2.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    const data = JSON.parse(cleaned);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}
__name(parseJsonLd, "parseJsonLd");
function parseRating($, ldJson) {
  const rating = ldJson?.aggregateRating;
  const rawAverage = rating?.ratingValue ?? $.select("div").attr('id="interest_sectl"').select("strong").class("rating_num").trimmedText();
  const rawVotes = rating?.ratingCount ?? $.select("span").attr('property="v:votes"').trimmedText();
  const average = Number.parseFloat(String(rawAverage).replace(/[^\d.]/g, "")) || 0;
  const votes = Number.parseInt(String(rawVotes).replace(/\D/g, ""), 10) || 0;
  if (average < 0 || average > 10 || votes < 0) {
    return { average: "0.0", votes: "0", formatted: emptyUserRating() };
  }
  const formattedAverage = average.toFixed(1);
  return {
    average: formattedAverage,
    votes: String(votes),
    formatted: formatUserRating(formattedAverage, votes)
  };
}
__name(parseRating, "parseRating");
function parseDoubanSubject(html, sid) {
  if (isDoubanAntiBot(html)) {
    throw new ApiError("UPSTREAM_BLOCKED", DOUBAN_ANTI_BOT, { retryable: true, retryAfterSeconds: 60 });
  }
  if (isDoubanNotFound(html)) {
    throw ApiError.notFound(DOUBAN_NOT_FOUND);
  }
  const $ = DomQuery.load(html);
  const ldJson = parseJsonLd($);
  const pageTitle = $.select("title").text().trim();
  const chineseTitle = pageTitle.replace(/\(豆瓣\)\s*$/, "").trim();
  const itemReviewed = $.select("span").attr('property="v:itemreviewed"').trimmedText();
  const foreignTitle = cleanDoubanText(itemReviewed.replace(chineseTitle, ""));
  const displayTitle = chineseTitle || itemReviewed;
  const yearText = $.select("h1").select("span").class("year").trimmedText();
  const year = yearText.match(/\d{4}/)?.[0] ?? "";
  const info = $.select("div").attr('id="info"');
  const labels = info.select("span").class("pl");
  const labelTexts = labels.map((label) => label.trimmedText());
  const genre = $.select("span").attr('property="v:genre"').texts();
  const playdate = $.select("span").attr('property="v:initialReleaseDate"').texts();
  const introduction = (() => {
    const full = $.select("span").class("all.hidden").texts()[0];
    const short = $.select("span").attr('property="v:summary"').texts()[0];
    const raw2 = full || short || "";
    return raw2.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/\.\.\.$/, "").trim()).filter(Boolean).join("\n");
  })();
  const tags = $.select("div").class("tags-body").select("a").texts();
  const poster = ldJson.image ? String(ldJson.image).replace(/s(_ratio_poster|pic)/g, "l$1").replace("img3", "img1").replace(/\.webp$/, ".jpg") : "";
  const rating = parseRating($, ldJson);
  const imdbText = readInfoField(labels, labelTexts, "IMDb");
  const imdbId = /^tt\d+$/.test(imdbText) ? imdbText : "";
  return {
    link: `https://movie.douban.com/subject/${sid}/`,
    chinese_title: displayTitle,
    foreign_title: foreignTitle,
    year,
    aka: splitSlash(readInfoField(labels, labelTexts, "\u53C8\u540D")).sort(),
    region: splitSlash(readInfoField(labels, labelTexts, "\u5236\u7247\u56FD\u5BB6/\u5730\u533A")),
    genre,
    language: splitSlash(readInfoField(labels, labelTexts, "\u8BED\u8A00")),
    playdate,
    episodes: readInfoField(labels, labelTexts, "\u96C6\u6570"),
    duration: readInfoField(labels, labelTexts, "\u5355\u96C6\u7247\u957F") || readInfoField(labels, labelTexts, "\u7247\u957F") || $.select("span").attr('property="v:runtime"').trimmedText(),
    introduction,
    poster,
    tags,
    douban_rating_average: rating.average,
    douban_votes: rating.votes,
    douban_rating: rating.formatted,
    imdb_id: imdbId,
    imdb_link: imdbId ? `https://www.imdb.com/title/${imdbId}/` : "",
    // 没有 IMDb ID 时保持空值，避免格式化时输出「0.0 / 10 from 0 users」
    imdb_rating_average: imdbId ? "0.0" : "",
    imdb_votes: imdbId ? "0" : "",
    imdb_rating: imdbId ? emptyUserRating() : ""
  };
}
__name(parseDoubanSubject, "parseDoubanSubject");
function extractCelebrities($, section) {
  const wrappers = $.select("div").class("list-wrapper");
  for (const wrapper of wrappers.map((item) => item)) {
    const heading = wrapper.select("h2").first().trimmedText();
    if (!heading.includes(section)) continue;
    const result = [];
    wrapper.class("celebrity").map((celebrity) => {
      const anchors = celebrity.select("a").map((anchor) => ({
        text: anchor.trimmedText(),
        href: anchor.getAttr("href") ?? ""
      }));
      const person = anchors.find((anchor) => anchor.text && anchor.href.includes("/personage/")) ?? anchors.find((anchor) => anchor.text);
      if (!person) return null;
      const styleText = celebrity.select("div").class("avatar").getAttr("style") ?? "";
      const image = styleText.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1] ?? "";
      const { role, character } = parseDoubanRole(
        celebrity.select("span").class("role").trimmedText(),
        section
      );
      result.push({
        name: person.text,
        link: person.href,
        role,
        image,
        character
      });
      return null;
    });
    if (result.length > 0) return dedupeCelebrities(result);
  }
  return [];
}
__name(extractCelebrities, "extractCelebrities");
var LOGIN_BLOCKED_COOLDOWN_MS = 10 * 60 * 1e3;
var loginBlockedUntil = 0;
function isLoginBlocked(error) {
  return isApiError(error) && (error.symbol === "UPSTREAM_BLOCKED" || error.symbol === "DOUBAN_COOKIE_EXPIRED" || error.message.includes("01004"));
}
__name(isLoginBlocked, "isLoginBlocked");
function isNotFound2(error) {
  return isApiError(error) && error.symbol === "NOT_FOUND";
}
__name(isNotFound2, "isNotFound");
async function fetchDoubanSubject(client, config, sid, options) {
  const baseLink = `https://movie.douban.com/subject/${encodeURIComponent(sid)}/`;
  if (hasDoubanBackend(config)) {
    try {
      const data2 = await fetchDoubanSubjectViaBackend(client, config, sid, options);
      if (data2.imdb_id && data2.imdb_rating_average === "0.0") {
        await enrichDoubanImdb(client, config, data2).catch(() => void 0);
      }
      return data2;
    } catch (error) {
      if (isNotFound2(error)) throw error;
      console.warn(
        "[douban] \u5916\u90E8\u540E\u7AEF\u5931\u8D25\uFF0C\u4E0D\u518D\u56DE\u9000\u8C46\u74E3\u7F51\u9875\u901A\u9053:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }
  await assertDoubanCookieUsable(client, config);
  if (Date.now() < loginBlockedUntil) {
    throw new ApiError(
      "UPSTREAM_BLOCKED",
      "\u8C46\u74E3\u7F51\u9875\u901A\u9053\u6682\u65F6\u88AB\u98CE\u63A7\uFF0C\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u6216 DOUBAN_BACKEND_URL \u540E\u91CD\u8BD5",
      {
        retryable: true,
        retryAfterSeconds: 60,
        details: { hint: "DOUBAN_COOKIE=bid=...; dbsawcv1=..." }
      }
    );
  }
  let html;
  try {
    html = await fetchDoubanPage(client, config, baseLink);
  } catch (error) {
    if (isLoginBlocked(error)) loginBlockedUntil = Date.now() + LOGIN_BLOCKED_COOLDOWN_MS;
    console.warn("[douban] \u7F51\u9875\u901A\u9053\u5931\u8D25:", error instanceof Error ? error.message : error);
    throw error;
  }
  let parsed;
  try {
    parsed = parseDoubanSubject(html, sid);
  } catch (error) {
    if (isLoginBlocked(error)) loginBlockedUntil = Date.now() + LOGIN_BLOCKED_COOLDOWN_MS;
    if (config.doubanCookie?.trim() && isApiError(error) && error.symbol === "UPSTREAM_BLOCKED" && error.message === DOUBAN_ANTI_BOT) {
      markDoubanCookieInvalid(config, "anti-bot");
      throwDoubanCookieExpired("anti-bot", "DOUBAN_COOKIE \u53EF\u80FD\u5DF2\u5931\u6548\uFF08\u8C46\u74E3\u8FD4\u56DE\u53CD\u722C\u9875\uFF09\uFF0C\u8BF7\u91CD\u65B0\u5BFC\u51FA\u6216\u68C0\u67E5\u51FA\u53E3 IP");
    }
    console.warn("[douban] \u9875\u9762\u4E3A\u53CD\u722C\u9875:", error instanceof Error ? error.message : error);
    throw error;
  }
  const data = {
    success: true,
    site: "douban",
    sid,
    ...parsed,
    director: [],
    writer: [],
    cast: [],
    awards: []
  };
  if (!options.full) {
    await enrichDoubanImdb(client, config, data);
    return data;
  }
  const detailsHeaders = baseLink;
  const imdbPromise = enrichDoubanImdb(client, config, data);
  const [celebrities, awards] = await Promise.all([
    fetchCelebrities(client, config, baseLink, detailsHeaders).catch((error) => {
      console.warn("[douban] \u6F14\u804C\u5458\u83B7\u53D6\u5931\u8D25:", error instanceof Error ? error.message : error);
      return { director: [], writer: [], cast: [] };
    }),
    fetchAwards(client, config, baseLink).catch((error) => {
      console.warn("[douban] \u5956\u9879\u83B7\u53D6\u5931\u8D25:", error instanceof Error ? error.message : error);
      return [];
    })
  ]);
  data.director = celebrities.director;
  data.writer = celebrities.writer;
  data.cast = selectDoubanCast(celebrities.cast, {
    lead: config.castLeadLimit,
    supporting: config.castSupportingLimit,
    voice: config.castVoiceLimit
  });
  data.awards = awards;
  await imdbPromise;
  return data;
}
__name(fetchDoubanSubject, "fetchDoubanSubject");
async function fetchCelebrities(client, config, baseLink, referer) {
  const jar = getDoubanCookieJar(config);
  const response = await client.request(`${baseLink}celebrities/`, {
    timeoutMs: config.requestTimeoutMs,
    headers: { ...buildDoubanHeaders(jar), referer },
    redirect: "follow"
  });
  if (isDoubanChallengeStatus(response.status)) {
    return { director: [], writer: [], cast: [] };
  }
  const html = await response.text();
  if (isDoubanChallengePage(html) || isDoubanAntiBot(html)) {
    return { director: [], writer: [], cast: [] };
  }
  if (response.status >= 400 && response.status < 500) {
    return { director: [], writer: [], cast: [] };
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u8C46\u74E3\u6F14\u804C\u5458\u9875\u8FD4\u56DE HTTP ${response.status}`);
  }
  const $ = DomQuery.load(html);
  return {
    director: extractCelebrities($, "\u5BFC\u6F14"),
    writer: extractCelebrities($, "\u7F16\u5267"),
    cast: extractCelebrities($, "\u6F14\u5458")
  };
}
__name(fetchCelebrities, "fetchCelebrities");
function parseAwards(html) {
  const $ = DomQuery.load(html);
  const sections = [];
  $.select("div").class("awards").map((section) => {
    const heading = section.select("div").class("hd").select("h2");
    const festival = heading.select("a").trimmedText();
    const year = heading.select("span").class("year").trimmedText();
    const name = cleanDoubanText(`${festival} ${year}`);
    if (!name) return null;
    const awards = [];
    section.select("ul").class("award").map((award) => {
      const items = award.select("li").texts();
      if (items.length >= 2) {
        const category = items[0];
        const winners = items[1];
        awards.push(winners ? `${category} ${winners}` : category);
      }
      return null;
    });
    if (awards.length > 0) sections.push({ festival: name, awards });
    return null;
  });
  return sections;
}
__name(parseAwards, "parseAwards");
async function fetchAwards(client, config, baseLink) {
  const jar = getDoubanCookieJar(config);
  const response = await client.request(`${baseLink}awards`, {
    timeoutMs: config.requestTimeoutMs,
    headers: { ...buildDoubanHeaders(jar), referer: baseLink },
    redirect: "follow"
  });
  if (response.status === 404) return [];
  if (isDoubanChallengeStatus(response.status)) return [];
  if (!response.ok) {
    throw ApiError.upstreamError(`\u8C46\u74E3\u5956\u9879\u9875\u8FD4\u56DE HTTP ${response.status}`);
  }
  const html = await response.text();
  if (isDoubanChallengePage(html) || isDoubanAntiBot(html)) return [];
  if (html.length < 1e3 || !html.includes("awards")) return [];
  return parseAwards(html);
}
__name(fetchAwards, "fetchAwards");

// src/providers/shared.ts
var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
async function requestJson(client, url, options) {
  const response = await client.request(url, {
    timeoutMs: options.config.requestTimeoutMs,
    method: options.method,
    body: options.body,
    headers: { accept: "application/json", "user-agent": DEFAULT_UA, ...options.headers ?? {} }
  });
  if (response.status === 404) {
    throw ApiError.notFound(`\u4E0A\u6E38\u672A\u627E\u5230\u8D44\u6E90: ${url}`);
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u4E0A\u6E38\u8FD4\u56DE HTTP ${response.status}`, {
      url,
      status: response.status
    });
  }
  const text2 = await response.text();
  try {
    return JSON.parse(text2);
  } catch {
    throw ApiError.upstreamError("\u4E0A\u6E38\u8FD4\u56DE\u7684\u4E0D\u662F\u5408\u6CD5 JSON", { url });
  }
}
__name(requestJson, "requestJson");
async function requestText(client, url, options) {
  const response = await client.request(url, {
    timeoutMs: options.config.requestTimeoutMs,
    method: options.method,
    body: options.body,
    redirect: options.redirect,
    headers: { "user-agent": DEFAULT_UA, ...options.headers ?? {} }
  });
  if (response.status === 404) {
    throw ApiError.notFound(`\u4E0A\u6E38\u672A\u627E\u5230\u8D44\u6E90: ${url}`);
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u4E0A\u6E38\u8FD4\u56DE HTTP ${response.status}`, {
      url,
      status: response.status
    });
  }
  return response.text();
}
__name(requestText, "requestText");
function text(value, fallback = "") {
  if (value === null || value === void 0) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  return String(value);
}
__name(text, "text");
function unique2(values) {
  return [...new Set(values.filter(Boolean))];
}
__name(unique2, "unique");
function providerData(site, sid, data) {
  return { success: true, site, sid, ...data };
}
__name(providerData, "providerData");
function assertId(value, pattern, site, example) {
  const trimmed = value.trim();
  if (!pattern.test(trimmed)) {
    throw new ApiError(
      "INVALID_SOURCE_ID",
      `${site} ID \u683C\u5F0F\u4E0D\u6B63\u786E: "${value}"\uFF0C\u793A\u4F8B: ${example}`
    );
  }
  return trimmed;
}
__name(assertId, "assertId");
function extractJsAssignmentJson(html, name) {
  const marker = html.indexOf(name);
  if (marker < 0) return null;
  const start = html.indexOf("{", marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        const raw2 = html.slice(start, i + 1);
        try {
          return JSON.parse(raw2);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
__name(extractJsAssignmentJson, "extractJsAssignmentJson");

// src/providers/bangumi.ts
var BGM_API_BASE = "https://api.bgm.tv/v0";
var BGM_HEADERS = {
  accept: "application/json",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  referer: "https://bgm.tv/"
};
var TYPE_MAP = {
  anime: "\u52A8\u753B",
  book: "\u4E66\u7C4D",
  game: "\u6E38\u620F",
  music: "\u97F3\u4E50",
  real: "\u4E09\u6B21\u5143",
  tv: "\u7535\u89C6",
  movie: "\u7535\u5F71",
  "1": "\u4E66\u7C4D",
  "2": "\u52A8\u753B",
  "3": "\u97F3\u4E50",
  "4": "\u6E38\u620F",
  "6": "\u4E09\u6B21\u5143"
};
function normalizeType(subject) {
  for (const field of ["type_name", "type_cn"]) {
    const value = subject?.[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const key = subject?.type;
  if (key === null || key === void 0) return "";
  return TYPE_MAP[String(key).trim().toLowerCase()] ?? String(key);
}
__name(normalizeType, "normalizeType");
function getInfoboxValue(infobox, key) {
  return infobox?.find((item) => item?.key === key)?.value;
}
__name(getInfoboxValue, "getInfoboxValue");
function infoboxArray(infobox, key) {
  const value = getInfoboxValue(infobox, key);
  if (Array.isArray(value)) {
    return value.map((item) => text(item?.v)).filter(Boolean);
  }
  return text(value);
}
__name(infoboxArray, "infoboxArray");
function staffInfo(infobox) {
  const director = infoboxArray(infobox, "\u5BFC\u6F14");
  const writer = infoboxArray(infobox, "\u811A\u672C");
  return {
    director: Array.isArray(director) ? director : director ? [director] : [],
    writer: Array.isArray(writer) ? writer : writer ? [writer] : []
  };
}
__name(staffInfo, "staffInfo");
async function fetchCharacters(client, config, sid) {
  try {
    return await requestJson(
      client,
      `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}/characters`,
      { config, headers: BGM_HEADERS }
    );
  } catch (error) {
    console.warn(
      `[bangumi] characters fetch failed for ${sid}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
__name(fetchCharacters, "fetchCharacters");
async function fetchBangumi(client, config, rawSid) {
  const sid = assertId(rawSid, /^\d+$/, "bangumi", "12345");
  const headers2 = { ...BGM_HEADERS };
  if (config.bangumiAccessToken) headers2.authorization = `Bearer ${config.bangumiAccessToken}`;
  const subject = await requestJson(
    client,
    `${BGM_API_BASE}/subjects/${encodeURIComponent(sid)}`,
    { config, headers: headers2 }
  );
  const characters = await fetchCharacters(client, config, sid);
  const infobox = Array.isArray(subject.infobox) ? subject.infobox : void 0;
  const score = subject.rating?.score ?? 0;
  const total = subject.rating?.total ?? 0;
  const date = text(subject.date);
  const year = date && !Number.isNaN(new Date(date).getTime()) ? date.slice(0, 4) : "";
  return providerData("bangumi", sid, {
    bgm_id: subject.id ?? sid,
    name: text(subject.name),
    name_cn: text(getInfoboxValue(infobox, "\u4E2D\u6587\u540D"), text(subject.name_cn)),
    link: `https://bangumi.tv/subject/${subject.id ?? sid}`,
    summary: text(subject.summary),
    poster: subject.images?.medium || subject.images?.common || "",
    platform: text(subject.platform),
    type: normalizeType(subject),
    eps: subject.eps || subject.total_episodes || "",
    tags: Array.isArray(subject.meta_tags) ? subject.meta_tags : [],
    characters,
    aka: infobox ? infoboxArray(infobox, "\u522B\u540D") : [],
    ...infobox ? staffInfo(infobox) : { director: [], writer: [] },
    bgm_rating_average: score,
    bgm_votes: total,
    bgm_rating: score ? `${score} / 10 from ${total} users` : "",
    date,
    year
  });
}
__name(fetchBangumi, "fetchBangumi");
var SEARCH_TYPE = {
  all: 0,
  book: 1,
  anime: 2,
  music: 3,
  game: 4,
  real: 6
};
async function searchBangumi(client, config, query, limit, type = "all") {
  const headers2 = { ...BGM_HEADERS, "content-type": "application/json" };
  if (config.bangumiAccessToken) headers2.authorization = `Bearer ${config.bangumiAccessToken}`;
  try {
    const body = { keyword: query };
    const filterType = SEARCH_TYPE[type] ?? 0;
    if (filterType > 0) body.filter = { type: [filterType] };
    const payload = await requestJson(client, `${BGM_API_BASE}/search/subjects?limit=${limit}`, {
      config,
      headers: headers2,
      method: "POST",
      body: JSON.stringify(body)
    });
    const items = Array.isArray(payload.data) ? payload.data : [];
    return items.slice(0, limit).map((item) => ({
      site: "bangumi",
      sid: String(item.id),
      title: text(item.name_cn, text(item.name)),
      subtitle: text(item.name),
      year: text(item.date).slice(0, 4),
      rating: item.rating?.score ?? "",
      poster: item.images?.medium || item.images?.common || "",
      url: `https://bangumi.tv/subject/${item.id}`
    }));
  } catch (error) {
    console.warn("[bangumi] v0 search failed, trying legacy search:", error instanceof Error ? error.message : error);
  }
  const legacy = await requestJson(
    client,
    `https://api.bgm.tv/search/subject/${encodeURIComponent(query)}?type=${SEARCH_TYPE[type] ?? 0}&responseGroup=small&max_results=${limit}`,
    { config, headers: BGM_HEADERS }
  );
  const list = Array.isArray(legacy.list) ? legacy.list : [];
  return list.slice(0, limit).map((item) => ({
    site: "bangumi",
    sid: String(item.id),
    title: text(item.name_cn, text(item.name)),
    subtitle: text(item.name),
    year: text(item.air_date).slice(0, 4),
    rating: item.rating?.score ?? "",
    poster: item.images?.medium || item.images?.common || "",
    url: `https://bangumi.tv/subject/${item.id}`
  }));
}
__name(searchBangumi, "searchBangumi");

// src/providers/steam.ts
var STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails";
var STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch/";
var MAX_SCREENSHOTS = 3;
function formatPrice(price) {
  if (!price || typeof price !== "object") return null;
  return {
    currency: text(price.currency),
    initial: typeof price.initial === "number" ? (price.initial / 100).toFixed(2) : null,
    final: typeof price.final === "number" ? (price.final / 100).toFixed(2) : null,
    discount: price.discount_percent || 0
  };
}
__name(formatPrice, "formatPrice");
async function fetchSteam(client, config, rawSid) {
  const sid = assertId(rawSid, /^\d+$/, "steam", "570");
  const payload = await requestJson(client, `${STEAM_APP_DETAILS_URL}?appids=${sid}&l=cn`, {
    config,
    headers: { "accept-language": "zh-CN,zh;q=0.9" }
  });
  const entry = payload?.[sid];
  if (!entry?.success || !entry.data) {
    throw new ApiError("UPSTREAM_ERROR", "Steam \u672A\u8FD4\u56DE\u5E94\u7528\u8BE6\u60C5");
  }
  const app2 = entry.data;
  const data = {
    name: text(app2.name, "N/A"),
    title: text(app2.name, "N/A"),
    type: text(app2.type, "N/A"),
    about_the_game: text(app2.about_the_game),
    header_image: text(app2.header_image),
    website: text(app2.website),
    developers: Array.isArray(app2.developers) ? app2.developers : [],
    publishers: Array.isArray(app2.publishers) ? app2.publishers : [],
    release_date: app2.release_date ? text(app2.release_date.date, "N/A") : "N/A",
    coming_soon: Boolean(app2.release_date?.coming_soon),
    supported_languages: text(app2.supported_languages),
    platforms: {
      windows: Boolean(app2.platforms?.windows),
      mac: Boolean(app2.platforms?.mac),
      linux: Boolean(app2.platforms?.linux)
    },
    categories: Array.isArray(app2.categories) ? app2.categories.map((item) => text(item.description)).filter(Boolean) : [],
    genres: Array.isArray(app2.genres) ? app2.genres.map((item) => text(item.description)).filter(Boolean) : [],
    pc_requirements: {
      minimum: text(app2.pc_requirements?.minimum),
      recommended: text(app2.pc_requirements?.recommended)
    },
    screenshots: Array.isArray(app2.screenshots) ? app2.screenshots.slice(0, MAX_SCREENSHOTS).map((shot) => ({
      id: shot.id,
      path_thumbnail: shot.path_thumbnail,
      path_full: shot.path_full
    })) : []
  };
  const price = formatPrice(app2.price_overview);
  if (price) data.price = price;
  return providerData("steam", sid, data);
}
__name(fetchSteam, "fetchSteam");
async function searchSteam(client, config, query, limit) {
  const url = `${STEAM_SEARCH_URL}?term=${encodeURIComponent(query)}&l=schinese&cc=CN`;
  const payload = await requestJson(client, url, { config });
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.slice(0, limit).map((item) => ({
    site: "steam",
    sid: String(item.id),
    title: text(item.name),
    subtitle: text(item.type),
    year: text(item.releasedate).slice(-4).trim(),
    rating: "",
    poster: item.tiny_image || item.image || "",
    url: `https://store.steampowered.com/app/${item.id}/`
  }));
}
__name(searchSteam, "searchSteam");

// src/providers/tmdb.ts
var TMDB_BASE = "https://api.themoviedb.org/3";
var IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
var TMDB_LANGUAGE = "zh-CN";
function auth(config, url) {
  const key = config.tmdbApiKey?.trim();
  if (!key) {
    throw new ApiError(
      "CONFIG_REQUIRED",
      "\u672A\u914D\u7F6E TMDB_API_KEY\uFF0C\u8BF7\u5728\u73AF\u5883\u53D8\u91CF\u4E2D\u586B\u5165 TMDB v3 API Key \u6216 v4 Read Access Token"
    );
  }
  if (key.startsWith("eyJ")) {
    return { url, headers: { authorization: `Bearer ${key}` } };
  }
  const parsed = new URL(url);
  parsed.searchParams.set("api_key", key);
  return { url: parsed.toString(), headers: {} };
}
__name(auth, "auth");
function positiveNumbers(values) {
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
}
__name(positiveNumbers, "positiveNumbers");
async function resolveEpisodeRuntime(client, config, sid, detail) {
  const direct = positiveNumbers(Array.isArray(detail.episode_run_time) ? detail.episode_run_time : []);
  if (direct.length) return direct.join(" / ");
  const seasons = Array.isArray(detail.seasons) ? detail.seasons : [];
  const seasonNumber = seasons.filter((season) => Number(season?.season_number) > 0 && Number(season?.episode_count) > 0).sort((a, b) => Number(a.season_number) - Number(b.season_number))[0]?.season_number;
  if (seasonNumber != null) {
    const target = auth(
      config,
      `${TMDB_BASE}/tv/${sid}/season/${seasonNumber}?language=${TMDB_LANGUAGE}`
    );
    const season = await requestJson(client, target.url, {
      config,
      headers: target.headers
    }).catch(() => null);
    const runtimes = positiveNumbers(
      Array.isArray(season?.episodes) ? season.episodes.map((episode) => episode?.runtime) : []
    );
    if (runtimes.length) {
      const average = runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length;
      return String(Math.round(average));
    }
  }
  const last = Number(detail.last_episode_to_air?.runtime);
  if (Number.isFinite(last) && last > 0) return String(last);
  const next = Number(detail.next_episode_to_air?.runtime);
  return Number.isFinite(next) && next > 0 ? String(next) : "";
}
__name(resolveEpisodeRuntime, "resolveEpisodeRuntime");
async function fetchTmdb(client, config, mediaTypeRaw, rawId) {
  const mediaType2 = mediaTypeRaw === "tv" || mediaTypeRaw === "show" ? "tv" : "movie";
  const sid = assertId(rawId, /^\d+$/, "tmdb", "550");
  const target = auth(
    config,
    `${TMDB_BASE}/${mediaType2}/${sid}?language=${TMDB_LANGUAGE}&append_to_response=credits,external_ids,translations,release_dates,content_ratings`
  );
  const detail = await requestJson(client, target.url, {
    config,
    headers: target.headers
  });
  const images = /* @__PURE__ */ __name((path) => typeof path === "string" && path ? `${IMAGE_BASE}${path}` : "", "images");
  const isMovie = mediaType2 === "movie";
  const title = text(detail.title, text(detail.name));
  const originalTitle = text(detail.original_title, text(detail.original_name));
  const releaseDate = text(detail.release_date, text(detail.first_air_date));
  const countries = Array.isArray(detail.production_countries) ? detail.production_countries.map((item) => text(item.name)).filter(Boolean) : [];
  const languages = Array.isArray(detail.spoken_languages) ? detail.spoken_languages.map((item) => text(item.name, text(item.english_name))).filter(Boolean) : [];
  const genres = Array.isArray(detail.genres) ? detail.genres.map((item) => text(item.name)).filter(Boolean) : [];
  const crew = Array.isArray(detail.credits?.crew) ? detail.credits.crew : [];
  const cast = Array.isArray(detail.credits?.cast) ? detail.credits.cast : [];
  const imdbId = text(detail.external_ids?.imdb_id, text(detail.imdb_id));
  const rating = typeof detail.vote_average === "number" && detail.vote_average > 0 ? `${detail.vote_average.toFixed(1)} / 10 from ${detail.vote_count ?? 0} users` : "";
  const episodeRuntime = isMovie ? "" : await resolveEpisodeRuntime(client, config, sid, detail);
  let imdbRating = "";
  let imdbAverage = 0;
  let imdbVotes = 0;
  if (imdbId) {
    const formatted = await resolveImdbRating(client, config, imdbId, "tmdb");
    imdbRating = formatted.formatted;
    imdbAverage = formatted.average;
    imdbVotes = formatted.votes;
  }
  return providerData("tmdb", sid, {
    tmdb_id: `${mediaType2}/${sid}`,
    media_type: mediaType2,
    title,
    original_title: originalTitle,
    poster: images(detail.poster_path),
    backdrop: images(detail.backdrop_path),
    overview: text(detail.overview),
    release_date: releaseDate,
    first_air_date: text(detail.first_air_date),
    year: releaseDate.slice(0, 4),
    runtime: isMovie ? text(detail.runtime) : "",
    episode_run_time: episodeRuntime,
    number_of_episodes: !isMovie ? detail.number_of_episodes : void 0,
    number_of_seasons: !isMovie ? detail.number_of_seasons : void 0,
    genres,
    languages,
    countries,
    tmdb_rating: rating,
    tmdb_rating_average: detail.vote_average ?? 0,
    tmdb_votes: detail.vote_count ?? 0,
    imdb_id: imdbId,
    imdb_link: imdbTitleLink(imdbId),
    imdb_rating: imdbRating,
    imdb_rating_average: imdbAverage,
    imdb_votes: imdbVotes,
    directors: crew.filter((item) => item.job === "Director"),
    producers: crew.filter((item) => item.job === "Producer"),
    writers: crew.filter((item) => ["Screenplay", "Writer", "Story"].includes(item.job)),
    cast: cast.slice(0, 15)
  });
}
__name(fetchTmdb, "fetchTmdb");
async function searchTmdb(client, config, query, limit) {
  const target = auth(
    config,
    `${TMDB_BASE}/search/multi?language=${TMDB_LANGUAGE}&query=${encodeURIComponent(query)}&include_adult=false`
  );
  const payload = await requestJson(client, target.url, {
    config,
    headers: target.headers
  });
  const results = Array.isArray(payload.results) ? payload.results : [];
  const images = /* @__PURE__ */ __name((path) => typeof path === "string" && path ? `${IMAGE_BASE}${path}` : "", "images");
  return results.filter((item) => item.media_type === "movie" || item.media_type === "tv").slice(0, limit).map((item) => ({
    site: "tmdb",
    sid: `${item.media_type === "tv" ? "tv" : "movie"}:${item.id}`,
    title: text(item.title, text(item.name)),
    subtitle: text(item.original_title, text(item.original_name)),
    year: text(item.release_date, text(item.first_air_date)).slice(0, 4),
    rating: typeof item.vote_average === "number" ? item.vote_average : "",
    poster: images(item.poster_path),
    url: `https://www.themoviedb.org/${item.media_type === "tv" ? "tv" : "movie"}/${item.id}`
  }));
}
__name(searchTmdb, "searchTmdb");

// src/providers/trakt.ts
var TRAKT_BASE = "https://api.trakt.tv";
var DIRECTOR_JOBS = /* @__PURE__ */ new Set(["director"]);
var WRITER_JOBS = /* @__PURE__ */ new Set(["writer", "screenplay", "story", "teleplay", "creator"]);
function headers(config, extra = {}) {
  const clientId = config.traktClientId?.trim();
  if (!clientId) {
    throw new ApiError(
      "CONFIG_REQUIRED",
      "\u672A\u914D\u7F6E TRAKT_API_CLIENT_ID\uFF1ATrakt \u5B98\u65B9 API \u5FC5\u987B\u5E26 Client ID\uFF0C\u8BF7\u5230 https://trakt.tv/oauth/applications \u521B\u5EFA\u5E94\u7528\u540E\u586B\u5165"
    );
  }
  const result = {
    "content-type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": clientId,
    ...extra
  };
  if (config.traktAccessToken) result.authorization = `Bearer ${config.traktAccessToken}`;
  return result;
}
__name(headers, "headers");
function mediaType(raw2) {
  const value = raw2.trim().toLowerCase();
  if (value === "movie" || value === "movies" || value === "film") return "movie";
  if (value === "show" || value === "shows" || value === "tv" || value === "series") return "show";
  throw new ApiError("INVALID_SOURCE_ID", `\u4E0D\u652F\u6301\u7684 Trakt \u7C7B\u578B: ${raw2}\uFF0C\u53EF\u9009 movie / show`);
}
__name(mediaType, "mediaType");
function normalizeId(raw2) {
  const id = raw2.trim();
  if (!id) throw new ApiError("INVALID_SOURCE_ID", "Trakt ID \u4E0D\u80FD\u4E3A\u7A7A");
  return id;
}
__name(normalizeId, "normalizeId");
function imageUrl(value) {
  const raw2 = text(value);
  if (!raw2) return "";
  if (raw2.startsWith("//")) return `https:${raw2}`;
  if (/^https?:\/\//i.test(raw2)) return raw2;
  return `https://${raw2.replace(/^\/+/, "")}`;
}
__name(imageUrl, "imageUrl");
function posterOf(item) {
  const poster = item?.images?.poster;
  if (typeof poster === "string") return imageUrl(poster);
  if (Array.isArray(poster)) return imageUrl(poster[0]);
  return imageUrl(poster?.full ?? poster?.thumb);
}
__name(posterOf, "posterOf");
function displayName(value, type) {
  const code = value.trim();
  if (!code) return "";
  const normalized = type === "region" ? code.toUpperCase() : code.toLowerCase();
  try {
    const DisplayNames = Intl.DisplayNames;
    const name = DisplayNames ? new DisplayNames(["en"], { type }).of(normalized) : void 0;
    if (name) return name;
  } catch {
  }
  return normalized;
}
__name(displayName, "displayName");
function dateOnly(value) {
  const raw2 = text(value);
  if (!raw2) return "";
  const ms = parseTimestampMs(raw2);
  return ms === null ? raw2 : toIso(ms).slice(0, 10);
}
__name(dateOnly, "dateOnly");
function personName(entry) {
  return text(entry?.person?.name, text(entry?.name));
}
__name(personName, "personName");
function pickCrew(entries, jobs) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => jobs.has(text(entry?.job).toLowerCase()));
}
__name(pickCrew, "pickCrew");
function links(item, type) {
  const ids = item?.ids ?? {};
  const slug = text(ids.slug);
  return {
    imdb_link: ids.imdb ? `https://www.imdb.com/title/${ids.imdb}/` : "",
    trakt_link: slug ? `https://trakt.tv/${type === "movie" ? "movies" : "shows"}/${slug}` : "",
    tmdb_link: ids.tmdb ? `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${ids.tmdb}` : "",
    tvdb_link: ids.tvdb ? `https://thetvdb.com/dereferrer/${type === "movie" ? "movie" : "series"}/${ids.tvdb}` : ""
  };
}
__name(links, "links");
async function fetchTrakt(client, config, typeRaw, rawId) {
  const type = mediaType(typeRaw);
  const id = normalizeId(rawId);
  const path = type === "movie" ? "movies" : "shows";
  const [detail, people2, seasonList] = await Promise.all([
    requestJson(client, `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}?extended=full,images`, {
      config,
      headers: headers(config)
    }),
    requestJson(
      client,
      `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}/people`,
      { config, headers: headers(config) }
    ).catch(() => ({})),
    type === "show" ? requestJson(
      client,
      `${TRAKT_BASE}/${path}/${encodeURIComponent(id)}/seasons?extended=full`,
      { config, headers: headers(config) }
    ).catch(() => []) : Promise.resolve([])
  ]);
  if (!detail?.title) {
    throw ApiError.notFound(`Trakt \u4E0A\u672A\u627E\u5230\u6761\u76EE ${id}`);
  }
  const year = detail.year ?? 0;
  const rating = typeof detail.rating === "number" && detail.rating > 0 ? `${detail.rating.toFixed(1)} / 10 from ${detail.votes ?? 0} users` : "";
  const seasons = Array.isArray(seasonList) ? seasonList.map((season) => ({
    number: season.number,
    episodeCount: season.episode_count ?? season.aired_episodes ?? 0
  })).filter((season) => typeof season.number === "number" && season.number > 0).sort((a, b) => a.number - b.number) : [];
  const crew = people2?.crew ?? {};
  const directors = pickCrew(crew.directing, DIRECTOR_JOBS);
  const writing = [
    ...Array.isArray(crew.writing) ? crew.writing : [],
    ...Array.isArray(crew["created by"]) ? crew["created by"] : []
  ];
  const writers = writing.filter(
    (entry) => WRITER_JOBS.has(text(entry?.job).toLowerCase())
  );
  const cast = Array.isArray(people2?.cast) ? people2.cast.slice(0, 10).map((entry) => ({
    name: personName(entry),
    character: text(
      entry?.character,
      Array.isArray(entry?.characters) ? entry.characters[0] : ""
    )
  })).filter((person) => Boolean(person.name)) : [];
  const peopleMap = {
    directors: unique2(directors.map(personName).filter(Boolean)),
    writers: unique2(writers.map(personName).filter(Boolean)),
    cast
  };
  const languages = unique2(
    (Array.isArray(detail.languages) ? detail.languages : detail.language ? [detail.language] : []).map((code) => displayName(text(code), "language")).filter(Boolean)
  );
  return providerData("trakt", id, {
    type: type === "movie" ? "movie" : "tv",
    title: text(detail.title),
    year,
    country: displayName(text(detail.country), "region"),
    language: languages,
    certification: text(detail.certification),
    runtime: detail.runtime ?? "",
    seasons,
    aired_episodes: detail.aired_episodes ?? 0,
    released: dateOnly(detail.released),
    first_aired: dateOnly(detail.first_aired),
    rating: detail.rating ?? 0,
    votes: detail.votes ?? 0,
    rating_format: rating,
    genres: Array.isArray(detail.genres) ? detail.genres : [],
    overview: text(detail.overview),
    poster: posterOf(detail),
    trakt_id: detail.ids?.trakt,
    slug: detail.ids?.slug,
    ...links(detail, type),
    people: peopleMap
  });
}
__name(fetchTrakt, "fetchTrakt");
async function searchTrakt(client, config, query, limit) {
  const payload = await requestJson(
    client,
    `${TRAKT_BASE}/search/movie,show?query=${encodeURIComponent(query)}&extended=full,images&limit=${limit}`,
    { config, headers: headers(config) }
  );
  const items = [];
  for (const entry of payload) {
    const media = entry.movie ?? entry.show;
    if (!media) continue;
    const type = entry.type === "show" ? "show" : "movie";
    const link = links(media, type);
    items.push({
      site: "trakt",
      sid: `${type}:${media.ids?.trakt ?? media.ids?.slug ?? media.title}`,
      title: text(media.title),
      subtitle: text(media.overview).slice(0, 120),
      year: text(media.year),
      rating: typeof media.rating === "number" ? media.rating : "",
      poster: posterOf(media),
      url: link.trakt_link
    });
  }
  return items.slice(0, limit);
}
__name(searchTrakt, "searchTrakt");

// src/providers/melon.ts
var MELON_ALBUM_URL = "https://www.melon.com/album/detail.htm";
var GENRE_TRANSLATIONS = {
  "\uBC1C\uB77C\uB4DC": "Ballad",
  "\uB304\uC2A4": "Dance",
  "\uB7A9/\uD799\uD569": "Rap / Hip-Hop",
  "R&B/Soul": "R&B / Soul",
  "\uC778\uB514\uC74C\uC545": "Indie",
  "\uB85D/\uBA54\uD0C8": "Rock / Metal",
  "\uD2B8\uB85C\uD2B8": "Trot",
  "\uD3EC\uD06C/\uBE14\uB8E8\uC2A4": "Folk / Blues",
  "\uC7AC\uC988": "Jazz",
  "\uC560\uC2DC\uB4DC/\uD4E8\uC804/\uD31D": "Acid / Fusion / Pop",
  "\uAC8C\uC784": "Games"
};
var ALBUM_TYPE_TRANSLATIONS = {
  "\uC815\uADDC": "\u6B63\u89C4\u4E13\u8F91",
  "\uC2F1\uAE00": "\u5355\u66F2",
  EP: "EP",
  OST: "OST"
};
function normalizePoster2(src) {
  if (!src) return "";
  let url = src.split("?")[0];
  const jpg = url.indexOf(".jpg");
  if (jpg !== -1) url = url.slice(0, jpg + 4);
  url = url.replace(/500\.jpg$/, "1000.jpg");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://www.melon.com${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}
__name(normalizePoster2, "normalizePoster");
function translateGenres(genres) {
  return genres.map((genre) => GENRE_TRANSLATIONS[genre] || genre);
}
__name(translateGenres, "translateGenres");
function firstByClass(root, classes) {
  for (const className of classes) {
    const found = root.select("div").class(className).first();
    if (found.length) return found;
    const span = root.select("span").class(className).first();
    if (span.length) return span;
  }
  return new DomQuery([]);
}
__name(firstByClass, "firstByClass");
function firstByClassIn(root, tag, className) {
  const found = root.select(tag).class(className).first();
  return found.length ? found : new DomQuery([]);
}
__name(firstByClassIn, "firstByClassIn");
function textWithBreaks(root) {
  const parts = [];
  const walk = /* @__PURE__ */ __name((node) => {
    const current = node;
    if (current.type === "text") {
      parts.push(current.data ?? "");
      return;
    }
    if (current.type !== "tag") return;
    if (current.name === "br") {
      parts.push("\n");
      return;
    }
    for (const child of current.children ?? []) walk(child);
  }, "walk");
  for (const node of root.all()) walk(node);
  return parts.join("").replace(/\r\n/g, "\n").trim();
}
__name(textWithBreaks, "textWithBreaks");
async function fetchMelon(client, config, rawSid) {
  const sid = assertId(rawSid, /^\d+$/, "melon", "10546051");
  const url = `${MELON_ALBUM_URL}?albumId=${sid}`;
  const html = await requestText(client, url, {
    config,
    headers: {
      accept: "text/html",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8"
    }
  });
  const root = DomQuery.load(html);
  const info = root.select("div").class("wrap_info").first();
  if (!info.length) {
    throw ApiError.upstreamError("\u65E0\u6CD5\u4ECE Melon \u9875\u9762\u627E\u5230\u4E13\u8F91\u4FE1\u606F");
  }
  const data = {
    melon_id: sid,
    melon_link: url
  };
  const gubun = firstByClass(info, ["gubun"]).trimmedText();
  const typeMatch = gubun.match(/\[(.*?)]/);
  if (typeMatch) {
    data.album_type = ALBUM_TYPE_TRANSLATIONS[typeMatch[1]] || typeMatch[1];
  } else {
    const clean = gubun.replace(/[[\]]/g, "").trim();
    if (clean) data.album_type = clean;
  }
  const songName = firstByClass(info, ["song_name"]).trimmedText();
  const title = songName.replace(/^앨범명\s*/i, "").trim();
  if (title) data.title = title;
  const artistLinks = info.select("a").map((link) => link).filter((link) => (link.getAttr("href") ?? "").includes("goArtistDetail"));
  const artists = unique2(artistLinks.map((link) => link.trimmedText()));
  if (artists.length) data.artists = artists;
  const metaBox = firstByClass(info, ["meta"]);
  const dl = metaBox.select("dl").first();
  const dts = dl.select("dt");
  const dds = dl.select("dd");
  const ddTexts = dds.map((dd) => dd.trimmedText());
  const meta = {};
  dts.map((dt, index) => {
    const label = dt.trimmedText();
    const value = ddTexts[index] ?? "";
    if (label) meta[label] = value;
    return null;
  });
  if (meta["\uBC1C\uB9E4\uC77C"]) data.release_date = meta["\uBC1C\uB9E4\uC77C"];
  if (meta["\uC7A5\uB974"]) {
    data.genres = translateGenres(
      meta["\uC7A5\uB974"].split(",").map((item) => item.trim()).filter(Boolean)
    );
  }
  if (meta["\uBC1C\uB9E4\uC0AC"]) data.publisher = meta["\uBC1C\uB9E4\uC0AC"];
  if (meta["\uAE30\uD68D\uC0AC"]) data.planning = meta["\uAE30\uD68D\uC0AC"];
  if (meta["\uC720\uD615"]) data.album_type = meta["\uC720\uD615"];
  const scoreText = root.select("span[id=gradPointLayer]").first().trimmedText();
  const score = Number(scoreText);
  if (Number.isFinite(score) && score > 0) {
    const countText = root.select("span[id=gradCountLayer]").first().trimmedText();
    const votes = countText.replace(/[^0-9]/g, "");
    data.rating = votes ? `${score.toFixed(1)} / 5 from ${Number(votes).toLocaleString("en-US")} users` : `${score.toFixed(1)} / 5`;
  }
  const poster = firstByClass(info, ["thumb"]).select("img").first();
  const posterSrc = poster.getAttr("src") ?? poster.getAttr("data-src") ?? "";
  const normalizedPoster = normalizePoster2(posterSrc);
  if (normalizedPoster) data.poster = normalizedPoster;
  const albumInfo = root.select("div").class("dtl_albuminfo").first();
  if (albumInfo.length) {
    const description = textWithBreaks(albumInfo);
    if (description) data.description = description;
  }
  const rows = root.select("tbody").select("tr");
  const tracks = [];
  rows.map((row) => {
    const number = firstByClassIn(row, "span", "rank").trimmedText().replace(/\D+/g, "") || firstByClassIn(row, "span", "no").trimmedText();
    if (!number && !row.select("a").length) return null;
    let trackTitle = "";
    const anchors = row.select("a").map((anchor) => anchor);
    for (const anchor of anchors) {
      const titleAttr = anchor.getAttr("title") ?? "";
      if (titleAttr.includes("\uC7AC\uC0DD") || titleAttr.includes("\uACE1\uC815\uBCF4")) {
        const match2 = titleAttr.match(/^(.*?)\s+(재생|곡정보)/);
        trackTitle = match2?.[1]?.trim() || anchor.trimmedText();
        if (trackTitle) break;
      }
    }
    if (!trackTitle) {
      const ellipsis = firstByClass(row, ["ellipsis"]);
      trackTitle = ellipsis.select("a").first().trimmedText() || firstByClassIn(row, "span", "song_name").trimmedText();
    }
    if (!trackTitle) return null;
    const trackArtists = unique2(
      anchors.filter((anchor) => (anchor.getAttr("href") ?? "").includes("goArtistDetail")).map((anchor) => anchor.trimmedText())
    );
    tracks.push({ number, title: trackTitle, artists: trackArtists });
    return null;
  });
  if (tracks.length) data.tracks = tracks;
  return providerData("melon", sid, data);
}
__name(fetchMelon, "fetchMelon");

// src/providers/hongguo.ts
var BASE_URL = "https://hongguoduanju.com";
var ALLOWED_HOSTS = ["hongguoduanju.com", "novelquickapp.com"];
var SHARE_PATH = /\/s\/([^/]+)\/?$/;
function resolveHongguoTarget(raw2) {
  const value = raw2.trim();
  if (!/^https?:\/\//i.test(value)) {
    return value.length > 15 ? { url: `${BASE_URL}/detail?series_id=${encodeURIComponent(value)}`, sid: value } : { url: `${BASE_URL}/s/${encodeURIComponent(value)}/`, sid: value };
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw ApiError.badRequest(`\u65E0\u6548\u7684\u7EA2\u679C\u94FE\u63A5: ${value}`);
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  if (!allowed) {
    throw ApiError.badRequest(`\u7EA2\u679C\u94FE\u63A5\u57DF\u540D\u4E0D\u53D7\u652F\u6301: ${host}`, { hosts: ALLOWED_HOSTS });
  }
  const seriesId = parsed.searchParams.get("series_id")?.trim();
  if (seriesId) {
    return { url: `${BASE_URL}/detail?series_id=${encodeURIComponent(seriesId)}`, sid: seriesId };
  }
  const slug = parsed.pathname.match(SHARE_PATH)?.[1];
  if (slug) {
    return { url: `${BASE_URL}/s/${encodeURIComponent(slug)}/`, sid: slug };
  }
  return { url: parsed.toString(), sid: value };
}
__name(resolveHongguoTarget, "resolveHongguoTarget");
async function fetchHongguo(client, config, sid) {
  const raw2 = sid.trim();
  if (!raw2) throw ApiError.badRequest("\u7EA2\u679C\u5267\u96C6 ID \u4E0D\u80FD\u4E3A\u7A7A");
  const target = resolveHongguoTarget(raw2);
  const html = await requestText(client, target.url, {
    config,
    headers: { accept: "text/html,application/xhtml+xml" }
  });
  const routerData = extractJsAssignmentJson(html, "window._ROUTER_DATA") || extractJsAssignmentJson(html, "_ROUTER_DATA");
  if (!routerData) {
    throw ApiError.upstreamError("\u65E0\u6CD5\u4ECE\u7EA2\u679C\u9875\u9762\u63D0\u53D6 _ROUTER_DATA");
  }
  const loader = routerData.loaderData;
  const videoDetail = loader?.["video-detail-share_page"]?.pageData?.video_detail_data;
  const seriesDetail = loader?.detail_page?.seriesDetail;
  let title = "";
  let episodes = "";
  let actors = [];
  let genres = [];
  let synopsis = "";
  let posterUrl = "";
  let rating = "";
  let likeCount = "";
  let favoriteCount = "";
  let ratingCount = "";
  if (videoDetail) {
    title = text(videoDetail.title);
    episodes = videoDetail.series_episode_info?.episode_cnt ?? videoDetail.episodes ?? "";
    actors = videoDetail.actors ?? [];
    genres = videoDetail.genres ?? [];
    synopsis = text(videoDetail.synopsis);
    posterUrl = text(videoDetail.poster_url);
  } else if (seriesDetail) {
    title = text(seriesDetail.series_name);
    episodes = seriesDetail.episode_cnt ?? "";
    actors = seriesDetail.celebrities ?? [];
    genres = seriesDetail.tags ?? [];
    synopsis = text(seriesDetail.series_intro);
    posterUrl = text(seriesDetail.series_cover);
  } else {
    throw ApiError.upstreamError("\u7EA2\u679C\u9875\u9762\u4E2D\u6CA1\u6709\u627E\u5230\u5267\u96C6\u6570\u636E");
  }
  const social = loader?.detail_page?.seriesSocialInfo || loader?.["video-detail-share_page"]?.pageData?.seriesSocialInfo || {};
  rating = social.rating ?? videoDetail?.rating ?? "";
  likeCount = social.series_like_count ?? videoDetail?.series_like_count ?? videoDetail?.like_count ?? "";
  favoriteCount = social.series_favorite_count ?? videoDetail?.series_favorite_count ?? videoDetail?.favorite_count ?? "";
  ratingCount = social.rating_count ?? videoDetail?.rating_count ?? "";
  return providerData("hongguo", target.sid, {
    title,
    chinese_title: title,
    episodes,
    actors,
    genres,
    synopsis,
    poster_url: posterUrl,
    rating,
    like_count: likeCount,
    favorite_count: favoriteCount,
    rating_count: ratingCount
  });
}
__name(fetchHongguo, "fetchHongguo");

// src/providers/qq-music.ts
function formatPlayTime(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return "";
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
__name(formatPlayTime, "formatPlayTime");
function asSingers(value) {
  const list = Array.isArray(value) ? value : Array.isArray(value?.singerList) ? value.singerList : [];
  return list.map((item) => {
    const row = item ?? {};
    const name = text(row.name);
    if (!name) return null;
    return { name, mid: text(row.mid) || void 0 };
  }).filter(Boolean);
}
__name(asSingers, "asSingers");
function asSongs(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const row = item ?? {};
    const song = row.songInfo ?? row;
    return {
      id: song.id,
      mid: song.mid,
      name: text(song.title, text(song.name)),
      sub_name: text(song.subtitle),
      singer: asSingers(song.singer),
      interval: song.interval,
      playTime: formatPlayTime(song.interval)
    };
  });
}
__name(asSongs, "asSongs");
async function fetchQQMusic(client, config, sid) {
  const id = sid.trim();
  if (!id) throw ApiError.badRequest("QQ \u97F3\u4E50\u4E13\u8F91 ID \u4E0D\u80FD\u4E3A\u7A7A");
  const payload = {
    comm: { ct: 24, cv: 0 },
    album: {
      module: "music.musichallAlbum.AlbumInfoServer",
      method: "GetAlbumDetail",
      param: { albumMid: id }
    },
    songList: {
      module: "music.musichallAlbum.AlbumSongList",
      method: "GetAlbumSongList",
      param: { albumMid: id, begin: 0, num: 300, order: 2 }
    }
  };
  const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
  const body = await requestJson(client, url, {
    config,
    headers: {
      referer: "https://y.qq.com/",
      origin: "https://y.qq.com"
    }
  });
  const albumBlock = body.album ?? {};
  const songBlock = body.songList ?? {};
  if (albumBlock.code !== 0 || !albumBlock.data) {
    throw ApiError.upstreamError("QQ \u97F3\u4E50\u4E13\u8F91\u8BE6\u60C5\u83B7\u53D6\u5931\u8D25", {
      code: albumBlock.code,
      albumMid: id
    });
  }
  const album = albumBlock.data;
  const basic = album.basicInfo ?? {};
  const title = text(basic.albumName, text(basic.title));
  if (!title && !basic.albumMid && !basic.albumID) {
    throw ApiError.upstreamError("QQ \u97F3\u4E50\u8FD4\u56DE\u6570\u636E\u4E2D\u7F3A\u5C11\u4E13\u8F91\u8BE6\u60C5");
  }
  const albumMid = text(basic.albumMid, id);
  const pmid = text(basic.pmid, `${albumMid}_1`);
  const cover = pmid ? `https://y.qq.com/music/photo_new/T002R500x500M000${pmid}.jpg?max_age=2592000` : "";
  const songList = asSongs(songBlock.data?.songList);
  return providerData("qq_music", id, {
    id: basic.albumID,
    mid: albumMid,
    name: title,
    title,
    cover,
    singer: asSingers(album.singer),
    albumName: title,
    genre: text(basic.genre),
    language: text(basic.language),
    albumType: text(basic.albumType),
    company: text(album.company?.name),
    publishTime: text(basic.publishDate, text(basic.ctime)),
    desc: text(basic.desc),
    songList
  });
}
__name(fetchQQMusic, "fetchQQMusic");

// src/providers/douban-book.ts
function parseJsonLd2(html) {
  const match2 = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match2) return {};
  try {
    return JSON.parse(match2[1]);
  } catch {
    return {};
  }
}
__name(parseJsonLd2, "parseJsonLd");
function labelledFields(info) {
  const result = {};
  info.select("span").class("pl").map((span) => {
    const label = span.trimmedText().replace(/[:：]/g, "").trim();
    const value = span.nextSiblingText();
    if (label && value) result[label] = value;
    return null;
  });
  return result;
}
__name(labelledFields, "labelledFields");
function splitNames(value) {
  return unique2(
    value.split(/[/／、]/).map((item) => item.trim()).filter(Boolean)
  );
}
__name(splitNames, "splitNames");
function extractIntroduction(root) {
  const report = root.attr('id="link-report"');
  const introNodes = report.select("div").class("intro").all();
  if (!introNodes.length) return "";
  const intro = new DomQuery([introNodes[introNodes.length - 1]]);
  const paragraphs = intro.select("p").map((p) => p.text().replace(/\s+/g, " ").trim()).filter(Boolean);
  if (paragraphs.length) return paragraphs.join("\n");
  return intro.text().replace(/\s+/g, " ").trim();
}
__name(extractIntroduction, "extractIntroduction");
async function fetchDoubanBook(client, config, rawSid) {
  const sid = assertId(rawSid, /^\d{4,12}$/, "douban_book", "1084336");
  const link = `https://book.douban.com/subject/${sid}/`;
  const jar = getDoubanCookieJar(config);
  await assertDoubanCookieUsable(client, config);
  const response = await client.request(link, {
    timeoutMs: config.requestTimeoutMs,
    headers: { ...buildDoubanHeaders(jar), referer: "https://book.douban.com/" },
    redirect: "follow"
  });
  const html = await response.text();
  if (isDoubanNotFound(html)) {
    throw ApiError.notFound(`\u8C46\u74E3\u8BFB\u4E66\u4E0A\u672A\u627E\u5230\u6761\u76EE ${sid}`);
  }
  if (isDoubanChallengeStatus(response.status)) {
    throw new ApiError(
      "UPSTREAM_BLOCKED",
      `\u8C46\u74E3\u8BFB\u4E66\u88AB\u62D2\u7EDD\uFF08HTTP ${response.status}\uFF09\uFF0C\u5F53\u524D\u51FA\u53E3\u672A\u901A\u8FC7\u98CE\u63A7\uFF0C\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u6216\u66F4\u6362\u51FA\u53E3`,
      { retryable: true, retryAfterSeconds: 60, details: { status: response.status } }
    );
  }
  if (isDoubanAntiBot(html) || isDoubanChallengePage(html)) {
    throw new ApiError(
      "UPSTREAM_BLOCKED",
      "\u8C46\u74E3\u8BFB\u4E66\u89E6\u53D1\u4E86\u53CD\u722C\u9A8C\u8BC1\uFF0C\u8BF7\u914D\u7F6E DOUBAN_COOKIE \u540E\u91CD\u8BD5",
      { retryable: true, retryAfterSeconds: 60 }
    );
  }
  if (!response.ok) {
    throw ApiError.upstreamError(`\u8C46\u74E3\u8BFB\u4E66\u8FD4\u56DE HTTP ${response.status}`, { status: response.status });
  }
  const root = DomQuery.load(html);
  const ld = parseJsonLd2(html);
  const title = text(
    root.select("span").attr('property="v:itemreviewed"').trimmedText(),
    text(ld.name)
  );
  const poster = root.attr('id="mainpic"').select("a").class("nbg").getAttr("href") ?? "";
  const ratingText = root.select("strong").attr('property="v:average"').trimmedText();
  const votesText = root.select("span").attr('property="v:votes"').trimmedText();
  const introduction = extractIntroduction(root);
  const info = root.attr('id="info"');
  const fields = labelledFields(info);
  const authorValue = fields["\u4F5C\u8005"] ?? "";
  const translatorValue = fields["\u8BD1\u8005"] ?? "";
  const isbn = text(ld.isbn, fields["ISBN"] ?? "");
  return providerData("douban_book", sid, {
    title,
    original_title: fields["\u539F\u4F5C\u540D"] ?? "",
    poster,
    author: splitNames(authorValue),
    translator: splitNames(translatorValue).sort(),
    publisher: fields["\u51FA\u7248\u793E"] ?? "",
    year: fields["\u51FA\u7248\u5E74"] ?? "",
    pages: fields["\u9875\u6570"] ?? "",
    pricing: fields["\u5B9A\u4EF7"] ?? "",
    binding: fields["\u88C5\u5E27"] ?? "",
    series: fields["\u4E1B\u4E66"] ?? "",
    isbn,
    rating: ratingText ? Number.parseFloat(ratingText) || 0 : 0,
    votes: votesText ? Number.parseInt(votesText, 10) || 0 : 0,
    introduction,
    link
  });
}
__name(fetchDoubanBook, "fetchDoubanBook");

// src/routes/get-data.ts
var caches = /* @__PURE__ */ new Map();
function detailCache(ttlSeconds) {
  let cache2 = caches.get(ttlSeconds);
  if (!cache2) {
    cache2 = new TtlCache(ttlSeconds * 1e3);
    caches.set(ttlSeconds, cache2);
  }
  return cache2;
}
__name(detailCache, "detailCache");
async function searchFirst(site, client, config, query) {
  if (site === "douban") {
    const items = await searchDouban(client, config, query, 1);
    if (!items.items[0]) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230\u8C46\u74E3\u6761\u76EE: ${query}`);
    return { sid: items.items[0].sid };
  }
  if (site === "imdb") {
    const { data } = await searchTitles(client, config, query, 1, {});
    const item = data.items[0];
    if (!item?.id) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230 IMDb \u6761\u76EE: ${query}`);
    return { sid: item.id };
  }
  if (site === "bangumi") {
    const items = await searchBangumi(client, config, query, 1);
    if (!items[0]) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230 Bangumi \u6761\u76EE: ${query}`);
    return { sid: items[0].sid };
  }
  if (site === "steam") {
    const items = await searchSteam(client, config, query, 1);
    if (!items[0]) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230 Steam \u5E94\u7528: ${query}`);
    return { sid: items[0].sid };
  }
  if (site === "tmdb") {
    const items = await searchTmdb(client, config, query, 1);
    if (!items[0]) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230 TMDB \u6761\u76EE: ${query}`);
    const [type, sid] = items[0].sid.split(":");
    return { sid, type };
  }
  if (site === "trakt") {
    const items = await searchTrakt(client, config, query, 1);
    if (!items[0]) throw ApiError.notFound(`\u672A\u641C\u7D22\u5230 Trakt \u6761\u76EE: ${query}`);
    const [type, sid] = items[0].sid.split(":");
    return { sid, type };
  }
  throw ApiError.badRequest(`\u6570\u636E\u6E90 ${site} \u4E0D\u652F\u6301\u5173\u952E\u8BCD\u641C\u7D22\uFF0C\u8BF7\u76F4\u63A5\u586B\u5199 ID \u6216 URL`);
}
__name(searchFirst, "searchFirst");
async function loadData(site, sid, type, client, config, full) {
  switch (site) {
    case "douban":
      return await fetchDoubanSubject(client, config, sid, { full });
    case "douban_book":
      return fetchDoubanBook(client, config, sid);
    case "imdb": {
      const { data } = await fetchTitle(client, config, sid, { full });
      return data;
    }
    case "bangumi":
      return fetchBangumi(client, config, sid);
    case "steam":
      return fetchSteam(client, config, sid);
    case "tmdb":
      return fetchTmdb(client, config, type ?? "movie", sid);
    case "trakt":
      return fetchTrakt(client, config, type ?? "movie", sid);
    case "melon":
      return fetchMelon(client, config, sid);
    case "hongguo":
      return fetchHongguo(client, config, sid);
    case "qq_music":
      return fetchQQMusic(client, config, sid);
    default:
      throw ApiError.badRequest(`\u4E0D\u652F\u6301\u7684\u6570\u636E\u6E90: ${site}`);
  }
}
__name(loadData, "loadData");
var RESERVED_IDS = /* @__PURE__ */ new Set(["search", "cookie-status"]);
function persistentKeysFor(site, sid, type, full) {
  if (site === "tmdb" || site === "trakt") {
    return buildVariantKeys(site, sid, type ?? "movie", full);
  }
  return buildVariantKeys(site, sid, null, full);
}
__name(persistentKeysFor, "persistentKeysFor");
async function sendProviderDetail(c, site, rawId, rawType, full) {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  if (RESERVED_IDS.has(rawId.trim().toLowerCase())) {
    throw ApiError.notFound(`\u672A\u77E5\u8D44\u6E90: ${site}/${rawId.trim()}`);
  }
  const { sid, type } = normalizeDetailId(site, rawId, rawType);
  const cacheSid = site === "hongguo" ? resolveHongguoTarget(sid).sid : sid;
  const keys = persistentKeysFor(site, cacheSid, type, full);
  const result = await readThrough({
    memory: detailCache(config.cacheTtlSeconds),
    memoryKey: `${site}:${cacheSid}:${type ?? ""}:${full ? "full" : "base"}`,
    store: createCacheStore(c.env),
    keys,
    ttlSeconds: config.cacheTtlSeconds,
    ratingRefreshSeconds: config.ratingRefreshSeconds,
    databaseFallback: /* @__PURE__ */ __name(() => loadStaticDatabase(c.env, site, keys), "databaseFallback"),
    loader: /* @__PURE__ */ __name(async () => {
      const client = await getHttpClient(config);
      return attachFormat(site, await loadData(site, sid, type, client, config, full));
    }, "loader")
  });
  const value = ensureFormat(site, result.value);
  return sendSuccess(value, { requestId, startedAt, cached: result.layer !== void 0, source: "api" }, {
    cache: result.layer ? "hit" : "miss",
    cacheTtlSeconds: config.cacheTtlSeconds,
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken || config.authSecret)
  });
}
__name(sendProviderDetail, "sendProviderDetail");
async function resolveProviderDetail(c) {
  const config = c.get("config");
  const urlParam = c.req.query("url")?.trim();
  const sidParam = (c.req.query("sid") ?? c.req.query("id"))?.trim();
  const queryParam = (c.req.query("q") ?? c.req.query("query"))?.trim();
  const input = urlParam || sidParam || queryParam || "";
  if (!input) {
    throw ApiError.badRequest("\u7F3A\u5C11 url / id / q \u53C2\u6570", {
      example: "/api/v1/resolve?url=https://movie.douban.com/subject/1292052/"
    });
  }
  let site = normalizeSite(c.req.query("source") ?? c.req.query("site"));
  let sid = "";
  let type = c.req.query("type")?.trim() || void 0;
  const detected = detectSource(input);
  if (!site && detected) {
    site = detected.site;
    sid = detected.sid;
    type = type ?? detected.type;
  }
  if (!site) {
    if (/^tt\d{7,9}$/i.test(input)) site = "imdb";
    else if (/^\d{4,12}$/.test(input)) site = "douban";
    else if (detected) site = detected.site;
    else {
      throw ApiError.badRequest("\u65E0\u6CD5\u8BC6\u522B\u6570\u636E\u6E90\uFF0C\u8BF7\u901A\u8FC7 source \u53C2\u6570\u6307\u5B9A", {
        example: "/api/v1/resolve?source=imdb&id=tt0111161"
      });
    }
  }
  if (!sid && (urlParam || sidParam)) {
    const resolved = resolveSid(site, input);
    sid = resolved.sid;
    type = type ?? resolved.type;
  }
  if (!sid && queryParam) {
    const client = await getHttpClient(config);
    const found = await searchFirst(site, client, config, queryParam);
    sid = found.sid;
    type = type ?? found.type;
  }
  if (!sid) throw ApiError.badRequest("\u7F3A\u5C11\u6709\u6548\u7684 ID \u6216\u94FE\u63A5");
  return sendProviderDetail(c, site, sid, type, c.req.query("full") !== "false");
}
__name(resolveProviderDetail, "resolveProviderDetail");

// src/routes/douban.ts
var searchCaches2 = /* @__PURE__ */ new Map();
function getOrCreateCache(caches3, ttl) {
  let cache2 = caches3.get(ttl);
  if (!cache2) {
    cache2 = new TtlCache(ttl * 1e3);
    caches3.set(ttl, cache2);
  }
  return cache2;
}
__name(getOrCreateCache, "getOrCreateCache");
var douban = new Hono3();
douban.get("/search", async (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const query = c.req.query("q")?.trim();
  if (!query) {
    throw ApiError.badRequest("\u7F3A\u5C11\u67E5\u8BE2\u53C2\u6570 q", { example: "/api/douban/search?q=\u76D7\u68A6\u7A7A\u95F4" });
  }
  if (query.length > 200) {
    throw ApiError.badRequest("\u67E5\u8BE2\u8BCD\u8FC7\u957F\uFF0C\u6700\u591A 200 \u4E2A\u5B57\u7B26");
  }
  const rawLimit = Number.parseInt(c.req.query("limit") ?? "10", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10;
  const memory = getOrCreateCache(searchCaches2, config.cacheTtlSeconds);
  const memoryKey = `${query.toLowerCase()}::${limit}`;
  const cached = memory.get(memoryKey);
  if (cached) {
    return sendSuccess(cached, { requestId, startedAt, cached: true }, {
      cache: "hit",
      cacheTtlSeconds: config.cacheTtlSeconds,
      rateLimit: c.get("rateLimit"),
      origin,
      varyAuthorization: Boolean(config.apiToken || config.authSecret)
    });
  }
  const client = await getHttpClient(config);
  const data = await searchDouban(client, config, query, limit);
  memory.set(memoryKey, data);
  return sendSuccess(data, { requestId, startedAt, cached: false }, {
    cache: "miss",
    cacheTtlSeconds: config.cacheTtlSeconds,
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken || config.authSecret)
  });
});
douban.get("/cookie-status", async (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const client = await getHttpClient(config);
  const health = await checkDoubanCookie(client, config, {
    force: c.req.query("refresh") === "1"
  });
  return sendSuccess(health, { requestId, startedAt }, {
    cache: "bypass",
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken || config.authSecret)
  });
});
douban.get(
  "/:id",
  (c) => sendProviderDetail(c, "douban", c.req.param("id"), null, c.req.query("full") !== "false")
);

// src/routes/auth.ts
var auth2 = new Hono3();
var challengeLimiter = new RateLimiter(30, 6e4);
var exchangeLimiter = new RateLimiter(20, 6e4);
function clientIp(c) {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
__name(clientIp, "clientIp");
function enforceRateLimit(c, limiter2, label) {
  const result = limiter2.check(clientIp(c));
  c.set("rateLimit", result);
  if (result.allowed) return result;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1e3));
  throw new ApiError("RATE_LIMITED", `${label}\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7 ${retryAfter} \u79D2\u540E\u91CD\u8BD5`, {
    retryable: true,
    retryAfterSeconds: retryAfter,
    details: { limit: result.limit }
  });
}
__name(enforceRateLimit, "enforceRateLimit");
function sessionSecret(c) {
  const secret = c.get("config").authSecret?.trim();
  if (!secret) {
    throw new ApiError(
      "CONFIG_REQUIRED",
      "\u672A\u914D\u7F6E AUTH_SECRET\uFF0CUI \u4F1A\u8BDD\u8BA4\u8BC1\u4E0D\u53EF\u7528\uFF1B\u8BF7\u8BBE\u7F6E AUTH_SECRET \u6216\u6539\u7528 API_TOKEN"
    );
  }
  return secret;
}
__name(sessionSecret, "sessionSecret");
function sendWithCookie(c, data, cookie, message) {
  const response = sendSuccess(
    data,
    { requestId: c.get("requestId"), startedAt: c.get("startedAt"), cached: false },
    {
      cache: "bypass",
      rateLimit: c.get("rateLimit"),
      origin: c.req.header("origin") ?? null,
      varyAuthorization: true,
      message
    }
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.append("Set-Cookie", cookie);
  return response;
}
__name(sendWithCookie, "sendWithCookie");
function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
__name(noStore, "noStore");
auth2.get("/challenge", async (c) => {
  const config = c.get("config");
  const secret = sessionSecret(c);
  enforceRateLimit(c, challengeLimiter, "\u83B7\u53D6\u9A8C\u8BC1\u6311\u6218");
  const issued = await createChallenge(secret, config.powDifficulty);
  const response = sendSuccess(
    {
      ...issued,
      algorithm: "sha256-pow",
      sessionTtlSeconds: config.sessionTtlSeconds
    },
    { requestId: c.get("requestId"), startedAt: c.get("startedAt"), cached: false },
    {
      cache: "bypass",
      rateLimit: c.get("rateLimit"),
      origin: c.req.header("origin") ?? null,
      varyAuthorization: true,
      message: "OK"
    }
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
});
auth2.post("/session", async (c) => {
  const config = c.get("config");
  const secret = sessionSecret(c);
  enforceRateLimit(c, exchangeLimiter, "\u521B\u5EFA\u4F1A\u8BDD");
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw ApiError.badRequest('\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F JSON\uFF1A{"challenge":"...","solution":"..."}');
  }
  if (typeof body.challenge !== "string" || typeof body.solution !== "string") {
    throw ApiError.badRequest("\u7F3A\u5C11 challenge \u6216 solution");
  }
  const valid = await verifyChallenge(secret, body.challenge, body.solution);
  if (!valid) {
    throw ApiError.unauthorized("\u9A8C\u8BC1\u5931\u8D25\u6216\u6311\u6218\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6\u6311\u6218");
  }
  const session = await createSession(secret, config.sessionTtlSeconds);
  const secure = isSecureRequest(c.req.url, c.req.header("x-forwarded-proto"));
  const cookie = serializeSessionCookie(session.token, session.maxAge, secure);
  return sendWithCookie(
    c,
    {
      authenticated: true,
      method: "pow",
      expiresAt: session.payload.exp,
      sessionTtlSeconds: config.sessionTtlSeconds
    },
    cookie,
    "\u4F1A\u8BDD\u5DF2\u521B\u5EFA"
  );
});
auth2.get("/session", async (c) => {
  const config = c.get("config");
  const secret = config.authSecret?.trim();
  if (!secret) {
    return noStore(
      sendSuccess(
        { authenticated: false, sessionAuth: false },
        { requestId: c.get("requestId"), startedAt: c.get("startedAt"), cached: false },
        { cache: "bypass", origin: c.req.header("origin") ?? null, varyAuthorization: true }
      )
    );
  }
  const token = readCookie(c.req.header("cookie"), SESSION_COOKIE);
  const payload = await verifySession(secret, token);
  return noStore(
    sendSuccess(
      payload ? { authenticated: true, sessionAuth: true, expiresAt: payload.exp } : { authenticated: false, sessionAuth: true },
      { requestId: c.get("requestId"), startedAt: c.get("startedAt"), cached: false },
      { cache: "bypass", origin: c.req.header("origin") ?? null, varyAuthorization: true }
    )
  );
});
auth2.delete("/session", async (c) => {
  const secure = isSecureRequest(c.req.url, c.req.header("x-forwarded-proto"));
  return sendWithCookie(
    c,
    { authenticated: false },
    serializeClearedSessionCookie(secure),
    "\u4F1A\u8BDD\u5DF2\u6E05\u9664"
  );
});

// src/routes/providers.ts
var caches2 = /* @__PURE__ */ new Map();
function cacheFor(kind, ttl) {
  const key = `${kind}:${ttl}`;
  let cache2 = caches2.get(key);
  if (!cache2) {
    cache2 = new TtlCache(ttl * 1e3);
    caches2.set(key, cache2);
  }
  return cache2;
}
__name(cacheFor, "cacheFor");
async function handleSearch(c, site, search2, variant = null) {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const query = c.req.query("q")?.trim();
  if (!query) throw new ApiError("BAD_REQUEST", "\u7F3A\u5C11\u67E5\u8BE2\u53C2\u6570 q");
  const rawLimit = Number.parseInt(c.req.query("limit") ?? "10", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10;
  const memory = cacheFor("search", config.cacheTtlSeconds);
  const memoryKey = `${site}:${query.toLowerCase()}:${limit}:${variant ?? ""}`;
  const cached = memory.get(memoryKey);
  if (cached) {
    return sendSuccess(cached, { requestId, startedAt, cached: true, source: "api" }, {
      cache: "hit",
      cacheTtlSeconds: config.cacheTtlSeconds,
      rateLimit: c.get("rateLimit"),
      origin,
      varyAuthorization: Boolean(config.apiToken || config.authSecret)
    });
  }
  const client = await getHttpClient(config);
  const items = await search2(client, config, query, limit);
  const data = { query, source: site, total: items.length, items };
  memory.set(memoryKey, data);
  return sendSuccess(data, { requestId, startedAt, cached: false, source: "api" }, {
    cache: "miss",
    cacheTtlSeconds: config.cacheTtlSeconds,
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken || config.authSecret)
  });
}
__name(handleSearch, "handleSearch");
var providers = new Hono3();
var isFull = /* @__PURE__ */ __name((c) => c.req.query("full") !== "false", "isFull");
providers.get(
  "/bangumi/search",
  (c) => handleSearch(
    c,
    "bangumi",
    (client, config, q, limit) => searchBangumi(client, config, q, limit, c.req.query("type") ?? "all"),
    c.req.query("type") ?? "all"
  )
);
providers.get("/steam/search", (c) => handleSearch(c, "steam", searchSteam));
providers.get("/tmdb/search", (c) => handleSearch(c, "tmdb", searchTmdb));
providers.get("/trakt/search", (c) => handleSearch(c, "trakt", searchTrakt));
providers.get("/bangumi/:id", (c) => sendProviderDetail(c, "bangumi", c.req.param("id"), null, isFull(c)));
providers.get("/steam/:id", (c) => sendProviderDetail(c, "steam", c.req.param("id"), null, isFull(c)));
providers.get(
  "/tmdb/:type/:id",
  (c) => sendProviderDetail(c, "tmdb", c.req.param("id"), c.req.param("type"), isFull(c))
);
providers.get("/tmdb/:id", (c) => sendProviderDetail(c, "tmdb", c.req.param("id"), "movie", isFull(c)));
providers.get(
  "/trakt/:type/:id",
  (c) => sendProviderDetail(c, "trakt", c.req.param("id"), c.req.param("type"), isFull(c))
);
providers.get("/melon/:id", (c) => sendProviderDetail(c, "melon", c.req.param("id"), null, isFull(c)));
providers.get("/hongguo/:id", (c) => sendProviderDetail(c, "hongguo", c.req.param("id"), null, isFull(c)));
providers.get("/qqmusic/:id", (c) => sendProviderDetail(c, "qq_music", c.req.param("id"), null, isFull(c)));
providers.get("/qq_music/:id", (c) => sendProviderDetail(c, "qq_music", c.req.param("id"), null, isFull(c)));
providers.get("/qq-music/:id", (c) => sendProviderDetail(c, "qq_music", c.req.param("id"), null, isFull(c)));
providers.get(
  "/douban-book/:id",
  (c) => sendProviderDetail(c, "douban_book", c.req.param("id"), null, isFull(c))
);
providers.get(
  "/douban/book/:id",
  (c) => sendProviderDetail(c, "douban_book", c.req.param("id"), null, isFull(c))
);

// src/lib/methods.ts
var ALLOWED_METHODS = "GET, HEAD, OPTIONS";
function sendMethodNotAllowed(c, allow = ALLOWED_METHODS) {
  const response = sendError(
    new ApiError("METHOD_NOT_ALLOWED", `\u4E0D\u652F\u6301 ${c.req.method} \u65B9\u6CD5\uFF0C\u8BE5\u8D44\u6E90\u53EA\u652F\u6301 ${allow}`),
    { requestId: c.get("requestId") ?? "unknown", startedAt: c.get("startedAt") ?? Date.now() },
    { origin: c.req.header("origin") ?? null }
  );
  response.headers.set("Allow", allow);
  return response;
}
__name(sendMethodNotAllowed, "sendMethodNotAllowed");

// src/routes/resource.ts
var resource = new Hono3();
function siteFrom(raw2) {
  const site = normalizeSite(raw2);
  if (!isResourceSite(site)) {
    throw ApiError.notFound(`\u672A\u77E5\u6570\u636E\u6E90 "${raw2}"`, { sites: RESOURCE_SITES });
  }
  return site;
}
__name(siteFrom, "siteFrom");
var isFull2 = /* @__PURE__ */ __name((c) => c.req.query("full") !== "false", "isFull");
function handleDetail(c, rawSite, id, type) {
  const site = siteFrom(rawSite);
  return sendProviderDetail(c, site, id, type, isFull2(c));
}
__name(handleDetail, "handleDetail");
resource.get("/:site/:id", (c) => handleDetail(c, c.req.param("site"), c.req.param("id"), c.req.query("type")));
resource.get(
  "/:site/:type/:id",
  (c) => handleDetail(c, c.req.param("site"), c.req.param("id"), c.req.param("type"))
);
for (const path of ["/:site/:id", "/:site/:type/:id"]) {
  resource.on(["POST", "PUT", "PATCH", "DELETE"], path, (c) => sendMethodNotAllowed(c));
}

// src/routes/egress.ts
var IP_ENDPOINTS = ["https://api.ipify.org?format=json", "https://ipinfo.io/ip"];
var PROBE_QUERY = `query EgressProbe { title(id: "tt0111161") { id } }`;
var IMDB_UNAVAILABLE = "\u5F53\u524D\u90E8\u7F72\u672A\u914D\u7F6E IMDb \u901A\u9053\uFF08IMDB_BACKEND_URL\uFF09\uFF0C\u5DF2\u8DF3\u8FC7\u63A2\u6D3B\uFF08IMDb \u63A5\u53E3\u8FD4\u56DE 501\uFF09";
async function probeBackend(client, config) {
  try {
    const rating = await fetchRatingViaBackend(client, config, "tt0111161");
    return rating ? { status: 200, ok: true, message: "IMDb \u540E\u7AEF\u53EF\u7528" } : { status: 200, ok: false, message: "IMDb \u540E\u7AEF\u53EF\u8FBE\uFF0C\u4F46\u672A\u8FD4\u56DE\u8BC4\u5206" };
  } catch (error) {
    const status = Number(error?.details?.status) || 0;
    return { status, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
__name(probeBackend, "probeBackend");
async function probeChannel(client, config, imdbUsable) {
  if (!imdbUsable) {
    return {
      egressIp: await fetchEgressIp(client),
      imdb: {
        status: 0,
        ok: false,
        message: IMDB_UNAVAILABLE
      }
    };
  }
  const imdb2 = hasImdbBackend(config) ? await probeBackend(client, config) : await probeImdb(client, config);
  const egressIp = await fetchEgressIp(client);
  return { egressIp, imdb: imdb2 };
}
__name(probeChannel, "probeChannel");
async function fetchEgressIp(client) {
  for (const url of IP_ENDPOINTS) {
    try {
      const response = await client.request(url, {
        timeoutMs: 5e3,
        headers: { accept: "application/json, text/plain" }
      });
      if (!response.ok) continue;
      const text2 = (await response.text()).trim();
      if (text2.startsWith("{")) {
        const payload = JSON.parse(text2);
        if (payload.ip) return payload.ip;
        continue;
      }
      if (/^[\d.:a-f]+$/i.test(text2)) return text2;
    } catch {
    }
  }
  return "";
}
__name(fetchEgressIp, "fetchEgressIp");
async function probeImdb(client, config) {
  try {
    await graphqlQuery(client, config, PROBE_QUERY, {});
    return { status: 200, ok: true, message: "IMDb GraphQL \u53EF\u7528" };
  } catch (error) {
    const status = Number(error?.details?.status) || 0;
    return { status, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
__name(probeImdb, "probeImdb");
function describeChannel(label) {
  if (label.startsWith("socket:")) return "cloudflare:sockets \u88F8 TCP";
  return "\u76F4\u8FDE\uFF08fetch\uFF09";
}
__name(describeChannel, "describeChannel");
var egress = new Hono3();
egress.get("/", async (c) => {
  const config = c.get("config");
  const client = await getHttpClient(config);
  const imdbUsable = canUseImdb(config);
  const [primary, viaSocket] = await Promise.all([
    probeChannel(client, config, imdbUsable),
    // 只有边缘运行时才有 connect()：它和 fetch 是两条出站链路，用来确认裸 TCP 是否可用
    config.runtime === "edge" ? probeChannel(createDirectSocketClient(), config, imdbUsable) : Promise.resolve(null)
  ]);
  return sendSuccess(
    {
      channel: client.label,
      channelType: describeChannel(client.label),
      runtime: config.runtime,
      /** IMDb 接口在当前部署上是否提供（Workers 上需配置 IMDB_BACKEND_URL） */
      imdbUsable,
      /** IMDb 数据是否来自外部后端 */
      imdbBackend: hasImdbBackend(config),
      egressIp: primary.egressIp,
      imdb: primary.imdb,
      /** Workers 上 connect() 与 fetch 走不同出站链路，出口 IP 可能不同 */
      socket: viaSocket
    },
    { requestId: c.get("requestId"), startedAt: c.get("startedAt") },
    { cache: "bypass", rateLimit: c.get("rateLimit"), origin: c.req.header("origin") ?? null }
  );
});

// src/routes/search.ts
var search = new Hono3();
var AUTO_SOURCES = ["douban", "imdb", "bangumi", "tmdb"];
var SEARCH_SOURCES = /* @__PURE__ */ new Set(["douban", "imdb", "bangumi", "steam", "tmdb", "trakt"]);
async function runSearch(source, client, config, query, limit) {
  switch (source) {
    case "douban": {
      const data = await searchDouban(client, config, query, limit);
      return data.items.map((item) => ({
        site: "douban",
        sid: item.sid,
        title: item.title,
        subtitle: item.subtitle,
        year: "",
        rating: item.rating || "",
        poster: item.poster,
        url: item.url
      }));
    }
    case "imdb": {
      const { data } = await searchTitles(client, config, query, limit, {});
      return data.items.filter((item) => Boolean(item.id)).map((item) => ({
        site: "imdb",
        sid: item.id,
        title: item.title,
        subtitle: item.subtitle,
        year: item.year ? String(item.year) : "",
        rating: item.rating || "",
        poster: item.image || "",
        url: `https://www.imdb.com/title/${item.id}/`
      }));
    }
    case "bangumi":
      return searchBangumi(client, config, query, limit);
    case "steam":
      return searchSteam(client, config, query, limit);
    case "tmdb":
      return searchTmdb(client, config, query, limit);
    case "trakt":
      return searchTrakt(client, config, query, limit);
    default:
      throw ApiError.badRequest(`\u4E0D\u652F\u6301\u7684\u641C\u7D22\u6E90: ${source}`);
  }
}
__name(runSearch, "runSearch");
search.get("/", async (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId");
  const startedAt = c.get("startedAt");
  const origin = c.req.header("origin") ?? null;
  const query = c.req.query("q")?.trim();
  if (!query) throw ApiError.badRequest("\u7F3A\u5C11\u67E5\u8BE2\u53C2\u6570 q", { example: "/api/v1/search?q=\u76D7\u68A6\u7A7A\u95F4" });
  if (query.length > 200) throw ApiError.badRequest("\u67E5\u8BE2\u8BCD\u8FC7\u957F\uFF0C\u6700\u591A 200 \u4E2A\u5B57\u7B26");
  const requested = (c.req.query("source") ?? c.req.query("site") ?? "auto").toLowerCase();
  if (requested !== "auto" && !SEARCH_SOURCES.has(requested)) {
    throw ApiError.badRequest(`\u4E0D\u652F\u6301\u7684\u641C\u7D22\u6E90: ${requested}`);
  }
  const rawLimit = Number.parseInt(c.req.query("limit") ?? "10", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10;
  const client = await getHttpClient(config);
  const sources = requested === "auto" ? AUTO_SOURCES : [requested];
  const results = await Promise.allSettled(
    sources.map(
      (source) => runSearch(source, client, config, query, requested === "auto" ? Math.min(limit, 8) : limit)
    )
  );
  if (requested !== "auto") {
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  }
  const groups = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const merged = [];
  const depth = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < depth; index++) {
    for (const group of groups) {
      const item = group[index];
      if (item) merged.push(item);
    }
  }
  const items = merged.slice(0, limit * 2);
  const data = {
    query,
    source: requested === "auto" ? "auto" : requested,
    total: items.length,
    items
  };
  return sendSuccess(data, { requestId, startedAt, cached: false, source: "api" }, {
    cache: "bypass",
    rateLimit: c.get("rateLimit"),
    origin,
    varyAuthorization: Boolean(config.apiToken || config.authSecret)
  });
});

// src/routes/v1.ts
var v1 = new Hono3();
var READ_ONLY = ["POST", "PUT", "PATCH", "DELETE"];
v1.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.length > 1 && path.endsWith("/")) {
    const url = new URL(c.req.url);
    url.pathname = path.replace(/\/+$/, "");
    return c.redirect(url.toString(), 308);
  }
  await next();
});
v1.get("/providers", (c) => {
  const config = c.get("config");
  return sendSuccess(
    { total: SITE_DESCRIPTORS.length, items: SITE_DESCRIPTORS },
    { requestId: c.get("requestId"), startedAt: c.get("startedAt"), cached: false },
    {
      cache: "bypass",
      rateLimit: c.get("rateLimit"),
      origin: c.req.header("origin") ?? null,
      varyAuthorization: Boolean(config.apiToken || config.authSecret)
    }
  );
});
v1.get("/resolve", (c) => resolveProviderDetail(c));
v1.route("/search", search);
v1.route("/egress", egress);
v1.route("/imdb", imdb);
v1.route("/douban", douban);
v1.route("/", providers);
v1.route("/", resource);
var GET_ONLY_PATHS = [
  "/providers",
  "/resolve",
  "/search",
  "/egress",
  "/imdb/search",
  "/douban/search",
  "/douban/cookie-status",
  "/bangumi/search",
  "/steam/search",
  "/tmdb/search",
  "/trakt/search"
];
for (const path of GET_ONLY_PATHS) {
  v1.on(READ_ONLY, path, (c) => sendMethodNotAllowed(c));
}

// src/routes/health.ts
function handleHealth(c) {
  const config = c.get("config");
  const cookieHealth = getCachedDoubanCookieHealth(config);
  const cookieStatus = !cookieHealth.configured ? "unconfigured" : cookieHealth.valid === true ? "valid" : cookieHealth.valid === false ? "invalid" : "unknown";
  return sendSuccess(
    {
      status: "ok",
      runtime: config.runtime,
      version: API_VERSION,
      capabilities: {
        graphql: canUseImdb(config) && !hasImdbBackend(config),
        imdb: canUseImdb(config),
        /** IMDb 数据走外部后端，Workers 上的唯一方式 */
        imdbBackend: hasImdbBackend(config),
        htmlFallback: canUseHtmlFallback(config),
        browser: config.canUseBrowser,
        douban: true,
        /** 豆瓣网页抓取的外部后端；出口被风控时由它代取网页 */
        doubanBackend: hasDoubanBackend(config),
        doubanCookie: Boolean(config.doubanCookie),
        doubanCookieStatus: cookieStatus,
        doubanCookieExpiresAt: cookieHealth.expiresAt,
        doubanCookieRemainingSeconds: cookieHealth.remainingSeconds,
        authRequired: Boolean(config.apiToken || config.authSecret)
      },
      cacheTtlSeconds: config.cacheTtlSeconds,
      /** 持久化缓存层：R2 / D1 / Blob / EdgeOne / 本地目录 */
      cacheLayers: describeCacheStore(createCacheStore(c.env))
    },
    {
      requestId: c.get("requestId"),
      startedAt: c.get("startedAt")
    },
    {
      cache: "bypass",
      origin: c.req.header("origin") ?? null,
      message: "\u670D\u52A1\u8FD0\u884C\u6B63\u5E38"
    }
  );
}
__name(handleHealth, "handleHealth");

// src/openapi.ts
var ENVELOPE_REF = "#/components/schemas/Envelope";
function envelope(data) {
  return {
    type: "object",
    required: ["code", "message", "data", "error", "meta"],
    properties: {
      code: {
        type: "integer",
        description: "\u6570\u5B57\u4E1A\u52A1\u7801\uFF1AHTTP \u72B6\u6001\u7801 \xD7 100 + \u5E8F\u53F7\uFF1B\u6210\u529F\u56FA\u5B9A\u4E3A 20000",
        examples: [2e4]
      },
      message: { type: "string", examples: ["OK"] },
      data: { anyOf: [data, { type: "null" }] },
      error: { anyOf: [{ $ref: "#/components/schemas/Error" }, { type: "null" }] },
      meta: { $ref: "#/components/schemas/Meta" }
    }
  };
}
__name(envelope, "envelope");
function jsonResponse2(description, schema) {
  return { description, content: { "application/json": { schema } } };
}
__name(jsonResponse2, "jsonResponse");
function ok(data, description = "\u6210\u529F") {
  return jsonResponse2(description, envelope(data));
}
__name(ok, "ok");
function errorResponse(description) {
  return jsonResponse2(description, { $ref: ENVELOPE_REF });
}
__name(errorResponse, "errorResponse");
function detailErrors() {
  return {
    304: {
      description: "\u5185\u5BB9\u672A\u4FEE\u6539\uFF08\u914D\u5408 If-None-Match \u4F7F\u7528\uFF0C\u65E0\u54CD\u5E94\u4F53\uFF09",
      headers: { ETag: { schema: { type: "string" } } }
    },
    400: errorResponse("\u53C2\u6570\u7F3A\u5931\u6216 ID \u683C\u5F0F\u975E\u6CD5"),
    401: errorResponse("\u7F3A\u5C11\u6216\u65E0\u6548\u7684\u51ED\u636E"),
    404: errorResponse("\u6570\u636E\u6E90\u4E0D\u652F\u6301\uFF0C\u6216\u4E0A\u6E38\u6CA1\u6709\u8BE5\u6761\u76EE"),
    405: errorResponse("\u8BE5\u8DEF\u5F84\u4E0D\u652F\u6301\u5F53\u524D HTTP \u65B9\u6CD5"),
    429: errorResponse("\u89E6\u53D1\u9650\u6D41"),
    502: errorResponse("\u4E0A\u6E38\u5F02\u5E38\u6216\u62D2\u7EDD\u4E86\u5F53\u524D\u51FA\u53E3"),
    503: errorResponse("\u4E0A\u6E38\u6301\u7EED\u6311\u6218\uFF0C\u6216\u7F3A\u5C11\u5FC5\u9700\u7684\u914D\u7F6E"),
    504: errorResponse("\u4E0A\u6E38\u8D85\u65F6")
  };
}
__name(detailErrors, "detailErrors");
var SITE_SCHEMA = {
  type: "string",
  enum: [...RESOURCE_SITES],
  description: "\u6570\u636E\u6E90\u6807\u8BC6\uFF08provider\uFF09\uFF1B\u522B\u540D\uFF08douban-movie\u3001qqmusic\u3001movie \u7B49\uFF09\u4F1A\u88AB\u5F52\u4E00\u5316"
};
var ID_SCHEMA = {
  type: "string",
  description: "\u6761\u76EE ID\u3002\u8C46\u74E3 / \u8C46\u74E3\u8BFB\u4E66\u4E3A\u7EAF\u6570\u5B57\uFF1BIMDb \u4E3A tt \u5F00\u5934\u7684\u7F16\u53F7\uFF1BTMDb \u4E3A\u6570\u5B57\uFF08\u5A92\u4F53\u7C7B\u578B\u7531 type \u51B3\u5B9A\uFF09\uFF1BTrakt \u4E3A slug \u6216\u6570\u5B57 ID\uFF1B\u7EA2\u679C\u77ED\u5267\u53EF\u4F20\u5B8C\u6574\u94FE\u63A5"
};
var TYPE_SCHEMA = {
  type: "string",
  enum: ["movie", "tv", "show"],
  description: "\u5A92\u4F53\u7C7B\u578B\uFF0C\u4EC5 TMDb\uFF08movie / tv\uFF09\u4E0E Trakt\uFF08movie / show\uFF09\u4F7F\u7528\uFF1B\u7F3A\u7701\u4E3A movie"
};
var FULL_SCHEMA = {
  type: "boolean",
  default: true,
  description: "\u662F\u5426\u8FD4\u56DE\u5168\u91CF\u6570\u636E\uFF1Bfalse \u65F6\u8FD4\u56DE\u7CBE\u7B80\u5B57\u6BB5\u96C6"
};
var COMMON_HEADER_PARAMS = [
  {
    name: "X-Request-Id",
    in: "header",
    required: false,
    schema: { type: "string" },
    description: "\u81EA\u5B9A\u4E49\u8BF7\u6C42 ID\uFF1B\u4E0D\u4F20\u5219\u81EA\u52A8\u751F\u6210\uFF0C\u5E76\u5728\u54CD\u5E94\u5934\u56DE\u4F20"
  }
];
var RATE_LIMITED_HEADERS = {
  "X-RateLimit-Limit": { schema: { type: "integer" } },
  "X-RateLimit-Remaining": { schema: { type: "integer" } },
  "X-RateLimit-Reset": { schema: { type: "integer" }, description: "Unix \u79D2" }
};
function searchResponses() {
  return {
    200: ok({ $ref: "#/components/schemas/SearchResult" }),
    400: errorResponse("\u7F3A\u5C11 q \u6216\u53C2\u6570\u975E\u6CD5"),
    401: errorResponse("\u7F3A\u5C11\u6216\u65E0\u6548\u7684\u51ED\u636E"),
    429: errorResponse("\u89E6\u53D1\u9650\u6D41"),
    502: errorResponse("\u4E0A\u6E38\u5F02\u5E38"),
    504: errorResponse("\u4E0A\u6E38\u8D85\u65F6")
  };
}
__name(searchResponses, "searchResponses");
function searchPath(operationId, summary, description, options = {}) {
  const { extraParams = [], legacyFor } = options;
  return {
    get: {
      tags: ["search"],
      operationId,
      summary,
      description: legacyFor ? `\u517C\u5BB9\u4FDD\u7559\uFF0C\u7B49\u4EF7\u4E8E \`${legacyFor}\`\u3002\u65B0\u4EE3\u7801\u8BF7\u4F7F\u7528 v1\u3002` : description,
      ...legacyFor ? { deprecated: true } : {},
      parameters: [
        { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 25, default: 10 }
        },
        ...extraParams
      ],
      responses: searchResponses()
    }
  };
}
__name(searchPath, "searchPath");
var PROVIDERS_SCHEMA = {
  type: "object",
  required: ["total", "items"],
  properties: {
    total: { type: "integer" },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "aliases", "search", "typed", "example"],
        properties: {
          id: { type: "string", enum: [...RESOURCE_SITES] },
          aliases: { type: "array", items: { type: "string" }, description: "\u5F52\u4E00\u5316\u65F6\u63A5\u53D7\u7684\u522B\u540D" },
          search: { type: "boolean", description: "\u662F\u5426\u6709 `/api/v1/{id}/search`" },
          typed: { type: "boolean", description: "\u5A92\u4F53\u7C7B\u578B\u662F\u5426\u53EF\u4F5C\u4E3A\u8DEF\u5F84\u6BB5\uFF08TMDb / Trakt\uFF09" },
          example: { type: "string", description: "\u793A\u4F8B ID\uFF1B\u7A7A\u5B57\u7B26\u4E32\u8868\u793A\u6CA1\u6709\u7A33\u5B9A\u793A\u4F8B" }
        }
      }
    }
  }
};
var EXTRA_V1_PATHS = {
  "/api/v1/{provider}/{type}/{id}": {
    get: {
      tags: ["detail"],
      operationId: "getDetailTyped",
      summary: "\u83B7\u53D6\u6761\u76EE\u8BE6\u60C5\uFF08\u5A92\u4F53\u7C7B\u578B\u5728\u8DEF\u5F84\u91CC\uFF09",
      description: "\u4E0E `/api/v1/{provider}/{id}?type=` \u7B49\u4EF7\uFF1B\u53EA\u6709 TMDb\uFF08movie / tv\uFF09\u4E0E Trakt\uFF08movie / show\uFF09\u4F7F\u7528\u8BE5\u6BB5\uFF0C\u5176\u5B83\u6570\u636E\u6E90\u4F1A\u5FFD\u7565\u3002",
      parameters: [
        { name: "provider", in: "path", required: true, schema: SITE_SCHEMA },
        {
          name: "type",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: ["movie", "tv", "show"],
            description: "TMDb\uFF1Amovie / tv\uFF1BTrakt\uFF1Amovie / show"
          }
        },
        { name: "id", in: "path", required: true, schema: ID_SCHEMA },
        { name: "full", in: "query", required: false, schema: FULL_SCHEMA },
        ...COMMON_HEADER_PARAMS
      ],
      responses: {
        200: ok({ $ref: "#/components/schemas/Detail" }, "\u6761\u76EE\u8BE6\u60C5"),
        ...detailErrors()
      }
    }
  },
  "/api/v1/providers": {
    get: {
      tags: ["meta"],
      operationId: "listProviders",
      summary: "\u6570\u636E\u6E90\u76EE\u5F55",
      description: "\u679A\u4E3E\u53EF\u7528\u7684 `provider`\u3001\u522B\u540D\u4E0E\u80FD\u529B\uFF0C\u4FBF\u4E8E\u540E\u7AEF\u5B9E\u73B0\u65B9\u5BF9\u9F50\u8DEF\u5F84\u4E0E\u53C2\u6570\u3002",
      responses: {
        200: ok({ $ref: "#/components/schemas/Providers" }, "\u6570\u636E\u6E90\u76EE\u5F55"),
        401: errorResponse("\u7F3A\u5C11\u6216\u65E0\u6548\u7684\u51ED\u636E"),
        429: errorResponse("\u89E6\u53D1\u9650\u6D41")
      }
    }
  },
  "/api/v1/resolve": {
    get: {
      tags: ["detail"],
      operationId: "resolveDetail",
      summary: "\u89E3\u6790\u94FE\u63A5 / \u5173\u952E\u8BCD\u540E\u53D6\u8BE6\u60C5",
      description: "\u7ED9\u51FA `url`\uFF08\u8C46\u74E3\u3001IMDb\u3001TMDb\u3001Bangumi\u3001Steam\u3001Trakt \u7B49\u94FE\u63A5\uFF09\u3001`id` \u6216 `q`\uFF0C\u7531\u670D\u52A1\u7AEF\u63A8\u65AD\u6570\u636E\u6E90\uFF1B\u53EA\u7ED9 `q` \u65F6\u7B49\u4EF7\u4E8E\u201C\u5148\u641C\u7D22\uFF0C\u518D\u53D6\u7B2C\u4E00\u6761\u201D\u3002",
      parameters: [
        { name: "url", in: "query", required: false, schema: { type: "string", format: "uri" } },
        { name: "id", in: "query", required: false, schema: { type: "string" } },
        { name: "q", in: "query", required: false, schema: { type: "string", maxLength: 200 } },
        {
          name: "source",
          in: "query",
          required: false,
          schema: SITE_SCHEMA,
          description: "\u6570\u636E\u6E90\uFF1B\u4E0D\u4F20\u65F6\u6309 url / ID \u5F62\u6001\u63A8\u65AD"
        },
        { name: "type", in: "query", required: false, schema: TYPE_SCHEMA },
        { name: "full", in: "query", required: false, schema: FULL_SCHEMA },
        ...COMMON_HEADER_PARAMS
      ],
      responses: {
        200: ok({ $ref: "#/components/schemas/Detail" }, "\u6761\u76EE\u8BE6\u60C5"),
        ...detailErrors()
      }
    }
  },
  "/api/v1/imdb/search": searchPath("searchImdb", "\u641C\u7D22 IMDb", "\u652F\u6301\u7C7B\u578B\u8FC7\u6EE4\u4E0E\u5E74\u4EFD\u8303\u56F4\uFF0C\u5BF9\u5E94 IMDb mainSearch \u7684\u539F\u751F\u53C2\u6570\u3002", {
    extraParams: [
      {
        name: "type",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "MOVIE / TV / TV_EPISODE / VIDEO_GAME \u7B49\uFF0C\u53EF\u9017\u53F7\u5206\u9694"
      },
      { name: "year_from", in: "query", required: false, schema: { type: "integer" } },
      { name: "year_to", in: "query", required: false, schema: { type: "integer" } },
      { name: "exact", in: "query", required: false, schema: { type: "boolean" } }
    ]
  }),
  "/api/v1/douban/search": searchPath("searchDouban", "\u641C\u7D22\u8C46\u74E3", "\u53EA\u641C\u7D22\u8C46\u74E3\u7535\u5F71\u4E0E\u5267\u96C6\u3002"),
  "/api/v1/bangumi/search": searchPath("searchBangumi", "\u641C\u7D22 Bangumi", "\u6309\u6761\u76EE\u7C7B\u578B\u8FC7\u6EE4\u3002", {
    extraParams: [
      {
        name: "type",
        in: "query",
        required: false,
        schema: { type: "string", enum: ["all", "book", "anime", "music", "game", "real"], default: "all" }
      }
    ]
  }),
  "/api/v1/steam/search": searchPath("searchSteam", "\u641C\u7D22 Steam", "\u6309\u5E94\u7528\u540D\u641C\u7D22\u3002"),
  "/api/v1/tmdb/search": searchPath("searchTmdb", "\u641C\u7D22 TMDb", "\u9700\u8981 `TMDB_API_KEY`\uFF0C\u7F3A\u7701\u65F6\u8FD4\u56DE 501\u3002"),
  "/api/v1/trakt/search": searchPath("searchTrakt", "\u641C\u7D22 Trakt", "\u9700\u8981 `TRAKT_CLIENT_ID`\uFF0C\u7F3A\u7701\u65F6\u8FD4\u56DE 501\u3002")
};
var LEGACY_PATHS = {
  "/api/{provider}/{id}": {
    get: {
      tags: ["legacy"],
      operationId: "getDetailLegacy",
      deprecated: true,
      summary: "\u83B7\u53D6\u6761\u76EE\u8BE6\u60C5\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09",
      description: "\u517C\u5BB9\u4FDD\u7559\uFF0C\u7B49\u4EF7\u4E8E `/api/v1/{provider}/{id}`\u3002\u65B0\u4EE3\u7801\u8BF7\u4F7F\u7528 v1\u3002",
      parameters: [
        { name: "provider", in: "path", required: true, schema: SITE_SCHEMA },
        { name: "id", in: "path", required: true, schema: ID_SCHEMA },
        { name: "type", in: "query", required: false, schema: TYPE_SCHEMA },
        { name: "full", in: "query", required: false, schema: FULL_SCHEMA }
      ],
      responses: {
        200: ok({ $ref: "#/components/schemas/Detail" }, "\u6761\u76EE\u8BE6\u60C5"),
        ...detailErrors()
      }
    }
  },
  "/api/search": searchPath("searchLegacy", "\u805A\u5408\u641C\u7D22\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09", "", {
    legacyFor: "/api/v1/search",
    extraParams: [
      {
        name: "source",
        in: "query",
        required: false,
        schema: { type: "string", enum: ["auto", "douban", "imdb", "bangumi", "steam", "tmdb", "trakt"], default: "auto" }
      }
    ]
  }),
  "/api/imdb/search": searchPath("searchImdbLegacy", "\u641C\u7D22 IMDb\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09", "", { legacyFor: "/api/v1/imdb/search" }),
  "/api/douban/search": searchPath("searchDoubanLegacy", "\u641C\u7D22\u8C46\u74E3\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09", "", {
    legacyFor: "/api/v1/douban/search"
  }),
  "/api/douban/cookie-status": {
    get: {
      tags: ["legacy"],
      operationId: "doubanCookieStatusLegacy",
      deprecated: true,
      summary: "\u68C0\u67E5 DOUBAN_COOKIE \u767B\u5F55\u6001\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09",
      description: "\u517C\u5BB9\u4FDD\u7559\uFF0C\u7B49\u4EF7\u4E8E `/api/v1/douban/cookie-status`\u3002\u65B0\u4EE3\u7801\u8BF7\u4F7F\u7528 v1\u3002",
      parameters: [
        {
          name: "refresh",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["1"] },
          description: "\u5F3A\u5236\u5237\u65B0\uFF08\u8DF3\u8FC7 10 \u5206\u949F\u7ED3\u679C\u7F13\u5B58\uFF09"
        }
      ],
      responses: { 200: ok({ type: "object", additionalProperties: true, description: "Cookie \u5065\u5EB7\u72B6\u6001" }) }
    }
  },
  "/api/egress": {
    get: {
      tags: ["legacy"],
      operationId: "egressLegacy",
      deprecated: true,
      summary: "\u51FA\u53E3\u81EA\u68C0\uFF08\u517C\u5BB9\u8DEF\u5F84\uFF09",
      description: "\u517C\u5BB9\u4FDD\u7559\uFF0C\u7B49\u4EF7\u4E8E `/api/v1/egress`\u3002\u65B0\u4EE3\u7801\u8BF7\u4F7F\u7528 v1\u3002",
      responses: { 200: ok({ type: "object", additionalProperties: true }) }
    }
  }
};
function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "PT-Gen API",
      version: API_VERSION,
      summary: "\u591A\u6E90\u5F71\u89C6 / \u97F3\u4E50\u5143\u6570\u636E\u4E0E PT \u7B80\u4ECB\u751F\u6210 API",
      description: "\u7248\u672C\u5316 REST \u9762\u4E3A `/api/v1`\uFF1A\u6761\u76EE `GET /api/v1/{provider}/{id}`\uFF0C\u641C\u7D22 `GET /api/v1/{provider}/search`\uFF0C\u805A\u5408\u641C\u7D22 `GET /api/v1/search`\uFF0C\u6570\u636E\u6E90\u76EE\u5F55 `GET /api/v1/providers`\uFF0C\u94FE\u63A5\u89E3\u6790 `GET /api/v1/resolve`\u3002\n\n\u6240\u6709\u6210\u529F\u4E0E\u5931\u8D25\u54CD\u5E94\u90FD\u662F\u7EDF\u4E00 JSON \u4FE1\u5C01\uFF0C`data.format` \u4E3A\u751F\u6210\u7684 PT \u7B80\u4ECB\uFF1BHTTP \u72B6\u6001\u7801\u4E0E\u4FE1\u5C01 `code` \u4E00\u4E00\u5BF9\u5E94\u3002\n\n\u7F13\u5B58\u8BFB\u53D6\u987A\u5E8F\uFF1A\u8FDB\u7A0B\u5185 TTL \u2192 \u6301\u4E45\u5C42\uFF08R2 / D1 / Blob / EdgeOne / \u672C\u5730\u76EE\u5F55\uFF09\u2192 \u9759\u6001\u6570\u636E\u5E93 \u2192 \u56DE\u6E90\u4E0A\u6E38\u3002\n\n\u6240\u6709 JSON \u54CD\u5E94\u5E26 `ETag`\uFF1B\u643A\u5E26 `If-None-Match` \u65F6\u672A\u53D8\u66F4\u5185\u5BB9\u8FD4\u56DE `304`\u3002\u65E7\u8DEF\u5F84\uFF08`/api/{provider}/{id}`\u3001`/api/search` \u7B49\uFF09\u4FDD\u7559\u53EF\u7528\u5E76\u6807\u8BB0 `deprecated`\uFF1B`/api/getData` \u5DF2\u79FB\u9664\uFF0C\u8BF7\u6539\u7528 `/api/v1/resolve`\u3002",
      license: { name: "MIT", identifier: "MIT" }
    },
    servers: [{ url: "/", description: "\u5F53\u524D\u90E8\u7F72" }],
    security: [{ bearerAuth: [] }, { sessionCookie: [] }],
    tags: [
      { name: "detail", description: "\u6761\u76EE\u8BE6\u60C5" },
      { name: "search", description: "\u641C\u7D22" },
      { name: "meta", description: "\u914D\u7F6E\u3001\u76EE\u5F55\u3001\u5065\u5EB7\u4E0E\u8FD0\u884C\u65F6\u4FE1\u606F" },
      { name: "auth", description: "\u6D4F\u89C8\u5668 UI \u7684 PoW \u4F1A\u8BDD" },
      { name: "legacy", description: "\u517C\u5BB9\u65E7\u8DEF\u5F84\uFF08\u5DF2\u5F03\u7528\uFF0C\u4EC5\u4FDD\u7559\u53EF\u7528\uFF09" }
    ],
    paths: {
      // 其余 v1 端点（目录、解析、各数据源搜索、带媒体类型的详情）与兼容路径；
      // 以下显式定义的键优先
      ...EXTRA_V1_PATHS,
      ...LEGACY_PATHS,
      "/api/v1/{provider}/{id}": {
        get: {
          tags: ["detail"],
          operationId: "getDetail",
          summary: "\u83B7\u53D6\u6761\u76EE\u8BE6\u60C5",
          description: "\u6240\u6709\u6570\u636E\u6E90\u7EDF\u4E00\u5165\u53E3\u3002\u8FD4\u56DE\u539F\u59CB\u5143\u6570\u636E + `format`\uFF08PT \u7B80\u4ECB\uFF09\u3002\n\n`/api/v1/{provider}/{type}/{id}` \u662F\u7B49\u4EF7\u5199\u6CD5\uFF1ATMDb / Trakt \u7684\u5A92\u4F53\u7C7B\u578B\u65E2\u53EF\u653E query \u4E5F\u53EF\u653E\u8DEF\u5F84\u3002\n\n\u652F\u6301 `HEAD` \u4E0E\u6761\u4EF6\u8BF7\u6C42\uFF08`If-None-Match` \u672A\u53D8\u66F4\u65F6\u8FD4\u56DE 304\uFF09\uFF1B\u5176\u5B83\u65B9\u6CD5\u8FD4\u56DE 405 \u5E76\u5E26 `Allow` \u5934\u3002",
          parameters: [
            { name: "provider", in: "path", required: true, schema: SITE_SCHEMA },
            { name: "id", in: "path", required: true, schema: ID_SCHEMA },
            { name: "type", in: "query", required: false, schema: TYPE_SCHEMA },
            { name: "full", in: "query", required: false, schema: FULL_SCHEMA },
            ...COMMON_HEADER_PARAMS
          ],
          responses: {
            200: ok({ $ref: "#/components/schemas/Detail" }, "\u6761\u76EE\u8BE6\u60C5"),
            ...detailErrors()
          }
        }
      },
      "/api/v1/search": {
        get: {
          tags: ["search"],
          operationId: "search",
          summary: "\u805A\u5408\u641C\u7D22",
          description: "`source=auto` \u65F6\u5E76\u884C\u641C\u7D22\u8C46\u74E3 / IMDb / Bangumi / TMDb \u5E76\u4EA4\u9519\u5408\u5E76\u7ED3\u679C\u3002",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
            {
              name: "source",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["auto", "douban", "imdb", "bangumi", "steam", "tmdb", "trakt"],
                default: "auto"
              }
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 25, default: 10 }
            }
          ],
          responses: {
            200: ok({ $ref: "#/components/schemas/SearchResult" }),
            400: errorResponse("\u7F3A\u5C11 q \u6216\u53C2\u6570\u975E\u6CD5"),
            401: errorResponse("\u7F3A\u5C11\u6216\u65E0\u6548\u7684\u51ED\u636E"),
            429: errorResponse("\u89E6\u53D1\u9650\u6D41"),
            502: errorResponse("\u4E0A\u6E38\u5F02\u5E38"),
            504: errorResponse("\u4E0A\u6E38\u8D85\u65F6")
          }
        }
      },
      "/api/v1/imdb/search": {
        get: {
          tags: ["search"],
          operationId: "searchImdb",
          summary: "\u641C\u7D22 IMDb",
          description: "\u652F\u6301\u7C7B\u578B\u8FC7\u6EE4\u4E0E\u5E74\u4EFD\u8303\u56F4\uFF0C\u5BF9\u5E94 IMDb mainSearch \u7684\u539F\u751F\u53C2\u6570\u3002",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 25, default: 10 }
            },
            {
              name: "type",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "MOVIE / TV / TV_EPISODE / VIDEO_GAME \u7B49\uFF0C\u53EF\u9017\u53F7\u5206\u9694"
            },
            { name: "year_from", in: "query", required: false, schema: { type: "integer" } },
            { name: "year_to", in: "query", required: false, schema: { type: "integer" } },
            { name: "exact", in: "query", required: false, schema: { type: "boolean" } }
          ],
          responses: {
            200: ok({ $ref: "#/components/schemas/SearchResult" }),
            400: errorResponse("\u53C2\u6570\u975E\u6CD5"),
            502: errorResponse("\u4E0A\u6E38\u5F02\u5E38")
          }
        }
      },
      "/api/v1/douban/search": {
        get: {
          tags: ["search"],
          operationId: "searchDouban",
          summary: "\u641C\u7D22\u8C46\u74E3",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 25, default: 10 }
            }
          ],
          responses: {
            200: ok({ $ref: "#/components/schemas/SearchResult" }),
            400: errorResponse("\u7F3A\u5C11 q \u6216\u53C2\u6570\u975E\u6CD5"),
            502: errorResponse("\u4E0A\u6E38\u98CE\u63A7\u6216\u5F02\u5E38")
          }
        }
      },
      "/api/v1/douban/cookie-status": {
        get: {
          tags: ["meta"],
          operationId: "doubanCookieStatus",
          summary: "\u68C0\u67E5 DOUBAN_COOKIE \u767B\u5F55\u6001",
          parameters: [
            {
              name: "refresh",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["1"] },
              description: "\u5F3A\u5236\u5237\u65B0\uFF08\u8DF3\u8FC7 10 \u5206\u949F\u7ED3\u679C\u7F13\u5B58\uFF09"
            }
          ],
          responses: {
            200: ok({ type: "object", additionalProperties: true, description: "Cookie \u5065\u5EB7\u72B6\u6001" })
          }
        }
      },
      "/api/config": {
        get: {
          tags: ["meta"],
          operationId: "getConfig",
          summary: "\u524D\u7AEF\u80FD\u529B\u63A2\u6D4B",
          security: [],
          responses: {
            200: ok({ $ref: "#/components/schemas/Config" })
          }
        }
      },
      "/health": {
        get: {
          tags: ["meta"],
          operationId: "health",
          summary: "\u5B58\u6D3B\u63A2\u9488",
          security: [],
          responses: {
            200: ok({ $ref: "#/components/schemas/Health" }),
            429: { description: "\u89E6\u53D1\u9650\u6D41", headers: RATE_LIMITED_HEADERS }
          }
        }
      },
      "/api/v1/egress": {
        get: {
          tags: ["meta"],
          operationId: "egress",
          summary: "\u51FA\u53E3\u81EA\u68C0",
          description: "\u8FD4\u56DE\u5B9E\u9645\u51FA\u53E3 IP \u4E0E IMDb GraphQL \u53EF\u8FBE\u6027\u3002",
          responses: { 200: ok({ type: "object", additionalProperties: true }) }
        }
      },
      "/api/auth/challenge": {
        get: {
          tags: ["auth"],
          operationId: "authChallenge",
          summary: "\u83B7\u53D6 PoW \u6311\u6218",
          security: [],
          responses: {
            200: ok({
              type: "object",
              required: ["challenge", "difficulty"],
              properties: {
                challenge: { type: "string" },
                difficulty: { type: "integer" }
              }
            }),
            503: errorResponse("\u672A\u914D\u7F6E AUTH_SECRET")
          }
        }
      },
      "/api/auth/session": {
        get: {
          tags: ["auth"],
          operationId: "getSession",
          summary: "\u67E5\u8BE2\u5F53\u524D\u4F1A\u8BDD",
          security: [],
          responses: { 200: ok({ type: ["object", "null"], additionalProperties: true }) }
        },
        post: {
          tags: ["auth"],
          operationId: "createSession",
          summary: "\u7528 PoW \u89E3\u6362\u53D6 HttpOnly \u4F1A\u8BDD",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["challenge", "solution"],
                  properties: {
                    challenge: { type: "string" },
                    solution: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            200: ok({ type: ["object", "null"], additionalProperties: true }),
            400: errorResponse("\u6311\u6218\u65E0\u6548\u6216\u89E3\u4E0D\u6B63\u786E"),
            429: errorResponse("\u89E6\u53D1\u9650\u6D41")
          }
        },
        delete: {
          tags: ["auth"],
          operationId: "deleteSession",
          summary: "\u9000\u51FA\u5E76\u6E05\u9664\u4F1A\u8BDD",
          security: [],
          responses: { 200: ok({ type: "object", additionalProperties: true }) }
        }
      },
      "/openapi.json": {
        get: {
          tags: ["meta"],
          operationId: "openapi",
          summary: "\u672C OpenAPI \u63CF\u8FF0",
          security: [],
          responses: {
            200: jsonResponse2("OpenAPI 3.1 \u6587\u6863", { type: "object", additionalProperties: true })
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "\u670D\u52A1\u7AEF\u914D\u7F6E\u7684 API_TOKEN\uFF1B\u5916\u90E8\u5BA2\u6237\u7AEF\u4F7F\u7528"
        },
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: SESSION_COOKIE,
          description: "\u6D4F\u89C8\u5668 UI \u901A\u8FC7 PoW \u6362\u53D6\u7684 HttpOnly \u4F1A\u8BDD"
        }
      },
      schemas: {
        Envelope: envelope({ type: "object", additionalProperties: true }),
        Meta: {
          type: "object",
          required: ["requestId", "timestamp", "durationMs", "version", "cached"],
          properties: {
            requestId: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            durationMs: { type: "integer", minimum: 0 },
            version: { type: "string" },
            cached: { type: "boolean", description: "\u662F\u5426\u547D\u4E2D\u8FDB\u7A0B\u5185\u6216\u6301\u4E45\u5C42\u7F13\u5B58" },
            source: {
              type: "string",
              enum: ["api", "graphql", "html", "backend", "probe"],
              description: "\u672C\u6B21\u6570\u636E\u7684\u6765\u6E90\u901A\u9053"
            }
          }
        },
        Error: {
          type: "object",
          required: ["type", "retryable"],
          properties: {
            type: {
              type: "string",
              description: "\u9519\u8BEF\u7B26\u53F7\uFF0C\u5982 BAD_REQUEST / UPSTREAM_TIMEOUT"
            },
            details: { type: ["object", "array", "string", "null"] },
            retryable: { type: "boolean" }
          }
        },
        Detail: {
          type: "object",
          additionalProperties: true,
          required: ["site", "sid"],
          description: "\u4E0A\u6E38\u5143\u6570\u636E + `format`\uFF1B\u5B57\u6BB5\u968F\u6570\u636E\u6E90\u4E0D\u540C\u800C\u4E0D\u540C",
          properties: {
            success: { type: "boolean" },
            site: { type: "string" },
            sid: { type: "string" },
            link: { type: "string", format: "uri" },
            title: { type: "string" },
            original_title: { type: "string" },
            chinese_title: { type: "string" },
            foreign_title: { type: "string" },
            year: { type: ["string", "number"] },
            rating: { type: ["string", "number"] },
            image: { type: "string", format: "uri" },
            intro: { type: "string" },
            format: { type: "string", description: "\u6E32\u67D3\u597D\u7684 PT \u7B80\u4ECB" }
          }
        },
        SearchItem: {
          type: "object",
          required: ["site", "sid", "title"],
          properties: {
            site: { type: "string", enum: [...RESOURCE_SITES] },
            sid: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            year: { type: "string" },
            rating: { type: ["string", "number"] },
            poster: { type: "string" },
            url: { type: "string" }
          }
        },
        SearchResult: {
          type: "object",
          required: ["query", "source", "total", "items"],
          properties: {
            query: { type: "string" },
            source: { type: "string" },
            total: { type: "integer" },
            items: { type: "array", items: { $ref: "#/components/schemas/SearchItem" } }
          }
        },
        Providers: PROVIDERS_SCHEMA,
        Config: {
          type: "object",
          additionalProperties: true,
          properties: {
            version: { type: "string" },
            authRequired: { type: "boolean" },
            sessionAuth: { type: "boolean" },
            powDifficulty: { type: "integer" },
            sessionTtlSeconds: { type: "integer" },
            rateLimitMax: { type: "integer" },
            cacheTtlSeconds: { type: "integer" },
            sources: { type: "object", additionalProperties: true }
          }
        },
        Health: {
          type: "object",
          additionalProperties: true,
          properties: {
            status: { type: "string" },
            runtime: { type: "string", enum: ["node", "bun", "edge"] },
            version: { type: "string" },
            capabilities: { type: "object", additionalProperties: true },
            cacheTtlSeconds: { type: "integer" },
            cacheLayers: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  };
}
__name(buildOpenApiDocument, "buildOpenApiDocument");

// src/views/docs.ts
var COPY = {
  zh: {
    lang: "zh-CN",
    title: "PT-Gen",
    subtitle: "\u591A\u6E90 PT \u7B80\u4ECB\u751F\u6210 API \xB7 \u57FA\u4E8E Hono + TypeScript\uFF0C\u53EF\u90E8\u7F72\u5230 Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne",
    endpoints: "\u63A5\u53E3",
    detail: "\u5F71\u7247 / \u5267\u96C6\u8BE6\u60C5",
    search: "\u641C\u7D22\u5F71\u7247",
    auth: "\u9274\u6743",
    authNote: "\u5916\u90E8\u5BA2\u6237\u7AEF\u4F7F\u7528 API_TOKEN\uFF08Authorization: Bearer &lt;token&gt;\uFF09\uFF0C\u8BE5\u4EE4\u724C\u53EA\u5728\u670D\u52A1\u7AEF\u914D\u7F6E\uFF0C\u524D\u7AEF\u4E0D\u63D0\u4F9B\u8F93\u5165\u6846\u3002\u914D\u7F6E AUTH_SECRET \u540E\uFF0C\u6D4F\u89C8\u5668 UI \u4F1A\u81EA\u52A8\u5B8C\u6210 PoW \u5E76\u6362\u53D6 HttpOnly \u4F1A\u8BDD\uFF1B\u4E24\u8005\u90FD\u672A\u914D\u7F6E\u65F6 API \u516C\u5F00\u3002",
    response: "\u7EDF\u4E00\u54CD\u5E94\u4F53",
    responseNote: "\u6240\u6709\u54CD\u5E94\u90FD\u9075\u5FAA\u540C\u4E00\u4E2A JSON Envelope\uFF0C\u9519\u8BEF\u4E5F\u4F7F\u7528\u76F8\u540C\u7ED3\u6784\u3002",
    headers: "\u6807\u51C6\u54CD\u5E94\u5934",
    headersNote: "\u6BCF\u4E2A\u54CD\u5E94\u90FD\u9644\u5E26\u8FFD\u8E2A\u3001\u7F13\u5B58\u4E0E\u9650\u6D41\u4FE1\u606F\u3002",
    errors: "\u9519\u8BEF\u7801",
    examples: "\u793A\u4F8B",
    params: "\u53C2\u6570",
    aliasNote: "<code>/api/v1</code> \u662F\u552F\u4E00\u7684\u89C4\u8303\u9762\u3002\u4EE5\u4E0B\u65E7\u8DEF\u5F84\u4FDD\u6301\u53EF\u7528\uFF0C\u4F46\u5728 OpenAPI \u91CC\u6807\u8BB0\u4E3A <code>deprecated</code>\uFF0C\u8BED\u4E49\u4E0E v1 \u5B8C\u5168\u4E00\u81F4\uFF1A<code>/api/{provider}/{id}</code>\u3001<code>/api/search</code>\u3001<code>/api/imdb/:id</code>\u3001<code>/api/douban/:id</code>\u3001<code>/api/douban/book/:id</code>\u3001<code>/api/bangumi/:id</code>\u3001<code>/api/steam/:id</code>\u3001<code>/api/melon/:id</code>\u3001<code>/api/hongguo/:id</code>\u3001<code>/api/qqmusic/:id</code>\u3001<code>/api/tmdb/:type/:id</code>\u3001<code>/api/trakt/:type/:id</code>\u3002<code>/api/getData</code> \u5DF2\u79FB\u9664\uFF0C\u8BF7\u6539\u7528 <code>/api/v1/resolve</code>\u3002",
    openapiNote: '\u673A\u5668\u53EF\u8BFB\u63CF\u8FF0\uFF1A<a href="/openapi.json"><code>/openapi.json</code></a>\uFF08OpenAPI 3.1\uFF09\uFF0C\u53EF\u76F4\u63A5\u5BFC\u5165 Postman\u3001\u751F\u6210 SDK \u6216\u505A\u5951\u7EA6\u6D4B\u8BD5\u3002',
    fullDefault: "\u9ED8\u8BA4\u5168\u91CF\uFF0C<code>full=false</code> \u7CBE\u7B80",
    runtime: "\u5F53\u524D\u8FD0\u884C\u65F6",
    imdbUnavailable: "\u5F53\u524D\u90E8\u7F72\u7684 IMDb \u901A\u9053\u4E0D\u53EF\u7528",
    imdbUnavailableNote: "IMDb \u57DF\u540D\u9ED8\u8BA4\u8D70 <code>connect()</code>\uFF08<code>cloudflare:sockets</code>\uFF09\u88F8 TCP\uFF0C\u56E0\u4E3A Workers \u7684 <code>fetch</code> \u51FA\u53E3\u88AB IMDb \u4E00\u5F8B\u56DE <code>429</code>\u3002\u5931\u8D25\u65F6\u628A <code>IMDB_BACKEND_URL</code> \u6307\u5411 <code>php-backend/</code> \u6216 <code>edgeone/</code> \u5916\u90E8\u540E\u7AEF\u3002<code>/api/v1/douban/*</code> \u4E0D\u53D7\u5F71\u54CD\uFF0C\u4ECD\u53EF\u7528\u3002",
    doubanNote: "\u8C46\u74E3\u8BE6\u60C5\u53EA\u8D70\u7F51\u9875\u6293\u53D6\uFF1A\u4EC5\u4F7F\u7528\u624B\u52A8\u914D\u7F6E\u7684 <code>DOUBAN_COOKIE</code>\u3002\u547D\u4E2D\u53CD\u722C\u540E 10 \u5206\u949F\u5185\u4E0D\u518D\u91CD\u8BD5\u7F51\u9875\u901A\u9053\uFF1B\u914D\u7F6E <code>DOUBAN_BACKEND_URL</code>\u540E\u6539\u7531\u540E\u7AEF\u4EE3\u53D6\u3002\u914D\u7F6E <code>DOUBAN_COOKIE_EXPIRES_AT</code> \u53EF\u542F\u7528\u4E3B\u52A8\u68C0\u67E5\uFF0C\u5E76\u914D\u5408 Telegram \u5728\u5230\u671F\u524D 24 \u5C0F\u65F6\u63D0\u9192\u3002",
    cacheNote: /* @__PURE__ */ __name((layers) => layers.length > 0 ? `\u6301\u4E45\u5316\u7F13\u5B58\u5DF2\u542F\u7528\uFF1A\u8BFB\u53D6\u987A\u5E8F\u4E3A\u8FDB\u7A0B\u5185 TTL \u2192 \u6301\u4E45\u5C42 \u2192 \u9759\u6001\u6570\u636E\u5E93 \u2192 \u56DE\u6E90\u4E0A\u6E38\uFF0C\u56DE\u6E90\u6210\u529F\u540E\u5E76\u884C\u5199\u56DE\u5DF2\u914D\u7F6E\u7684\u5B58\u50A8\uFF08\u5F53\u524D\uFF1A<code>${layers.join(" + ")}</code>\uFF09\u3002\u4EFB\u4E00\u5C42\u6545\u969C\u53EA\u8BB0\u65E5\u5FD7\uFF0C\u4E0D\u5F71\u54CD\u54CD\u5E94\uFF1B\u6761\u76EE\u4ECD\u6309 <code>CACHE_TTL_SECONDS</code> \u8FC7\u671F\u3002` : "\u5F53\u524D\u53EA\u6709\u8FDB\u7A0B\u5185\u7F13\u5B58\uFF1A\u51B7\u542F\u52A8\u4E0E\u591A\u5B9E\u4F8B\u4E4B\u95F4\u4E0D\u5171\u4EAB\u3002Cloudflare \u7ED1\u5B9A R2 / D1\uFF0CVercel \u5173\u8054 Blob Store\uFF0CEdgeOne \u7ED1\u5B9A Blob \u5BF9\u8C61\u5B58\u50A8\uFF0CNode / Bun \u4F7F\u7528\u672C\u5730 <code>data/cache</code> \u76EE\u5F55\u540E\u5373\u542F\u7528\u6301\u4E45\u5C42\u3002", "cacheNote"),
    footnote: "\u6570\u636E\u6765\u6E90\u4E8E IMDb \u516C\u5F00\u9875\u9762\u3001\u5B98\u65B9 Web GraphQL \u63A5\u53E3\u4E0E\u8C46\u74E3\u516C\u5F00\u9875\u9762\uFF0C\u4EC5\u4F9B\u5B66\u4E60\u4E0E\u7814\u7A76\u4F7F\u7528\u3002"
  },
  en: {
    lang: "en",
    title: "PT-Gen",
    subtitle: "Multi-source PT description API \xB7 Built with Hono + TypeScript \xB7 Deployable to Cloudflare Workers / Vercel / Node.js / Bun / EdgeOne",
    endpoints: "Endpoints",
    detail: "Title details",
    search: "Search titles",
    auth: "Authentication",
    authNote: "API clients use API_TOKEN (Authorization: Bearer &lt;token&gt;); it is configured server-side only and the web UI has no token field. With AUTH_SECRET set, the browser UI solves a PoW and exchanges it for an HttpOnly session automatically. If neither is set, the API is public.",
    response: "Unified response body",
    responseNote: "Every response follows the same JSON envelope, including errors.",
    headers: "Standard response headers",
    headersNote: "Each response carries tracing, cache and rate-limit metadata.",
    errors: "Error codes",
    examples: "Examples",
    params: "Parameters",
    aliasNote: "<code>/api/v1</code> is the only canonical surface. These legacy paths keep working and are marked <code>deprecated</code> in the OpenAPI document; their semantics match v1 exactly: <code>/api/{provider}/{id}</code>, <code>/api/search</code>, <code>/api/imdb/:id</code>, <code>/api/douban/:id</code>, <code>/api/douban/book/:id</code>, <code>/api/bangumi/:id</code>, <code>/api/steam/:id</code>, <code>/api/melon/:id</code>, <code>/api/hongguo/:id</code>, <code>/api/qqmusic/:id</code>, <code>/api/tmdb/:type/:id</code>, <code>/api/trakt/:type/:id</code>. <code>/api/getData</code> has been removed; use <code>/api/v1/resolve</code> instead.",
    openapiNote: 'Machine-readable spec: <a href="/openapi.json"><code>/openapi.json</code></a> (OpenAPI 3.1) \u2014 import it into Postman, generate an SDK, or run contract tests.',
    fullDefault: "Full data by default; <code>full=false</code> to slim down",
    runtime: "Runtime",
    imdbUnavailable: "The IMDb channel is unavailable on this deployment",
    imdbUnavailableNote: "IMDb hosts go through <code>connect()</code> (<code>cloudflare:sockets</code>) raw TCP by default, because Workers <code>fetch</code> egress is answered with <code>429</code> by IMDb. If that fails, point <code>IMDB_BACKEND_URL</code> at the bundled <code>php-backend/</code> or <code>edgeone/</code> backend.<code>/api/v1/douban/*</code> is unaffected and still works.",
    doubanNote: "Douban details use HTML requests only: a manually configured <code>DOUBAN_COOKIE</code> is used when present, After an anti-bot block the HTML channel is skipped for 10 minutes; set <code>DOUBAN_BACKEND_URL</code> to have a backend fetch it instead. Set <code>DOUBAN_COOKIE_EXPIRES_AT</code> to enable proactive checks and a Telegram reminder 24 hours before expiry.",
    cacheNote: /* @__PURE__ */ __name((layers) => layers.length > 0 ? `Persistent cache is on. Reads go in-process TTL \u2192 persistent layers \u2192 static database \u2192 upstream, and a successful upstream fetch is written back in parallel (currently: <code>${layers.join(" + ")}</code>). A failing layer only logs and never breaks the response; entries still expire after <code>CACHE_TTL_SECONDS</code>.` : "Only the in-process cache is active, so it is not shared across cold starts or instances. Bind R2 / D1 on Cloudflare, link a Blob Store on Vercel, bind Blob object storage on EdgeOne, or use the local <code>data/cache</code> directory on Node / Bun.", "cacheNote"),
    footnote: "Data comes from public IMDb pages, the official web GraphQL endpoint and public Douban pages, for study and research only."
  }
};
function pickLocale(acceptLanguage) {
  if (!acceptLanguage) return "en";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("zh") ? "zh" : "en";
}
__name(pickLocale, "pickLocale");
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHtml, "escapeHtml");
var STYLES = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans SC",sans-serif;background:#0b0d12;color:#e6e8ee;line-height:1.65}
.wrap{max-width:960px;margin:0 auto;padding:48px 24px 72px}
h1{font-size:2.1rem;margin:0 0 8px;letter-spacing:-.02em}
.sub{color:#98a2b3;margin:0 0 40px}
h2{font-size:1.15rem;margin:40px 0 14px;padding-bottom:8px;border-bottom:1px solid #1e2330}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.875em}
p code,li code{background:#161b26;border:1px solid #232a38;border-radius:4px;padding:1px 6px;color:#8ec7ff}
pre{background:#11151f;border:1px solid #1e2330;border-radius:10px;padding:16px;overflow-x:auto;margin:14px 0}
pre code{color:#c8d3e6;background:none;border:none;padding:0;font-size:.84rem;line-height:1.6}
ul{padding-left:20px;margin:10px 0}
li{margin:6px 0;color:#c3cad8}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.9rem}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #1e2330;vertical-align:top}
th{color:#98a2b3;font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}
td code{color:#8ec7ff}
.note{background:#121722;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;color:#a9b4c7;margin:14px 0;font-size:.9rem}
.note.warn{background:#1f1611;border-left-color:#f59e0b;color:#e8c9a8}
.badge.off{background:#2a1414;border-color:#5b2626;color:#f08b8b}
.footer{margin-top:56px;padding-top:20px;border-top:1px solid #1e2330;color:#6b7488;font-size:.85rem}
.badge{display:inline-block;background:#16202f;border:1px solid #2b3a52;color:#7cb3f0;border-radius:999px;padding:2px 10px;font-size:.78rem;margin-right:6px}
`;
function renderEndpointTable(copy, imdbUsable) {
  const imdbDetail = imdbUsable ? `<code>GET /api/v1/imdb/{id}</code>` : `<code>GET /api/v1/imdb/{id}</code> <span class="badge off">501</span>`;
  const imdbSearch = imdbUsable ? `<code>GET /api/v1/imdb/search</code>` : `<code>GET /api/v1/imdb/search</code> <span class="badge off">501</span>`;
  return `
    <table>
      <thead><tr><th>${copy.endpoints}</th><th>${copy.params}</th></tr></thead>
      <tbody>
        <tr><td><code>GET /api/v1/{provider}/{id}</code></td><td><code>provider</code> = ${RESOURCE_SITES.join(" / ")}\uFF1B<code>id</code>\uFF1B<code>type</code>\uFF08<code>tmdb</code>\uFF1Amovie/tv\uFF0C<code>trakt</code>\uFF1Amovie/show\uFF0C\u53EF\u653E\u8DEF\u5F84\u6216 query\uFF09\uFF1B<code>full</code> \u2014 \u6240\u6709\u6570\u636E\u6E90\u7684\u7EDF\u4E00\u8BE6\u60C5\u5165\u53E3</td></tr>
        <tr><td><code>GET /api/v1/{provider}/{type}/{id}</code></td><td>\u540C\u4E0A\uFF0C\u5A92\u4F53\u7C7B\u578B\u653E\u5728\u8DEF\u5F84\u91CC\uFF08\u4EC5 TMDb / Trakt \u4F7F\u7528\uFF09</td></tr>
        <tr><td>${imdbDetail}</td><td>${copy.fullDefault} \u2014 IMDb ${copy.detail}</td></tr>
        <tr><td>${imdbSearch}</td><td><code>q</code>, <code>limit</code>, <code>type</code>\uFF08MOVIE/TV/\u2026\uFF0C\u53EF\u9017\u53F7\u5206\u9694\uFF09, <code>year_from</code>, <code>year_to</code>, <code>exact</code> \u2014 IMDb ${copy.search}</td></tr>
        <tr><td><code>GET /api/v1/douban/{id}</code></td><td>${copy.fullDefault} \u2014 \u8C46\u74E3${copy.detail}\uFF08\u7EAF\u6570\u5B57 ID\uFF09</td></tr>
        <tr><td><code>GET /api/v1/douban/search</code></td><td><code>q</code>, <code>limit</code> \u2014 \u8C46\u74E3${copy.search}</td></tr>
        <tr><td><code>GET /api/v1/bangumi/search</code></td><td><code>q</code>, <code>limit</code>, <code>type</code>\uFF08all/book/anime/music/game/real\uFF09</td></tr>
        <tr><td><code>GET /api/v1/steam/search</code></td><td><code>q</code>, <code>limit</code> \u2014 Steam \u5E94\u7528\u641C\u7D22</td></tr>
        <tr><td><code>GET /api/v1/tmdb/search</code></td><td><code>q</code>, <code>limit</code> \u2014 \u9700\u8981 <code>TMDB_API_KEY</code></td></tr>
        <tr><td><code>GET /api/v1/trakt/search</code></td><td><code>q</code>, <code>limit</code> \u2014 \u9700\u8981 <code>TRAKT_CLIENT_ID</code></td></tr>
        <tr><td><code>GET /api/v1/search</code></td><td><code>q</code>, <code>source</code>, <code>limit</code> \u2014 \u805A\u5408\u641C\u7D22\uFF08auto/douban/imdb/tmdb/bangumi/trakt/steam\uFF09</td></tr>
        <tr><td><code>GET /api/v1/resolve</code></td><td><code>url</code> \u6216 <code>id</code> \u6216 <code>q</code>\uFF08\u53EF\u914D <code>source</code> / <code>type</code>\uFF09\u2014 \u94FE\u63A5 / \u5173\u952E\u8BCD\u89E3\u6790\u540E\u518D\u53D6\u8BE6\u60C5</td></tr>
        <tr><td><code>GET /api/v1/providers</code></td><td>\u2014 \u6570\u636E\u6E90\u76EE\u5F55\uFF1A\u53EF\u7528 <code>provider</code>\u3001\u522B\u540D\u4E0E\u80FD\u529B</td></tr>
        <tr><td><code>GET /api/v1/douban/cookie-status</code></td><td>\u68C0\u67E5 Cookie \u767B\u5F55\u6001\uFF08\u7F13\u5B58 10 \u5206\u949F\uFF0C<code>refresh=1</code> \u5F3A\u5236\u5237\u65B0\uFF09</td></tr>
        <tr><td><code>GET /api/v1/egress</code></td><td>\u51FA\u53E3\u81EA\u68C0\uFF1A\u5B9E\u9645\u51FA\u53E3 IP + IMDb GraphQL \u53EF\u8FBE\u6027</td></tr>
        <tr><td><code>GET /api/auth/challenge</code></td><td>\u2014 \u83B7\u53D6 PoW \u6311\u6218\uFF08\u516C\u5F00\uFF09</td></tr>
        <tr><td><code>POST /api/auth/session</code></td><td><code>challenge</code>, <code>solution</code> \u2014 \u6362\u53D6 HttpOnly \u4F1A\u8BDD Cookie</td></tr>
        <tr><td><code>GET /api/auth/session</code></td><td>\u2014 \u67E5\u8BE2\u5F53\u524D\u4F1A\u8BDD\u72B6\u6001</td></tr>
        <tr><td><code>DELETE /api/auth/session</code></td><td>\u2014 \u9000\u51FA\u5E76\u6E05\u9664\u4F1A\u8BDD</td></tr>
        <tr><td><code>GET /api/config</code></td><td>\u2014 \u524D\u7AEF\u80FD\u529B\u63A2\u6D4B\uFF08\u4E0D\u8FD4\u56DE\u673A\u5BC6\uFF09</td></tr>
        <tr><td><code>GET /health</code> / <code>GET /api/health</code></td><td>\u2014</td></tr>
        <tr><td><code>GET /openapi.json</code></td><td>\u2014 OpenAPI 3.1 \u63CF\u8FF0\uFF08\u516C\u5F00\uFF09</td></tr>
      </tbody>
    </table>`;
}
__name(renderEndpointTable, "renderEndpointTable");
function renderEnvelopeExample(imdbUsable, dataSource) {
  const data = imdbUsable ? `{ "success": true, "site": "imdb", "sid": "tt0111161", "title": "The Shawshank Redemption", "year": 1994, "rating": 9.3 }` : `{ "success": true, "site": "douban", "sid": "1292052", "chinese_title": "\u8096\u7533\u514B\u7684\u6551\u8D4E", "year": "1994" }`;
  const source = imdbUsable ? `,
    "source": "${dataSource}"` : "";
  return `{
  "code": 20000,
  "message": "OK",
  "data": ${data},
  "error": null,
  "meta": {
    "requestId": "3f1c\u2026",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "durationMs": 812,
    "version": "${VERSION}",
    "cached": false${source}
  }
}`;
}
__name(renderEnvelopeExample, "renderEnvelopeExample");
var ERROR_EXAMPLE = `{
  "code": 50300,
  "message": "IMDb \u89E6\u53D1\u4E86 WAF \u6311\u6218\uFF0C\u6682\u65F6\u65E0\u6CD5\u83B7\u53D6\u6570\u636E",
  "data": null,
  "error": {
    "type": "UPSTREAM_CHALLENGE",
    "retryable": true,
    "details": { "hint": "\u7B49\u5F85 1-5 \u5206\u949F\u540E\u91CD\u8BD5\u2026" }
  },
  "meta": { "requestId": "3f1c\u2026", "durationMs": 25031, "version": "${VERSION}", "cached": false }
}`;
function renderHeaderTable() {
  const rows = [
    ["X-Request-Id", "\u5168\u94FE\u8DEF\u8BF7\u6C42 ID\uFF0C\u53EF\u900F\u4F20\u4E0A\u6E38\u503C"],
    ["X-API-Version", "API \u7248\u672C\u53F7\uFF0C\u7528\u4E8E\u611F\u77E5\u7834\u574F\u6027\u53D8\u66F4"],
    ["X-Business-Code", "\u6570\u5B57\u4E1A\u52A1\u7801\uFF0C\u4E0E\u54CD\u5E94\u4F53 code \u4E00\u81F4"],
    ["X-Data-Source", "\u6570\u636E\u901A\u9053\uFF1Agraphql / html\uFF08\u8C46\u74E3\u63A5\u53E3\u4E0D\u8FD4\u56DE\u8BE5\u5934\uFF09"],
    ["X-Cache", "HIT / MISS / BYPASS"],
    ["X-RateLimit-Limit", "\u6BCF\u5206\u949F\u5141\u8BB8\u7684\u8BF7\u6C42\u6570"],
    ["X-RateLimit-Remaining", "\u5F53\u524D\u7A97\u53E3\u5269\u4F59\u914D\u989D"],
    ["X-RateLimit-Reset", "\u914D\u989D\u91CD\u7F6E\u65F6\u95F4\uFF08Unix \u79D2\uFF09"],
    ["Cache-Control", "\u6210\u529F\u54CD\u5E94 public + s-maxage\uFF0C\u4FBF\u4E8E CDN \u7F13\u5B58"],
    ["ETag", "\u5185\u5BB9\u7684\u5F31\u6821\u9A8C\u503C\uFF1B\u914D\u5408 If-None-Match \u53EF\u5F97\u5230 304\uFF08\u4E0D\u542B\u8BF7\u6C42\u8017\u65F6\u7B49\u6613\u53D8\u5143\u4FE1\u606F\uFF09"],
    ["Retry-After", "\u9650\u6D41\u6216\u4E0A\u6E38\u6311\u6218\u65F6\u5EFA\u8BAE\u7684\u91CD\u8BD5\u79D2\u6570"]
  ];
  return `
    <table>
      <thead><tr><th>Header</th><th>\u8BF4\u660E</th></tr></thead>
      <tbody>${rows.map(([k, v]) => `<tr><td><code>${k}</code></td><td>${v}</td></tr>`).join("")}</tbody>
    </table>`;
}
__name(renderHeaderTable, "renderHeaderTable");
function renderErrorTable() {
  const rows = [
    ["20000", "OK", "200 \xB7 \u6210\u529F"],
    ["40000", "BAD_REQUEST", "400 \xB7 \u53C2\u6570\u7F3A\u5931\u6216\u975E\u6CD5"],
    ["40001", "INVALID_IMDB_ID", "400 \xB7 IMDb ID \u683C\u5F0F\u9519\u8BEF"],
    ["40002", "INVALID_DOUBAN_ID", "400 \xB7 \u8C46\u74E3 ID \u683C\u5F0F\u9519\u8BEF\uFF08\u9700\u7EAF\u6570\u5B57\uFF09"],
    ["40003", "INVALID_SOURCE_ID", "400 \xB7 \u5176\u5B83\u6570\u636E\u6E90 ID \u683C\u5F0F\u9519\u8BEF"],
    ["40100", "UNAUTHORIZED", "401 \xB7 \u7F3A\u5C11\u6216\u65E0\u6548 Bearer Token"],
    ["40300", "FORBIDDEN", "403 \xB7 \u5F53\u524D Token \u65E0\u6743\u8BBF\u95EE"],
    ["40301", "UPSTREAM_BLOCKED", "403 \xB7 \u4E0A\u6E38\u62D2\u7EDD\u5F53\u524D\u51FA\u53E3 IP"],
    ["40302", "DOUBAN_COOKIE_EXPIRED", "403 \xB7 \u8C46\u74E3 Cookie \u5DF2\u5931\u6548\u6216\u5DF2\u8FC7\u671F"],
    ["40400", "NOT_FOUND", "404 \xB7 \u4E0A\u6E38\u6CA1\u6709\u8BE5\u6761\u76EE"],
    ["40500", "METHOD_NOT_ALLOWED", "405 \xB7 \u4E0D\u652F\u6301\u7684 HTTP \u65B9\u6CD5"],
    ["42900", "RATE_LIMITED", "429 \xB7 \u89E6\u53D1\u9650\u6D41"],
    ["50000", "INTERNAL_ERROR", "500 \xB7 \u672A\u9884\u671F\u7684\u5185\u90E8\u9519\u8BEF"],
    ["50100", "NOT_IMPLEMENTED", "501 \xB7 \u8BE5\u80FD\u529B\u5728\u5F53\u524D\u8FD0\u884C\u65F6\u4E0D\u53EF\u7528"],
    ["50101", "CONFIG_REQUIRED", "501 \xB7 \u7F3A\u5C11\u5FC5\u9700\u7684\u914D\u7F6E\uFF08\u5982 TMDB_API_KEY\u3001QQ_COOKIE\uFF09"],
    ["50200", "UPSTREAM_ERROR", "502 \xB7 \u4E0A\u6E38\u5F02\u5E38\u72B6\u6001"],
    ["50300", "UPSTREAM_CHALLENGE", "503 \xB7 \u6301\u7EED\u547D\u4E2D WAF \u6311\u6218"],
    ["50400", "UPSTREAM_TIMEOUT", "504 \xB7 \u4E0A\u6E38\u8D85\u65F6"]
  ];
  return `
    <table>
      <thead><tr><th>code</th><th>type</th><th>\u8BF4\u660E</th></tr></thead>
      <tbody>${rows.map(([code, type, desc]) => `<tr><td><code>${code}</code></td><td><code>${type}</code></td><td>${desc}</td></tr>`).join("")}</tbody>
    </table>`;
}
__name(renderErrorTable, "renderErrorTable");
function renderDocsPage(config, acceptLanguage, env) {
  const copy = COPY[pickLocale(acceptLanguage)];
  const imdbUsable = canUseImdb(config);
  const cacheLayers = describeCacheStore(createCacheStore(env));
  return `<!DOCTYPE html>
<html lang="${copy.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${copy.title}</title>
<meta name="description" content="${escapeHtml(copy.subtitle)}">
<style>${STYLES}</style>
</head>
<body>
<main class="wrap">
  <h1>${copy.title}</h1>
  <p class="sub">${escapeHtml(copy.subtitle)}</p>

  <p>
    <span class="badge">${copy.runtime}: ${config.runtime}</span>
    <span class="badge">cache: ${config.cacheTtlSeconds}s</span>
    <span class="badge ${cacheLayers.length > 0 ? "" : "off"}">persistent: ${cacheLayers.length > 0 ? cacheLayers.join("+") : "off"}</span>
    <span class="badge">auth: ${config.apiToken ? "Bearer" : config.authSecret ? "session" : "off"}</span>
    <span class="badge ${imdbUsable ? "" : "off"}">imdb: ${imdbUsable ? hasImdbBackend(config) ? "backend" : "on" : "off"}</span>
    <span class="badge">douban cookie: ${config.doubanCookie ? "on" : "off"}</span>
  </p>

  <h2>${copy.endpoints}</h2>
  ${imdbUsable ? "" : `<p class="note warn"><strong>${copy.imdbUnavailable}</strong><br>${copy.imdbUnavailableNote}</p>`}
  ${renderEndpointTable(copy, imdbUsable)}
  <p class="note">${copy.aliasNote}</p>
  <p class="note">${copy.openapiNote}</p>

  <p class="note">${copy.doubanNote}</p>

  <p class="note">${copy.cacheNote(cacheLayers)}</p>

  <h2>${copy.auth}</h2>
  <p>${copy.authNote}</p>
  <pre><code>curl -H "Authorization: Bearer $API_TOKEN" \\
  "https://your-domain/api/v1/douban/1292052"

# \u6D4F\u89C8\u5668 UI \u81EA\u52A8\u5B8C\u6210\u4EE5\u4E0B\u6D41\u7A0B\uFF0C\u65E0\u9700\u624B\u52A8\u586B\u5199\u5BC6\u94A5\uFF1A
curl "https://your-domain/api/auth/challenge"
curl -X POST "https://your-domain/api/auth/session" \\
  -H "Content-Type: application/json" \\
  -d '{"challenge":"ptg1...","solution":"12345"}'</code></pre>

  <h2>${copy.response}</h2>
  <p>${copy.responseNote}</p>
  <pre><code>${renderEnvelopeExample(imdbUsable, hasImdbBackend(config) ? "backend" : "graphql")}</code></pre>
  <p class="note"><strong>code \u4E3A\u6570\u5B57\u4E1A\u52A1\u7801</strong>\uFF0C\u89C4\u5219\u662F <code>HTTP \u72B6\u6001\u7801 \xD7 100 + \u5E8F\u53F7</code>\uFF1A
  <code>40001</code> \u8868\u793A 400 \u5BB6\u65CF\u7684\u7B2C 1 \u79CD\u60C5\u51B5\u3002\u56E0\u6B64\u540C\u4E00\u4E2A HTTP \u72B6\u6001\u4E0B\u7684\u4E0D\u540C\u539F\u56E0\u53EF\u533A\u5206
  \uFF08<code>40001</code> \u662F IMDb ID \u683C\u5F0F\u9519\u3001<code>40002</code> \u662F\u8C46\u74E3 ID \u683C\u5F0F\u9519\uFF09\uFF0C
  \u5BA2\u6237\u7AEF\u53EF\u4EE5\u9488\u5BF9\u5177\u4F53\u539F\u56E0\u5904\u7406\u800C\u4E0D\u5FC5\u89E3\u6790\u6587\u6848\u3002<code>error.type</code> \u662F\u5BF9\u5E94\u7684\u5B57\u7B26\u4E32\u7B26\u53F7\uFF0C
  \u4FBF\u4E8E\u65E5\u5FD7\u68C0\u7D22\u4E0E\u4EE3\u7801\u91CC switch\u3002\u540C\u4E00\u4E2A\u7801\u4E5F\u4F1A\u5199\u5165 <code>X-Business-Code</code> \u54CD\u5E94\u5934\u3002</p>
  <pre><code>${ERROR_EXAMPLE}</code></pre>
  ${renderErrorTable()}

  <h2>${copy.headers}</h2>
  <p>${copy.headersNote}</p>
  ${renderHeaderTable()}

  <h2>${copy.examples}</h2>
  <pre><code># \u7EDF\u4E00\u8BE6\u60C5\u5165\u53E3\uFF1A/api/v1/{provider}/{id}
curl "https://your-domain/api/v1/douban/1292052"
curl "https://your-domain/api/v1/tmdb/13?type=movie"
curl "https://your-domain/api/v1/qq_music/f0M4Z4a2"

# IMDb ${copy.detail}
curl "https://your-domain/api/v1/imdb/tt0111161"${imdbUsable ? "" : `
# \u2192 {"code": 50100, "error": {"type": "NOT_IMPLEMENTED", ...}}\uFF1AWorkers \u4E0A\u4E0D\u53EF\u7528`}

# \u6570\u636E\u6E90\u76EE\u5F55
curl "https://your-domain/api/v1/providers"

# IMDb ${copy.search}
curl "https://your-domain/api/v1/search?q=shawshank&source=imdb&limit=10"

# \u8D34\u94FE\u63A5\uFF08\u81EA\u52A8\u8BC6\u522B\u6570\u636E\u6E90\uFF09
curl "https://your-domain/api/v1/resolve?url=https%3A%2F%2Fmovie.douban.com%2Fsubject%2F1292052%2F"

# \u6761\u4EF6\u8BF7\u6C42\uFF1A\u5185\u5BB9\u672A\u53D8\u66F4\u65F6\u8FD4\u56DE 304\uFF08\u65E0\u54CD\u5E94\u4F53\uFF09
curl -H 'If-None-Match: W/"358d3d65536d2088"' \\
  "https://your-domain/api/v1/douban/1292052"

# \u8C46\u74E3${copy.search}
curl "https://your-domain/api/v1/douban/search?q=\u76D7\u68A6\u7A7A\u95F4&limit=5"</code></pre>

  <p class="footer">${copy.footnote}</p>
</main>
</body>
</html>`;
}
__name(renderDocsPage, "renderDocsPage");

// src/app.ts
var app = new Hono3();
app.use("*", contextMiddleware);
app.use("*", etagMiddleware);
app.get("/", (c) => c.redirect("/index.html", 302));
app.get("/docs", (c) => {
  const config = c.get("config");
  const html = renderDocsPage(config, c.req.header("accept-language"), c.env);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Request-Id": c.get("requestId"),
      "X-API-Version": API_VERSION,
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Language, Accept-Encoding"
    }
  });
});
var handleOpenApi = /* @__PURE__ */ __name((c) => {
  return new Response(JSON.stringify(buildOpenApiDocument(), null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": c.get("requestId"),
      "X-API-Version": API_VERSION,
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}, "handleOpenApi");
app.get("/openapi.json", handleOpenApi);
app.get("/api/openapi.json", handleOpenApi);
app.get("/health", handleHealth);
app.get("/health/", handleHealth);
app.get("/api/health", handleHealth);
app.get("/api/health/", handleHealth);
app.get("/api/config", (c) => {
  const config = c.get("config");
  const requestId = c.get("requestId") ?? "unknown";
  const startedAt = c.get("startedAt") ?? Date.now();
  return sendSuccess(
    {
      version: API_VERSION,
      authRequired: Boolean(config.apiToken || config.authSecret),
      sessionAuth: Boolean(config.authSecret),
      powDifficulty: config.powDifficulty,
      sessionTtlSeconds: config.sessionTtlSeconds,
      rateLimitMax: config.rateLimitMax,
      cacheTtlSeconds: config.cacheTtlSeconds,
      sources: {
        douban: {
          backend: hasDoubanBackend(config),
          cookie: Boolean(config.doubanCookie),
          // 无后端/无 Cookie 时仍会尝试网页抓取（边缘平台可能被风控）
          web: true
        },
        imdb: {
          backend: hasImdbBackend(config),
          cookie: Boolean(config.imdbCookie || config.imdbWafToken),
          // Node 直连 / Workers 裸 TCP / HTML 兜底
          web: true
        },
        bangumi: true,
        tmdb: Boolean(config.tmdbApiKey),
        trakt: Boolean(config.traktClientId),
        steam: true,
        melon: true,
        hongguo: true,
        qq_music: true,
        douban_book: true
      }
    },
    { requestId, startedAt },
    { cache: "bypass", origin: c.req.header("origin") ?? null }
  );
});
app.route("/api/auth", auth2);
var GET_ONLY_PATHS2 = [
  "/health",
  "/health/",
  "/docs",
  "/openapi.json",
  "/api/openapi.json",
  "/api/health",
  "/api/health/",
  "/api/config",
  "/api/egress",
  "/api/search",
  "/api/imdb/search",
  "/api/douban/search",
  "/api/douban/cookie-status",
  "/api/bangumi/search",
  "/api/steam/search",
  "/api/tmdb/search",
  "/api/trakt/search"
];
for (const path of GET_ONLY_PATHS2) {
  app.on(["POST", "PUT", "PATCH", "DELETE"], path, (c) => sendMethodNotAllowed(c));
}
var api = new Hono3();
api.use("*", authMiddleware);
api.use("*", rateLimitMiddleware);
api.route("/v1", v1);
api.route("/imdb", imdb);
api.route("/douban", douban);
api.route("/search", search);
api.route("/", providers);
api.route("/egress", egress);
api.route("/", resource);
app.route("/api", api);
app.notFound((c) => {
  const origin = c.req.header("origin") ?? null;
  return sendError(ApiError.notFound(`\u672A\u77E5\u8DEF\u5F84: ${new URL(c.req.url).pathname}`), {
    requestId: c.get("requestId") ?? "unknown",
    startedAt: c.get("startedAt") ?? Date.now()
  }, { origin });
});
app.onError((error, c) => {
  const apiError = toApiError(error);
  if (apiError.status < 500) {
    console.warn(`[${c.get("requestId")}] ${apiError.symbol}(${apiError.code}): ${apiError.message}`);
  } else {
    console.error(`[${c.get("requestId")}] ${apiError.symbol}(${apiError.code}):`, error);
  }
  return sendError(apiError, {
    requestId: c.get("requestId") ?? "unknown",
    startedAt: c.get("startedAt") ?? Date.now()
  }, {
    origin: c.req.header("origin") ?? null,
    rateLimit: c.get("rateLimit")
  });
});

// src/index.ts
var index_default = {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
export {
  app,
  index_default as default
};
//# sourceMappingURL=index.js.map
