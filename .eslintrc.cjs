module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:storybook/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Keep type-only imports as `import type` — matches tsconfig's
    // verbatimModuleSyntax, which errors on unmarked type imports at build.
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-restricted-syntax': [
      'error',
      {
        // Scoped to JSX (JSXExpressionContainer covers both children and
        // attribute values) and to ternaries whose *both* branches are
        // literal/template strings — this is what "duplicated inline Urdu
        // string" looks like. Language-attribute ternaries like
        // `lang={lang === 'ur' ? 'ur' : undefined}` and data-field
        // selection like `lang === 'ur' ? tour.titleUr : tour.title` don't
        // match (their alternate/consequent isn't a plain literal), so
        // they're unaffected. See docs/planning/URDU_IMPLEMENTATION_PLAN.md Phase 5.
        selector:
          "JSXExpressionContainer > ConditionalExpression[test.type='BinaryExpression'][test.operator='==='][test.right.value='ur']:matches([consequent.type='Literal'],[consequent.type='TemplateLiteral']):matches([alternate.type='Literal'],[alternate.type='TemplateLiteral'])",
        message:
          "Don't inline a lang === 'ur' ? '…' : '…' text ternary — add a key to src/lib/i18n/uiStrings.ts and call t()/tFn() instead.",
      },
    ],
  },
};
