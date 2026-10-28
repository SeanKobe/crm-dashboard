import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Vendor code is split into long-lived chunks: react and the router load with the app; dnd-kit only with Deals; the editor
// (TipTap + ProseMirror) only when a note is opened.
const nm = (names: string): RegExp => new RegExp(`node_modules[\\\\/](${names})[\\\\/]`)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: nm('react|react-dom|scheduler'), priority: 40 },
            { name: 'router', test: nm('react-router|cookie|set-cookie-parser'), priority: 30 },
            { name: 'dnd-kit', test: nm('@dnd-kit'), priority: 30 },
            { name: 'tiptap', test: nm('@tiptap|prosemirror-[a-z-]+|orderedmap|rope-sequence|w3c-keyname|linkifyjs|crelt|@remirror|markdown-it|entities|mdurl|uc\\.micro|linkify-it'), priority: 30 },
          ],
        },
      },
    },
  },
})
