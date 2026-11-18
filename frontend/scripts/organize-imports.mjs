import ts from "typescript";
import fs from "node:fs";
import { sitePath } from "./site-paths.mjs";
const cwd = sitePath;
const config = ts.readConfigFile(
  ts.findConfigFile(cwd, ts.sys.fileExists),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd);
const host = {
  getScriptFileNames: () => parsed.fileNames,
  getScriptVersion: (f) => String(fs.statSync(f).mtimeMs),
  getScriptSnapshot: (f) =>
    fs.existsSync(f)
      ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, "utf8"))
      : undefined,
  getCurrentDirectory: () => cwd,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: ts.getDefaultLibFilePath,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};
const service = ts.createLanguageService(host);
for (const file of parsed.fileNames.filter((f) => f.includes("/src/"))) {
  for (const change of service.organizeImports(
    { type: "file", fileName: file },
    {},
    {},
  )) {
    let source = fs.readFileSync(change.fileName, "utf8");
    for (const edit of [...change.textChanges].sort(
      (a, b) => b.span.start - a.span.start,
    ))
      source =
        source.slice(0, edit.span.start) +
        edit.newText +
        source.slice(edit.span.start + edit.span.length);
    fs.writeFileSync(change.fileName, source);
  }
}
service.dispose();
console.log("Organized TypeScript imports.");
