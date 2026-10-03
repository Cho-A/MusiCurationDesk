import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SongCreditEditor from '../SongCreditEditor';
import { describe, it, expect, vi } from 'vitest';

describe('SongCreditEditor component', () => {
  it('should toggle edit mode and render pending credits before saving', async () => {
    const handleAddCredits = vi.fn();
    const handleRemoveCredit = vi.fn();

    render(
      <SongCreditEditor 
        songId={1} 
        existingCredits={[]} 
        onAddCredits={handleAddCredits}
        onRemoveCredit={handleRemoveCredit}
      />
    );

    // Initial state: not in edit mode
    expect(screen.getByText('クレジット情報なし')).toBeInTheDocument();

    // Click Edit button
    const editButton = screen.getByText(/編集/);
    fireEvent.click(editButton);

    // Verify it enters edit mode
    expect(screen.getByPlaceholderText('アーティスト名')).toBeInTheDocument();

    // Add a credit
    const artistInput = screen.getByPlaceholderText('アーティスト名');
    fireEvent.change(artistInput, { target: { value: 'Test Artist' } });
    
    const addButton = screen.getByText(/追加/);
    fireEvent.click(addButton);

    // The added credit should be in pending list
    expect(screen.getByText('保存待ち（追加予定）:')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();

    // API should not have been called yet
    expect(handleAddCredits).not.toHaveBeenCalled();

    // Save
    const saveButton = screen.getByText('保存して完了');
    fireEvent.click(saveButton);

    // API should be called with the pending credit
    expect(handleAddCredits).toHaveBeenCalledTimes(1);
    expect(handleAddCredits).toHaveBeenCalledWith([{ artistName: 'Test Artist', category: 'Vocal', detail: '' }]);
  });
});
