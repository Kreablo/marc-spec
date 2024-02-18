"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeIndex = exports.serializeAbbrSubfieldSpec = exports.serializeSubfieldSpec = exports.serializeAbbrIndicatorSpec = exports.serializeIndicatorSpec = exports.serializeAbbrFieldSpec = exports.serializeFieldSpec = exports.serializeMarcSpec = exports.parseMarcSpec = exports.marcSpec = exports.subAndSpec = exports.subOrSpec = exports.subTermSet = exports.binarySubTerm = exports.unarySubTerm = exports.comparisonString = exports.fullSpec = exports.abbreviation = exports.subfieldSpec = exports.abbrSubfieldSpec = exports.subfieldCode = exports.abbrFieldSpec = exports.fieldSpec = exports.abbrIndicatorSpec = exports.indicatorSpec = exports.index = exports.characterSpec = exports.rangeOrPosition = exports.position = exports.positiveInteger = exports.newMarcSpecLexer = exports.Context = exports.MARCSpec = exports.UnarySubTermSet = exports.BinarySubTermSet = exports.UnaryOperator = exports.BinaryOperator = exports.ComparisonString = exports.AbbrIndicatorSpec = exports.IndicatorSpec = exports.AbbrSubfieldSpec = exports.SubfieldSpec = exports.SubfieldCode = exports.AbbrFieldSpec = exports.FieldSpec = exports.AbbrSpec = exports.ItemSpec = exports.IndexSpec = exports.CharacterSpec = exports.TokenType = void 0;
exports.serializeTerm = exports.serializeUnarySubTermSet = exports.serializeBinarySubTermSet = exports.serializeTermSet = exports.serializeSubSpec = exports.serializeCode = exports.serializeCharacterSpec = void 0;
const typescript_parsec_1 = require("typescript-parsec");
const k_lexer_1 = require("@kreablo/k-lexer");
var TokenType;
(function (TokenType) {
    TokenType[TokenType["COMPARISON_STRING"] = 0] = "COMPARISON_STRING";
    TokenType[TokenType["COMPARISON_STRING_SINGLE_QUOTED"] = 1] = "COMPARISON_STRING_SINGLE_QUOTED";
    TokenType[TokenType["COMPARISON_STRING_DOUBLE_QUOTED"] = 2] = "COMPARISON_STRING_DOUBLE_QUOTED";
    TokenType[TokenType["INTEGER"] = 3] = "INTEGER";
    TokenType[TokenType["ZERO"] = 4] = "ZERO";
    TokenType[TokenType["POSITIVE_DIGIT"] = 5] = "POSITIVE_DIGIT";
    TokenType[TokenType["POSITIVE_INTEGER"] = 6] = "POSITIVE_INTEGER";
    TokenType[TokenType["FIELD_TAG"] = 7] = "FIELD_TAG";
    TokenType[TokenType["HASH"] = 8] = "HASH";
    TokenType[TokenType["RANGE_MARK"] = 9] = "RANGE_MARK";
    TokenType[TokenType["BEGIN_SUBSPEC"] = 10] = "BEGIN_SUBSPEC";
    TokenType[TokenType["END_SUBSPEC"] = 11] = "END_SUBSPEC";
    TokenType[TokenType["BEGIN_INDEX"] = 12] = "BEGIN_INDEX";
    TokenType[TokenType["END_INDEX"] = 13] = "END_INDEX";
    TokenType[TokenType["BEGIN_CHARACTER"] = 14] = "BEGIN_CHARACTER";
    TokenType[TokenType["SUBFIELD_MARKER"] = 15] = "SUBFIELD_MARKER";
    TokenType[TokenType["SUBFIELD_CHAR"] = 16] = "SUBFIELD_CHAR";
    TokenType[TokenType["SUBTERM_SEPARATOR"] = 17] = "SUBTERM_SEPARATOR";
    TokenType[TokenType["INDICATOR_MARKER"] = 18] = "INDICATOR_MARKER";
    TokenType[TokenType["INDICATOR"] = 19] = "INDICATOR";
    TokenType[TokenType["BEGIN_COMPARISON"] = 20] = "BEGIN_COMPARISON";
    TokenType[TokenType["BINARY_OPERATOR"] = 21] = "BINARY_OPERATOR";
    TokenType[TokenType["UNARY_OPERATOR"] = 22] = "UNARY_OPERATOR";
})(TokenType || (exports.TokenType = TokenType = {}));
;
class CharacterSpec {
    constructor(item) {
        this.item = item;
    }
}
exports.CharacterSpec = CharacterSpec;
class IndexSpec {
    constructor(item) {
        this.item = item;
    }
}
exports.IndexSpec = IndexSpec;
class ItemSpec {
    constructor(tag, index, subSpec) {
        this.tag = tag;
        this.index = index;
        this.subSpec = subSpec;
    }
}
exports.ItemSpec = ItemSpec;
class AbbrSpec {
    constructor(index) {
        this.index = index;
    }
}
exports.AbbrSpec = AbbrSpec;
class FieldSpec extends ItemSpec {
    constructor(tag, index, characterSpec, subSpec) {
        super(tag, index, subSpec);
        this.characterSpec = characterSpec;
    }
}
exports.FieldSpec = FieldSpec;
class AbbrFieldSpec extends AbbrSpec {
    constructor(index, characterSpec) {
        super(index);
        this.characterSpec = characterSpec;
    }
}
exports.AbbrFieldSpec = AbbrFieldSpec;
class SubfieldCode {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}
exports.SubfieldCode = SubfieldCode;
class SubfieldSpec extends ItemSpec {
    constructor(tag, index, code, subindex, characterSpec, subSpec) {
        super(tag, index, subSpec);
        this.code = code;
        this.subindex = subindex;
        this.characterSpec = characterSpec;
    }
}
exports.SubfieldSpec = SubfieldSpec;
class AbbrSubfieldSpec extends AbbrSpec {
    constructor(index, code, subindex, characterSpec) {
        super(index);
        this.code = code;
        this.subindex = subindex;
        this.characterSpec = characterSpec;
    }
}
exports.AbbrSubfieldSpec = AbbrSubfieldSpec;
class IndicatorSpec extends ItemSpec {
    constructor(tag, indicator, index, subSpec) {
        super(tag, index, subSpec);
        this.indicator = indicator;
    }
}
exports.IndicatorSpec = IndicatorSpec;
class AbbrIndicatorSpec extends AbbrSpec {
    constructor(indicator, index) {
        super(index);
        this.indicator = indicator;
    }
}
exports.AbbrIndicatorSpec = AbbrIndicatorSpec;
const toAbbr = (spec) => {
    if (spec instanceof FieldSpec) {
        const { index, characterSpec } = spec;
        return new AbbrFieldSpec(index, characterSpec);
    }
    if (spec instanceof SubfieldSpec) {
        const { index, code, subindex, characterSpec } = spec;
        return new AbbrSubfieldSpec(index, code, subindex, characterSpec);
    }
    const { index, indicator } = spec;
    return new AbbrIndicatorSpec(indicator, index);
};
const unescapeSpaceRe = /\\s/g;
const unescapeCompStringRe = /\\([\$\{\}!=~\?\|\}\\])/g;
const unescapeSingleQuoteCompStringRe = /\\(['\\])/g;
const unescapeDoubleQuoteCompStringRe = /\\(["\\])/g;
const escapeCompStringRe = /([\$\{\}!=~\?\|\}\\])/g;
const escapeSingleQuoteCompStringRe = /(['\\])/g;
const escapeDoubleQuoteCompStringRe = /(["\\])/g;
class ComparisonString {
    constructor(compString, syntaxType) {
        if (syntaxType === "'") {
            const s = compString.substring(1, compString.length - 1);
            this.theString = s.replace(unescapeSingleQuoteCompStringRe, (_, c) => c);
        }
        else if (syntaxType === '"') {
            const s = compString.substring(1, compString.length - 1);
            this.theString = s.replace(unescapeDoubleQuoteCompStringRe, (_, c) => c);
        }
        else {
            const s = compString.replace(unescapeSpaceRe, (_1, _2) => ' ');
            this.theString = s.replace(unescapeCompStringRe, (_, c) => c);
        }
        this.syntaxType = syntaxType;
    }
}
exports.ComparisonString = ComparisonString;
var BinaryOperator;
(function (BinaryOperator) {
    BinaryOperator[BinaryOperator["EQUALS"] = 0] = "EQUALS";
    BinaryOperator[BinaryOperator["NOT_EQUALS"] = 1] = "NOT_EQUALS";
    BinaryOperator[BinaryOperator["INCLUDES"] = 2] = "INCLUDES";
    BinaryOperator[BinaryOperator["DOES_NOT_INCLUDE"] = 3] = "DOES_NOT_INCLUDE";
})(BinaryOperator || (exports.BinaryOperator = BinaryOperator = {}));
;
const binOp = (op) => {
    if (op === '=') {
        return BinaryOperator.EQUALS;
    }
    else if (op === '!=') {
        return BinaryOperator.NOT_EQUALS;
    }
    else if (op === '~') {
        return BinaryOperator.INCLUDES;
    }
    else {
        return BinaryOperator.DOES_NOT_INCLUDE;
    }
};
const binOpString = (op) => {
    switch (op) {
        case BinaryOperator.EQUALS:
            return '=';
        case BinaryOperator.NOT_EQUALS:
            return '!=';
        case BinaryOperator.INCLUDES:
            return '~';
        case BinaryOperator.DOES_NOT_INCLUDE:
            return '!~';
    }
};
var UnaryOperator;
(function (UnaryOperator) {
    UnaryOperator[UnaryOperator["EXISTS"] = 0] = "EXISTS";
    UnaryOperator[UnaryOperator["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
})(UnaryOperator || (exports.UnaryOperator = UnaryOperator = {}));
;
const unOp = (op) => {
    if (op === undefined) {
        return undefined;
    }
    else if (op === '?') {
        return UnaryOperator.EXISTS;
    }
    else {
        return UnaryOperator.DOES_NOT_EXIST;
    }
};
const unOpString = (op) => {
    if (op === undefined) {
        return '';
    }
    switch (op) {
        case UnaryOperator.EXISTS:
            return '?';
        case UnaryOperator.DOES_NOT_EXIST:
            return '!';
    }
};
class BinarySubTermSet {
    constructor(leftHand, operator, rightHand) {
        this.leftHand = leftHand;
        this.operator = operator;
        this.rightHand = rightHand;
    }
}
exports.BinarySubTermSet = BinarySubTermSet;
class UnarySubTermSet {
    constructor(operator, rightHand) {
        this.operator = operator;
        this.rightHand = rightHand;
    }
}
exports.UnarySubTermSet = UnarySubTermSet;
class MARCSpec {
    constructor(spec) {
        this.spec = spec;
    }
}
exports.MARCSpec = MARCSpec;
;
const _l = (regexp, tokentype, keep) => (nextContext) => [regexp, (_) => [tokentype, nextContext, keep]];
const integer = _l('[0-9]+', TokenType.INTEGER, true);
const comparison_string = _l('(?:["#%-<>@-Z^-z]|[^\\u0000-\\u007F]|\\\\[!-~\\|=])+', TokenType.COMPARISON_STRING, true);
const comparison_string_single_quote = _l("'(?:[^'\\\\]|\\\\[\\\\'])*'", TokenType.COMPARISON_STRING_SINGLE_QUOTED, true);
const comparison_string_double_quote = _l('"(?:[^\\\\"]|\\\\[\\\\"])*"', TokenType.COMPARISON_STRING_DOUBLE_QUOTED, true);
const begin_comparison = _l('\\\\', TokenType.BEGIN_COMPARISON, true);
const positive_digit = _l('[1-9]', TokenType.POSITIVE_DIGIT, true);
const hash = _l('#', TokenType.HASH, true);
const zero = _l('0', TokenType.ZERO, true);
const range_mark = _l('-', TokenType.RANGE_MARK, true);
const begin_subspec = _l('\\{', TokenType.BEGIN_SUBSPEC, true);
const end_subspec = _l('\\}', TokenType.END_SUBSPEC, true);
const begin_index = _l('\\[', TokenType.BEGIN_INDEX, true);
const end_index = _l('\\]', TokenType.END_INDEX, true);
const binary_operator = _l('=|!=|~|!~', TokenType.BINARY_OPERATOR, true);
const unary_operator = _l('!|\\?', TokenType.UNARY_OPERATOR, true);
const field_tag = _l('[0-9\\.]{3}|[a-z\\.]{3}|[A-Z\\.]{3}', TokenType.FIELD_TAG, true);
const subfield = _l('\\$', TokenType.SUBFIELD_MARKER, true);
const subfield_char = _l('[!"#\\$%&\'\\(\\)\\*\\+,\\-\\./0-9:;<=>\\?\\[\\\\\\]\\^_`a-z\\{\\}~]', TokenType.SUBFIELD_CHAR, true);
const subterm_separator = _l('\\|', TokenType.SUBTERM_SEPARATOR, true);
const character_position = _l('/', TokenType.BEGIN_CHARACTER, true);
const indicator_marker = _l('\\^', TokenType.INDICATOR_MARKER, true);
const indicator = _l('1|2', TokenType.INDICATOR, true);
var Context;
(function (Context) {
    Context[Context["POSITION1"] = 0] = "POSITION1";
    Context[Context["POSITION2"] = 1] = "POSITION2";
    Context[Context["SUBFIELD"] = 2] = "SUBFIELD";
    Context[Context["COMPARISON_STRING"] = 3] = "COMPARISON_STRING";
    Context[Context["INDICATOR"] = 4] = "INDICATOR";
    Context[Context["TOP"] = 5] = "TOP";
})(Context || (exports.Context = Context = {}));
;
const position1_context = [Context.POSITION1, new k_lexer_1.KLexerContext([
        zero(Context.POSITION2),
        positive_digit(Context.POSITION2),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        begin_index(Context.TOP),
        end_index(Context.TOP),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        hash(Context.POSITION2)
    ], 'failed-lexing-position-context', 'm')
];
const position2_context = [Context.POSITION2, new k_lexer_1.KLexerContext([
        integer(Context.POSITION2),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        begin_index(Context.TOP),
        end_index(Context.TOP),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        range_mark(Context.POSITION1),
        subterm_separator(Context.TOP),
    ], 'failed-lexing-position-context', 'm')
];
const subfield_context = [Context.SUBFIELD, new k_lexer_1.KLexerContext([
        subfield_char(Context.TOP)
    ], 'failed-lexing-subfield-char', 'm')
];
const comparison_string_context = [Context.COMPARISON_STRING, new k_lexer_1.KLexerContext([
        comparison_string(Context.TOP)
    ], 'failed-lexing-comparison-string', 'm')
];
const indicator_context = [Context.INDICATOR, new k_lexer_1.KLexerContext([
        indicator(Context.TOP)
    ], 'failed-lexing-indicator', 'm')
];
const top_context = [Context.TOP, new k_lexer_1.KLexerContext([
        field_tag(Context.TOP),
        indicator_marker(Context.INDICATOR),
        subfield(Context.SUBFIELD),
        range_mark(Context.SUBFIELD),
        character_position(Context.POSITION1),
        begin_index(Context.POSITION1),
        begin_subspec(Context.TOP),
        end_subspec(Context.TOP),
        binary_operator(Context.TOP),
        unary_operator(Context.TOP),
        subterm_separator(Context.TOP),
        begin_comparison(Context.COMPARISON_STRING),
        comparison_string_single_quote(Context.TOP),
        comparison_string_double_quote(Context.TOP)
    ], 'failed-lexing-top-context', 'm')
];
const newMarcSpecLexer = () => new k_lexer_1.KLexer([
    top_context, subfield_context, position1_context, position2_context, comparison_string_context, indicator_context
]);
exports.newMarcSpecLexer = newMarcSpecLexer;
exports.positiveInteger = (0, typescript_parsec_1.alt_sc)((0, typescript_parsec_1.apply)((0, typescript_parsec_1.tok)(TokenType.ZERO), (_) => 0), (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.POSITIVE_DIGIT), (0, typescript_parsec_1.opt_sc)((0, typescript_parsec_1.tok)(TokenType.INTEGER))), ([d, ds]) => +(d.text + (ds !== undefined ? ds.text : ''))));
exports.position = (0, typescript_parsec_1.alt_sc)(exports.positiveInteger, (0, typescript_parsec_1.apply)((0, typescript_parsec_1.tok)(TokenType.HASH), (_) => '#'));
exports.rangeOrPosition = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.position, (0, typescript_parsec_1.opt_sc)((0, typescript_parsec_1.kright)((0, typescript_parsec_1.tok)(TokenType.RANGE_MARK), exports.position))), ([start, end]) => end !== undefined ? { start, end } : start);
exports.characterSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.kright)((0, typescript_parsec_1.tok)(TokenType.BEGIN_CHARACTER), exports.rangeOrPosition), (item) => new CharacterSpec(item));
exports.index = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.kmid)((0, typescript_parsec_1.tok)(TokenType.BEGIN_INDEX), exports.rangeOrPosition, (0, typescript_parsec_1.tok)(TokenType.END_INDEX)), (item) => new IndexSpec(item));
exports.indicatorSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.kright)((0, typescript_parsec_1.tok)(TokenType.INDICATOR_MARKER), (0, typescript_parsec_1.tok)(TokenType.INDICATOR)), (indicator) => {
    const ind = indicator.text === '1' ? 1 : 2;
    return (tag, index, subSpec) => new IndicatorSpec(tag, ind, index, subSpec);
});
exports.abbrIndicatorSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.kright)((0, typescript_parsec_1.tok)(TokenType.INDICATOR_MARKER), (0, typescript_parsec_1.tok)(TokenType.INDICATOR)), (indicator) => {
    const ind = indicator.text === '1' ? 1 : 2;
    return (index) => new AbbrIndicatorSpec(ind, index);
});
exports.fieldSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.opt_sc)(exports.characterSpec), (cspec) => (tag, index, subSpec) => new FieldSpec(tag, index, cspec, subSpec));
exports.abbrFieldSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.opt_sc)(exports.characterSpec), (cspec) => (index) => new AbbrFieldSpec(index, cspec));
exports.subfieldCode = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.SUBFIELD_MARKER), (0, typescript_parsec_1.tok)(TokenType.SUBFIELD_CHAR), (0, typescript_parsec_1.opt_sc)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.RANGE_MARK), (0, typescript_parsec_1.tok)(TokenType.SUBFIELD_CHAR)))), ([_1, start, mend]) => new SubfieldCode(start.text, mend === undefined ? start.text : mend[1].text));
exports.abbrSubfieldSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.subfieldCode, (0, typescript_parsec_1.opt_sc)(exports.index), (0, typescript_parsec_1.opt_sc)(exports.characterSpec)), ([code, ispec, cspec]) => (index) => new AbbrSubfieldSpec(index, code, ispec, cspec));
exports.subfieldSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.subfieldCode, (0, typescript_parsec_1.opt_sc)(exports.index), (0, typescript_parsec_1.opt_sc)(exports.characterSpec)), ([code, ispec, cspec]) => (tag, index, subSpec) => new SubfieldSpec(tag, index, code, ispec, cspec, subSpec));
exports.abbreviation = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.opt_sc)(exports.index), (0, typescript_parsec_1.alt_sc)(exports.abbrSubfieldSpec, exports.abbrIndicatorSpec, exports.abbrFieldSpec)), ([index, alt1]) => alt1(index));
const specStart = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.FIELD_TAG), (0, typescript_parsec_1.opt_sc)(exports.index)), ([token, index]) => [token.text, index]);
exports.fullSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(specStart, (0, typescript_parsec_1.alt_sc)(exports.subfieldSpec, exports.indicatorSpec, exports.fieldSpec)), ([[tag, index], alt1]) => (subSpec) => alt1(tag, index, subSpec));
exports.comparisonString = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.alt_sc)((0, typescript_parsec_1.kright)((0, typescript_parsec_1.tok)(TokenType.BEGIN_COMPARISON), (0, typescript_parsec_1.tok)(TokenType.COMPARISON_STRING)), (0, typescript_parsec_1.alt_sc)((0, typescript_parsec_1.tok)(TokenType.COMPARISON_STRING_DOUBLE_QUOTED), (0, typescript_parsec_1.tok)(TokenType.COMPARISON_STRING_SINGLE_QUOTED))), (token) => {
    const syntaxType = token.kind === TokenType.COMPARISON_STRING_DOUBLE_QUOTED ? '"' :
        (token.kind === TokenType.COMPARISON_STRING_SINGLE_QUOTED ? "'" : "\\");
    return new ComparisonString(token.text, syntaxType);
});
exports.unarySubTerm = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.alt_sc)(exports.fullSpec, exports.abbreviation), (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);
exports.binarySubTerm = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.alt_sc)(exports.fullSpec, exports.comparisonString, exports.abbreviation), (alt1) => typeof alt1 === 'function' ? alt1([]) : alt1);
exports.subTermSet = (0, typescript_parsec_1.alt)((0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.UNARY_OPERATOR), exports.unarySubTerm), ([op, rhs]) => (_) => new UnarySubTermSet(unOp(op.text), rhs)), (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.BINARY_OPERATOR), exports.binarySubTerm), ([op, rhs]) => (lhs) => new BinarySubTermSet(lhs, binOp(op.text), rhs)), (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.unarySubTerm, (0, typescript_parsec_1.opt_sc)((0, typescript_parsec_1.seq)((0, typescript_parsec_1.tok)(TokenType.BINARY_OPERATOR), exports.binarySubTerm))), ([mlhs, alt]) => (_) => alt === undefined ? new UnarySubTermSet(undefined, mlhs) : new BinarySubTermSet(mlhs, binOp(alt[0].text), alt[1])), (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.comparisonString, (0, typescript_parsec_1.tok)(TokenType.BINARY_OPERATOR), exports.binarySubTerm), ([lhs, op, rhs]) => (_) => new BinarySubTermSet(lhs, binOp(op.text), rhs)));
exports.subOrSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.opt_sc)((0, typescript_parsec_1.kmid)((0, typescript_parsec_1.tok)(TokenType.BEGIN_SUBSPEC), (0, typescript_parsec_1.list_sc)(exports.subTermSet, (0, typescript_parsec_1.tok)(TokenType.SUBTERM_SEPARATOR)), (0, typescript_parsec_1.tok)(TokenType.END_SUBSPEC))), (mspec) => (mspec === undefined ? [] : mspec));
exports.subAndSpec = (0, typescript_parsec_1.rep_sc)(exports.subOrSpec);
exports.marcSpec = (0, typescript_parsec_1.apply)((0, typescript_parsec_1.seq)(exports.fullSpec, exports.subAndSpec), ([fullSpec, subSpec]) => new MARCSpec(fullSpec(subSpec.map((s) => s.map((s0) => s0(toAbbr(fullSpec([]))))))));
function isTokenPosition(o) {
    if (o === null || typeof o !== 'object') {
        return false;
    }
    for (const p of ['index', 'rowBegin', 'columnBegin', 'rowEnd', 'columnEnd']) {
        const pd = Object.getOwnPropertyDescriptor(o, p);
        if (pd === undefined || typeof pd.value !== 'number') {
            return false;
        }
    }
    return true;
}
;
const parseMarcSpec = (input) => {
    let result;
    try {
        const result = (0, typescript_parsec_1.expectEOF)(exports.marcSpec.parse((0, exports.newMarcSpecLexer)().parse(input)));
        if (result.successful) {
            return result.candidates[0].result;
        }
        return result.error;
    }
    catch (e) {
        if (typeof e === 'object' && e !== null) {
            if ('kind' in e && e.kind === 'Error' && 'message' in e && typeof e.message === 'string') {
                let pos = 'pos' in e && isTokenPosition(e.pos) ? e.pos : undefined;
                result = {
                    kind: e.kind,
                    pos: pos,
                    message: e.message
                };
                return result;
            }
            if ('pos' in e && isTokenPosition(e.pos) && 'errorMessage' in e && typeof e.errorMessage === 'string') {
                return { kind: 'Error', pos: e.pos, message: e.errorMessage };
            }
        }
    }
    return { kind: 'Error', pos: undefined, message: 'unknown-error' };
};
exports.parseMarcSpec = parseMarcSpec;
const serializeMarcSpec = (marcSpec) => {
    const { spec } = marcSpec;
    if (spec instanceof FieldSpec) {
        return (0, exports.serializeFieldSpec)(spec);
    }
    if (spec instanceof IndicatorSpec) {
        return (0, exports.serializeIndicatorSpec)(spec);
    }
    return (0, exports.serializeSubfieldSpec)(spec);
};
exports.serializeMarcSpec = serializeMarcSpec;
const serializeFieldSpec = (fieldSpec) => {
    const { tag, index, characterSpec, subSpec } = fieldSpec;
    return tag + (0, exports.serializeIndex)(index) + (0, exports.serializeCharacterSpec)(characterSpec) + (0, exports.serializeSubSpec)(subSpec);
};
exports.serializeFieldSpec = serializeFieldSpec;
const serializeAbbrFieldSpec = (fieldSpec) => {
    const { index, characterSpec } = fieldSpec;
    return (0, exports.serializeIndex)(index) + (0, exports.serializeCharacterSpec)(characterSpec);
};
exports.serializeAbbrFieldSpec = serializeAbbrFieldSpec;
const serializeIndicatorSpec = (indicatorSpec) => {
    const { tag, indicator, index, subSpec } = indicatorSpec;
    return tag + (0, exports.serializeIndex)(index) + '^' + indicator + (0, exports.serializeSubSpec)(subSpec);
};
exports.serializeIndicatorSpec = serializeIndicatorSpec;
const serializeAbbrIndicatorSpec = (indicatorSpec) => {
    const { indicator, index } = indicatorSpec;
    return (0, exports.serializeIndex)(index) + '^' + indicator;
};
exports.serializeAbbrIndicatorSpec = serializeAbbrIndicatorSpec;
const serializeSubfieldSpec = (subfieldSpec) => {
    const { tag, index, code, subindex, characterSpec, subSpec } = subfieldSpec;
    return tag + (0, exports.serializeIndex)(index) + (0, exports.serializeCode)(code) + (0, exports.serializeIndex)(subindex) + (0, exports.serializeCharacterSpec)(characterSpec) + (0, exports.serializeSubSpec)(subSpec);
};
exports.serializeSubfieldSpec = serializeSubfieldSpec;
const serializeAbbrSubfieldSpec = (subfieldSpec) => {
    const { index, code, subindex, characterSpec } = subfieldSpec;
    return (0, exports.serializeIndex)(index) + (0, exports.serializeCode)(code) + (0, exports.serializeIndex)(subindex) + (0, exports.serializeCharacterSpec)(characterSpec);
};
exports.serializeAbbrSubfieldSpec = serializeAbbrSubfieldSpec;
const serializeIndex = (index) => {
    if (index === undefined) {
        return '';
    }
    const { item } = index;
    if (typeof item === "object") {
        const { start, end } = item;
        return `[${start}-${end}]`;
    }
    return `[${item}]`;
};
exports.serializeIndex = serializeIndex;
const serializeCharacterSpec = (charSpec) => {
    if (charSpec === undefined) {
        return '';
    }
    const { item } = charSpec;
    if (typeof item === "object") {
        const { start, end } = item;
        return `/${start}-${end}`;
    }
    return `/${item}`;
};
exports.serializeCharacterSpec = serializeCharacterSpec;
const serializeCode = (code) => {
    const { start, end } = code;
    if (start === end) {
        return '$' + start;
    }
    return `\$${start}-${end}`;
};
exports.serializeCode = serializeCode;
const serializeSubSpec = (subSpec) => {
    if (subSpec.length === 0) {
        return '';
    }
    return subSpec.reduce((s0, s) => s0 + '{' + s.map((t) => (0, exports.serializeTermSet)(t)).join('|') + '}', '');
};
exports.serializeSubSpec = serializeSubSpec;
const serializeTermSet = (termSet) => {
    if (termSet instanceof UnarySubTermSet) {
        return (0, exports.serializeUnarySubTermSet)(termSet);
    }
    else {
        return (0, exports.serializeBinarySubTermSet)(termSet);
    }
};
exports.serializeTermSet = serializeTermSet;
const serializeBinarySubTermSet = (termSet) => {
    const { leftHand, operator, rightHand } = termSet;
    return (0, exports.serializeTerm)(leftHand) + binOpString(operator) + (0, exports.serializeTerm)(rightHand);
};
exports.serializeBinarySubTermSet = serializeBinarySubTermSet;
const serializeUnarySubTermSet = (termSet) => {
    const { operator, rightHand } = termSet;
    return unOpString(operator) + (0, exports.serializeTerm)(rightHand);
};
exports.serializeUnarySubTermSet = serializeUnarySubTermSet;
const serializeTerm = (term) => {
    if (term instanceof FieldSpec) {
        return (0, exports.serializeFieldSpec)(term);
    }
    if (term instanceof SubfieldSpec) {
        return (0, exports.serializeSubfieldSpec)(term);
    }
    if (term instanceof IndicatorSpec) {
        return (0, exports.serializeIndicatorSpec)(term);
    }
    if (term instanceof AbbrFieldSpec) {
        return (0, exports.serializeAbbrFieldSpec)(term);
    }
    if (term instanceof AbbrIndicatorSpec) {
        return (0, exports.serializeAbbrIndicatorSpec)(term);
    }
    if (term instanceof AbbrSubfieldSpec) {
        return (0, exports.serializeAbbrSubfieldSpec)(term);
    }
    const { theString, syntaxType } = term;
    if (syntaxType === "'") {
        return "'" + theString.replace(escapeSingleQuoteCompStringRe, '\\$&') + "'";
    }
    else if (syntaxType === '"') {
        return '"' + theString.replace(escapeDoubleQuoteCompStringRe, '\\$&') + '"';
    }
    const s0 = theString.replace(escapeCompStringRe, '\\$&');
    const s1 = s0.replace(/ /g, '\\s');
    return '\\' + s1;
};
exports.serializeTerm = serializeTerm;
