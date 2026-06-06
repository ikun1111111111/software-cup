declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraConfig: { facingMode: string } | string,
      config: { fps: number; qrbox?: { width: number; height: number } },
      onSuccess: (decodedText: string, decodedResult: any) => void,
      onError?: (errorMessage: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
  }
}
