declare module 'mammoth' {
    export interface MammothResult {
        value: string; // The generated HTML
        messages: any[]; // Any messages, such as warnings during conversion
    }

    export interface ConvertOptions {
        arrayBuffer: ArrayBuffer;
    }

    export function convertToHtml(options: ConvertOptions): Promise<MammothResult>;
}
