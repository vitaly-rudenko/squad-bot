import Jimp from 'jimp';

declare global {
  interface Window {
    Jimp: typeof Jimp;
  }
}

export {}
