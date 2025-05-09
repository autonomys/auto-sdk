import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import Dropdown from './index';

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    options: {
      control: 'object',
      description: 'Array of options for the dropdown',
    },
    value: {
      control: 'text',
      description: 'The currently selected value',
    },
    placeholder: {
      control: 'text',
      description: 'Text to display when no option is selected',
      table: {
        defaultValue: { summary: 'Select an option' },
      },
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'The size of the dropdown',
      table: {
        defaultValue: { summary: 'medium' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the dropdown is disabled',
      table: {
        defaultValue: { summary: false },
      },
    },
    onChange: { action: 'changed' },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultOptions = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
  { label: 'Option 4', value: '4' },
];

/**
 * Default - Basic dropdown with options
 */
export const Default: Story = {
  args: {
    options: defaultOptions,
  },
};

/**
 * With Placeholder - Shows custom placeholder text
 */
export const WithPlaceholder: Story = {
  args: {
    options: defaultOptions,
    placeholder: 'Choose an item...',
  },
};

/**
 * Pre-selected Value - Has a value already selected
 */
export const PreSelected: Story = {
  args: {
    options: defaultOptions,
    value: '2',
  },
};

/**
 * Disabled - Cannot be interacted with
 */
export const Disabled: Story = {
  args: {
    options: defaultOptions,
    disabled: true,
  },
};

/**
 * Small - For compact layouts
 */
export const Small: Story = {
  args: {
    options: defaultOptions,
    size: 'small',
  },
};

/**
 * Large - For emphasis or touch interfaces
 */
export const Large: Story = {
  args: {
    options: defaultOptions,
    size: 'large',
  },
};

/**
 * Many Options - Scrollable list when many options
 */
export const ManyOptions: Story = {
  args: {
    options: [
      ...defaultOptions,
      { label: 'Option 5', value: '5' },
      { label: 'Option 6', value: '6' },
      { label: 'Option 7', value: '7' },
      { label: 'Option 8', value: '8' },
      { label: 'Option 9', value: '9' },
      { label: 'Option 10', value: '10' },
      { label: 'Option 11', value: '11' },
      { label: 'Option 12', value: '12' },
    ],
  },
}; 