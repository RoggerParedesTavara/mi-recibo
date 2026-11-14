import { roundUpToTenth } from './roundUpToTenth';

describe('roundUpToTenth', () => {
  it('rounds positive amounts upward to one decimal', () => {
    expect(roundUpToTenth(247.33)).toBe(247.4);
  });

  it('keeps an amount that already has one decimal', () => {
    expect(roundUpToTenth(7.1)).toBe(7.1);
  });

  it('rounds negative amounts upward toward positive infinity', () => {
    expect(roundUpToTenth(-0.31)).toBe(-0.3);
  });
});
