import React from 'react';
import { AppShell } from '../ui/AppShell.js';

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface WordleRow {
  letters: string[];
  statuses: LetterStatus[];
}

interface WordleCardProps {
  rows: WordleRow[];
  targetWord?: string; // Optional: show answer if game is over
  message?: string;
}

export const WordleCard: React.FC<WordleCardProps> = ({
  rows,
  targetWord,
  message,
}) => {
  const getStatusColor = (status: LetterStatus) => {
    switch (status) {
      case 'correct':
        return 'bg-[#6aaa64] text-white border-[#6aaa64]';
      case 'present':
        return 'bg-[#c9b458] text-white border-[#c9b458]';
      case 'absent':
        return 'bg-[#787c7e] text-white border-[#787c7e]';
      default:
        return 'bg-white text-black border-gray-300';
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-primary">Wordle</h1>

        <div className="grid grid-rows-6 gap-2 mb-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = row.letters[colIndex] || '';
                const status = row.statuses[colIndex] || 'empty';
                return (
                  <div
                    key={colIndex}
                    className={`w-14 h-14 flex items-center justify-center text-2xl font-bold border-2 uppercase ${getStatusColor(
                      status
                    )}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {message && (
          <div className="text-xl font-medium mb-4 text-center text-on-surface">
            {message}
          </div>
        )}

        {targetWord && (
          <div className="text-lg text-secondary-container bg-on-secondary-container px-4 py-2 rounded-full">
            答案: <span className="font-bold uppercase">{targetWord}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
};
