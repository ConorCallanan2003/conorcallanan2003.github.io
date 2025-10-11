// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkCustomOembed from './src/lib/remark-custom-oembed.mjs';

const customOembedConfig = {
  providers: [
    ['youtube.com', 'https://www.youtube.com/oembed?url={url}&format=json'],
    ['open.spotify.com', 'https://open.spotify.com/oembed?url={url}'],
  ],
};

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		remarkPlugins: [[remarkCustomOembed, customOembedConfig]],
	},
});
