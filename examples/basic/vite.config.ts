// https://vite.dev/config/
export default {
  resolve: {
    conditions: ["@effect-mcp/dev"],
  },
  ssr: {
    resolve: {
      conditions: ["@effect-mcp/dev"],
    },
  },
};
