# Blog Writing Cheat Sheet

This document contains quick references for writing blog posts with custom features and markdown syntax.

---

## Custom Features

### Tooltips

Add inline explanatory tooltips that appear on hover.

**Syntax:**
```
[visible text]((tooltip text that appears on hover))
```

**Example:**
```
This is a [complex concept]((A detailed explanation of the concept)) in action.
```

**Notes:**
- Tooltips are theme-aware (light/dark mode)
- Keep tooltip text concise for better readability
- Avoid nesting tooltips

---

### Spotify Embeds

Paste Spotify URLs directly in your markdown to create rich embeds with episode/track details.

**Syntax:**
```
https://open.spotify.com/episode/EPISODE_ID
https://open.spotify.com/track/TRACK_ID
```

**Example:**
```
https://open.spotify.com/episode/2p94kBX0geqMMY1XXdZFvA?si=32aaf455b04a4c06
```

**Notes:**
- Fetches metadata at build time via Spotify API
- Shows episode/track name, show name, release date, and duration
- Works with podcasts and music tracks

---

### YouTube Embeds

Paste YouTube URLs directly in your markdown to create video embeds.

**Syntax:**
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
```

**Example:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Notes:**
- Uses oEmbed protocol for responsive embeds
- Supports standard YouTube URLs and short youtu.be links

---

### Mermaid Diagrams

Create diagrams and flowcharts using Mermaid syntax.

**Syntax:**
```mdx
import MermaidDiagram from '../../components/MermaidDiagram.astro';

<MermaidDiagram code={`graph LR
    A[Node A] --> B[Node B]
    B --> C[Node C]
`} />
```

**Diagram Directions:**
- `LR` - Left to Right (horizontal)
- `RL` - Right to Left
- `TD` or `TB` - Top to Bottom (vertical, default)
- `BT` - Bottom to Top

**Common Node Types:**
```
A[Rectangle]
B(Rounded)
C{Diamond/Decision}
D([Stadium])
E[[Subroutine]]
F[(Database)]
G((Circle))
```

**Common Arrow Types:**
```
A --> B    (solid arrow)
A --- B    (solid line)
A -.-> B   (dotted arrow)
A -.- B    (dotted line)
A ==> B    (thick arrow)
A === B    (thick line)
```

**Arrow Labels:**
```
A -->|Label| B
A ---|Label| B
```

**Example - Flowchart:**
```mdx
<MermaidDiagram code={`graph LR
    A[Start] --> B[Process Data]
    B --> C{Decision}
    C -->|Yes| D[Success]
    C -->|No| E[Error]
    D --> F[End]
    E --> F
`} />
```

**Example - Sequence Diagram:**
```mdx
<MermaidDiagram code={`sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: Request Data
    API->>Database: Query
    Database-->>API: Results
    API-->>User: Response
`} />
```

**Example - Bar Chart:**
```mdx
<MermaidDiagram code={`xychart-beta
    title "Monthly Sales Data"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Sales (k)" 0 --> 100
    bar [45, 60, 75, 55, 80, 90]
`} />
```

**Example - Line Chart:**
```mdx
<MermaidDiagram code={`xychart-beta
    title "Website Traffic Over Time"
    x-axis [Week1, Week2, Week3, Week4, Week5, Week6]
    y-axis "Visitors" 0 --> 5000
    line [1200, 1800, 2400, 2100, 3200, 4500]
`} />
```

**Chart Syntax Notes:**
- Charts use `xychart-beta` (experimental feature)
- X-axis labels should avoid spaces (use "Week1" not "Week 1")
- Y-axis format: `y-axis "Label" min --> max`
- Can combine multiple `bar` and `line` datasets in one chart
- Charts are theme-aware (black/white, matches light/dark mode)

**Notes:**
- Diagrams are theme-aware (automatically match light/dark mode)
- Shows skeleton loader while rendering
- Use horizontal layout (`LR`) when possible for better readability
- Charts use minimalist black/white styling matching site theme
- All diagram borders are 4px thick with full opacity

---

## Standard Markdown

### Headings
```
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

### Emphasis
```
*italic* or _italic_
**bold** or __bold__
***bold italic*** or ___bold italic___
```

### Links
```
[link text](https://example.com)
[link with title](https://example.com "title text")
```

### Images
```
![alt text](image-url.jpg)
![alt text](image-url.jpg "Image title")
```

### Lists

**Unordered:**
```
- Item 1
- Item 2
  - Nested item
  - Nested item
- Item 3
```

**Ordered:**
```
1. First item
2. Second item
3. Third item
```

### Code

**Inline code:**
```
Use `code` in your text
```

**Code blocks:**
````
```javascript
function example() {
  return "Hello World";
}
```
````

### Blockquotes
```
> This is a blockquote
> It can span multiple lines
```

### Horizontal Rules
```
---
or
***
or
___
```

### Tables
```
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

---

## Tips & Best Practices

- Use horizontal Mermaid diagrams (`graph LR`) for better mobile readability
- Keep tooltip explanations concise (1-2 sentences)
- Preview embeds locally before publishing
- Use meaningful alt text for images
- Keep heading hierarchy logical (don't skip levels)

---

## Adding New Features

Document new custom features here as they're added:

### Feature Template

**Feature Name**

Brief description of what it does.

**Syntax:**
```
syntax example
```

**Example:**
```
working example
```

**Notes:**
- Important details
- Limitations or considerations
- Best practices
