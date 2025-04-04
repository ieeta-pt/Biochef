import { AccountTree, Science } from '@mui/icons-material';
import { AppBar, Box, Button, Toolbar, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BioChefLogo from '../../img/BioChefWhite.svg';

const Navbar = () => {
    const theme = useTheme();
    const location = useLocation();
    const [navColor, setNavColor] = useState(theme.palette.primary.main);

    const isActive = (path) => location.pathname === path;

    const buttonStyle = (active) => ({
        color: 'white',
        textTransform: 'none',
        fontSize: '1rem',
        marginRight: 2,
        position: 'relative',
        '&:after': {
            content: '""',
            position: 'absolute',
            bottom: -2,
            left: 0,
            width: active ? '100%' : '0%',
            height: 2,
            backgroundColor: 'white',
            transition: 'width 0.3s ease-in-out',
        },
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:after': {
                width: '100%',
            },
        },
    });

    return (
        <AppBar
            position="static"
            elevation={0}
            color='transparent'
            sx={{
                backgroundColor: navColor,
            }}
        >
            <Toolbar>
                {/* Logo */}
                <BioChefLogo style={{ maxWidth: '75px', marginRight: '15px' }} />

                {/* Links */}
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                    <Button
                        component={Link}
                        to="/"
                        sx={buttonStyle(isActive('/'))}
                        startIcon={<Science />}
                    >
                        Tools
                    </Button>
                    <Button
                        component={Link}
                        to="/workflow"
                        sx={buttonStyle(isActive('/workflow'))}
                        startIcon={<AccountTree />}
                    >
                        Workflow Builder
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;