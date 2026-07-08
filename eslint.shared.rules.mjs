/** @type {import('eslint').Linter.RulesRecord} */
export const stylisticRules = {
  '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/linebreak-style': ['error', 'unix'],
  '@stylistic/no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
  '@stylistic/member-delimiter-style': [
    'error',
    {
      multiline: {
        delimiter: 'semi',
        requireLast: true,
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
      multilineDetection: 'brackets',
    },
  ],
  '@stylistic/operator-linebreak': [
    'error',
    'after',
    {
      overrides: {
        '?': 'before',
        ':': 'before',
      },
    },
  ],
  '@stylistic/semi': ['error', 'always'],
};

/** @type {import('eslint').Linter.RulesRecord} */
export const typescriptTypedRules = {
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/naming-convention': [
    'warn',
    {
      selector: 'default',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
    },
    {
      selector: 'variable',
      format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
      leadingUnderscore: 'allow',
    },
    {
      selector: 'function',
      format: ['camelCase', 'PascalCase'],
    },
    {
      selector: 'enum',
      format: ['UPPER_CASE'],
    },
    {
      selector: 'typeAlias',
      format: ['PascalCase', 'UPPER_CASE'],
    },
    {
      selector: 'typeLike',
      format: ['PascalCase'],
    },
    {
      selector: 'parameter',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
    },
    {
      selector: ['property', 'objectLiteralProperty', 'objectLiteralMethod', 'enumMember'],
      format: null,
    },
    {
      selector: 'import',
      format: null,
    },
  ],
};

/** @type {import('eslint').Linter.RulesRecord} */
export const javascriptRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'none',
    },
  ],
  'max-params': ['error', 4],
  'no-console': 'warn',
  'no-debugger': 1,
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.property.name=\'then\']',
      message: 'Use async/await instead of Promise.then()',
    },
    {
      selector: 'CallExpression[callee.property.name=\'catch\']',
      message: 'Use try/catch with await instead of Promise.catch()',
    },
    {
      selector: 'CallExpression[callee.property.name=\'finally\']',
      message: 'Use finally within try/catch/finally, not Promise.finally()',
    },
  ],
  quotes: ['error', 'single'],
  semi: ['error', 'always'],
};

/** @type {import('eslint').Linter.RulesRecord} */
export const typescriptRules = {
  ...typescriptTypedRules,
  ...javascriptRules,
};

/** @type {import('eslint').Linter.RulesRecord} */
export const vueRules = {
  'vue/html-self-closing': [
    'error',
    {
      html: {
        void: 'never',
        normal: 'never',
        component: 'always',
      },
      svg: 'always',
      math: 'always',
    },
  ],
  'vue/component-name-in-template-casing': [
    'error',
    'PascalCase',
    {
      registeredComponentsOnly: false,
    },
  ],
  'vue/html-indent': [
    'error',
    2,
    {
      attribute: 1,
      baseIndent: 1,
      closeBracket: 0,
      alignAttributesVertically: true,
    },
  ],
  'vue/max-attributes-per-line': [
    'error',
    {
      singleline: 4,
      multiline: 1,
    },
  ],
  'vue/object-property-newline': [
    'error',
    {
      allowAllPropertiesOnSameLine: true,
    },
  ],
  'vue/operator-linebreak': ['off'],
  'vue/quote-props': ['error', 'as-needed'],
  'vue/singleline-html-element-content-newline': ['off'],
  'vue/valid-v-slot': ['error', { allowModifiers: true }],
  'vue/max-len': [
    'error',
    {
      code: 120,
      ignoreUrls: true,
      ignoreHTMLAttributeValues: true,
    },
  ],
};
