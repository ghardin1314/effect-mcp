# Effect MCP

An implementation of the [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) using the [Effect](https://effect.website) library.

## Overview

Effect MCP provides a TypeScript implementation of the Model Context Protocol, which enables AI models to interact with external tools and resources. This implementation leverages the Effect library for robust, type-safe, and functional programming patterns.

## Features

- JSON-RPC based communication
- Type-safe API using Effect and Schema
- Stdio transport implementation
- Tool registration and execution
- Integration with Effect's AI toolkit

## Installation

```bash
pnpm install
```

## Usage

See the `examples/basic` directory for a simple example of how to use the MCP server.

## Project Structure

- `packages/server`: Core MCP server implementation
- `examples/basic`: Basic example of using the MCP server

## ⚠️ Active Development

This project is in active development and is not yet ready for production use. Many features are still being implemented.

Also MCP itself is still early and under development. There is currently a somewhat implicit 1:1 relationship between client and server. In my opinion this is likely to change and will require much refactoring. Hopefully this wont impact the surface API too much.

## Implementation Checklist

### MCP Server

- [x] Basic JSON-RPC message handling
- [x] Stdio transport implementation
- [ ] SSE transport implementation
- [x] Server initialization
- [x] Ping implementation
- [ ] Add comprehensive error handling
- [ ] Add tests

#### MCP Client -> Server Requests

- [x] Ping
- [x] Initialize
- [ ] Complete
- [ ] Set Log Level
- [ ] Get Prompt
- [ ] List Prompts
- [ ] List Resources
- [ ] List Resource Templates
- [ ] Read Resource
- [ ] Notification Subscribe
- [ ] Notification Unsubscribe
- [x] List Tools
- [x] Call Tool

#### MCP Server -> Client Requests

- [ ] Ping
- [ ] Create Message
- [ ] List Roots

### MCP Client

- [ ] Client implementation

## License

MIT
