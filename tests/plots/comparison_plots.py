#!/usr/bin/env python3

import json

import matplotlib.pyplot as plt
import numpy as np


def load_results():
    """Load both local and platform results"""
    # Load local results
    with open('../local_test/gto_performance_local.json', 'r') as f:
        local_data = json.load(f)
    
    # Load platform results
    with open('../platform_test/platform_performance.json', 'r') as f:
        platform_data = json.load(f)
    
    return local_data, platform_data

def create_comparison_plots():
    """Create simple comparison plots"""
    local_data, platform_data = load_results()
    
    # Extract data for plotting
    files = ['Alli. Missi.', 'Branch. Lance.', 'Homo Sapiens', 'Hydro. Coll.']
    local_runtimes = []
    platform_runtimes = []
    local_memories = []
    platform_memories = []
    
    # Map file names
    file_mapping = {
        'Alli. Missi.': ('AllMis_2400_parcial.fasta', 'AllMis_2400.json'),
        'Branch. Lance.': ('BraLanc_464_parcial.fasta', 'BraLanc_464.json'),
        'Homo Sapiens': ('HomoSapiens_3300_parcial.fasta', 'HomoSapiens_3300.json'),
        'Hydro. Coll.': ('HydCol_1000_parcial.fasta', 'HydCol_1000.json')
    }

    for file_type in files:
        local_file, platform_file = file_mapping[file_type]
        
        # Get local data
        local_runtime = local_data['results'][local_file]['mean_runtime']
        local_memory = local_data['results'][local_file]['mean_memory']
        
        # Get platform data
        platform_runtime = platform_data['results'][platform_file]['mean_runtime']
        platform_memory = platform_data['results'][platform_file]['mean_workflow_memory']
        
        local_runtimes.append(local_runtime)
        platform_runtimes.append(platform_runtime)
        local_memories.append(local_memory)
        platform_memories.append(platform_memory)
    
    # Create plots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    # Runtime comparison
    x = np.arange(len(files))
    
    ax1.plot(x, local_runtimes, 'o-', label='Local', linewidth=2, markersize=8, color='blue')
    ax1.plot(x, platform_runtimes, 's-', label='Platform', linewidth=2, markersize=8, color='red')
    
    ax1.set_xlabel('Partial File (0.81MB)')
    ax1.set_ylabel('Runtime (seconds)')
    ax1.set_title('Runtime Comparison: Local vs Platform')
    ax1.set_xticks(x)
    ax1.set_xticklabels(files)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Add runtime values as annotations
    for i, (local, platform) in enumerate(zip(local_runtimes, platform_runtimes)):
        ax1.annotate(f'{local:.3f}s', (i, local), textcoords="offset points", 
                    xytext=(0,10), ha='center', fontsize=9, color='blue', weight='bold')
        ax1.annotate(f'{platform:.3f}s', (i, platform), textcoords="offset points", 
                    xytext=(0,-15), ha='center', fontsize=9, color='red', weight='bold')
    
    # Memory comparison
    ax2.plot(x, local_memories, 'o-', label='Local', linewidth=2, markersize=8, color='blue')
    ax2.plot(x, platform_memories, 's-', label='Platform', linewidth=2, markersize=8, color='red')
    
    ax2.set_xlabel('Partial File (0.81MB)')
    ax2.set_ylabel('Memory Usage (MB)')
    ax2.set_title('Memory Comparison: Local vs Platform')
    ax2.set_xticks(x)
    ax2.set_xticklabels(files)
    ax2.legend(loc='center right')
    ax2.grid(True, alpha=0.3)
    
    # Add memory values as annotations
    for i, (local, platform) in enumerate(zip(local_memories, platform_memories)):
        ax2.annotate(f'{local:.1f}MB', (i, local), textcoords="offset points", 
                    xytext=(0,10), ha='center', fontsize=9, color='blue', weight='bold')
        ax2.annotate(f'{platform:.1f}MB', (i, platform), textcoords="offset points", 
                    xytext=(0,-15), ha='center', fontsize=9, color='red', weight='bold')
    
    plt.tight_layout()
    plt.savefig('local_vs_platform_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    # Print summary statistics
    print("\nPERFORMANCE COMPARISON SUMMARY")
    print("=" * 50)
    
    for i, file_type in enumerate(files):
        runtime_ratio = platform_runtimes[i] / local_runtimes[i] if local_runtimes[i] > 0 else float('inf')
        memory_ratio = platform_memories[i] / local_memories[i] if local_memories[i] > 0 else float('inf')
        
        print(f"\n{file_type.upper()} FILE:")
        print(f"  Runtime:  Local {local_runtimes[i]:.3f}s vs Platform {platform_runtimes[i]:.3f}s ({runtime_ratio:.1f}x slower)")
        print(f"  Memory:   Local {local_memories[i]:.1f}MB vs Platform {platform_memories[i]:.1f}MB ({memory_ratio:.1f}x more)")

def main():
    """Main function to create all plots"""
    print("Creating performance comparison plots...")
    
    try:
        create_comparison_plots()
        
        print("\nPlot saved:")
        print("- local_vs_platform_comparison.png")
        
    except Exception as e:
        print(f"Error creating plots: {e}")
        print("Make sure you have both JSON files in the current directory:")
        print("- gto_performance_local.json")
        print("- platform_performance.json")

if __name__ == "__main__":
    main()