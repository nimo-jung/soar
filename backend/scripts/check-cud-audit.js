const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
  path.join(ROOT, 'src', 'admin'),
  path.join(ROOT, 'src', 'tenant'),
];
const CUD_DECORATOR_RE = /@(Post|Patch|Delete)\s*\(/g;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function indexToLineStart(content, index) {
  let cursor = index;
  while (cursor > 0 && content[cursor - 1] !== '\n') {
    cursor -= 1;
  }
  return cursor;
}

function findMethodStart(content, fromIndex) {
  const startLineIndex = indexToLineStart(content, fromIndex);
  const tail = content.slice(startLineIndex);
  const lines = tail.split('\n');

  let consumed = 0;
  let methodName = null;
  let signatureStart = -1;

  for (const line of lines) {
    const methodLineMatch = line.match(/^\s*(?:public|private|protected)?\s*(?:async\s+)?([A-Za-z0-9_]+)\s*\(/);
    if (methodLineMatch) {
      methodName = methodLineMatch[1];
      signatureStart = startLineIndex + consumed;
      break;
    }

    consumed += line.length + 1;
  }

  if (!methodName || signatureStart < 0) {
    return null;
  }

  const firstParen = content.indexOf('(', signatureStart);
  if (firstParen < 0) {
    return null;
  }

  let parenDepth = 0;
  let signatureEnd = -1;
  for (let i = firstParen; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '(') {
      parenDepth += 1;
      continue;
    }

    if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnd = i;
        break;
      }
    }
  }

  if (signatureEnd < 0) {
    return null;
  }

  const bodyStart = content.indexOf('{', signatureEnd);
  if (bodyStart < 0) {
    return null;
  }

  return {
    methodName,
    signatureStart,
    bodyStart,
  };
}

function findMethodBody(content, bodyStart) {
  let depth = 0;

  for (let i = bodyStart; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          start: bodyStart + 1,
          end: i,
          body: content.slice(bodyStart + 1, i),
        };
      }
    }
  }

  return null;
}

function toRelative(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  let decoratorMatch;
  while ((decoratorMatch = CUD_DECORATOR_RE.exec(content)) !== null) {
    const decorator = decoratorMatch[1];
    const method = findMethodStart(content, CUD_DECORATOR_RE.lastIndex);

    if (!method) {
      continue;
    }

    const methodBody = findMethodBody(content, method.bodyStart);
    if (!methodBody) {
      continue;
    }

    const snippet = content.slice(decoratorMatch.index, method.signatureStart);
    if (snippet.includes('audit-check: ignore')) {
      continue;
    }

    const hasAuditRecordCall = methodBody.body.includes('auditLogService.record(')
      || methodBody.body.includes('this.auditLogService.record(');

    if (!hasAuditRecordCall) {
      violations.push({
        file: toRelative(filePath),
        line: lineOf(content, method.signatureStart),
        decorator,
        method: method.methodName,
      });
    }

    CUD_DECORATOR_RE.lastIndex = methodBody.end;
  }

  return violations;
}

function main() {
  const controllerFiles = TARGET_DIRS.flatMap((dir) => (fs.existsSync(dir) ? walk(dir) : []));
  const violations = controllerFiles.flatMap((filePath) => checkFile(filePath));

  if (violations.length === 0) {
    console.log('[check:audit:cud] OK - all admin/tenant CUD handlers include audit logging.');
    return;
  }

  console.error('[check:audit:cud] FAILED - missing audit logging in CUD handlers:');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.decorator} ${violation.method}()`);
  }

  console.error('Add auditLogService.record(...) in each handler or annotate with audit-check: ignore if intentionally exempted.');
  process.exit(1);
}

main();
