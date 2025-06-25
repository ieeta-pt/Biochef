#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int real_main(int argc, char **argv);

// Check if the tool needs stdin by looking at its name
int needs_stdin(int argc, char **argv)
{
    // If help flag is present, don't need stdin
    for (int i = 1; i < argc; i++)
    {
        if (strcmp(argv[i], "-h") == 0)
        {
            return 0;
        }
    }

    // Get the tool name from argv[0]
    const char *tool_name = argv[0];
    // Remove path if present
    const char *last_slash = strrchr(tool_name, '/');
    if (last_slash)
    {
        tool_name = last_slash + 1;
    }

    // Tools that don't use stdin
    const char *no_stdin_tools[] = {
        "min",
        "max",
        "genomic_gen_random_dna",
        "fasta_merge_streams"};

    // Check if this tool is in the no_stdin_tools list
    for (int i = 0; i < sizeof(no_stdin_tools) / sizeof(no_stdin_tools[0]); i++)
    {
        if (strcmp(tool_name, no_stdin_tools[i]) == 0)
        {
            return 0;
        }
    }

    // All other tools use stdin
    return 1;
}

int main(int argc, char **argv)
{
    // Set stdout and stderr to unbuffered mode
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);

    // Only reopen stdin if the tool needs it
    if (needs_stdin(argc, argv))
    {
        FILE *input = freopen("input.txt", "r", stdin);
        if (!input)
        {
            perror("Failed to open input.txt");
            return 1;
        }
    }

    int result = real_main(argc, argv);

    // Flush stdout and stderr to ensure all output is captured
    fflush(stdout);
    fflush(stderr);

    return result;
}