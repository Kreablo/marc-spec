import { toByteArray } from 'base64-js';

export interface Subscriber {

    tagPattern: string;

    receiveControlField: (controlField: ControlField) => void;

    receiveDataField: (dataField: DataField) => void;
}

export type DirectoryEntry = {
    tag: string,
    length: number,
    start: number,
};

export type MarcRecordMeta = {
    length: number,
    base_address: number,
    length_of_length: number,
    length_of_start_character_position: number
};

export type Subfield = {
    code: string,
    data: string
};

export abstract class Field {
    constructor(
        public readonly tag: string
    ) { }
}

export class ControlField extends Field {
    constructor(
        tag: string,
        public readonly data: string
    ) {
        super(tag);
    }
};

export class DataField extends Field {
    constructor(
        tag: string,
        public readonly indicators: string,
        public readonly subfields: Map<string, Subfield[]>,
    ) {
        super(tag);
    }
};

const ZERO = '0'.charCodeAt(0);
const NINE = '9'.charCodeAt(0);
const LETTER_a = 'a'.charCodeAt(0);
const LETTER_A = 'A'.charCodeAt(0);
const LETTER_z = 'z'.charCodeAt(0);
const LETTER_Z = 'Z'.charCodeAt(0);

export const base64RecordAsByteArray: (r: string) => Uint8Array = (r) => {
    return toByteArray(r.replace(/[\n\s]+/g, ''));
}

const byteArrayToInt: (b: Uint8Array, startIndex: number, endIndexInclusive: number) => number = (b, startIndex, endIndexInclusive) => {
    let x = 0;
    for (let i = startIndex; i <= endIndexInclusive; i++) {
        x *= 10;
        const o = b[i] - ZERO;
        if (o < 0 || o > 9) {
            return -1;
        }
        x += b[i] - ZERO;
    }
    return x;
};

const validTagChar: (x: number) => boolean = (x) => {
    return ZERO <= x && x <= NINE || LETTER_a <= x && x <= LETTER_z || LETTER_A <= x && x <= LETTER_Z;
};

const byteArrayToTag: (b: Uint8Array, index: number) => string | null = (b, index) => {
    if (!validTagChar(b[index]) && validTagChar(b[index + 1]) && validTagChar(b[index + 2])) {
        return null;
    }
    return String.fromCharCode(b[index], b[index + 1], b[index + 2]);
}

const tagMatcher: (tag: string, tagPattern: string) => boolean = (tag, tagPattern) => {
    for (let i = 0; i < 3; i++) {
        const c = tagPattern.charAt(i);
        if (c !== '.') {
            if (tag.charAt(i) !== c) {
                return false;
            }
        }
    }
    return true;
};

export const extractMarcRecordMeta: (b: Uint8Array) => MarcRecordMeta = (b) => {
    const length = byteArrayToInt(b, 0, 4);
    const base_address = byteArrayToInt(b, 12, 16);
    const length_of_length = byteArrayToInt(b, 20, 20);
    const length_of_start_character_position = byteArrayToInt(b, 21, 21);
    return { length, base_address, length_of_length, length_of_start_character_position };
};

export const extractFields: (b: Uint8Array, subscribers: Subscriber[]) => void = (b, subscribers) => {
    const meta = extractMarcRecordMeta(b);
    const marc_directory_entry_length = 3 + meta.length_of_length + meta.length_of_start_character_position;

    const ldr_matching = subscribers.filter((s) => tagMatcher('ldr', s.tagPattern));
    const LDR_matching = subscribers.filter((s) => tagMatcher('LDR', s.tagPattern));

    for (const matching of [ldr_matching, LDR_matching]) {
        for (const m of matching) {
            m.receiveControlField(new ControlField('LDR', utf8Decoder.decode(b.subarray(0, 24))));
        }
    }

    for (let i = 24; b[i] !== 0x1E && i < meta.length && i < b.length - marc_directory_entry_length; i += marc_directory_entry_length) {
        const tag = byteArrayToTag(b, i);
        if (tag === null) {
            continue;
        }
        const matching = subscribers.filter((s) => tagMatcher(tag, s.tagPattern));
        if (matching.length > 0) {
            const l = byteArrayToInt(b, i + 3, i + 3 + meta.length_of_length - 1);
            const start = byteArrayToInt(b, i + 3 + meta.length_of_length, i + marc_directory_entry_length - 1);
            const entry = { tag, length: l, start };
            const field = parseField(b, meta, entry);
            if (field instanceof ControlField) {
                for (const m of matching) {
                    m.receiveControlField(field);
                }
            } else {
                for (const m of matching) {
                    m.receiveDataField(field);
                }
            }
        }

    }
};

const utf8Decoder = new TextDecoder('utf-8');
const subfieldRe = /[\x1F]([^\x1F\x1E\x1D])([^\x1F\x1E\x1D]*)/gsy;

export const parseSubfields: (b: Uint8Array, meta: MarcRecordMeta, entry: DirectoryEntry) => Map<string, Subfield[]> = (b, meta, entry) => {
    const start = meta.base_address + entry.start + 2;
    const end = meta.base_address + entry.start + entry.length - 1;
    const field = utf8Decoder.decode(b.subarray(start, end));
    const result = new Map();
    const getEntries = (k: string) => {
        if (result.has(k)) {
            return result.get(k);
        }
        const es: Subfield[] = [];
        result.set(k, es);
        return es;
    };
    while (true) {
        const m = subfieldRe.exec(field);
        if (!m) {
            break;
        }
        const code = m[1];
        const data = m[2];
        const entries = getEntries(code);
        entries.push({ code, data });
    }
    return result;
};

export const parseField: (b: Uint8Array, meta: MarcRecordMeta, entry: DirectoryEntry) => DataField | ControlField = (b, meta, entry) => {
    const start = meta.base_address + entry.start;
    const end = meta.base_address + entry.start + entry.length - 1;
    const tag = entry.tag;
    const isDataField = entry.tag.search(/^00[1-9]/) < 0;
    if (isDataField) {
        const indicators = utf8Decoder.decode(b.subarray(start, start + 2));
        return new DataField(tag, indicators, parseSubfields(b, meta, entry));
    } else {
        return new ControlField(tag, utf8Decoder.decode(b.subarray(start, end)));
    }
};

