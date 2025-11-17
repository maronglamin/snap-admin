'use client';

import React from 'react';
import DatePicker from 'react-datepicker';

type DateTimePickerProps = {
	value: Date | null;
	onChange: (date: Date | null) => void;
	placeholder?: string;
	className?: string;
};

export function DateTimePicker({ value, onChange, placeholder, className }: DateTimePickerProps) {
	return (
		<DatePicker
			selected={value}
			onChange={onChange}
			showTimeSelect
			timeIntervals={5}
			dateFormat="yyyy-MM-dd HH:mm"
			placeholderText={placeholder}
			className={className}
			shouldCloseOnSelect
		/>
	);
}


