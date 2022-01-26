.Phony: run

run:
	DENO_DIR=./deno_dir deno run -A --unstable https://raw.githubusercontent.com/denoflow/denoflow/main/cli.ts run workflows
local:
	DENO_DIR=./deno_dir deno run -A --unstable ../denoflow/denoflow/cli.ts run workflows