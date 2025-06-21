import { keyframes } from "@emotion/react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Tooltip, Typography } from "@mui/material";
import React from "react";

/**
 * ToolMessageIcons
 * Renders info/error icons with continuous pulsing animation to draw user attention.
 * @param {{ info: string[], error: string[] }} messages
 */
export default function ToolMessageIcons({ messages = {} }) {
    const { info = [], error = [] } = messages;
    if (info.length === 0 && error.length === 0) return null;

    const pulse = keyframes`
    0%, 100% { transform: scale(1); }
    50%     { transform: scale(1.15); }
  `;

    return (
        <Box display="flex" alignItems="center" ml={1}>
            {info.length > 0 && (
                <Tooltip
                    title={
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Info</Typography>
                            {info.map((txt, i) => (
                                <Typography key={`info-${i}`} variant="body2">{txt}</Typography>
                            ))}
                        </Box>
                    }
                    arrow
                >
                    <Box
                        component="span"
                        sx={{
                            animation: `${pulse} 2s ease-in-out infinite`,
                            display: 'flex',
                            alignItems: 'center',
                            mr: 0.5,
                        }}
                    >
                        <InfoOutlinedIcon color="info" fontSize="small" />
                    </Box>
                </Tooltip>
            )}

            {error.length > 0 && (
                <Tooltip
                    title={
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                Errors
                            </Typography>
                            {error.map((txt, i) => (
                                <Typography key={`error-${i}`} variant="body2">{txt}</Typography>
                            ))}
                        </Box>
                    }
                    arrow
                >
                    <Box
                        component="span"
                        sx={{
                            animation: `${pulse} 2s ease-in-out infinite`,
                            display: 'flex',
                            alignItems: 'center',
                            mr: 0.5,
                        }}
                    >
                        <ErrorOutlineIcon color="error" fontSize="small" />
                    </Box>
                </Tooltip>
            )}
        </Box>
    );
}