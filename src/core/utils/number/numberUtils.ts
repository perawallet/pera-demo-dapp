import {omitKeys} from "../object/objectUtils";

export type AlgorandNumberFormatterOptions = Omit<Intl.NumberFormatOptions, "style"> & {
  style?: Intl.NumberFormatPartTypes | "percent" | "shorten-large-numbers";
  locale?: string;
};

/**
 * A higher-order function that uses Intl.NumberFormat behind the scenes to format a number
 * @param {Object} providedOptions -
 * @param {string} providedOptions.locale - Passed as first argument to the Intl.NumberFormat. Defaults to one of [navigator.language, "en-GB"] or respects provided locale from the call-site
 * @returns {function} Function
 */

export const DEFAULT_NUMBER_FORMAT_LOCALE_PREFERENCE = "en-US";

function formatNumber(providedOptions: AlgorandNumberFormatterOptions = {}) {
  const {locale = DEFAULT_NUMBER_FORMAT_LOCALE_PREFERENCE, ...otherOptions} =
    providedOptions;
  let options = otherOptions;
  const isCurrencyFormatting = options.style === "currency";
  const shouldShortenLargeNumbers = options.style === "shorten-large-numbers";

  if (isCurrencyFormatting) {
    options = {
      currency: "USD",
      maximumFractionDigits: 5,
      minimumFractionDigits: 2,
      // "narrowSymbol" prevents showing explicit currency symbols, such as "US$" or "CA$"
      currencyDisplay: "narrowSymbol",
      ...otherOptions
    };
  } else if (shouldShortenLargeNumbers) {
    options = {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      style: "decimal",
      ...omitKeys(otherOptions, "style")
    };
  } else {
    options = {
      maximumFractionDigits: 5,
      minimumFractionDigits: 2,
      style: "decimal",
      ...otherOptions
    };
  }

  let numberFormatter: {
    format: (x: number | bigint) => string;
  };

  try {
    numberFormatter = new Intl.NumberFormat(
      locale || [navigator.language, "en-GB"],
      options
    );
  } catch (error) {
    numberFormatter = {
      format(x: number | bigint) {
        return x.toLocaleString();
      }
    };

    if (isCurrencyFormatting) {
      // currencyDisplay: "narrowSymbol" option is not supported by some browsers, try by providing "symbol"
      try {
        options.currencyDisplay = "symbol";
        numberFormatter = new Intl.NumberFormat(
          locale || [navigator.language, "en-GB"],
          options
        );
      } catch (currencyFormattingError) {
        console.error({currencyFormattingError});
      }
    }
  }

  return (value: number) => {
    let formattedValue = "";

    if (!Object.is(value, NaN)) {
      /* eslint-disable no-magic-numbers */
      if (shouldShortenLargeNumbers) {
        if (value >= Math.pow(10, 9)) {
          formattedValue = `${numberFormatter.format(value / Math.pow(10, 9))}b`;
        } else if (value >= Math.pow(10, 6)) {
          formattedValue = `${numberFormatter.format(value / Math.pow(10, 6))}m`;
        } else if (value >= Math.pow(10, 3)) {
          formattedValue = `${numberFormatter.format(value / Math.pow(10, 3))}k`;
        } else {
          formattedValue = numberFormatter.format(value);
        }
      } else {
        formattedValue = numberFormatter.format(value);
      }
      /* eslint-enable no-magic-numbers */
    }

    if (formattedValue && options.currency === "USD") {
      // in case `narrowSymbol` option was failed, make sure "US$" sign appears as just "$"
      formattedValue = formattedValue.replace("US$", "$");
    }

    return formattedValue;
  };
}

export {formatNumber};
