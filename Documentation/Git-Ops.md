# Git Workflow Cheat Sheet

Simple, copy‑paste ready steps for both branch-only work and Git worktrees.

---

## Before You Start
1. Open a terminal in the repo folder (`/mnt/d/Cursor/FileOps`).
2. Run `git status` so you know the current branch and whether there are uncommitted files.

---

## Classic Branch Flow (single working tree)
Follow this when you only need one checkout at a time.

### 1. Create a feature branch
1. `git checkout main`
2. `git pull`
3. `git checkout -b feature/my-change`

### 2. Make changes & commit
1. Edit files, run tests locally.
2. `git status`
3. `git add path/to/file` (repeat as needed) or `git add .`
4. `git commit -m "Brief summary of the change"`

### 3. Push the branch
`git push -u origin feature/my-change`

### 4. Merge back to main
1. `git checkout main`
2. `git pull`
3. `git merge feature/my-change`
4. Resolve conflicts if any, test, then `git push origin main`

### 5. Clean up
- Local branch: `git branch -d feature/my-change`
- Remote branch (optional): `git push origin --delete feature/my-change`

---

## Why/When to Use Git Worktrees
- Worktrees let you check out multiple branches at once in separate folders.
- Ideal when you need to keep `main` running (for quick fixes) while building a large feature elsewhere.
- Each worktree has its own directory but shares the same `.git` database, so no duplicate clone is needed.

---

## Quick Start: Create a Worktree
Assume the main repo lives at `/mnt/d/Cursor/FileOps`.

1. From the root repo folder run:
   ```
   git worktree add ../FileOps-featureA feature/featureA
   ```
   - `../FileOps-featureA` is the folder that will hold the new checkout.
   - `feature/featureA` is the branch name (Git will create it if it doesn’t exist).
2. Move into the new folder:
   ```
   cd ../FileOps-featureA
   ```
3. Confirm you’re on the expected branch: `git status`.
4. Work normally (edit files, commit, push). All Git commands run inside the worktree folder affect that branch only.

---

## Managing Multiple Worktrees
- List all worktrees:
  ```
  git worktree list
  ```
- Remove a worktree once merged:
  1. Make sure the branch has no unpushed commits.
  2. In any repo/worktree folder run:
     ```
     git worktree remove ../FileOps-featureA
     ```
     (Replace with the actual folder path.)

---

## Typical Session With Worktrees
1. Keep `/mnt/d/Cursor/FileOps` for `main` so you can pull and fix emergencies fast.
2. Create `../FileOps-featureA` for feature work (`git worktree add ...` as shown above).
3. If you need a second feature simultaneously, run another `git worktree add ../FileOps-featureB feature/featureB`.
4. Each worktree gets its own terminal windows, Python env, etc., so commands never clash.

---

## Helpful Reminders
- Always run `git status` before switching to another terminal so you know whether there are staged files.
- Push worktree branches the same way: `git push -u origin feature/featureA`.
- When done, delete both the worktree folder and branch to keep things tidy.
- Worktrees share dependencies. If you run `npm install` or set up `.venv` inside one, the others may need their own install steps if they sit outside the original repo folder—plan disk space accordingly.
