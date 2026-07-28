import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PesticideMixLab from '../pages/pesticides/PesticideMixLab';
import mixingMatrixData from '../../public/data/pesticides/mixing_matrix.json';

describe('PesticideMixLab Component & Data Matrix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mixingMatrixData,
    });
  });

  it('validates mixing_matrix.json data structure', () => {
    expect(mixingMatrixData.metadata.totalChemicals).toBe(33);
    expect(mixingMatrixData.metadata.totalPairs).toBe(528);
    expect(mixingMatrixData.chemicals).toHaveLength(33);
    expect(mixingMatrixData.pairs).toHaveLength(528);
    expect(Object.keys(mixingMatrixData.specificNotes)).toHaveLength(16);
    expect(mixingMatrixData.generalNotes).toHaveLength(7);
  });

  it('renders MixLab header and chemical cards correctly', async () => {
    render(
      <MemoryRouter>
        <PesticideMixLab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/MixLab ห้องทดลองจับคู่สารป้องกันกำจัดศัตรูพืช/i)
      ).toBeInTheDocument();
    });

    // Check chemical card for "อะมิทราซ"
    expect(screen.getByText('อะมิทราซ')).toBeInTheDocument();
  });

  it('allows selecting chemical A and chemical B and testing mixing', async () => {
    render(
      <MemoryRouter>
        <PesticideMixLab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('อะมิทราซ')).toBeInTheDocument();
    });

    // Click random pair button to select Chem A & B
    const randomBtn = screen.getByText('🎲 สุ่มคู่สาร');
    fireEvent.click(randomBtn);

    await waitFor(() => {
      expect(screen.getByText('ล้างสาร A')).toBeInTheDocument();
      expect(screen.getByText('ล้างสาร B')).toBeInTheDocument();
    });

    // Click Mix button
    const mixBtn = screen.getByText('ทดลองผสม');
    expect(mixBtn).not.toBeDisabled();

    fireEvent.click(mixBtn);

    // Wait for result card disclaimer to appear
    await waitFor(() => {
      expect(
        screen.getByText(/อ้างอิงตามผังการผสมสารป้องกันกำจัดศัตรูพืช/i)
      ).toBeInTheDocument();
    });
  });

  it('switches between Lab Bench, Matrix Table, and Academic Notes tabs', async () => {
    render(
      <MemoryRouter>
        <PesticideMixLab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/MixLab ห้องทดลองจับคู่สารป้องกันกำจัดศัตรูพืช/i)
      ).toBeInTheDocument();
    });

    // Switch to Matrix Table tab
    const matrixTab = screen.getByText(/ค้นหาผัง 528 คู่ผสม/i);
    fireEvent.click(matrixTab);

    expect(
      screen.getByText('ผังข้อมูลตารางคู่ผสม 528 รายการ')
    ).toBeInTheDocument();

    // Switch to Academic Notes tab
    const notesTab = screen.getByText(/หมายเหตุวิชาการ 23 ข้อ/i);
    fireEvent.click(notesTab);

    expect(
      screen.getByText(/หมายเหตุทั่วไป 17 ถึง 23 และข้อควรระวัง/i)
    ).toBeInTheDocument();
  });
});
