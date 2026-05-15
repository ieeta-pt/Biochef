import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  Tooltip,
  Button,
  Collapse
} from '@mui/material';

const ToolParameterSection = ({ toolConfig, parameters, validationErrors, helpMessages, handleParameterChange, toggleParameter }) => {
  const [requiredOpen, setRequiredOpen] = useState(true);
  const [optionalOpen, setOptionalOpen] = useState(true);

  if (!toolConfig) return null;

  const renderParam = (paramName, isOptional = false) => {
    const paramConfig = toolConfig.parameters.find((p) => p.name === paramName);
    const paramValue = parameters?.[paramName]?.value ?? "";
    const paramActive = parameters?.[paramName]?.enabled ?? false;
    const error = validationErrors[paramName] || '';
    const flagHelpMessages = (helpMessages?.flags) || {};

    return (
      <Box
        key={paramName}
        sx={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 1,
          gap: 2,
        }}
      >
        {/* Name and Switch*/}
        <FormControlLabel
          control={
            isOptional ? (
              <Switch
                checked={paramActive}
                onChange={(e) =>
                  toggleParameter(paramConfig.name)
                }
                color="primary"
              />
            ) : (
              <span />
            )
          }
          label={
            <Tooltip
              // title={flagHelpMessages[paramName] || 'Loading help message...'}
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    maxWidth: 300,
                    whiteSpace: 'pre-wrap',
                  },
                },
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>
                {paramName} {!isOptional && <span style={{ color: 'red' }}>*</span>}
              </span>
            </Tooltip>
          }
          sx={{ alignItems: 'center', margin: 0 }}
        />

        {/* Input */}
        {(!isOptional || paramActive) && paramConfig.type != "flag" && (
          paramConfig.type === 'file' ? (
            <>
              <Button variant="outlined" component="label" size="small">
                {paramValue ? 'Change File' : 'Upload File'}
                <input
                  type="file"
                  hidden
                  onChange={(e) =>
                    handleParameterChange(paramConfig.name, e.target.files[0])
                  }
                />
              </Button>
              {paramValue && (
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {paramValue.name || paramValue}
                </Typography>
              )}
            </>
          ) : (
            <TextField
              value={paramValue}
              onChange={(e) => handleParameterChange(paramConfig.name, e.target.value)}
              size="small"
              label={paramConfig.type}
              error={!!error}
              helperText={error}
              sx={{
                flexGrow: 1,
                alignSelf: 'center',
                '& .MuiOutlinedInput-root': {
                  borderColor: error ? 'red' : 'default',
                },
                '& .MuiOutlinedInput-notchedOutline': error
                  ? {
                    borderColor: 'red',
                    borderWidth: '1px',
                  }
                  : {},
              }}
              type={
                paramConfig.type === 'integer' || paramConfig.type === 'float'
                  ? 'number'
                  : 'text'
              }
              inputProps={
                paramConfig.type === 'integer' || paramConfig.type === 'float'
                  ? { step: 'any' }
                  : {}
              }
            />
          )
        )}
      </Box>
    );
  };

  const requiredParams = toolConfig.parameters.filter((param) => param.required && !param.hidden);
  const optionalParams = toolConfig.parameters.filter((param) => !param.required && !param.hidden);

  return (
    <Box sx={{ mt: 1 }}>
      {/* Required Parameters */}
      {requiredParams.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }} onClick={() => setRequiredOpen(!requiredOpen)}>
            Required Parameters
          </Typography>
          <Collapse in={requiredOpen}>
            {requiredParams.map((param) => renderParam(param.name))}
          </Collapse>
        </Box>
      )}

      {/* Optional Parameters */}
      {optionalParams.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, color: 'text.secondary' }} onClick={() => setOptionalOpen(!optionalOpen)}>
            Optional Parameters
          </Typography>
          <Collapse in={optionalOpen}>
            {optionalParams.map((param) => renderParam(param.name, true))}
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

export default ToolParameterSection;
