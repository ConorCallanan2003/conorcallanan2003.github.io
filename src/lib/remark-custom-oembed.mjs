import { visit } from 'unist-util-visit';

// Helper to check if a node is a paragraph containing only a single link
const isLinkParagraph = (node) => {
  return (
    node.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0].type === 'link'
  );
};

// The actual remark plugin
const remarkCustomOembed = (options) => {
  const { providers } = options || {};

  if (!providers || !Array.isArray(providers)) {
    return (tree) => tree; // Do nothing if no providers are configured
  }

  // The transformer function that modifies the AST
  return async (tree) => {
    const nodesToTransform = [];

    // First pass: collect all nodes that need to be transformed.
    visit(tree, 'paragraph', (node) => {
      if (isLinkParagraph(node)) {
        const linkNode = node.children[0];
        const url = linkNode.url;

        for (const [providerHost, oembedUrl] of providers) {
          if (url.includes(providerHost)) {
            nodesToTransform.push({
              node, // The paragraph node to replace
              url,  // The URL of the link
              oembedUrl, // The oEmbed endpoint URL template
            });
            break; // Stop checking providers for this link
          }
        }
      }
    });

    // Second pass: perform the async transformations
    for (const item of nodesToTransform) {
      try {
        const endpoint = item.oembedUrl.replace('{url}', encodeURIComponent(item.url));
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.warn(`[oEmbed] Failed to fetch data for ${item.url}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        
        if (data.provider_name === 'YouTube' && data.title && data.author_name && data.thumbnail_url && data.author_url) {
          const youtubeLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="20" style="margin-right: 0.5rem; color: var(--text-color-secondary);"><path d="M21.54 5.64a2.09 2.09 0 0 0-1.48-1.48C18.07 3.5 12 3.5 12 3.5s-6.07 0-8.06.66a2.09 2.09 0 0 0-1.48 1.48C2.46 7.93 2.46 12 2.46 12s0 4.07.66 6.36a2.09 2.09 0 0 0 1.48 1.48c1.99.66 8.06.66 8.06.66s6.07 0 8.06-.66a2.09 2.09 0 0 0 1.48-1.48c.66-2.29.66-6.36.66-6.36s0-4.07-.66-6.36zM9.52 15.4V8.6L15.8 12l-6.28 3.4z"/></svg>`;
          const customHtml = `
            <div class="yt-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0;">
              <div class="yt-text-content" style="flex-grow: 1;">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                  <p class="yt-title" style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0;">${data.title}</p>
                </a>
                <div class="yt-meta" style="display: flex; align-items: center; gap: 0.25rem;">
                  ${youtubeLogoSvg}
                  <a href="${data.author_url}" target="_blank" rel="noopener noreferrer" class="yt-author" style="font-size: 0.9rem; color: var(--text-color-secondary); text-decoration: none; border-bottom: 1px dotted var(--border-color);">${data.author_name}</a>
                </div>
              </div>
              <div class="yt-thumbnail">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                  <img src="${data.thumbnail_url}" alt="Thumbnail for ${data.title}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                </a>
              </div>
            </div>
          `;
          item.node.type = 'html';
          item.node.value = customHtml;
          item.node.children = [];
        } else if (data.provider_name === 'Spotify' && data.title && data.thumbnail_url) {
          const spotifyLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="20" fill="currentColor" class="bi bi-spotify" viewBox="0 0 16 16" style="margin-right: 0.5rem; color: var(--text-color-secondary);"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288"/></svg>`;
          const customHtml = `
            <div class="spotify-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0;">
              <div class="spotify-text-content" style="flex-grow: 1; display: flex; align-items: center; gap: 1rem;">
                ${spotifyLogoSvg}
                 <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                    <p class="spotify-title" style="font-size: 1.1rem; font-weight: 600; margin: 0;">${data.title}</p>
                 </a>
              </div>
              <div class="spotify-thumbnail">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                  <img src="${data.thumbnail_url}" alt="Thumbnail for ${data.title}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                </a>
              </div>
            </div>
          `;
          item.node.type = 'html';
          item.node.value = customHtml;
          item.node.children = [];
        } else if (data.html) {
          // Fallback for other providers 
          item.node.type = 'html';
          item.node.value = data.html;
          item.node.children = [];
        }
      } catch (error) {
        console.error(`[oEmbed] Error processing ${item.url}:`, error);
      }
    }

    return tree;
  };
};

export default remarkCustomOembed;
