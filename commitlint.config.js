/**
 * Commit message rules, enforced by the commit-msg hook.
 *
 * These mirror CONTRIBUTING.md section 2 exactly. The module grades individual
 * contribution from the commit history, so a rejected commit here is cheaper
 * than an unreadable history at submission.
 *
 * A ClickUp id at the end of the subject, for example
 * "feat(donation): add listing form (CU-86eyknr1q)", passes as normal text.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'donation',
        'request',
        'delivery',
        'driver',
        'admin',
        'auth',
        'db',
        'api',
        'ui',
        'config',
      ],
    ],
    // A scope is required. Without one it is much harder to see at a glance
    // which module a commit belongs to.
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
  },
};
