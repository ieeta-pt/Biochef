export const importRecipeConfigFile = (
    file,
    setWorkflow,
    setInputData,
    setInputDataType,
    showNotification,
    setOpenImportDialog,
    setTabIndex,
    tree,
    setTree,
    setSelectedFiles,
) => {
    const reader = new FileReader();

    const addFileToTree = (pathParts, fileNode, tree) => {
        if (pathParts.length === 1) {
            // Base case: add the file node
            tree.push(fileNode);
            return;
        }

        const folderName = pathParts.shift();
        // Check if the folder already exists in the current level of the tree
        let folder = tree.find(item => item.type === 'folder' && item.name === folderName);

        if (!folder) {
            folder = {
                id: `${folderName}-${Date.now()}`,
                name: folderName,
                type: 'folder',
                children: [],
            };
            tree.push(folder);
        }
        // Recursively add the file to the subfolder
        addFileToTree(pathParts, fileNode, folder.children);
    };

    const processInputFiles = (
        files,
        setInputData,
        setTabIndex,
        tree,
        setTree,
        setSelectedFiles,
        showNotification
    ) => {
        try {
            setTabIndex(1);

            const processedFiles = files.map(file => ({
                id: `${file.name}-${Date.now()}`,
                name: file.name,
                type: "file",
                fileType: file.fileType,
                content: file.content,
                size: file.content.length,
                lastModified: new Date(),
                relativePath: file.relativePath || file.name
            }));

            const newFilesTree = [];
            processedFiles.forEach(file => {
                // Usa o relativePath para determinar a estrutura de pastas
                const pathParts = file.relativePath.includes('/')
                    ? file.relativePath.split('/')
                    : [file.name];

                // Cria uma cópia do ficheiro para adicionar à árvore
                addFileToTree([...pathParts], file, newFilesTree);
            });

            setTree(prev => ({
                ...prev,
                children: [...(prev.children || []), ...newFilesTree]
            }));

            setSelectedFiles((prevSelectedFiles) => {
                return new Set([...prevSelectedFiles, ...processedFiles]);
            });

            showNotification(`${processedFiles.length} file(s) imported successfully.`, 'success');
        } catch (error) {
            console.error('Error processing input files:', error);
            showNotification('Failed to process input files.', 'error');
        }
    };

    // Handle the file reading
    reader.onload = (event) => {
        try {
            // Parse the configuration file
            const config = JSON.parse(event.target.result);

            // Validate the configuration file format
            if (!config.workflow || !config.workflow.input || !config.workflow.tools) {
                throw new Error('Invalid configuration file format.');
            }

            if (config.workflow && config.workflow.input) {
                setWorkflow(config.workflow.tools);
                setInputDataType(config.workflow.input.format);

                if (config.workflow.input.files && config.workflow.input.files.length > 0) {
                    processInputFiles(
                        config.workflow.input.files,
                        setInputData,
                        setTabIndex,
                        tree,
                        setTree,
                        setSelectedFiles,
                        showNotification
                    );
                } else if (config.workflow.input.data) {
                    setInputData(config.workflow.input.data);
                }

                showNotification('Workflow imported successfully!', 'success');
                setOpenImportDialog(false);
            }

            showNotification('Workflow imported successfully!', 'success');
            setOpenImportDialog(false); // Close the import dialog
        } catch (error) {
            console.error('Error importing workflow:', error);
            showNotification(
                `Failed to import workflow: ${error.message}`,
                'error'
            );
        }
    };

    // Handle file reading errors
    reader.onerror = (error) => {
        console.error('File reading error:', error);
        showNotification('Failed to read the file.', 'error');
    };

    // Start reading the file
    reader.readAsText(file);
};