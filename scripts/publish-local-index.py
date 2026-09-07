#!/usr/bin/env python3
"""Publish the unsigned index used only by the loopback development stack."""

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import oras.client
import requests


PACKAGE_PATTERN = re.compile(r"[a-z0-9]+(?:[._-][a-z0-9]+)*")


def loopback_registry(value):
    parsed = urlparse(value if "://" in value else f"//{value}")
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        raise ValueError("The unsigned development index may only be published to a loopback registry")
    return parsed.netloc or parsed.path


def read_json(path):
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def index_entry(bundle):
    io = bundle.get("io") or (bundle.get("manifest") or {}).get("io") or {}
    inputs = io.get("inputs") or []
    outputs = io.get("outputs") or []
    return {
        "name": bundle.get("name"),
        "description": bundle.get("description"),
        "category": bundle.get("category"),
        "inputTypes": [kind for item in inputs for kind in item.get("types", [])],
        "outputTypes": [kind for item in outputs for kind in item.get("types", [])],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--registry-dir", default="registry")
    parser.add_argument("--catalog-package", default="biochef-dev-plugins-index")
    args = parser.parse_args()

    registry = loopback_registry(args.registry)
    if PACKAGE_PATTERN.fullmatch(args.catalog_package) is None:
        raise ValueError("Invalid development catalogue package name")

    registry_dir = Path(args.registry_dir).resolve()
    publish_results = read_json(registry_dir / "publish-results.json")
    artifacts = publish_results.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise ValueError("publish-results.json contains no published artifacts")

    client = oras.client.OrasClient(hostname=registry, insecure=True)
    target = f"{registry}/{args.catalog_package}:index"
    index = {}

    with tempfile.TemporaryDirectory(prefix="biochef-dev-index-") as temporary:
        temporary_path = Path(temporary)
        manifest_response = requests.get(
            f"http://{registry}/v2/{args.catalog_package}/manifests/index",
            headers={"Accept": "application/vnd.oci.image.manifest.v1+json"},
            timeout=5,
        )
        if manifest_response.ok:
            client.pull(target=target, outdir=str(temporary_path), overwrite=True)
            existing_path = temporary_path / "index.json"
            if existing_path.is_file():
                index = read_json(existing_path)
        elif manifest_response.status_code == 404:
            print("No existing development index found; creating one")
        else:
            manifest_response.raise_for_status()

        for artifact in artifacts:
            operation_id = artifact.get("operation_id")
            version = artifact.get("version")
            package = artifact.get("package")
            if not all(isinstance(value, str) and value for value in (operation_id, version, package)):
                raise ValueError("Invalid artifact entry in publish-results.json")
            if PACKAGE_PATTERN.fullmatch(package) is None:
                raise ValueError(f"Invalid published package name: {package}")

            bundle_path = registry_dir / operation_id / version / "bundle.json"
            index[package] = index_entry(read_json(bundle_path))

        index_path = temporary_path / "index.json"
        index_path.write_text(json.dumps(index, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        previous_directory = Path.cwd()
        try:
            os.chdir(temporary_path)
            response = client.push(
                target=target,
                files=["index.json:application/json"],
                manifest_annotations={
                    "org.opencontainers.image.title": "BioChef Unsigned Development Index",
                    "biochef.index.environment": "development",
                    "biochef.index.signed": "false",
                },
            )
        finally:
            os.chdir(previous_directory)

    digest = response.headers.get("Docker-Content-Digest", "unknown")
    print(f"Published unsigned development index with {len(index)} entries: {target}@{digest}")


if __name__ == "__main__":
    main()
