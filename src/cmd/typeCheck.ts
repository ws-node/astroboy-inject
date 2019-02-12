import * as ts from "typescript/lib/tsserverlibrary";

// const { TSCONFIG, INDEX, PARENT } = process.env;

export function compile(
  fileNames: string[],
  options: ts.CompilerOptions,
  notify: (msg: string) => void
) {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      notify(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      notify(
        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
      );
    }
  });

  const exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}

export function readTsConfig(
  path: string,
  parent: string
): ts.ParsedCommandLine {
  const i = path.lastIndexOf("/");
  const prefix = path.substr(0, i);
  const root = prefix.length > 0 ? `${parent}/${prefix}` : parent;
  const configFile = ts.readJsonConfigFile(path, ts.sys.readFile);
  const compilerOptions = ts.parseJsonSourceFileConfigFileContent(
    configFile,
    {
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      useCaseSensitiveFileNames: true
    },
    root
  );
  return compilerOptions;
}
// const result = readTsConfig(
//   TSCONFIG === "-" ? "tsconfig.json" : TSCONFIG,
//   PARENT
// );

// try {
//   compile(result.fileNames, {
//     ...result.options,
//     noEmit: true
//   });
// } catch (err) {
//   console.log(err);
// }
