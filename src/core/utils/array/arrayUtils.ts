function separateIntoChunks<T = any>(array: T[], chunkSize: number): T[][] {
  const separatedArray = [];
  const arrayAmount = array.length / chunkSize;

  for (let i = 0; i < arrayAmount; i++) {
    separatedArray.push(array.slice(i * chunkSize, (i + 1) * chunkSize));
  }

  return separatedArray;
}

export {separateIntoChunks};