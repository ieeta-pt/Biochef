import {
  Box, TextField, Typography,
  Button, Menu, MenuItem
} from '@mui/material';
import React, { useState } from 'react';
import { getAllTypeExampleInputs, getTypeExampleInput } from '../utils/typeDefinitions';

const CLIInputPanel = ({ inputData, setInputData }) => {
  const [exampleMenuAnchor, setExampleMenuAnchor] = useState(null);
  const exampleInputs = getAllTypeExampleInputs();

  function handleInputChange(event) {
    const newInputValue = event.target.value
    setInputData(newInputValue)
  }

  return (
    <Box sx={{
      height: "100%",
      display: 'flex',
      flexDirection: 'column',
      padding: 2,
    }}>

      <Menu
        anchorEl={exampleMenuAnchor}
        open={Boolean(exampleMenuAnchor)}
        onClose={(e) => setExampleMenuAnchor(null)}

        // appear above the anchor
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}

        // grow upward
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}

        // same width as the anchor
        slotProps={{
          paper: {
            sx: {
              width: exampleMenuAnchor?.clientWidth,
            },
          },
        }}
      >
        {Object.keys(exampleInputs).map((format) => (
          <MenuItem
            key={format}
            onClick={() => {
              setInputData(getTypeExampleInput(format))
              setExampleMenuAnchor(null);
            }}
          >
            {format}
          </MenuItem>
        ))}
      </Menu>

      <TextField
        variant="outlined"
        value={inputData}
        onChange={handleInputChange}
        placeholder="e.g., >Sequence1\nACGT..."
        InputProps={{
          multiline: true,
          inputComponent: 'textarea',
          sx: {
            height: "100%",
            alignItems: "stretch",
          },
        }}
        sx={{
          height: "100%"
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 2,
        }}
      >
        {/*
          NOTE(andrade)
          This might cause performance issues doing the replace for strings that are very long
        */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" color="textSecondary">
            {inputData.replace(/\n/g, '').length} characters
          </Typography>

          <Typography variant="caption" color="textSecondary">
            {inputData === '' ? 0 : inputData.split('\n').length} lines
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={(e) => setExampleMenuAnchor(e.currentTarget)}
        >
          Load Example Input
        </Button>
      </Box>
    </Box>
  )

};

export default CLIInputPanel;
