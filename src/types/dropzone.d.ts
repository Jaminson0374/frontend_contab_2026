declare module 'dropzone' {
  export interface DropzoneOptions {
    url: string;
    autoProcessQueue?: boolean;
    clickable?: string | HTMLElement | Array<string | HTMLElement> | boolean;
    previewsContainer?: HTMLElement | string | false;
    createImageThumbnails?: boolean;
    acceptedFiles?: string;
  }

  export default class Dropzone {
    static autoDiscover: boolean;

    readonly element: HTMLElement;

    constructor(element: string | HTMLElement, options: DropzoneOptions);

    on(eventName: string, callback: (...args: unknown[]) => void): this;
    removeFile(file: File): void;
    destroy(): void;
  }
}
