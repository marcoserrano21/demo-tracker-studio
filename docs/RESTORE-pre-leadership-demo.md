# Restore point: before leadership demo merge (2026-11-08)

Production `main` was tagged before [PR #1](https://github.com/marcoserrano21/demo-tracker-studio/pull/1) merged.

| Item | Value |
|------|--------|
| Git tag | `restore/pre-leadership-demo-merge-2026-11-08` |
| Commit | `35b2bba174e1a728578b444c2d907153bd3bf4cf` |
| Merge commit (after leadership demo) | `b9a030695b09bc55c7783f2d844697ec2084a416` |

## Roll back code (Git)

```bash
git checkout main
git reset --hard restore/pre-leadership-demo-merge-2026-11-08
git push origin main --force-with-lease
```

Vercel will deploy the rolled-back `main` automatically if production tracks GitHub `main`.

## Roll back code (revert merge, no force-push)

```bash
git checkout main
git pull
git revert -m 1 b9a030695b09bc55c7783f2d844697ec2084a416
git push origin main
```

## Vercel production

If you prefer the dashboard: Vercel → **demo-tracker-studio** → Deployments → promote the deployment built from `35b2bba` (pre-merge) instead of force-pushing.
