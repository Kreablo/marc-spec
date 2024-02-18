"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseField = exports.parseSubfields = exports.extractFields = exports.extractMarcRecordMeta = exports.base64RecordAsByteArray = exports.DataField = exports.ControlField = exports.Field = void 0;
const base64_js_1 = require("base64-js");
class Field {
    constructor(tag) {
        this.tag = tag;
    }
}
exports.Field = Field;
class ControlField extends Field {
    constructor(tag, data) {
        super(tag);
        this.data = data;
    }
}
exports.ControlField = ControlField;
;
class DataField extends Field {
    constructor(tag, indicators, subfields) {
        super(tag);
        this.indicators = indicators;
        this.subfields = subfields;
    }
}
exports.DataField = DataField;
;
const ZERO = '0'.charCodeAt(0);
const NINE = '9'.charCodeAt(0);
const LETTER_a = 'a'.charCodeAt(0);
const LETTER_A = 'A'.charCodeAt(0);
const LETTER_z = 'z'.charCodeAt(0);
const LETTER_Z = 'Z'.charCodeAt(0);
const base64RecordAsByteArray = (r) => {
    return (0, base64_js_1.toByteArray)(r.replace(/[\n\s]+/g, ''));
};
exports.base64RecordAsByteArray = base64RecordAsByteArray;
const byteArrayToInt = (b, startIndex, endIndexInclusive) => {
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
const validTagChar = (x) => {
    return ZERO <= x && x <= NINE || LETTER_a <= x && x <= LETTER_z || LETTER_A <= x && x <= LETTER_Z;
};
const byteArrayToTag = (b, index) => {
    if (!validTagChar(b[index]) && validTagChar(b[index + 1]) && validTagChar(b[index + 2])) {
        return null;
    }
    return String.fromCharCode(b[index], b[index + 1], b[index + 2]);
};
const tagMatcher = (tag, tagPattern) => {
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
const extractMarcRecordMeta = (b) => {
    const length = byteArrayToInt(b, 0, 4);
    const base_address = byteArrayToInt(b, 12, 16);
    const length_of_length = byteArrayToInt(b, 20, 20);
    const length_of_start_character_position = byteArrayToInt(b, 21, 21);
    return { length, base_address, length_of_length, length_of_start_character_position };
};
exports.extractMarcRecordMeta = extractMarcRecordMeta;
const extractFields = (b, subscribers) => {
    const meta = (0, exports.extractMarcRecordMeta)(b);
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
            const field = (0, exports.parseField)(b, meta, entry);
            if (field instanceof ControlField) {
                for (const m of matching) {
                    m.receiveControlField(field);
                }
            }
            else {
                for (const m of matching) {
                    m.receiveDataField(field);
                }
            }
        }
    }
};
exports.extractFields = extractFields;
const utf8Decoder = new TextDecoder('utf-8');
const subfieldRe = /[\x1F]([^\x1F\x1E\x1D])([^\x1F\x1E\x1D]*)/gsy;
const parseSubfields = (b, meta, entry) => {
    const start = meta.base_address + entry.start + 2;
    const end = meta.base_address + entry.start + entry.length - 1;
    const field = utf8Decoder.decode(b.subarray(start, end));
    const result = new Map();
    const getEntries = (k) => {
        if (result.has(k)) {
            return result.get(k);
        }
        const es = [];
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
exports.parseSubfields = parseSubfields;
const parseField = (b, meta, entry) => {
    const start = meta.base_address + entry.start;
    const end = meta.base_address + entry.start + entry.length - 1;
    const tag = entry.tag;
    const isDataField = entry.tag.search(/^00[1-9]/) < 0;
    if (isDataField) {
        const indicators = utf8Decoder.decode(b.subarray(start, start + 2));
        return new DataField(tag, indicators, (0, exports.parseSubfields)(b, meta, entry));
    }
    else {
        return new ControlField(tag, utf8Decoder.decode(b.subarray(start, end)));
    }
};
exports.parseField = parseField;
