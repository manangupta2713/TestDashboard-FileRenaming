# Git Workflow Cheat Sheet

## Before You Start
1. Open a terminal in the project folder (e.g., `/mnt/d/Cursor/FileOps`).
2. Run `git status` to see if Git is tracking the repo and check current changes.

---

## 1. Create a Feature Branch
1. `git checkout main` – go to the base branch.
2. `git pull` – update it so you start from the latest version.
3. `git checkout -b feature/my-cool-change` – create and switch to a descriptive branch.

---

## 2. Make Changes & Commit
1. Edit files, run tests, etc.
2. `git status` – see modified files.
3. `git add path/to/file` (repeat per file) or `git add .` if you trust everything.
4. `git commit -m "Clear change description"` – save the snapshot.
   - Example: `git commit -m "Add auto-step assignment to OpsConsole"`.

---

## 3. Push Your Branch
1. `git push -u origin feature/my-cool-change`
   - `origin` is the remote (GitHub/GitLab/etc.).
   - `-u` links your local branch with the remote; next time you can just run `git push`.

Now you can open a Pull Request on the remote if needed.

---

## 4. Merge Back to Main
1. `git checkout main`
2. `git pull` – update main.
3. `git merge feature/my-cool-change`
   - Resolve conflicts if Git reports any.
   - Run tests to confirm everything still works.
4. `git push origin main`

(If you merge via a PR on GitHub, just `git pull` on main afterwards to sync.)

---

## 5. Clean Up
- Delete the local branch if you don’t need it: `git branch -d feature/my-cool-change`
- Delete the remote branch if desired: `git push origin --delete feature/my-cool-change`

---

## Tips
- Run `git status` often to stay aware of staged/unstaged files.
- Use `git diff path/to/file` to see what changed.
- Keep branch names and commit messages descriptive.
- Use separate branches for different features/experiments so main stays clean.
