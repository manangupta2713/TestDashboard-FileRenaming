# Human-Friendly Launch Guide

This checklist walks through everything from opening WSL to running the backend and frontend. Follow each mini-block in order. If something fails, re-run the last command and read the error text before moving on.

## 1. Open WSL
1. Press the Windows key, type `Terminal`, then choose **Windows Terminal** (or **Command Prompt** if you prefer).
2. In the terminal window, type `wsl` and press Enter. After a moment you should see a Linux-style prompt such as `user@machine:/home/user$`.

## 2. Move into the project folder
Run the following command exactly (the path already points to the repo you’re working in):
```
cd /mnt/d/Cursor/FileOps
```

## 3. Create the Python virtual environment (first time only)
If you have never set up the environment on this machine, run:
```
python3 -m venv .venv
```
You can skip this step on later visits if the `.venv` folder already exists.

## 4. Activate the virtual environment
Turn the environment on so Python uses local packages:
```
source .venv/bin/activate
```
Your prompt should now show `(.venv)` at the start. Keep this terminal open; it will run the backend.

## 5. Install Python dependencies (first time after creating the venv)
Still inside the activated venv, install backend packages:
```
pip install -r requirements.txt   # or: pip install -e .
```
Use whichever command your team normally uses. If `requirements.txt` is missing, run `pip install -e .` to install from `pyproject.toml`.

## 6. Launch the FastAPI backend
1. Stay in the same backend terminal.
2. Start the server:
   ```
   uvicorn Option_C-Max-API:app --reload
   ```
3. Leave this terminal running. FastAPI will listen on `http://127.0.0.1:8000` and auto-reload when you edit Python files.

## 7. Launch the React frontend (new terminal)
Open a **second** terminal window (repeat steps 1–2 above to enter WSL) and do the following:
```
cd /mnt/d/Cursor/FileOps/neura-ui
npm install            # only on the first run
npm run dev -- --host 127.0.0.1 --port 5173
```
Vite will print a local URL (usually `http://127.0.0.1:5173`). Keep this terminal open so the UI keeps running.

## 8. Verify everything is connected
1. In your web browser, open the printed Vite URL.
2. Use the UI to paste a folder path and click **Check & Load**.
3. If the backend is running correctly, the page will show how many files were found. If you see an error about connecting to the API, make sure the FastAPI terminal is still running without errors.

## 9. Shutting down
When you finish, press `Ctrl+C` inside each terminal window to stop the servers, then close the windows. To restart work later, begin again at Step 1 (skip the creation/install steps if the environment is already set up).
