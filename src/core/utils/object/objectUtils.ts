/**
 * Omits provided fields from main object
 * @param obj Target object
 * @param keys Keys to omit from obj
 */
function omitKeys<T extends {[x: string]: any}, K extends keyof T>(obj: T, ...keys: K[]) {
  const newObj: {[x: string]: any} = {};

  Object.keys(obj).forEach((key) => {
    // @ts-ignore 'string' is assignable to the constraint of type 'K', but 'K' could be instantiated with a different subtype of constraint 'string | number | symbol'.
    // couldn't solve this issue
    if (!keys.includes(key)) {
      newObj[key as string] = obj[key];
    }
  });

  return newObj as Omit<T, K>;
}

/**
 * Checks the given value if the value is object and not an array or null.
 * @param {unknown} x The value to check.
 * @returns {boolean} Returns `true` if `value` is an object and not an array or null, else returns `false`.
 * @example
 *
 * isRecord({})
 * // => true
 *
 * isRecord({a: "1"})
 * // => true
 *
 * isRecord(new Foo);
 * // => true
 *
 * isRecord([1, 2, 3])
 * // => false
 *
 * isRecord(Function)
 * // => false
 *
 * isRecord(null)
 * // => false
 */
function isRecord(x: unknown): x is Record<string, any> {
  return typeof x === "object" && Boolean(x) && !Array.isArray(x);
}

export {omitKeys, isRecord};
