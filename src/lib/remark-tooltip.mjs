import { visit } from 'unist-util-visit';

// Remark plugin to transform [text]<tooltip> syntax into HTML
const remarkTooltip = () => {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      // Process each child node in the paragraph
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child.type === 'text') {
          // Look for the pattern [text]((tooltip))
          const regex = /\[([^\]]+)\]\(\(([^)]+)\)\)/g;
          const text = child.value;
          const matches = [...text.matchAll(regex)];

          if (matches.length > 0) {
            const newChildren = [];
            let lastIndex = 0;

            for (const match of matches) {
              const fullMatch = match[0];
              const triggerText = match[1];
              const tooltipText = match[2];
              const matchIndex = match.index;

              // Add text before the match
              if (matchIndex > lastIndex) {
                newChildren.push({
                  type: 'text',
                  value: text.slice(lastIndex, matchIndex),
                });
              }

              // Add the tooltip HTML node with proper escaping
              const escapedTooltip = tooltipText
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

              newChildren.push({
                type: 'html',
                value: `<span class="tooltip-trigger" data-tooltip="${escapedTooltip}">${triggerText}</span>`,
              });

              lastIndex = matchIndex + fullMatch.length;
            }

            // Add remaining text after last match
            if (lastIndex < text.length) {
              newChildren.push({
                type: 'text',
                value: text.slice(lastIndex),
              });
            }

            // Replace the current child with new children
            node.children.splice(i, 1, ...newChildren);
            i += newChildren.length - 1;
          }
        }
      }
    });
  };
};

export default remarkTooltip;
