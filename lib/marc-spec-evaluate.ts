import { MARCSpec, FieldSpec, IndicatorSpec, SubfieldSpec, AbbrFieldSpec, AbbrIndicatorSpec, AbbrSubfieldSpec, IndexSpec, CharacterSpec, Range, Position, ComparisonString, SubfieldCode, SubTermSet, BinarySubTermSet, BinaryOperator, UnaryOperator, BinarySubTerm } from './marc-spec';
import { Subscriber, ControlField, DataField } from './marc-parser';

interface Node {
    evaluate: string[][];
}

export class EvalTree implements Node {

    public subfieldDelimiter: string = '';

    public fieldDelimiter: string = ' ; ';

    constructor(
        private readonly root: Node,
        public readonly subscribers: RSubscriber[]
    ) { }

    public get evaluate() {
        return this.root.evaluate;
    }

    public get evaluate_str() {
        return this.evaluate.map((f) => f.join(this.subfieldDelimiter)).join(this.fieldDelimiter);
    }
}

interface Term {
    value: (outerFields: Field[], outerField: Field) => Set<string>;
}

export interface RSubscriber extends Subscriber {
    reset(): void;
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
    start0 = start0 === '#' ? maxIndex : start0;
    end0 = end0 === '#' ? maxIndex : end0;
    start0 = Math.max(0, start0);
    end0 = Math.min(Math.max(end0, 0), maxIndex);
    const reverse = start0 > end0;

    return [start0, end0, reverse];
};

const candidateFields: (fields: Field[] | undefined, index: IndexSpec | undefined) => Field[] = (fields, index) => {
    if (fields === undefined) {
        return [];
    }
    if (index === undefined) {
        return fields;
    }
    const { item } = index;

    const [start, end, reverse] = limitRange(item, fields.length - 1);

    if (start >= fields.length) {
        return [];
    }

    const result = fields.slice(start, end + 1);
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

    if (start >= data.length) {
        return '';
    }
    const result = data.substring(start, end + 1);

    return reverse ? rev(result) : result;
};

const fieldData: (fields: Field[]) => string[][] = (fields) =>
    fields.map((f) => f instanceof ControlField
        ? [f.data]
        : Array.from(f.subfields.values()).reduce((a, b) => a.concat(b)).map((sf) => sf.data));

const subfieldData: (field: DataField, code: SubfieldCode) => string[] = (field, code) => {
    const { start, end } = code;

    if (start === end) {
        const startfield = field.subfields.get(start);
        return startfield !== undefined ? startfield.map((sf) => sf.data) : [];
    }

    const startcp = start.codePointAt(0);
    const endcp = end.codePointAt(0);
    const result = [];
    if (startcp === undefined || endcp === undefined) {
        return [];
    }
    for (const c of field.subfields.keys()) {
        const cp = c.charCodeAt(0);
        if (startcp <= cp && cp <= endcp) {
            if (field.subfields.has(c)) {
                const sfs = field.subfields.get(c);
                if (sfs === undefined) {
                    continue;
                }
                for (const sf of sfs) {
                    result.push(sf.data);
                }
            }
        }
    }
    return result;

}

const fieldDataSet: (data: string[][]) => Set<string> = (data) => {
    const result = new Set<string>();
    for (const vs of data) {
        for (const v of vs) {
            result.add(v);
        }
    }
    return result;
}

const fieldDataSetExtract: (data: string[][], charExtractor: (data: string) => string) => Set<string> = (data, charExtractor) => {
    const result = new Set<string>();
    for (const vs of data) {
        for (const v of vs) {
            result.add(charExtractor(v));
        }
    }
    return result;
}

const groupFields: (fields: Field[]) => Map<String, Field[]> = (fields) => {
    const result = new Map();
    const add: (f: Field) => void = (f) => {
        if (!result.has(f.tag)) {
            result.set(f.tag, [f]);
        } else {
            result.get(f.tag).push(f);
        }
    };

    for (const f of fields) {
        add(f);
    }

    return result;
};

type Field = ControlField | DataField;

interface Operator {
    match: (fieldGroup: Field[], outerField: Field) => boolean;
}

abstract class AbstractBinaryOperator implements Operator {
    constructor(
        private readonly lhs: Term,
        private readonly rhs: Term
    ) { }

    protected abstract _match: (lv: Set<string>, rv: Set<string>) => boolean;

    public match(fieldGroup: Field[], outerField: Field) {
        const lv = this.lhs.value(fieldGroup, outerField);
        const rv = this.rhs.value(fieldGroup, outerField);

        return this._match(lv, rv);
    }
}

class EqualsOperator extends AbstractBinaryOperator {
    protected _match = (lv: Set<string>, rv: Set<string>) => {
        const [a, b] = lv.size < rv.size ? [lv, rv] : [rv, lv];

        for (const v of a.values()) {
            if (b.has(v)) {
                return true;
            }
        }
        return false;
    }
}

class NotEqualsOperator extends AbstractBinaryOperator {
    protected _match = (lv: Set<string>, rv: Set<string>) => {
        const [a, b] = lv.size < rv.size ? [lv, rv] : [rv, lv];

        for (const v of a) {
            if (b.has(v)) {
                return false;
            }
        }
        return true;
    }
}

class IncludesOperator extends AbstractBinaryOperator {
    protected _match = (lv: Set<string>, rv: Set<string>) => {
        for (const v0 of lv) {
            for (const v1 of rv) {
                if (v0.indexOf(v1) >= 0) {
                    return true;
                }
            }
        }
        return false;
    }
}

class DoesNotIncludeOperator extends AbstractBinaryOperator {
    protected _match = (lv: Set<string>, rv: Set<string>) => {
        for (const v0 of lv) {
            for (const v1 of rv) {
                if (v0.indexOf(v1) >= 0) {
                    return false;
                }
            }
        }
        return true;
    }
}

abstract class AbstractUnaryOperator implements Operator {
    constructor(
        private readonly rhs: Term
    ) { }

    protected abstract _match: (rv: Set<string>) => boolean;

    public match(fieldGroup: Field[], outerField: Field) {
        const rv = this.rhs.value(fieldGroup, outerField);

        return this._match(rv);
    }
}

class ExistsOperator extends AbstractUnaryOperator {
    protected _match = (rv: Set<string>) => {
        return rv.size > 0
    }
}

class DoesNotExistOperator extends AbstractUnaryOperator {
    protected _match = (rv: Set<string>) => {
        return rv.size == 0
    }
}

const filterSubspec: (operators: Operator[][], fields: Field[], groups: Map<string, Field[]>) => Field[] = (operators, fields, groups) => {
    const result = [];
    for (const f of fields) {
        let accept = true;
        const group = groups.get(f.tag);
        if (group === undefined) {
            continue;
        }
        for (const conj of operators) {
            accept = false;
            for (const disj of conj) {
                const v = disj.match(group, f);
                if (v) {
                    accept = true;
                    break;
                }
            }
            if (!accept) {
                break;
            }
        }
        if (accept) {
            result.push(f);
        }
    }

    return result;
};

const addGroup: (field: Field, fieldGroups: Map<string, Field[]>) => void = (field, fieldGroups) => {
    const t = field.tag;
    const fs = fieldGroups.get(t);
    if (fs === undefined) {
        fieldGroups.set(t, [field]);
    } else {
        fs.push(field);
    }
}


class FieldNode implements Node, RSubscriber, Term {

    private fields: Field[] = [];

    private readonly fieldGroups: Map<string, Field[]> = new Map();

    private readonly _charExtractor: (data: string) => string;

    public get tagPattern() {
        return this.fieldSpec.tag;
    }

    constructor(
        private readonly fieldSpec: FieldSpec,
        private readonly operators: Operator[][]
    ) {
        this._charExtractor = charExtractor(this.fieldSpec.characterSpec);
    }

    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    };

    receiveControlField(field: ControlField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

    receiveDataField(field: DataField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

    public value() {
        const data = this.evaluate;

        const result = new Set<string>();
        for (const d0 of data) {
            for (const d of d0) {
                result.add(d);
            }
        }
        return result;
    }

    public get evaluate() {
        const candidates0 = candidateFields(this.fields, this.fieldSpec.index);

        const candidates1 = filterSubspec(this.operators, candidates0, this.fieldGroups);

        const data = fieldData(candidates1);

        return data.map((d) => d.map(this._charExtractor));
    };
}

class SubfieldNode implements Node, Term, RSubscriber {
    private fields: Field[] = [];

    private readonly fieldGroups: Map<string, Field[]> = new Map();

    private readonly _charExtractor: (data: string) => string;

    constructor(
        public readonly spec: SubfieldSpec,
        private readonly operators: Operator[][]
    ) {
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }

    public get tagPattern() {
        return this.spec.tag;
    }
    public value() {
        return fieldDataSetExtract(this.evaluate, this._charExtractor);
    }
    public get evaluate() {
        const candidates0 = candidateFields(this.fields, this.spec.index);
        const groups = groupFields(candidates0);

        const candidates1 = Array.from(groups.values()).map((cs) => filterSubspec(this.operators, cs, this.fieldGroups)).reduce((a, b) => a.concat(b), []);

        const data = [];
        for (const f of candidates1) {
            if (f instanceof DataField) {
                data.push(subfieldData(f, this.spec.code));
            }
        }

        return data.map((d) => d.map(this._charExtractor));
    }
    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    };

    receiveControlField(field: ControlField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

    receiveDataField(field: DataField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

}

class IndicatorNode implements Node, Term, RSubscriber {
    private fields: Field[] = [];

    private readonly fieldGroups: Map<string, Field[]> = new Map();

    constructor(
        public readonly spec: IndicatorSpec,
        private readonly operators: Operator[][]
    ) { }
    public value() {
        return fieldDataSet(this.evaluate);
    }
    public get tagPattern() {
        return this.spec.tag;
    }
    public get evaluate() {
        const candidates0 = candidateFields(this.fields, this.spec.index);
        const groups = groupFields(candidates0);
        const candidates1 = Array.from(groups.values()).map((cs) => filterSubspec(this.operators, cs, this.fieldGroups)).reduce((a, b) => a.concat(b), []);

        const data = [];
        for (const f of candidates1) {
            if (f instanceof DataField) {
                data.push([f.indicators.charAt(this.spec.indicator - 1)]);
            }
        }
        return data;
    }
    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    };

    receiveControlField(field: ControlField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

    receiveDataField(field: DataField) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    };

}

class CompStringNode implements Term {

    private readonly _value: Set<string> = new Set<string>();

    public value() {
        return this._value;
    }

    constructor(
        compString: ComparisonString
    ) {
        const { theString } = compString;
        this._value.add(theString);
        this._value.add('foo');
    }
}

class AbbrFieldNode implements Term {

    private readonly _charExtractor: (data: string) => string;

    constructor(
        private readonly spec: AbbrFieldSpec,
    ) {
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }

    public value(fieldGroup: Field[], outerField: Field) {
        const data = fieldData(
            this.spec.index !== undefined
                ? candidateFields(fieldGroup, this.spec.index)
                : [outerField]
        );

        return fieldDataSetExtract(data, this._charExtractor);
    }
}

class AbbrIndicatorNode implements Term {
    constructor(
        private readonly spec: AbbrIndicatorSpec
    ) { }

    public value(fieldGroup: Field[], outerField: Field) {
        const result = new Set<string>();
        if (this.spec.index !== undefined) {
            const candidates = candidateFields(fieldGroup, this.spec.index);
            for (const f of candidates) {
                if (f instanceof DataField) {
                    result.add(f.indicators.charAt(this.spec.indicator - 1));
                }
            }
        } else if (outerField instanceof DataField) {
            result.add(outerField.indicators.charAt(this.spec.indicator - 1));
        }
        return result;
    }
}

class AbbrSubfieldNode implements Term {

    private readonly _charExtractor: (data: string) => string;

    constructor(
        private readonly spec: AbbrSubfieldSpec,
    ) {
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }

    public value(fieldGroup: Field[], outerField: Field) {
        const result = new Set<string>();
        if (this.spec.index !== undefined) {
            const candidates = candidateFields(fieldGroup, this.spec.index);
            for (const f of candidates) {
                if (f instanceof DataField) {
                    const data = subfieldData(f, this.spec.code);
                    for (const d of data) {
                        result.add(this._charExtractor(d));
                    }
                }
            }
        } else {
            if (outerField instanceof DataField) {
                const data = subfieldData(outerField, this.spec.code);
                for (const d of data) {
                    result.add(this._charExtractor(d));
                }
            }
        }
        return result;
    }
}

export const buildTree: (marcSpec: MARCSpec) => EvalTree = (marcSpec) => {
    const { spec } = marcSpec;

    const subscribers: RSubscriber[] = [];

    const root = buildNode(spec, subscribers);

    return new EvalTree(root, subscribers);
};

const buildNode: (spec: FieldSpec | IndicatorSpec | SubfieldSpec, subscribers: RSubscriber[]) => FieldNode | IndicatorNode | SubfieldNode = (spec, subscribers) => {
    if (spec instanceof FieldSpec) {
        return buildFieldNode(spec, subscribers);
    } else if (spec instanceof IndicatorSpec) {
        return buildIndicatorNode(spec, subscribers);
    } else {
        return buildSubfieldNode(spec, subscribers);
    }
}

const buildTerm: (spec: BinarySubTerm, subscribers: RSubscriber[]) => Term = (spec, subscribers) => {
    if (spec instanceof AbbrFieldSpec) {
        return new AbbrFieldNode(spec);
    } else if (spec instanceof AbbrIndicatorSpec) {
        return new AbbrIndicatorNode(spec);
    } else if (spec instanceof AbbrSubfieldSpec) {
        return new AbbrSubfieldNode(spec);
    } else if (spec instanceof ComparisonString) {
        return new CompStringNode(spec);
    } else {
        return buildNode(spec, subscribers);
    }
};

const buildFieldNode: (fieldSpec: FieldSpec, subscribers: RSubscriber[]) => FieldNode = (fieldSpec, subscribers) => {
    const { subSpec } = fieldSpec;

    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));

    const node = new FieldNode(fieldSpec, operators);
    subscribers.push(node);
    return node;
};

const buildIndicatorNode: (indicatorSpec: IndicatorSpec, subscribers: RSubscriber[]) => IndicatorNode = (indicatorSpec, subscribers) => {
    const { subSpec } = indicatorSpec;

    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));
    const node = new IndicatorNode(indicatorSpec, operators);
    subscribers.push(node);
    return node;
}

const buildSubfieldNode: (subfieldSpec: SubfieldSpec, subscribers: RSubscriber[]) => SubfieldNode = (subfieldSpec, subscribers) => {
    const { subSpec } = subfieldSpec;

    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));
    const node = new SubfieldNode(subfieldSpec, operators);
    subscribers.push(node);
    return node;
}

const buildOperator: (spec: SubTermSet, subscribers: RSubscriber[]) => Operator = (spec, subscribers) => {
    if (spec instanceof BinarySubTermSet) {
        const { leftHand, operator, rightHand } = spec;
        const lhs = buildTerm(leftHand, subscribers);
        const rhs = buildTerm(rightHand, subscribers);
        switch (operator) {
            case BinaryOperator.EQUALS:
                return new EqualsOperator(lhs, rhs);
            case BinaryOperator.NOT_EQUALS:
                return new NotEqualsOperator(lhs, rhs);
            case BinaryOperator.INCLUDES:
                return new IncludesOperator(lhs, rhs);
            case BinaryOperator.DOES_NOT_INCLUDE:
                return new DoesNotIncludeOperator(lhs, rhs);
        }
        throw Error("Invalid binary term spec: " + operator);
    } else {
        const { operator, rightHand } = spec;
        const rhs = buildTerm(rightHand, subscribers);
        if (operator === undefined) {
            return new ExistsOperator(rhs);
        }
        switch (operator) {
            case UnaryOperator.EXISTS:
                return new ExistsOperator(rhs);
            case UnaryOperator.DOES_NOT_EXIST:
                return new DoesNotExistOperator(rhs);
        }
        throw Error("Invalid unary term spec: " + operator);
    }
}


