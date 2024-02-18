import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest',
    transformIgnorePatterns: ["\\.pnp\\.[^\\\/]+$"],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: "tsconfig-jest.json"
            },
        ],
    },
    testEnvironment: 'node',
    testRegex: "/__tests__/.*[jt]s?(x)?",
    modulePaths: ["node_modules"]
};

export default jestConfig;
