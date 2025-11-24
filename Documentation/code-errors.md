# File to note errors in the project, if and when required

(fileops) anan@Manan-PC:/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui$ rm -rf node_modules package-lock.json
(fileops) anan@Manan-PC:/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui$ nvm install 20 && nvm use 20
v20.19.5 is already installed.
Now using node v20.19.5 (npm v10.8.2)
Now using node v20.19.5 (npm v10.8.2)
(fileops) anan@Manan-PC:/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui$ npm install

added 506 packages, and audited 507 packages in 55s

92 packages are looking for funding
  run `npm fund` for details

6 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
(fileops) anan@Manan-PC:/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui$ npm run dev -- --host 0.0.0.0 --port 5173

> neura-ui@0.0.0 dev
> vite --host 0.0.0.0 --port 5173


  VITE v7.2.4  ready in 464 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://10.255.255.254:5173/
  ➜  Network: http://172.29.7.110:5173/
  ➜  press h + enter to show help
node:internal/fs/promises:639
  return new FileHandle(await PromisePrototypeThen(
                        ^

Error: ENOENT: no such file or directory, open '/@fs/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui/node_modules/react/index.js'
    at async open (node:internal/fs/promises:639:25)
    at async Object.readFile (node:internal/fs/promises:1246:14)
    at async extractExportsData (file:///mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui/node_modules/vite/dist/node/chunks/config.js:32918:23) {        
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/@fs/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui/node_modules/react/index.js'
}

Node.js v20.19.5
(fileops) anan@Manan-PC:/mnt/d/Cursor/FileOps-AddingDatasetActions/code/neura-ui$