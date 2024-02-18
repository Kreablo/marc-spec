"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarcSpecCollection = void 0;
const marc_spec_evaluate_1 = require("./marc-spec-evaluate");
const marc_spec_1 = require("./marc-spec");
const marc_parser_1 = require("./marc-parser");
class MarcSpecCollection {
    constructor() {
        this.collection = new Map();
    }
    addSpec(marcSpec) {
        if (this.collection.has(marcSpec)) {
            const s = this.collection.get(marcSpec);
            if (s !== undefined) {
                return s;
            }
        }
        const r = (0, marc_spec_1.parseMarcSpec)(marcSpec);
        if (!(r instanceof marc_spec_1.MARCSpec)) {
            throw Error(r.message);
        }
        const t = (0, marc_spec_evaluate_1.buildTree)(r);
        this.collection.set(marcSpec, [t, r]);
        return [t, r];
    }
    get subscribers() {
        return Array.from(this.collection.values()).map((t) => t[0].subscribers).reduce((a, b) => a.concat(b), []);
    }
    loadRecordBase64(record) {
        this.loadRecordBinary((0, marc_parser_1.base64RecordAsByteArray)(record));
    }
    loadRecordBinary(record) {
        this.reset();
        (0, marc_parser_1.extractFields)(record, this.subscribers);
    }
    reset() {
        for (const s of this.subscribers) {
            s.reset();
        }
    }
}
exports.MarcSpecCollection = MarcSpecCollection;
