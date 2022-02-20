.Phony: run

run:
	DENO_DIR=./deno_dir deno run -A --unstable https://deno.land/x/denoflow@0.0.33/cli.ts run workflows
local:
	DENO_DIR=./deno_dir deno run -A --unstable ../denoflow/denoflow/cli.ts run workflows