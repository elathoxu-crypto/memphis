# Share Replicator — Usage Notes

_Last updated: 2026-02-28_

The share replicator command coordinates the new **share-manifest** chain and its JSONL mirror. It does **not** move block payloads yet; instead it keeps manifests in sync so other nodes know which CIDs are ready for download.

## CLI

```bash
memphis share replicator --plan            # show manifest plan / status
memphis share replicator --push            # publish local manifests derived from network-chain
memphis share replicator --pull --file REMOTE.jsonl   # import remote manifest file (queues downloads)
```

Options:

- `--plan` – Read `share-manifest` chain + `~/.memphis/share-manifest/index.jsonl` and render current manifests (status, TTL, source).
- `--push` – Convert local `network-chain.jsonl` entries (status=pinned) into manifest blocks + JSONL rows.
- `--pull` – Import manifest rows from a remote JSONL file (e.g., fetched via share-sync) and queue them locally. Requires `--file`.
- `--limit <n>` – Cap number of manifests processed per invocation (default 25).
- `--dry-run` – Log actions without writing to chain/JSONL.

## Share-manifest Chain

- Chain name: `share-manifest`
- Block schema:
  - `type: "share_manifest"`
  - `tags: ["share", "manifest"]` (+ `remote` for pulled entries)
  - `content`: `share <chain>#<from>-<to> → <publisher>`
  - `manifest` payload stored inline (cid, chain, range, ttl_days, created_at, publisher, signature?)
  - `data.manifest_status` + `data.manifest_source` for quick filtering
- Mirror log: `~/.memphis/share-manifest/index.jsonl`
  - Each line: `{ id, manifest, status, source, block_index, recorded_at, notes? }`

## Workflow

1. **Push**
   - Reads `~/.memphis/network-chain.jsonl`
   - Filters `status=pinned` entries not yet represented in `share-manifest`
   - Writes manifest block + JSONL row (status `pending`, source `local`)

2. **Plan**
   - Combines JSONL + TTL to show pending/expired items
   - Helps decide what still needs syncing or cleanup

3. **Pull**
   - Takes remote manifest file (copied from another node)
   - Adds new entries locally with `status=queued`, `source=remote`
   - No payload download yet (future work)

## Next Steps

- Wire manifest ingestion to actual block replication
- Add `--from-network <file>` helper for importing remote network-chain logs (convert to manifest automatically)
- Hook replicator into heartbeat/cron once Semantic Recall + share-sync automation are stable
