/**
 * Simple Nginx configuration formatter
 * Handles indentation based on braces {}
 */
export const formatNginxConfig = (content: string): string => {
  if (!content) return "";

  const indentSize = 4;
  const lines = content.split(/\r?\n/);
  let formattedLines: string[] = [];
  let currentIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines if previous was empty (collapse multiple newlines)
    if (
      line === "" &&
      formattedLines.length > 0 &&
      formattedLines[formattedLines.length - 1] === ""
    ) {
      continue;
    }

    if (line === "") {
      formattedLines.push("");
      continue;
    }

    // Decrease indent if line starts with closing brace
    // Check if it starts with } or contains only }
    // Handle cases like "} else {" which is rare in nginx but possible in lua blocks
    // In standard nginx, } usually ends a block.
    if (line.startsWith("}") && !line.startsWith("} {")) {
      currentIndent = Math.max(0, currentIndent - 1);
    }

    // Add indentation
    const indent = " ".repeat(currentIndent * indentSize);
    formattedLines.push(indent + line);

    // Increase indent if line ends with {
    // Check for comments
    const codePart = line.split("#")[0].trim();
    if (codePart.endsWith("{")) {
      currentIndent++;
    } else if (codePart.startsWith("}") && !codePart.endsWith("}")) {
      // case like "} else {" or similar, but simplified:
      // if it started with } we already dedented.
      // if it ends with { we need to indent.
      // So for "} server {", we dedent then indent, net 0 change for this line, but next line indented.
      // The logic above: dedent happened before push. Indent happens after push.
      // So "}" line is printed at indent-1. Next line at indent-1.
      // Wait, } line should be at indent-1.
      // If line is "} http {", currentIndent was decreased. Printed. Then increased?
      if (codePart.endsWith("{")) {
        currentIndent++;
      }
    }
  }

  return formattedLines.join("\n");
};
