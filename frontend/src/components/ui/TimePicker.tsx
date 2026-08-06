import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs, { Dayjs } from 'dayjs';

interface TimePickerProps {
    /** 24-hour time in "HH:mm" format */
    value: string;
    /** Emits the selected time in "HH:mm" (24-hour) format */
    onChange: (time: string) => void;
    disabled?: boolean;
}

// Theme the picker to the app's brand color (teal) and match the app's inputs.
const theme = createTheme({
    palette: {
        primary: { main: '#00A99D' },
    },
    shape: { borderRadius: 8 },
    // Use the page's font (inherited from the app) instead of MUI's default
    // Roboto so the picker text matches the rest of the form.
    typography: { fontFamily: 'inherit', fontSize: 13 },
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    height: 36,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    borderRadius: 8,
                },
                input: {
                    padding: '0 12px',
                    height: 'auto',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                },
                notchedOutline: {
                    borderColor: '#E2E8F0',
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: { fontFamily: 'inherit', fontSize: '0.85rem' },
                input: { fontFamily: 'inherit', fontSize: '0.85rem' },
            },
        },
        MuiTypography: {
            styleOverrides: {
                root: { fontFamily: 'inherit' },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { fontFamily: 'inherit', fontSize: '0.85rem', textTransform: 'none' },
            },
        },
    },
});

/**
 * Pre-existing analog clock time picker (Material Design clock dial) from
 * @mui/x-date-pickers. Selecting the hour auto-advances to minutes; the popup
 * is positioned by MUI's Popper so it stays inside the screen instead of
 * being cut off at the viewport edge.
 */
const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
    const dayjsValue = value ? dayjs(`2000-01-01T${value}`) : null;

    const handleChange = (newValue: Dayjs | null) => {
        onChange(newValue ? newValue.format('HH:mm') : '');
    };

    return (
        // Fixed compact width so the adjacent date picker keeps the remaining
        // space instead of being squeezed by the time field.
        <div style={{ flex: '0 0 auto', width: 142 }}>
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DesktopTimePicker
                        value={dayjsValue}
                        onChange={handleChange}
                        disabled={disabled}
                        ampm
                        views={['hours', 'minutes']}
                        slotProps={{
                            textField: {
                                size: 'small',
                                sx: { width: '100%' },
                            },
                            openPickerButton: { size: 'small' },
                        }}
                    />
                </LocalizationProvider>
            </ThemeProvider>
        </div>
    );
};

export default TimePicker;
