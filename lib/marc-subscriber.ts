import { parseMarcSpec, MARCSpec } from './marc-spec';
import { parseField, DataField, ControlField, extractMarcRecordMeta, extractDirectoryEntries, parseField } from './marc-parser';

export class FieldThunk {

    private field: T | null = null;

    constructor(
        private readonly entry: DirectoryEntry
    ) { }

    public get: () => T = {
        if(this.field === null) {
}
    }


}


export const extractFields (b: Uint8Array, subscribers: Subscriber[]) => void = (b, subscriber) => {

};
