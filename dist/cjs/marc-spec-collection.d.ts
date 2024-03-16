import { EvalTree } from './marc-spec-evaluate';
import { MARCSpec } from './marc-spec';
export declare class MarcSpecCollection {
    private readonly collection;
    private record;
    addSpec(marcSpec: string): [EvalTree, MARCSpec];
    get subscribers(): import("./marc-spec-evaluate").RSubscriber[];
    loadRecordBase64(record: string): void;
    loadRecordBinary(record: Uint8Array): void;
    reset(): void;
}
