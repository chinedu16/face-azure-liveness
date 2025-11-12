Please refer to [Readme.md](../README.md) in the web folder.

## Private Registry Auth (AZURE_NPM_TOKEN)

- The repo `.npmrc` references `${AZURE_NPM_TOKEN}` to authenticate to the Azure feed.
- Do not commit tokens. Provide `AZURE_NPM_TOKEN` via environment variables or your user-level `~/.npmrc`.

### Local development

```bash
export AZURE_NPM_TOKEN=YOUR_TOKEN
npm ci
npm run dev
```

Or configure user-level:

```bash
npm config set //pkgs.dev.azure.com/msface/SDK/_packaging/AzureAIVision/npm/registry/:_authToken YOUR_TOKEN
```

### GitHub Actions

- Add repository secret `AZURE_NPM_TOKEN` under Settings → Secrets and variables → Actions.
- Included workflow: `.github/workflows/ci.yml` installs and builds using the secret.

### Hosting (e.g., Vercel)

- Add environment variable `AZURE_NPM_TOKEN` in project settings.
- Tokens must remain server-side; do not use `NEXT_PUBLIC_*`.