import matplotlib.pyplot as plt
import numpy as np

# Set up the figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Define colors
biochef_color = '#2E86AB'  # Blue
galaxy_color = '#F24236'   # Orange-red

# Panel A - Runtime Comparison
platforms = ['BioChef', 'Galaxy']
runtimes = [3.44, 39]
runtime_errors = [0.17, 0]  # No error data for Galaxy

bars1 = ax1.bar(platforms, runtimes, 
                yerr=[runtime_errors[0], 0], 
                color=[biochef_color, galaxy_color],
                capsize=5, alpha=0.8, edgecolor='black', linewidth=1)

ax1.set_ylabel('Runtime (seconds)', fontsize=12, fontweight='bold')
ax1.set_title('A. Runtime Comparison', fontsize=14, fontweight='bold')
ax1.grid(True, alpha=0.3, axis='y')
ax1.set_ylim(0, 45)

# Add annotation for speed difference
# ax1.annotate('11.3× faster', 
#              xy=(0, 3.44), xytext=(0.5, 20),
#              arrowprops=dict(arrowstyle='->', color='black', lw=1.5),
#              fontsize=12, fontweight='bold', ha='center',
#              bbox=dict(boxstyle="round,pad=0.3", facecolor='lightgreen', alpha=0.7))

# Add value labels on bars
for i, (bar, runtime) in enumerate(zip(bars1, runtimes)):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height + (runtime_errors[i] if i == 0 else 1),
             f'{runtime:.2f}s' if i == 0 else f'{runtime}s',
             ha='center', va='bottom', fontweight='bold')

# Panel B - Memory Usage Comparison
# BioChef data
biochef_memory = 228.7
biochef_memory_error = 5.0

# Galaxy individual job data
galaxy_memory = [253.4, 246.4, 257.4, 253.6]
galaxy_avg = np.mean(galaxy_memory)
galaxy_std = np.std(galaxy_memory, ddof=1)  # Sample standard deviation

# Create simple bar chart
platforms_mem = ['BioChef', 'Galaxy']
memory_values = [biochef_memory, galaxy_avg]
memory_errors = [biochef_memory_error, galaxy_std]

bars2 = ax2.bar(platforms_mem, memory_values, 
                yerr=memory_errors, 
                color=[biochef_color, galaxy_color],
                capsize=5, alpha=0.8, edgecolor='black', linewidth=1)

ax2.set_ylabel('Memory Usage (MB)', fontsize=12, fontweight='bold')
ax2.set_title('B. Memory Usage Comparison', fontsize=14, fontweight='bold')
ax2.grid(True, alpha=0.3, axis='y')
ax2.set_ylim(200, 280)

# Add annotation for similar memory footprint
# ax2.annotate('Similar memory\nfootprint', 
#              xy=(0.5, 240), xytext=(0.5, 265),
#              ha='center', fontsize=12, fontweight='bold',
#              bbox=dict(boxstyle="round,pad=0.3", facecolor='lightblue', alpha=0.7))

# Add value labels on bars
for i, (bar, mem_val, mem_err) in enumerate(zip(bars2, memory_values, memory_errors)):
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height + mem_err + 2,
             f'{mem_val:.1f} MB\n(±{mem_err:.1f})',
             ha='center', va='bottom', fontweight='bold')

# Overall figure adjustments
plt.tight_layout()

# Add overall title and dataset info
fig.suptitle('Performance Comparison: BioChef vs Galaxy\nGeneric Workflow Execution', 
             fontsize=16, fontweight='bold', y=0.98)

# Add dataset annotation
fig.text(0.5, 0.02, 'Dataset: Branchiostoma lanceolatum (partial genome)\nWorkflow: FASTA Complement → FASTA Reverse → FASTA Split → FASTA Extract', 
         ha='center', fontsize=10, style='italic')

# Adjust layout to accommodate annotations
plt.subplots_adjust(top=0.85, bottom=0.15)

# Display the plot
# plt.show()

# Optional: Save the figure
# plt.savefig('biochef_galaxy_comparison.pdf', dpi=300, bbox_inches='tight')
plt.savefig('biochef_galaxy_comparison.png', dpi=300, bbox_inches='tight')