
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScanReceipt from './ScanReceipt';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mocking child components
jest.mock('../components/CameraView', () => () => <div>CameraView</div>);
jest.mock('../components/ui/SearchableDropdown', () => ({
    __esModule: true,
    default: ({ value, onChange, options }) => (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    )
}));
jest.mock('../components/ui/MerchantLogo', () => () => <div>MerchantLogo</div>);
jest.mock('../components/ui/VoiceInput', () => () => <div>VoiceInput</div>);
jest.mock('../components/ui/ModernNavbar', () => () => <div>ModernNavbar</div>);
jest.mock('../components/ReceiptsAnalyticsTable', () => () => <div>ReceiptsAnalyticsTable</div>);


describe('ScanReceipt', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should save user category preference when saving receipt', async () => {
    render(<ScanReceipt />);

    // Simulate a processed receipt
    const testData = {
      merchant_name: 'Test Merchant',
      transaction_date: '2025-11-03',
      total_amount: 10.0,
      line_items: [
        {
          item: 'Test Item 1',
          price: 5.0,
          quantity: 1,
          main_category: 'food',
          sub_category: 'fruit',
        },
        {
          item: 'Test Item 2',
          price: 5.0,
          quantity: 1,
          main_category: 'household',
          sub_category: 'cleaning',
        },
      ],
    };

    // This is a bit of a hack, but we need to get the data into the component
    // In a real app, this would be done by simulating the file upload and processing
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /scan receipt/i }));
    });
    await act(async () => {
        const setDataButton = screen.getByTestId('set-data-button'); // We'll add this for testing
        fireEvent.dispatchEvent(setDataButton, new CustomEvent('click', { detail: testData }));
    });


    // Change a category
    const categoryDropdowns = screen.getAllByRole('combobox');
    await act(async () => {
        fireEvent.change(categoryDropdowns[1], { target: { value: 'new-category' } });
    });


    // Click save
    await act(async () => {
        fireEvent.click(screen.getByText('Save Receipt'));
    });

    // Verify that fetch was called to save the receipt
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/receipts', expect.any(Object));
    });

    // Verify that fetch was called to update the user category
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/update-user-category',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            item_name: 'Test Item 1',
            main_category: 'new-category',
            sub_category: '',
          }),
        })
      );
    });
  });
});
