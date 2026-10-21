// graphql-upload 15 exposes CommonJS .js subpaths. The installed v17 types
// describe the same processRequest input/result contract under .mjs.
declare module 'graphql-upload/processRequest.js' {
  export { default } from 'graphql-upload/processRequest.mjs'
}
