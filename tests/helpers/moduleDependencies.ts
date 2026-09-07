import * as ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { dirname, relative, resolve } from 'node:path'

/** Parse actual module references, including multiline imports, re-exports and lazy imports. */
export function moduleDependencies(filename: string, content: string, sourceRoot: string): string[] {
  const scripts = filename.endsWith('.vue')
    ? (() => {
        const { descriptor } = parse(content, { filename })
        return [descriptor.script, descriptor.scriptSetup].flatMap((script) => script
          ? [script.src ? `import ${JSON.stringify(script.src)}` : script.content]
          : [])
      })()
    : [content]
  const modules = new Set<string>()
  const record = (node: ts.Node | undefined) => {
    if (!node || !ts.isStringLiteralLike(node)) return
    const specifier = node.text
    const canonical = specifier.startsWith('.')
      ? '@/' + relative(sourceRoot, resolve(dirname(filename), specifier)).replaceAll('\\', '/')
      : specifier
    modules.add(canonical)
  }
  for (const script of scripts) {
    const file = ts.createSourceFile(filename, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) record(node.moduleSpecifier)
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) record(node.moduleReference.expression)
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) record(node.argument.literal)
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || ts.isIdentifier(node.expression) && node.expression.text === 'require')) record(node.arguments[0])
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return [...modules]
}
