import { Lexer, Token, TokenPosition } from 'typescript-parsec';

class CharToken implements Token<string> {

    public readonly kind = '0';

    public readonly keep = true;

    constructor(
        private readonly lexer: CharLexer,
        private readonly input: string,
        public text: string,
        public pos: TokenPosition
    ) {
    }

    public get next(): Token<string> | undefined {
        return this.lexer.parseNext(this.input, this.pos.index + 1, this.pos.rowEnd, this.pos.columnEnd);
    }

}

class CharLexer implements Lexer<string> {
    public parse(input: string): Token<string> | undefined {
        return this.parseNext(input, 0, 1, 1);
    }
    public parseNext(input: string, indexStart: number, rowBegin: number, columnBegin: number): CharToken | undefined {
        if (indexStart >= input.length) {
            return undefined;
        }
        const c = input.charAt(indexStart);
        const rowEnd = rowBegin + (c === '\n' ? 1 : 0);
        const columnEnd = (c === '\n' ? 1 : columnBegin + 1);
        return new CharToken(this, input, c, {
            index: indexStart, rowBegin, columnBegin, rowEnd, columnEnd
        });
    }
}

class TakeWhileToken<T> implements Token<T> {


    constructor(
        private readonly lexer: TakeWhileLexer<T>,
        public readonly text: string,
        public readonly kind: T,
        public pos: TokenPosition
    ) {
    }

    public get next(): Token<T> {
        return this.lexer.parseNext();
    }

}

class TakeWhileLexer<T> implements Lexer<T> {

    private nextChar: Token<string> | undefined;

    constructor(
        private readonly classifiers: [(character: string) => T | undefined],
        private readonly errormessage: string
    ) {
    }

    public parse(input: string): Token<T> | undefined {
        const charLexer = new CharLexer();
        this.nextChar = charLexer.parse(input);
        return this.parseNext();
    }

    public parseNext(): Token<T> | undefined {
        if (this.nextChar === undefined) {
            return undefined;
        }
        let classifyer = undefined;
        let text = "";
        let token = undefined;
        const first = this.nextChar;
        let last = this.nextChar;
        for (const cl of this.classifiers) {
            const c = this.nextChar.text;
            const t = cl(c);
            if (t !== undefined) {
                token = t;
                classifyer = cl;
                text += c;
                this.nextChar = this.nextChar.next;
                break;
            }
        }

        if (classifyer === undefined) {
            throw new Error(this.errormessage);
        }

        while (true) {
            if (this.nextChar === undefined) {
                break;
            }
            const c = this.nextChar.text;
            const t = classifyer(c);
            if (t === undefined) {
                break;
            }
            text += c;
            token = t;
            last = this.nextChar;
        }

        const index = first.pos.index;
        const rowBegin = first.pos.rowBegin;
        const rowEnd = last.pos.rowEnd;
        const columnBegin = first.pos.columnBegin;
        const columnEnd = last.pos.columnEnd;
        return new TakeWhileToken(this, text, token, { index, rowBegin, rowEnd, columnBegin, columnEnd });
    }
}

export { CharToken, CharLexer, TakeWhileToken, TakeWhileLexer };
