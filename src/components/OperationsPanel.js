import { AddCircle, Block } from '@mui/icons-material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import debounce from 'lodash.debounce';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { ValidationErrorsContext } from '../contexts/ValidationErrorsContext';
import { getCompatibleTools } from '../utils/compatibility';
import operationCategories from '../utils/operationCategories';


const OperationsPanel = ({ onAddOperation, isWorkflowEmpty, isLoading, setIsLoading, insertAtIndex, setInsertAtIndex, addingATool, setAddingATool, filteredTools, setFilteredTools, selectedFiles, tabIndex }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const { dataType } = useContext(DataTypeContext);
  const showNotification = useContext(NotificationContext);
  const { validationErrors } = useContext(ValidationErrorsContext); // Access validation errors
  const hasValidationErrors = Object.values(validationErrors).some(error => Object.keys(error).length > 0);
  const noFilesSelected = tabIndex === 1 && selectedFiles.size === 0;
  const shouldDisableInteraction = hasValidationErrors || noFilesSelected;

  // Debounced search handler
  const handleSearch = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

  const onChange = (e) => {
    handleSearch(e.target.value);
  };

  const handleCategoryClick = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Filter operations based on search term
  const filterOperations = (operations) => {
    return operations.filter(
      (op) =>
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Determine compatible tools
  const compatibleTools = useMemo(() => {
    if (isWorkflowEmpty) {
      // Execute getCompatibleTools even if dataType is 'UNKNOWN' when the workflow is empty
      const compatible = getCompatibleTools(dataType, isWorkflowEmpty);
      return new Set(compatible.map((tool) => tool.name.replace(/^gto_/, '')));
    }

    if (!dataType || dataType === 'UNKNOWN') return new Set();
    const compatible = getCompatibleTools(dataType, isWorkflowEmpty);
    // Assuming tool names in operationCategories do not have the 'gto_' prefix
    return new Set(compatible.map((tool) => tool.name.replace(/^gto_/, '')));
  }, [dataType, isWorkflowEmpty]);

  // Expand categories with available tools
  useEffect(() => {
    if (insertAtIndex === null) {
      const newExpandedCategories = {};
      Object.entries(operationCategories).forEach(([category, operations]) => {
        const filteredOps = filterOperations(operations).filter((op) => compatibleTools.has(op.name));
        if (filteredOps.length > 0) {
          newExpandedCategories[category] = true;
        }
      });
      setExpandedCategories(newExpandedCategories);
    }
  }, [searchTerm, compatibleTools, insertAtIndex]);

  useEffect(() => {
    if (insertAtIndex !== null && filteredTools.length > 0) {
      const newExpandedCategories = {};
      Object.entries(operationCategories).forEach(([category, operations]) => {
        const filteredOps = operations.filter((op) =>
          filteredTools.some((tool) => tool.name === `gto_${op.name}`)
        );
        if (filteredOps.length > 0) {
          newExpandedCategories[category] = true;
        }
      });
      setExpandedCategories(newExpandedCategories);
    }
  }, [insertAtIndex, filteredTools]);

  const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(0, 123, 255, 0.1);
  }
  50% {
    transform: scale(1.01);
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(0, 123, 255, 0.1);
  }
`;

  return (
    <Paper elevation={3} sx={{ padding: 2, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {insertAtIndex !== null && addingATool && (
        <Box
          sx={{
            padding: 2,
            marginBottom: 2,
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            border: '1px solid rgba(0, 123, 255, 0.3)',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: `${pulseAnimation} 1.5s infinite ease-in-out`,
          }}
        >
          <Typography variant="body2" color="textSecondary">
            Adding a new tool to the workflow. Click on a tool to insert it at the selected position or{' '}
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <Button
                onClick={() => {
                  setInsertAtIndex(null);
                  setAddingATool(false);
                  setFilteredTools([]);
                }}
                color="primary"
                sx={{ textTransform: 'none', padding: 0, minWidth: 'auto' }}
              >
                cancel
              </Button>
            </Box>.
          </Typography>
        </Box>
      )}

      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Overlay to block interaction */}
      {shouldDisableInteraction && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: hasValidationErrors ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)',
            zIndex: 10,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {hasValidationErrors && (
              <>
                <Block sx={{
                  color: 'error.main',
                  fontSize: 60,
                }} />
                <Typography variant="body1" sx={{ color: 'error.main', textAlign: 'center' }}>
                  Correct the invalid parameters in the workflow to unlock the unavailable features.
                </Typography>
              </>
          )}
        </Box>
      )}

      <Typography variant="h6" align="center" gutterBottom>
        Available Tools
      </Typography>
      <TextField
        label="Search Operations"
        variant="outlined"
        size="small"
        fullWidth
        onChange={onChange}
        sx={{ marginBottom: 2 }}
      />
      <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {Object.entries(operationCategories).map(([category, operations]) => {
          const filteredOps = insertAtIndex !== null
            ? operations.filter((op) =>
              filteredTools.some((tool) => tool.name === `gto_${op.name}`)
            )
            : filterOperations(operations).filter((op) => compatibleTools.has(op.name));
          if (filteredOps.length === 0 && searchTerm !== '') return null;

          return (
            <React.Fragment key={category}>
              <ListItemButton onClick={() => handleCategoryClick(category)}>
                <ListItemText primary={`${category} (${filteredOps.length})`} />
                {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={expandedCategories[category] || searchTerm !== ''} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {filteredOps.map((operation) => (
                    <Tooltip
                      key={operation.name}
                      title={
                        <React.Fragment>
                          {operation.description.split('\n').map((line, index) => (
                            <Typography key={index} variant="body2" color="inherit">
                              {line}
                            </Typography>
                          ))}
                        </React.Fragment>
                      }
                      placement="right">
                      <ListItemButton
                        sx={{
                          pl: 4,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2), // Use primary color with 10% opacity
                          '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.4), // Slightly darker on hover
                          },
                        }}
                        onClick={() => {
                          setIsLoading(true);
                          if (insertAtIndex !== null && addingATool) {
                            onAddOperation(operation.name, insertAtIndex);
                            // setInsertAtIndex(null);
                            setFilteredTools([]);
                            setAddingATool(false);
                            showNotification('Tool added successfully!', 'success');
                          } else {
                            onAddOperation(operation.name);
                          }
                        }}
                      >
                        <ListItemText primary={operation.name} />
                        <AddCircle sx={{ color: 'primary.main', ml: 'auto' }} />
                      </ListItemButton>
                    </Tooltip>
                  ))}
                </List>
              </Collapse>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
};

export default OperationsPanel;