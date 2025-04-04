import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Delete, DragIndicator, HelpOutline, Save } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton, Menu,
  MenuItem, Paper, Tooltip, Typography,
} from '@mui/material';
import React, { useState } from 'react';

const SortableItem = ({ id, toolName, onDelete, onDeleteFromHere, children, isDragging, isInvalid, helpMessage, workflowLength, onPartialSave }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleConfirmOpen = (action) => {
    setDeleteAction(action);
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    setConfirmOpen(false);
    setDeleteAction(null);
  };

  const handleConfirmDelete = () => {
    onDeleteFromHere(id); // Delete from here downwards
    handleConfirmClose();
  };

  return (
    <Paper
      ref={setNodeRef}
      elevation={1}
      {...attributes}
      {...listeners}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition: 'transform 150ms ease, background-color 300ms ease, border-color 300ms ease', // Smooth transition for both color and transform
        marginBottom: '8px',
        padding: '8px',
        borderRadius: '4px',
        cursor: 'grab',
        backgroundColor: isDragging
          ? 'rgba(255, 255, 255, 0.8)'
          : isInvalid
            ? 'rgba(255, 0, 0, 0.1)' // Light red background for invalid items
            : 'white', // Default background
        border: isInvalid ? '1px solid red' : '1px solid transparent', // Red border for invalid items
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <DragIndicator sx={{ marginRight: 1, color: 'text.secondary' }} />
        <Typography variant="body1" sx={{ flexGrow: 1 }}>
          {toolName}
        </Typography>
        <Tooltip
          title={<pre style={{ whiteSpace: 'pre-wrap' }}>{helpMessage || 'Loading help...'}</pre>}
          arrow
          componentsProps={{
            tooltip: {
              sx: {
                maxWidth: 'none',
              },
            },
          }}
        >
          <IconButton size="small" sx={{ marginLeft: 1 }}>
            <HelpOutline fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Botão de Save Output Parcial */}
        <Tooltip title="Save Output">
          <IconButton onClick={onPartialSave} size="small">
            <Save />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete Operation">
          <IconButton onClick={handleMenuOpen} size="small">
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              onDelete(id);
            }}
          >
            Remove this operation
          </MenuItem>
          {workflowLength > 1 && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                handleConfirmOpen();
              }}
            >
              Remove from here downwards
            </MenuItem>
          )}
        </Menu>
      </Box>
      {children}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={handleConfirmClose}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this operation and all subsequent ones? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="secondary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SortableItem;
