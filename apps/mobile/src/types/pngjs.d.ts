// Type shim for pngjs/browser — used by react-native-executorch's TextToImage module.
// We don't use TextToImage, but TypeScript follows the barrel export.
declare module 'pngjs/browser' {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: any);
    static sync: { read(data: any, options?: any): PNG; write(png: PNG, options?: any): Buffer };
    pack(): any;
    parse(data: any, callback?: any): any;
    on(event: string, callback: any): any;
  }
}
