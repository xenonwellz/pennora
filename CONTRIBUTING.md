# Contributing to Pennora

Thank you for your interest in contributing to Pennora! This guide covers local setup, conventions, and how to submit changes.

## License

By contributing to this repository, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE), the same license that covers the project.

## Code of conduct

Be respectful and constructive. Focus on the problem, not the person. We want Pennora to be welcoming to contributors of all experience levels.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- Git

### Fork and clone

```bash
git clone https://github.com/<your-username>/pennora.git
cd pennora
bun install
```

### Environment

```bash
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` to a random string of at least 32 characters. Leave OAuth and email variables empty unless you are testing those features.

### Run in development

```bash
bun run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001

### Verify your changes

Before opening a pull request, run:

```bash
bun run typecheck
bun run build
```

If you changed database schema:

```bash
bun run db:generate
bun run db:push
```

## Project layout

| Path | Purpose |
|------|---------|
| `apps/web/src/routes/` | TanStack Router pages |
| `apps/web/src/components/` | UI components |
| `apps/web/src/lib/` | Client utilities, queries, auth |
| `apps/server/src/orpc/` | API procedures (oRPC) |
| `apps/server/src/services/` | Business logic |
| `apps/server/src/repos/` | Database access |
| `apps/server/src/db/` | Drizzle schema and migrations |
| `packages/shared/` | Types and helpers shared across apps |

## Coding guidelines

### TypeScript

- Prefer explicit types at module boundaries (API inputs/outputs, shared package).
- Use the existing patterns in nearby files — match naming, imports, and component structure.
- Run `bun run typecheck` before submitting.

### Frontend

- Use Tailwind utility classes; design tokens live in `apps/web/src/index.css`.
- Reuse shadcn/ui and existing components (`PanelCard`, `Button`, etc.) before adding new primitives.
- Keep mobile layouts in mind: test narrow viewports; use card layouts instead of tables on small screens where appropriate.
- Route files live in `apps/web/src/routes/` and are file-based via TanStack Router.

### Backend

- Add API logic in `services/`, keep `orpc/procedures/` thin.
- Database changes require a Drizzle migration (`bun run db:generate`).
- Never commit secrets or `.env` files.

### Commits

Write clear commit messages in the imperative mood:

```
Add category filter to budget page
Fix income toggle on completed months
```

Keep commits focused — one logical change per commit when possible.

## Pull request process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** and verify locally (`typecheck`, `build`, manual testing).

3. **Push** to your fork:
   ```bash
   git push -u origin feat/my-feature
   ```

4. **Open a pull request** against `xenonwellz/pennora` on GitHub.

5. **Describe your PR**:
   - What problem does it solve?
   - How did you test it?
   - Screenshots for UI changes (especially mobile)

6. **Address review feedback** — maintainers may request changes before merging.

## Reporting bugs

Open a [GitHub issue](https://github.com/xenonwellz/pennora/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS (for frontend issues)
- Relevant logs (redact secrets)

## Feature requests

Open an issue describing the use case and proposed behavior. Discussion before large features helps avoid wasted effort.

## Security

Do **not** open public issues for security vulnerabilities. Report them privately to the repository owner.

## Questions?

Open a GitHub Discussion or issue if something in this guide is unclear — we'll improve the docs based on your feedback.
