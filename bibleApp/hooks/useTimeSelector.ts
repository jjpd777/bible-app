import { useState } from 'react';

export const useTimeSelector = (initialTime: Date) => {
  const [time, setTime] = useState(initialTime);

  const adjustTime = (type: 'hour' | 'minute', direction: 'up' | 'down') => {
    setTime(prevTime => {
      const newTime = new Date(prevTime);
      
      if (type === 'hour') {
        let newHour = newTime.getHours();
        newHour = direction === 'up' ? (newHour + 1) % 24 : (newHour === 0 ? 23 : newHour - 1);
        newTime.setHours(newHour);
      } else {
        let newMinute = newTime.getMinutes();
        newMinute = direction === 'up' ? (newMinute + 1) % 60 : (newMinute === 0 ? 59 : newMinute - 1);
        newTime.setMinutes(newMinute);
      }
      
      return newTime;
    });
  };

  return { time, adjustTime };
};