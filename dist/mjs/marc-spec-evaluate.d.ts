import { MARCSpec } from './marc-spec';
import { Subscriber } from './marc-parser';
interface Node {
    evaluate: string[][];
}
export declare class EvalTree implements Node {
    private readonly root;
    readonly subscribers: RSubscriber[];
    subfieldDelimiter: string;
    fieldDelimiter: string;
    constructor(root: Node, subscribers: RSubscriber[]);
    get evaluate(): string[][];
    get evaluate_str(): string;
}
export interface RSubscriber extends Subscriber {
    reset(): void;
}
export declare const buildTree: (marcSpec: MARCSpec) => EvalTree;
export {};
