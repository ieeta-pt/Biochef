# gto-wasm-app/generate_wrapper.py
import os
import sys

from jinja2 import Environment, FileSystemLoader, TemplateError


def camel_case(snake_str):
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)

def main():
    if len(sys.argv) != 5:
        print("Usage: python generate_wrapper.py <tool_name> <input_type> <output_type> <is_multi_output>")
        sys.exit(1)


    tool_name = sys.argv[1]
    input_type = sys.argv[2].lower()
    output_type = sys.argv[3].lower()
    is_multi_output = sys.argv[4].lower() == 'true'

    # Validate input_type and output_type
    valid_input_types = ['stdin', 'file']  # Allow empty input_type
    valid_output_types = ['stdout', 'file']
    if input_type not in valid_input_types:
        print(f"Error: Invalid input_type '{input_type}'. Must be one of {valid_input_types}.")
        sys.exit(1)
    if output_type not in valid_output_types:
        print(f"Error: Invalid output_type '{output_type}'. Must be one of {valid_output_types}.")
        sys.exit(1)

    tool_name_camel = camel_case(tool_name)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    wasm_dir = os.path.join(script_dir, 'public', 'wasm')
    os.makedirs(wasm_dir, exist_ok=True)

    env = Environment(loader=FileSystemLoader(script_dir), trim_blocks=True, lstrip_blocks=True)
    try:
        template = env.get_template('wrapper_template.js.j2')
    except TemplateError as e:
        print(f"Error loading template: {e}")
        sys.exit(1)

    try:
        output = template.render(
            tool_name=tool_name,
            tool_name_camel=tool_name_camel,
            input_type=input_type,
            output_type=output_type,
            is_multi_output=is_multi_output,
            is_file_based=(input_type == 'file')
        )
    except TemplateError as e:
        print(f"Error rendering template: {e}")
        sys.exit(1)

    # Save the rendered output to a temporary file for debugging
    temp_output_file = os.path.join(wasm_dir, f"{tool_name}_wrapper_temp.js")
    with open(temp_output_file, 'w') as temp_f:
        temp_f.write(output)
    print(f"Rendered wrapper (temporary) saved at: {temp_output_file}")

    # Now save the final wrapper file
    wrapper_file = os.path.join(wasm_dir, f"{tool_name}_wrapper.js")
    with open(wrapper_file, 'w') as f:
        f.write(output)

    print(f"Generated wrapper for {tool_name} at {wrapper_file}")

if __name__ == "__main__":
    main()