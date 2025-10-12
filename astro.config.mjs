// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import remarkCustomOembed from './src/lib/remark-custom-oembed.mjs';
import remarkTooltip from './src/lib/remark-tooltip.mjs';

// Load environment variables
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

const customOembedConfig = {
  providers: [
    ['youtube.com', 'https://www.youtube.com/oembed?url={url}&format=json'],
    ['open.spotify.com', 'https://open.spotify.com/oembed?url={url}'],
  ],
  spotify: {
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
  },
};

// https://astro.build/config
export default defineConfig({
	site: 'https://conorcallanan2003.github.io',
	integrations: [mdx(), sitemap()],
	markdown: {
		remarkPlugins: [
			[remarkCustomOembed, customOembedConfig],
			remarkTooltip,
		],
	},
});
