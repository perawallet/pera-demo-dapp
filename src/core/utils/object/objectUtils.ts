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

export {omitKeys};
