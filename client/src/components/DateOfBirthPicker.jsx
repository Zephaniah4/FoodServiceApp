import React from 'react';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

/**
 * DateOfBirthPicker
 * 
 * A reusable date picker component for selecting date of birth.
 * 
 * Props:
 * - label: string (label for the field)
 * - value: string (date in "MM-DD-YYYY" format)
 * - onChange: function (called with new date string in "MM-DD-YYYY" format)
 * - minYear: number (minimum year selectable)
 * - maxYear: number (maximum year selectable)
 * - required: boolean (if the field is required)
 * - ...props: any other props for DatePicker
 */
export default function DateOfBirthPicker({
  value,
  onChange,
  minYear = 1915,
  maxYear = new Date().getFullYear(),
  required = false,
  ...props
}) {
  return (
      <DatePicker
        value={value ? dayjs(value, "MM-DD-YYYY") : null}
        onChange={date => {
          if (date) {
            onChange(date.format("MM-DD-YYYY"));
          } else {
            onChange(null);
          }
        }}
        minDate={dayjs().year(minYear)}
        maxDate={dayjs().year(maxYear)}
        format="MM-DD-YYYY"
        slotProps={{
          textField: {
            size: 'small',
            required,
            sx: {
              '& .MuiInputBase-root': {
                height: '40px !important',
                minHeight: '40px !important',
              },
              '& .MuiInputBase-input': {
                padding: '8px 12px !important',
                height: '24px !important',
                lineHeight: '24px !important',
              },
            }
          }
        }}
        sx={{
          width: '100%',
          marginTop: '0.2rem !important',
          alignSelf: 'flex-end',
          '& .MuiInputBase-root': {
            width: '100%',
            height: '40px !important',
            minHeight: '40px !important',
            maxHeight: '40px !important',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiInputBase-input': {
            padding: '8px 12px !important',
            fontSize: '1rem',
            color: '#333',
            height: '24px !important',
            lineHeight: '24px !important',
            border: '1px solid #bdbdbd',
            borderRadius: '5px',
            boxSizing: 'border-box',
          },
          '& .MuiInputBase-input:focus': {
            borderColor: '#388e3c',
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(56, 142, 60, 0.2)',
          },
          '& .MuiIconButton-root': {
            padding: '8px',
            color: '#757575',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              border: 'none',
            },
          },
        }}
        {...props}
      />
  );
}