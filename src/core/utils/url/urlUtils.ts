/**
 * Initiates URLSearchParams with the provided params object and stringifies it
 * @param {object} params A params object.
 * @returns {string} Stringified search string
 * @example
 *
 * stringifySearchParams({a: "123"})
 * // => "a=123"
 *
 * stringifySearchParams({a: 1, b: "test", c: true})
 * // => "a=1&b=test&c=true"
 */
function stringifySearchParams<Params extends Record<string, any>>(params: Params) {
  return new URLSearchParams(params).toString();
}

/**
 * Converts query string into a params object (all values of the object are strings).
 * @param {string} search Url query string
 * @return {object} Query params object
 */
function getSearchParams<T = Record<string, undefined | string>>(search: string) {
  return Object.fromEntries(new URLSearchParams(search).entries()) as unknown as T;
}

export {stringifySearchParams, getSearchParams};
