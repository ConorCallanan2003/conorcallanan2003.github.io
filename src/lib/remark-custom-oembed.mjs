import { visit } from "unist-util-visit";

// Spotify API authentication - tokens are ONLY used at build time, never exposed to client
let spotifyAccessToken = null;
let tokenExpiry = null;

async function getSpotifyAccessToken(clientId, clientSecret) {
  // Return cached token if still valid
  if (spotifyAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return spotifyAccessToken;
  }

  if (!clientId || !clientSecret) {
    console.warn("[Spotify API] Missing Spotify credentials in config");
    return null;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.warn(
        `[Spotify API] Failed to get access token: ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    // Set expiry with 5 minute buffer
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return spotifyAccessToken;
  } catch (error) {
    console.error("[Spotify API] Error getting access token:", error);
    return null;
  }
}

// Helper to extract Spotify ID and type from URL
function parseSpotifyUrl(url) {
  const match = url.match(
    /open\.spotify\.com\/(track|episode|show)\/([a-zA-Z0-9]+)/,
  );
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

// Helper to format duration from milliseconds to readable format
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

// Helper to format release date
function formatReleaseDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper to check if a node is a paragraph containing only a single link
const isLinkParagraph = (node) => {
  return (
    node.type === "paragraph" &&
    node.children.length === 1 &&
    node.children[0].type === "link"
  );
};

// Helper to extract OpenGraph tags from HTML
async function fetchOpenGraphData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[OpenGraph] Failed to fetch ${url}: ${response.statusText}`,
      );
      return null;
    }

    const html = await response.text();

    // Extract OpenGraph meta tags using regex
    const ogTags = {};
    const metaTagRegex =
      /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi;
    let match;

    while ((match = metaTagRegex.exec(html)) !== null) {
      ogTags[match[1]] = match[2];
    }

    // Also try reversed order (content before property)
    const metaTagRegex2 =
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:([^"']+)["']\s*\/?>/gi;
    while ((match = metaTagRegex2.exec(html)) !== null) {
      if (!ogTags[match[2]]) {
        ogTags[match[2]] = match[1];
      }
    }

    if (Object.keys(ogTags).length === 0) {
      return null;
    }

    return {
      title: ogTags.title,
      description: ogTags.description,
      image: ogTags.image,
      url: ogTags.url || url,
      site_name: ogTags.site_name,
    };
  } catch (error) {
    console.error(`[OpenGraph] Error fetching ${url}:`, error);
    return null;
  }
}

// The actual remark plugin
const remarkCustomOembed = (options) => {
  const { providers, spotify } = options || {};

  if (!providers || !Array.isArray(providers)) {
    return (tree) => tree; // Do nothing if no providers are configured
  }

  // The transformer function that modifies the AST
  return async (tree) => {
    const nodesToTransform = [];

    // First pass: collect all nodes that need to be transformed.
    visit(tree, "paragraph", (node) => {
      if (isLinkParagraph(node)) {
        const linkNode = node.children[0];
        const url = linkNode.url;

        let matchedProvider = false;
        for (const [providerHost, oembedUrl] of providers) {
          if (url.includes(providerHost)) {
            nodesToTransform.push({
              node, // The paragraph node to replace
              url, // The URL of the link
              oembedUrl, // The oEmbed endpoint URL template
              useOpenGraph: false,
            });
            matchedProvider = true;
            break; // Stop checking providers for this link
          }
        }

        // If no provider matched, try OpenGraph as fallback
        if (
          !matchedProvider &&
          (url.startsWith("http://") || url.startsWith("https://"))
        ) {
          nodesToTransform.push({
            node,
            url,
            oembedUrl: null,
            useOpenGraph: true,
          });
        }
      }
    });

    // Second pass: perform the async transformations
    for (const item of nodesToTransform) {
      try {
        // Handle OpenGraph fallback
        if (item.useOpenGraph) {
          const ogData = await fetchOpenGraphData(item.url);

          if (ogData && ogData.title) {
            const linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="color: var(--text-color);"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

            const customHtml = `
              <div class="og-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0; position: relative;">
                ${ogData.site_name ? `<div class="og-badge" style="position: absolute; top: -28px; right: -28px; background-color: var(--bg-color-secondary); padding: 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 2px solid var(--border-color); z-index: 100;">${ogData.site_name}</div>` : ""}
                <div class="og-text-content" style="flex-grow: 1;">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                    <p class="og-title" style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem 0;">${ogData.title}</p>
                  </a>
                  ${ogData.description ? `<div class="og-description" style="font-size: 0.9rem; color: var(--text-color-secondary); margin-bottom: 0.5rem;">${ogData.description}</div>` : ""}
                  <div class="og-url" style="font-size: 0.85rem; color: var(--text-color-secondary); display: flex; align-items: center; gap: 0.25rem;">
                    ${linkIcon}
                    <span>${new URL(item.url).hostname}</span>
                  </div>
                </div>
                ${
                  ogData.image
                    ? `<div class="og-thumbnail">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                    <img src="${ogData.image}" alt="Preview for ${ogData.title}" style="max-width: 120px; max-height: 120px; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                  </a>
                </div>`
                    : ""
                }
              </div>
            `;
            item.node.type = "html";
            item.node.value = customHtml;
            item.node.children = [];
          }
          continue;
        }

        const endpoint = item.oembedUrl.replace(
          "{url}",
          encodeURIComponent(item.url),
        );
        const response = await fetch(endpoint);

        if (!response.ok) {
          console.warn(
            `[oEmbed] Failed to fetch data for ${item.url}: ${response.statusText}`,
          );
          continue;
        }

        const data = await response.json();

        if (
          data.provider_name === "YouTube" &&
          data.title &&
          data.author_name &&
          data.thumbnail_url &&
          data.author_url
        ) {
          const youtubeLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="58" height="58" style="color: var(--text-color);"><path d="M21.54 5.64a2.09 2.09 0 0 0-1.48-1.48C18.07 3.5 12 3.5 12 3.5s-6.07 0-8.06.66a2.09 2.09 0 0 0-1.48 1.48C2.46 7.93 2.46 12 2.46 12s0 4.07.66 6.36a2.09 2.09 0 0 0 1.48 1.48c1.99.66 8.06.66 8.06.66s6.07 0 8.06-.66a2.09 2.09 0 0 0 1.48-1.48c.66-2.29.66-6.36.66-6.36s0-4.07-.66-6.36zM9.52 15.4V8.6L15.8 12l-6.28 3.4z"/></svg>`;
          const customHtml = `
            <div class="yt-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0; position: relative;">
              <div class="yt-badge" style="position: absolute; top: -28px; right: -28px; background-color: var(--bg-color-secondary); padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; opacity: 1; z-index: 100;">
                ${youtubeLogoSvg}
              </div>
              <div class="yt-text-content" style="flex-grow: 1;">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                  <p class="yt-title" style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem 0;">${data.title}</p>
                </a>
                <div class="yt-author" style="font-size: 0.9rem; color: var(--text-color-secondary);">
                  <a href="${data.author_url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; border-bottom: 1px dotted var(--border-color);">${data.author_name}</a>
                </div>
              </div>
              <div class="yt-thumbnail">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                  <img src="${data.thumbnail_url}" alt="Thumbnail for ${data.title}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                </a>
              </div>
            </div>
          `;
          item.node.type = "html";
          item.node.value = customHtml;
          item.node.children = [];
        } else if (
          data.provider_name === "Spotify" &&
          data.title &&
          data.thumbnail_url
        ) {
          // Try to fetch additional data from Spotify API
          const spotifyInfo = parseSpotifyUrl(item.url);
          let apiData = null;

          if (spotifyInfo && spotify?.clientId && spotify?.clientSecret) {
            const token = await getSpotifyAccessToken(
              spotify.clientId,
              spotify.clientSecret,
            );
            if (token) {
              try {
                const apiUrl = `https://api.spotify.com/v1/${spotifyInfo.type}s/${spotifyInfo.id}`;
                const apiResponse = await fetch(apiUrl, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });

                if (apiResponse.ok) {
                  apiData = await apiResponse.json();
                }
              } catch (error) {
                console.warn(
                  `[Spotify API] Error fetching data for ${item.url}:`,
                  error,
                );
              }
            }
          }

          const spotifyLogoSvg = `<svg width="58" height="58" fill="currentColor" viewBox="0 0 16 16" style="color: var(--text-color);"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288"/></svg>`;

          // Generate enhanced embed based on type (episode/track/show)
          if (apiData && spotifyInfo.type === "episode") {
            // Podcast episode embed with enhanced data
            const episodeName = apiData.name || data.title;
            const showName = apiData.show?.name || "";
            const releaseDate = apiData.release_date
              ? formatReleaseDate(apiData.release_date)
              : "";
            const duration = apiData.duration_ms
              ? formatDuration(apiData.duration_ms)
              : "";
            const coverArt = apiData.images?.[0]?.url || data.thumbnail_url;

            const metaParts = [releaseDate, duration].filter(Boolean);
            const dateAndLength = metaParts.join(" • ");

            const customHtml = `
              <div class="spotify-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0; position: relative;">
                <div class="spotify-badge" style="position: absolute; top: -28px; right: -28px; background-color: var(--bg-color-secondary); padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; opacity: 1; z-index: 100;">
                  ${spotifyLogoSvg}
                </div>
                <div class="spotify-text-content" style="flex-grow: 1;">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                    <p class="spotify-title" style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.25rem 0;">${episodeName}</p>
                  </a>
                  <div class="spotify-show" style="font-size: 0.9rem; color: var(--text-color-secondary); margin-bottom: 0.25rem;">
                    ${showName}
                  </div>
                  <div class="spotify-meta" style="font-size: 0.85rem; color: var(--text-color-secondary);">
                    ${dateAndLength}
                  </div>
                </div>
                <div class="spotify-thumbnail">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                    <img src="${coverArt}" alt="Cover art for ${episodeName}" style="max-height: 100px; width: auto; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                  </a>
                </div>
              </div>
            `;
            item.node.type = "html";
            item.node.value = customHtml;
            item.node.children = [];
          } else if (apiData && spotifyInfo.type === "track") {
            // Track embed with enhanced data
            const trackName = apiData.name || data.title;
            const artists =
              apiData.artists?.map((a) => a.name).join(", ") || "";
            const album = apiData.album?.name || "";
            const releaseDate = apiData.album?.release_date
              ? new Date(apiData.album.release_date).getFullYear()
              : "";
            const coverArt =
              apiData.album?.images?.[0]?.url || data.thumbnail_url;

            const metaParts = [artists, album, releaseDate].filter(Boolean);
            const metaText = metaParts.join(" • ");

            const customHtml = `
              <div class="spotify-embed" style="background-color: var(--bg-color-secondary); border: 2px solid var(--border-color); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: 'Geist Mono', sans-serif; margin: 1.5em 0;">
                <div class="spotify-text-content" style="flex-grow: 1;">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; border-bottom: none;">
                    <p class="spotify-title" style="font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0;">${trackName}</p>
                  </a>
                  <div class="spotify-meta" style="display: flex; align-items: center; gap: 0.25rem;">
                    ${spotifyLogoSvg}
                    <span style="font-size: 0.9rem; color: var(--text-color-secondary);">${metaText}</span>
                  </div>
                </div>
                <div class="spotify-thumbnail">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-bottom: none;">
                    <img src="${coverArt}" alt="Cover art for ${trackName}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; margin: 0; display: block;" />
                  </a>
                </div>
              </div>
            `;
            item.node.type = "html";
            item.node.value = customHtml;
            item.node.children = [];
          } else {
            // Fallback to simple embed with oEmbed data only
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
            item.node.type = "html";
            item.node.value = customHtml;
            item.node.children = [];
          }
        } else if (data.html) {
          // Fallback for other providers
          item.node.type = "html";
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
