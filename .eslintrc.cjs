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
  overrides: [
    {
      /* Scoped to app source. The e2e specs legitimately parameterise over
         languages — `for (const lang of ['en','ur'])` and `lang === 'ur' ? …`
         inside a test are describing the two editions under test, not branching
         product behaviour, and forcing them through the registry helpers would
         make the tests agree with the code by construction. */
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      excludedFiles: ['src/**/__tests__/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            /*
             * Any comparison against a language literal, anywhere.
             *
             * 55 of these existed (measured 24 August 2026) and they were asking four
             * different questions — is this RTL, should numerals be Eastern, does this
             * need the Nastaliq stack, is there a translation for this datum. Every one
             * was correct and about half go silently wrong the moment a second RTL
             * language exists, because nothing distinguishes "RTL" from "Urdu
             * specifically". 39 are now `isRtlLang` / `usesEasternNumerals` /
             * `usesLatinScript` / a `Record<Lang, …>`; see
             * docs/planning/LANGUAGE_LAYER_2026-08-24.md.
             *
             * The 16 that remain are genuinely Urdu-specific and each carries an
             * `eslint-disable-next-line` naming the reason — almost always that the
             * *data* has an `Ur`-suffixed sibling field or sheet column rather than a
             * per-language record. That is a data migration, not a refactor, so the
             * rule's job is to stop new ones appearing unexamined rather than to force
             * the last 16 through a conversion that would be a lie.
             */
            selector:
              "BinaryExpression[operator=/^(===|!==)$/][right.value='ur'][left.name='lang']",
            message:
              "Don't compare a language against 'ur'. Ask what you mean: isRtlLang(), usesEasternNumerals(), usesLatinScript(), needsNastaliq(), or a Record<Lang, …> lookup — all in src/lib/i18n/languages.ts. If the datum genuinely only exists in Urdu (an `Ur` sibling field or sheet column), add an eslint-disable-next-line saying so.",
          },
        ],
      },
    },
  ],
};
