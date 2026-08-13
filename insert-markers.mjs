// Inserts missing conformetry section markers into class bodies.
//
// Members are assumed already ordered canonically by eslint's
// perfectionist/sort-classes, so a marker belongs immediately before the first
// member of its group — or, when the group is empty, before whatever comes
// next.
import fs from "node:fs";
import process from "node:process";

import ts from "typescript";

const MARKERS = [
  "// 🏗 Dependency Injection",
  "// 🔐 Private Fields",
  "// 🔑 Public Fields",
  "// 🔏 Private Methods",
  "// 🌎 Public Methods",
];

function hasModifier(member, kind) {
  return (member.modifiers ?? []).some((modifier) => modifier.kind === kind);
}

function resolveGroup(member) {
  if (ts.isConstructorDeclaration(member)) return 0;

  const isHidden =
    hasModifier(member, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(member, ts.SyntaxKind.ProtectedKeyword);

  if (ts.isPropertyDeclaration(member)) return isHidden ? 1 : 2;
  if (
    ts.isMethodDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member)
  ) {
    return isHidden ? 3 : 4;
  }

  return undefined;
}

/** Start of a member's leading trivia, skipping only blank space. */
function resolveSlotStart(text, member) {
  let index = member.getFullStart();

  while (index < member.getStart() && /\s/u.test(text[index])) index += 1;

  return index;
}

/** Removes every marker line, so they can be re-inserted in canonical order. */
function stripMarkers(text) {
  const lines = text.split("\n");
  const kept = [];

  for (const [index, line] of lines.entries()) {
    if (MARKERS.some((marker) => line.trim() === marker)) {
      if (lines[index + 1]?.trim() === "") lines[index + 1] = "\u0000";
      continue;
    }

    if (line === "\u0000") continue;

    kept.push(line);
  }

  return kept.join("\n");
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const text = stripMarkers(original);
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const insertions = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || statement.members === undefined) {
      continue;
    }

    const bodyStart = statement.members.pos;
    const bodyEnd = statement.end - 1;
    const bodyText = text.slice(bodyStart, bodyEnd);
    const existing = new Map();

    for (const [index, marker] of MARKERS.entries()) {
      const offset = bodyText.indexOf(marker);

      if (offset !== -1) existing.set(index, bodyStart + offset);
    }

    const slots = statement.members
      .map((member) => ({
        group: resolveGroup(member),
        start: resolveSlotStart(text, member),
      }))
      .filter((slot) => slot.group !== undefined);

    for (const [index, marker] of MARKERS.entries()) {
      if (existing.has(index)) continue;

      // A marker belongs immediately before the first member of its own
      // group. Only when that group is empty does it fall through to whatever
      // comes next — otherwise the constructor marker lands after the
      // constructor it is meant to introduce.
      const own = slots.find((slot) => slot.group === index);
      const later = [
        ...[...existing.entries()]
          .filter(([group]) => group > index)
          .map(([, offset]) => offset),
        ...slots.filter((slot) => slot.group > index).map((slot) => slot.start),
      ];
      const position =
        own?.start ?? (later.length === 0 ? bodyEnd : Math.min(...later));

      insertions.push({ index, marker, position });
      existing.set(index, position);
    }
  }

  let updated = text;

  // Descending position so earlier offsets stay valid, and descending marker
  // order within a position so markers sharing an anchor end up in canonical
  // order rather than reversed.
  for (const insertion of insertions.toSorted((left, right) => {
    return right.position - left.position || right.index - left.index;
  })) {
    // Insert at the start of the line so the marker is indented like a member,
    // including at the closing brace where there is no member to follow.
    const lineStart = updated.lastIndexOf("\n", insertion.position - 1) + 1;

    updated =
      updated.slice(0, lineStart) +
      `  ${insertion.marker}\n\n` +
      updated.slice(lineStart);
  }

  if (updated === original) return 0;

  fs.writeFileSync(filePath, updated, "utf8");

  return insertions.length;
}

let total = 0;

for (const filePath of process.argv.slice(2)) {
  const count = fixFile(filePath);

  if (count > 0) console.log(`${filePath}: +${count}`);
  total += count;
}

console.log(`inserted ${total} markers into ${process.argv.length - 2} files`);
