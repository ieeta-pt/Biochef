# GTO-WASM Performance Tests

This directory contains performance tests for comparing GTO execution across different platforms.

## Quick Start

1. Make sure your GTO-WASM app is running on `localhost:8082`
2. Run the test script:
   ```bash
   ./run_tests.sh
   ```

## What the script does

- Creates a Python virtual environment
- Installs dependencies from `requirements.txt`
- Runs local workflow tests (`local_test/local_workflow_test.ipynb`)
- Runs platform vs local tests (`platform_test/selenium_workflow_test.py --mode vs_local`)
- Runs platform vs Galaxy tests (`platform_test/selenium_workflow_test.py --mode vs_galaxy`)

## Requirements

- Python 3.x
- Chrome browser (for Selenium tests)
- GTO-WASM application running on localhost:8082

## Results

Test results are saved as:
- `local_test/gto_performance_local.json`
- `platform_test/platform_performance_vs_local.csv/json`
- `platform_test/platform_performance_vs_galaxy.csv/json`

## Manual Setup (if needed)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install jupyter nbconvert
```

Then run tests individually:
```bash
# Local tests
cd local_test
jupyter nbconvert --to notebook --execute --inplace local_workflow_test.ipynb

# Platform tests
cd ../platform_test
python selenium_workflow_test.py --mode vs_local
python selenium_workflow_test.py --mode vs_galaxy
```