import { buildTree } from './marc-spec-evaluate';
import { parseMarcSpec, MARCSpec } from './marc-spec';
import { base64RecordAsByteArray, extractFields } from './marc-parser';
export class MarcSpecCollection {
    constructor() {
        this.collection = new Map();
        this.record = null;
    }
    addSpec(marcSpec) {
        if (this.collection.has(marcSpec)) {
            const s = this.collection.get(marcSpec);
            if (s !== undefined) {
                return s;
            }
        }
        const r = parseMarcSpec(marcSpec);
        if (!(r instanceof MARCSpec)) {
            throw Error(r.message);
        }
        const t = buildTree(r);
        this.collection.set(marcSpec, [t, r]);
        if (this.record !== null) {
            extractFields(this.record, t.subscribers);
        }
        return [t, r];
    }
    get subscribers() {
        return Array.from(this.collection.values()).map((t) => t[0].subscribers).reduce((a, b) => a.concat(b), []);
    }
    loadRecordBase64(record) {
        this.loadRecordBinary(base64RecordAsByteArray(record));
    }
    loadRecordBinary(record) {
        this.reset();
        this.record = record;
        extractFields(record, this.subscribers);
    }
    reset() {
        for (const s of this.subscribers) {
            s.reset();
        }
    }
}
