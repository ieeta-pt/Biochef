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
export default function ToolMessageIcons({ messages = {}, sx = {}, size = 18, pulseEnabled = true }) {

    const pulse = keyframes`
        0%, 100% { transform: scale(1); }
        50%     { transform: scale(1.15); }
    `;

    const hasMessages = Object.values(messages).some(
        ({ info = [], error = [] }) => info.length || error.length
    );

    if (!hasMessages) return null;

    return (
        <Box display="flex" alignItems="center" sx={{ ml: 1, ...sx }}>
            {Object.entries(messages).map(([type, { info = [], error = [] }]) => (
                <React.Fragment key={type}>
                    {info.length > 0 && (
                        <Tooltip
                            title={
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {type} Info
                                    </Typography>

                                    {info.map((txt, i) => (
                                        <Typography key={`info-${type}-${i}`} variant="body2">{txt}</Typography>
                                    ))}
                                </Box>
                            }
                            arrow
                        >
                            <Box
                                component="span"
                                sx={{
                                    animation: pulseEnabled ? `${pulse} 2s ease-in-out infinite` : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mr: 0.5,
                                }}
                            >
                                <InfoOutlinedIcon color="info" sx={{ fontSize: size }} />
                            </Box>
                        </Tooltip>
                    )}

                    {error.length > 0 && (
                        <Tooltip
                            title={
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {type} Errors
                                    </Typography>
                                    {error.map((txt, i) => (
                                        <Typography key={`error-${type}-${i}`} variant="body2">{txt}</Typography>
                                    ))}
                                </Box>
                            }
                            arrow
                        >
                            <Box
                                component="span"
                                sx={{
                                    animation: pulseEnabled ? `${pulse} 2s ease-in-out infinite` : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mr: 0.5,
                                }}
                            >
                                <ErrorOutlineIcon color="error" sx={{ fontSize: size }} />
                            </Box>
                        </Tooltip>
                    )}
                </React.Fragment>
            ))}
        </Box>
    );
}