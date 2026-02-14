# Git Hooks for Security

This directory contains git hooks to prevent committing sensitive data.

## Pre-Commit Hook

The pre-commit hook checks for:
- AWS Account IDs (12-digit numbers)
- ARNs containing account IDs
- Bucket names with account suffixes
- Cognito User Pool IDs
- Cognito Identity Pool IDs
- Job ID timestamps

## Installation

Run the installer script:

```bash
./scripts/install-git-hooks.sh
```

This copies `scripts/pre-commit-hook.sh` to `.git/hooks/pre-commit`.

## Manual Installation

```bash
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Testing the Hook

Try committing a file with a 12-digit number:

```bash
echo "Account: 123456789012" > test.txt
git add test.txt
git commit -m "test"
# Should be blocked
```

## Bypassing the Hook

If you need to bypass (not recommended):

```bash
git commit --no-verify
```

## Why Not Committed?

The `.git/hooks/` directory is not tracked by git. Each developer must install the hooks locally using the installer script.

## Updating the Hook

1. Edit `scripts/pre-commit-hook.sh`
2. Commit the changes
3. Run `./scripts/install-git-hooks.sh` to update your local hook
4. Other developers should pull and re-run the installer
