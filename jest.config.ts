import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
    transformIgnorePatterns: ["\\.pnp\\.[^\\\/]+$"],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    testEnvironment: 'node',
    testRegex: "/__tests__/.*[jt]s?(x)?"
};

export default jestConfig;
