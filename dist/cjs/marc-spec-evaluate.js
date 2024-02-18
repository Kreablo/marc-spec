"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTree = exports.EvalTree = void 0;
const marc_spec_1 = require("./marc-spec");
const marc_parser_1 = require("./marc-parser");
class EvalTree {
    constructor(root, subscribers) {
        this.root = root;
        this.subscribers = subscribers;
        this.subfieldDelimiter = '';
        this.fieldDelimiter = ' ; ';
    }
    get evaluate() {
        return this.root.evaluate;
    }
    get evaluate_str() {
        return this.evaluate.map((f) => f.join(this.subfieldDelimiter)).join(this.fieldDelimiter);
    }
}
exports.EvalTree = EvalTree;
const limitRange = (rangeOrPosition, maxIndex) => {
    let start0;
    let end0;
    if (typeof rangeOrPosition === 'object') {
        const { start, end } = rangeOrPosition;
        start0 = start;
        end0 = end;
    }
    else {
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
const candidateFields = (fields, index) => {
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
const rev = (s) => {
    let r = '';
    for (let i = 0; i < s.length; i++) {
        r += s.charAt(s.length - i - 1);
    }
    return r;
};
const charExtractor = (charSpec) => (data) => {
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
const fieldData = (fields) => fields.map((f) => f instanceof marc_parser_1.ControlField
    ? [f.data]
    : Array.from(f.subfields.values()).reduce((a, b) => a.concat(b)).map((sf) => sf.data));
const subfieldData = (field, code) => {
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
};
const fieldDataSet = (data) => {
    const result = new Set();
    for (const vs of data) {
        for (const v of vs) {
            result.add(v);
        }
    }
    return result;
};
const fieldDataSetExtract = (data, charExtractor) => {
    const result = new Set();
    for (const vs of data) {
        for (const v of vs) {
            result.add(charExtractor(v));
        }
    }
    return result;
};
const groupFields = (fields) => {
    const result = new Map();
    const add = (f) => {
        if (!result.has(f.tag)) {
            result.set(f.tag, [f]);
        }
        else {
            result.get(f.tag).push(f);
        }
    };
    for (const f of fields) {
        add(f);
    }
    return result;
};
class AbstractBinaryOperator {
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
    }
    match(fieldGroup, outerField) {
        const lv = this.lhs.value(fieldGroup, outerField);
        const rv = this.rhs.value(fieldGroup, outerField);
        return this._match(lv, rv);
    }
}
class EqualsOperator extends AbstractBinaryOperator {
    constructor() {
        super(...arguments);
        this._match = (lv, rv) => {
            const [a, b] = lv.size < rv.size ? [lv, rv] : [rv, lv];
            for (const v of a.values()) {
                if (b.has(v)) {
                    return true;
                }
            }
            return false;
        };
    }
}
class NotEqualsOperator extends AbstractBinaryOperator {
    constructor() {
        super(...arguments);
        this._match = (lv, rv) => {
            const [a, b] = lv.size < rv.size ? [lv, rv] : [rv, lv];
            for (const v of a) {
                if (b.has(v)) {
                    return false;
                }
            }
            return true;
        };
    }
}
class IncludesOperator extends AbstractBinaryOperator {
    constructor() {
        super(...arguments);
        this._match = (lv, rv) => {
            for (const v0 of lv) {
                for (const v1 of rv) {
                    if (v0.indexOf(v1) >= 0) {
                        return true;
                    }
                }
            }
            return false;
        };
    }
}
class DoesNotIncludeOperator extends AbstractBinaryOperator {
    constructor() {
        super(...arguments);
        this._match = (lv, rv) => {
            for (const v0 of lv) {
                for (const v1 of rv) {
                    if (v0.indexOf(v1) >= 0) {
                        return false;
                    }
                }
            }
            return true;
        };
    }
}
class AbstractUnaryOperator {
    constructor(rhs) {
        this.rhs = rhs;
    }
    match(fieldGroup, outerField) {
        const rv = this.rhs.value(fieldGroup, outerField);
        return this._match(rv);
    }
}
class ExistsOperator extends AbstractUnaryOperator {
    constructor() {
        super(...arguments);
        this._match = (rv) => {
            return rv.size > 0;
        };
    }
}
class DoesNotExistOperator extends AbstractUnaryOperator {
    constructor() {
        super(...arguments);
        this._match = (rv) => {
            return rv.size == 0;
        };
    }
}
const filterSubspec = (operators, fields, groups) => {
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
const addGroup = (field, fieldGroups) => {
    const t = field.tag;
    const fs = fieldGroups.get(t);
    if (fs === undefined) {
        fieldGroups.set(t, [field]);
    }
    else {
        fs.push(field);
    }
};
class FieldNode {
    get tagPattern() {
        return this.fieldSpec.tag;
    }
    constructor(fieldSpec, operators) {
        this.fieldSpec = fieldSpec;
        this.operators = operators;
        this.fields = [];
        this.fieldGroups = new Map();
        this._charExtractor = charExtractor(this.fieldSpec.characterSpec);
    }
    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    }
    ;
    receiveControlField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
    receiveDataField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
    value() {
        const data = this.evaluate;
        const result = new Set();
        for (const d0 of data) {
            for (const d of d0) {
                result.add(d);
            }
        }
        return result;
    }
    get evaluate() {
        const candidates0 = candidateFields(this.fields, this.fieldSpec.index);
        const candidates1 = filterSubspec(this.operators, candidates0, this.fieldGroups);
        const data = fieldData(candidates1);
        return data.map((d) => d.map(this._charExtractor));
    }
    ;
}
class SubfieldNode {
    constructor(spec, operators) {
        this.spec = spec;
        this.operators = operators;
        this.fields = [];
        this.fieldGroups = new Map();
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }
    get tagPattern() {
        return this.spec.tag;
    }
    value() {
        return fieldDataSetExtract(this.evaluate, this._charExtractor);
    }
    get evaluate() {
        const candidates0 = candidateFields(this.fields, this.spec.index);
        const groups = groupFields(candidates0);
        const candidates1 = Array.from(groups.values()).map((cs) => filterSubspec(this.operators, cs, this.fieldGroups)).reduce((a, b) => a.concat(b), []);
        const data = [];
        for (const f of candidates1) {
            if (f instanceof marc_parser_1.DataField) {
                data.push(subfieldData(f, this.spec.code));
            }
        }
        return data.map((d) => d.map(this._charExtractor));
    }
    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    }
    ;
    receiveControlField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
    receiveDataField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
}
class IndicatorNode {
    constructor(spec, operators) {
        this.spec = spec;
        this.operators = operators;
        this.fields = [];
        this.fieldGroups = new Map();
    }
    value() {
        return fieldDataSet(this.evaluate);
    }
    get tagPattern() {
        return this.spec.tag;
    }
    get evaluate() {
        const candidates0 = candidateFields(this.fields, this.spec.index);
        const groups = groupFields(candidates0);
        const candidates1 = Array.from(groups.values()).map((cs) => filterSubspec(this.operators, cs, this.fieldGroups)).reduce((a, b) => a.concat(b), []);
        const data = [];
        for (const f of candidates1) {
            if (f instanceof marc_parser_1.DataField) {
                data.push([f.indicators.charAt(this.spec.indicator - 1)]);
            }
        }
        return data;
    }
    reset() {
        this.fields = [];
        this.fieldGroups.clear();
    }
    ;
    receiveControlField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
    receiveDataField(field) {
        this.fields.push(field);
        addGroup(field, this.fieldGroups);
    }
    ;
}
class CompStringNode {
    value() {
        return this._value;
    }
    constructor(compString) {
        this._value = new Set();
        const { theString } = compString;
        this._value.add(theString);
        this._value.add('foo');
    }
}
class AbbrFieldNode {
    constructor(spec) {
        this.spec = spec;
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }
    value(fieldGroup, outerField) {
        const data = fieldData(this.spec.index !== undefined
            ? candidateFields(fieldGroup, this.spec.index)
            : [outerField]);
        return fieldDataSetExtract(data, this._charExtractor);
    }
}
class AbbrIndicatorNode {
    constructor(spec) {
        this.spec = spec;
    }
    value(fieldGroup, outerField) {
        const result = new Set();
        if (this.spec.index !== undefined) {
            const candidates = candidateFields(fieldGroup, this.spec.index);
            for (const f of candidates) {
                if (f instanceof marc_parser_1.DataField) {
                    result.add(f.indicators.charAt(this.spec.indicator - 1));
                }
            }
        }
        else if (outerField instanceof marc_parser_1.DataField) {
            result.add(outerField.indicators.charAt(this.spec.indicator - 1));
        }
        return result;
    }
}
class AbbrSubfieldNode {
    constructor(spec) {
        this.spec = spec;
        this._charExtractor = charExtractor(this.spec.characterSpec);
    }
    value(fieldGroup, outerField) {
        const result = new Set();
        if (this.spec.index !== undefined) {
            const candidates = candidateFields(fieldGroup, this.spec.index);
            for (const f of candidates) {
                if (f instanceof marc_parser_1.DataField) {
                    const data = subfieldData(f, this.spec.code);
                    for (const d of data) {
                        result.add(this._charExtractor(d));
                    }
                }
            }
        }
        else {
            if (outerField instanceof marc_parser_1.DataField) {
                const data = subfieldData(outerField, this.spec.code);
                for (const d of data) {
                    result.add(this._charExtractor(d));
                }
            }
        }
        return result;
    }
}
const buildTree = (marcSpec) => {
    const { spec } = marcSpec;
    const subscribers = [];
    const root = buildNode(spec, subscribers);
    return new EvalTree(root, subscribers);
};
exports.buildTree = buildTree;
const buildNode = (spec, subscribers) => {
    if (spec instanceof marc_spec_1.FieldSpec) {
        return buildFieldNode(spec, subscribers);
    }
    else if (spec instanceof marc_spec_1.IndicatorSpec) {
        return buildIndicatorNode(spec, subscribers);
    }
    else {
        return buildSubfieldNode(spec, subscribers);
    }
};
const buildTerm = (spec, subscribers) => {
    if (spec instanceof marc_spec_1.AbbrFieldSpec) {
        return new AbbrFieldNode(spec);
    }
    else if (spec instanceof marc_spec_1.AbbrIndicatorSpec) {
        return new AbbrIndicatorNode(spec);
    }
    else if (spec instanceof marc_spec_1.AbbrSubfieldSpec) {
        return new AbbrSubfieldNode(spec);
    }
    else if (spec instanceof marc_spec_1.ComparisonString) {
        return new CompStringNode(spec);
    }
    else {
        return buildNode(spec, subscribers);
    }
};
const buildFieldNode = (fieldSpec, subscribers) => {
    const { subSpec } = fieldSpec;
    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));
    const node = new FieldNode(fieldSpec, operators);
    subscribers.push(node);
    return node;
};
const buildIndicatorNode = (indicatorSpec, subscribers) => {
    const { subSpec } = indicatorSpec;
    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));
    const node = new IndicatorNode(indicatorSpec, operators);
    subscribers.push(node);
    return node;
};
const buildSubfieldNode = (subfieldSpec, subscribers) => {
    const { subSpec } = subfieldSpec;
    const operators = subSpec.map((conj) => conj.map((disj) => buildOperator(disj, subscribers)));
    const node = new SubfieldNode(subfieldSpec, operators);
    subscribers.push(node);
    return node;
};
const buildOperator = (spec, subscribers) => {
    if (spec instanceof marc_spec_1.BinarySubTermSet) {
        const { leftHand, operator, rightHand } = spec;
        const lhs = buildTerm(leftHand, subscribers);
        const rhs = buildTerm(rightHand, subscribers);
        switch (operator) {
            case marc_spec_1.BinaryOperator.EQUALS:
                return new EqualsOperator(lhs, rhs);
            case marc_spec_1.BinaryOperator.NOT_EQUALS:
                return new NotEqualsOperator(lhs, rhs);
            case marc_spec_1.BinaryOperator.INCLUDES:
                return new IncludesOperator(lhs, rhs);
            case marc_spec_1.BinaryOperator.DOES_NOT_INCLUDE:
                return new DoesNotIncludeOperator(lhs, rhs);
        }
        throw Error("Invalid binary term spec: " + operator);
    }
    else {
        const { operator, rightHand } = spec;
        const rhs = buildTerm(rightHand, subscribers);
        if (operator === undefined) {
            return new ExistsOperator(rhs);
        }
        switch (operator) {
            case marc_spec_1.UnaryOperator.EXISTS:
                return new ExistsOperator(rhs);
            case marc_spec_1.UnaryOperator.DOES_NOT_EXIST:
                return new DoesNotExistOperator(rhs);
        }
        throw Error("Invalid unary term spec: " + operator);
    }
};
