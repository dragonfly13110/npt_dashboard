import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AgriTourismWidget from '../AgriTourismWidget';

const tourism = {
  count: 3,
  list: [
    {
      id: 1,
      spot_name: 'สวน A',
      district: 'สามพราน',
      subdistrict: 'ไร่ขิง',
      spot_type: 'สวนเกษตร',
      contact_person: 'คุณเอ',
      phone: '0811111111',
    },
    {
      id: 2,
      spot_name: 'ฟาร์ม B',
      district: 'เมืองนครปฐม',
      spot_type: 'ฟาร์มสเตย์',
    },
    {
      id: 3,
      spot_name: 'สวน C',
      district: 'สามพราน',
      spot_type: 'สวนเกษตร',
    },
  ],
};

describe('AgriTourismWidget', () => {
  it('shows compact KPIs and opens details', () => {
    const onOpen = vi.fn();
    render(<AgriTourismWidget data={tourism} summary onOpen={onOpen} />);

    expect(screen.getByText('3 แห่ง')).toBeInTheDocument();
    expect(screen.getByText('2 อำเภอ')).toBeInTheDocument();
    expect(screen.getByText('2 ประเภท')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /แหล่งท่องเที่ยว/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('filters details and links to the full table', () => {
    render(<AgriTourismWidget data={tourism} />);

    fireEvent.change(screen.getByLabelText('อำเภอ'), {
      target: { value: 'สามพราน' },
    });
    expect(screen.getByText('สวน A')).toBeInTheDocument();
    expect(screen.queryByText('ฟาร์ม B')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('ค้นหา'), {
      target: { value: 'สวน C' },
    });
    expect(screen.queryByText('สวน A')).not.toBeInTheDocument();
    expect(screen.getByText('สวน C')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
    expect(screen.getByText('ฟาร์ม B')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /ดูตารางข้อมูลเต็ม/ })
    ).toHaveAttribute('href', '/public/agri-tourism');
  });
});
