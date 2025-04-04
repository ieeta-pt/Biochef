import { Alert, Snackbar } from '@mui/material';
import React, { createContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, severity = 'info') => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, severity, open: true }]);
  };

  const handleClose = (id) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, open: false } : notification
    ));
    setTimeout(() => {
      setNotifications(notifications => notifications.filter(notification => notification.id !== id));
    }, 600);
  };

  return (
    <NotificationContext.Provider value={showNotification}>
      {children}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          style={{ top: `${index * 60}px` }} // Adjust the spacing between notifications
        >
          <Alert onClose={() => handleClose(notification.id)} severity={notification.severity} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};