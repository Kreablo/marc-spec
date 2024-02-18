export interface Subscriber {
    tagPattern: string;
    receiveControlField: (controlField: ControlField) => void;
    receiveDataField: (dataField: DataField) => void;
}
export type DirectoryEntry = {
    tag: string;
    length: number;
    start: number;
};
export type MarcRecordMeta = {
    length: number;
    base_address: number;
    length_of_length: number;
    length_of_start_character_position: number;
};
export type Subfield = {
    code: string;
    data: string;
};
export declare abstract class Field {
    readonly tag: string;
    constructor(tag: string);
}
export declare class ControlField extends Field {
    readonly data: string;
    constructor(tag: string, data: string);
}
export declare class DataField extends Field {
    readonly indicators: string;
    readonly subfields: Map<string, Subfield[]>;
    constructor(tag: string, indicators: string, subfields: Map<string, Subfield[]>);
}
export declare const base64RecordAsByteArray: (r: string) => Uint8Array;
export declare const extractMarcRecordMeta: (b: Uint8Array) => MarcRecordMeta;
export declare const extractFields: (b: Uint8Array, subscribers: Subscriber[]) => void;
export declare const parseSubfields: (b: Uint8Array, meta: MarcRecordMeta, entry: DirectoryEntry) => Map<string, Subfield[]>;
export declare const parseField: (b: Uint8Array, meta: MarcRecordMeta, entry: DirectoryEntry) => DataField | ControlField;
