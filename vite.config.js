// vite.config.js - Updated for development workflow
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isDev = mode === 'development';
  const isBuild = command === 'build';

  if (isDev) {
    // Development configuration - serve source files directly
    return {
      // Development server
      server: {
        port: 3000,
        host: true,
        open: '/examples/index.html'
      },

      // Environment variables
      define: {
        __VERSION__: JSON.stringify('dev'),
        __DEV__: JSON.stringify(true)
      },

      // Path resolution
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
          '@components': resolve(__dirname, 'src/components'),
          '@services': resolve(__dirname, 'src/services'),
          '@utils': resolve(__dirname, 'src/utils'),
          '@constants': resolve(__dirname, 'src/constants')
        }
      },

      // Log level
      logLevel: 'info'
    };
  }

  // Build configuration for production
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/widget.js'),
        name: 'TicketpingChat',
        formats: ['iife', 'es', 'umd'],
        fileName: (format) => {
          const formatMap = {
            'iife': 'widget.min.js',
            'es': 'widget.esm.js',
            'umd': 'widget.umd.js'
          };
          return formatMap[format];
        }
      },
      rollupOptions: {
        output: {
          banner: `/*!
 * Ticketping Chat Widget v1.0.0
 * (c) 2024 Ticketping
 * Licensed under MIT
 */`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'widget.css';
            return `assets/[name].[hash][extname]`;
          }
        }
      },
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      target: 'es2015',
      emptyOutDir: true
    },

    // Environment variables
    define: {
      __VERSION__: JSON.stringify('1.0.0'),
      __DEV__: JSON.stringify(false)
    },

    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@services': resolve(__dirname, 'src/services'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@constants': resolve(__dirname, 'src/constants')
      }
    }
  };
});