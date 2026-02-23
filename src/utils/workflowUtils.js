export function sanitizeWorkflowNodes(nodes) {
    return nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            output: "",
            outputs: {},
        },
    }));
}