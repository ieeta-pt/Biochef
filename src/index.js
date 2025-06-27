import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataTypeProvider } from './contexts/DataTypeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ValidationErrorsProvider } from './contexts/ValidationErrorsContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#009688', // Teal
    },
    secondary: {
      main: '#ff5722', // Deep Orange
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <DataTypeProvider>
          <ValidationErrorsProvider>
            <CssBaseline />
            <App />
          </ValidationErrorsProvider>
        </DataTypeProvider>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
