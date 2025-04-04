import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import {
    Collapse,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import debounce from 'lodash.debounce';
import React, { useContext, useMemo, useState } from 'react';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import operationCategories from '../utils/operationCategories';


const AllOperationsPanel = ({ onToolClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});
    const { dataType } = useContext(DataTypeContext);
    const showNotification = useContext(NotificationContext);

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

    return (
        <Paper elevation={3} sx={{ padding: 2, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Typography variant="h6" align="center" gutterBottom>
                All Tools
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
                    const filteredOps = filterOperations(operations);
                    if (filteredOps.length === 0 && searchTerm !== '') return null;

                    return (
                        <React.Fragment key={category}>
                            <ListItemButton onClick={() => handleCategoryClick(category)}>
                                <ListItemText primary={category} />
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
                                                onClick={() => onToolClick(operation)}
                                            >
                                                <ListItemText primary={operation.name} />
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

export default AllOperationsPanel;