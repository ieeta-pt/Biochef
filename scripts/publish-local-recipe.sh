#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--rebuild] [--hub <hub-dir>] --recipe <biochef.yaml> [biochef.yaml ...]" >&2
}

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
frontend_dir=$(dirname -- "$script_dir")
recipe_inputs=()
rebuild=false
hub_dir=

while [[ $# -gt 0 ]]; do
  case "$1" in
    --recipe|--recipes)
      shift
      if [[ $# -eq 0 || "$1" == -* ]]; then
        echo "Missing recipe path after --recipe/--recipes" >&2
        usage
        exit 2
      fi
      while [[ $# -gt 0 && "$1" != -* ]]; do
        recipe_inputs+=("$1")
        shift
      done
      ;;
    --rebuild)
      rebuild=true
      shift
      ;;
    --hub)
      hub_dir=${2:-}
      if [[ -z "$hub_dir" ]]; then
        echo "Missing hub directory after --hub" >&2
        usage
        exit 2
      fi
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    -* )
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
    *)
      recipe_inputs+=("$1")
      shift
      ;;
  esac
done

if [[ ${#recipe_inputs[@]} -eq 0 ]]; then
  usage
  exit 2
fi

recipe_paths=()
recipe_dirs=()
for recipe_input in "${recipe_inputs[@]}"; do
  if [[ -f "$recipe_input" ]]; then
    recipe_dir=$(CDPATH= cd -- "$(dirname -- "$recipe_input")" && pwd -P)
    recipe_path="$recipe_dir/$(basename -- "$recipe_input")"
  else
    echo "Recipe not found: $recipe_input" >&2
    exit 2
  fi

  if [[ "$(basename -- "$recipe_path")" != biochef.yaml ]]; then
    echo "Recipe file must be named biochef.yaml: $recipe_path" >&2
    exit 2
  fi

  recipe_paths+=("$recipe_path")
  recipe_dirs+=("$recipe_dir")
done

recipes_root=${recipe_dirs[0]}
for recipe_dir in "${recipe_dirs[@]}"; do
  while [[ "$recipe_dir" != "$recipes_root" && "$recipe_dir" != "$recipes_root"/* ]]; do
    recipes_root=$(dirname -- "$recipes_root")
  done
done

container_recipes=()
for recipe_path in "${recipe_paths[@]}"; do
  relative_path=${recipe_path#"$recipes_root"/}
  container_recipes+=("/recipes/$relative_path")
done

run_args=(run --rm)
if [[ -n "$hub_dir" ]]; then
  if [[ -d "$hub_dir" ]]; then
    hub_dir=$(CDPATH= cd -- "$hub_dir" && pwd -P)
  else
    echo "Hub directory not found: $hub_dir" >&2
    exit 2
  fi

  if [[ ! -f "$hub_dir/hub/hub.py" ]]; then
    echo "Hub directory must contain hub/hub.py: $hub_dir" >&2
    exit 2
  fi

  run_args+=(--volume "$hub_dir:/hub:ro" --env BIOCHEF_INSTALL_LOCAL_HUB_DEPS=1)
fi

export BIOCHEF_RECIPES_ROOT="$recipes_root"
export BIOCHEF_HUB_IMAGE=${BIOCHEF_HUB_IMAGE:-biochef-hub-dev:local}

compose=(docker compose -f "$frontend_dir/docker-compose.dev.yml" --profile tools)

if [[ "$rebuild" == true ]] || ! docker image inspect "$BIOCHEF_HUB_IMAGE" >/dev/null 2>&1; then
  "${compose[@]}" build hub
fi

"${compose[@]}" "${run_args[@]}" \
  --entrypoint bash \
  hub -lc '
    set -euo pipefail
    if [[ "${BIOCHEF_INSTALL_LOCAL_HUB_DEPS:-0}" == "1" ]]; then
      pip install --no-cache-dir -r /hub/hub/requirements.txt
    fi
    python3 /hub/hub/hub.py validate "$@"
    python3 /hub/hub/hub.py build
    python3 /hub/hub/hub.py publish --registry localhost:5000
  ' bash "${container_recipes[@]}"
