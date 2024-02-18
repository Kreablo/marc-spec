import { Parser, ParseError } from 'typescript-parsec';
import { KLexer } from '@kreablo/k-lexer';
export declare enum TokenType {
    COMPARISON_STRING = 0,
    COMPARISON_STRING_SINGLE_QUOTED = 1,
    COMPARISON_STRING_DOUBLE_QUOTED = 2,
    INTEGER = 3,
    ZERO = 4,
    POSITIVE_DIGIT = 5,
    POSITIVE_INTEGER = 6,
    FIELD_TAG = 7,
    HASH = 8,
    RANGE_MARK = 9,
    BEGIN_SUBSPEC = 10,
    END_SUBSPEC = 11,
    BEGIN_INDEX = 12,
    END_INDEX = 13,
    BEGIN_CHARACTER = 14,
    SUBFIELD_MARKER = 15,
    SUBFIELD_CHAR = 16,
    SUBTERM_SEPARATOR = 17,
    INDICATOR_MARKER = 18,
    INDICATOR = 19,
    BEGIN_COMPARISON = 20,
    BINARY_OPERATOR = 21,
    UNARY_OPERATOR = 22
}
export type Position = number | '#';
export type CompStringSyntax = '"' | "'" | '\\';
export type Range = {
    start: Position;
    end: Position;
};
export declare class CharacterSpec {
    readonly item: Range | Position;
    constructor(item: Range | Position);
}
export declare class IndexSpec {
    readonly item: Range | Position;
    constructor(item: Range | Position);
}
export declare class ItemSpec {
    readonly tag: string;
    readonly index: IndexSpec | undefined;
    readonly subSpec: SubTermSet[][];
    constructor(tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]);
}
export declare class AbbrSpec {
    readonly index: IndexSpec | undefined;
    constructor(index: IndexSpec | undefined);
}
export type SubTermSet = BinarySubTermSet | UnarySubTermSet;
export declare class FieldSpec extends ItemSpec {
    readonly characterSpec: CharacterSpec | undefined;
    constructor(tag: string, index: IndexSpec | undefined, characterSpec: CharacterSpec | undefined, subSpec: SubTermSet[][]);
}
export declare class AbbrFieldSpec extends AbbrSpec {
    readonly characterSpec: CharacterSpec | undefined;
    constructor(index: IndexSpec | undefined, characterSpec: CharacterSpec | undefined);
}
export declare class SubfieldCode {
    readonly start: string;
    readonly end: string;
    constructor(start: string, end: string);
}
export declare class SubfieldSpec extends ItemSpec {
    readonly code: SubfieldCode;
    readonly subindex: IndexSpec | undefined;
    readonly characterSpec: CharacterSpec | undefined;
    constructor(tag: string, index: IndexSpec | undefined, code: SubfieldCode, subindex: IndexSpec | undefined, characterSpec: CharacterSpec | undefined, subSpec: SubTermSet[][]);
}
export declare class AbbrSubfieldSpec extends AbbrSpec {
    readonly code: SubfieldCode;
    readonly subindex: IndexSpec | undefined;
    readonly characterSpec: CharacterSpec | undefined;
    constructor(index: IndexSpec | undefined, code: SubfieldCode, subindex: IndexSpec | undefined, characterSpec: CharacterSpec | undefined);
}
export declare class IndicatorSpec extends ItemSpec {
    readonly indicator: number;
    constructor(tag: string, indicator: number, index: IndexSpec | undefined, subSpec: SubTermSet[][]);
}
export declare class AbbrIndicatorSpec extends AbbrSpec {
    readonly indicator: number;
    constructor(indicator: number, index: IndexSpec | undefined);
}
export declare class ComparisonString {
    readonly theString: string;
    readonly syntaxType: CompStringSyntax;
    constructor(compString: string, syntaxType: CompStringSyntax);
}
export type BinarySubTerm = FieldSpec | SubfieldSpec | IndicatorSpec | AbbrFieldSpec | AbbrSubfieldSpec | AbbrIndicatorSpec | ComparisonString;
export type UnarySubTerm = FieldSpec | SubfieldSpec | IndicatorSpec | AbbrFieldSpec | AbbrSubfieldSpec | AbbrIndicatorSpec;
export declare enum BinaryOperator {
    EQUALS = 0,
    NOT_EQUALS = 1,
    INCLUDES = 2,
    DOES_NOT_INCLUDE = 3
}
export declare enum UnaryOperator {
    EXISTS = 0,
    DOES_NOT_EXIST = 1
}
export declare class BinarySubTermSet {
    readonly leftHand: BinarySubTerm;
    readonly operator: BinaryOperator;
    readonly rightHand: BinarySubTerm;
    constructor(leftHand: BinarySubTerm, operator: BinaryOperator, rightHand: BinarySubTerm);
}
export declare class UnarySubTermSet {
    readonly operator: UnaryOperator | undefined;
    readonly rightHand: UnarySubTerm;
    constructor(operator: UnaryOperator | undefined, rightHand: UnarySubTerm);
}
export declare class MARCSpec {
    readonly spec: FieldSpec | SubfieldSpec | IndicatorSpec;
    constructor(spec: FieldSpec | SubfieldSpec | IndicatorSpec);
}
export type Indicator = 1 | 2;
export declare enum Context {
    POSITION1 = 0,
    POSITION2 = 1,
    SUBFIELD = 2,
    COMPARISON_STRING = 3,
    INDICATOR = 4,
    TOP = 5
}
export declare const newMarcSpecLexer: () => KLexer<TokenType>;
export declare const positiveInteger: Parser<TokenType, number>;
export declare const position: Parser<TokenType, Position>;
export declare const rangeOrPosition: Parser<TokenType, Range | Position>;
export declare const characterSpec: Parser<TokenType, CharacterSpec>;
export declare const index: Parser<TokenType, IndexSpec>;
export declare const indicatorSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => IndicatorSpec>;
export declare const abbrIndicatorSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrIndicatorSpec>;
export declare const fieldSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => FieldSpec>;
export declare const abbrFieldSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrFieldSpec>;
export declare const subfieldCode: Parser<TokenType, SubfieldCode>;
export declare const abbrSubfieldSpec: Parser<TokenType, (index: IndexSpec | undefined) => AbbrSubfieldSpec>;
export declare const subfieldSpec: Parser<TokenType, (tag: string, index: IndexSpec | undefined, subSpec: SubTermSet[][]) => SubfieldSpec>;
export declare const abbreviation: Parser<TokenType, AbbrSubfieldSpec | AbbrFieldSpec | AbbrIndicatorSpec>;
export declare const fullSpec: Parser<TokenType, (subSpec: SubTermSet[][]) => SubfieldSpec | FieldSpec | IndicatorSpec>;
export declare const comparisonString: Parser<TokenType, ComparisonString>;
export declare const unarySubTerm: Parser<TokenType, UnarySubTerm>;
export declare const binarySubTerm: Parser<TokenType, BinarySubTerm>;
export declare const subTermSet: Parser<TokenType, (outerSpec: BinarySubTerm) => SubTermSet>;
export declare const subOrSpec: Parser<TokenType, ((outerSpec: BinarySubTerm) => SubTermSet)[]>;
export declare const subAndSpec: Parser<TokenType, ((outerSpec: BinarySubTerm) => SubTermSet)[][]>;
export declare const marcSpec: Parser<TokenType, MARCSpec>;
export declare const parseMarcSpec: (input: string) => ParseError | MARCSpec;
export declare const serializeMarcSpec: (marcSpec: MARCSpec) => string;
export declare const serializeFieldSpec: (fieldSpec: FieldSpec) => string;
export declare const serializeAbbrFieldSpec: (fieldSpec: AbbrFieldSpec) => string;
export declare const serializeIndicatorSpec: (indicatorSpec: IndicatorSpec) => string;
export declare const serializeAbbrIndicatorSpec: (indicatorSpec: AbbrIndicatorSpec) => string;
export declare const serializeSubfieldSpec: (subfieldSpec: SubfieldSpec) => string;
export declare const serializeAbbrSubfieldSpec: (subfieldSpec: AbbrSubfieldSpec) => string;
export declare const serializeIndex: (index: IndexSpec | undefined) => string;
export declare const serializeCharacterSpec: (charSpec: CharacterSpec | undefined) => string;
export declare const serializeCode: (code: SubfieldCode) => string;
export declare const serializeSubSpec: (subSpec: SubTermSet[][]) => string;
export declare const serializeTermSet: (termSet: SubTermSet) => string;
export declare const serializeBinarySubTermSet: (termSet: BinarySubTermSet) => string;
export declare const serializeUnarySubTermSet: (termSet: UnarySubTermSet) => string;
export declare const serializeTerm: (term: BinarySubTerm) => string;
