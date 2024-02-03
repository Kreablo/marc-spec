import { parseMarcSpec, MARCSpec, FieldSpec, IndicatorSpec, SubfieldSpec, AbbrFieldSpec, AbbrIndicatorSpec, AbbrSubfieldSpec, IndexSpec, CharacterSpec, Range, Position } from './marc-spec';
import { Subscriber, ControlField, DataField } from './marc-parser';

class EvalTree {

    constructor(
        private readonly root: Node<ControlField | DataField>,
        public readonly subscribers: Subscriber[]
    ) { }
}

interface Node {

    subscribers: Subscriber[];

    reset(): void;

    evaluateSpec(): string[][];
}

const limitRange: (rangeOrPosition: Range | Position, maxIndex: number) => [number, number, boolean] = (rangeOrPosition, maxIndex) => {
    let start0: number | '#';
    let end0: number | '#';
    if (typeof rangeOrPosition === 'object') {
        const { start, end } = rangeOrPosition;
        start0 = start;
        end0 = end;
    } else {
        start0 = rangeOrPosition;
        end0 = rangeOrPosition;
    }
    start0 = start0 === '#' ? maxIndex : 0;
    end0 = end0 === '#' ? maxIndex : 0;
    start0 = Math.min(Math.max(0, start0), maxIndex);
    end0 = Math.min(Math.max(start0, 0), maxIndex);
    const reverse = start0 > end0;

    return [start0, end0, reverse];
};

const candidateFields: (fields: Field[], index: IndexSpec | undefined) => Field[] = (fields, index) => {
    if (index === undefined) {
        return fields;
    }
    const { item } = index;

    const [start, end, reverse] = limitRange(item, fields.length - 1);

    const result = fields.slice(start, end);
    return reverse ? result.reverse() : result;
};

const rev: (s: string) => string = (s) => {
    let r = '';
    for (let i = 0; i < s.length; i++) {
        r += s.charAt(s.length - i - 1);
    }
    return r;
};

const charExtractor: (charSpec: CharacterSpec | undefined) => (data: string) => string = (charSpec) => (data) => {
    if (charSpec === undefined) {
        return data;
    }
    const { item } = charSpec;

    const [start, end, reverse] = limitRange(item, data.length - 1);

    const result = data.substring(start, end + 1);

    return reverse ? rev(result) : result;
};

type Field = ControlField | DataField;

const filterSubspec: (subSpecNodes: Node[], f: Field[]) => Field[] = (subSpecNodes, f) => {
    for (subSpec of subSpecNodes) {
        if (subSpec instanceof UnaryNode) {
            f = filterUnary(subSpec, f);
        } else if (subSpec instanceof BinaryNod) {
            f = filterBinary(subSpec, f);
        }
    }

    return f;
};

class FieldNode implements Node, Subscriber {

    private fields: Field[] = [];

    public get tagPattern() {
        return this.fieldSpec.tag;
    }

    constructor(
        public subscribers: Subscriber[],
        private readonly fieldSpec: FieldSpec,
        private readonly subSpec: Node[]
    ) {
        this.subscribers.push(this);
    }

    reset() {
        this.fields = [];
    };

    receiveControlField(field: ControlField) {
        this.fields.push(field);
    };

    receiveDataField(field: DataField) {
        this.fields.push(field);
    };

    evaluateSpec() {
        const candidates0 = candidateFields(this.fields, this.fieldSpec.index);
        const candidates1 = filterSubspec(this.subSpec, candidates0);

        const data = candidates1.map((f) => f instanceof ControlField ? [f.data]
            : Array.from(f.subfields.values()).reduce((a, b) => a.concat(b)).map((sf) => sf.data));

        return data.map((d) => d.map(charExtractor(this.fieldSpec.characterSpec)));
    };
}

type UnaryTermNode = FieldNode | AbbrFieldNode | IndicatorNode | AbbrIndicatorNode | SubfieldNode | AbbrSubfieldNode;
type BinaryTermNode = FieldNode | AbbrFieldNode | IndicatorNode | AbbrIndicatorNode | SubfieldNode | AbbrSubfieldNode | CompStringNode;

class EqualsNode implements Node {

    constructor(
        rhs: BinaryTermNode,
        lhs: BinaryTermNode
    ) { }

    public get subscribers() {
    }
}


const buildTree: (marcSpec: MARCSpec) => EvalTree = (marcSpec) => {
    const { spec } = marcSpec;

    let root;

    if (spec instanceof FieldSpec) {
        root = buildFieldNode(spec);
    } else if (spec instanceof IndicatorSpec) {
        root = buildIndicatorNode(spec);
    } else {
        root = buildSubfieldNode(spec);
    }

    return new EvalTree(root, root.subscribers);

};

const buildFieldNode: (fieldSpec: FieldSpec) => Node = (fieldSpec) => {
    const { tag, index, characterSpec, subSpec } = fieldSpec;


};

const buildIndicatorNode: (indicatorSpec: IndicatorSpec) => Node = (indicatorSpec) => {
}

const buildSubfieldNode: (subfieldSpec: SubfieldSpec) => Node = (subfieldSpec) => {
}

