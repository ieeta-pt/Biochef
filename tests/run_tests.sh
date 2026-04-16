#!/bin/bash

# GTO-WASM Performance Test Runner
# This script sets up the environment and runs all performance tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Starting GTO-WASM Performance Test Suite"
print_status "Working directory: $SCRIPT_DIR"

# Step 1: Create and activate virtual environment
print_status "Setting up Python virtual environment..."

if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"

# Step 2: Install dependencies
print_status "Installing dependencies from requirements.txt..."
if [ -f "requirements.txt" ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install jupyter nbconvert  # Additional dependencies for notebook execution
    print_success "Dependencies installed successfully"
else
    print_error "requirements.txt not found!"
    exit 1
fi

# Step 3: Check if local server is running
print_status "Checking if local server is running on localhost:8082..."
if curl -s http://localhost:8082 > /dev/null 2>&1; then
    print_success "Local server is running"
else
    print_warning "Local server is not running on localhost:8082"
    print_warning "Please start your GTO-WASM application server before running platform tests"
    echo "Press any key to continue anyway, or Ctrl+C to exit..."
    read -n 1
fi

# Step 4: Run local workflow tests
print_status "Running local workflow tests..."
echo "=================================================="
echo "STEP 1: LOCAL WORKFLOW TESTS"
echo "=================================================="

cd local_test
if [ -f "local_workflow_test.ipynb" ]; then
    print_status "Executing Jupyter notebook: local_workflow_test.ipynb"
    jupyter nbconvert --to notebook --execute --inplace local_workflow_test.ipynb
    print_success "Local workflow tests completed"
    
    # Check if results were generated
    if [ -f "gto_performance_local.json" ]; then
        print_success "Local test results saved to: $(pwd)/gto_performance_local.json"
    else
        print_warning "Local test results file not found"
    fi
else
    print_error "local_workflow_test.ipynb not found!"
    exit 1
fi

cd ..

# Step 5: Run platform tests vs local
print_status "Running platform tests (vs local mode)..."
echo "=================================================="
echo "PLATFORM VS LOCAL TESTS"
echo "=================================================="

cd platform_test
if [ -f "selenium_workflow_test.py" ]; then
    print_status "Running Selenium tests in vs_local mode..."
    python selenium_workflow_test.py --mode vs_local
    print_success "Platform vs local tests completed"
    
    # Check if results were generated
    if [ -f "platform_performance_vs_local.csv" ]; then
        print_success "Platform vs local CSV results saved to: $(pwd)/platform_performance_vs_local.csv"
    fi
    if [ -f "platform_performance_vs_local.json" ]; then
        print_success "Platform vs local JSON results saved to: $(pwd)/platform_performance_vs_local.json"
    fi
else
    print_error "selenium_workflow_test.py not found!"
    exit 1
fi

# Step 6: Run platform tests vs Galaxy
print_status "Running platform tests (vs Galaxy mode)..."
echo "=================================================="
echo "PLATFORM VS GALAXY TESTS"
echo "=================================================="

print_status "Running Selenium tests in vs_galaxy mode..."
python selenium_workflow_test.py --mode vs_galaxy
print_success "Platform vs Galaxy tests completed"

# Check if results were generated
if [ -f "platform_performance_vs_galaxy.csv" ]; then
    print_success "Platform vs Galaxy CSV results saved to: $(pwd)/platform_performance_vs_galaxy.csv"
fi
if [ -f "platform_performance_vs_galaxy.json" ]; then
    print_success "Platform vs Galaxy JSON results saved to: $(pwd)/platform_performance_vs_galaxy.json"
fi

print_warning "Skipping Galaxy comparison tests"

cd ..

# Step 7: Summary of results
echo ""
echo "=================================================="
echo "TEST RESULTS SUMMARY"
echo "=================================================="

print_success "All tests completed!"
echo ""
print_status "Generated result files:"

# Local test results
if [ -f "local_test/gto_performance_local.json" ]; then
    echo "  ✓ Local test results: $SCRIPT_DIR/local_test/gto_performance_local.json"
else
    echo "  ✗ Local test results: NOT FOUND"
fi

# Platform vs local results
if [ -f "platform_test/platform_performance_vs_local.csv" ]; then
    echo "  ✓ Platform vs Local CSV: $SCRIPT_DIR/platform_test/platform_performance_vs_local.csv"
else
    echo "  ✗ Platform vs Local CSV: NOT FOUND"
fi

if [ -f "platform_test/platform_performance_vs_local.json" ]; then
    echo "  ✓ Platform vs Local JSON: $SCRIPT_DIR/platform_test/platform_performance_vs_local.json"
else
    echo "  ✗ Platform vs Local JSON: NOT FOUND"
fi

# Platform vs Galaxy results
if [ -f "platform_test/platform_performance_vs_galaxy.csv" ]; then
    echo "  ✓ Platform vs Galaxy CSV: $SCRIPT_DIR/platform_test/platform_performance_vs_galaxy.csv"
else
    echo "  - Platform vs Galaxy CSV: Not generated (test may have been skipped)"
fi

if [ -f "platform_test/platform_performance_vs_galaxy.json" ]; then
    echo "  ✓ Platform vs Galaxy JSON: $SCRIPT_DIR/platform_test/platform_performance_vs_galaxy.json"
else
    echo "  - Platform vs Galaxy JSON: Not generated (test may have been skipped)"
fi

echo ""
print_status "Next steps:"
echo "  - Review the generated CSV and JSON files for performance metrics"
echo "  - Use plotting scripts in tests/plots/ to visualize results"
echo "  - Compare memory usage and runtime between different platforms"

echo ""
print_success "Test suite execution completed!"

# Deactivate virtual environment
deactivate

# Remove the virtual environment directory
rm -rf venv