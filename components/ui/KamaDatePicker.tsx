import React, { useEffect, useMemo, useRef } from 'react';
import { generateId } from '../../utils/idUtils';
import { CalendarIcon } from './Icons';

// Let TypeScript know about the global function
declare const kamaDatepicker: any;

interface KamaDatePickerProps {
    value: string; // Expects "YYYY/MM/DD" or empty string
    onChange: (date: string) => void;
}

const KamaDatePicker: React.FC<KamaDatePickerProps> = ({ value, onChange }) => {
    const inputId = useMemo(() => `datepicker-${generateId()}`, []);
    const onChangeRef = useRef(onChange);

    // Keep onChange function reference up to date without re-triggering the effect
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        // Ensure the global function is loaded
        if (typeof kamaDatepicker === 'undefined') {
            console.error('kamaDatepicker function is not loaded. Check script tags in index.html.');
            return;
        }

        const datePickerOptions = {
            format: 'YYYY/MM/DD',
            closeafterselect: true,
            nextButtonIcon: "→",
            previousButtonIcon: "←",
            forceFarsiDigits: true,
            markToday: true,
            gotoToday: true,
            // Use onclose to capture the final value, robust against clicks away
            onclose: () => {
                const inputElement = document.getElementById(inputId) as HTMLInputElement;
                if (inputElement && inputElement.value) {
                    const newValue = inputElement.value;
                    // Only call onChange if the value has actually changed
                    if (newValue !== value) {
                        onChangeRef.current(newValue);
                    }
                } else if (value !== '') {
                    // Handle case where user clears the input and closes picker
                    onChangeRef.current('');
                }
            }
        };

        // Initialize the datepicker on the input element
        kamaDatepicker(inputId, datePickerOptions);

        // Cleanup function to run when the component unmounts
        return () => {
            // The library is known for not having a clean destroy method.
            // The most reliable way to clean up is to remove the picker from the DOM.
            const pickerElement = document.querySelector('.bd-main');
            if (pickerElement) {
                pickerElement.remove();
            }
        };
        // Re-initialize if the value changes externally (e.g., opening modal for a different candidate)
    }, [inputId, value]);

    // This effect ensures the input field visually updates if the `value` prop changes from outside.
    useEffect(() => {
        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        if (inputElement && inputElement.value !== value) {
            inputElement.value = value || '';
        }
    }, [value, inputId]);

    // Handle manual input
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const manualValue = e.target.value.trim();
        // Validate the format on blur
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(manualValue) || manualValue === '') {
            if (manualValue !== value) {
                onChange(manualValue);
            }
        } else {
            // If format is invalid, revert to the last valid value
            e.target.value = value || '';
        }
    };

    return (
        <div className="date-input-container">
            <input
                id={inputId}
                type="text"
                defaultValue={value}
                onBlur={handleBlur}
                className="w-full border rounded-lg shadow-sm p-3 date-input text-gray-800 bg-white focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] border-gray-300"
                placeholder="YYYY/MM/DD"
                autoComplete="off"
            />
            <div className="date-input-icon">
                <CalendarIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default KamaDatePicker;