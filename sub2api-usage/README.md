# Sub2API Usage Plugin

A Paseo v0.8 plugin that queries Sub2API's `GET /v1/usage` endpoint and displays account usage in the Paseo client.

## Features

- Wallet balance or subscription quota
- Quota and rate-limit windows
- Request, token, cache, and cost statistics
- Per-model usage statistics
- RPM, TPM, and average latency
- Chinese and English UI with automatic locale detection and a manual language selector

## Install

From this repository:

```bash
paseo plugin add Gerrit1999/paseo-plugins:sub2api-usage
```

From a local clone:

```bash
cd sub2api-usage
npm install
npm run typecheck
paseo plugin install "$PWD"
```

## Configuration

Set these variables in the Paseo daemon environment, then restart or reload the daemon:

```bash
SUB2API_BASE_URL=https://your-sub2api.example.com
SUB2API_API_KEY=your-api-key
```

`SUB2API_BASE_URL` may point to the service root, `/v1`, or `/v1/usage`; the plugin normalizes it to the usage endpoint. The API key is read only by the server-side plugin handler and is not returned to the Paseo client.

## Development

```bash
npm install
npm run typecheck
paseo plugin reload sub2api-usage
paseo plugin logs sub2api-usage
```

On Web, the selected language is remembered in local storage. On iOS and Android, the plugin detects the runtime locale and keeps manual selection for the current surface session.
