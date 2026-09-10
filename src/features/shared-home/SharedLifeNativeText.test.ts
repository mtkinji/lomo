import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
// Button wraps a single string in native Text. Mixed text children bypass that wrapper.
it("Home buttons provide one label or explicitly wrapped native text", () => {
  const violations: string[] = [];
  for (const filename of fs
    .readdirSync(__dirname)
    .filter(
      (f) =>
        f.startsWith("SharedLife") &&
        f.endsWith(".tsx") &&
        !f.includes(".test."),
    )) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(path.join(__dirname, filename), "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(source) === "Button"
      ) {
        const children = node.children.filter(
          (c) => !ts.isJsxText(c) || c.getText(source).trim(),
        );
        if (
          children.length > 1 &&
          children.some((c) => ts.isJsxText(c) || ts.isJsxExpression(c))
        )
          violations.push(
            `${filename}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`,
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(violations).toEqual([]);
});
