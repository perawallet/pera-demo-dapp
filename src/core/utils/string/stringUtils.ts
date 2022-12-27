function truncateAccountAddress(stringToTruncate: string) {
  /* eslint-disable no-magic-numbers */
  return `${stringToTruncate.substring(0, 8)}...${stringToTruncate.substring(
    stringToTruncate.length - 4
  )}`;
  /* eslint-enable no-magic-numbers */
}

export {truncateAccountAddress};
