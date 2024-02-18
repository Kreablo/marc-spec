import { EvalTree, buildTree } from './marc-spec-evaluate';
import { parseMarcSpec, MARCSpec } from './marc-spec';
import { base64RecordAsByteArray, extractFields } from './marc-parser';

export class MarcSpecCollection {

    private readonly collection: Map<string, [EvalTree, MARCSpec]> = new Map();

    public addSpec(marcSpec: string): [EvalTree, MARCSpec] {
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

        return [t, r];
    }

    public get subscribers() {
        return Array.from(this.collection.values()).map((t) => t[0].subscribers).reduce((a, b) => a.concat(b), []);
    }

    public loadRecordBase64(record: string) {
        this.loadRecordBinary(base64RecordAsByteArray(record));
    }

    public loadRecordBinary(record: Uint8Array) {
        this.reset();
        extractFields(record, this.subscribers);
    }

    public reset() {
        for (const s of this.subscribers) {
            s.reset();
        }
    }

}
