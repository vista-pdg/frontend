<!-- vista-dev-workflow:start -->
## UI refinement

Read [dev-workflow instructions](<../dev-workflow/AGENTS.md>) before working on VISTA.
Load its UI refinement section for frontend changes, including pen updates before every UI change.
Repository skills are exposed in .agents/skills; their canonical sources live in dev-workflow.
<!-- vista-dev-workflow:end -->

## Feedback and confirmations

Use `components/ui/confirmation-dialog.tsx` for destructive confirmations and
`components/ui/alert.tsx` for operation success/errors. Keep field validation beside inputs.
Use `components/ui/modal.tsx` for form dialogs. Preserve focus, keyboard access, pending/error
states and the existing theme tokens. Never use browser `alert`, `confirm`, or `prompt`;
ESLint checks both global calls and `window`/`globalThis` calls.
