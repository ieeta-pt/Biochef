#!/usr/bin/env python3

import argparse
import csv
import json
import os
import statistics
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

import psutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class WorkflowSeleniumTest:
    def __init__(self, headless=False):
        self.driver = None
        self.wait = None
        self.headless = headless
        self.baseline_chrome_memory = 0
        self.memory_monitor_active = False
        self.max_memory_growth = 0
        
    def setup_driver(self):
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        
        # Get BASELINE Chrome memory BEFORE any workflow activity
        self.baseline_chrome_memory = self._get_chrome_processes_memory()
        print(f"  Baseline Chrome memory: {self.baseline_chrome_memory:.2f} MB")

    def _get_chrome_processes_memory(self):
        """Get current Chrome processes memory usage in MB"""
        total_memory = 0
        
        for proc in psutil.process_iter(['pid', 'name', 'memory_info']):
            try:
                if proc.info['name'] and 'chrome' in proc.info['name'].lower():
                    memory_info = proc.info['memory_info']
                    total_memory += memory_info.rss / 1024 / 1024  # Convert to MB
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return total_memory

    def _memory_monitor_thread(self):
        """Background thread to monitor memory usage during workflow"""
        while self.memory_monitor_active:
            try:
                # Get current Chrome memory
                current_chrome_memory = self._get_chrome_processes_memory()
                
                # Calculate memory growth from baseline
                memory_growth = current_chrome_memory - self.baseline_chrome_memory
                
                # Track maximum growth
                self.max_memory_growth = max(self.max_memory_growth, memory_growth)
                
                time.sleep(0.1)  # Sample every 100ms
            except Exception:
                break

    def start_memory_monitoring(self):
        """Start monitoring memory growth during workflow execution"""
        self.memory_monitor_active = True
        self.max_memory_growth = 0  # Track growth from baseline
        
        print(f"  Starting workflow memory monitoring from baseline: {self.baseline_chrome_memory:.2f} MB")
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._memory_monitor_thread, daemon=True)
        monitor_thread.start()

    def stop_memory_monitoring(self):
        """Stop memory monitoring and return workflow memory growth"""
        self.memory_monitor_active = False
        time.sleep(0.2)  # Allow thread to finish
        
        # Get final Chrome memory
        final_chrome_memory = self._get_chrome_processes_memory()
        final_memory_growth = final_chrome_memory - self.baseline_chrome_memory
        
        # Use the maximum growth observed
        workflow_memory_usage = max(self.max_memory_growth, final_memory_growth)
        
        print(f"  Final Chrome memory: {final_chrome_memory:.2f} MB")
        print(f"  Workflow memory growth: {workflow_memory_usage:.2f} MB")
        
        return {
            'baseline_memory_mb': self.baseline_chrome_memory,
            'final_memory_mb': final_chrome_memory,
            'workflow_memory_growth_mb': workflow_memory_usage,
            'max_memory_growth_mb': self.max_memory_growth
        }
            
    def access_workflow_page(self):
        """Access localhost:8082/workflow and wait for page load"""
        print("Accessing localhost:8082/workflow...")
        self.driver.get("http://localhost:8082/workflow")
        
        # Wait for page to load by waiting for the body element
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        print("Page loaded successfully")
        
    def click_import_button(self):
        """Click on Import button using XPath"""
        print("Clicking Import button...")
        import_button_xpath = "/html/body/div/div[1]/div/div/div[2]/div/div[3]/button[2]"
        
        import_button = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, import_button_xpath))
        )
        import_button.click()
        print("Import button clicked")
        
    def click_config_modal_button(self):
        """Click on Config modal button after modal appears"""
        print("Clicking Config modal button...")
        config_button_xpath = "/html/body/div[2]/div[3]/div/div[1]/div[1]/div/div/div/button[2]"
        
        config_button = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, config_button_xpath))
        )
        config_button.click()
        print("Config modal button clicked")
        
    def click_upload_modal_button(self):
        """Click on Upload modal button"""
        print("Clicking Upload modal button...")
        upload_button_xpath = "/html/body/div[2]/div[3]/div/div[1]/div[2]/label"
        
        upload_button = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, upload_button_xpath))
        )
        upload_button.click()
        print("Upload modal button clicked")
        
    def upload_file(self, file_path=None):
        """Upload file functionality"""
        print("Uploading file...")
        
        # If no file path provided, use the test workflow JSON file
        if file_path is None:
            file_path = "/home/jake/Desktop/Uni/Bolsa/gto-wasm-app/tests/platform_test/BraLanc_464.json"
            
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        # Look for file input element (usually hidden)
        file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        file_input.send_keys(file_path)
        print(f"File uploaded: {file_path}")
        
    def click_final_import_button(self):
        """Click on final Import button"""
        print("Clicking final Import button...")
        final_import_xpath = "/html/body/div[2]/div[3]/div/div[2]/button[2]"
        
        final_import_button = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, final_import_xpath))
        )
        final_import_button.click()
        print("Final Import button clicked")
        
    def wait_for_output_change(self):
        """Wait for output element to change from 'No output available yet'"""
        print("Waiting for output to be generated...")
        output_xpath = "/html/body/div/div/div/div/div[2]/div/div[3]/div[2]/p"
        
        # Wait for the element to exist and not contain "No output available yet"
        def output_has_changed(driver):
            try:
                element = driver.find_element(By.XPATH, output_xpath)
                text = element.text
                return text != "No output available yet" and text.strip() != ""
            except:
                return False
        
        # Use a longer timeout for processing to complete
        wait_long = WebDriverWait(self.driver, 30)
        wait_long.until(output_has_changed)
        print("Output generated successfully!")
        
    def clear_localStorage_and_refresh(self):
        """Clear localStorage and refresh the page"""
        print("Clearing localStorage...")
        self.driver.execute_script("localStorage.clear();")
        
        print("Refreshing page...")
        self.driver.refresh()
        
        # Wait for page to reload
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        print("Page refreshed and reloaded")

    def teardown_driver(self):
        if self.driver:
            self.driver.quit()
        
    def run_complete_workflow_with_timing(self, file_path=None):
        """Run the complete workflow test with fair memory measurement"""
        runtime = 0
        success = False
        error_msg = ""
        memory_stats = {}
        
        try:
            self.setup_driver()  # This now sets baseline memory
            
            # Execute all steps up to final import button click
            self.access_workflow_page()
            time.sleep(1)
            
            self.click_import_button()
            time.sleep(1)
            
            self.click_config_modal_button()
            time.sleep(1)
            
            self.click_upload_modal_button()
            time.sleep(1)
            
            self.upload_file(file_path)
            time.sleep(1)
            
            # NOW start monitoring memory growth for WORKFLOW EXECUTION ONLY
            print("  Starting workflow memory monitoring...")
            self.start_memory_monitoring()
            start_time = time.time()
            
            self.click_final_import_button()
            self.wait_for_output_change()
            
            # End timing and memory monitoring when output changes
            end_time = time.time()
            memory_stats = self.stop_memory_monitoring()
            runtime = end_time - start_time
            
            self.clear_localStorage_and_refresh()
            time.sleep(1)
            
            success = True
            print(f"  Workflow completed successfully!")
            print(f"  Runtime: {runtime:.3f} seconds")
            print(f"  Workflow Memory Usage: {memory_stats['workflow_memory_growth_mb']:.2f} MB")
            
        except Exception as e:
            error_msg = str(e)
            print(f"  Error during workflow test: {error_msg}")
            
        finally:
            self.teardown_driver()
            
        return {
            'runtime': runtime,
            'success': success,
            'error': error_msg,
            'baseline_memory_mb': memory_stats.get('baseline_memory_mb', 0),
            'workflow_memory_mb': memory_stats.get('workflow_memory_growth_mb', 0),
            'max_memory_growth_mb': memory_stats.get('max_memory_growth_mb', 0)
        }



def run_performance_tests(test_mode="vs_local"):
    """Run performance tests for specified JSON files based on test mode"""
    # Define test files based on mode
    if test_mode == "vs_local":
        test_files = [
            "AllMis_2400.json",
            "BraLanc_464.json",
            "HomoSapiens_3300.json",
            "HydCol_1000.json"
        ]
    elif test_mode == "vs_galaxy":
        test_files = [
            "BraLanc_464_Galaxy.json"
        ]
    else:
        raise ValueError(f"Invalid test mode: {test_mode}. Use 'vs_local' or 'vs_galaxy'")
    
    platform_test_dir = "/home/jake/Desktop/Uni/Bolsa/gto-wasm-app/tests/platform_test"
    results = []
    
    print(f"Starting Selenium Workflow Performance Tests - {test_mode.upper()} Mode")
    print("=" * 60)
    
    for test_file in test_files:
        file_path = os.path.join(platform_test_dir, test_file)
        
        if not os.path.exists(file_path):
            print(f"Warning: {test_file} not found, skipping...")
            continue
            
        # Get file size for reference
        file_size = os.path.getsize(file_path)
        
        print(f"\nTesting {test_file} (Size: {file_size:,} bytes)")
        print("-" * 40)
        
        # Run 3 times for each file
        for run in range(1, 4):
            print(f"Run {run}/3:")
            
            test = WorkflowSeleniumTest(headless=False)
            result = test.run_complete_workflow_with_timing(file_path)

            # Store results
            test_result = {
                'file': test_file,
                'file_size_bytes': file_size,
                'run_number': run,
                'runtime_seconds': result['runtime'],
                'baseline_memory_mb': result['baseline_memory_mb'],
                'workflow_memory_mb': result['workflow_memory_mb'],  # This is what you compare to local 2MB
                'success': result['success'],
                'error': result['error'],
                'timestamp': datetime.now().isoformat()
            }
            results.append(test_result)
            
            if not result['success']:
                print(f"  Run {run} failed: {result['error']}")
            
            # Small delay between runs
            time.sleep(2)
    
    return results

def save_results_gto_format(results, test_mode="vs_local"):
    """Save results with fair memory comparison"""
    timestamp = datetime.now().isoformat()
    
    # Calculate statistics for each file
    stats_by_file = {}
    
    # Group results by file
    by_file = {}
    for result in results:
        file = result['file']
        if file not in by_file:
            by_file[file] = []
        by_file[file].append(result)
    
    # Calculate statistics for each file
    for file, file_results in by_file.items():
        successful_results = [r for r in file_results if r['success']]
        
        if successful_results:
            runtimes = [r['runtime_seconds'] for r in successful_results]
            workflow_memories = [r['workflow_memory_mb'] for r in successful_results]  # NEW
            
            # Calculate runtime statistics
            mean_runtime = statistics.mean(runtimes)
            std_runtime = statistics.stdev(runtimes) if len(runtimes) > 1 else 0.0
            min_runtime = min(runtimes)
            max_runtime = max(runtimes)
            
            # Calculate workflow memory statistics
            mean_workflow_memory = statistics.mean(workflow_memories)  # NEW
            std_workflow_memory = statistics.stdev(workflow_memories) if len(workflow_memories) > 1 else 0.0  # NEW
            min_workflow_memory = min(workflow_memories)  # NEW
            max_workflow_memory = max(workflow_memories)  # NEW
            
            success_rate = len(successful_results) / len(file_results)
            
            stats_by_file[file] = {
                'mean_runtime': mean_runtime,
                'std_runtime': std_runtime,
                'min_runtime': min_runtime,
                'max_runtime': max_runtime,
                'mean_workflow_memory': mean_workflow_memory,  # NEW - comparable to local
                'std_workflow_memory': std_workflow_memory,   # NEW
                'min_workflow_memory': min_workflow_memory,   # NEW
                'max_workflow_memory': max_workflow_memory,   # NEW
                'success_rate': success_rate
            }
        else:
            # All runs failed
            stats_by_file[file] = {
                'mean_runtime': 0.0,
                'std_runtime': 0.0,
                'min_runtime': 0.0,
                'max_runtime': 0.0,
                'mean_workflow_memory': 0.0,  # NEW
                'std_workflow_memory': 0.0,   # NEW
                'min_workflow_memory': 0.0,   # NEW
                'max_workflow_memory': 0.0,   # NEW
                'success_rate': 0.0
            }
    
    # Save to CSV in GTO format with mode-specific filename
    csv_filename = f"platform_performance_{test_mode}.csv"
    csv_path = os.path.join("/home/jake/Desktop/Uni/Bolsa/gto-wasm-app/tests/platform_test", csv_filename)
    
    with open(csv_path, 'w', newline='') as csvfile:
        csvfile.write("# Platform Performance Results\n")
        csvfile.write(f"# Platform: web_browser_selenium_{test_mode}\n")
        csvfile.write(f"# Timestamp: {timestamp}\n")
        csvfile.write(f"# Description: Web platform workflow performance test using Selenium, {test_mode} mode, 3 iterations per file\n")
        csvfile.write("\n")
        csvfile.write("test_file,mean_runtime_s,std_runtime_s,mean_workflow_memory_mb,std_workflow_memory_mb,success_rate\n")
        
        for file, stats in stats_by_file.items():
            csvfile.write(f"{file},{stats['mean_runtime']:.3f},{stats['std_runtime']:.3f},"
                         f"{stats['mean_workflow_memory']:.2f},{stats['std_workflow_memory']:.2f},"
                         f"{stats['success_rate']:.1f}\n")
    
    # Save to JSON in GTO format with mode-specific filename
    json_filename = f"platform_performance_{test_mode}.json"
    json_path = os.path.join("/home/jake/Desktop/Uni/Bolsa/gto-wasm-app/tests/platform_test", json_filename)

    json_data = {
        "metadata": {
            "timestamp": timestamp,
            "platform": f"web_browser_selenium_{test_mode}",
            "description": f"Web platform workflow performance test using Selenium, {test_mode} mode, fair memory measurement",
            "workflow_steps": [
                "click_import_button",
                "click_config_modal_button",
                "click_upload_modal_button",
                "upload_file",
                "click_final_import_button",
                "wait_for_output_change"
            ],
            "measurement_method": "selenium_webdriver_memory_growth",
            "memory_note": "Measures workflow memory growth only, comparable to local execution"
        },
        "results": {}
    }
    
    for file, stats in stats_by_file.items():
        json_data["results"][file] = {
            "mean_runtime": round(stats['mean_runtime'], 3),
            "std_runtime": round(stats['std_runtime'], 3),
            "min_runtime": round(stats['min_runtime'], 3),
            "max_runtime": round(stats['max_runtime'], 3),
            "mean_workflow_memory": round(stats['mean_workflow_memory'], 2),  # NEW
            "std_workflow_memory": round(stats['std_workflow_memory'], 2),   # NEW
            "min_workflow_memory": round(stats['min_workflow_memory'], 2),   # NEW
            "max_workflow_memory": round(stats['max_workflow_memory'], 2),   # NEW
            "success_rate": round(stats['success_rate'], 1)
        }
    
    with open(json_path, 'w') as jsonfile:
        json.dump(json_data, jsonfile, indent=2)
    
    print(f"\nResults saved in GTO format to:")
    print(f"  CSV: {csv_path}")
    print(f"  JSON: {json_path}")
    
    return csv_path, json_path

def display_summary(results):
    """Display performance summary"""
    if not results:
        print("No results to display")
        return
    
    print("\n" + "=" * 60)
    print("PERFORMANCE RESULTS SUMMARY")
    print("=" * 60)
    
    # Group by file
    by_file = {}
    for result in results:
        file = result['file']
        if file not in by_file:
            by_file[file] = []
        by_file[file].append(result)
    
    for file, file_results in by_file.items():
        successful_results = [r for r in file_results if r['success']]
        
        if successful_results:
            runtimes = [r['runtime_seconds'] for r in successful_results]
            workflow_memories = [r['workflow_memory_mb'] for r in successful_results]
            
            avg_runtime = sum(runtimes) / len(runtimes)
            min_runtime = min(runtimes)
            max_runtime = max(runtimes)
            
            avg_workflow_memory = sum(workflow_memories) / len(workflow_memories)
            max_workflow_memory = max(workflow_memories)
            
            print(f"\n{file}:")
            print(f"  Successful runs: {len(successful_results)}/3")
            print(f"  Runtime - Avg: {avg_runtime:.3f}s, Min: {min_runtime:.3f}s, Max: {max_runtime:.3f}s")
            print(f"  Workflow Memory - Avg: {avg_workflow_memory:.2f}MB, Max: {max_workflow_memory:.2f}MB")
            print(f"  Individual runs: {[f'{r:.3f}s/{m:.2f}MB' for r, m in zip(runtimes, workflow_memories)]}")
        else:
            print(f"\n{file}: All runs failed")

def main():
    """Main function to run the performance tests"""
    parser = argparse.ArgumentParser(description="Selenium Workflow Performance Test")
    parser.add_argument(
        "--mode", 
        choices=["vs_local", "vs_galaxy"], 
        default="vs_local",
        help="Test mode: 'vs_local' uses AllMis_2400.json, BraLanc_464.json, HomoSapiens_3300.json, HydCol_1000.json; 'vs_galaxy' uses BraLanc_464_Galaxy.json"
    )
    
    args = parser.parse_args()
    
    try:
        # Run performance tests with specified mode
        results = run_performance_tests(test_mode=args.mode)
        
        # Save results in GTO format
        save_results_gto_format(results, test_mode=args.mode)
        
        # Display summary
        display_summary(results)
        
        print(f"\nPerformance testing completed in {args.mode} mode!")
        return 0
        
    except Exception as e:
        print(f"Error during performance testing: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())