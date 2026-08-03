import { builtinModules } from 'module'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import * as ts from 'typescript'

// What this seals
// ---------------
// `npm pack` ships `files: ["dist"]` and `npm install <tgz>` installs
// `dependencies` ONLY. A module that reaches production code through a
// devDependency's hoisted copy therefore resolves in this checkout and is
// ABSENT from the installed engine.
//
// That is not hypothetical: `ProjectVersion.detectProjectFile` called
// `require('glob')`, glob was never declared, and the installed engine answered
// `grm version --detect` with `Cannot find module 'glob'` in every directory
// without a package.json — while this suite was green.
//
// A behavioural test cannot catch the class, because the checkout is exactly
// the environment where the missing declaration still works. So the assertion
// is structural: every bare specifier production code imports must be a Node
// builtin or a declared runtime dependency.

const ROOT = resolve(__dirname, '../../..')
const SRC = join(ROOT, 'src')

const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const declared = new Set(Object.keys(packageJson.dependencies ?? {}))
const builtins = new Set(builtinModules)

function sourceFiles(dir: string): string[] {
    const found: string[] = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            found.push(...sourceFiles(full))
        } else if (entry.endsWith('.ts')) {
            found.push(full)
        }
    }
    return found
}

// `@scope/name/sub` → `@scope/name`; `name/sub` → `name`
function packageOf(specifier: string): string {
    const parts = specifier.split('/')
    return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

// Specifiers come from the compiler's own AST, not a regex over the text. The
// first draft of this gate scanned source lines and reported two hits, and BOTH
// were its own false positives: the sentence in ProjectVersion.ts that names
// `require('glob')` as history, and a log message reading `from '${branch}'`.
// A gate that fires on prose about the defect cannot be left armed.
function bareSpecifiers(file: string, source: string): string[] {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const found: string[] = []

    const take = (node: ts.Node | undefined): void => {
        if (node && ts.isStringLiteral(node) && !node.text.startsWith('.') && !node.text.startsWith('/')) {
            found.push(node.text)
        }
    }

    const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            take(node.moduleSpecifier)
        } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
            take(node.moduleReference.expression)
        } else if (ts.isCallExpression(node)) {
            const callee = node.expression
            const isRequire = ts.isIdentifier(callee) && callee.text === 'require'
            if (isRequire || callee.kind === ts.SyntaxKind.ImportKeyword) {
                take(node.arguments[0])
            }
        }
        ts.forEachChild(node, visit)
    }

    visit(tree)
    return found
}

describe('packaged engine: production imports are declared', () => {
    const files = sourceFiles(SRC)

    it('finds source to inspect', () => {
        // Non-vacuity: an empty file list would make every assertion below pass
        // without measuring anything.
        expect(files.length).toBeGreaterThan(10)
    })

    it('imports only Node builtins or declared dependencies', () => {
        const undeclared: string[] = []

        for (const file of files) {
            const source = readFileSync(file, 'utf8')
            for (const specifier of bareSpecifiers(file, source)) {
                const name = packageOf(specifier.replace(/^node:/, ''))
                if (builtins.has(name) || declared.has(name)) continue
                undeclared.push(`${file.slice(ROOT.length + 1)} → '${specifier}'`)
            }
        }

        expect(undeclared.sort()).toEqual([])
    })
})
