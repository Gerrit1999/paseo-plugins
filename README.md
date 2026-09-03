# paseo-plugins

Paseo plugins maintained as independent, self-contained npm projects.

| Plugin | ID | Description |
| --- | --- | --- |
| [`sub2api-usage/`](sub2api-usage) | `sub2api-usage` | Displays Sub2API account usage, quotas, rate limits, token statistics, and cost in Paseo. |

## Install

Install plugins individually. There is no repository-wide installation or npm workspace.

```bash
paseo plugin add Gerrit1999/paseo-plugins --path sub2api-usage
```

For local development:

```bash
git clone https://github.com/Gerrit1999/paseo-plugins.git
cd paseo-plugins/sub2api-usage
npm install
npm run typecheck
paseo plugin install "$PWD"
```

## Layout

Each top-level plugin directory contains its own `package.json`, lock file, TypeScript configuration, manifest, source, and development dependencies. Dependencies are intentionally not hoisted to a workspace root.

## License

[MIT](LICENSE)
