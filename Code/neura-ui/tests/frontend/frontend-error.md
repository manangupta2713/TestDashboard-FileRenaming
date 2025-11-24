# File to note errors during frontend testing, if and when required


 RUN  v2.1.9 D:/Cursor/FileOps-AddingDatasetActions/Code/neura-ui
      Coverage enabled with v8

stderr | tests/frontend/OpsConsole.preview.test.jsx > OpsConsole preview + selective run > shows a preview error when the backend returns 404
{ response: { status: 404 } }

stderr | tests/frontend/OpsConsole.preview.test.jsx > OpsConsole preview + selective run > shows a run error when the backend rejects the rename
{ response: { status: 404 } }

 ✓ tests/frontend/App.test.jsx (2) 1416ms
 ✓ tests/frontend/configs.test.js (2)
 ✓ tests/frontend/DatasetActionsDashboard.test.jsx (7) 14702ms
 ✓ tests/frontend/main.test.jsx (1)
 ✓ tests/frontend/OpsConsole.operations.test.jsx (2) 870ms
 ❯ tests/frontend/OpsConsole.preview.test.jsx (9) 7989ms
   ❯ OpsConsole preview + selective run (9) 7989ms
     × requires a loaded folder before previewing or running 1266ms
     × requires at least one configured operation before running 1468ms
     ✓ allows deselecting preview rows and forwards include_files to run 882ms
     ✓ supports toggling the select-all checkbox 793ms
     ✓ blocks the run when every preview row is deselected 853ms
     ✓ shows a preview error when the backend returns 404 617ms
     ✓ shows a run error when the backend rejects the rename 729ms
     ✓ reports run success for selected files when backend omits summary 729ms
     ✓ runs without preview and reports generic success 652ms
 ✓ tests/frontend/OpsConsole.workspace.test.jsx (2) 548ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/frontend/OpsConsole.preview.test.jsx > OpsConsole preview + selective run > requires a loaded folder before previewing or running
TestingLibraryElementError: Unable to find an element with the text: /Select and load a valid folder first/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

Ignored nodes: comments, script, style
<body>
  <div>
    <div
      class="relative"
    >
      <div
        class="relative h-full w-full"
        style="opacity: 1; transform: none;"
      >
        <div
          class="relative z-10 rounded-card overflow-visible
                    bg-nm_panel backdrop-blur-3xl
                    border border-white/7"
          style="box-shadow: 0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28); transform: none;"
        >
          <div
            class="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8"
          >
            <section
              class="space-y-4"
            >
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h2
                    class="text-base md:text-lg font-semibold text-slate-50"
                  >
                    Workspace
                  </h2>
                  <p
                    class="text-[11px] md:text-xs text-slate-300 mt-1"
                  >
                    Copy a folder path from Explorer, then validate it against the backend.
                  </p>
                </div>
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <button
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                               bg-black/45 border border-white/15
                               text-[11px] font-medium text-slate-100
                               hover:bg-black/70 hover:border-nm_teal/70 hover:text-nm_teal
                               shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                    tabindex="0"
                    type="button"
                  >
                    <span>
                      📋
                    </span>
                    <span>
                      Use clipboard
                    </span>
                  </button>
                  <button
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold
                      bg-gradient-to-r from-[#FFC1EB] via-nm_pink to-[#FF5FB6] text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                    tabindex="0"
                    type="button"
                  >
                    Check & Load
                  </button>
                </div>
              </div>
              <div
                class="space-y-1"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <input
                    class="flex-1 text-xs md:text-sm px-3.5 py-2.5 rounded-2xl
                               bg-black/50 border border-white/15
                               text-slate-100 placeholder:text-slate-500
                               focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                    placeholder="E:\\\\ComfyUI_windows_portable\\\\ComfyUI\\\\output\\\\Working\\\\..."
                    type="text"
                    value=""
                  />
                </div>
              </div>
            </section>
            <section
              class="space-y-3"
            >
              <h2
                class="text-base md:text-lg font-semibold text-slate-50"
              >
                Operations & Order
              </h2>
              <p
                class="text-[11px] md:text-xs text-slate-300"
              >
                Assign steps 1–4 to operations. Each step number can be used only once.
              </p>
              <div
                class="mt-2 rounded-2xl bg-transparent space-y-[1px]"
              >
                <div
                  class="relative flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div
                    class="w-32 text-xs md:text-sm font-medium text-slate-50"
                  >
                    Add prefix
                  </div>
                  <div
                    class="flex-1"
                  >
                    <input
                      class="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                     bg-black/30 border border-white/10
                                     text-slate-100 placeholder:text-slate-500
                                     focus:outline-none focus:ring-1 focus:ring-nm_teal/70 focus:border-nm_teal/80"
                      placeholder="Prefix text..."
                      type="text"
                      value=""
                    />
                  </div>
                  <div
                    class="flex items-center gap-1.5"
                  >
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
                                  flex items-center justify-center
                                  transition-all duration-150
                                  bg-black/45 text-slate-300 border border-white/10 hover:border-nm_teal/60 hover:text-nm_teal hover:bg-black/20"
                      type="button"
                    >
                      1
                    </button>
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
 ...

Ignored nodes: comments, script, style
<body>
  <div>
    <div
      class="relative"
    >
      <div
        class="relative h-full w-full"
        style="opacity: 1; transform: none;"
      >
        <div
          class="relative z-10 rounded-card overflow-visible
                    bg-nm_panel backdrop-blur-3xl
                    border border-white/7"
          style="box-shadow: 0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28); transform: none;"
        >
          <div
            class="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8"
          >
            <section
              class="space-y-4"
            >
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h2
                    class="text-base md:text-lg font-semibold text-slate-50"
                  >
                    Workspace
                  </h2>
                  <p
                    class="text-[11px] md:text-xs text-slate-300 mt-1"
                  >
                    Copy a folder path from Explorer, then validate it against the backend.
                  </p>
                </div>
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <button
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                               bg-black/45 border border-white/15
                               text-[11px] font-medium text-slate-100
                               hover:bg-black/70 hover:border-nm_teal/70 hover:text-nm_teal
                               shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                    tabindex="0"
                    type="button"
                  >
                    <span>
                      📋
                    </span>
                    <span>
                      Use clipboard
                    </span>
                  </button>
                  <button
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold
                      bg-gradient-to-r from-[#FFC1EB] via-nm_pink to-[#FF5FB6] text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                    tabindex="0"
                    type="button"
                  >
                    Check & Load
                  </button>
                </div>
              </div>
              <div
                class="space-y-1"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <input
                    class="flex-1 text-xs md:text-sm px-3.5 py-2.5 rounded-2xl
                               bg-black/50 border border-white/15
                               text-slate-100 placeholder:text-slate-500
                               focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                    placeholder="E:\\\\ComfyUI_windows_portable\\\\ComfyUI\\\\output\\\\Working\\\\..."
                    type="text"
                    value=""
                  />
                </div>
              </div>
            </section>
            <section
              class="space-y-3"
            >
              <h2
                class="text-base md:text-lg font-semibold text-slate-50"
              >
                Operations & Order
              </h2>
              <p
                class="text-[11px] md:text-xs text-slate-300"
              >
                Assign steps 1–4 to operations. Each step number can be used only once.
              </p>
              <div
                class="mt-2 rounded-2xl bg-transparent space-y-[1px]"
              >
                <div
                  class="relative flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div
                    class="w-32 text-xs md:text-sm font-medium text-slate-50"
                  >
                    Add prefix
                  </div>
                  <div
                    class="flex-1"
                  >
                    <input
                      class="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                     bg-black/30 border border-white/10
                                     text-slate-100 placeholder:text-slate-500
                                     focus:outline-none focus:ring-1 focus:ring-nm_teal/70 focus:border-nm_teal/80"
                      placeholder="Prefix text..."
                      type="text"
                      value=""
                    />
                  </div>
                  <div
                    class="flex items-center gap-1.5"
                  >
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
                                  flex items-center justify-center
                                  transition-all duration-150
                                  bg-black/45 text-slate-300 border border-white/10 hover:border-nm_teal/60 hover:text-nm_teal hover:bg-black/20"
                      type="button"
                    >
                      1
                    </button>
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
 ...
 ❯ waitForWrapper node_modules/@testing-library/dom/dist/wait-for.js:163:27
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:86:33
 ❯ tests/frontend/OpsConsole.preview.test.jsx:64:18
     62|
     63|     await user.click(screen.getByRole("button", { name: /^Preview$/i }));
     64|     await screen.findByText(/Select and load a valid folder first/i);
       |                  ^
     65|
     66|     await user.click(screen.getByRole("button", { name: /^Run$/i }));

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/frontend/OpsConsole.preview.test.jsx > OpsConsole preview + selective run > requires at least one configured operation before running
TestingLibraryElementError: Unable to find an element with the text: /Configure at least one operation/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

Ignored nodes: comments, script, style
<body>
  <div>
    <div
      class="relative"
    >
      <div
        class="relative h-full w-full"
        style="opacity: 1; transform: none;"
      >
        <div
          class="relative z-10 rounded-card overflow-visible
                    bg-nm_panel backdrop-blur-3xl
                    border border-white/7"
          style="box-shadow: 0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28); transform: none;"
        >
          <div
            class="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8"
          >
            <section
              class="space-y-4"
            >
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h2
                    class="text-base md:text-lg font-semibold text-slate-50"
                  >
                    Workspace
                  </h2>
                  <p
                    class="text-[11px] md:text-xs text-slate-300 mt-1"
                  >
                    Copy a folder path from Explorer, then validate it against the backend.
                  </p>
                </div>
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <button
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                               bg-black/45 border border-white/15
                               text-[11px] font-medium text-slate-100
                               hover:bg-black/70 hover:border-nm_teal/70 hover:text-nm_teal
                               shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                    tabindex="0"
                    type="button"
                  >
                    <span>
                      📋
                    </span>
                    <span>
                      Use clipboard
                    </span>
                  </button>
                  <button
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold
                      bg-gradient-to-r from-[#FFC1EB] via-nm_pink to-[#FF5FB6] text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                    style="transform: none;"
                    tabindex="0"
                    type="button"
                  >
                    Check & Load
                  </button>
                </div>
              </div>
              <div
                class="space-y-1"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <input
                    class="flex-1 text-xs md:text-sm px-3.5 py-2.5 rounded-2xl
                               bg-black/50 border border-white/15
                               text-slate-100 placeholder:text-slate-500
                               focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                    placeholder="E:\\\\ComfyUI_windows_portable\\\\ComfyUI\\\\output\\\\Working\\\\..."
                    type="text"
                    value="D:\\Samples"
                  />
                  <div
                    class="text-[11px] text-slate-900 whitespace-nowrap px-3 py-1 rounded-full bg-nm_teal/85"
                  >
                    2
                     file
                    s
                  </div>
                </div>
                <div
                  class="text-[11px] mt-0.5 text-nm_teal"
                >
                  Connected · 2 files detected.
                </div>
              </div>
            </section>
            <section
              class="space-y-3"
            >
              <h2
                class="text-base md:text-lg font-semibold text-slate-50"
              >
                Operations & Order
              </h2>
              <p
                class="text-[11px] md:text-xs text-slate-300"
              >
                Assign steps 1–4 to operations. Each step number can be used only once.
              </p>
              <div
                class="mt-2 rounded-2xl bg-transparent space-y-[1px]"
              >
                <div
                  class="relative flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div
                    class="w-32 text-xs md:text-sm font-medium text-slate-50"
                  >
                    Add prefix
                  </div>
                  <div
                    class="flex-1"
                  >
                    <input
                      class="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                     bg-black/30 border border-white/10
                                     text-slate-100 placeholder:text-slate-500
                                     focus:outline-none focus:ring-1 focus:ring-nm_teal/70 focus:border-nm_teal/80"
                      placeholder="Prefix text..."
                      type="text"
                      value=""
                    />
                  </div>
                  <div
                    class="flex items-center gap-1.5"
                  >
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
         ...

Ignored nodes: comments, script, style
<body>
  <div>
    <div
      class="relative"
    >
      <div
        class="relative h-full w-full"
        style="opacity: 1; transform: none;"
      >
        <div
          class="relative z-10 rounded-card overflow-visible
                    bg-nm_panel backdrop-blur-3xl
                    border border-white/7"
          style="box-shadow: 0 26px 80px rgba(0,0,0,0.85), 0 10px 18px rgba(255,255,255,0.28); transform: none;"
        >
          <div
            class="relative z-10 px-6 py-6 md:px-8 md:py-7 flex flex-col gap-8"
          >
            <section
              class="space-y-4"
            >
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h2
                    class="text-base md:text-lg font-semibold text-slate-50"
                  >
                    Workspace
                  </h2>
                  <p
                    class="text-[11px] md:text-xs text-slate-300 mt-1"
                  >
                    Copy a folder path from Explorer, then validate it against the backend.
                  </p>
                </div>
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <button
                    class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                               bg-black/45 border border-white/15
                               text-[11px] font-medium text-slate-100
                               hover:bg-black/70 hover:border-nm_teal/70 hover:text-nm_teal
                               shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                    tabindex="0"
                    type="button"
                  >
                    <span>
                      📋
                    </span>
                    <span>
                      Use clipboard
                    </span>
                  </button>
                  <button
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold
                      bg-gradient-to-r from-[#FFC1EB] via-nm_pink to-[#FF5FB6] text-slate-900 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                    style="transform: none;"
                    tabindex="0"
                    type="button"
                  >
                    Check & Load
                  </button>
                </div>
              </div>
              <div
                class="space-y-1"
              >
                <div
                  class="flex items-center gap-3"
                >
                  <input
                    class="flex-1 text-xs md:text-sm px-3.5 py-2.5 rounded-2xl
                               bg-black/50 border border-white/15
                               text-slate-100 placeholder:text-slate-500
                               focus:outline-none focus:ring-1 focus:ring-nm_teal focus:border-nm_teal"
                    placeholder="E:\\\\ComfyUI_windows_portable\\\\ComfyUI\\\\output\\\\Working\\\\..."
                    type="text"
                    value="D:\\Samples"
                  />
                  <div
                    class="text-[11px] text-slate-900 whitespace-nowrap px-3 py-1 rounded-full bg-nm_teal/85"
                  >
                    2
                     file
                    s
                  </div>
                </div>
                <div
                  class="text-[11px] mt-0.5 text-nm_teal"
                >
                  Connected · 2 files detected.
                </div>
              </div>
            </section>
            <section
              class="space-y-3"
            >
              <h2
                class="text-base md:text-lg font-semibold text-slate-50"
              >
                Operations & Order
              </h2>
              <p
                class="text-[11px] md:text-xs text-slate-300"
              >
                Assign steps 1–4 to operations. Each step number can be used only once.
              </p>
              <div
                class="mt-2 rounded-2xl bg-transparent space-y-[1px]"
              >
                <div
                  class="relative flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div
                    class="w-32 text-xs md:text-sm font-medium text-slate-50"
                  >
                    Add prefix
                  </div>
                  <div
                    class="flex-1"
                  >
                    <input
                      class="w-full text-xs md:text-sm px-3 py-2 rounded-xl
                                     bg-black/30 border border-white/10
                                     text-slate-100 placeholder:text-slate-500
                                     focus:outline-none focus:ring-1 focus:ring-nm_teal/70 focus:border-nm_teal/80"
                      placeholder="Prefix text..."
                      type="text"
                      value=""
                    />
                  </div>
                  <div
                    class="flex items-center gap-1.5"
                  >
                    <button
                      aria-pressed="false"
                      class="h-7 w-7 rounded-full text-[11px] font-semibold
         ...
 ❯ waitForWrapper node_modules/@testing-library/dom/dist/wait-for.js:163:27
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:86:33
 ❯ tests/frontend/OpsConsole.preview.test.jsx:84:18
     82|
     83|     await user.click(screen.getByRole("button", { name: /^Run$/i }));
     84|     await screen.findByText(/Configure at least one operation/i);
       |                  ^
     85|   });
     86|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed | 6 passed (7)
      Tests  2 failed | 23 passed (25)
   Start at  17:53:00
   Duration  16.73s (transform 376ms, setup 991ms, collect 2.89s, tests 25.62s, environment 3.78s, prepare 901ms)
