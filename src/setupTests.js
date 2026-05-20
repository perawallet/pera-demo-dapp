// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// CRA's jest jsdom env doesn't expose TextEncoder/TextDecoder, which
// algosdk's address module touches at import time. Polyfill from Node's
// util module so any test that pulls in algosdk doesn't blow up at load.
import {TextEncoder, TextDecoder} from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
